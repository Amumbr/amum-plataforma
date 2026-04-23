/**
 * AMUM — Shape do Relatório Final v2 (Fase 1.2).
 *
 * A partir da Fase 1.2, o relatório é gerado em DUAS CAMADAS encadeadas
 * por parte da tríade:
 *
 *   Camada 1 · geração editorial
 *     final_txt_ondeEstamos        → markdown denso (~3-5k tokens)
 *     final_txt_paraOndeVamos      → markdown denso (~4-6k tokens)
 *     final_txt_comoVamosChegarLa  → markdown denso (~3-5k tokens)
 *
 *   Camada 2 · extração estruturada (consome o TXT da camada 1)
 *     final_json_ondeEstamos       → OndeEstamosJSON
 *     final_json_paraOndeVamos     → ParaOndeVamosJSON
 *     final_json_comoVamosChegarLa → ComoVamosChegarLaJSON
 *
 *   + final_meta (independente) → FinalReportMetaJSON
 *
 * O shape dos sub-JSONs é ALINHADO À ESTRUTURA DE SECOES DO PROTOTIPO v4
 * (`dobrasil-relatorio-final-v4.html`). Cada parte tem número fixo de seções:
 *
 *   Parte 1 (Onde estamos)        · 4 seções (1.1-1.4)
 *   Parte 2 (Para onde vamos)     · 6 seções (2.1-2.6)
 *   Parte 3 (Como vamos chegar lá)· 6 seções (3.1-3.6)
 *
 * Cada seção tem `title` + `ledes: string[]` (parágrafos ensaísticos) +
 * campos específicos do conteúdo daquela seção. Os componentes visuais
 * das Fases 4-6 consomem essa estrutura diretamente.
 *
 * A rota `/relatorio/final` legada permanece intocada até a Fase 7.
 */

import type { TrainingDesign } from './store';

// ─── BLOCO BASE DE SECOES ─────────────────────────────────────────────────────

/** Shape comum a toda seção do v4: título gerado + ledes ensaísticos. */
interface SectionBase {
  title: string;
  ledes: string[]; // 2-4 parágrafos de section-lede
}

// ─── PARTE 1 · ONDE ESTAMOS (4 seções) ────────────────────────────────────────

export interface OndeEstamosJSON {
  notaDeLeitura: string; // abertura curta que situa o leitor na parte
  secao_1_1: SectionBase & {
    // "A distância entre o que a marca declara e o mercado percebe"
    retratoDaMarca: {
      comoSeApresenta: string;
      oQueDadosMostram: string;
      tensaoCentral: string;
    };
  };
  secao_1_2: SectionBase & {
    // "Onde a marca desalinha as três camadas" — plataforma Ser/Fazer/Comunicar
    plataformaSFC: {
      dimensoes: {
        dimensao: string;
        seDeclara: string;
        comoAge: string;
        comoComunica: string;
        discrepancia: string;
        risco: string;
      }[];
      implicacoesEstrategicas: string[];
    };
  };
  secao_1_3: SectionBase & {
    // "Onde o desalinhamento aparece na prática" — touchpoints
    diagnosticoTouchpoints: {
      touchpointsCriticos: {
        touchpoint: string;
        canal: string;
        peso: number;
        scoreCoerencia: number;
        observacao: string;
      }[];
      quickWins: string[];
    };
  };
  secao_1_4: SectionBase & {
    // "As contradições que o reposicionamento precisa resolver"
    tensoesEstruturais: { titulo: string; descricao: string }[];
    perguntaFundadora: string;
  };
}

// ─── PARTE 2 · PARA ONDE VAMOS (6 seções) ─────────────────────────────────────

export interface ParaOndeVamosJSON {
  notaDeLeitura: string;
  secao_2_1: SectionBase & {
    // "A aposta central do reposicionamento"
    afirmacaoDestaque: { linhaA: string; linhaB: string; glosa: string };
    arquetipo: { nome: string; signosQueConfirmaram: string };
  };
  secao_2_2: SectionBase & {
    // "Onde a marca vai ocupar — e o que precisou descartar"
    territorios: {
      avaliados: { nome: string; viabilidade: string }[];
      escolhido: string;
      porQueEsteTerritorio: string;
    };
    tradeoffs: { abandona: string; ganha: string }[];
  };
  secao_2_3: SectionBase & {
    // "Os pilares que sustentam a nova narrativa" — plataforma de marca
    plataforma: {
      proposito: string;
      essencia: string;
      posicionamento: string;
      promessa: string;
      valores: { valor: string; comportamentos: string[] }[];
    };
  };
  secao_2_4: SectionBase & {
    // "Como o portfólio se organiza" — arquitetura + ODS
    arquiteturaDeMarca: {
      portfolioMap: string;
      nomenclaturaRegras: string;
      brandToOperating: {
        funcao: string;
        implicacao: string;
        responsavel: string;
        prioridade: string;
      }[];
    };
    matrizODS: {
      items: {
        ods: string;
        classificacao?: string;
        riscoGreenwashing?: string;
        iniciativas: {
          descricao: string;
          indicador: string;
          owner: string;
          cadencia: string;
        }[];
      }[];
    };
  };
  secao_2_5: SectionBase & {
    // "Como a marca fala a partir de agora" — código + biblioteca + manifesto
    codigoLinguistico: {
      tomDeVoz: { e: string[]; naoE: string[] };
      vocabularioPreferencial: string[];
      vocabularioProibido: string[];
      padroesConstrutivos: string[];
      exemplosAplicacao: { contexto: string; exemplo: string }[];
      qaChecklist: string[];
    };
    bibliotecaDeMensagens: {
      publico: string;
      afirmacaoCentral: string;
      provas: string[];
    }[];
    manifesto: string;
    narrativaSimbolica: string;
  };
  secao_2_6: SectionBase & {
    // "Como a marca se mostra" — direção visual
    direcaoVisual: {
      principiosSimbolicos: string[];
      paleta: string;
      tipografia: string;
      elementosGraficos: string[];
      diretrizes: string;
      descricaoMoodboard: string;
    };
  };
}

// ─── PARTE 3 · COMO VAMOS CHEGAR LÁ (6 seções) ────────────────────────────────

export interface ComoVamosChegarLaJSON {
  notaDeLeitura: string;
  secao_3_1: SectionBase & {
    // "As ondas da implementação"
    ondas: {
      onda: string;
      timeline: string;
      touchpoints: string[];
      responsaveis: string[];
      criteriosConclusao: string[];
    }[];
  };
  secao_3_2: SectionBase & {
    // "O que medir em cada janela de tempo" — KPIs
    kpis: { periodo: string; indicador: string; meta: string }[];
  };
  secao_3_3: SectionBase & {
    // "O que pode travar a travessia e como contornar" — riscos
    riscos: { risco: string; nivel: string; contingencia: string }[];
  };
  secao_3_4: SectionBase & {
    // "O que o time precisa para sustentar a marca" — enablement kit
    enablementKit: {
      faqs: { pergunta: string; resposta: string }[];
      templates: { nome: string; descricao: string }[];
      trilhaAdocao: { area: string; passos: string[] }[];
      checklistQA: string[];
    };
  };
  secao_3_5: SectionBase & {
    // "Como o time adquire o domínio — bloco a bloco" — training design
    trainingDesign: TrainingDesign;
  };
  secao_3_6: SectionBase & {
    // "Como a marca permanece viva no tempo" — governança contínua
    scorecard: {
      dimensao: string;
      score: number;
      meta: number;
      tendencia: string;
      acao?: string;
    }[];
    cadencia: {
      frequencia: string;
      atividade: string;
      responsavel: string;
    }[];
    criteriosAlerta: string[];
    gatilhosDeRevisao: string;
    protocoloCompliance: {
      percentualConformidadeAlvo: string;
      touchpointsAuditados: string[];
      backlogPrioritario: string[];
    };
    escopoRevisaoAnual: {
      kpisMarca: { indicador: string; meta: string }[];
      recomendacoes: string[];
    };
    referenciaManual?: { url?: string; version?: number };
  };
}

// ─── META · CAPA + ABERTURA + PRÓXIMOS PASSOS ────────────────────────────────

export interface FinalReportMetaJSON {
  capa: {
    tagline: string;
    subtitulo: string;
  };
  abertura: string;
  proximosPassos: {
    prioridade: number;
    acao: string;
    owner: string;
    prazo: string;
  }[];
}
