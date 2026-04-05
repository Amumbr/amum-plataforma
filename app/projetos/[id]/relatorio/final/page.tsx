'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject, getProjectContext, Project } from '@/lib/store';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FaseJornada {
  fase: number;
  nome: string;
  premissaMetodologica?: string;
  achadoCritico: string;
  oQueRevelou?: string;
  processo?: string;
  decisaoChave: string;
  entregaveis?: string[];
  dados: string;
}

interface FinalReportJSON {
  capa: { tagline: string; subtitulo: string };
  pontoDepartida: {
    estadoInicial: string;
    tensoesDiagnosticadas: string[];
    perguntaFundadora: string;
  };
  premissaMetodologicaGeral?: string;
  jornada: FaseJornada[];
  posicionamento: {
    afirmacaoCentral: string;
    logicaSimbolicaCompleta: string;
    tradeoffs: { abandona: string; ganha: string }[];
    arquetipo: string;
    territorioEscolhido: string;
    porQueEsteTerritorio: string;
  };
  plataforma: {
    proposito: string;
    essencia: string;
    posicionamento: string;
    promessa: string;
    valores: { valor: string; comportamento: string }[];
    tomDeVoz: { e: string[]; naoE: string[] };
    manifesto: string;
  };
  sistemaVisual: {
    principiosSimbolicos: string[];
    direcaoPaleta: string;
    direcaoTipografia: string;
    descricaoMoodboard: string;
  };
  ativacao: {
    ondas: { onda: string; timeline: string; foco: string }[];
    kpis: { periodo: string; meta: string }[];
    criteriosSucesso: string[];
  };
  proximosPassos?: { prioridade: number; acao: string; owner: string; prazo: string }[];
  proximosPasass?: { prioridade: number; acao: string; owner: string; prazo: string }[];
  narrativaSimbolica: string;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const FINAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', system-ui, sans-serif; background: #f0ede8; color: #1C1F2A; }

  .report-wrapper { max-width: 960px; margin: 0 auto; padding: 32px 24px 100px; }

  .print-btn {
    position: fixed; bottom: 32px; right: 32px; z-index: 100;
    background: #C9A96E; color: #fff; border: none; border-radius: 8px;
    padding: 12px 24px; font-size: 14px; font-weight: 600;
    cursor: pointer; box-shadow: 0 4px 16px rgba(201,169,110,0.4);
  }
  .print-btn:hover { background: #b8904a; }

  .report-page { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.12); margin-bottom: 32px; }

  .cover {
    background: #1C1F2A; min-height: 480px;
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 60px 60px 56px; position: relative; overflow: hidden;
  }
  .cover::before {
    content: ''; position: absolute; top: -60px; right: -60px;
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(201,169,110,0.18) 0%, transparent 65%);
  }
  .cover::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 3px; background: linear-gradient(90deg, #C9A96E 0%, transparent 100%);
  }
  .cover-badge { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; margin-bottom: 28px; }
  .cover-client { font-size: 48px; font-weight: 800; color: #fff; line-height: 1.05; margin-bottom: 12px; }
  .cover-tagline { font-size: 18px; color: #C9A96E; font-weight: 500; font-style: italic; margin-bottom: 36px; line-height: 1.5; max-width: 580px; }
  .cover-divider { width: 60px; height: 3px; background: #C9A96E; border-radius: 2px; margin-bottom: 24px; }
  .cover-meta { display: flex; gap: 40px; }
  .cover-meta-label { font-size: 9px; color: rgba(201,169,110,0.5); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }
  .cover-meta-value { font-size: 12px; color: rgba(255,255,255,0.6); }
  .cover-amum { position: absolute; top: 44px; right: 60px; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; color: rgba(201,169,110,0.4); text-transform: uppercase; }

  .toc { padding: 40px 60px; background: #fafaf8; border-bottom: 1px solid #e8e4da; }
  .toc-label { font-size: 10px; color: #C9A96E; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 20px; }
  .toc-phases { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .toc-phase { border-radius: 8px; padding: 14px 16px; border: 1px solid; }
  .toc-phase-num { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
  .toc-phase-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .toc-sections { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
  .toc-section-tag { background: #f0ede8; color: #5A5A70; font-size: 11px; padding: 5px 12px; border-radius: 20px; font-weight: 500; }

  .section { padding: 52px 60px; }
  .section-alt { padding: 52px 60px; background: #fafaf8; }
  .section-label { font-size: 10px; color: #C9A96E; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
  .section-title { font-size: 26px; font-weight: 700; color: #1C1F2A; margin-bottom: 28px; line-height: 1.3; }
  .prose { font-size: 14px; color: #3D4054; line-height: 1.85; }
  .prose p { margin-bottom: 18px; }
  .prose-dark { font-size: 14px; color: rgba(255,255,255,0.82); line-height: 1.85; }
  .prose-dark p { margin-bottom: 18px; }

  .tension-list { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
  .tension-item { background: rgba(220,80,80,0.06); border: 1px solid rgba(220,80,80,0.18); border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #3D4054; line-height: 1.6; }
  .tension-item::before { content: '⚡ '; color: #dc5050; font-size: 12px; }

  .premissa-box {
    background: linear-gradient(135deg, #1C1F2A 0%, #252840 100%);
    border-radius: 12px; padding: 40px 48px; border-left: 5px solid #C9A96E;
    position: relative; overflow: hidden;
  }
  .premissa-box::before {
    content: ''; position: absolute; top: -40px; right: -40px;
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(201,169,110,0.1) 0%, transparent 60%);
  }
  .premissa-label { font-size: 9px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 16px; }
  .premissa-title { font-size: 16px; font-weight: 700; color: #C9A96E; margin-bottom: 20px; }
  .premissa-text { font-size: 14px; color: rgba(255,255,255,0.82); line-height: 1.85; }
  .premissa-text p { margin-bottom: 16px; }

  .phase-block { border: 1px solid #e8e4da; border-radius: 12px; margin-bottom: 28px; overflow: hidden; }
  .phase-header { display: grid; grid-template-columns: 80px 1fr; border-bottom: 1px solid #e8e4da; }
  .phase-num-col { display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
  .phase-circle { font-size: 28px; font-weight: 800; color: #fff; }
  .phase-header-content { padding: 20px 28px; }
  .phase-name { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .phase-achado { font-size: 16px; font-weight: 600; color: #1C1F2A; line-height: 1.4; }
  .phase-body { padding: 28px 28px 20px; }
  .phase-sub-label { font-size: 9px; color: #9990A0; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; margin-top: 20px; }
  .phase-sub-label:first-child { margin-top: 0; }
  .phase-sub-text { font-size: 13px; color: #3D4054; line-height: 1.75; }
  .phase-sub-text p { margin-bottom: 12px; }
  .phase-decisao { background: #faf8f4; border-left: 3px solid #C9A96E; border-radius: 0 6px 6px 0; padding: 12px 18px; font-size: 13px; color: #1C1F2A; line-height: 1.6; font-weight: 500; margin-top: 4px; }
  .phase-footer { background: #fafaf8; border-top: 1px solid #f0ede8; padding: 16px 28px; display: flex; gap: 24px; align-items: flex-start; }
  .phase-dados { font-size: 11px; color: #9990A0; font-style: italic; flex: 1; line-height: 1.5; }
  .phase-entregaveis { display: flex; flex-wrap: wrap; gap: 6px; flex: 2; }
  .phase-entregavel-tag { background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.25); border-radius: 4px; padding: 3px 10px; font-size: 11px; color: #8a6020; font-weight: 500; }

  .pos-hero { background: #1C1F2A; padding: 56px 60px; position: relative; overflow: hidden; }
  .pos-hero::before { content: ''; position: absolute; top: -80px; right: -80px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 60%); }
  .pos-hero-label { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 24px; }
  .pos-hero-statement { font-size: 32px; font-weight: 700; color: #fff; line-height: 1.4; margin-bottom: 40px; border-left: 5px solid #C9A96E; padding-left: 24px; font-style: italic; }
  .pos-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 36px; }
  .pos-meta-card { background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.2); border-radius: 8px; padding: 18px; }
  .pos-meta-label { font-size: 9px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
  .pos-meta-value { font-size: 13px; color: #fff; line-height: 1.5; font-weight: 500; }
  .pos-logic { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 28px 32px; margin-bottom: 32px; }
  .pos-logic-label { font-size: 9px; color: rgba(201,169,110,0.5); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 14px; }
  .pos-logic-text { font-size: 14px; color: rgba(255,255,255,0.82); line-height: 1.85; }
  .pos-logic-text p { margin-bottom: 14px; }
  .tradeoff-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .tradeoff-abandon { flex: 1; background: rgba(220,80,80,0.1); border: 1px solid rgba(220,80,80,0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #c06060; line-height: 1.4; }
  .tradeoff-gain { flex: 1; background: rgba(80,180,100,0.1); border: 1px solid rgba(80,180,100,0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4a9060; line-height: 1.4; }
  .tradeoff-arrow { color: #C9A96E; font-size: 18px; flex-shrink: 0; }

  .platform-field { margin-bottom: 18px; padding: 18px 22px; border-radius: 8px; border-left: 4px solid #C9A96E; background: #faf8f4; }
  .platform-label { font-size: 10px; color: #C9A96E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px; }
  .platform-value { font-size: 14px; color: #1C1F2A; line-height: 1.65; font-weight: 500; }
  .tom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
  .tom-col-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 10px; }
  .tom-tag { display: inline-block; margin: 3px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .tom-e { background: rgba(201,169,110,0.1); color: #8a6020; border: 1px solid rgba(201,169,110,0.3); }
  .tom-nao { background: rgba(180,180,180,0.08); color: #808090; border: 1px solid rgba(180,180,180,0.2); text-decoration: line-through; }
  .valor-item { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
  .valor-dot { width: 8px; height: 8px; border-radius: 50%; background: #C9A96E; flex-shrink: 0; margin-top: 6px; }
  .valor-nome { font-size: 13px; font-weight: 700; color: #1C1F2A; margin-bottom: 4px; }
  .valor-comp { font-size: 12px; color: #5A5A70; line-height: 1.55; }
  .manifesto-box { background: #1C1F2A; border-radius: 10px; padding: 32px 36px; margin-top: 16px; border-left: 4px solid #C9A96E; }
  .manifesto-text { font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.9; font-style: italic; }
  .manifesto-text p { margin-bottom: 16px; }

  .principio-item { padding: 16px 20px; border-radius: 8px; background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.2); margin-bottom: 10px; font-size: 13px; color: #3D4054; line-height: 1.65; }
  .principio-item::before { content: '→ '; color: #C9A96E; font-weight: 700; }
  .visual-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
  .visual-card { border: 1px solid #e8e4da; border-radius: 8px; padding: 18px; }
  .visual-card-label { font-size: 10px; color: #9990A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
  .visual-card-text { font-size: 13px; color: #3D4054; line-height: 1.65; }
  .moodboard-description { font-size: 13px; color: #5A5A70; line-height: 1.7; margin-bottom: 16px; font-style: italic; }
  .moodboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .moodboard-img { border-radius: 8px; overflow: hidden; aspect-ratio: 4/3; border: 1px solid #e8e4da; background: #f0ede8; position: relative; }
  .moodboard-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .moodboard-expired { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; color: #9990A0; text-align: center; padding: 12px; }
  .moodboard-badge { position: absolute; bottom: 6px; right: 6px; background: rgba(201,169,110,0.9); color: #1C1F2A; font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }

  .wave-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .wave-card { border-radius: 10px; padding: 22px; border: 2px solid; }
  .wave-card-onda { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; opacity: 0.8; }
  .wave-card-timeline { font-size: 11px; opacity: 0.6; margin-bottom: 10px; }
  .wave-card-foco { font-size: 13px; color: #3D4054; line-height: 1.55; }
  .kpi-item { display: grid; grid-template-columns: 80px 1fr; gap: 12px; padding: 14px 0; border-bottom: 1px solid #f0ede8; align-items: start; }
  .kpi-periodo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C9A96E; padding-top: 2px; }
  .kpi-meta { font-size: 13px; color: #3D4054; line-height: 1.55; }
  .criterio-item { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
  .criterio-check { color: #50a868; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .criterio-text { font-size: 13px; color: #3D4054; line-height: 1.55; }

  .next-steps { display: flex; flex-direction: column; gap: 12px; }
  .next-step { display: grid; grid-template-columns: 36px 1fr auto auto; gap: 16px; align-items: start; padding: 16px 20px; border-radius: 8px; background: #faf8f4; border: 1px solid #e8e4da; }
  .next-step-num { width: 32px; height: 32px; border-radius: 50%; background: #C9A96E; color: #1C1F2A; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .next-step-acao { font-size: 13px; font-weight: 600; color: #1C1F2A; line-height: 1.4; padding-top: 6px; }
  .next-step-owner { font-size: 11px; color: #9990A0; white-space: nowrap; padding-top: 8px; }
  .next-step-prazo { font-size: 11px; font-weight: 700; color: #C9A96E; white-space: nowrap; padding-top: 8px; }

  .symbolic { background: #1C1F2A; padding: 56px 60px; }
  .symbolic-label { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
  .symbolic-title { font-size: 24px; font-weight: 700; color: #C9A96E; margin-bottom: 28px; line-height: 1.3; }
  .symbolic-text { font-size: 14px; color: rgba(255,255,255,0.82); line-height: 1.9; }
  .symbolic-text p { margin-bottom: 18px; }

  .report-footer { background: #1C1F2A; padding: 28px 60px; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 11px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.15em; }
  .footer-tag { font-size: 11px; color: rgba(255,255,255,0.3); }

  .generating-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0ede8; }
  .generating-card { background: #1C1F2A; border-radius: 16px; padding: 52px 64px; text-align: center; max-width: 480px; }
  .generating-spinner { width: 40px; height: 40px; border: 3px solid rgba(201,169,110,0.2); border-top-color: #C9A96E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .generating-title { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .generating-sub { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.5; }
  .generating-step { font-size: 12px; color: #C9A96E; margin-top: 16px; }

  @media print {
    body { background: #fff; }
    .print-btn { display: none !important; }
    .report-wrapper { padding: 0; max-width: 100%; }
    .report-page { border-radius: 0; box-shadow: none; }
    @page { margin: 0; size: A4; }
  }
`;

const PHASE_COLORS = ['#C9A96E', '#8BA0C9', '#6AB56A', '#C98E6E', '#A96EC9'];

function Prose({ text }: { text: string }) {
  return (
    <div className="prose">
      {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function SubText({ text }: { text: string }) {
  return (
    <div className="phase-sub-text">
      {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

// ─── COVER ────────────────────────────────────────────────────────────────────

function Cover({ project, data }: { project: Project; data: FinalReportJSON }) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="cover">
      <div className="cover-amum">AMUM</div>
      <div className="cover-badge">Relatório Final · Confidencial</div>
      <div className="cover-client">{project.nome}</div>
      <div className="cover-tagline">"{data.capa?.tagline || 'Uma jornada de reposicionamento estratégico'}"</div>
      <div className="cover-divider" />
      <div className="cover-meta">
        <div><div className="cover-meta-label">Setor</div><div className="cover-meta-value">{project.setor}</div></div>
        <div><div className="cover-meta-label">Data</div><div className="cover-meta-value">{date}</div></div>
        <div><div className="cover-meta-label">Metodologia</div><div className="cover-meta-value">AMUM · 5 Fases</div></div>
        <div><div className="cover-meta-label">Documento</div><div className="cover-meta-value">Relatório Final · Jornada Completa</div></div>
      </div>
    </div>
  );
}

// ─── TABLE OF CONTENTS ────────────────────────────────────────────────────────

function TableOfContents() {
  const phases = [
    { num: 1, name: 'Escuta', color: PHASE_COLORS[0] },
    { num: 2, name: 'Decifração', color: PHASE_COLORS[1] },
    { num: 3, name: 'Reconstrução', color: PHASE_COLORS[2] },
    { num: 4, name: 'Travessia', color: PHASE_COLORS[3] },
    { num: 5, name: 'Regeneração', color: PHASE_COLORS[4] },
  ];
  const sections = [
    'Ponto de Partida', 'Fundação Metodológica', 'A Jornada em 5 Movimentos',
    'O Posicionamento', 'A Nova Marca', 'Sistema Visual', 'Plano de Ativação', 'Próximos 90 Dias'
  ];
  return (
    <div className="toc">
      <div className="toc-label">Estrutura deste documento</div>
      <div className="toc-phases">
        {phases.map(p => (
          <div key={p.num} className="toc-phase" style={{ borderColor: p.color, background: `${p.color}0d` }}>
            <div className="toc-phase-num" style={{ color: p.color }}>{p.num}</div>
            <div className="toc-phase-name" style={{ color: p.color }}>{p.name}</div>
          </div>
        ))}
      </div>
      <div className="toc-sections">
        {sections.map(s => <div key={s} className="toc-section-tag">{s}</div>)}
      </div>
    </div>
  );
}

// ─── PONTO DE PARTIDA ─────────────────────────────────────────────────────────

function PontoDepartida({ data }: { data: FinalReportJSON }) {
  const pd = data.pontoDepartida;
  return (
    <div className="section">
      <div className="section-label">01 · Ponto de Partida</div>
      <div className="section-title">A Marca Antes do Processo</div>
      <Prose text={pd.estadoInicial} />

      {pd.perguntaFundadora && (
        <div style={{ margin: '28px 0', background: '#1C1F2A', borderRadius: '10px', padding: '24px 32px', borderLeft: '4px solid #C9A96E' }}>
          <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>A pergunta fundadora</div>
          <div style={{ fontSize: '16px', color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>"{pd.perguntaFundadora}"</div>
        </div>
      )}

      {pd.tensoesDiagnosticadas?.length > 0 && (
        <>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '28px', marginBottom: '12px' }}>Tensões diagnosticadas</div>
          <div className="tension-list">
            {pd.tensoesDiagnosticadas.map((t, i) => <div key={i} className="tension-item">{t}</div>)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PREMISSA METODOLÓGICA ────────────────────────────────────────────────────

function PremissaMetodologica({ data }: { data: FinalReportJSON }) {
  if (!data.premissaMetodologicaGeral) return null;
  return (
    <div className="section-alt">
      <div className="section-label">02 · Fundação Metodológica</div>
      <div className="section-title">Por Que Este Processo Funciona</div>
      <div className="premissa-box">
        <div className="premissa-label">Premissa AMUM</div>
        <div className="premissa-title">A aposta epistemológica por trás das 5 fases</div>
        <div className="premissa-text">
          {data.premissaMetodologicaGeral.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── FASE EXPANDIDA ───────────────────────────────────────────────────────────

function FaseExpandida({ fase, index }: { fase: FaseJornada; index: number }) {
  const color = PHASE_COLORS[index] || '#C9A96E';
  return (
    <div className="phase-block">
      <div className="phase-header">
        <div className="phase-num-col" style={{ background: color }}>
          <div className="phase-circle">{fase.fase}</div>
        </div>
        <div className="phase-header-content">
          <div className="phase-name" style={{ color }}>{fase.nome}</div>
          <div className="phase-achado">{fase.achadoCritico}</div>
        </div>
      </div>

      <div className="phase-body">
        {fase.premissaMetodologica && (
          <>
            <div className="phase-sub-label">Por que esta fase existe</div>
            <SubText text={fase.premissaMetodologica} />
          </>
        )}
        {fase.oQueRevelou && (
          <>
            <div className="phase-sub-label">O que esta fase revelou</div>
            <SubText text={fase.oQueRevelou} />
          </>
        )}
        {fase.processo && (
          <>
            <div className="phase-sub-label">Como a análise foi conduzida</div>
            <div className="phase-sub-text"><p>{fase.processo}</p></div>
          </>
        )}
        <div className="phase-sub-label">Decisão-chave</div>
        <div className="phase-decisao">{fase.decisaoChave}</div>
      </div>

      <div className="phase-footer">
        {fase.entregaveis && fase.entregaveis.length > 0 && (
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: '9px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Entregáveis</div>
            <div className="phase-entregaveis">
              {fase.entregaveis.map((e, i) => <span key={i} className="phase-entregavel-tag">{e}</span>)}
            </div>
          </div>
        )}
        {fase.dados && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Evidências</div>
            <div className="phase-dados">{fase.dados}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── A JORNADA ────────────────────────────────────────────────────────────────

function AJornada({ data }: { data: FinalReportJSON }) {
  const fases = data.jornada || [];
  return (
    <div className="section">
      <div className="section-label">03 · A Jornada</div>
      <div className="section-title">5 Movimentos Estratégicos</div>

      <svg viewBox="0 0 800 70" style={{ width: '100%', overflow: 'visible', marginBottom: '36px' }}>
        <line x1={40} y1={30} x2={760} y2={30} stroke="#e8e4da" strokeWidth="2" />
        {fases.map((f, i) => {
          const x = 40 + i * (720 / Math.max(fases.length - 1, 1));
          const color = PHASE_COLORS[i] || '#C9A96E';
          return (
            <g key={i}>
              <circle cx={x} cy={30} r={16} fill={color} />
              <text x={x} y={35} textAnchor="middle" fontSize="13" fill="#fff" fontWeight="800" fontFamily="Inter, system-ui">{f.fase}</text>
              <text x={x} y={58} textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="Inter, system-ui">{f.nome}</text>
            </g>
          );
        })}
      </svg>

      {fases.map((f, i) => <FaseExpandida key={i} fase={f} index={i} />)}
    </div>
  );
}

// ─── O POSICIONAMENTO ─────────────────────────────────────────────────────────

function OPosicionamento({ data }: { data: FinalReportJSON }) {
  const pos = data.posicionamento;
  if (!pos) return null;
  return (
    <div className="pos-hero">
      <div className="pos-hero-label">04 · O Posicionamento · Seção Central</div>
      <div className="pos-hero-statement">"{pos.afirmacaoCentral}"</div>

      <div className="pos-meta-grid">
        {pos.arquetipo && (
          <div className="pos-meta-card">
            <div className="pos-meta-label">Arquétipo</div>
            <div className="pos-meta-value" style={{ color: '#C9A96E', fontWeight: 700, fontSize: '15px' }}>{pos.arquetipo}</div>
          </div>
        )}
        {pos.territorioEscolhido && (
          <div className="pos-meta-card">
            <div className="pos-meta-label">Território</div>
            <div className="pos-meta-value">{pos.territorioEscolhido}</div>
          </div>
        )}
        {pos.porQueEsteTerritorio && (
          <div className="pos-meta-card">
            <div className="pos-meta-label">Lógica da escolha</div>
            <div className="pos-meta-value">{pos.porQueEsteTerritorio}</div>
          </div>
        )}
      </div>

      {pos.logicaSimbolicaCompleta && (
        <div className="pos-logic">
          <div className="pos-logic-label">Lógica simbólica completa</div>
          <div className="pos-logic-text">
            {pos.logicaSimbolicaCompleta.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}

      {pos.tradeoffs?.length > 0 && (
        <>
          <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.5)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Trade-offs formais</div>
          {pos.tradeoffs.map((t, i) => (
            <div key={i} className="tradeoff-row">
              <div className="tradeoff-abandon">✗ {t.abandona}</div>
              <div className="tradeoff-arrow">→</div>
              <div className="tradeoff-gain">✓ {t.ganha}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── A NOVA MARCA ─────────────────────────────────────────────────────────────

function ANovaMarca({ data }: { data: FinalReportJSON }) {
  const pl = data.plataforma;
  if (!pl) return null;
  return (
    <>
      <div className="section">
        <div className="section-label">05 · A Nova Marca</div>
        <div className="section-title">Plataforma Completa</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px' }}>
          <div>
            {pl.proposito && <div className="platform-field"><div className="platform-label">Propósito</div><div className="platform-value">{pl.proposito}</div></div>}
            {pl.essencia && <div className="platform-field"><div className="platform-label">Essência</div><div className="platform-value" style={{ color: '#C9A96E', fontWeight: 700, fontSize: '17px' }}>{pl.essencia}</div></div>}
            {pl.posicionamento && <div className="platform-field"><div className="platform-label">Posicionamento</div><div className="platform-value">{pl.posicionamento}</div></div>}
            {pl.promessa && <div className="platform-field"><div className="platform-label">Promessa</div><div className="platform-value">{pl.promessa}</div></div>}
          </div>
          <div>
            {pl.valores?.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Valores</div>
                {pl.valores.map((v, i) => (
                  <div key={i} className="valor-item">
                    <div className="valor-dot" />
                    <div>
                      <div className="valor-nome">{v.valor}</div>
                      <div className="valor-comp">{v.comportamento}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="section-alt">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '18px' }}>Código Linguístico</div>
            {pl.tomDeVoz && (
              <div className="tom-grid">
                <div>
                  <div className="tom-col-label" style={{ color: '#50a868' }}>A marca É</div>
                  {(pl.tomDeVoz.e || []).map((t, i) => <span key={i} className="tom-tag tom-e">{t}</span>)}
                </div>
                <div>
                  <div className="tom-col-label" style={{ color: '#9990A0' }}>A marca NÃO É</div>
                  {(pl.tomDeVoz.naoE || []).map((t, i) => <span key={i} className="tom-tag tom-nao">{t}</span>)}
                </div>
              </div>
            )}
          </div>
          {pl.manifesto && (
            <div>
              <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Manifesto</div>
              <div className="manifesto-box">
                <div className="manifesto-text">
                  {pl.manifesto.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── SISTEMA VISUAL ───────────────────────────────────────────────────────────

function SistemaVisual({ project, data }: { project: Project; data: FinalReportJSON }) {
  const sv = data.sistemaVisual;
  const selectedImages = (project.visualDirection?.moodboardImages || []).filter(img => img.selecionada);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (!sv) return null;
  return (
    <div className="section">
      <div className="section-label">06 · Sistema Visual</div>
      <div className="section-title">Direção de Identidade</div>

      {sv.principiosSimbolicos?.length > 0 && (
        <>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Princípios simbólicos</div>
          {sv.principiosSimbolicos.map((p, i) => <div key={i} className="principio-item">{p}</div>)}
        </>
      )}

      <div className="visual-cards">
        {sv.direcaoPaleta && (
          <div className="visual-card">
            <div className="visual-card-label">Direção de paleta</div>
            <div className="visual-card-text">{sv.direcaoPaleta}</div>
          </div>
        )}
        {sv.direcaoTipografia && (
          <div className="visual-card">
            <div className="visual-card-label">Tipografia</div>
            <div className="visual-card-text">{sv.direcaoTipografia}</div>
          </div>
        )}
      </div>

      {selectedImages.length > 0 && (
        <>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '28px 0 8px' }}>Moodboard aprovado</div>
          {sv.descricaoMoodboard && <div className="moodboard-description">{sv.descricaoMoodboard}</div>}
          <div className="moodboard-grid">
            {selectedImages.map((img, i) => {
              const displayUrl = img.storedUrl || img.url;
              return (
                <div key={img.id} className="moodboard-img">
                  {imgErrors[img.id] ? (
                    <div className="moodboard-expired">
                      <div>⏱<br />Imagem {i + 1}<br /><span style={{ fontSize: '10px' }}>URL expirada</span></div>
                    </div>
                  ) : (
                    <img
                      src={displayUrl}
                      alt={`Moodboard ${i + 1}`}
                      onError={() => setImgErrors(prev => ({ ...prev, [img.id]: true }))}
                    />
                  )}
                  <div className="moodboard-badge">✓ Selecionada</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PLANO DE ATIVAÇÃO ────────────────────────────────────────────────────────

function PlanoAtivacao({ data }: { data: FinalReportJSON }) {
  const at = data.ativacao;
  if (!at) return null;
  const waveColors = ['#C9A96E', '#8BA0C9', '#6AB56A'];
  return (
    <div className="section-alt">
      <div className="section-label">07 · Plano de Ativação</div>
      <div className="section-title">Rollout e KPIs</div>

      <div className="wave-grid">
        {(at.ondas || []).slice(0, 3).map((w, i) => (
          <div key={i} className="wave-card" style={{ borderColor: waveColors[i], background: `${waveColors[i]}0d` }}>
            <div className="wave-card-onda" style={{ color: waveColors[i] }}>{w.onda}</div>
            <div className="wave-card-timeline" style={{ color: waveColors[i] }}>{w.timeline}</div>
            <div className="wave-card-foco">{w.foco}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>KPIs por período</div>
          {(at.kpis || []).map((k, i) => (
            <div key={i} className="kpi-item">
              <div className="kpi-periodo">{k.periodo}</div>
              <div className="kpi-meta">{k.meta}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Critérios de sucesso</div>
          {(at.criteriosSucesso || []).map((c, i) => (
            <div key={i} className="criterio-item">
              <div className="criterio-check">✓</div>
              <div className="criterio-text">{c}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PRÓXIMOS PASSOS ──────────────────────────────────────────────────────────

function ProximosPassos({ data }: { data: FinalReportJSON }) {
  const steps = data.proximosPassos || data.proximosPasass || [];
  if (!steps.length) return null;
  return (
    <div className="section">
      <div className="section-label">08 · Próximos 90 Dias</div>
      <div className="section-title">Ações Prioritárias</div>
      <div className="next-steps">
        {steps.map((s, i) => (
          <div key={i} className="next-step">
            <div className="next-step-num">{s.prioridade}</div>
            <div className="next-step-acao">{s.acao}</div>
            <div className="next-step-owner">{s.owner}</div>
            <div className="next-step-prazo">{s.prazo}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NARRATIVA SIMBÓLICA ──────────────────────────────────────────────────────

function NarrativaSimbolica({ data }: { data: FinalReportJSON }) {
  if (!data.narrativaSimbolica) return null;
  return (
    <div className="symbolic">
      <div className="symbolic-label">Síntese Final</div>
      <div className="symbolic-title">Como este trabalho funciona simbolicamente</div>
      <div className="symbolic-text">
        {data.narrativaSimbolica.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function ReportFooter({ project }: { project: Project }) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="report-footer">
      <div className="footer-brand">AMUM · METODOLOGIA PROPRIETÁRIA</div>
      <div className="footer-tag">{project.nome} · {date} · Confidencial</div>
    </div>
  );
}

function GeneratingScreen({ step }: { step: string }) {
  return (
    <div className="generating-state">
      <div className="generating-card">
        <div className="generating-spinner" />
        <div className="generating-title">Compilando relatório final</div>
        <div className="generating-sub">Integrando todas as fases da jornada AMUM e construindo o documento editorial completo.</div>
        <div className="generating-step">{step}</div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function RelatorioFinalPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [reportData, setReportData] = useState<FinalReportJSON | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('Iniciando…');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const proj = getProject(params.id);
    if (!proj) { setNotFound(true); return; }
    setProject(proj);
    const cached = proj.finalReport;
    if (cached?.json) {
      setReportData(cached.json as unknown as FinalReportJSON);
    } else {
      generateReport(proj);
    }
  }, [params.id]);

  async function generateReport(proj: Project) {
    setGenerating(true);
    setGenStep('Lendo contexto completo do projeto…');
    try {
      const ctx = getProjectContext(proj);
      setGenStep('Gerando documento com Claude (pode levar ~30s)…');
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'final_report_data', projectContext: ctx }),
      });
      const result = await res.json() as { json?: FinalReportJSON; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.json) throw new Error('Nenhum dado retornado');

      setGenStep('Salvando relatório…');
      const { saveProject } = await import('@/lib/store');
      const updated: Project = {
        ...proj,
        finalReport: { json: result.json as unknown as Record<string, unknown>, createdAt: new Date().toISOString() }
      };
      saveProject(updated);
      setProject(updated);
      setReportData(result.json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setGenerating(false);
  }

  async function handleRegenerate() {
    if (!project) return;
    const { saveProject } = await import('@/lib/store');
    const updated: Project = { ...project, finalReport: undefined };
    saveProject(updated);
    setProject(updated);
    setReportData(null);
    await generateReport(updated);
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <p style={{ fontSize: '16px', color: '#5A5A70' }}>Projeto não encontrado</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
          <p style={{ fontSize: '14px', color: '#dc5050', marginBottom: '16px' }}>{error}</p>
          <button onClick={handleRegenerate} style={{ background: '#C9A96E', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (generating || !reportData || !project) {
    return (
      <>
        <style>{FINAL_CSS}</style>
        <GeneratingScreen step={genStep} />
      </>
    );
  }

  return (
    <div>
      <style>{FINAL_CSS}</style>
      <button className="print-btn" onClick={() => window.print()}>⬇ Exportar PDF</button>
      <button
        onClick={handleRegenerate}
        style={{ position: 'fixed', bottom: '32px', right: '188px', zIndex: 100, background: 'transparent', color: '#C9A96E', border: '1px solid #C9A96E', borderRadius: '8px', padding: '12px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        ↺ Regenerar
      </button>

      <div className="report-wrapper">
        <div className="report-page">
          <Cover project={project} data={reportData} />
          <TableOfContents />
          <PontoDepartida data={reportData} />
          <PremissaMetodologica data={reportData} />
          <AJornada data={reportData} />
          <OPosicionamento data={reportData} />
          <ANovaMarca data={reportData} />
          <SistemaVisual project={project} data={reportData} />
          <PlanoAtivacao data={reportData} />
          <ProximosPassos data={reportData} />
          <NarrativaSimbolica data={reportData} />
          <ReportFooter project={project} />
        </div>
      </div>
    </div>
  );
}
