/**
 * AMUM — Shape do Relatório Final v2 (estrutura tríade).
 *
 * A partir da Fase 1.1 da migração, a rota `/relatorio/final/v2` consome
 * quatro sub-JSONs gerados em paralelo por quatro actions backend dedicadas:
 *
 *   OndeEstamosJSON         → action `final_ondeEstamos`       (diagnóstico)
 *   ParaOndeVamosJSON       → action `final_paraOndeVamos`     (afirmação)
 *   ComoVamosChegarLaJSON   → action `final_comoVamosChegarLa` (execução)
 *   FinalReportMetaJSON     → action `final_meta`              (capa + abertura + próximos passos)
 *
 * Os componentes visuais de cada parte (Fases 4-6 da migração) consomem
 * diretamente o sub-type correspondente — não há mais agregador monolítico.
 *
 * A rota `/relatorio/final` legada permanece intocada até a Fase 7 (cutover)
 * e continua operando sobre o shape de cinco fases em
 * `app/projetos/[id]/relatorio/final/page.tsx`.
 */

import type { TrainingDesign } from './store';

// ─── PARTE 1 · ONDE ESTAMOS (diagnóstico) ─────────────────────────────────────

export interface OndeEstamosJSON {
  notaDeLeitura: string;
  retratoDaMarca: {
    comoSeApresenta: string;
    oQueDadosMostram: string;
    tensaoCentral: string;
  };
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
  tensoesEstruturais: { titulo: string; descricao: string }[];
  perguntaFundadora: string;
}

// ─── PARTE 2 · PARA ONDE VAMOS (afirmação) ────────────────────────────────────

export interface ParaOndeVamosJSON {
  notaDeLeitura: string;
  afirmacaoDestaque: {
    linhaA: string;
    linhaB: string;
    glosa: string;
  };
  arquetipo: {
    nome: string;
    signosQueConfirmaram: string;
  };
  territorios: {
    avaliados: { nome: string; viabilidade: string }[];
    escolhido: string;
    porQueEsteTerritorio: string;
  };
  tradeoffs: { abandona: string; ganha: string }[];
  plataforma: {
    proposito: string;
    essencia: string;
    posicionamento: string;
    promessa: string;
    valores: { valor: string; comportamentos: string[] }[];
  };
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
  direcaoVisual: {
    principiosSimbolicos: string[];
    paleta: string;
    tipografia: string;
    elementosGraficos: string[];
    diretrizes: string;
    descricaoMoodboard: string;
  };
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
  narrativaSimbolica: string;
}

// ─── PARTE 3 · COMO VAMOS CHEGAR LÁ (execução) ────────────────────────────────

export interface ComoVamosChegarLaJSON {
  notaDeLeitura: string;
  ondas: {
    onda: string;
    timeline: string;
    touchpoints: string[];
    responsaveis: string[];
    criteriosConclusao: string[];
  }[];
  kpis: { periodo: string; indicador: string; meta: string }[];
  riscos: { risco: string; nivel: string; contingencia: string }[];
  enablementKit: {
    faqs: { pergunta: string; resposta: string }[];
    templates: { nome: string; descricao: string }[];
    trilhaAdocao: { area: string; passos: string[] }[];
    checklistQA: string[];
  };
  trainingDesign: TrainingDesign;
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
