import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AMUM_SYSTEM = `Você é o sistema de inteligência estratégica da AMUM — consultoria de branding com metodologia proprietária de 5 fases: Escuta, Decifração, Reconstrução, Travessia e Regeneração.

Trabalha por tensão, não por resposta pronta. Nomeia com precisão. Dá espessura ao que produz.
Cada análise deve revelar tensões, implicações e critérios de decisão — não apenas informação descritiva.`;

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda } = await req.json();

    if (action === 'generate_agenda') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Com base no contexto acima, gere uma agenda de pesquisa setorial estratégica.
Retorne APENAS um JSON válido com esta estrutura:

{
  "agenda": [
    {
      "id": "r1",
      "tema": "nome do tema",
      "objetivo": "o que queremos descobrir neste tema",
      "queries": ["query de busca 1", "query de busca 2", "query de busca 3"]
    }
  ]
}

Gere entre 4 e 6 temas. Foque em: tensões do setor, posicionamento de concorrentes, território disponível, contexto macro, linguagem do mercado, benchmarks internacionais.
Retorne SOMENTE o JSON, sem markdown.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear agenda', raw }, { status: 500 });
      }
    }

    if (action === 'run_research') {
      // Executa pesquisa para cada item da agenda usando web_search do Claude
      const agendaItems = agenda as { id: string; tema: string; objetivo: string; queries: string[] }[];
      const results = [];

      for (const item of agendaItems) {
        const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Pesquise sobre o tema: "${item.tema}"
Objetivo: ${item.objetivo}
Queries sugeridas: ${item.queries.join(', ')}

Usando seu conhecimento sobre o setor e o contexto do projeto, produza uma síntese estratégica deste tema.
Foque em tensões, oportunidades de território, movimentos de mercado e implicações para o posicionamento da marca.

Retorne APENAS um JSON com esta estrutura:
{
  "id": "${item.id}",
  "tema": "${item.tema}",
  "sintese": "síntese estratégica em 2-3 parágrafos",
  "fontes": ["referência 1", "referência 2"]
}

Retorne SOMENTE o JSON.`;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: AMUM_SYSTEM,
          messages: [{ role: 'user', content: prompt }],
        });

        const raw = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('');

        try {
          const clean = raw.replace(/```json|```/g, '').trim();
          results.push(JSON.parse(clean));
        } catch {
          results.push({ id: item.id, tema: item.tema, sintese: raw, fontes: [] });
        }
      }

      return NextResponse.json({ results });
    }

    if (action === 'synthesize_all') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Com base em todos os dados de pesquisa acima, produza uma síntese estratégica final da Escuta Setorial.

Retorne APENAS um JSON com esta estrutura:
{
  "tensaoCentral": "a tensão geradora do setor em uma frase precisa",
  "territorioDisponivel": "o território de posicionamento identificado como disponível",
  "concorrentes": [
    { "nome": "empresa", "arquetipo": "arquétipo de marca", "posicao": "como se posiciona" }
  ],
  "oportunidade": "a oportunidade estratégica em 2-3 frases",
  "implicacoes": ["implicação 1 para o projeto", "implicação 2", "implicação 3"]
}

Retorne SOMENTE o JSON.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      try {
        const clean = raw.replace(/```json|```/g, '').trim();
        return NextResponse.json(JSON.parse(clean));
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear síntese', raw }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API de pesquisa' }, { status: 500 });
  }
}
