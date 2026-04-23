/**
 * AfirmacaoHero — tratamento visual hero do posicionamento aprovado.
 *
 * Renderizado onde o posicionamento central da marca aparece (relatório
 * final em "Para onde vamos", relatório da Fase Decifração). Substitui
 * qualquer renderização do posicionamento como parágrafo corrido.
 *
 * Contrato: o posicionamento vem separado em duas linhas (linhaA,
 * linhaB). Se só houver uma string monolítica, o componente pai faz o
 * split por ponto final antes de passar — ver nota no Commit 3.
 *
 * O CSS deste componente está em lib/report-styles.ts (REPORT_AFIRMACAO_CSS)
 * e precisa ser injetado pelo consumidor junto com REPORT_SHARED_CSS.
 */

import React from 'react';

export interface AfirmacaoHeroProps {
  /** Rótulo superior em caps (ex: "Afirmação de posicionamento · A aposta central"). */
  label: string;
  /** Primeira linha do statement — fica em branco sobre fundo ink. */
  linhaA: string;
  /** Segunda linha — fica em gold, criando contraste de voz. */
  linhaB: string;
  /** Parágrafo-glosa logo abaixo, em border-left dourado. Opcional. */
  glosa?: string;
  /** Atribuição/contexto em caps no rodapé (ex: "Aprovado na Fase Decifração · Abril de 2026"). Opcional. */
  attr?: string;
}

export function AfirmacaoHero({ label, linhaA, linhaB, glosa, attr }: AfirmacaoHeroProps) {
  return (
    <div className="afirmacao">
      <div className="afirmacao-label">{label}</div>
      <div className="afirmacao-statement">
        <span className="linha linha-a">{linhaA}</span>
        <span className="linha linha-b">{linhaB}</span>
      </div>
      {glosa && <div className="afirmacao-glosa">{glosa}</div>}
      {attr && <div className="afirmacao-attr">{attr}</div>}
    </div>
  );
}

/**
 * Divide um statement monolítico em duas linhas por ponto final. Usado
 * quando o backend ainda devolve `novoPositionamento` como string única
 * (estado anterior à Frente 4). Retorna `[linhaA, linhaB]` onde linhaB
 * pode ser string vazia se só houver uma sentença.
 *
 * Exemplo:
 *   splitStatement("Deciframos culturas. Criamos comunidades.")
 *   → ["Deciframos culturas.", "Criamos comunidades."]
 */
export function splitStatement(raw: string): [string, string] {
  if (!raw) return ['', ''];
  const trimmed = raw.trim();
  // Quebra após o primeiro ponto final seguido de espaço ou fim.
  const match = trimmed.match(/^(.+?\.)\s+(.+)$/);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }
  return [trimmed, ''];
}
