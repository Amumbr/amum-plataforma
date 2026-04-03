import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AMUM_SYSTEM = `Você é o sistema de inteligência estratégica da AMUM — consultoria de branding com metodologia proprietária de 5 fases: Escuta, Decifração, Reconstrução, Travessia e Regeneração.

PROCESSO COGNITIVO: ler → decifrar → nomear → estruturar → traduzir → materializar → tensionar → lapidar

MODOS OPERACIONAIS:
- Tensionamento: reformular o problema antes de responder
- Núcleo Conceitual: nomear o centro antes de estruturar
- Lapidação: palavra inevitável, não apenas elegante
- Teste de Coerência: tensionar entregável contra a realidade

Trabalha por tensão. Nomeia com precisão. Dá espessura ao que produz.`;

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, messages } = await req.json();

    if (action === 'generate_scripts') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Gere roteiros de entrevista para o projeto. Crie roteiros diferentes para cada público relevante baseado no contexto.

Retorne APENAS um JSON com esta estrutura:
{
  "scripts": [
    {
      "id": "s1",
      "publico": "Sócias / Liderança",
      "duracao": "90 minutos",
      "blocos": [
        {
          "titulo": "Abertura e contexto",
          "perguntas": [
            "Pergunta 1",
            "Pergunta 2"
          ]
        }
      ]
    }
  ]
}

Gere roteiros para: Sócias/Liderança (90 min), Gerentes de Conta (45 min), Time Operacional (30 min), Clientes Ativos (45 min).
Cada roteiro deve ter 3-4 blocos temáticos com 3-5 perguntas cada.
As perguntas devem ser abertas, que revelam percepção, contradição e tensão — não confirmam hipóteses.
Retorne SOMENTE o JSON.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
        return NextResponse.json({ error: 'Erro ao parsear roteiros', raw }, { status: 500 });
      }
    }

    if (action === 'deep_analysis') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
Com base em TODOS os dados coletados na Fase 1 (Escuta), execute a Análise de Decifração completa.

Esta análise deve cruzar: diagnóstico do site (se disponível), documentos da empresa, pesquisa setorial, transcrições das entrevistas.

Retorne APENAS um JSON com esta estrutura:
{
  "arquetipo": "arquétipo de marca atual (Jung/Pearson & Mark) com justificativa",
  "tensaoCentral": "a tensão geradora central da marca em uma frase precisa",
  "territorios": [
    {
      "nome": "nome do território",
      "viabilidade": "alta / média / baixa — com justificativa de 1-2 frases"
    }
  ],
  "territorioRecomendado": "o território recomendado com justificativa estratégica",
  "gapsPrincipais": [
    "gap 1: entre o que a marca diz e o que o mercado percebe",
    "gap 2",
    "gap 3"
  ],
  "narrativaNucleo": "a narrativa-núcleo da marca em 2-3 frases — tensão, posição, promessa",
  "proximosPassos": [
    "próximo passo 1 para a Fase 3 Reconstrução",
    "próximo passo 2",
    "próximo passo 3"
  ]
}

Profundidade máxima. Cada campo deve revelar algo que o cliente não sabe que sabe.
Retorne SOMENTE o JSON.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
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
        return NextResponse.json({ error: 'Erro ao parsear análise', raw }, { status: 500 });
      }
    }

    if (action === 'chat') {
      // Co-criação de entregáveis
      const systemWithContext = projectContext
        ? `${AMUM_SYSTEM}\n\nCONTEXTO DO PROJETO ATUAL:\n${projectContext}`
        : AMUM_SYSTEM;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemWithContext,
        messages,
      });

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API de scripts' }, { status: 500 });
  }
}
