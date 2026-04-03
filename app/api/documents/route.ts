import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    let extractedText = '';

    // TXT
    if (fileType === 'text/plain' || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      extractedText = buffer.toString('utf-8');
    }

    // PDF
    else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      extractedText = data.text || '';
    }

    // DOCX
    else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    }

    // Imagens — Claude Vision extrai o texto
    else if (
      fileType.startsWith('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.webp')
    ) {
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
      extractedText =
        response.content[0].type === 'text' ? response.content[0].text : '';
    }

    // Trunca para economizar localStorage (8000 chars por doc)
    const truncated = extractedText.slice(0, 8000);

    return NextResponse.json({
      extractedText: truncated,
      charCount: extractedText.length,
      truncated: extractedText.length > 8000,
    });
  } catch (err) {
    console.error('documents/extract error:', err);
    return NextResponse.json(
      { error: 'Erro ao extrair texto do arquivo.' },
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
