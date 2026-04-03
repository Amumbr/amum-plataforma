import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text, filename, publico, projectContext } = await req.json();

    const prompt = `Você é um analista estratégico da AMUM especializado em processar transcrições de entrevistas de branding.

${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Analise a transcrição abaixo (${filename || 'entrevista'}, público: ${publico || 'não especificado'}) e retorne APENAS um JSON válido com esta estrutura exata:

{
  "keyQuotes": [
    { "citacao": "trecho exato da fala", "relevancia": "por que esta citação importa estrategicamente" }
  ],
  "archetypes": ["arquétipo identificado 1", "arquétipo identificado 2"],
  "gaps": ["gap entre discurso e percepção 1", "gap 2"],
  "alerts": ["alerta de atenção 1", "alerta 2"],
  "synthesis": "síntese estratégica em 2-3 parágrafos: o que essa entrevista revela sobre a marca, suas tensões internas e implicações para o reposicionamento"
}

Retorne SOMENTE o JSON, sem markdown, sem texto antes ou depois.

TRANSCRIÇÃO:
${text}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    let analysis;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(clean);
    } catch {
      analysis = {
        keyQuotes: [],
        archetypes: [],
        gaps: [],
        alerts: [],
        synthesis: raw,
      };
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao processar transcrição' }, { status: 500 });
  }
}
