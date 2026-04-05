import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json() as { prompt?: string };
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt obrigatório' }, { status: 400 });
    }

    const response = await getClient().images.generate({
      model: 'dall-e-3',
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const img = response.data?.[0];
    return NextResponse.json({
      url: img?.url ?? '',
      revised_prompt: img?.revised_prompt,
    });
  } catch (err) {
    console.error('[dalle]', err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Erro na geração de imagem', detail }, { status: 500 });
  }
}
