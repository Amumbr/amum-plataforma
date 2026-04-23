/**
 * AMUM — Shape do Relatório Final v2 (estrutura tríade).
 *
 * Substitui gradualmente o shape de cinco fases (FinalReportJSON em
 * `app/projetos/[id]/relatorio/final/page.tsx`) pela organização editorial
 * aprovada no protótipo `dobrasil-relatorio-final-v4.html`:
 *
 *   Onde estamos · Para onde vamos · Como vamos chegar lá
 *
 * Durante as Fases 1-5 da migração, a rota `/relatorio/final/v2` consome
 * este shape. A action backend `final_report_data_v2` produz este shape por
 * transformação (mapper abaixo) a partir do output da action legada. Na
 * Fase 6 o backend passa a ter prompt próprio e o mapper é removido. Na
 * Fase 7 (cutover) a rota legada redireciona para /v2 e o código antigo é
 * removido.
 *
 * NENHUMA mudança na rota /relatorio/final legada decorre deste arquivo.
 */

import type { TrainingDesign } from './store';

// ─── SHAPE TRÍADE ─────────────────────────────────────────────────────────────

export interface FinalReportV2JSON {
  capa: {
    tagline: string;
    subtitulo: string;
  };

  abertura: string;

  ondeEstamos: {
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
  };

  paraOndeVamos: {
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
  };

  comoVamosChegarLa: {
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
  };

  proximosPassos: {
    prioridade: number;
    acao: string;
    owner: string;
    prazo: string;
  }[];
}

// ─── MAPPER LEGADO → TRÍADE ───────────────────────────────────────────────────
//
// Na Fase 1, a action `final_report_data_v2` chama a action antiga
// `final_report_data`, parseia o JSON legado e aplica esta transformação.
// Nas Fases 2-5 o mapper continua ativo. Na Fase 6 o prompt do backend passa
// a retornar diretamente o shape tríade e o mapper é removido.
//
// A transformação é majoritariamente reorganização (mesmo conteúdo, novos
// agrupamentos). Os pontos de atenção documentados abaixo.

/**
 * Mapa de equivalência dimensão I/Faz/Fala → Ser/Fazer/Comunicar.
 * Legado usa eDeclara/eFaz/eFala. Shape novo usa seDeclara/comoAge/comoComunica.
 * É apenas rename dos campos — o conteúdo é idêntico.
 */
type LegacyMapaDim = {
  dimensao: string;
  eDeclara: string;
  eFaz: string;
  eFala: string;
  discrepancia: string;
  risco: string;
};

/**
 * Quebra uma `afirmacaoCentral` legada (string única) em
 * `afirmacaoDestaque` (objeto com linhaA + linhaB + glosa).
 *
 * Heurística: se a string contém um ponto-final seguido de espaço, trata
 * a primeira sentença como linhaA e a segunda como linhaB. Se é frase
 * única, fica tudo em linhaA. `glosa` inicia vazio e será preenchido pela
 * Fase 6 (quando o prompt passar a gerar direto no shape novo).
 *
 * A rota v2 tolera glosa vazia — apenas não renderiza o parágrafo de apoio.
 */
function parseAfirmacao(str: string): { linhaA: string; linhaB: string; glosa: string } {
  if (!str) return { linhaA: '', linhaB: '', glosa: '' };
  const trimmed = str.trim();
  // Divide em no máximo duas sentenças pela primeira ocorrência de ". "
  const firstSplit = trimmed.indexOf('. ');
  if (firstSplit === -1) {
    return { linhaA: trimmed, linhaB: '', glosa: '' };
  }
  const linhaA = trimmed.slice(0, firstSplit + 1).trim();
  const linhaB = trimmed.slice(firstSplit + 2).trim();
  return { linhaA, linhaB, glosa: '' };
}

/**
 * Aceita um objeto vindo da action legada `final_report_data` e produz o
 * shape tríade. Trabalha de forma defensiva: se um campo ausente no legado,
 * produz valor vazio apropriado (array vazio, string vazia, objeto com
 * campos vazios). Nunca lança — sempre retorna um FinalReportV2JSON válido
 * estruturalmente, mesmo com conteúdo parcial.
 */
export function mapLegacyToTriade(
  legacy: Record<string, unknown>
): FinalReportV2JSON {
  // Helpers defensivos
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const capa = obj(legacy.capa);
  const pontoDePartida = obj(legacy.pontoDePartida);
  const decifracao = obj(legacy.decifracao);
  const novaMarca = obj(legacy.novaMarca);
  const travessia = obj(legacy.travessia);
  const regeneracao = obj(legacy.regeneracao);

  const retrato = obj(pontoDePartida.retratoDaMarca);
  const mapa = obj(pontoDePartida.mapaIFazFala);
  const touchpoints = obj(pontoDePartida.diagnosticoTouchpoints);

  const arquetipo = obj(decifracao.arquetipo);
  const territorios = obj(decifracao.territorios);
  const arquitetura = obj(decifracao.arquiteturaDeMarca);
  const matrizODS = obj(decifracao.matrizODS);

  const plataforma = obj(novaMarca.plataforma);
  const codigoLinguistico = obj(novaMarca.codigoLinguistico);
  const tomDeVoz = obj(codigoLinguistico.tomDeVoz);
  const direcaoVisual = obj(novaMarca.direcaoVisual);

  const enablementKit = obj(travessia.enablementKit);
  const trainingDesignLegacy = obj(travessia.trainingDesign);

  const protocoloCompliance = obj(regeneracao.protocoloCompliance);
  const escopoRevisaoAnual = obj(regeneracao.escopoRevisaoAnual);

  return {
    capa: {
      tagline: str(capa.tagline),
      subtitulo: str(capa.subtitulo),
    },

    abertura: str(legacy.abertura),

    ondeEstamos: {
      notaDeLeitura: str(pontoDePartida.notaDeLeitura),
      retratoDaMarca: {
        comoSeApresenta: str(retrato.comoSeApresenta),
        oQueDadosMostram: str(retrato.oQueDadosMostram),
        tensaoCentral: str(retrato.tensaoCentral),
      },
      plataformaSFC: {
        dimensoes: arr<LegacyMapaDim>(mapa.dimensoes).map((d) => ({
          dimensao: str(d.dimensao),
          seDeclara: str(d.eDeclara),
          comoAge: str(d.eFaz),
          comoComunica: str(d.eFala),
          discrepancia: str(d.discrepancia),
          risco: str(d.risco),
        })),
        implicacoesEstrategicas: arr<string>(mapa.implicacoesEstrategicas),
      },
      diagnosticoTouchpoints: {
        touchpointsCriticos: arr(touchpoints.touchpointsCriticos),
        quickWins: arr(touchpoints.quickWins),
      },
      tensoesEstruturais: arr(pontoDePartida.tensoesEstruturais),
      perguntaFundadora: str(pontoDePartida.perguntaFundadora),
    },

    paraOndeVamos: {
      notaDeLeitura: str(decifracao.notaDeLeitura),
      afirmacaoDestaque: parseAfirmacao(str(decifracao.afirmacaoCentral)),
      arquetipo: {
        nome: str(arquetipo.nome),
        signosQueConfirmaram: str(arquetipo.signosQueConfirmaram),
      },
      territorios: {
        avaliados: arr(territorios.avaliados),
        escolhido: str(territorios.escolhido),
        porQueEsteTerritorio: str(territorios.porQueEsteTerritorio),
      },
      tradeoffs: arr(decifracao.tradeoffs),
      plataforma: {
        proposito: str(plataforma.proposito),
        essencia: str(plataforma.essencia),
        posicionamento: str(plataforma.posicionamento),
        promessa: str(plataforma.promessa),
        valores: arr(plataforma.valores),
      },
      codigoLinguistico: {
        tomDeVoz: {
          e: arr<string>(tomDeVoz.e),
          naoE: arr<string>(tomDeVoz.naoE),
        },
        vocabularioPreferencial: arr<string>(codigoLinguistico.vocabularioPreferencial),
        vocabularioProibido: arr<string>(codigoLinguistico.vocabularioProibido),
        padroesConstrutivos: arr<string>(codigoLinguistico.padroesConstrutivos),
        exemplosAplicacao: arr(codigoLinguistico.exemplosAplicacao),
        qaChecklist: arr<string>(codigoLinguistico.qaChecklist),
      },
      bibliotecaDeMensagens: arr(novaMarca.bibliotecaDeMensagens),
      manifesto: str(novaMarca.manifesto),
      direcaoVisual: {
        principiosSimbolicos: arr<string>(direcaoVisual.principiosSimbolicos),
        paleta: str(direcaoVisual.paleta),
        tipografia: str(direcaoVisual.tipografia),
        elementosGraficos: arr<string>(direcaoVisual.elementosGraficos),
        diretrizes: str(direcaoVisual.diretrizes),
        descricaoMoodboard: str(direcaoVisual.descricaoMoodboard),
      },
      arquiteturaDeMarca: {
        portfolioMap: str(arquitetura.portfolioMap),
        nomenclaturaRegras: str(arquitetura.nomenclaturaRegras),
        brandToOperating: arr(arquitetura.brandToOperating),
      },
      matrizODS: {
        items: arr(matrizODS.items),
      },
      narrativaSimbolica: str(legacy.narrativaSimbolica),
    },

    comoVamosChegarLa: {
      notaDeLeitura: str(travessia.notaDeLeitura),
      ondas: arr(travessia.ondas),
      kpis: arr(travessia.kpis),
      riscos: arr(travessia.riscos),
      enablementKit: {
        faqs: arr(enablementKit.faqs),
        templates: arr(enablementKit.templates),
        trilhaAdocao: arr(enablementKit.trilhaAdocao),
        checklistQA: arr<string>(enablementKit.checklistQA),
      },
      trainingDesign: {
        objetivosPorPublico: arr(trainingDesignLegacy.objetivosPorPublico),
        formatos: arr<string>(trainingDesignLegacy.formatos),
        agenda: arr(trainingDesignLegacy.agenda),
        materiaisNecessarios: arr<string>(trainingDesignLegacy.materiaisNecessarios),
        createdAt: str(trainingDesignLegacy.createdAt),
      },
      scorecard: arr(regeneracao.scorecard),
      cadencia: arr(regeneracao.cadencia),
      criteriosAlerta: arr<string>(regeneracao.criteriosAlerta),
      gatilhosDeRevisao: str(regeneracao.gatilhosDeRevisao),
      protocoloCompliance: {
        percentualConformidadeAlvo: str(protocoloCompliance.percentualConformidadeAlvo),
        touchpointsAuditados: arr<string>(protocoloCompliance.touchpointsAuditados),
        backlogPrioritario: arr<string>(protocoloCompliance.backlogPrioritario),
      },
      escopoRevisaoAnual: {
        kpisMarca: arr(escopoRevisaoAnual.kpisMarca),
        recomendacoes: arr<string>(escopoRevisaoAnual.recomendacoes),
      },
      referenciaManual: regeneracao.referenciaManual as
        | { url?: string; version?: number }
        | undefined,
    },

    proximosPassos: arr(legacy.proximosPassos),
  };
}
