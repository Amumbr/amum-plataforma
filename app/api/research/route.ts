import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AMUM_SYSTEM = `Voce e o sistema de inteligencia estrategica da AMUM - consultoria de branding com metodologia proprietaria de 5 fases: Escuta, Decifracao, Reconstrucao, Travessia e Regeneracao.

Trabalha por tensao, nao por resposta pronta. Nomeia com precisao. Da espessura ao que produz.
Cada analise deve revelar tensoes, implicacoes e criterios de decisao - nao apenas informacao descritiva.

PRINCIPIOS DE PESQUISA:
1. Nao produza texto generico, publicitario ou decorativo.
2. Separe claramente: fato verificavel | leitura analitica | hipotese interpretativa.
3. Quando houver lacuna de informacao, sinalize a limitacao.
4. Nao repita o discurso institucional sem critica.
5. Compare sempre: o que a marca diz vs. o que ela faz vs. o que o publico tende a perceber.
6. Observe nao apenas a empresa, mas o setor, os codigos saturados, as pressoes externas e as contradicoes estruturais.`;

const DOSSIE_FRAMEWORK = `FRAMEWORK DE DOSSIE DE MARCA AMUM - 18 DIMENSOES:
1. VISAO GERAL DA MARCA
2. NEGOCIO E CONTEXTO
3. DESAFIO CENTRAL DA MARCA
4. VALORES, PROPOSITO E DIRECAO DECLARADA
5. PARA QUEM A MARCA EXISTE
6. COMO A MARCA SE APRESENTA HOJE
7. O QUE A MARCA QUER TRANSMITIR VS. O QUE AS PESSOAS RECEBEM
8. IDENTIDADE VISUAL E CODIGOS EXPRESSIVOS
9. COMUNICACAO DO SETOR
10. CONCORRENTES E REFERENCIAS
11. A GRANDE CONTRADICAO DO SETOR
12. A CONTRADICAO ESPECIFICA DA MARCA
13. PRESSOES EXTERNAS
14. O QUE NAO PODE SER PERDIDO
15. O QUE PRECISA MUDAR
16. RECURSOS DISPONÍVEIS E OBSTACULOS REAIS
17. HORIZONTE DE 12 MESES
18. SINTESE ESTRATEGICA FINAL`;

function robustParseJSON(raw: string): object {
  let parsed: unknown;

  // Method 1: strip markdown fences and try direct parse
  try {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    if (clean.startsWith('{') || clean.startsWith('[')) {
      parsed = JSON.parse(clean);
    }
  } catch { /* continue */ }

  // Method 2: brace-matching to find the outermost JSON object
  if (!parsed) {
    const firstBrace = raw.indexOf('{');
    if (firstBrace >= 0) {
      let depth = 0;
      let inString = false;
      let escape = false;
      let end = -1;
      for (let i = firstBrace; i < raw.length; i++) {
        const ch = raw[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end > firstBrace) {
        try { parsed = JSON.parse(raw.slice(firstBrace, end + 1)); }
        catch { /* continue */ }
      }
    }
  }

  if (!parsed) throw new Error('No valid JSON found. Start: ' + raw.slice(0, 200));

  // Always sanitize all string values to remove cite tags and stray HTML
  return sanitizeJSON(parsed) as object;
}

function sanitizeText(text: string): string {
  return text
    // Remove <cite index="...">...</cite> tags (web_search artifacts)
    .replace(/<cite[^>]*>[\s\S]*?<\/cite>/g, '')
    // Remove any other stray HTML tags that might leak
    .replace(/<[a-z][a-z0-9]*(\s[^>]*)?\/?>/gi, '')
    .replace(/<\/[a-z][a-z0-9]*>/gi, '')
    // Clean up extra whitespace left by removals
    .replace(/\s{3,}/g, '  ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Recursively sanitize all string values in a parsed JSON object
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

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  const raw = content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.Messages.TextBlock).text)
    .join('\n');
  return sanitizeText(raw);
}

type ToolParam = Parameters<typeof client.messages.create>[0]['tools'];
const WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }] as unknown as ToolParam;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectContext, agenda, customInstructions } = body;
    const ctx = projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : '';

    // GERAR AGENDA
    if (action === 'generate_agenda') {
      const prompt = `${ctx}${DOSSIE_FRAMEWORK}

Com base no contexto do projeto e no framework de 18 dimensoes acima, gere uma agenda de pesquisa estrategica personalizada com ENTRE 6 E 10 TEMAS.

REGRAS OBRIGATORIAS:
- Minimo de 6 temas, maximo de 10 — NUNCA menos de 6
- Cada tema deve ser especifico para esta marca — use os nomes REAIS da empresa, setor e concorrentes do projeto
- NUNCA use placeholders como [NOME_DA_MARCA] ou [SETOR] — substitua sempre pelos nomes reais
- Priorize dimensoes onde ha mais tensao ou contradicao aparente dado o contexto
- Para cada tema, defina 3 queries de busca especificas com os nomes reais, prontas para uso em buscador
${customInstructions ? `\nInstrucoes do estrategista: ${customInstructions}` : ''}

FORMATO DE SAIDA — retorne APENAS este JSON (sem texto antes ou depois, sem backticks):
{"agenda":[
{"id":"r1","dimensao":1,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]},
{"id":"r2","dimensao":3,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]},
{"id":"r3","dimensao":10,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]},
{"id":"r4","dimensao":11,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]},
{"id":"r5","dimensao":13,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]},
{"id":"r6","dimensao":18,"tema":"TEMA REAL DO PROJETO","objetivo":"OBJETIVO ESPECIFICO","queries":["QUERY REAL 1","QUERY REAL 2","QUERY REAL 3"]}
]}

Gere 6 a 10 itens com os dados reais do projeto. Adapte as dimensoes escolhidas ao que e mais relevante para esta marca especifica.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2500, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json(robustParseJSON(extractText(r.content))); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    // EXECUTAR PESQUISA
    if (action === 'run_research') {
      const items = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] }[];
      const results = [];
      for (const item of items) {
        const prompt = `${ctx}TEMA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES: ${item.queries.join(' | ')}

Pesquise este tema com profundidade usando web search. Identifique fatos, tensoes, contradicoes e implicacoes estrategicas.
Nao repita o discurso institucional. Compare o que a marca diz vs. faz vs. como e percebida.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"id":"${item.id}","tema":"${item.tema}","sintese":"sintese em 3-5 paragrafos","fatos":["fato1","fato2"],"tensoes":["tensao1"],"implicacoes":["implicacao1"],"fontes":["fonte1"]}`;

        const r = await client.messages.create({
          model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
          tools: WEB_SEARCH_TOOL,
          messages: [{ role: 'user', content: prompt }],
        });
        const text = extractText(r.content);
        try { results.push({ ...robustParseJSON(text), createdAt: new Date().toISOString() }); }
        catch { results.push({ id: item.id, tema: item.tema, sintese: text, fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() }); }
      }
      return NextResponse.json({ results });
    }

    // EXECUTAR PESQUISA — item único (chamado pelo cliente em loop para evitar timeout)
    if (action === 'run_research_item') {
      const item = agenda as { id: string; dimensao?: number; tema: string; objetivo: string; queries: string[] };
      const prompt = `${ctx}TEMA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES: ${item.queries.join(' | ')}

Pesquise este tema com profundidade usando web search. Identifique fatos verificáveis, tensões, contradições e implicações estratégicas.
Não repita o discurso institucional. Compare o que a marca diz vs. faz vs. como é percebida.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"id":"${item.id}","tema":"${item.tema}","sintese":"síntese em 3-5 parágrafos densos","fatos":["fato1","fato2"],"tensoes":["tensão1"],"implicacoes":["implicação1"],"fontes":["fonte1"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
        tools: WEB_SEARCH_TOOL,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractText(r.content);
      try {
        return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() });
      } catch {
        return NextResponse.json({ id: item.id, tema: item.tema, sintese: text, fatos: [], tensoes: [], implicacoes: [], fontes: [], createdAt: new Date().toISOString() });
      }
    }
    if (action === 'synthesize_all') {
      const summary = agenda ? (agenda as { tema: string; sintese: string }[]).map(r => `## ${r.tema}\n${r.sintese}`).join('\n\n') : '';
      const prompt = `${ctx}${summary ? `PESQUISA REALIZADA:\n${summary}\n\n` : ''}Produza a sintese estrategica final do dossie de marca.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"tensaoCentral":"","desafioPrincipal":"","territorioDisponivel":"","promessaPrincipal":"","percepcaoProvavel":"","contradicaoCentral":"","concorrentes":[{"nome":"","arquetipo":"","posicao":""}],"pressoesExternas":[],"oPreservar":[],"oMudar":[],"meta12meses":"","direcaoEstrategica":"","diagnostico":""}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2500, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json(robustParseJSON(extractText(r.content))); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    // ANALISE DE REDES SOCIAIS
    if (action === 'social_analysis') {
      const prompt = `${ctx}Voce e um analista estrategico de branding. Analise a presenca em redes sociais da marca e dos concorrentes no contexto.

Para cada entidade pesquise: Instagram, LinkedIn, YouTube e plataformas relevantes do setor.
Identifique: seguidores, frequencia, temas recorrentes, tom de voz, formatos, engajamento, ponto forte, ponto fraco.
Compare e mapeie territorios digitais ocupados vs. disponiveis.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"marca":{"entidade":"nome","tipo":"marca","plataformas":[{"nome":"Instagram","handle":"@","seguidores":"X","frequencia":"X/semana","temasRecorrentes":["t1"],"tomDeVoz":"desc","formatosDominantes":["f1"],"engajamento":"desc","pontoForte":"","pontoFraco":""}],"posicionamento":"frase","arquetipo":""},"concorrentes":[{"entidade":"nome","tipo":"concorrente","plataformas":[],"posicionamento":"","arquetipo":""}],"comparativo":"2-3 paragrafos","territoriosOcupados":["t1"],"territoriosVazios":["t1"],"insights":["i1","i2","i3"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 5000, system: AMUM_SYSTEM,
        tools: WEB_SEARCH_TOOL,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractText(r.content);
      try { return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 }); }
    }

    // GOOGLE TRENDS
    if (action === 'trends_analysis') {
      const prompt = `${ctx}Voce e um analista de branding. Pesquise tendencias de busca para esta marca e setor.

Investigue: termos da marca + setor + concorrentes, direcao nos ultimos 12 meses, sazonalidade, termos emergentes, janelas de oportunidade, gaps de conteudo.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"termosAnalisados":["t1","t2"],"tendencias":[{"termo":"","direcao":"crescendo","contexto":""}],"termosCrescentes":["t1"],"termosDeclinando":["t1"],"sazonalidade":"desc","janelasDeOportunidade":["j1"],"insights":["i1","i2"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
        tools: WEB_SEARCH_TOOL,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractText(r.content);
      try { return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 }); }
    }

    // NETNOGRAFIA
    if (action === 'netnography') {
      const prompt = `${ctx}Voce e um pesquisador netnografico especializado em branding. Pesquise o discurso organico sobre esta marca e setor.

Investigue: Reddit, Twitter/X, LinkedIn comentarios organicos, YouTube comentarios, ReclameAqui, Google Reviews, Glassdoor, blogs especializados, portais do setor.
Para cada fonte: elogios, criticas, desejos nao atendidos, mitos, contradicoes entre discurso oficial e percepcao real.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"fontes":[{"fonte":"nome","tipo":"forum|rede social|avaliacao|midia","tema":"","volume":"alto|medio|baixo","sentimento":"positivo|negativo|ambivalente|neutro","citacoes":["c1"],"sintese":"2-3 frases"}],"discursoDeRua":"2-3 paragrafos","vocabularioComunidade":["t1","t2"],"contradicoes":["c1"],"mitos":["m1"],"desejos":["d1","d2"],"oportunidades":["o1"],"alertas":["a1"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 5000, system: AMUM_SYSTEM,
        tools: WEB_SEARCH_TOOL,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = extractText(r.content);
      try { return NextResponse.json({ ...robustParseJSON(text), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: text, detail: String(e) }, { status: 500 }); }
    }

    // EXTRAIR DIRETRIZES — fusão de todas as camadas de dados anteriores
    if (action === 'extract_directives') {
      // Truncate context to avoid token limit — keep most important layers
      const ctxTruncated = ctx.length > 8000 ? ctx.slice(0, 8000) + '\n[...contexto truncado para processamento]' : ctx;

      const prompt = `${ctxTruncated}
Voce e um estrategista senior da AMUM. Faca uma LEITURA CRUZADA de todas as camadas de informacao acima e defina diretrizes de pesquisa.

As camadas disponiveis podem incluir: dados do site AMUM (diagnostico, brand_context, relatorios do funil), documentos internos da empresa, pesquisa setorial (dossie), intel feed.

Sua tarefa: FUNDIR essas camadas para encontrar o atrito entre o que a marca declara e o que os dados externos revelam.

Defina:
1. MARCAS/PERFIS para redes sociais: a propria marca + concorrentes identificados + referencias relevantes
2. TERMOS-CHAVE para Google Trends: termos do discurso da marca vs. termos que o mercado efetivamente busca
3. COMUNIDADES/ESPACOS para netnografia: onde o publico desta marca/setor conversa organicamente
4. PLATAFORMAS prioritarias: baseado no setor e perfil do publico
5. TENSAO CENTRAL: a tensao que aparece em mais de uma camada de dados

Para cada item, justifique de qual(is) camada(s) ele emerge.

Retorne APENAS o seguinte JSON, sem texto antes ou depois:
{"marcas":[{"id":"m1","tipo":"marca","valor":"nome da marca principal","justificativa":"fonte dos dados","ativo":true},{"id":"m2","tipo":"marca","valor":"concorrente 1","justificativa":"fonte","ativo":true},{"id":"m3","tipo":"marca","valor":"concorrente 2","justificativa":"fonte","ativo":true}],"termos":[{"id":"t1","tipo":"termo","valor":"termo 1","justificativa":"fonte","ativo":true},{"id":"t2","tipo":"termo","valor":"termo 2","justificativa":"fonte","ativo":true},{"id":"t3","tipo":"termo","valor":"termo 3","justificativa":"fonte","ativo":true}],"comunidades":[{"id":"c1","tipo":"comunidade","valor":"comunidade 1","justificativa":"fonte","ativo":true},{"id":"c2","tipo":"comunidade","valor":"comunidade 2","justificativa":"fonte","ativo":true}],"plataformas":[{"id":"p1","tipo":"plataforma","valor":"Instagram","justificativa":"fonte","ativo":true},{"id":"p2","tipo":"plataforma","valor":"LinkedIn","justificativa":"fonte","ativo":true}],"tensaoCentral":"tensao central que atravessa multiplas camadas"}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      const rawText = extractText(r.content);
      try { return NextResponse.json(robustParseJSON(rawText)); }
      catch (e) {
        console.error('[extract_directives] parse error:', e, 'raw:', rawText.slice(0, 300));
        return NextResponse.json({ error: `Erro ao parsear diretrizes: ${String(e)}`, raw: rawText.slice(0, 500) }, { status: 500 });
      }
    }

    // SÍNTESE GERAL — relatório unificado de toda a pesquisa
    if (action === 'research_synthesis') {
      const prompt = `${ctx}
Voce e um estrategista senior da AMUM. Produza o relatorio de sintese final que fecha a fase de Escuta e prepara o estrategista para as entrevistas.

Este relatorio integra TODAS as camadas de informacao disponiveis:
- Pre-pesquisa: dados do site AMUM (diagnostico, brand_context, relatorios do funil digital), documentos internos da empresa
- Pesquisa primaria: dossie de mercado (18 dimensoes), analise de redes sociais, tendencias de busca, netnografia

Principios de integracao:
1. O que e CONFIRMADO por multiplas fontes tem peso maior que o que aparece em apenas uma
2. As CONTRADICOES entre camadas sao mais reveladoras que as confirmacoes — onde o que a marca declara (documentos) diverge do que o mercado percebe (dossie/netnografia), ali esta a tensao estrategica real
3. Os insights mais valiosos emergem do ATRITO entre o que a marca acredita ser e o que os dados externos mostram
4. As perguntas para entrevista devem ser formuladas para investigar exatamente os pontos onde as fontes divergem ou onde ha lacunas nao respondidas por nenhuma camada

O relatorio deve dar ao estrategista o embasamento necessario para conduzir as entrevistas com profundidade — sabendo de antemao onde estao as tensoes, o que precisa ser confirmado em campo e quais hipoteses precisam ser testadas.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"visaoGeral":"panorama integrado em 2-3 paragrafos — o que o conjunto de todas as fontes revela sobre esta marca e seu momento","tensaoCentral":"a tensao que aparece em multiplas camadas de dados em uma frase precisa e irrefutavel","territorioDisponivel":"territorio identificado com evidencias convergentes de pelo menos duas fontes","mapaCompetitivoDigital":"como os concorrentes se posicionam digitalmente vs. o que o dossie revela sobre eles — 1-2 paragrafos","discursoDeRua":"o que as comunidades dizem que contradiz ou complementa o discurso oficial — 1-2 paragrafos","contradicoesCentral":["contradicao identificada em multiplas camadas 1 — indicar as fontes","contradicao 2 — indicar as fontes"],"janelasOportunidade":["janela com base de evidencia e timing 1","janela 2","janela 3"],"insightsIntegrados":["insight que so aparece ao cruzar pelo menos duas camadas 1","insight 2","insight 3","insight 4"],"recomendacoesEstrategicas":["recomendacao baseada em convergencia de evidencias 1","recomendacao 2","recomendacao 3"],"perguntasParaEntrevista":["pergunta que investiga tensao especifica identificada nos dados 1","pergunta que testa hipotese emergente 2","pergunta sobre lacuna nao respondida pelas pesquisas 3","pergunta 4","pergunta 5"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 4000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json({ ...robustParseJSON(extractText(r.content)), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    // SÍNTESE DE AUDITORIA DE CANAIS — especialista em marketing/social media
    if (action === 'brand_audit_synthesis') {
      const { brandAuditResults } = body as { brandAuditResults: unknown[] };
      const resultsText = JSON.stringify(brandAuditResults || [], null, 2);
      const prompt = `${ctx}
RESULTADOS DA AUDITORIA DE CANAIS DA MARCA:
${resultsText.slice(0, 6000)}

Você é um especialista sênior em marketing, comunicação e social media com profundo conhecimento em branding estratégico.
Seu olhar é diagnóstico e interno — você está analisando os canais da própria marca para entender o que ela está efetivamente comunicando.

Com base nos dados coletados de cada canal, produza uma síntese diagnóstica estratégica que responda:

1. DIAGNÓSTICO: O que a marca está efetivamente comunicando? (não o que declara — o que os dados mostram)
2. COERÊNCIA: A comunicação atual é coerente com o posicionamento declarado pela marca? Onde há alinhamento e onde há ruptura?
3. DESPERDÍCIO: Onde há potencial claro não explorado? Que oportunidades os dados revelam?
4. CONTRADIÇÕES: Que tensões internas aparecem entre canais ou entre discurso e prática?
5. RECOMENDAÇÕES: Quais direcionamentos estratégicos emergem dessa leitura?

Seja preciso, crítico e útil. Evite elogios genéricos. Nomeie tensões com clareza.

Retorne APENAS o seguinte JSON e nada mais:
{"diagnostico":"o que a marca está realmente comunicando em 3-4 parágrafos densos","coerencia":"análise de coerência entre comunicação atual e posicionamento declarado em 2-3 parágrafos","desperdicio":["potencial não explorado 1","potencial não explorado 2","potencial não explorado 3"],"contradicoes":["contradição interna detectada 1","contradição 2"],"recomendacoes":["recomendação estratégica baseada nos dados 1","recomendação 2","recomendação 3","recomendação 4"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json({ ...robustParseJSON(extractText(r.content)), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    // SÍNTESE DE SOCIAL RESEARCH — especialista cruzando brand audit + mercado
    if (action === 'social_expert_synthesis') {
      const { socialListeningResults, brandAuditSynthesis: bas } = body as { socialListeningResults: unknown[]; brandAuditSynthesis: unknown };
      const listeningText = JSON.stringify(socialListeningResults || [], null, 2);
      const auditText = bas ? JSON.stringify(bas, null, 2) : 'Não disponível';

      const prompt = `${ctx}
AUDITORIA DOS CANAIS DA PRÓPRIA MARCA (diagnóstico interno):
${auditText.slice(0, 2000)}

SOCIAL LISTENING DO MERCADO (concorrentes e referências):
${listeningText.slice(0, 5000)}

Você é um especialista sênior em social media, marketing e comunicação de marca.
Seu olhar é comparativo e estratégico — você está mapeando o campo de disputa para identificar onde a marca pode avançar.

Analise o conjunto e produza uma síntese estratégica que responda:

1. TERRITÓRIOS OCUPADOS: quais espaços simbólicos e comunicacionais os players do mercado já dominam
2. TERRITÓRIOS DISPONÍVEIS: quais espaços ainda não foram reivindicados por ninguém com consistência
3. COMPARATIVO COM A MARCA: dado o que a auditoria interna revelou, onde a marca tem vantagem real vs. onde está em desvantagem
4. INSIGHTS ESTRATÉGICOS: o que o cruzamento brand audit + mercado revela que nenhuma análise isolada mostraria
5. OPORTUNIDADES DE POSICIONAMENTO: janelas concretas para a marca avançar no espaço digital
6. ALERTAS: riscos ou movimentos do mercado que precisam de atenção imediata

Retorne APENAS o seguinte JSON e nada mais:
{"territoriosOcupados":["território dominado por players do mercado 1","território 2","território 3"],"territoriosDisponiveis":["território disponível 1","território 2","território 3"],"comparativoComMarca":"análise comparativa em 3-4 parágrafos — onde a marca tem vantagem real e onde está em desvantagem","insights":["insight que emerge do cruzamento brand audit + mercado 1","insight 2","insight 3","insight 4"],"oportunidades":["oportunidade concreta de posicionamento 1","oportunidade 2","oportunidade 3"],"alertas":["alerta estratégico 1","alerta 2"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json({ ...robustParseJSON(extractText(r.content)), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    // RELATÓRIO CONSOLIDADO — integração de todas as pesquisas + pesquisas independentes
    if (action === 'consolidate_report') {
      const { independentResearch } = body as { independentResearch: { filename: string; content: string }[] };
      const independentText = independentResearch?.length
        ? independentResearch.map(r => `\n--- ${r.filename} ---\n${r.content.slice(0, 2000)}`).join('\n')
        : '';

      const prompt = `${ctx}${independentText ? `\nPESQUISAS INDEPENDENTES FORNECIDAS PELO USUÁRIO:\n${independentText.slice(0, 4000)}\n` : ''}

Você é um estrategista sênior da AMUM. Produza o Relatório Consolidado de Pesquisa — o documento que fecha a fase de inteligência e prepara as entrevistas.

Este relatório integra TODAS as camadas disponíveis:
- Dados do cliente (site AMUM, documentos internos, diagnóstico digital)
- Pesquisa de Mercado (dossiê setorial com lentes geopolítica/ESG/jornalismo)
- Auditoria de Canais da Marca (diagnóstico interno dos canais próprios)
- Pesquisa de Redes Sociais (social listening do mercado)
- Pesquisas independentes fornecidas pelo usuário (se presentes)

Princípios de integração:
1. Contradições entre camadas são mais reveladoras que confirmações
2. O que é confirmado por múltiplas fontes tem peso maior
3. O atrito entre o que a marca declara e o que os dados externos mostram é a tensão estratégica real
4. Pesquisas independentes devem ser incorporadas com identificação de fonte e grau de convergência com as demais

Estruture o relatório em markdown com seções claras. Seja denso, preciso e estratégico.

ESTRUTURA DO RELATÓRIO:
# Relatório Consolidado de Pesquisa — [Nome do Projeto]
## Panorama Integrado
## Tensão Central
## O Que a Marca Está Comunicando (Auditoria Interna)
## O Que o Mercado Está Fazendo (Pesquisa de Redes Sociais)
## Contexto Setorial Ampliado (Dossiê de Mercado)
## Contradições Identificadas
## Território Disponível
## Janelas de Oportunidade
## O Que as Pesquisas Independentes Acrescentam [incluir apenas se houver]
## Direcionamentos para as Entrevistas

Retorne o relatório completo em texto markdown, sem JSON.`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 6000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      return NextResponse.json({ report: extractText(r.content), createdAt: new Date().toISOString() });
    }

    // GERAR PERGUNTAS PARA ENTREVISTADO — pesquisador sênior calibrado por cargo e minibiografia
    if (action === 'generate_interview_questions') {
      const { interviewee } = body as { interviewee: { nome: string; cargo: string; minibio: string } };
      if (!interviewee) return NextResponse.json({ error: 'Interviewee data required' }, { status: 400 });

      // Calibrar o ângulo baseado no cargo
      const cargoLower = interviewee.cargo.toLowerCase();
      let cargoAngulo = '';
      if (cargoLower.includes('ceo') || cargoLower.includes('fundador') || cargoLower.includes('sócio') || cargoLower.includes('presidente')) {
        cargoAngulo = `ÂNGULO: Visão estratégica, decisões fundacionais, contradições entre intenção e realidade, legado vs. futuro, o que a empresa ainda não conseguiu dizer ao mundo. Perguntas devem revelar convicções profundas, medos estratégicos e a distância entre o projeto mental da empresa e o que está visível externamente.`;
      } else if (cargoLower.includes('diretor') || cargoLower.includes('gerente') || cargoLower.includes('head')) {
        cargoAngulo = `ÂNGULO: Operação vivida, cultura real vs. cultura declarada, gap entre o que é comunicado internamente e o que chega ao mercado, o que é sabido mas não dito, onde a estratégia encontra atrito com a realidade. Perguntas devem revelar a distância entre decisão e execução.`;
      } else if (cargoLower.includes('colaborador') || cargoLower.includes('analista') || cargoLower.includes('assistente') || cargoLower.includes('coordenador')) {
        cargoAngulo = `ÂNGULO: Percepção cotidiana, o que os clientes realmente dizem, o que nunca é reportado para cima, o orgulho que parece óbvio demais para mencionar, as tensões que aparecem no dia a dia mas não chegam à liderança. Perguntas devem revelar o que a empresa sabe mas não registra.`;
      } else if (cargoLower.includes('cliente')) {
        cargoAngulo = `ÂNGULO: Experiência real de consumo, percepção externa, o que faz continuar (ou não) com a marca, o que seria necessário para recomendar (ou parar de recomendar), onde a entrega fica aquém da promessa. Perguntas devem revelar a realidade da experiência de marca.`;
      } else {
        cargoAngulo = `ÂNGULO: Perspectiva específica do cargo de ${interviewee.cargo}, experiência vivida com a marca, percepções relevantes para branding e posicionamento.`;
      }

      const prompt = `${ctx}
ENTREVISTADO:
Nome: ${interviewee.nome}
Cargo: ${interviewee.cargo}
Minibiografia: ${interviewee.minibio}

${cargoAngulo}

Você é um pesquisador sênior especializado em escuta qualitativa para projetos de branding estratégico.
Com base em TODO o contexto do projeto acima e na minibiografia e cargo deste entrevistado específico, formule perguntas de entrevista em profundidade.

As perguntas devem:
1. Ser calibradas para o cargo e experiência desta pessoa específica
2. Investigar as tensões e lacunas identificadas nas pesquisas
3. Testar hipóteses que emergiram dos dados coletados
4. Revelar o que essa pessoa específica sabe que nenhuma pesquisa documental mostraria
5. Ter sequência lógica: da mais aberta para a mais precisa
6. Evitar perguntas fechadas (sim/não) e perguntas que induzam resposta

Se a minibiografia revelar trajetória relevante (setor anterior, formação específica, histórico de transição), incorpore isso nas perguntas.

Gere entre 8 e 12 perguntas. Retorne APENAS o seguinte JSON e nada mais:
{"perguntas":["Pergunta 1 — aberta, de aquecimento","Pergunta 2","Pergunta 3","Pergunta 4","Pergunta 5 — sobre tensão específica identificada nos dados","Pergunta 6","Pergunta 7","Pergunta 8 — de fechamento, convite para adicionar o que não foi perguntado"]}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 2000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json({ ...robustParseJSON(extractText(r.content)), createdAt: new Date().toISOString() }); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
    }

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 });

  } catch (err) {
    console.error('[research]', err);
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 });
  }
}
