/**
 * PlataformaSFC — renderer da tabela do instrumento Ser · Fazer · Comunicar.
 *
 * Nomenclatura visível: Ser (declara) / Fazer (prática) / Comunicar (sinais).
 * É a forma definitiva do instrumento — substitui o antigo mapa "É / Faz / Fala".
 *
 * Adapter dual-shape: o componente aceita dados tanto no shape antigo
 * ({eDeclara, eFaz, eFala}) quanto no novo ({seDeclara, comoAge, comoComunica}).
 * A Frente 1 ainda recebe dados no shape antigo vindos do backend —
 * `adaptDimensao()` normaliza para o shape interno sem precisar que a
 * Frente 2 (renomeação global) esteja concluída. Quando a Frente 2 for
 * entregue, o backend passará a devolver o shape novo naturalmente.
 *
 * O CSS deste componente está em lib/report-styles.ts (REPORT_SFC_CSS).
 */

import React from 'react';

/** Shape antigo — ainda gerado pelo backend pre-Frente 2. */
export interface SFCItemLegacy {
  dimensao: string;
  eDeclara: string;
  eFaz: string;
  eFala: string;
  discrepancia: string;
  risco: string;
}

/** Shape novo — alvo da Frente 2. */
export interface SFCItemCurrent {
  dimensao: string;
  seDeclara: string;
  comoAge: string;
  comoComunica: string;
  discrepancia: string;
  risco: string;
}

export type SFCItem = SFCItemLegacy | SFCItemCurrent;

interface SFCItemNormalized {
  dimensao: string;
  ser: string;
  fazer: string;
  comunicar: string;
  discrepancia: string;
  risco: string;
}

function adaptDimensao(item: SFCItem): SFCItemNormalized {
  if ('seDeclara' in item) {
    return {
      dimensao: item.dimensao,
      ser: item.seDeclara,
      fazer: item.comoAge,
      comunicar: item.comoComunica,
      discrepancia: item.discrepancia,
      risco: item.risco,
    };
  }
  return {
    dimensao: item.dimensao,
    ser: item.eDeclara,
    fazer: item.eFaz,
    comunicar: item.eFala,
    discrepancia: item.discrepancia,
    risco: item.risco,
  };
}

export interface PlataformaSFCProps {
  dimensoes: SFCItem[];
  implicacoes?: string[];
  /**
   * Texto introdutório opcional acima da legenda. Se ausente, o componente
   * renderiza apenas a legenda + tabela + implicações.
   */
  intro?: React.ReactNode;
  /** Rótulo do bloco de implicações. Default: "Implicações estratégicas do desalinhamento". */
  implicacoesLabel?: string;
  /** Se true, oculta a legenda acima da tabela (útil em contextos já contextualizados). */
  hideLegend?: boolean;
}

const DEFAULT_IMPLICACOES_LABEL = 'Implicações estratégicas do desalinhamento';

export function PlataformaSFC({
  dimensoes,
  implicacoes,
  intro,
  implicacoesLabel = DEFAULT_IMPLICACOES_LABEL,
  hideLegend = false,
}: PlataformaSFCProps) {
  const rows = dimensoes.map(adaptDimensao);

  return (
    <>
      {intro && <div className="sfc-intro">{intro}</div>}

      {!hideLegend && (
        <div className="sfc-legend">
          <div className="sfc-legend-item"><span className="ll-dot ll-ser" />Ser · aspiração declarada</div>
          <div className="sfc-legend-item"><span className="ll-dot ll-fazer" />Fazer · prática operacional</div>
          <div className="sfc-legend-item"><span className="ll-dot ll-comunicar" />Comunicar · sinais públicos</div>
          <div className="sfc-legend-item"><span className="ll-dot ll-desc" />Discrepância · desalinhamento nomeado</div>
        </div>
      )}

      <table className="sfc-table">
        <thead>
          <tr>
            <th style={{ width: '18%' }}>Dimensão</th>
            <th className="th-ser" style={{ width: '16%' }}>Ser (declara)</th>
            <th className="th-fazer" style={{ width: '16%' }}>Fazer (prática)</th>
            <th className="th-comunicar" style={{ width: '16%' }}>Comunicar (sinais)</th>
            <th className="th-desc" style={{ width: '16%' }}>Discrepância</th>
            <th style={{ width: '18%' }}>Risco</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td className="dim-cell">{r.dimensao}</td>
              <td>{r.ser}</td>
              <td>{r.fazer}</td>
              <td>{r.comunicar}</td>
              <td className="disc-cell">{r.discrepancia}</td>
              <td className="risk-cell">{r.risco}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {implicacoes && implicacoes.length > 0 && (
        <div className="sfc-implicacoes">
          <div className="sfc-implicacoes-label">{implicacoesLabel}</div>
          <ul>
            {implicacoes.map((imp, idx) => (
              <li key={idx}>{imp}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
