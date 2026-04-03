import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text, projectContext } = await req.json();

    const prompt = `Você é o sistema de análise da AMUM. Analise esta transcrição de entrevista de branding e extraia:

CONTEXTO DO PROJETO:
${projectContext || 'Projeto de branding estratégico'}

TRANSCRIÇÃO:
${text}

Produza uma análise estruturada com:

**CITAÇÕES-CHAVE** (máx. 5 — as falas mais reveladoras sobre identidade, cultura e percepção de marca)

**ARQUÉTIPOS IDENTIFICADOS** (padrões simbólicos presentes na fala — Jung/Pearson & Mark)

**GAPS E TENSÕES** (contradições entre o que dizem e o que a marca faz ou comunica)

**ALERTAS** (sinais de risco ou oportunidade que merecem atenção imediata)

**SÍNTESE ESTRATÉGICA** (1 parágrafo — o que esta entrevista revela sobre o estado da marca)

Seja preciso. Cada item deve ter consequência estratégica. Evite observações genéricas.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro no processamento' }, { status: 500 });
  }
}
