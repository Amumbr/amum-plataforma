import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy client — only instantiated at runtime (not during build)
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

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

function sanitizeText(text: string): string {
  return text
    .replace(/<cite[^>]*>[\s\S]*?<\/cite>/g, '')
    .replace(/<[a-z][a-z0-9]*(\s[^>]*)?\/?>]/gi, '')
    .replace(/<\/[a-z][a-z0-9]*>/gi, '')
    .replace(/\s{3,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeJSON(obj: unknown): unknown {
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeJSON);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, sanitizeJSON(v)])
    );
  }
  return obj;
}

function robustParseJSON(raw: string): object {
  let parsed: unknown;

  try {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    if (clean.startsWith('{') || clean.startsWith('[')) {
      parsed = JSON.parse(clean);
    }
  } catch { /* continue */ }

  if (!parsed) {
    const firstBrace = raw.indexOf('{');
    if (firstBrace >= 0) {
      let depth = 0, inString = false, escape = false, end = -1;
      for (let i = firstBrace; i < raw.length; i++) {
        const ch = raw[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end > firstBrace) {
        try { parsed = JSON.parse(raw.slice(firstBrace, end + 1)); } catch { /* continue */ }
      }
    }
  }

  if (!parsed) throw new Error('No valid JSON found. Start: ' + raw.slice(0, 200));
  return sanitizeJSON(parsed) as object;
}

async function callOpenAIWithSearch(prompt: string): Promise<string> {
  const response = await getClient().responses.create({
    model: 'gpt-4o-search-preview',
    tools: [{ type: 'web_search_preview' as const }],
    input: `${AMUM_SYSTEM}\n\n${prompt}`,
  });

  // Extract text from output items — use output_text shorthand
  const text = response.output_text || '';

  return sanitizeText(text);
}

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda } = await req.json();
    const ctx = projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : '';

    // PESQUISA — item único do dossiê
    if (action === 'run_research_item') {
      const item = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] };

      const prompt = `${ctx}TEMA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES SUGERIDAS: ${item.queries.join(' | ')}

Pesquise este tema com profundidade usando web search. Faça múltiplas buscas para cobrir diferentes ângulos.
Identifique fatos verificáveis, tensões, contradições e implicações estratégicas.
Não repita o discurso institucional. Compare o que a marca diz vs. faz vs. como é percebida.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"id":"${item.id}","tema":"${item.tema}","sintese":"síntese em 3-5 parágrafos densos","fatos":["fato1","fato2"],"tensoes":["tensão1"],"implicacoes":["implicação1"],"fontes":["fonte1"]}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ id: item.id, tema: item.tema, sintese: text, fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() });
      }
    }

    // ANÁLISE DE REDES SOCIAIS
    if (action === 'social_analysis') {
      const prompt = `${ctx}Você é um analista estratégico de branding. Analise a presença em redes sociais da marca e dos concorrentes no contexto.

Pesquise cada entidade no Instagram, LinkedIn, YouTube e plataformas relevantes do setor.
Para cada perfil identifique: seguidores aproximados, frequência de postagem, temas recorrentes, tom de voz, formatos dominantes, engajamento, ponto forte, ponto fraco.
Compare e mapeie territórios digitais ocupados vs. disponíveis.
Baseie-se em dados reais — acesse os perfis e verifique o que está publicado.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"marca":{"entidade":"nome","tipo":"marca","plataformas":[{"nome":"Instagram","handle":"@","seguidores":"X","frequencia":"X/semana","temasRecorrentes":["t1"],"tomDeVoz":"desc","formatosDominantes":["f1"],"engajamento":"desc","pontoForte":"","pontoFraco":""}],"posicionamento":"frase","arquetipo":""},"concorrentes":[{"entidade":"nome","tipo":"concorrente","plataformas":[],"posicionamento":"","arquetipo":""}],"comparativo":"2-3 parágrafos","territoriosOcupados":["t1"],"territoriosVazios":["t1"],"insights":["i1","i2","i3"]}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch (e) {
        return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 });
      }
    }

    // GOOGLE TRENDS / TENDÊNCIAS DE BUSCA
    if (action === 'trends_analysis') {
      const prompt = `${ctx}Você é um analista de branding especializado em tendências digitais. Pesquise tendências de busca para esta marca e setor.

Investigue: volume e direção de busca dos termos da marca + setor + concorrentes nos últimos 12 meses, sazonalidade, termos emergentes, janelas de oportunidade, gaps de conteúdo.
Use dados reais de fontes como Google Trends, relatórios de mercado, mídia especializada.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"termosAnalisados":["t1","t2"],"tendencias":[{"termo":"","direcao":"crescendo","contexto":""}],"termosCrescentes":["t1"],"termosDeclinando":["t1"],"sazonalidade":"desc","janelasDeOportunidade":["j1"],"insights":["i1","i2"]}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch (e) {
        return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 });
      }
    }

    // NETNOGRAFIA
    if (action === 'netnography') {
      const prompt = `${ctx}Você é um pesquisador netnográfico especializado em branding. Pesquise o discurso orgânico sobre esta marca e setor na internet.

Investigue: Reddit, Twitter/X, LinkedIn (comentários orgânicos), YouTube (comentários), ReclameAqui, Google Reviews, Glassdoor, blogs especializados, portais do setor, fóruns.
Para cada fonte identifique: elogios, críticas, desejos não atendidos, mitos, contradições entre discurso oficial e percepção real.
Acesse fontes reais — cite o que as pessoas efetivamente dizem.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"fontes":[{"fonte":"nome","tipo":"forum|rede social|avaliacao|midia","tema":"","volume":"alto|medio|baixo","sentimento":"positivo|negativo|ambivalente|neutro","citacoes":["c1"],"sintese":"2-3 frases"}],"discursoDeRua":"2-3 parágrafos","vocabularioComunidade":["t1","t2"],"contradicoes":["c1"],"mitos":["m1"],"desejos":["d1","d2"],"oportunidades":["o1"],"alertas":["a1"]}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch (e) {
        return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (err) {
    console.error('[openai-research]', err);
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 });
  }
}
