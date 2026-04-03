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
  // Method 1: strip markdown fences and try direct parse
  try {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    if (clean.startsWith('{') || clean.startsWith('[')) {
      return JSON.parse(clean);
    }
  } catch { /* continue */ }

  // Method 2: brace-matching to find the outermost JSON object
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
      try { return JSON.parse(raw.slice(firstBrace, end + 1)); }
      catch { /* continue */ }
    }
  }

  throw new Error('No valid JSON found. Start: ' + raw.slice(0, 200));
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.Messages.TextBlock).text)
    .join('\n');
}

type ToolParam = Parameters<typeof client.messages.create>[0]['tools'];
const WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }] as unknown as ToolParam;

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda, customInstructions } = await req.json();
    const ctx = projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : '';

    // GERAR AGENDA
    if (action === 'generate_agenda') {
      const prompt = `${ctx}${DOSSIE_FRAMEWORK}

Com base no contexto do projeto e no framework acima, gere uma agenda de pesquisa estrategica personalizada.
Selecione entre 6 e 10 temas mais relevantes para este momento especifico da marca.
${customInstructions ? `\nInstrucoes do estrategista: ${customInstructions}` : ''}

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"agenda":[{"id":"r1","dimensao":1,"tema":"nome do tema","objetivo":"o que descobrir","queries":["query1","query2","query3"]}]}`;

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
      const prompt = `${ctx}
Voce e um estrategista senior da AMUM. Antes de definir qualquer diretriz, faca uma LEITURA CRUZADA de todas as camadas de informacao disponiveis no contexto acima.

As camadas presentes podem incluir:
- DADOS DO SITE AMUM: diagnostico pre-qualificacao, brand_context acumulado na jornada digital, scores de prontidao e fit metodologico, relatorios de Espelho Simbolico, Mapa de Tensao Cultural e Plano de Travessia — o que o cliente ja revelou antes do projeto comecar
- DOCUMENTOS ANALISADOS: materiais internos da empresa (pitch, apresentacao institucional, portfolio) — o que a marca usa para se vender, com sua linguagem real
- PESQUISA SETORIAL (dossie de mercado): achados das 18 dimensoes com web search — tensoes do setor, codigos saturados, concorrentes, pressoes externas
- INTEL FEED: achados anteriores registrados pelo estrategista

Sua tarefa e FUNDIR essas camadas — nao apenas listar o que o dossie disse, mas cruzar o que a marca declara nos documentos internos com o que o diagnostico digital revelou e com o que a pesquisa setorial confirmou ou contradiz.

A tensao central que ancora as diretrizes nao vem de uma unica fonte — ela emerge do atrito entre as camadas.

Com base nessa fusao, defina as diretrizes operacionais para as pesquisas seguintes:
1. MARCAS/PERFIS a analisar em redes sociais: a propria marca + concorrentes identificados + referencias que aparecem em multiplas camadas como relevantes
2. TERMOS-CHAVE para Google Trends: termos que aparecem no discurso da marca (documentos), na percepcao do mercado (dossie) e nas tensoes diagnosticadas — especialmente onde ha divergencia entre o que a marca usa e o que o mercado busca
3. COMUNIDADES/ESPACOS para netnografia: onde o publico desta marca conversa organicamente — informado pelo setor, pelos arquétipos identificados e pelos comportamentos revelados no dossie
4. PLATAFORMAS prioritarias para analise social — baseado no setor, publico e no que os documentos da marca revelam sobre sua presenca atual
5. TENSAO CENTRAL que ancora todas as pesquisas: a tensao que aparece em mais de uma camada de dados

Para cada item, a justificativa deve indicar de qual(is) camada(s) o item emerge.

Retorne APENAS o seguinte JSON e nada mais, sem texto antes ou depois:
{"marcas":[{"id":"m1","tipo":"marca","valor":"nome da marca principal","justificativa":"razao baseada na fusao de camadas","ativo":true},{"id":"m2","tipo":"marca","valor":"concorrente 1","justificativa":"razao","ativo":true}],"termos":[{"id":"t1","tipo":"termo","valor":"termo chave","justificativa":"camada de origem","ativo":true}],"comunidades":[{"id":"c1","tipo":"comunidade","valor":"espaco especifico","justificativa":"razao","ativo":true}],"plataformas":[{"id":"p1","tipo":"plataforma","valor":"Instagram","justificativa":"razao baseada no perfil da marca e setor","ativo":true}],"tensaoCentral":"tensao central que atravessa multiplas camadas de dados"}`;

      const r = await client.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: AMUM_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      });
      try { return NextResponse.json(robustParseJSON(extractText(r.content))); }
      catch (e) { return NextResponse.json({ error: 'Parse error', raw: extractText(r.content), detail: String(e) }, { status: 500 }); }
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

    return NextResponse.json({ error: 'Acao invalida' }, { status: 400 });

  } catch (err) {
    console.error('[research]', err);
    return NextResponse.json({ error: 'Erro interno', detail: String(err) }, { status: 500 });
  }
}
