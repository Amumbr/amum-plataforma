/**
 * AMUM — Fundação CSS compartilhada dos relatórios.
 *
 * Extraída do protótipo aprovado `dobrasil-relatorio-final-v4.html`. Consumida
 * pelo relatório final e pelos cinco relatórios de fase, injetada via
 * `<style>{REPORT_SHARED_CSS}</style>`. Contém apenas o que é transversal:
 * tokens, typography roles, base `.section` e overrides de `<em>`. CSS
 * específico de cada seção/componente fica no componente correspondente.
 *
 * Convenções:
 * - Source Serif 4 substitui Fraunces como família serif institucional.
 * - `font-style: italic` está proibido no sistema de relatórios; `<em>` é
 *   expresso como cor dourada + peso 600, sem itálico.
 * - Três cores de tríade (diag / dest / exec) marcam as três partes do
 *   relatório final; relatórios de fase podem ou não consumi-las.
 */

export const REPORT_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,300;8..60,400;8..60,500;8..60,600;8..60,700&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap';

export const REPORT_SHARED_CSS = `
@import url('${REPORT_FONTS_HREF}');

/* ─── RESET & BASE ────────────────────────────────────────────── */
.report *, .report *::before, .report *::after { box-sizing: border-box; margin: 0; padding: 0; }

.report {
  --cream: #F5F1EA;
  --cream-2: #EDE6DB;
  --ink: #1C1F2A;
  --ink-soft: #3D4054;
  --ink-mute: #5A5A70;
  --gold: #C9A96E;
  --gold-dark: #A88A52;
  --gold-soft: rgba(201,169,110,0.14);
  --line: #D9D1BF;
  --line-soft: rgba(201,169,110,0.22);

  /* Tríade — marcadores cromáticos das três partes do relatório final */
  --diag: #8B3A3A;          /* Onde estamos — tijolo queimado */
  --diag-soft: rgba(139,58,58,0.08);
  --diag-line: rgba(139,58,58,0.22);
  --dest: #4A5D3A;          /* Para onde vamos — oliva escuro */
  --dest-soft: rgba(74,93,58,0.08);
  --dest-line: rgba(74,93,58,0.22);
  --exec: #2C3E50;          /* Como vamos chegar lá — carvão */
  --exec-soft: rgba(44,62,80,0.08);
  --exec-line: rgba(44,62,80,0.22);

  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--cream);
  color: var(--ink);
  font-size: 15px;
  line-height: 1.65;
  font-feature-settings: "ss01", "cv11";
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
}

.report .wrap { max-width: 1040px; margin: 0 auto; padding: 0 28px 140px; }
.report .anchor { scroll-margin-top: 24px; }

/* ─── TYPOGRAPHY ROLES ─────────────────────────────────────────── */
.report .display {
  font-family: 'Source Serif 4', Georgia, serif;
  font-optical-sizing: auto;
  letter-spacing: -0.02em;
  line-height: 1.04;
}
.report .editorial {
  font-family: 'Source Serif 4', Georgia, serif;
  font-weight: 400;
}
.report .label {
  font-family: 'Inter', sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--gold);
}
.report .mono {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
}

/* ─── SECTION (container base reutilizado em todo relatório) ───── */
.report .section {
  padding: 72px 80px;
  background: #fff;
}
.report .section.alt { background: var(--cream-2); }

.report .section-kicker {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.report .section-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--gold);
  font-weight: 500;
}
.report .section-kicker-line {
  flex: 1;
  height: 1px;
  background: var(--line-soft);
}
.report .section-title {
  font-family: 'Source Serif 4', serif;
  font-weight: 400;
  font-size: clamp(30px, 3.4vw, 42px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 20px;
  max-width: 760px;
}
.report .section-title em {
  font-weight: 400;
  color: var(--gold-dark);
}
.report .section-lede {
  font-family: 'Source Serif 4', serif;
  font-weight: 300;
  font-size: 17px;
  line-height: 1.58;
  color: var(--ink-soft);
  max-width: 720px;
  padding-left: 18px;
  border-left: 2px solid var(--gold);
  margin-bottom: 48px;
}

/* ─── UTILIDADE ────────────────────────────────────────────────── */
.report .two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

/* ─── Override global para <em> inline ─────────────────────────── */
/* Sobriedade sobre decoração: itálico proibido; função semântica do <em>
   preservada via cor dourada + peso 600. */
.report em,
.report .afirmacao em,
.report .section-title em,
.report .part-title em,
.report .manifesto-title em,
.report .manifesto-body em,
.report .hero-subtitle em,
.report .pull-quote em,
.report .arq-ego em,
.report .afirmacao-quote em {
  font-style: normal;
  color: var(--gold);
  font-weight: 600;
}
/* Sobre cream, gold escurece para manter contraste. */
.report p em,
.report .intro-text em,
.report .analise-text em {
  color: var(--gold-dark);
  font-weight: 600;
}

/* ─── PRINT ────────────────────────────────────────────────────── */
@media print {
  .report { font-size: 11.5px; }
  .report .wrap { max-width: none; padding: 0; }
  .report .part,
  .report .cover,
  .report .journey-section,
  .report .opener,
  .report .section,
  .report .pergunta,
  .report .tensao-central {
    margin: 0;
    page-break-inside: avoid;
  }
}
`;
