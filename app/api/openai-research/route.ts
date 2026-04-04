import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 300;

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
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-search-preview',
    web_search_options: {},
    messages: [
      { role: 'system', content: AMUM_SYSTEM },
      { role: 'user', content: prompt },
    ],
  });

  const text = response.choices[0]?.message?.content || '';
  return sanitizeText(text);
}

export async function GET() {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY não configurada' });

    // Quick probe: list models (lightweight, no tokens consumed)
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, error: data });

    const hasSearch = (data.data as { id: string }[]).some(m =>
      m.id.includes('search') || m.id.includes('gpt-4o-search')
    );
    const searchModels = (data.data as { id: string }[])
      .filter(m => m.id.includes('search'))
      .map(m => m.id);

    return NextResponse.json({ ok: true, keyPrefix: key.slice(0, 8) + '...', hasSearch, searchModels });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectContext, agenda, url } = body;
    const ctx = projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : '';

    // PESQUISA DE MERCADO — item único do dossiê com lentes ampliadas
    if (action === 'run_research_item') {
      const item = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] };

      const prompt = `${ctx}TEMA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES SUGERIDAS: ${item.queries.join(' | ')}

Pesquise este tema com profundidade usando web search. Faça múltiplas buscas para cobrir diferentes ângulos.
Leia o tema pelas seguintes lentes obrigatórias:
- GEOPOLÍTICA E MACROECONOMIA: quais forças externas pressionam este setor?
- MARKETING E COMUNICAÇÃO: como o mercado se comunica, quais tendências de linguagem?
- ESG E ODS: quais compromissos e pressões de sustentabilidade estão em jogo?
- JORNALISMO E MÍDIA ESPECIALIZADA: o que a imprensa publicou nos últimos 12 meses?

Priorize matérias jornalísticas, relatórios de consultorias e dados de mercado verificáveis.
Identifique fatos verificáveis, tensões estruturais, contradições e implicações estratégicas.
Não repita discurso institucional. Compare o que a marca diz vs. faz vs. como é percebida.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"id":"${item.id}","tema":"${item.tema}","sintese":"síntese em 3-5 parágrafos densos","fatos":["fato1","fato2"],"tensoes":["tensão1"],"implicacoes":["implicação1"],"lentesGeopolitica":"análise geopolítica/macro em 2-3 frases","lentesESG":"análise ESG/ODS em 2-3 frases","midiaEspecializada":["manchete ou dado jornalístico 1","manchete 2"],"fontes":["fonte1"]}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ id: item.id, tema: item.tema, sintese: text, fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() });
      }
    }

    // AUDITORIA DE CANAL — análise de um canal próprio da marca por URL
    if (action === 'brand_channel_research') {
      const channelUrl = url || '';
      const prompt = `${ctx}CANAL A ANALISAR: ${channelUrl}

Você é um especialista sênior em marketing, comunicação e social media com 15 anos de experiência em branding estratégico.
Pesquise na web sobre este canal/perfil/página — busque o nome da marca associado à URL, publicações recentes, menções em imprensa, descrições do perfil e qualquer dado público disponível. Seu objetivo é entender o que a marca está EFETIVAMENTE comunicando, não o que ela diz que comunica.

Com base no que encontrar nas buscas, analise:
- Posicionamento atual visível
- Tom de voz dominante e variações
- Temas recorrentes e ausências significativas
- Frequência e consistência de publicação (estime se não tiver dado exato)
- Qualidade do engajamento (comentários, compartilhamentos — não apenas curtidas)
- Ponto forte mais evidente
- Ponto fraco mais crítico
- Coerência com posicionamento declarado

Pergunta central: o que está sendo comunicado? É coerente com o que a marca declara ser? Onde há potencial desperdiçado?
Se o perfil tiver poucos dados públicos indexados, registre isso explicitamente na síntese e analise o que foi possível encontrar.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"url":"${channelUrl}","canal":"Instagram|LinkedIn|YouTube|Site|TikTok|outro","sintese":"síntese diagnóstica em 3 parágrafos","temas":["t1","t2","t3"],"tomDeVoz":"descrição do tom dominante","frequencia":"X posts/semana ou X/mês ou estimativa","engajamento":"descrição qualitativa do engajamento","pontoForte":"o ponto mais forte observado","pontoFraco":"o ponto mais crítico observado"}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch {
        // Fallback: retorna objeto parcial com texto bruto na síntese — usuário vê a resposta mesmo sem JSON válido
        return NextResponse.json({
          url: channelUrl,
          canal: 'desconhecido',
          sintese: text,
          temas: [],
          tomDeVoz: '',
          frequencia: '',
          engajamento: '',
          pontoForte: '',
          pontoFraco: '',
          parseError: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // SOCIAL LISTENING — análise de perfil externo (concorrente/referência) por URL
    if (action === 'social_listening_item') {
      const listeningUrl = url || '';
      const prompt = `${ctx}PERFIL A ANALISAR: ${listeningUrl}

Você é um especialista sênior em social media, marketing e comunicação de marca.
Pesquise na web sobre este perfil/canal — busque o nome da marca ou empresa associada à URL, publicações recentes, menções em imprensa e qualquer dado público disponível. Seu objetivo é mapear o território que este player está ocupando no espaço digital.

Com base no que encontrar nas buscas, analise:
- Posicionamento comunicado (o que eles dizem ser)
- Arquétipo de marca dominante na comunicação
- Temas mais recorrentes
- Tom de voz e linguagem predominante
- Frequência e formatos utilizados (estime se não tiver dado exato)
- Força e fraqueza estratégica principal
- Qual território simbólico/digital este player ocupa

Se o perfil tiver poucos dados públicos indexados, registre isso explicitamente no campo posicionamento e analise o que foi possível encontrar.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"url":"${listeningUrl}","entidade":"nome da marca/canal","posicionamento":"como se posicionam estrategicamente em 2-3 frases","arquetipo":"arquétipo dominante","temas":["t1","t2","t3"],"tomDeVoz":"descrição do tom","frequencia":"estimativa de frequência de publicação","pontoForte":"principal força estratégica","pontoFraco":"principal fraqueza estratégica","territorioOcupado":"qual espaço simbólico este player domina"}`;

      const text = await callOpenAIWithSearch(prompt);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch {
        // Fallback: retorna objeto parcial com texto bruto no posicionamento — usuário vê a resposta mesmo sem JSON válido
        return NextResponse.json({
          url: listeningUrl,
          entidade: listeningUrl,
          posicionamento: text,
          arquetipo: '',
          temas: [],
          tomDeVoz: '',
          frequencia: '',
          pontoForte: '',
          pontoFraco: '',
          territorioOcupado: '',
          parseError: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (err) {
    const e = err as Record<string, unknown>;
    const detail = {
      message: e?.message ?? String(err),
      status: e?.status,
      code: e?.code,
      type: e?.type,
      openaiError: e?.error,
    };
    console.error('[openai-research] FULL ERROR:', JSON.stringify(detail));
    return NextResponse.json({ error: 'Erro interno', detail: JSON.stringify(detail) }, { status: 500 });
  }
}
