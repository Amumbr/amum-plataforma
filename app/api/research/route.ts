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

// Framework de 18 dimensões do dossiê de marca AMUM
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

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, agenda, customInstructions } = await req.json();

    // ─── GERAR AGENDA ────────────────────────────────────────────────────────
    if (action === 'generate_agenda') {
      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
${DOSSIE_FRAMEWORK}

Com base no contexto do projeto e no framework de 18 dimensões acima, gere uma agenda de pesquisa estratégica personalizada para esta marca específica.

Selecione as dimensões mais relevantes para o momento atual desta marca (entre 6 e 10 temas), adaptando os objetivos ao contexto específico do projeto.
Agrupe dimensões relacionadas quando fizer sentido.
${customInstructions ? `\nInstruções adicionais do estrategista:\n${customInstructions}` : ''}

Retorne APENAS um JSON válido com esta estrutura:
{
  "agenda": [
    {
      "id": "r1",
      "dimensao": número da dimensão no framework (1-18),
      "tema": "nome do tema adaptado para esta marca",
      "objetivo": "o que precisamos descobrir — específico para esta marca e seu momento",
      "queries": ["query de busca 1", "query de busca 2", "query de busca 3"]
    }
  ]
}

Retorne SOMENTE o JSON, sem markdown.`;

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
        return NextResponse.json({ error: 'Erro ao parsear agenda', raw }, { status: 500 });
      }
    }

    // ─── EXECUTAR PESQUISA ────────────────────────────────────────────────────
    if (action === 'run_research') {
      const agendaItems = agenda as {
        id: string;
        dimensao?: number;
        tema: string;
        objetivo: string;
        queries: string[];
      }[];

      const results = [];

      for (const item of agendaItems) {
        const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
TEMA DE PESQUISA: ${item.tema}
OBJETIVO: ${item.objetivo}
QUERIES DE BUSCA: ${item.queries.join(' | ')}
${item.dimensao ? `DIMENSÃO DO DOSSIÊ: ${item.dimensao} de 18` : ''}

Pesquise este tema com profundidade. Separe claramente:
- Fatos verificáveis (com indicação de fonte quando possível)
- Leitura analítica (sua interpretação dos dados)
- Hipóteses interpretativas (o que os dados sugerem mas não confirmam)

Aplique os princípios: não repita o discurso institucional sem crítica; compare o que a marca diz vs. faz vs. como é percebida; identifique contradições e tensões.

Retorne APENAS um JSON com esta estrutura:
{
  "id": "${item.id}",
  "tema": "${item.tema}",
  "sintese": "síntese estratégica em 3-5 parágrafos densos",
  "fatos": ["fato verificável 1", "fato verificável 2"],
  "tensoes": ["tensão ou contradição identificada 1", "tensão 2"],
  "implicacoes": ["implicação para o projeto 1", "implicação 2"],
  "fontes": ["fonte ou referência 1", "fonte 2"]
}

Retorne SOMENTE o JSON.`;

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: AMUM_SYSTEM,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
          messages: [{ role: 'user', content: prompt }],
        });

        // Extrair texto das respostas (pode vir após tool use)
        const allText = response.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('');

        try {
          const clean = allText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          results.push({ ...parsed, createdAt: new Date().toISOString() });
        } catch {
          results.push({
            id: item.id,
            tema: item.tema,
            sintese: allText,
            fatos: [],
            tensoes: [],
            implicacoes: [],
            fontes: [],
            createdAt: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({ results });
    }

    // ─── SINTETIZAR TUDO — DOSSIÊ FINAL ───────────────────────────────────────
    if (action === 'synthesize_all') {
      const researchSummary = agenda
        ? (agenda as { tema: string; sintese: string }[])
            .map(r => `## ${r.tema}\n${r.sintese}`)
            .join('\n\n')
        : '';

      const prompt = `${projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}\n\n` : ''}
${researchSummary ? `PESQUISA REALIZADA:\n${researchSummary}\n\n` : ''}
Com base em tudo acima, produza a síntese estratégica final do dossiê de marca.

Retorne APENAS um JSON com esta estrutura:
{
  "tensaoCentral": "a tensão geradora central da marca em uma frase precisa e irrefutável",
  "desafioPrincipal": "o principal desafio estratégico da marca hoje",
  "territorioDisponivel": "o território de posicionamento identificado como disponível e autêntico",
  "promessaPrincipal": "o que a marca promete hoje (mesmo que implicitamente)",
  "percepcaoProvavel": "como o mercado provavelmente percebe a marca na prática",
  "contradicaoCentral": "a contradição específica desta marca — o que ela tenta ser vs. o que ainda é",
  "concorrentes": [
    { "nome": "empresa", "arquetipo": "arquétipo de marca", "posicao": "como se posiciona" }
  ],
  "pressoesExternas": ["pressão externa 1", "pressão 2", "pressão 3"],
  "oPreservar": ["ativo simbólico ou estratégico que não pode ser perdido 1", "2"],
  "oMudar": ["o que precisa mudar com mais urgência 1", "2", "3"],
  "meta12meses": "o que precisa ter acontecido em 12 meses para que a transformação faça sentido",
  "direcaoEstrategica": "direção sugerida para reposicionamento ou fortalecimento — 2 a 3 frases",
  "diagnostico": "diagnóstico final em 1 parágrafo preciso — sem bajulação, sem vagueza"
}

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
        return NextResponse.json({ error: 'Erro ao parsear síntese', raw }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro na API de pesquisa' }, { status: 500 });
  }
}
