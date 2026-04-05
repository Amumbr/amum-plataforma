'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject, getProjectContext, Project } from '@/lib/store';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FaseJornada {
  fase: number;
  nome: string;
  achadoCritico: string;
  decisaoChave: string;
  dados: string;
}

interface FinalReportJSON {
  capa: { tagline: string; subtitulo: string };
  pontoDepartida: { estadoInicial: string; tensoesDiagnosticadas: string[]; perguntaFundadora: string };
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
  proximosPasass: { prioridade: number; acao: string; owner: string; prazo: string }[];
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

  /* ── CAPA ── */
  .cover {
    background: #1C1F2A; min-height: 420px;
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
  .cover-client { font-size: 42px; font-weight: 800; color: #fff; line-height: 1.1; margin-bottom: 10px; }
  .cover-tagline { font-size: 18px; color: #C9A96E; font-weight: 500; font-style: italic; margin-bottom: 32px; line-height: 1.5; max-width: 560px; }
  .cover-divider { width: 60px; height: 3px; background: #C9A96E; border-radius: 2px; margin-bottom: 20px; }
  .cover-meta { display: flex; gap: 40px; }
  .cover-meta-item { }
  .cover-meta-label { font-size: 9px; color: rgba(201,169,110,0.5); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 4px; }
  .cover-meta-value { font-size: 12px; color: rgba(255,255,255,0.6); }
  .cover-amum { position: absolute; top: 44px; right: 60px; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; color: rgba(201,169,110,0.4); text-transform: uppercase; }

  /* ── SUMÁRIO ── */
  .toc { padding: 40px 60px; background: #fafaf8; border-bottom: 1px solid #e8e4da; }
  .toc-label { font-size: 10px; color: #C9A96E; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 20px; }
  .toc-phases { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .toc-phase { border-radius: 8px; padding: 14px 16px; border: 1px solid; }
  .toc-phase-num { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
  .toc-phase-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  .toc-sections { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
  .toc-section-tag { background: #f0ede8; color: #5A5A70; font-size: 11px; padding: 5px 12px; border-radius: 20px; font-weight: 500; }

  /* ── GENERIC SECTIONS ── */
  .section { padding: 44px 60px; }
  .section-alt { padding: 44px 60px; background: #fafaf8; }
  .section-dark { padding: 44px 60px; background: #1C1F2A; }
  .section-label { font-size: 10px; color: #C9A96E; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
  .section-label-dark { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
  .section-title { font-size: 24px; font-weight: 700; color: #1C1F2A; margin-bottom: 24px; }
  .section-title-dark { font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 24px; }
  .prose { font-size: 14px; color: #3D4054; line-height: 1.8; }
  .prose p { margin-bottom: 16px; }
  .prose-dark { font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.8; }
  .prose-dark p { margin-bottom: 16px; }

  /* ── TENSÕES ── */
  .tension-list { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
  .tension-item { background: rgba(220,80,80,0.06); border: 1px solid rgba(220,80,80,0.18); border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #3D4054; line-height: 1.5; }
  .tension-item::before { content: '⚡ '; color: #dc5050; font-size: 12px; }

  /* ── JORNADA ── */
  .journey-grid { display: flex; flex-direction: column; gap: 0; }
  .journey-item { display: grid; grid-template-columns: 80px 1fr; gap: 0; }
  .journey-num-col { display: flex; flex-direction: column; align-items: center; padding-top: 6px; }
  .journey-circle { width: 44px; height: 44px; border-radius: 50%; background: #C9A96E; color: #1C1F2A; font-size: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .journey-line { flex: 1; width: 2px; background: #e8e4da; margin: 6px 0; min-height: 20px; }
  .journey-content { padding: 4px 0 32px 20px; }
  .journey-phase-name { font-size: 11px; font-weight: 700; color: #C9A96E; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .journey-achado { font-size: 15px; font-weight: 700; color: #1C1F2A; margin-bottom: 6px; }
  .journey-decisao { font-size: 13px; color: #5A5A70; line-height: 1.5; margin-bottom: 6px; }
  .journey-dados { font-size: 11px; color: #9990A0; font-style: italic; }

  /* ── POSICIONAMENTO HERO ── */
  .pos-hero { background: #1C1F2A; padding: 52px 60px; position: relative; overflow: hidden; }
  .pos-hero::before { content: ''; position: absolute; top: -80px; right: -80px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 60%); }
  .pos-hero-label { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 24px; }
  .pos-hero-statement { font-size: 30px; font-weight: 700; color: #fff; line-height: 1.4; margin-bottom: 36px; border-left: 5px solid #C9A96E; padding-left: 24px; font-style: italic; }
  .pos-meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 32px; }
  .pos-meta-card { background: rgba(201,169,110,0.08); border: 1px solid rgba(201,169,110,0.2); border-radius: 8px; padding: 16px; }
  .pos-meta-label { font-size: 9px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px; }
  .pos-meta-value { font-size: 13px; color: #fff; line-height: 1.5; font-weight: 500; }
  .pos-logic { background: rgba(255,255,255,0.04); border-radius: 10px; padding: 22px 24px; margin-bottom: 28px; }
  .pos-logic-label { font-size: 9px; color: rgba(201,169,110,0.5); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }
  .pos-logic-text { font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.8; }
  .tradeoff-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .tradeoff-abandon { flex: 1; background: rgba(220,80,80,0.1); border: 1px solid rgba(220,80,80,0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #c06060; }
  .tradeoff-gain { flex: 1; background: rgba(80,180,100,0.1); border: 1px solid rgba(80,180,100,0.2); border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #4a9060; }
  .tradeoff-arrow { color: #C9A96E; font-size: 18px; flex-shrink: 0; }

  /* ── PLATAFORMA ── */
  .platform-field { margin-bottom: 18px; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #C9A96E; background: #faf8f4; }
  .platform-label { font-size: 10px; color: #C9A96E; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .platform-value { font-size: 14px; color: #1C1F2A; line-height: 1.6; font-weight: 500; }
  .tom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
  .tom-col-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 10px; }
  .tom-tag { display: inline-block; margin: 3px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .tom-e { background: rgba(201,169,110,0.1); color: #8a6020; border: 1px solid rgba(201,169,110,0.3); }
  .tom-nao { background: rgba(180,180,180,0.08); color: #808090; border: 1px solid rgba(180,180,180,0.2); text-decoration: line-through; }
  .valor-item { display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start; }
  .valor-dot { width: 8px; height: 8px; border-radius: 50%; background: #C9A96E; flex-shrink: 0; margin-top: 6px; }
  .valor-nome { font-size: 13px; font-weight: 700; color: #1C1F2A; margin-bottom: 3px; }
  .valor-comp { font-size: 12px; color: #5A5A70; line-height: 1.5; }
  .manifesto-box { background: #1C1F2A; border-radius: 10px; padding: 28px 32px; margin-top: 16px; border-left: 4px solid #C9A96E; }
  .manifesto-text { font-size: 14px; color: rgba(255,255,255,0.85); line-height: 1.85; font-style: italic; }
  .manifesto-text p { margin-bottom: 14px; }

  /* ── SISTEMA VISUAL ── */
  .principio-item { padding: 14px 18px; border-radius: 8px; background: rgba(201,169,110,0.07); border: 1px solid rgba(201,169,110,0.2); margin-bottom: 10px; font-size: 13px; color: #3D4054; line-height: 1.6; }
  .principio-item::before { content: '→ '; color: #C9A96E; font-weight: 700; }
  .visual-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
  .visual-card { border: 1px solid #e8e4da; border-radius: 8px; padding: 16px; }
  .visual-card-label { font-size: 10px; color: #9990A0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  .visual-card-text { font-size: 13px; color: #3D4054; line-height: 1.6; }
  .moodboard-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
  .moodboard-img { border-radius: 8px; overflow: hidden; aspect-ratio: 1/1; border: 1px solid #e8e4da; background: #f0ede8; position: relative; }
  .moodboard-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .moodboard-expired { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 11px; color: #9990A0; text-align: center; padding: 12px; }

  /* ── ATIVAÇÃO ── */
  .wave-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .wave-card { border-radius: 10px; padding: 20px; border: 2px solid; }
  .wave-card-onda { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; opacity: 0.7; }
  .wave-card-foco { font-size: 13px; color: #3D4054; line-height: 1.5; margin-top: 8px; }
  .kpi-item { display: grid; grid-template-columns: 80px 1fr; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f0ede8; align-items: center; }
  .kpi-periodo { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #C9A96E; }
  .kpi-meta { font-size: 13px; color: #3D4054; line-height: 1.5; }
  .criterio-item { display: flex; gap: 12px; margin-bottom: 10px; align-items: flex-start; }
  .criterio-check { color: #50a868; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .criterio-text { font-size: 13px; color: #3D4054; line-height: 1.5; }

  /* ── PRÓXIMOS PASSOS ── */
  .next-steps { display: flex; flex-direction: column; gap: 12px; }
  .next-step { display: grid; grid-template-columns: 36px 1fr auto auto; gap: 16px; align-items: center; padding: 16px 20px; border-radius: 8px; background: #faf8f4; border: 1px solid #e8e4da; }
  .next-step-num { width: 32px; height: 32px; border-radius: 50%; background: #C9A96E; color: #1C1F2A; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .next-step-acao { font-size: 13px; font-weight: 600; color: #1C1F2A; }
  .next-step-owner { font-size: 11px; color: #9990A0; white-space: nowrap; }
  .next-step-prazo { font-size: 11px; font-weight: 700; color: #C9A96E; white-space: nowrap; }

  /* ── NARRATIVA SIMBÓLICA ── */
  .symbolic { background: #1C1F2A; padding: 52px 60px; }
  .symbolic-label { font-size: 10px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 8px; }
  .symbolic-title { font-size: 22px; font-weight: 700; color: #C9A96E; margin-bottom: 24px; }
  .symbolic-text { font-size: 14px; color: rgba(255,255,255,0.82); line-height: 1.85; }
  .symbolic-text p { margin-bottom: 16px; }

  /* ── FOOTER ── */
  .report-footer { background: #1C1F2A; padding: 28px 60px; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 11px; color: rgba(201,169,110,0.6); font-weight: 700; letter-spacing: 0.15em; }
  .footer-tag { font-size: 11px; color: rgba(255,255,255,0.3); }

  /* ── GENERATING STATE ── */
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const PHASE_COLORS = ['#C9A96E', '#8BA0C9', '#6AB56A', '#C98E6E', '#A96EC9'];

function Prose({ text, dark }: { text: string; dark?: boolean }) {
  const cls = dark ? 'prose-dark' : 'prose';
  return (
    <div className={cls}>
      {text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

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
        <div className="cover-meta-item">
          <div className="cover-meta-label">Setor</div>
          <div className="cover-meta-value">{project.setor}</div>
        </div>
        <div className="cover-meta-item">
          <div className="cover-meta-label">Data</div>
          <div className="cover-meta-value">{date}</div>
        </div>
        <div className="cover-meta-item">
          <div className="cover-meta-label">Metodologia</div>
          <div className="cover-meta-value">AMUM · 5 Fases</div>
        </div>
      </div>
    </div>
  );
}

function TableOfContents() {
  const phases = [
    { num: 1, name: 'Escuta', color: PHASE_COLORS[0] },
    { num: 2, name: 'Decifração', color: PHASE_COLORS[1] },
    { num: 3, name: 'Reconstrução', color: PHASE_COLORS[2] },
    { num: 4, name: 'Travessia', color: PHASE_COLORS[3] },
    { num: 5, name: 'Regeneração', color: PHASE_COLORS[4] },
  ];
  const sections = ['Ponto de Partida', 'A Jornada', 'O Posicionamento', 'A Nova Marca', 'Sistema Visual', 'Plano de Ativação', 'Próximos 90 Dias'];

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
        {sections.map(s => (
          <div key={s} className="toc-section-tag">{s}</div>
        ))}
      </div>
    </div>
  );
}

function PontoDepartida({ data }: { data: FinalReportJSON }) {
  const pd = data.pontoDepartida;
  return (
    <div className="section">
      <div className="section-label">01 · Ponto de Partida</div>
      <div className="section-title">A Marca Antes do Processo</div>

      <Prose text={pd.estadoInicial} />

      {pd.perguntaFundadora && (
        <div style={{ margin: '24px 0', background: '#1C1F2A', borderRadius: '10px', padding: '22px 28px', borderLeft: '4px solid #C9A96E' }}>
          <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>A pergunta fundadora</div>
          <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>"{pd.perguntaFundadora}"</div>
        </div>
      )}

      {pd.tensoesDiagnosticadas?.length > 0 && (
        <>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '24px', marginBottom: '12px' }}>Tensões diagnosticadas</div>
          <div className="tension-list">
            {pd.tensoesDiagnosticadas.map((t, i) => (
              <div key={i} className="tension-item">{t}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function JornadaSVG({ fases }: { fases: FaseJornada[] }) {
  const w = 760; const h = 60;
  const step = w / Math.max(fases.length - 1, 1);

  return (
    <svg viewBox={`0 0 ${w + 40} ${h + 60}`} style={{ width: '100%', overflow: 'visible', marginBottom: '24px' }}>
      <line x1={20} y1={30} x2={w + 20} y2={30} stroke="#e8e4da" strokeWidth="2" />
      {fases.map((f, i) => {
        const x = 20 + i * step;
        const color = PHASE_COLORS[i] || '#C9A96E';
        return (
          <g key={i}>
            <circle cx={x} cy={30} r={14} fill={color} />
            <text x={x} y={34} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="800" fontFamily="Inter, system-ui">{f.fase}</text>
            <text x={x} y={56} textAnchor="middle" fontSize="10" fill={color} fontWeight="700" fontFamily="Inter, system-ui">{f.nome}</text>
            <text x={x} y={70} textAnchor="middle" fontSize="9" fill="#9990A0" fontFamily="Inter, system-ui">{f.dados?.slice(0, 22)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AJornada({ data }: { data: FinalReportJSON }) {
  const fases = data.jornada || [];
  return (
    <div className="section-alt">
      <div className="section-label">02 · A Jornada</div>
      <div className="section-title">5 Movimentos Estratégicos</div>

      <JornadaSVG fases={fases} />

      <div className="journey-grid">
        {fases.map((f, i) => (
          <div key={i} className="journey-item">
            <div className="journey-num-col">
              <div className="journey-circle" style={{ background: PHASE_COLORS[i] || '#C9A96E' }}>{f.fase}</div>
              {i < fases.length - 1 && <div className="journey-line" />}
            </div>
            <div className="journey-content">
              <div className="journey-phase-name" style={{ color: PHASE_COLORS[i] || '#C9A96E' }}>{f.nome}</div>
              <div className="journey-achado">{f.achadoCritico}</div>
              <div className="journey-decisao">{f.decisaoChave}</div>
              <div className="journey-dados">{f.dados}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OPosicionamento({ data }: { data: FinalReportJSON }) {
  const pos = data.posicionamento;
  if (!pos) return null;
  return (
    <div className="pos-hero">
      <div className="pos-hero-label">03 · O Posicionamento · Seção Central</div>
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
            <div className="pos-meta-label">Por que este território</div>
            <div className="pos-meta-value">{pos.porQueEsteTerritorio}</div>
          </div>
        )}
      </div>

      {pos.logicaSimbolicaCompleta && (
        <div className="pos-logic">
          <div className="pos-logic-label">Lógica simbólica completa</div>
          <div className="pos-logic-text">
            {pos.logicaSimbolicaCompleta.split('\n\n').map((p, i) => (
              <p key={i} style={{ marginBottom: '12px' }}>{p}</p>
            ))}
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

function ANovaMarca({ data }: { data: FinalReportJSON }) {
  const pl = data.plataforma;
  if (!pl) return null;
  return (
    <>
      <div className="section">
        <div className="section-label">04 · A Nova Marca</div>
        <div className="section-title">Plataforma Completa</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <div>
            {pl.proposito && <div className="platform-field"><div className="platform-label">Propósito</div><div className="platform-value">{pl.proposito}</div></div>}
            {pl.essencia && <div className="platform-field"><div className="platform-label">Essência</div><div className="platform-value" style={{ color: '#C9A96E', fontWeight: 700, fontSize: '16px' }}>{pl.essencia}</div></div>}
            {pl.posicionamento && <div className="platform-field"><div className="platform-label">Posicionamento</div><div className="platform-value">{pl.posicionamento}</div></div>}
            {pl.promessa && <div className="platform-field"><div className="platform-label">Promessa</div><div className="platform-value">{pl.promessa}</div></div>}
          </div>
          <div>
            {pl.valores?.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Valores</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Código Linguístico</div>
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
              <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Manifesto</div>
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

function SistemaVisual({ project, data }: { project: Project; data: FinalReportJSON }) {
  const sv = data.sistemaVisual;
  const selectedImages = (project.visualDirection?.moodboardImages || []).filter(img => img.selecionada);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  if (!sv) return null;
  return (
    <div className="section">
      <div className="section-label">05 · Sistema Visual</div>
      <div className="section-title">Direção de Identidade</div>

      {sv.principiosSimbolicos?.length > 0 && (
        <>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Princípios simbólicos</div>
          {sv.principiosSimbolicos.map((p, i) => (
            <div key={i} className="principio-item">{p}</div>
          ))}
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
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '24px 0 12px' }}>
            Moodboard selecionado
          </div>
          <div className="moodboard-grid">
            {selectedImages.map((img, i) => (
              <div key={img.id} className="moodboard-img">
                {imgErrors[img.id] ? (
                  <div className="moodboard-expired">
                    <div>⏱<br />URL expirada · Imagem {i + 1}</div>
                  </div>
                ) : (
                  <img
                    src={img.url}
                    alt={`Moodboard ${i + 1}`}
                    onError={() => setImgErrors(prev => ({ ...prev, [img.id]: true }))}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlanoAtivacao({ data }: { data: FinalReportJSON }) {
  const at = data.ativacao;
  if (!at) return null;
  const waveColors = ['#C9A96E', '#8BA0C9', '#6AB56A'];
  return (
    <div className="section-alt">
      <div className="section-label">06 · Plano de Ativação</div>
      <div className="section-title">Rollout e KPIs</div>

      <div className="wave-grid">
        {(at.ondas || []).slice(0, 3).map((w, i) => (
          <div key={i} className="wave-card" style={{ borderColor: waveColors[i], background: `${waveColors[i]}0d` }}>
            <div className="wave-card-onda" style={{ color: waveColors[i] }}>{w.onda}</div>
            <div style={{ fontSize: '11px', color: waveColors[i], opacity: 0.7 }}>{w.timeline}</div>
            <div className="wave-card-foco">{w.foco}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>KPIs</div>
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

function ProximosPasass({ data }: { data: FinalReportJSON }) {
  const steps = data.proximosPasass || [];
  if (!steps.length) return null;
  return (
    <div className="section">
      <div className="section-label">07 · Próximos 90 Dias</div>
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

function ReportFooter({ project }: { project: Project }) {
  const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="report-footer">
      <div className="footer-brand">AMUM · METODOLOGIA PROPRIETÁRIA</div>
      <div className="footer-tag">{project.nome} · {date} · Confidencial</div>
    </div>
  );
}

// ─── GENERATING SCREEN ────────────────────────────────────────────────────────

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

    // Check cached final report
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
      setGenStep('Gerando dados estruturados com Claude…');
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'final_report_data', projectContext: ctx }),
      });
      const result = await res.json() as { json?: FinalReportJSON; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.json) throw new Error('Nenhum dado retornado');

      setGenStep('Salvando relatório…');
      // Cache in localStorage
      const { saveProject } = await import('@/lib/store');
      const updated: Project = { ...proj, finalReport: { json: result.json as unknown as Record<string, unknown>, createdAt: new Date().toISOString() } };
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
    setReportData(null);
    await generateReport(project);
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <p style={{ fontSize: '16px', color: '#5A5A70', marginBottom: '8px' }}>Projeto não encontrado</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ede8', fontFamily: 'system-ui' }}>
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
      <button className="print-btn" onClick={() => window.print()}>
        <span>⬇</span> Exportar PDF
      </button>
      <button
        onClick={handleRegenerate}
        style={{ position: 'fixed', bottom: '32px', right: '180px', zIndex: 100, background: 'transparent', color: '#C9A96E', border: '1px solid #C9A96E', borderRadius: '8px', padding: '12px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
      >
        ↺ Regenerar
      </button>

      <div className="report-wrapper">
        <div className="report-page">
          <Cover project={project} data={reportData} />
          <TableOfContents />
          <PontoDepartida data={reportData} />
          <AJornada data={reportData} />
          <OPosicionamento data={reportData} />
          <ANovaMarca data={reportData} />
          <SistemaVisual project={project} data={reportData} />
          <PlanoAtivacao data={reportData} />
          <ProximosPasass data={reportData} />
          <NarrativaSimbolica data={reportData} />
          <ReportFooter project={project} />
        </div>
      </div>
    </div>
  );
}
