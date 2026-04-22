import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AMUM_SYSTEM_CHAT, cachedSystem, MODEL_SONNET } from '@/lib/prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { messages, projectContext } = await req.json();

    // Compõe system + contexto em um único bloco cacheado.
    // Contexto muda pouco entre chamadas da mesma sessão → alto hit rate.
    const systemText = projectContext
      ? `${AMUM_SYSTEM_CHAT}\n\nCONTEXTO DO PROJETO ATUAL:\n${projectContext}`
      : AMUM_SYSTEM_CHAT;

    const response = await client.messages.create({
      model: MODEL_SONNET,
      max_tokens: 1500,
      system: cachedSystem(systemText),
      messages,
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    return NextResponse.json({ text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API Claude' }, { status: 500 });
  }
}
