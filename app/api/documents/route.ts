import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) return handleMultipart(req);
  const body = await req.json();
  if (body.action === 'extract') return handleBase64(body);
  if (body.action === 'extract-from-url') return extractFromUrl(body);
  if (body.action === 'synthesize') return handleSynthesize(body);
  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

// ── BASE64 EXTRACT (caminho principal) ────────────────────────────────────────
async function handleBase64(body: {
  filename: string; fileType: string; size: number; base64: string;
}) {
  const { filename, fileType, size, base64 } = body;
  if (!base64) return NextResponse.json({ error: 'Arquivo não recebido.' }, { status: 400 });

  if (base64.length > 12 * 1024 * 1024) {
    return NextResponse.json({
      error: `Arquivo muito grande (${(size / 1024 / 1024).toFixed(1)}MB). Compacte o PDF ou cole o texto manualmente.`,
    }, { status: 413 });
  }

  const name = filename.toLowerCase();
  let extractedText = '';

  // PDF → Claude native document API (mais confiável que pdf-parse)
  if (fileType === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      type DocContent = { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };
      type TextContent = { type: 'text'; text: string };
      const docBlock: DocContent = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
      const textBlock: TextContent = { type: 'text', text: 'Extraia TODO o conteúdo textual deste documento, mantendo estrutura, títulos, listas e tabelas. Transcreva de forma fiel, sem resumir.' };
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [docBlock, textBlock] }],
      });
      extractedText = response.content[0].type === 'text' ? response.content[0].text : '';
      if (!extractedText.trim()) return NextResponse.json({ error: 'PDF sem conteúdo textual identificável. Cole o texto manualmente.' }, { status: 422 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha na leitura do PDF: ${msg.slice(0, 150)}` }, { status: 422 });
    }
  }

  // DOCX → mammoth
  else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const buffer = Buffer.from(base64, 'base64');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      if (!extractedText.trim()) return NextResponse.json({ error: 'Documento Word sem texto extraível.' }, { status: 422 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao ler o Word: ${msg.slice(0, 120)}` }, { status: 422 });
    }
  }

  // TXT / Markdown
  else if (fileType === 'text/plain' || name.endsWith('.txt') || name.endsWith('.md')) {
    extractedText = Buffer.from(base64, 'base64').toString('utf-8');
  }

  // HTML — relatórios do site AMUM e outros documentos web
  else if (
    fileType === 'text/html' ||
    name.endsWith('.html') ||
    name.endsWith('.htm')
  ) {
    const raw = Buffer.from(base64, 'base64').toString('utf-8');
    // Remove scripts, estilos e tags; decodifica entidades HTML comuns
    extractedText = raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<\/?(h[1-6]|p|div|section|article|header|footer|li|tr|td|th|br|hr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'HTML sem conteúdo textual identificável.' }, { status: 422 });
    }
  }

  // Imagem → Claude Vision
  else if (fileType.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/.test(name)) {
    const imgType = (fileType.startsWith('image/') ? fileType : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: imgType, data: base64 } },
          { type: 'text', text: 'Extraia todo o texto e conteúdo visível nesta imagem.' },
        ]}],
      });
      extractedText = response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao processar imagem: ${msg.slice(0, 100)}` }, { status: 422 });
    }
  }

  else {
    return NextResponse.json({ error: `Formato não suportado: ${name.split('.').pop()}. Use PDF, Word, TXT ou imagem.` }, { status: 415 });
  }

  const truncated = extractedText.slice(0, 12000);
  return NextResponse.json({ extractedText: truncated, charCount: extractedText.length, truncated: extractedText.length > 12000 });
}

// ── MULTIPART (legado: DOCX/TXT pequenos) ─────────────────────────────────────
async function handleMultipart(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 400 });
    const name = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let text = '';
    if (name.endsWith('.txt') || name.endsWith('.md')) text = buffer.toString('utf-8');
    else if (name.endsWith('.docx')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      text = (await mammoth.extractRawText({ buffer })).value || '';
    } else return NextResponse.json({ error: 'Use base64 para PDF e imagens.' }, { status: 415 });
    return NextResponse.json({ extractedText: text.slice(0, 12000), charCount: text.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao extrair texto.' }, { status: 500 });
  }
}

// ── SYNTHESIZE ────────────────────────────────────────────────────────────────
async function handleSynthesize(body: { documents: { filename: string; fileType: string; content: string }[]; projectContext: string }) {
  const { documents, projectContext } = body;
  if (!documents?.length) return NextResponse.json({ error: 'Nenhum documento.' }, { status: 400 });

  const docsText = documents.map((d, i) => `=== DOCUMENTO ${i + 1}: ${d.filename} ===\n${d.content}`).join('\n\n');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `Você é estrategista sênior de branding AMUM. Faça leitura simbólica profunda de documentos corporativos.\n\n${projectContext}\n\nPrincípios: nunca inventar dados. Distinguir: dado confirmado / inferência / hipótese / sinal fraco.`,
      messages: [{ role: 'user', content: `Analise os documentos e retorne APENAS JSON válido (sem markdown):\n\n${docsText}\n\n{"apresentacao":"...","linguagem":"...","arquetipo":{"dominante":"...","secundario":"...","sombra":"..."},"tensoes":["..."],"signos_fortes":["..."],"signos_conflito":["..."],"potencia_latente":"...","hipoteses_estrategicas":["..."],"perguntas_para_entrevista":["..."]}` }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
    let synthesis;
    try { synthesis = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()); }
    catch { synthesis = { error: 'Parse error', raw }; }
    return NextResponse.json({ synthesis });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao gerar síntese.' }, { status: 500 });
  }
}

// ── EXTRACT FROM GOOGLE DRIVE URL ─────────────────────────────────────────────
// Chamado com { action: 'extract-from-url', url: string, filename?: string }
// O servidor baixa o arquivo do Drive e processa — sem limite de tamanho no cliente

async function extractFromUrl(body: {
  url: string;
  filename?: string;
}) {
  const { url, filename } = body;

  // Converte link de compartilhamento para URL de download direto
  const downloadUrl = resolveGoogleDriveUrl(url);
  if (!downloadUrl) {
    return NextResponse.json({
      error: 'URL inválida. Use um link de compartilhamento do Google Drive (drive.google.com ou docs.google.com).',
    }, { status: 400 });
  }

  let fileBuffer: Buffer;
  let detectedType = 'application/octet-stream';
  let detectedName = filename || 'documento';

  try {
    // Baixa o arquivo com seguimento de redirecionamentos (necessário para Drive)
    const response = await fetch(downloadUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `Falha ao baixar o arquivo do Drive (${response.status}). Verifique se o arquivo está compartilhado com "Qualquer pessoa com o link".`,
      }, { status: 400 });
    }

    // Detecta tipo pelo Content-Type ou Content-Disposition
    const contentType = response.headers.get('content-type') || '';
    const disposition = response.headers.get('content-disposition') || '';

    if (contentType.includes('pdf')) detectedType = 'application/pdf';
    else if (contentType.includes('html')) detectedType = 'text/html';
    else if (contentType.includes('word') || contentType.includes('openxmlformats')) detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (contentType.includes('text/plain')) detectedType = 'text/plain';
    else detectedType = contentType.split(';')[0].trim();

    // Extrai nome do arquivo do Content-Disposition
    const nameMatch = disposition.match(/filename\*?=["']?(?:UTF-8'')?([^"';\n]+)/i);
    if (nameMatch) detectedName = decodeURIComponent(nameMatch[1].trim().replace(/['"]/g, ''));

    const arrayBuffer = await response.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro ao baixar do Drive: ${msg.slice(0, 120)}` }, { status: 500 });
  }

  const name = detectedName.toLowerCase();
  let extractedText = '';

  // PDF → Claude native
  if (detectedType === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      type DocContent = { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };
      type TextContent = { type: 'text'; text: string };
      const docBlock: DocContent = {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') },
      };
      const textBlock: TextContent = {
        type: 'text',
        text: 'Extraia TODO o conteúdo textual deste documento, mantendo estrutura, títulos, listas e tabelas. Transcreva fielmente, sem resumir.',
      };
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: [docBlock, textBlock] }],
      });
      extractedText = response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha na leitura do PDF: ${msg.slice(0, 150)}` }, { status: 422 });
    }
  }

  // HTML → strip tags
  else if (detectedType === 'text/html' || name.endsWith('.html') || name.endsWith('.htm')) {
    const raw = fileBuffer.toString('utf-8');
    extractedText = raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<\/?(h[1-6]|p|div|li|tr|td|br|hr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/gi, ' ')
      .replace(/\s{3,}/g, '\n\n').trim();
  }

  // DOCX → mammoth
  else if (name.endsWith('.docx') || detectedType.includes('openxmlformats')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Falha ao ler o Word: ${msg.slice(0, 120)}` }, { status: 422 });
    }
  }

  // TXT
  else if (detectedType === 'text/plain' || name.endsWith('.txt')) {
    extractedText = fileBuffer.toString('utf-8');
  }

  // Imagem → Vision
  else if (detectedType.startsWith('image/')) {
    const imgType = detectedType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: imgType, data: fileBuffer.toString('base64') } },
        { type: 'text', text: 'Extraia todo o texto visível.' },
      ]}],
    });
    extractedText = response.content[0].type === 'text' ? response.content[0].text : '';
  }

  else {
    return NextResponse.json({
      error: `Tipo de arquivo não suportado: ${detectedType}. Suportados: PDF, Word, HTML, TXT, imagens.`,
    }, { status: 415 });
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: 'Arquivo sem conteúdo textual extraível.' }, { status: 422 });
  }

  const truncated = extractedText.slice(0, 12000);
  return NextResponse.json({
    extractedText: truncated,
    filename: detectedName,
    fileType: detectedType,
    charCount: extractedText.length,
    truncated: extractedText.length > 12000,
  });
}

// ── HELPER: resolve Google Drive share URL → download URL ─────────────────────
function resolveGoogleDriveUrl(input: string): string | null {
  // Remove espaços
  const url = input.trim();

  // Google Drive file: drive.google.com/file/d/FILE_ID/...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  // Google Docs: docs.google.com/document/d/ID/...
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return `https://docs.google.com/document/d/${docsMatch[1]}/export?format=pdf`;
  }

  // Google Slides: docs.google.com/presentation/d/ID/...
  const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slidesMatch) {
    return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/pdf`;
  }

  // Google Sheets: docs.google.com/spreadsheets/d/ID/...
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=pdf`;
  }

  // URL com ?id=FILE_ID (link antigo de compartilhamento)
  const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) {
    return `https://drive.google.com/uc?export=download&id=${idParam[1]}`;
  }

  // URL direta com open?id=
  const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }

  return null;
}
