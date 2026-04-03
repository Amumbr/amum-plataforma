import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Aumenta o limite de body para uploads de documentos
export const maxDuration = 60;

// ─── EXTRACT TEXT FROM FILE ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    return handleExtract(req);
  }

  const body = await req.json();
  if (body.action === 'synthesize') return handleSynthesize(body);

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}

async function handleExtract(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 400 });

    const fileSize = file.size;
    const fileName = file.name.toLowerCase();
    const fileType = file.type;

    // Limite de 8MB para uploads
    if (fileSize > 8 * 1024 * 1024) {
      return NextResponse.json({
        error: `Arquivo muito grande (${(fileSize / 1024 / 1024).toFixed(1)}MB). Limite: 8MB. Reduza o arquivo ou cole o texto manualmente.`,
      }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let extractedText = '';

    // TXT / Markdown
    if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    }

    // PDF
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer, { max: 0 }); // max: 0 = sem limite de páginas
        extractedText = data.text || '';
        if (!extractedText.trim()) {
          return NextResponse.json({
            error: 'PDF sem texto extraível (pode ser um PDF escaneado/imagem). Use "Colar texto" para incluir o conteúdo manualmente.',
          }, { status: 422 });
        }
      } catch (pdfErr) {
        const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
        return NextResponse.json({
          error: `Falha ao ler o PDF: ${msg.slice(0, 120)}. O arquivo pode estar protegido por senha ou corrompido.`,
        }, { status: 422 });
      }
    }

    // DOCX / DOC
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
        if (!extractedText.trim()) {
          return NextResponse.json({
            error: 'Documento Word sem texto extraível. Use "Colar texto" para incluir o conteúdo manualmente.',
          }, { status: 422 });
        }
      } catch (docxErr) {
        const msg = docxErr instanceof Error ? docxErr.message : String(docxErr);
        return NextResponse.json({
          error: `Falha ao ler o Word: ${msg.slice(0, 120)}.`,
        }, { status: 422 });
      }
    }

    // Imagens — Claude Vision extrai o texto
    else if (
      fileType.startsWith('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.webp')
    ) {
      try {
        const base64 = buffer.toString('base64');
        const imgType = fileType.startsWith('image/') ? fileType : 'image/jpeg';
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: imgType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 },
                },
                {
                  type: 'text',
                  text: 'Extraia todo o texto e conteúdo visível nesta imagem de documento corporativo, mantendo estrutura e hierarquia.',
                },
              ],
            },
          ],
        });
        extractedText = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch (visionErr) {
        const msg = visionErr instanceof Error ? visionErr.message : String(visionErr);
        return NextResponse.json({ error: `Falha ao processar imagem: ${msg.slice(0, 100)}.` }, { status: 422 });
      }
    }

    else {
      return NextResponse.json({
        error: `Formato não suportado: ${fileType || fileName.split('.').pop()}. Use PDF, Word, TXT ou imagem.`,
      }, { status: 415 });
    }

    const truncated = extractedText.slice(0, 8000);

    return NextResponse.json({
      extractedText: truncated,
      charCount: extractedText.length,
      truncated: extractedText.length > 8000,
    });

  } catch (err) {
    console.error('documents/extract error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Erro inesperado: ${msg.slice(0, 100)}` },
      { status: 500 }
    );
  }
}

// ─── SYNTHESIZE ALL DOCUMENTS ────────────────────────────────────────────────

async function handleSynthesize(body: {
  documents: { filename: string; fileType: string; content: string }[];
  projectContext: string;
}) {
  const { documents, projectContext } = body;

  if (!documents || documents.length === 0) {
    return NextResponse.json({ error: 'Nenhum documento para sintetizar' }, { status: 400 });
  }

  const docsText = documents
    .map(
      (d, i) =>
        `=== DOCUMENTO ${i + 1}: ${d.filename} ===\n${d.content}`
    )
    .join('\n\n');

  const systemPrompt = `Você é um estrategista sênior de branding da AMUM. Sua tarefa é fazer leitura simbólica e estratégica profunda de documentos corporativos, identificando padrões, tensões, arquétipos e oportunidades invisíveis.

${projectContext}

Princípios epistêmicos:
- Nunca inventar dados. Distinguir: dado confirmado / inferência com evidência / hipótese / sinal fraco.
- Sustente lacunas — nunca preencha com clichê.
- Método antes de performance. Cada afirmação tem ancoragem.
- Precisão lexical: nomear o que é, não o que soa bem.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analise o conjunto de documentos abaixo e produza uma SÍNTESE ESTRATÉGICA INTEGRADA.

${docsText}

Retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem explicações externas) com esta estrutura exata:
{
  "apresentacao": "Como a empresa se apresenta ao mundo — narrativa, tom, promessa central. 2-3 parágrafos densos.",
  "linguagem": "Padrões de linguagem: metáforas dominantes, campos semânticos, registro, o que repete e o que evita.",
  "arquetipo": {
    "dominante": "Arquétipo predominante com justificativa baseada nos documentos",
    "secundario": "Arquétipo secundário ou aspirado — e a tensão entre eles",
    "sombra": "O que os documentos evitam, ocultam ou não conseguem nomear"
  },
  "tensoes": [
    "Tensão estrutural 1 — entre discurso e realidade",
    "Tensão 2 — entre intenção e comunicação",
    "Tensão 3 — entre posicionamento declarado e percepção provável"
  ],
  "signos_fortes": [
    "Elemento simbólico que funciona bem e por quê",
    "..."
  ],
  "signos_conflito": [
    "Contradição interna identificada",
    "..."
  ],
  "potencia_latente": "O que está presente nos documentos mas não é explorado — o território disponível não reivindicado.",
  "hipoteses_estrategicas": [
    "Hipótese sobre o reposicionamento possível",
    "Hipótese sobre o gap entre discurso e mercado"
  ],
  "perguntas_para_entrevista": [
    "Pergunta crítica que os documentos levantam e as entrevistas devem responder",
    "..."
  ]
}`,
        },
      ],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '{}';

    let synthesis;
    try {
      const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
      synthesis = JSON.parse(clean);
    } catch {
      synthesis = { error: 'Erro no parse da síntese', raw };
    }

    return NextResponse.json({ synthesis });
  } catch (err) {
    console.error('documents/synthesize error:', err);
    return NextResponse.json({ error: 'Erro ao gerar síntese.' }, { status: 500 });
  }
}
