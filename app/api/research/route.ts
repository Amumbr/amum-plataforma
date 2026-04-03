import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AMUM_SYSTEM = `Você é o sistema de inteligência estratégica da AMUM — consultoria de branding com metodologia proprietária de 5 fases: Escuta, Decifração, Reconstrução, Travessia e Regeneração.

Trabalha por tensão, não por resposta pronta. Nomeia com precisão. Dá espessura ao que produz.
Cada análise deve revelar tensões, implicações e critérios de decisão — não apenas informação descritiva.

PRINCÍPIOS DE PESQUISA:
1. Não produza texto genérico, publicitário ou decorativo.
2. Separe claramente: fato verificável | leitura analítica | hipótese interpretativa.
3. Quando houver lacuna de informação, sinalize a limitação.
4. Não repita o discurso institucional sem crítica.
5. Compare sempre: o que a marca diz vs. o que ela faz vs. o que o público tende a perceber.
6. Observe não apenas a empresa, mas o setor, os códigos saturados, as pressões externas e as contradições estruturais.`;

const DOSSIE_FRAMEWORK = `
FRAMEWORK DE DOSSIÊ DE MARCA AMUM — 18 DIMENSÕES:
1. VISÃO GERAL DA MARCA — o que é, em que mercado atua, qual seu papel, eixo principal de posicionamento hoje
2. NEGÓCIO E CONTEXTO — origem, modelo de negócio, áreas de atuação, presença geográfica, produtos/serviços, momento atual
3. DESAFIO CENTRAL DA MARCA — principal desafio estratégico, o que precisa alcançar, problema de percepção ou legitimidade
4. VALORES, PROPÓSITO E DIREÇÃO DECLARADA — missão, visão, valores, propósito, compromissos públicos, ESG/ODS (estrutural ou cosmético?)
5. PARA QUEM A MARCA EXISTE — públicos prioritários, stakeholders, como o público decide, compra, usa e fala da marca
6. COMO A MARCA SE APRESENTA HOJE — linguagem institucional, tom de voz, discurso oficial, temas recorrentes, promessas centrais
7. O QUE A MARCA QUER TRANSMITIR VS. O QUE AS PESSOAS RECEBEM — intenção declarada vs. percepção provável, ruído, desalinhamentos
8. IDENTIDADE VISUAL E CÓDIGOS EXPRESSIVOS — estética, sistema visual, cores, tipografia, coerência entre forma e discurso
9. COMUNICAÇÃO DO SETOR — códigos visuais e verbais do setor, frases saturadas, lugares-comuns, clichês narrativos
10. CONCORRENTES E REFERÊNCIAS — concorrentes diretos e indiretos, benchmarks nacionais e internacionais, marcas admiradas
11. A GRANDE CONTRADIÇÃO DO SETOR — hipocrisia, tensão ou contradição estrutural do segmento, discurso gasto
12. A CONTRADIÇÃO ESPECÍFICA DA MARCA — contradição particular desta marca, o que ela tenta parecer, o que ainda a prende
13. PRESSÕES EXTERNAS — mudanças culturais, tecnológicas, regulatórias, comportamentais, tendências que exigem reposicionamento
14. O QUE NÃO PODE SER PERDIDO — ativos simbólicos, estratégicos, reputacionais que a marca não pode abandonar
15. O QUE PRECISA MUDAR — entraves internos, de cultura, governança, comunicação, operação, excesso de herança institucional
16. RECURSOS DISPONÍVEIS E OBSTÁCULOS REAIS — vantagens estruturais, obstáculos concretos, o que depende de decisão política ou orçamento
17. HORIZONTE DE 12 MESES — o que precisa ter mudado, sinais concretos de avanço, o que seria perfumaria vs. mudança estrutural
18. SÍNTESE ESTRATÉGICA FINAL — diagnóstico, principal tensão, principal oportunidade, principal risco, direção para reposicionamento`;

function extractJson(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');
}

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda, customInstructions } = await req.json();

    if (action === 'generate_agenda') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
${DOSSIE_FRAMEWORK}

Com base no contexto do projeto e no framework de 18 dimensões acima, gere uma agenda de pesquisa estratégica personalizada.
Selecione entre 6 e 10 temas, adaptando os objetivos ao contexto específico do projeto.
${customInstructions ? `\nInstruções adicionais:\n${customInstructions}` : ''}

Retorne APENAS JSON válido:
{
  "agenda": [
    {
      "id": "r1",
      "dimensao": 1,
      "tema": "nome do tema",
      "objetivo": "o que precisamos descobrir",
      "queries": ["query 1", "query 2", "query 3"]
    }
  ]
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      try {
        return NextResponse.json(JSON.parse(extractJson(extractText(response.content))));
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear agenda' }, { status: 500 });
      }
    }

    if (action === 'run_research') {
      const agendaItems = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] }[];
      const results = [];

      for (const item of agendaItems) {
        const prompt = `${projectContext ? `CONTEXTO:\n${projectContext}\n\n` : ''}
TEMA: ${item.tema} | OBJETIVO: ${item.objetivo} | QUERIES: ${item.queries.join(' | ')}

Pesquise com profundidade. Separe: fato verificável | leitura analítica | hipótese. Identifique contradições e tensões.

Retorne APENAS JSON:
{"id":"${item.id}","tema":"${item.tema}","sintese":"síntese em 3-5 parágrafos","fatos":[],"tensoes":[],"implicacoes":[],"fontes":[]}`;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: AMUM_SYSTEM,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
          messages: [{ role: 'user', content: prompt }],
        });

        try {
          results.push({ ...JSON.parse(extractJson(extractText(response.content))), createdAt: new Date().toISOString() });
        } catch {
          results.push({ id: item.id, tema: item.tema, sintese: extractText(response.content), fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() });
        }
      }

      return NextResponse.json({ results });
    }

    if (action === 'synthesize_all') {
      const summary = agenda ? (agenda as { tema: string; sintese: string }[]).map(r => `## ${r.tema}\n${r.sintese}`).join('\n\n') : '';

      const prompt = `${projectContext ? `CONTEXTO:\n${projectContext}\n\n` : ''}${summary ? `PESQUISA:\n${summary}\n\n` : ''}
Produza a síntese estratégica final do dossiê de marca.

Retorne APENAS JSON:
{"tensaoCentral":"","desafioPrincipal":"","territorioDisponivel":"","promessaPrincipal":"","percepcaoProvavel":"","contradicaoCentral":"","concorrentes":[{"nome":"","arquetipo":"","posicao":""}],"pressoesExternas":[],"oPreservar":[],"oMudar":[],"meta12meses":"","direcaoEstrategica":"","diagnostico":""}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });

      try {
        return NextResponse.json(JSON.parse(extractJson(extractText(response.content))));
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear síntese' }, { status: 500 });
      }
    }

    if (action === 'social_analysis') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Analise a presença digital da marca principal e dos concorrentes mencionados no contexto.

Para cada entidade, pesquise Instagram, LinkedIn, YouTube e outras plataformas relevantes do setor. Analise:
seguidores, frequência de postagem, temas recorrentes, tom de voz, formatos dominantes, engajamento, ponto forte e ponto fraco.

Após analisar, identifique territórios digitais saturados e territórios disponíveis para diferenciação.

Retorne APENAS JSON válido:
{
  "marca": {
    "entidade": "nome",
    "tipo": "marca",
    "plataformas": [{"nome":"Instagram","handle":"@","seguidores":"","frequencia":"","temasRecorrentes":[],"tomDeVoz":"","formatosDominantes":[],"engajamento":"","pontoForte":"","pontoFraco":""}],
    "posicionamento": "frase precisa",
    "arquetipo": "arquétipo identificado"
  },
  "concorrentes": [
    {"entidade":"nome","tipo":"concorrente","plataformas":[],"posicionamento":"","arquetipo":""}
  ],
  "comparativo": "análise comparativa em 2-3 parágrafos",
  "territoriosOcupados": ["território 1"],
  "territoriosVazios": ["território disponível 1"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: AMUM_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
        messages: [{ role: 'user', content: prompt }],
      });

      try {
        return NextResponse.json({ ...JSON.parse(extractJson(extractText(response.content))), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear análise social' }, { status: 500 });
      }
    }

    if (action === 'trends_analysis') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Pesquise tendências de busca no Google Trends e comportamento digital para esta marca e setor.

Analise: termos relacionados à marca e concorrentes, direção das tendências nos últimos 12 meses, sazonalidade, termos emergentes, janelas de oportunidade baseadas em eventos e ciclos de mercado.

Retorne APENAS JSON válido:
{
  "termosAnalisados": ["termo 1"],
  "tendencias": [{"termo":"","direcao":"crescendo|estavel|declinio","contexto":""}],
  "termosCrescentes": ["termo 1"],
  "termosDeclinando": ["termo 1"],
  "sazonalidade": "descrição dos picos sazonais",
  "janelasDeOportunidade": ["janela 1 — timing"],
  "insights": ["insight 1", "insight 2"]
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: AMUM_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
        messages: [{ role: 'user', content: prompt }],
      });

      try {
        return NextResponse.json({ ...JSON.parse(extractJson(extractText(response.content))), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear tendências' }, { status: 500 });
      }
    }

    if (action === 'netnography') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Você é um pesquisador netnográfico. Pesquise o que as pessoas dizem sobre esta marca e setor fora dos canais oficiais.

Investigue: Reddit, Twitter/X, comentários no LinkedIn e YouTube, ReclameAqui, Google Reviews, Glassdoor, blogs especializados, cobertura jornalística crítica, publicações de clientes e ex-funcionários.

Identifique: o que elogiam, criticam, desejam mas não encontram, mitos estabelecidos, contradições entre discurso oficial e percepção real, vocabulário próprio da comunidade.

Retorne APENAS JSON válido:
{
  "fontes": [
    {"fonte":"nome","tipo":"fórum|rede social|avaliação|mídia","tema":"tema central","volume":"alto|médio|baixo","sentimento":"positivo|negativo|ambivalente|neutro","citacoes":["paráfrase 1"],"sintese":"síntese em 2-3 frases"}
  ],
  "discursoDeRua": "o que as pessoas realmente dizem em 2-3 parágrafos",
  "vocabularioComunidade": ["termo 1", "jargão 2"],
  "contradicoes": ["contradição 1", "contradição 2"],
  "mitos": ["mito 1", "mito 2"],
  "desejos": ["desejo não atendido 1", "desejo 2"],
  "oportunidades": ["oportunidade 1", "oportunidade 2"],
  "alertas": ["alerta 1", "alerta 2"]
}`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: AMUM_SYSTEM,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
        messages: [{ role: 'user', content: prompt }],
      });

      try {
        return NextResponse.json({ ...JSON.parse(extractJson(extractText(response.content))), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear netnografia' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API de pesquisa' }, { status: 500 });
  }
}
