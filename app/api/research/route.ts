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

type WebSearchTool = { type: 'web_search_20250305'; name: 'web_search' };
const WEB_SEARCH: WebSearchTool[] = [{ type: 'web_search_20250305', name: 'web_search' }];

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}

function parseJSON(raw: string) {
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda, customInstructions } = await req.json();

    // ── GERAR AGENDA ─────────────────────────────────────────────────────────
    if (action === 'generate_agenda') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
${DOSSIE_FRAMEWORK}

Com base no contexto do projeto e no framework de 18 dimensões acima, gere uma agenda de pesquisa estratégica personalizada para esta marca específica.
Selecione as dimensões mais relevantes (entre 6 e 10 temas), adaptando os objetivos ao contexto específico do projeto.
${customInstructions ? `\nInstruções adicionais do estrategista:\n${customInstructions}` : ''}

Retorne APENAS um JSON válido com esta estrutura:
{
  "agenda": [
    {
      "id": "r1",
      "dimensao": 1,
      "tema": "nome do tema adaptado para esta marca",
      "objetivo": "o que precisamos descobrir — específico para esta marca",
      "queries": ["query de busca 1", "query de busca 2", "query de busca 3"]
    }
  ]
}
Retorne SOMENTE o JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json(parseJSON(extractText(r.content))); }
      catch { return NextResponse.json({ error: 'Erro ao parsear agenda', raw: extractText(r.content) }, { status: 500 }); }
    }

    // ── EXECUTAR PESQUISA ─────────────────────────────────────────────────────
    if (action === 'run_research') {
      const agendaItems = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] }[];
      const results = [];

      for (const item of agendaItems) {
        const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
TEMA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES: ${item.queries.join(' | ')}

Pesquise com profundidade. Separe: fatos verificáveis | leitura analítica | hipóteses interpretativas.
Não repita o discurso institucional sem crítica. Identifique contradições e tensões.

Retorne APENAS um JSON:
{
  "id": "${item.id}",
  "tema": "${item.tema}",
  "sintese": "síntese em 3-5 parágrafos densos",
  "fatos": ["fato 1", "fato 2"],
  "tensoes": ["tensão 1", "tensão 2"],
  "implicacoes": ["implicação 1", "implicação 2"],
  "fontes": ["fonte 1", "fonte 2"]
}
Retorne SOMENTE o JSON.`;

        const r = await client.messages.create({
          model: 'claude-sonnet-4-20250514', max_tokens: 2000,
          system: AMUM_SYSTEM,
          tools: WEB_SEARCH as unknown as Parameters<typeof client.messages.create>[0]["tools"],
          messages: [{ role: 'user', content: prompt }],
        });
        const text = extractText(r.content);
        try { results.push({ ...parseJSON(text), createdAt: new Date().toISOString() }); }
        catch { results.push({ id: item.id, tema: item.tema, sintese: text, fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() }); }
      }

      return NextResponse.json({ results });
    }

    // ── SÍNTESE FINAL ─────────────────────────────────────────────────────────
    if (action === 'synthesize_all') {
      const summary = agenda
        ? (agenda as { tema: string; sintese: string }[]).map(r => `## ${r.tema}\n${r.sintese}`).join('\n\n')
        : '';

      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
${summary ? `PESQUISA REALIZADA:\n${summary}\n\n` : ''}
Produza a síntese estratégica final do dossiê de marca.

Retorne APENAS um JSON:
{
  "tensaoCentral": "tensão geradora central em uma frase irrefutável",
  "desafioPrincipal": "principal desafio estratégico",
  "territorioDisponivel": "território de posicionamento disponível e autêntico",
  "promessaPrincipal": "o que a marca promete hoje",
  "percepcaoProvavel": "como o mercado a percebe na prática",
  "contradicaoCentral": "o que ela tenta ser vs. o que ainda é",
  "concorrentes": [{ "nome": "empresa", "arquetipo": "arquétipo", "posicao": "posicionamento" }],
  "pressoesExternas": ["pressão 1", "pressão 2"],
  "oPreservar": ["ativo 1", "ativo 2"],
  "oMudar": ["o que mudar 1", "o que mudar 2"],
  "meta12meses": "o que precisa ter acontecido em 12 meses",
  "direcaoEstrategica": "direção sugerida em 2-3 frases",
  "diagnostico": "diagnóstico final em 1 parágrafo preciso"
}
Retorne SOMENTE o JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json(parseJSON(extractText(r.content))); }
      catch { return NextResponse.json({ error: 'Erro ao parsear síntese', raw: extractText(r.content) }, { status: 500 }); }
    }

    // ── ANÁLISE DE REDES SOCIAIS ──────────────────────────────────────────────
    if (action === 'social_analysis') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Você é um analista estratégico de branding. Analise a presença em redes sociais da marca principal e dos concorrentes mencionados no contexto.

Para cada entidade, pesquise e analise:
1. Presença no Instagram, LinkedIn, YouTube e plataformas relevantes do setor
2. Volume de seguidores, frequência e consistência de postagem
3. Temas recorrentes e narrativa central construída
4. Tom de voz e formatos dominantes (stories, reels, carrosséis, artigos, vídeos)
5. Nível de engajamento e qualidade das interações
6. Ponto forte e ponto fraco da estratégia digital

Após analisar cada entidade, identifique:
- Territórios digitais já ocupados e saturados
- Territórios disponíveis como oportunidade
- Insights estratégicos de diferenciação

Retorne APENAS um JSON válido:
{
  "marca": {
    "entidade": "nome da marca",
    "tipo": "marca",
    "plataformas": [
      {
        "nome": "Instagram",
        "handle": "@handle",
        "seguidores": "estimativa",
        "frequencia": "X posts/semana",
        "temasRecorrentes": ["tema 1", "tema 2"],
        "tomDeVoz": "descrição",
        "formatosDominantes": ["formato 1"],
        "engajamento": "qualitativo",
        "pontoForte": "...",
        "pontoFraco": "..."
      }
    ],
    "posicionamento": "como se posiciona digitalmente em uma frase",
    "arquetipo": "arquétipo identificado"
  },
  "concorrentes": [
    {
      "entidade": "nome",
      "tipo": "concorrente",
      "plataformas": [],
      "posicionamento": "...",
      "arquetipo": "..."
    }
  ],
  "comparativo": "análise comparativa em 2-3 parágrafos",
  "territoriosOcupados": ["território saturado 1"],
  "territoriosVazios": ["território disponível 1"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}
Retorne SOMENTE o JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 4000,
        system: AMUM_SYSTEM,
        tools: WEB_SEARCH as unknown as Parameters<typeof client.messages.create>[0]["tools"],
        messages: [{ role: 'user', content: prompt }],
      });
      try {
        return NextResponse.json({ ...parseJSON(extractText(r.content)), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear análise social', raw: extractText(r.content) }, { status: 500 });
      }
    }

    // ── GOOGLE TRENDS & BUSCAS ────────────────────────────────────────────────
    if (action === 'trends_analysis') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Você é um analista estratégico de branding. Pesquise tendências de busca para esta marca e setor.

Investigue:
1. Termos de busca da marca, do setor e dos concorrentes — volume e direção
2. Direção das tendências nos últimos 12 meses (crescendo, estável, declínio)
3. Sazonalidade relevante (datas, eventos, ciclos do setor)
4. Termos emergentes ainda não adotados pelo mercado
5. Janelas de oportunidade baseadas em tendências macro
6. Gaps de conteúdo: alta busca com baixa oferta de resposta

Retorne APENAS um JSON válido:
{
  "termosAnalisados": ["termo 1", "termo 2"],
  "tendencias": [
    {
      "termo": "nome",
      "direcao": "crescendo",
      "contexto": "explicação da tendência"
    }
  ],
  "termosCrescentes": ["termo 1", "termo 2"],
  "termosDeclinando": ["termo 1"],
  "sazonalidade": "descrição dos picos sazonais — quando e por quê",
  "janelasDeOportunidade": ["janela 1 — timing", "janela 2"],
  "insights": ["insight 1", "insight 2", "insight 3"]
}
Retorne SOMENTE o JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000,
        system: AMUM_SYSTEM,
        tools: WEB_SEARCH as unknown as Parameters<typeof client.messages.create>[0]["tools"],
        messages: [{ role: 'user', content: prompt }],
      });
      try {
        return NextResponse.json({ ...parseJSON(extractText(r.content)), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear tendências', raw: extractText(r.content) }, { status: 500 });
      }
    }

    // ── NETNOGRAFIA ───────────────────────────────────────────────────────────
    if (action === 'netnography') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}

Você é um pesquisador netnográfico especializado em branding. Pesquise o que as pessoas dizem sobre esta marca e setor fora dos canais oficiais.

Investigue ativamente:
1. Reddit, Twitter/X, LinkedIn (comentários orgânicos), YouTube (comentários)
2. Sites de avaliação: Glassdoor, ReclameAqui, Google Reviews
3. Publicações de clientes, ex-clientes, funcionários atuais e ex
4. Blogs, portais especializados, cobertura jornalística crítica
5. Linguagem, memes e jargões que o público usa para se referir ao setor
6. Grupos e comunidades profissionais do setor

Para cada fonte: elogios, críticas, desejos não atendidos, mitos, contradições entre discurso oficial e percepção real.

Retorne APENAS um JSON válido:
{
  "fontes": [
    {
      "fonte": "nome da plataforma",
      "tipo": "fórum|rede social|avaliação|mídia|comunidade",
      "tema": "tema central",
      "volume": "alto|médio|baixo",
      "sentimento": "positivo|negativo|ambivalente|neutro",
      "citacoes": ["citação representativa 1", "citação 2"],
      "sintese": "o que essa fonte revela em 2-3 frases"
    }
  ],
  "discursoDeRua": "o que as pessoas realmente dizem em 2-3 parágrafos sem filtro institucional",
  "vocabularioComunidade": ["termo 1", "jargão 2", "expressão 3"],
  "contradicoes": ["contradição entre discurso e percepção 1", "contradição 2"],
  "mitos": ["mito estabelecido no mercado 1", "mito 2"],
  "desejos": ["desejo não atendido 1", "desejo 2", "desejo 3"],
  "oportunidades": ["oportunidade de posicionamento 1", "oportunidade 2"],
  "alertas": ["alerta estratégico 1", "alerta 2"]
}
Retorne SOMENTE o JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 4000,
        system: AMUM_SYSTEM,
        tools: WEB_SEARCH as unknown as Parameters<typeof client.messages.create>[0]["tools"],
        messages: [{ role: 'user', content: prompt }],
      });
      try {
        return NextResponse.json({ ...parseJSON(extractText(r.content)), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ error: 'Erro ao parsear netnografia', raw: extractText(r.content) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API de pesquisa' }, { status: 500 });
  }
}
