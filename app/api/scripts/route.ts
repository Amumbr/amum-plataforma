import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  AMUM_SYSTEM_CHAT,
  cachedSystem,
  cachedUserMessage,
  MODEL_SONNET,
} from '@/lib/prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PHASE_DOCUMENT_PROMPTS: Record<string, string> = {
  'chat_decifração': `Você acabou de concluir a fase de co-criação da Decifração com o estrategista da AMUM.
O estrategista formulou o seguinte conceito central:

CONCEITO EMERGENTE:
{conceito}

Agora gere o DOCUMENTO DE PASSAGEM DE FASE — Decifração → Reconstrução.

Este documento é estratégico, denso e serve como base para todo o desenvolvimento do projeto a partir daqui.
Não é um resumo. É uma síntese interpretativa que comprova que o conceito emergente é uma resposta legítima ao que o diagnóstico revelou — não uma intuição, mas uma conclusão fundamentada.

Estrutura obrigatória:

# Documento de Passagem de Fase — Decifração

## 1. Diagnóstico Consolidado
Síntese do que a Fase de Escuta revelou: o que a empresa diz sobre si mesma, o que o mercado percebe, e onde estão as tensões mais produtivas. Não repita dados — interprete-os. Mínimo 4 parágrafos densos.

## 2. Leitura de Decifração
O que a análise estratégica extraiu do diagnóstico: arquétipo de marca atual, gaps estruturais entre declaração e percepção, narrativa-núcleo latente, territórios disponíveis e o ponto de deslocamento identificado. Mínimo 4 parágrafos.

## 3. O Conceito Emergente
O conceito formulado — sua natureza, sua lógica interna, o que ele nomeia que antes estava sem nome. Analise a formulação: onde ela é precisa, onde pode ser tensionada, qual é sua espessura semântica. Mínimo 3 parágrafos.

## 4. Como o Conceito Responde às Necessidades
Esta é a seção central. Demonstre — com argumentação explícita — como o conceito emergente responde a cada tensão revelada no diagnóstico. Ponto a ponto. Onde há convergência direta. Onde há tensão produtiva. Onde pode haver risco de incoerência. Mínimo 5 parágrafos.

## 5. Princípios Orientadores para a Reconstrução
O que deve guiar a Fase 3. Não são diretrizes genéricas — são princípios derivados do conceito que têm consequência direta para Plataforma de Marca, Código Linguístico e Narrativa. Liste e justifique cada um. Mínimo 4 princípios com desenvolvimento.

## 6. Alertas e Riscos
O que pode comprometer a integridade do conceito na execução. Incoerências potenciais. Pontos que precisam de decisão explícita antes de avançar. Mínimo 3 alertas.

## 7. Próximos Passos
O que precisa acontecer na Reconstrução, em que ordem, e por quê essa sequência específica.

Escreva em português. Tom estratégico, denso, sem retórica vazia. Cada parágrafo deve produzir avanço real.`,

  'chat_reconstrucao': `Você acabou de concluir a fase de co-criação da Reconstrução com o estrategista da AMUM.
O estrategista formulou o seguinte conceito central validado:

CONCEITO VALIDADO:
{conceito}

Agora gere o DOCUMENTO DE PASSAGEM DE FASE — Reconstrução → Travessia.

Este documento demonstra que a Plataforma de Marca construída é coerente com o diagnóstico original e está pronta para ser ativada.

Estrutura obrigatória:

# Documento de Passagem de Fase — Reconstrução

## 1. Síntese da Plataforma Construída
O que foi efetivamente construído na Reconstrução: Propósito, Essência, Posicionamento, Promessa e Valores — como um sistema coerente, não como itens isolados. Onde cada elemento ancora o próximo. Mínimo 4 parágrafos.

## 2. O Conceito Como Fio Condutor
Como o conceito central atravessa todos os elementos da plataforma. Onde ele aparece explicitamente, onde está implícito, onde precisa ser reforçado. Mínimo 3 parágrafos.

## 3. Coerência com o Diagnóstico Original
Demonstração explícita de que a plataforma construída responde às tensões identificadas na Escuta e Decifração. Cada gap identificado — como foi endereçado ou conscientemente deixado em aberto. Mínimo 4 parágrafos.

## 4. Código Linguístico — Síntese Operacional
O que o código linguístico estabelece em termos práticos: tom, vocabulário estratégico, padrões de frase, o que nunca dizer. Impacto direto nas comunicações. Mínimo 3 parágrafos.

## 5. Condições para Ativação
O que precisa estar resolvido antes de iniciar a Travessia. Decisões pendentes. Aprovações necessárias. Riscos de ativação prematura. Mínimo 3 parágrafos.

## 6. Diretrizes para a Travessia
O que deve guiar o Plano de Rollout, o Kit de Habilitação e os Treinamentos — derivados diretamente da plataforma. Mínimo 4 diretrizes desenvolvidas.

## 7. Métricas de Sucesso da Travessia
Como saberemos que a plataforma está sendo ativada com integridade. Indicadores qualitativos e quantitativos específicos para este projeto.

Escreva em português. Tom estratégico, operacional, sem abstração desnecessária.`,

  'chat_travessia': `Você acabou de concluir a fase de co-criação da Travessia com o estrategista da AMUM.
O estrategista formulou o seguinte conceito de encerramento:

CONCEITO DE ENCERRAMENTO:
{conceito}

Agora gere o DOCUMENTO DE CONCLUSÃO DE PROJETO — síntese estratégica completa.

Este documento é o artefato final do projeto: reúne o percurso completo, demonstra a coerência entre diagnóstico e entrega, e estabelece o protocolo de Regeneração.

Estrutura obrigatória:

# Documento de Conclusão de Projeto

## 1. Percurso Estratégico
A jornada completa: o que foi encontrado na Escuta, o que foi decifrado, o que foi construído, o que foi ativado. Narrado como argumento, não como cronologia. Mínimo 4 parágrafos.

## 2. O Conceito Como Bússola
Como o conceito central guiou todas as decisões do projeto. Onde ele foi testado, onde foi refinado, onde demonstrou sua potência. Mínimo 3 parágrafos.

## 3. Entregáveis e Impacto Esperado
O que foi produzido, para quê serve, como deve ser usado. Não uma lista — uma análise do sistema de entregáveis como um todo. Mínimo 4 parágrafos.

## 4. Coerência do Sistema
Como todos os elementos se articulam: da Plataforma de Marca ao Código Linguístico, do Plano de Rollout ao Treinamento. Onde o sistema é robusto, onde pode fragilizar. Mínimo 3 parágrafos.

## 5. Riscos de Implementação
O que pode comprometer a integridade do projeto na execução real. Por ordem de impacto. Com sinais de alerta específicos. Mínimo 4 riscos desenvolvidos.

## 6. Protocolo de Regeneração
Como monitorar a saúde da marca ao longo do tempo. Cadência de revisões. Gatilhos para intervenção. O que não pode ser alterado sem análise estratégica. Mínimo 4 parágrafos.

## 7. Próximos 90 Dias — Prioridades Críticas
As ações mais urgentes, em sequência, com responsável sugerido e critério de sucesso. Concreto e específico.

Escreva em português. Tom de autoridade estratégica. Este documento vai ao cliente.`
};

export async function POST(req: NextRequest) {
  try {
    const { action, projectContext, messages, conceito, phase } = await req.json();
    const ctx = projectContext ? `CONTEXTO DO PROJETO:\n${projectContext}` : '';

    if (action === 'generate_scripts') {
      const prompt = `Gere roteiros de entrevista para o projeto. Crie roteiros diferentes para cada público relevante baseado no contexto.

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
        model: MODEL_SONNET,
        max_tokens: 2000,
        system: cachedSystem(AMUM_SYSTEM_CHAT),
        messages: [cachedUserMessage(ctx, prompt)],
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
      const prompt = `Com base em TODOS os dados coletados na Fase 1 (Escuta), execute a Análise de Decifração completa.

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
        model: MODEL_SONNET,
        max_tokens: 2000,
        system: cachedSystem(AMUM_SYSTEM_CHAT),
        messages: [cachedUserMessage(ctx, prompt)],
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

    if (action === 'generate_phase_document') {
      const template = PHASE_DOCUMENT_PROMPTS[phase];
      if (!template) {
        return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });
      }

      const prompt = template.replace('{conceito}', conceito || '(não informado)');

      const response = await client.messages.create({
        model: MODEL_SONNET,
        max_tokens: 6000,
        system: cachedSystem(AMUM_SYSTEM_CHAT),
        messages: [cachedUserMessage(ctx, prompt)],
      });

      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('');

      return NextResponse.json({ text });
    }

    if (action === 'chat') {
      // Co-criação de entregáveis. System + contexto cacheados juntos —
      // messages[] do chat muda a cada turno mas o system fica estável.
      const systemText = projectContext
        ? `${AMUM_SYSTEM_CHAT}\n\nCONTEXTO DO PROJETO ATUAL:\n${projectContext}`
        : AMUM_SYSTEM_CHAT;

      const response = await client.messages.create({
        model: MODEL_SONNET,
        max_tokens: 2000,
        system: cachedSystem(systemText),
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
