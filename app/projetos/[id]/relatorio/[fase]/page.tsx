'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject, Project } from '@/lib/store';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Fase1Data {
  resumo: { achados: string[] };
  retratoDaMarca: { comoSeApresenta: string; oQueDadosMostram: string; tensaoCentral: string };
  canais: { nome: string; scoreCoerencia: number; scorePresenca: number; ponto: string }[];
  competidores: { nome: string; territorio: string; ameaca: string }[];
  tensoes: { titulo: string; descricao: string }[];
  perguntasParaFase2: string[];
}

interface Fase2Data {
  resumo: { achados: string[] };
  diagnostico: { arquetipo: string; tensaoCentral: string; territorioEscolhido: string };
  radarCoerencia: { dimensao: string; scoreAtual: number; scorePotencial: number }[];
  mapaIncoerencias: { dimensao: string; gap: string; nivel: string }[];
  tradeoffs: { abandona: string; ganha: string }[];
  afirmacaoCentral: string;
}

interface Fase3Data {
  resumo: { achados: string[] };
  plataforma: { proposito: string; essencia: string; posicionamento: string; promessa: string };
  tomDeVoz: { e: string[]; naoE: string[] };
  valores: { valor: string; comportamento: string }[];
  mensagens: { publico: string; afirmacao: string }[];
  principiosVisuais: string[];
}

interface Fase4Data {
  resumo: { achados: string[] };
  ondas: { nome: string; timeline: string; cor: string; touchpoints: string[]; criterio: string }[];
  kpis: { periodo: string; indicador: string; meta: string }[];
  riscos: { risco: string; nivel: string; contingencia: string }[];
}

interface Fase5Data {
  resumo: { achados: string[] };
  scorecard: { dimensao: string; score: number; meta: number; tendencia: string; acao: string }[];
  cadencia: { frequencia: string; atividade: string; responsavel: string }[];
  criteriosAlerta: string[];
}

// ─── SHARED CSS ───────────────────────────────────────────────────────────────

const REPORT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'Inter', system-ui, sans-serif; background: #f0ede8; color: #1C1F2A; }

  .report-wrapper { max-width: 900px; margin: 0 auto; padding: 32px 24px 80px; }

  .print-btn {
    position: fixed; bottom: 32px; right: 32px; z-index: 100;
    background: #C9A96E; color: #fff; border: none; border-radius: 8px;
    padding: 12px 24px; font-size: 14px; font-weight: 600;
    cursor: pointer; box-shadow: 0 4px 16px rgba(201,169,110,0.4);
    display: flex; align-items: center; gap: 8px;
  }
  .print-btn:hover { background: #b8904a; }

  .report-page {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    margin-bottom: 32px;
  }

  /* HEADER */
  .report-header {
    background: #1C1F2A;
    padding: 40px 48px 36px;
    position: relative;
    overflow: hidden;
  }
  .report-header::before {
    content: '';
    position: absolute; top: 0; right: 0;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%);
  }
  .report-header-meta { font-size: 11px; color: rgba(201,169,110,0.7); font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; }
  .report-header-project { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 6px; line-height: 1.2; }
  .report-header-fase { font-size: 14px; color: #C9A96E; font-weight: 500; margin-bottom: 24px; }
  .report-header-divider { width: 48px; height: 3px; background: #C9A96E; border-radius: 2px; margin-bottom: 20px; }
  .report-header-date { font-size: 12px; color: rgba(255,255,255,0.4); }
  .amum-badge {
    position: absolute; top: 36px; right: 48px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.2em;
    color: rgba(201,169,110,0.5); text-transform: uppercase;
  }

  /* EXECUTIVE SUMMARY */
  .exec-summary {
    background: #1C1F2A;
    padding: 28px 48px 32px;
    border-bottom: 2px solid #C9A96E;
  }
  .exec-label { font-size: 10px; color: rgba(201,169,110,0.7); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 16px; }
  .exec-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .exec-card {
    background: rgba(201,169,110,0.08);
    border: 1px solid rgba(201,169,110,0.2);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .exec-card-num { font-size: 20px; font-weight: 800; color: #C9A96E; margin-bottom: 6px; }
  .exec-card-text { font-size: 12px; color: rgba(255,255,255,0.75); line-height: 1.5; }

  /* CONTENT SECTIONS */
  .report-section { padding: 36px 48px; }
  .report-section-alt { padding: 36px 48px; background: #fafaf8; }
  .section-label {
    font-size: 10px; color: #C9A96E; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; margin-bottom: 6px;
  }
  .section-title { font-size: 20px; font-weight: 700; color: #1C1F2A; margin-bottom: 20px; }
  .section-body { font-size: 13px; color: #3D4054; line-height: 1.75; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }

  /* CARDS */
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; }
  .data-card {
    background: #fff;
    border: 1px solid #e8e4da;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .data-card-label { font-size: 10px; color: #9990A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .data-card-value { font-size: 13px; color: #1C1F2A; line-height: 1.5; font-weight: 500; }

  /* TENSION ITEMS */
  .tension-item { display: flex; gap: 14px; margin-bottom: 20px; align-items: flex-start; }
  .tension-num {
    width: 28px; height: 28px; border-radius: 50%;
    background: #C9A96E; color: #1C1F2A;
    font-size: 12px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 1px;
  }
  .tension-title { font-size: 13px; font-weight: 700; color: #1C1F2A; margin-bottom: 4px; }
  .tension-desc { font-size: 12px; color: #5A5A70; line-height: 1.6; }

  /* INCOHERENCE MAP */
  .incoherence-table { width: 100%; border-collapse: collapse; }
  .incoherence-table th {
    text-align: left; font-size: 10px; color: #9990A0; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.1em;
    padding: 8px 12px; border-bottom: 2px solid #e8e4da;
  }
  .incoherence-table td { padding: 10px 12px; border-bottom: 1px solid #f0ede8; font-size: 12px; }
  .nivel-badge {
    display: inline-block; padding: 3px 9px; border-radius: 12px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .nivel-critico { background: rgba(220,80,80,0.12); color: #c04040; }
  .nivel-alto { background: rgba(220,150,60,0.12); color: #b06020; }
  .nivel-medio { background: rgba(200,170,80,0.12); color: #907020; }
  .nivel-baixo { background: rgba(80,180,100,0.12); color: #3a8050; }

  /* TRADEOFFS */
  .tradeoff-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .tradeoff-abandon {
    flex: 1; background: rgba(220,80,80,0.07); border: 1px solid rgba(220,80,80,0.2);
    border-radius: 6px; padding: 10px 14px;
    font-size: 12px; color: #b06060;
  }
  .tradeoff-gain {
    flex: 1; background: rgba(80,180,100,0.07); border: 1px solid rgba(80,180,100,0.2);
    border-radius: 6px; padding: 10px 14px;
    font-size: 12px; color: #4a9060;
  }
  .tradeoff-arrow { color: #C9A96E; font-size: 18px; flex-shrink: 0; }

  /* TOM DE VOZ */
  .tom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .tom-col { }
  .tom-col-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; margin-bottom: 8px; }
  .tom-tag {
    display: inline-block; margin: 4px 4px 4px 0;
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
  }
  .tom-e { background: rgba(201,169,110,0.12); color: #8a6020; border: 1px solid rgba(201,169,110,0.3); }
  .tom-nao { background: rgba(180,180,180,0.1); color: #808090; border: 1px solid rgba(180,180,180,0.2); text-decoration: line-through; }

  /* KPI TABLE */
  .kpi-table { width: 100%; border-collapse: collapse; }
  .kpi-table th { font-size: 10px; color: #9990A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 8px 14px; text-align: left; border-bottom: 2px solid #e8e4da; }
  .kpi-table td { padding: 12px 14px; border-bottom: 1px solid #f0ede8; font-size: 13px; color: #3D4054; }
  .kpi-periodo { font-weight: 700; color: #C9A96E; font-size: 11px; }

  /* RISK */
  .risk-item { display: grid; grid-template-columns: auto 1fr 1fr; gap: 12px 16px; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0ede8; }
  .risk-level { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .risk-alto { background: #dc5050; }
  .risk-medio { background: #e09050; }
  .risk-baixo { background: #50a868; }
  .risk-name { font-size: 12px; font-weight: 600; color: #1C1F2A; }
  .risk-cont { font-size: 12px; color: #5A5A70; line-height: 1.5; }

  /* WAVE TIMELINE */
  .wave-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .wave-card { border-radius: 10px; padding: 20px; border: 2px solid; }
  .wave-card-num { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; opacity: 0.7; }
  .wave-card-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
  .wave-card-timeline { font-size: 11px; opacity: 0.65; margin-bottom: 12px; }
  .wave-tp { font-size: 11px; margin-bottom: 4px; display: flex; gap: 6px; align-items: flex-start; }
  .wave-criterio { margin-top: 12px; padding-top: 10px; border-top: 1px solid; opacity: 0.3; font-size: 11px; opacity: 0.6; line-height: 1.4; }

  /* SCORECARD */
  .score-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0ede8; }
  .score-dim { font-size: 12px; font-weight: 600; color: #1C1F2A; width: 160px; flex-shrink: 0; }
  .score-bar-wrap { flex: 1; height: 8px; background: #f0ede8; border-radius: 4px; position: relative; }
  .score-bar-fill { height: 100%; border-radius: 4px; }
  .score-val { font-size: 13px; font-weight: 700; width: 32px; text-align: right; flex-shrink: 0; }
  .score-trend { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
  .score-acao { font-size: 11px; color: #7a7a90; margin-top: 2px; }

  /* CADENCIA */
  .cadencia-row { display: grid; grid-template-columns: 100px 1fr 120px; gap: 16px; align-items: start; padding: 12px 0; border-bottom: 1px solid #f0ede8; }
  .cadencia-freq { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C9A96E; }
  .cadencia-act { font-size: 12px; color: #3D4054; line-height: 1.5; }
  .cadencia-resp { font-size: 11px; color: #9990A0; }

  /* FOOTER */
  .report-footer {
    background: #1C1F2A; padding: 24px 48px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .footer-brand { font-size: 11px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.15em; }
  .footer-gate { font-size: 11px; color: rgba(255,255,255,0.3); }

  /* PLATFORM HIGHLIGHT */
  .platform-field { margin-bottom: 20px; padding: 18px 20px; border-radius: 8px; border-left: 4px solid #C9A96E; background: #faf8f4; }
  .platform-field-label { font-size: 10px; color: #C9A96E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .platform-field-value { font-size: 14px; color: #1C1F2A; line-height: 1.6; font-weight: 500; }

  .affirmation-box {
    background: #1C1F2A; border-radius: 10px; padding: 24px 28px;
    border-left: 4px solid #C9A96E; margin-top: 16px;
  }
  .affirmation-label { font-size: 10px; color: rgba(201,169,110,0.7); font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 10px; }
  .affirmation-text { font-size: 16px; color: #fff; line-height: 1.6; font-weight: 500; font-style: italic; }

  /* QUESTIONS */
  .question-item { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
  .question-icon { color: #C9A96E; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .question-text { font-size: 13px; color: #3D4054; line-height: 1.6; }

  /* VALORES */
  .valor-item { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
  .valor-dot { width: 8px; height: 8px; border-radius: 50%; background: #C9A96E; flex-shrink: 0; margin-top: 6px; }
  .valor-nome { font-size: 13px; font-weight: 700; color: #1C1F2A; margin-bottom: 3px; }
  .valor-comp { font-size: 12px; color: #5A5A70; line-height: 1.5; }

  /* PRINCIPIOS */
  .principio-item { padding: 14px 18px; border-radius: 8px; background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.2); margin-bottom: 10px; font-size: 13px; color: #3D4054; line-height: 1.6; }
  .principio-item::before { content: '→ '; color: #C9A96E; font-weight: 700; }

  /* MENSAGENS */
  .msg-card { background: #fff; border: 1px solid #e8e4da; border-radius: 8px; padding: 16px; margin-bottom: 10px; }
  .msg-publico { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9990A0; margin-bottom: 6px; }
  .msg-afirmacao { font-size: 13px; color: #1C1F2A; font-weight: 500; line-height: 1.5; }

  /* COMPETIDORES */
  .comp-row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0ede8; }
  .comp-nome { font-size: 12px; font-weight: 700; color: #1C1F2A; }
  .comp-territorio { font-size: 12px; color: #5A5A70; }
  .ameaca-badge { padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; }
  .ameaca-alta { background: rgba(220,80,80,0.1); color: #c04040; }
  .ameaca-media { background: rgba(220,150,60,0.1); color: #b06020; }
  .ameaca-baixa { background: rgba(80,180,100,0.1); color: #3a8050; }

  /* MOODBOARD SECTION */
  .moodboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
  .moodboard-img { border-radius: 8px; overflow: hidden; aspect-ratio: 1/1; position: relative; border: 1px solid #e8e4da; background: #f0ede8; }
  .moodboard-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .moodboard-expired { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; color: #9990A0; text-align: center; padding: 12px; }
  .moodboard-badge { position: absolute; bottom: 6px; right: 6px; background: rgba(201,169,110,0.9); color: #1C1F2A; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.04em; }

  /* POSITIONING HERO */
  .positioning-hero { background: #1C1F2A; padding: 48px 48px 40px; border-bottom: 3px solid #C9A96E; }
  .positioning-hero-label { font-size: 10px; color: rgba(201,169,110,0.7); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 20px; }
  .positioning-hero-statement { font-size: 26px; font-weight: 700; color: #fff; line-height: 1.4; margin-bottom: 28px; font-style: italic; border-left: 4px solid #C9A96E; padding-left: 20px; }
  .positioning-hero-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
  .positioning-meta-card { background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.2); border-radius: 8px; padding: 14px 16px; }
  .positioning-meta-label { font-size: 9px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
  .positioning-meta-value { font-size: 13px; color: #fff; line-height: 1.5; font-weight: 500; }
  .positioning-logic { background: rgba(255,255,255,0.04); border-radius: 8px; padding: 18px 20px; }
  .positioning-logic-label { font-size: 9px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .positioning-logic-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.7; }

  /* SYMBOLIC SECTION */
  .symbolic-section { background: #1C1F2A; padding: 36px 48px; }
  .symbolic-label { font-size: 10px; color: rgba(201,169,110,0.7); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 6px; }
  .symbolic-title { font-size: 18px; font-weight: 700; color: #C9A96E; margin-bottom: 20px; }
  .symbolic-body { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.8; }
  .symbolic-body p { margin-bottom: 14px; }
  .symbolic-body p:last-child { margin-bottom: 0; }
  .symbolic-loading { text-align: center; padding: 32px; }
  .symbolic-loading-text { font-size: 12px; color: rgba(201,169,110,0.6); margin-top: 12px; }

  @media print {
    body { background: #fff; }
    .print-btn { display: none !important; }
    .report-wrapper { padding: 0; max-width: 100%; }
    .report-page { border-radius: 0; box-shadow: none; }
    @page { margin: 0; size: A4; }
  }
`;

// ─── SHARED: HEADER ──────────────────────────────────────────────────────────

function ReportHeader({ project, fase, phaseName }: { project: Project; fase: number; phaseName: string }) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="report-header">
      <div className="amum-badge">AMUM</div>
      <div className="report-header-meta">Relatório Estratégico · Confidencial</div>
      <div className="report-header-project">{project.nome}</div>
      <div className="report-header-fase">Fase {fase} — {phaseName}</div>
      <div className="report-header-divider" />
      <div className="report-header-date">{date} · {project.setor}</div>
    </div>
  );
}

function ExecSummary({ achados }: { achados: string[] }) {
  return (
    <div className="exec-summary">
      <div className="exec-label">Resumo Executivo</div>
      <div className="exec-cards">
        {achados.slice(0, 3).map((a, i) => (
          <div key={i} className="exec-card">
            <div className="exec-card-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="exec-card-text">{a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportFooter({ gateLabel }: { gateLabel: string }) {
  return (
    <div className="report-footer">
      <div className="footer-brand">AMUM · METODOLOGIA PROPRIETÁRIA</div>
      <div className="footer-gate">{gateLabel}</div>
    </div>
  );
}

// ─── SVG: CANAL BAR CHART (Fase 1) ───────────────────────────────────────────

function CanalBarChart({ canais }: { canais: Fase1Data['canais'] }) {
  const max = 10;
  const barH = 28;
  const gap = 10;
  const labelW = 120;
  const chartW = 260;
  const height = canais.length * (barH + gap);

  return (
    <svg viewBox={`0 0 ${labelW + chartW + 50} ${height + 20}`} style={{ width: '100%', overflow: 'visible' }}>
      {canais.map((c, i) => {
        const y = i * (barH + gap) + 10;
        const w = (c.scoreCoerencia / max) * chartW;
        const color = c.scoreCoerencia >= 7 ? '#50a868' : c.scoreCoerencia >= 5 ? '#C9A96E' : '#dc5050';
        return (
          <g key={i}>
            <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" fontSize="11" fill="#5A5A70" fontFamily="Inter, system-ui">{c.nome}</text>
            <rect x={labelW} y={y} width={chartW} height={barH} rx="4" fill="#f0ede8" />
            <rect x={labelW} y={y} width={w} height={barH} rx="4" fill={color} opacity="0.85" />
            <text x={labelW + w + 8} y={y + barH / 2 + 4} fontSize="12" fill={color} fontWeight="700" fontFamily="Inter, system-ui">{c.scoreCoerencia}</text>
            <text x={labelW + 10} y={y + barH / 2 + 4} fontSize="10" fill="rgba(255,255,255,0.9)" fontFamily="Inter, system-ui">{c.ponto}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG: RADAR CHART (Fase 2) ────────────────────────────────────────────────

function RadarChart({ dims }: { dims: Fase2Data['radarCoerencia'] }) {
  const cx = 160; const cy = 160; const r = 120;
  const n = dims.length;
  const angle = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2;
  const pt = (i: number, val: number) => {
    const a = angle(i); const rv = (val / 10) * r;
    return { x: cx + rv * Math.cos(a), y: cy + rv * Math.sin(a) };
  };

  const gridLevels = [2, 4, 6, 8, 10];

  const currentPoints = dims.map((d, i) => pt(i, d.scoreAtual));
  const potentialPoints = dims.map((d, i) => pt(i, d.scorePotencial));

  const toPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: '280px' }}>
      {/* Grid */}
      {gridLevels.map(lv => (
        <polygon
          key={lv}
          points={dims.map((_, i) => { const p = pt(i, lv); return `${p.x},${p.y}`; }).join(' ')}
          fill="none" stroke="#e8e4da" strokeWidth="1"
        />
      ))}
      {/* Axes */}
      {dims.map((_, i) => {
        const p = pt(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e8e4da" strokeWidth="1" />;
      })}
      {/* Potential area */}
      <path d={toPath(potentialPoints)} fill="rgba(201,169,110,0.08)" stroke="rgba(201,169,110,0.3)" strokeWidth="1.5" strokeDasharray="4,3" />
      {/* Current area */}
      <path d={toPath(currentPoints)} fill="rgba(201,169,110,0.2)" stroke="#C9A96E" strokeWidth="2" />
      {/* Points */}
      {currentPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#C9A96E" />
      ))}
      {/* Labels */}
      {dims.map((d, i) => {
        const a = angle(i); const lx = cx + (r + 22) * Math.cos(a); const ly = cy + (r + 22) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="9.5" fill="#5A5A70" fontFamily="Inter, system-ui" fontWeight="600">
            {d.dimensao.split(' ').map((w, wi) => (
              <tspan key={wi} x={lx} dy={wi === 0 ? '0' : '11'}>{w}</tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

// ─── SVG: BRAND PLATFORM CIRCLES (Fase 3) ────────────────────────────────────

function PlatformCircles({ plataforma }: { plataforma: Fase3Data['plataforma'] }) {
  const rings = [
    { label: 'PROMESSA', text: plataforma.promessa, r: 160, fill: 'rgba(201,169,110,0.06)', stroke: 'rgba(201,169,110,0.2)' },
    { label: 'POSICIONAMENTO', text: plataforma.posicionamento, r: 122, fill: 'rgba(201,169,110,0.1)', stroke: 'rgba(201,169,110,0.3)' },
    { label: 'PROPÓSITO', text: plataforma.proposito, r: 84, fill: 'rgba(201,169,110,0.15)', stroke: 'rgba(201,169,110,0.45)' },
    { label: 'ESSÊNCIA', text: plataforma.essencia, r: 46, fill: '#C9A96E', stroke: '#C9A96E' },
  ];

  return (
    <svg viewBox="0 0 340 340" style={{ width: '100%', maxWidth: '320px' }}>
      {rings.map((ring, i) => (
        <g key={i}>
          <circle cx={170} cy={170} r={ring.r} fill={ring.fill} stroke={ring.stroke} strokeWidth="1.5" />
          {i === rings.length - 1 ? (
            <>
              <text x={170} y={166} textAnchor="middle" fontSize="10" fill="#1C1F2A" fontWeight="800" fontFamily="Inter, system-ui" letterSpacing="1">{ring.label}</text>
              <text x={170} y={180} textAnchor="middle" fontSize="11" fill="#1C1F2A" fontWeight="700" fontFamily="Inter, system-ui">{ring.text.slice(0, 20)}</text>
            </>
          ) : (
            <text x={170} y={170 - ring.r + 14} textAnchor="middle" fontSize="9" fill="#C9A96E" fontWeight="700" letterSpacing="1" fontFamily="Inter, system-ui">{ring.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── SVG: ROLLOUT TIMELINE (Fase 4) ──────────────────────────────────────────

function RolloutTimeline({ ondas }: { ondas: Fase4Data['ondas'] }) {
  const colors = ['#C9A96E', '#8BA0C9', '#6AB56A'];
  return (
    <svg viewBox="0 0 500 80" style={{ width: '100%' }}>
      <line x1="40" y1="40" x2="460" y2="40" stroke="#e8e4da" strokeWidth="2" />
      {ondas.slice(0, 3).map((onda, i) => {
        const x = 40 + i * 210;
        const color = colors[i] || '#C9A96E';
        return (
          <g key={i}>
            <circle cx={x} cy={40} r={14} fill={color} />
            <text x={x} y={44} textAnchor="middle" fontSize="11" fill="#fff" fontWeight="800" fontFamily="Inter, system-ui">{i + 1}</text>
            <text x={x} y={18} textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="Inter, system-ui">{onda.timeline}</text>
            <text x={x} y={62} textAnchor="middle" fontSize="9.5" fill="#5A5A70" fontFamily="Inter, system-ui">{onda.nome.replace('Onda ' + (i + 1) + ' — ', '')}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG: SCORECARD GAUGES (Fase 5) ──────────────────────────────────────────

function ScorecardGauges({ scorecard }: { scorecard: Fase5Data['scorecard'] }) {
  function gaugeColor(score: number) {
    if (score >= 8) return '#50a868';
    if (score >= 6) return '#C9A96E';
    return '#dc6060';
  }

  const perRow = Math.min(5, scorecard.length);
  const gW = 80; const gH = 70;
  const totalW = perRow * gW + (perRow - 1) * 16;

  return (
    <svg viewBox={`0 0 ${totalW} ${Math.ceil(scorecard.length / perRow) * (gH + 20)}`} style={{ width: '100%' }}>
      {scorecard.slice(0, 10).map((dim, i) => {
        const row = Math.floor(i / perRow); const col = i % perRow;
        const x = col * (gW + 16) + gW / 2; const y = row * (gH + 20) + 8;
        const pct = dim.score / 10;
        const startAngle = Math.PI; const endAngle = 2 * Math.PI;
        const sweepAngle = pct * Math.PI;
        const cx = x; const cy = y + gH * 0.6;
        const radiusOuter = gW * 0.42; const radiusInner = gW * 0.28;
        const x1 = cx + radiusOuter * Math.cos(startAngle);
        const y1 = cy + radiusOuter * Math.sin(startAngle);
        const x2 = cx + radiusOuter * Math.cos(startAngle + sweepAngle);
        const y2 = cy + radiusOuter * Math.sin(startAngle + sweepAngle);
        const xi1 = cx + radiusInner * Math.cos(startAngle + sweepAngle);
        const yi1 = cy + radiusInner * Math.sin(startAngle + sweepAngle);
        const xi2 = cx + radiusInner * Math.cos(startAngle);
        const yi2 = cy + radiusInner * Math.sin(startAngle);
        const lg = sweepAngle > Math.PI ? 1 : 0;
        const color = gaugeColor(dim.score);
        const bgX1 = cx + radiusOuter * Math.cos(startAngle);
        const bgY1 = cy + radiusOuter * Math.sin(startAngle);
        const bgX2 = cx + radiusOuter * Math.cos(endAngle);
        const bgY2 = cy + radiusOuter * Math.sin(endAngle);
        const bgXi1 = cx + radiusInner * Math.cos(endAngle);
        const bgYi1 = cy + radiusInner * Math.sin(endAngle);
        const bgXi2 = cx + radiusInner * Math.cos(startAngle);
        const bgYi2 = cy + radiusInner * Math.sin(startAngle);

        return (
          <g key={i}>
            {/* Background arc */}
            <path d={`M${bgX1},${bgY1} A${radiusOuter},${radiusOuter} 0 1 1 ${bgX2},${bgY2} L${bgXi1},${bgYi1} A${radiusInner},${radiusInner} 0 1 0 ${bgXi2},${bgYi2} Z`} fill="#f0ede8" />
            {/* Score arc */}
            {dim.score > 0 && (
              <path d={`M${x1},${y1} A${radiusOuter},${radiusOuter} 0 ${lg} 1 ${x2},${y2} L${xi1},${yi1} A${radiusInner},${radiusInner} 0 ${lg} 0 ${xi2},${yi2} Z`} fill={color} />
            )}
            {/* Score text */}
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="14" fontWeight="800" fill={color} fontFamily="Inter, system-ui">{dim.score}</text>
            {/* Dimension label */}
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize="8" fill="#9990A0" fontFamily="Inter, system-ui">{dim.dimensao.split(' ')[0]}</text>
            <text x={cx} y={y + 4} textAnchor="middle" fontSize="8.5" fill="#5A5A70" fontWeight="600" fontFamily="Inter, system-ui">{dim.dimensao.split(' ').slice(1).join(' ')}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── MOODBOARD SECTION ───────────────────────────────────────────────────────

function MoodboardSection({ project }: { project: Project }) {
  const selected = (project.visualDirection?.moodboardImages || []).filter(img => img.selecionada);
  const [imgErrors, setImgErrors] = React.useState<Record<string, boolean>>({});

  if (selected.length === 0) return null;

  return (
    <div className="report-section-alt">
      <div className="section-label">Direção Visual</div>
      <div className="section-title">Moodboard Selecionado</div>
      <div className="section-body" style={{ marginBottom: '16px', fontSize: '12px' }}>
        Imagens selecionadas pelo estrategista como referência de direção visual aprovada.
        {selected.some(img => imgErrors[img.id]) && (
          <span style={{ color: '#dc6060', marginLeft: '8px' }}>
            · Algumas URLs expiraram — as imagens já devem ter sido salvas externamente.
          </span>
        )}
      </div>
      <div className="moodboard-grid">
        {selected.map((img, i) => (
          <div key={img.id} className="moodboard-img">
            {imgErrors[img.id] ? (
              <div className="moodboard-expired">
                <div>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱</div>
                  <div>URL expirada<br />Imagem {i + 1}</div>
                </div>
              </div>
            ) : (
              <img
                src={img.url}
                alt={`Moodboard ${i + 1}`}
                onError={() => setImgErrors(prev => ({ ...prev, [img.id]: true }))}
              />
            )}
            <div className="moodboard-badge">✓ Selecionada</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── POSITIONING HERO (Fase 3) ───────────────────────────────────────────────

function PositioningHero({ project }: { project: Project }) {
  const pt = project.positioningThesis;
  const da = project.deepAnalysis;
  if (!pt?.afirmacaoCentral) return null;

  return (
    <div className="positioning-hero">
      <div className="positioning-hero-label">Seção Central · O Posicionamento</div>
      <div className="positioning-hero-statement">"{pt.afirmacaoCentral}"</div>

      <div className="positioning-hero-meta">
        {da?.arquetipo && (
          <div className="positioning-meta-card">
            <div className="positioning-meta-label">Arquétipo Dominante</div>
            <div className="positioning-meta-value" style={{ color: '#C9A96E', fontSize: '15px', fontWeight: 700 }}>{da.arquetipo}</div>
          </div>
        )}
        {da?.territorioRecomendado && (
          <div className="positioning-meta-card">
            <div className="positioning-meta-label">Território</div>
            <div className="positioning-meta-value">{da.territorioRecomendado}</div>
          </div>
        )}
      </div>

      {pt.tradeoffs?.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div className="positioning-logic-label" style={{ color: 'rgba(201,169,110,0.6)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Trade-offs formais</div>
          {pt.tradeoffs.map((t, i) => (
            <div key={i} className="tradeoff-row" style={{ marginBottom: '8px' }}>
              <div className="tradeoff-abandon">✗ {t.abandona}</div>
              <div className="tradeoff-arrow">→</div>
              <div className="tradeoff-gain">✓ {t.ganha}</div>
            </div>
          ))}
        </div>
      )}

      {pt.justificativa && (
        <div className="positioning-logic">
          <div className="positioning-logic-label">Lógica simbólica</div>
          <div className="positioning-logic-text">{pt.justificativa}</div>
        </div>
      )}
    </div>
  );
}

// ─── SYMBOLIC SECTION ────────────────────────────────────────────────────────

function SymbolicSection({ project }: { project: Project }) {
  const [narrative, setNarrative] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  async function loadNarrative() {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const { getProjectContext } = await import('@/lib/store');
      const ctx = getProjectContext(project);
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report_symbolic_narrative', projectContext: ctx }),
      });
      const data = await res.json() as { narrativa?: string };
      if (data.narrativa) setNarrative(data.narrativa);
    } catch { /* fail silently */ }
    setLoading(false);
    setLoaded(true);
  }

  React.useEffect(() => { loadNarrative(); }, []);

  if (!loading && !narrative) return null;

  return (
    <div className="symbolic-section">
      <div className="symbolic-label">Síntese Final</div>
      <div className="symbolic-title">Como este trabalho funciona simbolicamente</div>
      {loading ? (
        <div className="symbolic-loading">
          <div style={{ width: '32px', height: '32px', border: '2px solid rgba(201,169,110,0.3)', borderTopColor: '#C9A96E', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div className="symbolic-loading-text">Gerando articulação simbólica…</div>
        </div>
      ) : (
        <div className="symbolic-body">
          {narrative.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </div>
  );
}

// ─── TEMPLATE FASE 1: ESCUTA ─────────────────────────────────────────────────

function ReportFase1({ project, data }: { project: Project; data: Fase1Data }) {
  return (
    <div className="report-page">
      <ReportHeader project={project} fase={1} phaseName="Escuta" />
      <ExecSummary achados={data.resumo?.achados || []} />

      {/* Retrato da Marca */}
      <div className="report-section">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 01</div>
            <div className="section-title">Retrato da Marca</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>Como a marca se apresenta</div>
              <div className="section-body">{data.retratoDaMarca?.comoSeApresenta}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>O que os dados revelam</div>
              <div className="section-body">{data.retratoDaMarca?.oQueDadosMostram}</div>
            </div>
          </div>
          <div>
            <div style={{ background: '#1C1F2A', borderRadius: '10px', padding: '22px 24px', borderLeft: '4px solid #C9A96E' }}>
              <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>Tensão Central</div>
              <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>"{data.retratoDaMarca?.tensaoCentral}"</div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagnóstico de Canais */}
      <div className="report-section-alt">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 02</div>
            <div className="section-title">Diagnóstico de Canais</div>
            <div className="section-body" style={{ marginBottom: '16px' }}>Score de coerência (0–10) por canal da marca — quanto cada canal traduz fielmente o posicionamento declarado.</div>
            <CanalBarChart canais={data.canais || []} />
          </div>
          <div>
            <div className="section-label">Seção 03</div>
            <div className="section-title">Mapa Competitivo</div>
            {(data.competidores || []).map((c, i) => (
              <div key={i} className="comp-row">
                <div className="comp-nome">{c.nome}</div>
                <div className="comp-territorio">{c.territorio}</div>
                <span className={`ameaca-badge ameaca-${c.ameaca}`}>{c.ameaca}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tensões */}
      <div className="report-section">
        <div className="section-label">Seção 04</div>
        <div className="section-title">Tensões Estruturais Identificadas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {(data.tensoes || []).map((t, i) => (
            <div key={i} className="tension-item">
              <div className="tension-num">{i + 1}</div>
              <div>
                <div className="tension-title">{t.titulo}</div>
                <div className="tension-desc">{t.descricao}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perguntas para Fase 2 */}
      <div className="report-section-alt">
        <div className="section-label">Passagem de Fase</div>
        <div className="section-title">Perguntas para a Decifração</div>
        {(data.perguntasParaFase2 || []).map((q, i) => (
          <div key={i} className="question-item">
            <div className="question-icon">?</div>
            <div className="question-text">{q}</div>
          </div>
        ))}
      </div>

      <ReportFooter gateLabel="Gate 0 → Fase 1 concluída" />
      <SymbolicSection project={project} />
    </div>
  );
}

// ─── TEMPLATE FASE 2: DECIFRAÇÃO ─────────────────────────────────────────────

function ReportFase2({ project, data }: { project: Project; data: Fase2Data }) {
  // O dado aprovado em project.positioningThesis tem prioridade absoluta sobre
  // o JSON gerado pela IA (que pode ter reformulado a afirmação).
  const pt = project.positioningThesis;
  const afirmacaoCentral = pt?.afirmacaoCentral || data.afirmacaoCentral;
  const tradeoffs = (pt?.tradeoffs && pt.tradeoffs.length > 0)
    ? pt.tradeoffs
    : (data.tradeoffs || []);

  return (
    <div className="report-page">
      <ReportHeader project={project} fase={2} phaseName="Decifração" />
      <ExecSummary achados={data.resumo?.achados || []} />

      {/* Diagnóstico Simbólico */}
      <div className="report-section">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 01</div>
            <div className="section-title">Diagnóstico Simbólico</div>
            <div className="card-grid" style={{ gridTemplateColumns: '1fr', gap: '12px', marginTop: 0 }}>
              <div className="data-card">
                <div className="data-card-label">Arquétipo Dominante</div>
                <div className="data-card-value" style={{ fontSize: '18px', fontWeight: 700, color: '#C9A96E' }}>{data.diagnostico?.arquetipo}</div>
              </div>
              <div className="data-card">
                <div className="data-card-label">Tensão Central</div>
                <div className="data-card-value">{data.diagnostico?.tensaoCentral}</div>
              </div>
              <div className="data-card">
                <div className="data-card-label">Território Escolhido</div>
                <div className="data-card-value">{data.diagnostico?.territorioEscolhido}</div>
              </div>
            </div>
          </div>
          <div>
            <div className="section-label">Radar de Coerência</div>
            <div style={{ marginTop: '8px', textAlign: 'center' }}>
              <RadarChart dims={data.radarCoerencia || []} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '3px', background: '#C9A96E', borderRadius: '2px' }} />
                  <span style={{ fontSize: '10px', color: '#9990A0' }}>Atual</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '1.5px', background: 'rgba(201,169,110,0.4)', borderRadius: '2px', borderTop: '1px dashed rgba(201,169,110,0.4)' }} />
                  <span style={{ fontSize: '10px', color: '#9990A0' }}>Potencial</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de Incoerências */}
      <div className="report-section-alt">
        <div className="section-label">Seção 02</div>
        <div className="section-title">Mapa de Incoerências</div>
        <table className="incoherence-table">
          <thead>
            <tr>
              <th>Dimensão</th>
              <th>Gap identificado</th>
              <th>Criticidade</th>
            </tr>
          </thead>
          <tbody>
            {(data.mapaIncoerencias || []).map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{item.dimensao}</td>
                <td>{item.gap}</td>
                <td><span className={`nivel-badge nivel-${item.nivel}`}>{item.nivel}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tese de Posicionamento */}
      <div className="report-section">
        <div className="section-label">Seção 03</div>
        <div className="section-title">Tese de Posicionamento</div>
        <div style={{ marginBottom: '20px' }}>
          {tradeoffs.map((t, i) => (
            <div key={i} className="tradeoff-row">
              <div className="tradeoff-abandon">✗ {t.abandona}</div>
              <div className="tradeoff-arrow">→</div>
              <div className="tradeoff-gain">✓ {t.ganha}</div>
            </div>
          ))}
        </div>
        <div className="affirmation-box">
          <div className="affirmation-label">Afirmação Central — Gate 1</div>
          <div className="affirmation-text">"{afirmacaoCentral}"</div>
        </div>
      </div>

      <ReportFooter gateLabel="Gate 1 → Território aprovado pela liderança" />
      <SymbolicSection project={project} />
    </div>
  );
}

// ─── TEMPLATE FASE 3: RECONSTRUÇÃO ───────────────────────────────────────────

function ReportFase3({ project, data }: { project: Project; data: Fase3Data }) {
  return (
    <div className="report-page">
      <ReportHeader project={project} fase={3} phaseName="Reconstrução" />
      <ExecSummary achados={data.resumo?.achados || []} />

      {/* Posicionamento — seção central de destaque */}
      <PositioningHero project={project} />

      {/* Plataforma de Marca */}
      <div className="report-section">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 01</div>
            <div className="section-title">Plataforma de Marca</div>
            <div className="platform-field">
              <div className="platform-field-label">Propósito</div>
              <div className="platform-field-value">{data.plataforma?.proposito}</div>
            </div>
            <div className="platform-field">
              <div className="platform-field-label">Posicionamento</div>
              <div className="platform-field-value">{data.plataforma?.posicionamento}</div>
            </div>
            <div className="platform-field">
              <div className="platform-field-label">Promessa</div>
              <div className="platform-field-value">{data.plataforma?.promessa}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <PlatformCircles plataforma={data.plataforma || { proposito: '', essencia: '', posicionamento: '', promessa: '' }} />
            <div style={{ background: '#1C1F2A', borderRadius: '8px', padding: '14px 20px', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Essência</div>
              <div style={{ fontSize: '16px', color: '#C9A96E', fontWeight: 800 }}>{data.plataforma?.essencia}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tom de Voz + Valores */}
      <div className="report-section-alt">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 02</div>
            <div className="section-title">Código Linguístico</div>
            <div className="tom-grid">
              <div className="tom-col">
                <div className="tom-col-label" style={{ color: '#50a868' }}>A marca É</div>
                {(data.tomDeVoz?.e || []).map((t, i) => <span key={i} className="tom-tag tom-e">{t}</span>)}
              </div>
              <div className="tom-col">
                <div className="tom-col-label" style={{ color: '#9990A0' }}>A marca NÃO É</div>
                {(data.tomDeVoz?.naoE || []).map((t, i) => <span key={i} className="tom-tag tom-nao">{t}</span>)}
              </div>
            </div>
          </div>
          <div>
            <div className="section-label">Seção 03</div>
            <div className="section-title">Valores</div>
            {(data.valores || []).slice(0, 4).map((v, i) => (
              <div key={i} className="valor-item">
                <div className="valor-dot" />
                <div>
                  <div className="valor-nome">{v.valor}</div>
                  <div className="valor-comp">{v.comportamento}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mensagens + Princípios Visuais */}
      <div className="report-section">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 04</div>
            <div className="section-title">Mensagens por Público</div>
            {(data.mensagens || []).map((m, i) => (
              <div key={i} className="msg-card">
                <div className="msg-publico">{m.publico}</div>
                <div className="msg-afirmacao">{m.afirmacao}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label">Seção 05</div>
            <div className="section-title">Direção Visual</div>
            {(data.principiosVisuais || []).map((p, i) => (
              <div key={i} className="principio-item">{p}</div>
            ))}
          </div>
        </div>
      </div>

      <ReportFooter gateLabel="Gate 3 → Plataforma assinada como documento-mãe" />
      <MoodboardSection project={project} />
      <SymbolicSection project={project} />
    </div>
  );
}

// ─── TEMPLATE FASE 4: TRAVESSIA ───────────────────────────────────────────────

function ReportFase4({ project, data }: { project: Project; data: Fase4Data }) {
  const waveColors = ['#C9A96E', '#8BA0C9', '#6AB56A'];
  return (
    <div className="report-page">
      <ReportHeader project={project} fase={4} phaseName="Travessia" />
      <ExecSummary achados={data.resumo?.achados || []} />

      {/* Rollout por Ondas */}
      <div className="report-section">
        <div className="section-label">Seção 01</div>
        <div className="section-title">Rollout por Ondas</div>
        <div style={{ marginBottom: '24px' }}>
          <RolloutTimeline ondas={data.ondas || []} />
        </div>
        <div className="wave-cards">
          {(data.ondas || []).slice(0, 3).map((onda, i) => {
            const color = waveColors[i] || '#C9A96E';
            return (
              <div key={i} className="wave-card" style={{ borderColor: color, background: `${color}08` }}>
                <div className="wave-card-num" style={{ color }}>Onda {onda.nome.match(/\d+/)?.[0] || i + 1}</div>
                <div className="wave-card-title" style={{ color }}>{onda.nome.split('—')[1]?.trim() || onda.nome}</div>
                <div className="wave-card-timeline" style={{ color }}>{onda.timeline}</div>
                {(onda.touchpoints || []).map((tp, j) => (
                  <div key={j} className="wave-tp">
                    <span style={{ color, fontSize: '10px', flexShrink: 0 }}>·</span>
                    <span style={{ fontSize: '11px', color: '#3D4054' }}>{tp}</span>
                  </div>
                ))}
                <div className="wave-criterio" style={{ borderColor: color, color: '#5A5A70' }}>
                  ✓ {onda.criterio}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPIs + Riscos */}
      <div className="report-section-alt">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 02</div>
            <div className="section-title">KPIs de Aderência</div>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Indicador</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                {(data.kpis || []).map((kpi, i) => (
                  <tr key={i}>
                    <td><span className="kpi-periodo">{kpi.periodo}</span></td>
                    <td>{kpi.indicador}</td>
                    <td style={{ fontWeight: 600, color: '#50a868' }}>{kpi.meta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="section-label">Seção 03</div>
            <div className="section-title">Gestão de Riscos</div>
            {(data.riscos || []).map((r, i) => (
              <div key={i} className="risk-item">
                <div className={`risk-level risk-${r.nivel}`} />
                <div>
                  <div className="risk-name">{r.risco}</div>
                </div>
                <div className="risk-cont">{r.contingencia}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReportFooter gateLabel="Gate 4 → Rollout em andamento, cadência definida" />
      <SymbolicSection project={project} />
    </div>
  );
}

// ─── TEMPLATE FASE 5: REGENERAÇÃO ────────────────────────────────────────────

function ReportFase5({ project, data }: { project: Project; data: Fase5Data }) {
  function scoreColor(score: number) {
    if (score >= 8) return '#50a868';
    if (score >= 6) return '#C9A96E';
    return '#dc6060';
  }
  function trendIcon(t: string) {
    if (t === 'subindo') return '↑';
    if (t === 'caindo') return '↓';
    return '→';
  }

  return (
    <div className="report-page">
      <ReportHeader project={project} fase={5} phaseName="Regeneração" />
      <ExecSummary achados={data.resumo?.achados || []} />

      {/* Scorecard */}
      <div className="report-section">
        <div className="section-label">Seção 01</div>
        <div className="section-title">Monitor de Coerência</div>
        <div style={{ marginBottom: '24px' }}>
          <ScorecardGauges scorecard={data.scorecard || []} />
        </div>
        {(data.scorecard || []).map((dim, i) => (
          <div key={i} className="score-row">
            <div className="score-dim">{dim.dimensao}</div>
            <div className="score-bar-wrap">
              <div className="score-bar-fill" style={{ width: `${(dim.score / 10) * 100}%`, background: scoreColor(dim.score) }} />
            </div>
            <div className="score-val" style={{ color: scoreColor(dim.score) }}>{dim.score}</div>
            <div className="score-trend" style={{ color: dim.tendencia === 'subindo' ? '#50a868' : dim.tendencia === 'caindo' ? '#dc6060' : '#9990A0' }}>
              {trendIcon(dim.tendencia)}
            </div>
            <div style={{ flex: 1 }}>
              <div className="score-acao">{dim.acao}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cadência + Alertas */}
      <div className="report-section-alt">
        <div className="two-col">
          <div>
            <div className="section-label">Seção 02</div>
            <div className="section-title">Cadência de Cuidado</div>
            {(data.cadencia || []).map((c, i) => (
              <div key={i} className="cadencia-row">
                <div className="cadencia-freq">{c.frequencia}</div>
                <div className="cadencia-act">{c.atividade}</div>
                <div className="cadencia-resp">{c.responsavel}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="section-label">Seção 03</div>
            <div className="section-title">Critérios de Alerta</div>
            <div className="section-body" style={{ marginBottom: '12px', fontSize: '12px', color: '#7a7a90' }}>
              Sinais que indicam necessidade de intervenção estratégica:
            </div>
            {(data.criteriosAlerta || []).map((c, i) => (
              <div key={i} className="tension-item">
                <div className="tension-num" style={{ background: '#dc6060', color: '#fff', fontSize: '10px' }}>!</div>
                <div className="tension-desc">{c}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReportFooter gateLabel="Gate 5 → Sistema de governança ativo" />
      <MoodboardSection project={project} />
      <SymbolicSection project={project} />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function RelatorioPage() {
  const params = useParams<{ id: string; fase: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const proj = getProject(params.id);
    if (!proj) { setNotFound(true); return; }
    setProject(proj);
    const fase = Number(params.fase);
    const report = proj.phaseReports?.[fase];
    if (report) setReportData(report.json);
    else setNotFound(true);
  }, [params.id, params.fase]);

  const fase = Number(params.fase);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <p style={{ fontSize: '16px', color: '#5A5A70', marginBottom: '8px' }}>Relatório não encontrado</p>
          <p style={{ fontSize: '13px', color: '#9990A0' }}>Gere o relatório visual na plataforma antes de acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (!project || !reportData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
        <div style={{ fontSize: '13px', color: '#9990A0' }}>Carregando…</div>
      </div>
    );
  }

  return (
    <div>
      <style>{REPORT_CSS}</style>
      <button className="print-btn" onClick={() => window.print()}>
        <span>⬇</span> Exportar PDF
      </button>
      <div className="report-wrapper">
        {fase === 1 && <ReportFase1 project={project} data={reportData as unknown as Fase1Data} />}
        {fase === 2 && <ReportFase2 project={project} data={reportData as unknown as Fase2Data} />}
        {fase === 3 && <ReportFase3 project={project} data={reportData as unknown as Fase3Data} />}
        {fase === 4 && <ReportFase4 project={project} data={reportData as unknown as Fase4Data} />}
        {fase === 5 && <ReportFase5 project={project} data={reportData as unknown as Fase5Data} />}
      </div>
    </div>
  );
}
