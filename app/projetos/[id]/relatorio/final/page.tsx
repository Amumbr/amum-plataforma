'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject, getProjectContext, Project } from '@/lib/store';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface FinalReportJSON {
  capa: { tagline: string; subtitulo: string };

  abertura: string;

  pontoDePartida: {
    notaDeLeitura: string;
    retratoDaMarca: {
      comoSeApresenta: string;
      oQueDadosMostram: string;
      tensaoCentral: string;
    };
    mapaIFazFala: {
      dimensoes: { dimensao: string; eDeclara: string; eFaz: string; eFala: string; discrepancia: string; risco: string }[];
      implicacoesEstrategicas: string[];
    };
    diagnosticoTouchpoints: {
      touchpointsCriticos: { touchpoint: string; canal: string; peso: number; scoreCoerencia: number; observacao: string }[];
      quickWins: string[];
    };
    tensoesEstruturais: { titulo: string; descricao: string }[];
    perguntaFundadora: string;
  };

  decifracao: {
    notaDeLeitura: string;
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
    afirmacaoCentral: string;
    arquiteturaDeMarca: {
      portfolioMap: string;
      nomenclaturaRegras: string;
      brandToOperating: { funcao: string; implicacao: string; responsavel: string; prioridade: string }[];
    };
    matrizODS: {
      items: {
        ods: string;
        classificacao?: string;
        riscoGreenwashing?: string;
        iniciativas: { descricao: string; indicador: string; owner: string; cadencia: string }[];
      }[];
    };
  };

  novaMarca: {
    notaDeLeitura: string;
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
    bibliotecaDeMensagens: { publico: string; afirmacaoCentral: string; provas: string[] }[];
    manifesto: string;
    direcaoVisual: {
      principiosSimbolicos: string[];
      paleta: string;
      tipografia: string;
      elementosGraficos: string[];
      diretrizes: string;
      descricaoMoodboard: string;
    };
  };

  travessia: {
    notaDeLeitura: string;
    ondas: { onda: string; timeline: string; touchpoints: string[]; responsaveis: string[]; criteriosConclusao: string[] }[];
    kpis: { periodo: string; indicador: string; meta: string }[];
    riscos: { risco: string; nivel: string; contingencia: string }[];
    enablementKit: {
      faqs: { pergunta: string; resposta: string }[];
      templates: { nome: string; descricao: string }[];
      trilhaAdocao: { area: string; passos: string[] }[];
      checklistQA: string[];
    };
    trainingDesign: {
      objetivosPorPublico: { publico: string; objetivos: string[] }[];
      agenda: { bloco: string; duracao: string; formato: string; detalhamento?: string }[];
      materiaisNecessarios: string[];
    };
  };

  regeneracao: {
    notaDeLeitura: string;
    scorecard: { dimensao: string; score: number; meta: number; tendencia: string; acao?: string }[];
    cadencia: { frequencia: string; atividade: string; responsavel: string }[];
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

  narrativaSimbolica: string;

  proximosPassos?: { prioridade: number; acao: string; owner: string; prazo: string }[];
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


  .faz-fala-table { border: 1px solid #e8e4da; border-radius: 8px; overflow: hidden; font-size: 12px; }
  .faz-fala-head { display: grid; grid-template-columns: 150px 1fr 1fr 1fr 1fr 140px; gap: 10px; padding: 10px 14px; background: #1C1F2A; color: rgba(201,169,110,0.8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; }
  .faz-fala-row { display: grid; grid-template-columns: 150px 1fr 1fr 1fr 1fr 140px; gap: 10px; padding: 12px 14px; border-top: 1px solid #f0ede8; color: #3D4054; line-height: 1.5; }
  .faz-fala-row:nth-child(even) { background: #fafaf8; }
  .touchpoint-row { display: grid; grid-template-columns: 1fr 100px 200px 1.2fr; gap: 12px; padding: 10px 14px; background: #fff; border: 1px solid #e8e4da; border-radius: 8px; margin-bottom: 6px; font-size: 13px; align-items: center; }
  .touchpoint-nome { font-weight: 600; color: #1C1F2A; }
  .touchpoint-canal { font-size: 11px; color: #9990A0; text-transform: uppercase; letter-spacing: 0.06em; }
  .touchpoint-scores { display: flex; gap: 6px; }
  .touchpoint-obs { color: #3D4054; line-height: 1.5; font-size: 12px; }
  .score-pill { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; }

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
    'Abertura', 'Ponto de Partida', 'Decifração', 'Nova Marca',
    'Travessia', 'Regeneração', 'Síntese Final', 'Próximos Passos'
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

// ─── NOTA DE LEITURA (frase-ponte didática, sem revelar mecanismo) ─────────────

function NotaDeLeitura({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ fontSize: '13px', color: '#5A5A70', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '28px', paddingLeft: '16px', borderLeft: '2px solid #C9A96E' }}>
      {text}
    </div>
  );
}

// ─── ABERTURA ─────────────────────────────────────────────────────────────────

function Abertura({ data }: { data: FinalReportJSON }) {
  if (!data.abertura) return null;
  return (
    <div className="section-alt">
      <div className="section-label">01 · Abertura</div>
      <div className="section-title">O princípio que orienta este trabalho</div>
      <div className="premissa-box">
        <div className="premissa-text">
          {data.abertura.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── PONTO DE PARTIDA (condensado Fase 1) ─────────────────────────────────────

function PontoDePartida({ data }: { data: FinalReportJSON }) {
  const pd = data.pontoDePartida;
  if (!pd) return null;
  return (
    <div className="section">
      <div className="section-label">02 · Ponto de Partida</div>
      <div className="section-title">A marca antes da intervenção</div>
      <NotaDeLeitura text={pd.notaDeLeitura} />

      {pd.retratoDaMarca && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Como a marca se apresenta</div>
              <div style={{ fontSize: '14px', color: '#3D4054', lineHeight: 1.85 }}>
                {(pd.retratoDaMarca.comoSeApresenta || '').split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '14px' }}>{p}</p>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>O que os dados mostram</div>
              <div style={{ fontSize: '14px', color: '#3D4054', lineHeight: 1.85 }}>
                {(pd.retratoDaMarca.oQueDadosMostram || '').split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '14px' }}>{p}</p>)}
              </div>
            </div>
          </div>
          {pd.retratoDaMarca.tensaoCentral && (
            <div style={{ background: '#1C1F2A', borderRadius: '10px', padding: '22px 28px', borderLeft: '4px solid #C9A96E' }}>
              <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Tensão central</div>
              <div style={{ fontSize: '15px', color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{pd.retratoDaMarca.tensaoCentral}&rdquo;</div>
            </div>
          )}
        </div>
      )}

      {pd.mapaIFazFala?.dimensoes && pd.mapaIFazFala.dimensoes.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Mapa É / Faz / Fala</div>
          <div className="faz-fala-table">
            <div className="faz-fala-head">
              <div>Dimensão</div><div>É (declara)</div><div>Faz</div><div>Fala</div><div>Discrepância</div><div>Risco</div>
            </div>
            {pd.mapaIFazFala.dimensoes.map((d, i) => (
              <div key={i} className="faz-fala-row">
                <div style={{ fontWeight: 600 }}>{d.dimensao}</div>
                <div>{d.eDeclara}</div>
                <div>{d.eFaz}</div>
                <div>{d.eFala}</div>
                <div style={{ color: '#c06060' }}>{d.discrepancia}</div>
                <div style={{ color: '#8a6020', fontWeight: 500 }}>{d.risco}</div>
              </div>
            ))}
          </div>
          {pd.mapaIFazFala.implicacoesEstrategicas && pd.mapaIFazFala.implicacoesEstrategicas.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Implicações estratégicas</div>
              {pd.mapaIFazFala.implicacoesEstrategicas.map((imp, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.65, marginBottom: '8px', paddingLeft: '14px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#C9A96E' }}>→</span>{imp}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pd.diagnosticoTouchpoints?.touchpointsCriticos && pd.diagnosticoTouchpoints.touchpointsCriticos.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Touchpoints críticos</div>
          {pd.diagnosticoTouchpoints.touchpointsCriticos.map((t, i) => (
            <div key={i} className="touchpoint-row">
              <div className="touchpoint-nome">{t.touchpoint}</div>
              <div className="touchpoint-canal">{t.canal}</div>
              <div className="touchpoint-scores">
                <span className="score-pill" style={{ background: 'rgba(201,169,110,0.15)', color: '#8a6020' }}>peso {t.peso}</span>
                <span className="score-pill" style={{ background: t.scoreCoerencia < 3 ? 'rgba(220,80,80,0.15)' : 'rgba(80,180,100,0.15)', color: t.scoreCoerencia < 3 ? '#c06060' : '#4a9060' }}>coerência {t.scoreCoerencia}</span>
              </div>
              <div className="touchpoint-obs">{t.observacao}</div>
            </div>
          ))}
          {pd.diagnosticoTouchpoints.quickWins && pd.diagnosticoTouchpoints.quickWins.length > 0 && (
            <div style={{ marginTop: '16px', background: '#faf8f4', borderRadius: '8px', padding: '16px 20px', borderLeft: '3px solid #C9A96E' }}>
              <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Quick wins identificados</div>
              {pd.diagnosticoTouchpoints.quickWins.map((q, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.6, marginBottom: '6px' }}>• {q}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {pd.tensoesEstruturais && pd.tensoesEstruturais.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Tensões estruturais</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {pd.tensoesEstruturais.map((t, i) => (
              <div key={i} style={{ background: 'rgba(220,80,80,0.05)', border: '1px solid rgba(220,80,80,0.18)', borderRadius: '8px', padding: '16px 18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A', marginBottom: '6px' }}>{t.titulo}</div>
                <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55 }}>{t.descricao}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pd.perguntaFundadora && (
        <div style={{ background: '#1C1F2A', borderRadius: '10px', padding: '24px 32px', borderLeft: '4px solid #C9A96E' }}>
          <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>A pergunta fundadora</div>
          <div style={{ fontSize: '16px', color: '#fff', lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{pd.perguntaFundadora}&rdquo;</div>
        </div>
      )}
    </div>
  );
}

// ─── DECIFRAÇÃO (condensado Fase 2) ───────────────────────────────────────────

function Decifracao({ data }: { data: FinalReportJSON }) {
  const dc = data.decifracao;
  if (!dc) return null;
  return (
    <div className="section-alt">
      <div className="section-label">03 · Decifração</div>
      <div className="section-title">Arquétipo, território e trade-offs</div>
      <NotaDeLeitura text={dc.notaDeLeitura} />

      {dc.afirmacaoCentral && (
        <div className="pos-hero" style={{ borderRadius: '12px', marginBottom: '32px' }}>
          <div className="pos-hero-label">Afirmação de posicionamento</div>
          <div className="pos-hero-statement">&ldquo;{dc.afirmacaoCentral}&rdquo;</div>
          <div className="pos-meta-grid">
            {dc.arquetipo?.nome && (
              <div className="pos-meta-card">
                <div className="pos-meta-label">Arquétipo</div>
                <div className="pos-meta-value" style={{ color: '#C9A96E', fontWeight: 700, fontSize: '15px' }}>{dc.arquetipo.nome}</div>
              </div>
            )}
            {dc.territorios?.escolhido && (
              <div className="pos-meta-card">
                <div className="pos-meta-label">Território escolhido</div>
                <div className="pos-meta-value">{dc.territorios.escolhido}</div>
              </div>
            )}
          </div>
          {dc.arquetipo?.signosQueConfirmaram && (
            <div className="pos-logic">
              <div className="pos-logic-label">Signos que confirmaram o arquétipo</div>
              <div className="pos-logic-text">
                {dc.arquetipo.signosQueConfirmaram.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}
          {dc.territorios?.porQueEsteTerritorio && (
            <div className="pos-logic">
              <div className="pos-logic-label">Por que este território</div>
              <div className="pos-logic-text">
                {dc.territorios.porQueEsteTerritorio.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}
          {dc.territorios?.avaliados && dc.territorios.avaliados.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.5)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Territórios avaliados</div>
              {dc.territorios.avaliados.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '14px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '13px', color: 'rgba(255,255,255,0.82)' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{t.nome}</div>
                  <div style={{ lineHeight: 1.5 }}>{t.viabilidade}</div>
                </div>
              ))}
            </div>
          )}
          {dc.tradeoffs && dc.tradeoffs.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.5)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Trade-offs formais</div>
              {dc.tradeoffs.map((t, i) => (
                <div key={i} className="tradeoff-row">
                  <div className="tradeoff-abandon">✗ {t.abandona}</div>
                  <div className="tradeoff-arrow">→</div>
                  <div className="tradeoff-gain">✓ {t.ganha}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dc.arquiteturaDeMarca && (dc.arquiteturaDeMarca.portfolioMap || dc.arquiteturaDeMarca.nomenclaturaRegras || (dc.arquiteturaDeMarca.brandToOperating && dc.arquiteturaDeMarca.brandToOperating.length > 0)) && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Arquitetura de marca</div>
          {dc.arquiteturaDeMarca.portfolioMap && (
            <div style={{ background: '#faf8f4', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Mapa de portfólio</div>
              <div style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.65 }}>{dc.arquiteturaDeMarca.portfolioMap}</div>
            </div>
          )}
          {dc.arquiteturaDeMarca.nomenclaturaRegras && (
            <div style={{ background: '#faf8f4', borderRadius: '8px', padding: '16px 20px', marginBottom: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Regras de nomenclatura</div>
              <div style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.65 }}>{dc.arquiteturaDeMarca.nomenclaturaRegras}</div>
            </div>
          )}
          {dc.arquiteturaDeMarca.brandToOperating && dc.arquiteturaDeMarca.brandToOperating.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Brand-to-Operating: implicações por função</div>
              {dc.arquiteturaDeMarca.brandToOperating.map((b, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 140px 80px', gap: '12px', padding: '12px 16px', background: '#fff', border: '1px solid #e8e4da', borderRadius: '8px', marginBottom: '8px', fontSize: '13px', alignItems: 'start' }}>
                  <div style={{ fontWeight: 700, color: '#1C1F2A' }}>{b.funcao}</div>
                  <div style={{ color: '#3D4054', lineHeight: 1.55 }}>{b.implicacao}</div>
                  <div style={{ color: '#5A5A70', fontSize: '12px' }}>{b.responsavel}</div>
                  <div>
                    <span className="score-pill" style={{ background: b.prioridade === 'alta' ? 'rgba(220,80,80,0.15)' : b.prioridade === 'media' ? 'rgba(201,169,110,0.15)' : 'rgba(80,180,100,0.15)', color: b.prioridade === 'alta' ? '#c06060' : b.prioridade === 'media' ? '#8a6020' : '#4a9060' }}>{b.prioridade}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dc.matrizODS?.items && dc.matrizODS.items.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Matriz ODS</div>
          {dc.matrizODS.items.map((item, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '10px', padding: '18px 22px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1F2A' }}>{item.ods}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {item.classificacao && <span className="score-pill" style={{ background: item.classificacao === 'operacional' ? 'rgba(80,180,100,0.15)' : 'rgba(201,169,110,0.15)', color: item.classificacao === 'operacional' ? '#4a9060' : '#8a6020' }}>{item.classificacao}</span>}
                  {item.riscoGreenwashing && <span className="score-pill" style={{ background: item.riscoGreenwashing === 'alto' ? 'rgba(220,80,80,0.15)' : item.riscoGreenwashing === 'medio' ? 'rgba(201,169,110,0.15)' : 'rgba(80,180,100,0.15)', color: item.riscoGreenwashing === 'alto' ? '#c06060' : item.riscoGreenwashing === 'medio' ? '#8a6020' : '#4a9060' }}>risco {item.riscoGreenwashing}</span>}
                </div>
              </div>
              {item.iniciativas?.map((ini, j) => (
                <div key={j} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px 120px', gap: '10px', padding: '8px 0', fontSize: '12px', color: '#3D4054', borderTop: j === 0 ? '1px solid #f0ede8' : 'none' }}>
                  <div>{ini.descricao}</div>
                  <div style={{ color: '#8a6020', fontWeight: 500 }}>{ini.indicador}</div>
                  <div style={{ color: '#5A5A70' }}>{ini.owner}</div>
                  <div style={{ color: '#5A5A70' }}>{ini.cadencia}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NOVA MARCA (condensado Fase 3) ───────────────────────────────────────────

function NovaMarca({ data }: { data: FinalReportJSON }) {
  const nm = data.novaMarca;
  if (!nm) return null;
  return (
    <>
      <div className="section">
        <div className="section-label">04 · Nova Marca</div>
        <div className="section-title">Plataforma, linguagem e direção visual</div>
        <NotaDeLeitura text={nm.notaDeLeitura} />

        {nm.plataforma && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', marginBottom: '32px' }}>
            <div>
              {nm.plataforma.proposito && <div className="platform-field"><div className="platform-label">Propósito</div><div className="platform-value">{nm.plataforma.proposito}</div></div>}
              {nm.plataforma.essencia && <div className="platform-field"><div className="platform-label">Essência</div><div className="platform-value" style={{ color: '#C9A96E', fontWeight: 700, fontSize: '17px' }}>{nm.plataforma.essencia}</div></div>}
              {nm.plataforma.posicionamento && <div className="platform-field"><div className="platform-label">Posicionamento</div><div className="platform-value">{nm.plataforma.posicionamento}</div></div>}
              {nm.plataforma.promessa && <div className="platform-field"><div className="platform-label">Promessa</div><div className="platform-value">{nm.plataforma.promessa}</div></div>}
            </div>
            <div>
              {nm.plataforma.valores && nm.plataforma.valores.length > 0 && (
                <>
                  <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Valores e comportamentos</div>
                  {nm.plataforma.valores.map((v, i) => (
                    <div key={i} className="valor-item">
                      <div className="valor-dot" />
                      <div style={{ flex: 1 }}>
                        <div className="valor-nome">{v.valor}</div>
                        {(v.comportamentos || []).map((c, j) => (
                          <div key={j} className="valor-comp" style={{ marginBottom: '4px' }}>• {c}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {nm.codigoLinguistico && (
        <div className="section-alt">
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '18px' }}>Código linguístico</div>

          {nm.codigoLinguistico.tomDeVoz && (
            <div className="tom-grid" style={{ marginBottom: '24px' }}>
              <div>
                <div className="tom-col-label" style={{ color: '#50a868' }}>A marca É</div>
                {(nm.codigoLinguistico.tomDeVoz.e || []).map((t, i) => <span key={i} className="tom-tag tom-e">{t}</span>)}
              </div>
              <div>
                <div className="tom-col-label" style={{ color: '#9990A0' }}>A marca NÃO É</div>
                {(nm.codigoLinguistico.tomDeVoz.naoE || []).map((t, i) => <span key={i} className="tom-tag tom-nao">{t}</span>)}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {nm.codigoLinguistico.vocabularioPreferencial && nm.codigoLinguistico.vocabularioPreferencial.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Vocabulário preferencial</div>
                <div>{nm.codigoLinguistico.vocabularioPreferencial.map((v, i) => <span key={i} className="tom-tag tom-e">{v}</span>)}</div>
              </div>
            )}
            {nm.codigoLinguistico.vocabularioProibido && nm.codigoLinguistico.vocabularioProibido.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Vocabulário proibido</div>
                <div>{nm.codigoLinguistico.vocabularioProibido.map((v, i) => <span key={i} className="tom-tag tom-nao">{v}</span>)}</div>
              </div>
            )}
          </div>

          {nm.codigoLinguistico.padroesConstrutivos && nm.codigoLinguistico.padroesConstrutivos.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Padrões construtivos</div>
              {nm.codigoLinguistico.padroesConstrutivos.map((p, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.6, marginBottom: '6px', paddingLeft: '14px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#C9A96E' }}>→</span>{p}
                </div>
              ))}
            </div>
          )}

          {nm.codigoLinguistico.exemplosAplicacao && nm.codigoLinguistico.exemplosAplicacao.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Exemplos de aplicação</div>
              {nm.codigoLinguistico.exemplosAplicacao.map((ex, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#C9A96E', fontWeight: 700, marginBottom: '4px' }}>{ex.contexto}</div>
                  <div style={{ fontSize: '13px', color: '#1C1F2A', lineHeight: 1.55, fontStyle: 'italic' }}>&ldquo;{ex.exemplo}&rdquo;</div>
                </div>
              ))}
            </div>
          )}

          {nm.codigoLinguistico.qaChecklist && nm.codigoLinguistico.qaChecklist.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Checklist de QA</div>
              {nm.codigoLinguistico.qaChecklist.map((q, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.55, marginBottom: '6px' }}>☐ {q}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {nm.bibliotecaDeMensagens && nm.bibliotecaDeMensagens.length > 0 && (
        <div className="section">
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '18px' }}>Biblioteca de mensagens</div>
          {nm.bibliotecaDeMensagens.map((m, i) => (
            <div key={i} style={{ background: '#faf8f4', border: '1px solid #e8e4da', borderRadius: '10px', padding: '18px 22px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#C9A96E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Para {m.publico}</div>
              <div style={{ fontSize: '14px', color: '#1C1F2A', fontWeight: 600, lineHeight: 1.5, marginBottom: '12px', fontStyle: 'italic' }}>&ldquo;{m.afirmacaoCentral}&rdquo;</div>
              {m.provas && m.provas.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Provas</div>
                  {m.provas.map((p, j) => (
                    <div key={j} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '4px' }}>• {p}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {nm.manifesto && (
        <div className="section-alt">
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Manifesto</div>
          <div className="manifesto-box">
            <div className="manifesto-text">
              {nm.manifesto.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      )}

      {nm.direcaoVisual && (
        <div className="section">
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Direção de criação visual</div>

          {nm.direcaoVisual.principiosSimbolicos && nm.direcaoVisual.principiosSimbolicos.length > 0 && (
            <>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Princípios simbólicos</div>
              {nm.direcaoVisual.principiosSimbolicos.map((p, i) => <div key={i} className="principio-item">{p}</div>)}
            </>
          )}

          <div className="visual-cards">
            {nm.direcaoVisual.paleta && (
              <div className="visual-card">
                <div className="visual-card-label">Paleta</div>
                <div className="visual-card-text">{nm.direcaoVisual.paleta}</div>
              </div>
            )}
            {nm.direcaoVisual.tipografia && (
              <div className="visual-card">
                <div className="visual-card-label">Tipografia</div>
                <div className="visual-card-text">{nm.direcaoVisual.tipografia}</div>
              </div>
            )}
          </div>

          {nm.direcaoVisual.elementosGraficos && nm.direcaoVisual.elementosGraficos.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Elementos gráficos</div>
              {nm.direcaoVisual.elementosGraficos.map((e, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.6, marginBottom: '6px', paddingLeft: '14px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#C9A96E' }}>→</span>{e}
                </div>
              ))}
            </div>
          )}

          {nm.direcaoVisual.diretrizes && (
            <div style={{ marginTop: '20px', background: '#faf8f4', borderRadius: '8px', padding: '16px 20px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>Diretrizes</div>
              <div style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.65 }}>{nm.direcaoVisual.diretrizes}</div>
            </div>
          )}

          {nm.direcaoVisual.descricaoMoodboard && (
            <div style={{ marginTop: '20px', background: '#1C1F2A', borderRadius: '10px', padding: '22px 28px', borderLeft: '4px solid #C9A96E' }}>
              <div style={{ fontSize: '9px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Atmosfera visual — descrição da direção de criação</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.75, fontStyle: 'italic' }}>{nm.direcaoVisual.descricaoMoodboard}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── TRAVESSIA (condensado Fase 4) ────────────────────────────────────────────

function Travessia({ data }: { data: FinalReportJSON }) {
  const tv = data.travessia;
  if (!tv) return null;
  const waveColors = ['#C9A96E', '#8BA0C9', '#6AB56A'];
  return (
    <div className="section-alt">
      <div className="section-label">05 · Travessia</div>
      <div className="section-title">Plano de ativação e capacitação</div>
      <NotaDeLeitura text={tv.notaDeLeitura} />

      {tv.ondas && tv.ondas.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Ondas de implementação</div>
          {tv.ondas.map((w, i) => (
            <div key={i} style={{ background: '#fff', border: `2px solid ${waveColors[i] || '#C9A96E'}`, borderRadius: '10px', padding: '18px 22px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: waveColors[i] || '#C9A96E' }}>{w.onda}</div>
                <div style={{ fontSize: '12px', color: '#9990A0', fontWeight: 600 }}>{w.timeline}</div>
              </div>
              {w.touchpoints && w.touchpoints.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Touchpoints</div>
                  <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55 }}>{w.touchpoints.join(' · ')}</div>
                </div>
              )}
              {w.responsaveis && w.responsaveis.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Responsáveis</div>
                  <div style={{ fontSize: '12px', color: '#3D4054' }}>{w.responsaveis.join(' · ')}</div>
                </div>
              )}
              {w.criteriosConclusao && w.criteriosConclusao.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Critérios de conclusão</div>
                  {w.criteriosConclusao.map((c, j) => (
                    <div key={j} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.5, marginBottom: '3px' }}>✓ {c}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {tv.kpis && tv.kpis.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>KPIs</div>
            {tv.kpis.filter(k => k.indicador || k.meta).map((k, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C9A96E', marginBottom: '4px' }}>{k.periodo}</div>
                <div style={{ fontSize: '12px', color: '#1C1F2A', fontWeight: 600, marginBottom: '2px' }}>{k.indicador}</div>
                <div style={{ fontSize: '12px', color: '#3D4054' }}>{k.meta}</div>
              </div>
            ))}
          </div>
        )}
        {tv.riscos && tv.riscos.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Riscos e contingências</div>
            {tv.riscos.map((r, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="score-pill" style={{ background: r.nivel === 'alto' ? 'rgba(220,80,80,0.15)' : r.nivel === 'medio' ? 'rgba(201,169,110,0.15)' : 'rgba(80,180,100,0.15)', color: r.nivel === 'alto' ? '#c06060' : r.nivel === 'medio' ? '#8a6020' : '#4a9060' }}>{r.nivel}</span>
                  <div style={{ fontSize: '12px', color: '#1C1F2A', fontWeight: 600 }}>{r.risco}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.5, paddingLeft: '4px' }}>{r.contingencia}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tv.enablementKit && ((tv.enablementKit.faqs && tv.enablementKit.faqs.length > 0) || (tv.enablementKit.templates && tv.enablementKit.templates.length > 0) || (tv.enablementKit.trilhaAdocao && tv.enablementKit.trilhaAdocao.length > 0) || (tv.enablementKit.checklistQA && tv.enablementKit.checklistQA.length > 0)) && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Enablement kit</div>
          {tv.enablementKit.trilhaAdocao && tv.enablementKit.trilhaAdocao.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Trilha de adoção por área</div>
              {tv.enablementKit.trilhaAdocao.map((t, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '8px', padding: '14px 18px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A', marginBottom: '8px' }}>{t.area}</div>
                  {t.passos?.map((p, j) => (
                    <div key={j} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '3px' }}>{j + 1}. {p}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {tv.enablementKit.templates && tv.enablementKit.templates.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Templates</div>
              {tv.enablementKit.templates.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f0ede8', fontSize: '13px' }}>
                  <div style={{ fontWeight: 600, color: '#1C1F2A' }}>{t.nome}</div>
                  <div style={{ color: '#3D4054', lineHeight: 1.5 }}>{t.descricao}</div>
                </div>
              ))}
            </div>
          )}
          {tv.enablementKit.faqs && tv.enablementKit.faqs.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>FAQs</div>
              {tv.enablementKit.faqs.map((f, i) => (
                <div key={i} style={{ background: '#faf8f4', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A', marginBottom: '6px' }}>{f.pergunta}</div>
                  <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55 }}>{f.resposta}</div>
                </div>
              ))}
            </div>
          )}
          {tv.enablementKit.checklistQA && tv.enablementKit.checklistQA.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Checklist de QA</div>
              {tv.enablementKit.checklistQA.map((q, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '4px' }}>☐ {q}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {tv.trainingDesign && ((tv.trainingDesign.objetivosPorPublico && tv.trainingDesign.objetivosPorPublico.length > 0) || (tv.trainingDesign.agenda && tv.trainingDesign.agenda.length > 0)) && (
        <div>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Training design</div>
          {tv.trainingDesign.objetivosPorPublico && tv.trainingDesign.objetivosPorPublico.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Objetivos por público</div>
              {tv.trainingDesign.objetivosPorPublico.map((o, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '8px', padding: '12px 16px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A', marginBottom: '6px' }}>{o.publico}</div>
                  {o.objetivos?.map((obj, j) => (
                    <div key={j} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '3px' }}>→ {obj}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
          {tv.trainingDesign.agenda && tv.trainingDesign.agenda.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Agenda</div>
              {tv.trainingDesign.agenda.map((b, i) => (
                <div key={i} style={{ background: '#faf8f4', border: '1px solid #e8e4da', borderRadius: '8px', padding: '14px 18px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A' }}>{b.bloco}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span className="score-pill" style={{ background: 'rgba(201,169,110,0.15)', color: '#8a6020' }}>{b.duracao}</span>
                      <span className="score-pill" style={{ background: 'rgba(139,160,201,0.15)', color: '#6a7da8' }}>{b.formato}</span>
                    </div>
                  </div>
                  {b.detalhamento && <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.6 }}>{b.detalhamento}</div>}
                </div>
              ))}
            </div>
          )}
          {tv.trainingDesign.materiaisNecessarios && tv.trainingDesign.materiaisNecessarios.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Materiais necessários</div>
              <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.7 }}>{tv.trainingDesign.materiaisNecessarios.join(' · ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REGENERAÇÃO (condensado Fase 5) ──────────────────────────────────────────

function Regeneracao({ data }: { data: FinalReportJSON }) {
  const rg = data.regeneracao;
  if (!rg) return null;
  return (
    <div className="section">
      <div className="section-label">06 · Regeneração</div>
      <div className="section-title">Sistema de governança contínua</div>
      <NotaDeLeitura text={rg.notaDeLeitura} />

      {rg.scorecard && rg.scorecard.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Scorecard de coerência</div>
          {rg.scorecard.map((s, i) => {
            const pct = Math.max(0, Math.min(100, (s.score / Math.max(s.meta, 1)) * 100));
            const trendColor = s.tendencia === 'subindo' ? '#50a868' : s.tendencia === 'caindo' ? '#dc5050' : '#9990A0';
            const trendSymbol = s.tendencia === 'subindo' ? '↑' : s.tendencia === 'caindo' ? '↓' : '→';
            return (
              <div key={i} style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '8px', padding: '14px 18px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1C1F2A' }}>{s.dimensao}</div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#9990A0' }}>meta {s.meta}</span>
                    <span style={{ color: '#1C1F2A', fontWeight: 700 }}>{s.score}/10</span>
                    <span style={{ color: trendColor, fontWeight: 700 }}>{trendSymbol} {s.tendencia}</span>
                  </div>
                </div>
                <div style={{ height: '6px', background: '#f0ede8', borderRadius: '3px', overflow: 'hidden', marginBottom: s.acao ? '10px' : '0' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#C9A96E' }} />
                </div>
                {s.acao && <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55 }}>→ {s.acao}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {rg.cadencia && rg.cadencia.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Cadência</div>
            {rg.cadencia.filter(c => c.atividade || c.responsavel).map((c, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f0ede8' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C9A96E', marginBottom: '4px' }}>{c.frequencia}</div>
                <div style={{ fontSize: '12px', color: '#1C1F2A', marginBottom: '2px' }}>{c.atividade}</div>
                <div style={{ fontSize: '11px', color: '#9990A0' }}>{c.responsavel}</div>
              </div>
            ))}
          </div>
        )}
        {rg.criteriosAlerta && rg.criteriosAlerta.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Critérios de alerta</div>
            {rg.criteriosAlerta.map((c, i) => (
              <div key={i} style={{ padding: '8px 0', fontSize: '12px', color: '#3D4054', lineHeight: 1.55 }}>⚠ {c}</div>
            ))}
          </div>
        )}
      </div>

      {rg.gatilhosDeRevisao && (
        <div style={{ marginBottom: '24px', background: '#faf8f4', borderRadius: '10px', padding: '22px 26px', borderLeft: '4px solid #C9A96E' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>Gatilhos de revisão estratégica</div>
          <div style={{ fontSize: '13px', color: '#3D4054', lineHeight: 1.75 }}>
            {rg.gatilhosDeRevisao.split('\n\n').map((p, i) => <p key={i} style={{ marginBottom: '10px' }}>{p}</p>)}
          </div>
        </div>
      )}

      {rg.protocoloCompliance && (rg.protocoloCompliance.percentualConformidadeAlvo || (rg.protocoloCompliance.touchpointsAuditados && rg.protocoloCompliance.touchpointsAuditados.length > 0) || (rg.protocoloCompliance.backlogPrioritario && rg.protocoloCompliance.backlogPrioritario.length > 0)) && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Protocolo de compliance</div>
          <div style={{ background: '#fff', border: '1px solid #e8e4da', borderRadius: '10px', padding: '18px 22px' }}>
            {rg.protocoloCompliance.percentualConformidadeAlvo && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Meta de conformidade</div>
                <div style={{ fontSize: '14px', color: '#1C1F2A', fontWeight: 600 }}>{rg.protocoloCompliance.percentualConformidadeAlvo}</div>
              </div>
            )}
            {rg.protocoloCompliance.touchpointsAuditados && rg.protocoloCompliance.touchpointsAuditados.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Touchpoints auditados</div>
                <div style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.6 }}>{rg.protocoloCompliance.touchpointsAuditados.join(' · ')}</div>
              </div>
            )}
            {rg.protocoloCompliance.backlogPrioritario && rg.protocoloCompliance.backlogPrioritario.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Backlog prioritário</div>
                {rg.protocoloCompliance.backlogPrioritario.map((b, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '4px' }}>→ {b}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {rg.escopoRevisaoAnual && ((rg.escopoRevisaoAnual.kpisMarca && rg.escopoRevisaoAnual.kpisMarca.length > 0) || (rg.escopoRevisaoAnual.recomendacoes && rg.escopoRevisaoAnual.recomendacoes.length > 0)) && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#C9A96E', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>Escopo da revisão anual</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {rg.escopoRevisaoAnual.kpisMarca && rg.escopoRevisaoAnual.kpisMarca.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>KPIs de marca</div>
                {rg.escopoRevisaoAnual.kpisMarca.map((k, i) => (
                  <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
                    <div style={{ fontSize: '12px', color: '#1C1F2A', fontWeight: 600 }}>{k.indicador}</div>
                    <div style={{ fontSize: '12px', color: '#8a6020' }}>{k.meta}</div>
                  </div>
                ))}
              </div>
            )}
            {rg.escopoRevisaoAnual.recomendacoes && rg.escopoRevisaoAnual.recomendacoes.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: '#9990A0', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Recomendações</div>
                {rg.escopoRevisaoAnual.recomendacoes.map((r, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#3D4054', lineHeight: 1.55, marginBottom: '6px' }}>→ {r}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {rg.referenciaManual?.url && (
        <div style={{ background: '#1C1F2A', borderRadius: '8px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(201,169,110,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>Manual de marca</div>
            <div style={{ fontSize: '13px', color: '#fff' }}>Versão {rg.referenciaManual.version || '—'}</div>
          </div>
          <a href={rg.referenciaManual.url} target="_blank" rel="noopener noreferrer" style={{ color: '#C9A96E', fontSize: '12px', fontWeight: 700, textDecoration: 'none', border: '1px solid #C9A96E', padding: '6px 14px', borderRadius: '6px' }}>
            Abrir manual →
          </a>
        </div>
      )}
    </div>
  );
}

// ─── PRÓXIMOS PASSOS ──────────────────────────────────────────────────────────

function ProximosPassos({ data }: { data: FinalReportJSON }) {
  const steps = data.proximosPassos || [];
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
          <Abertura data={reportData} />
          <PontoDePartida data={reportData} />
          <Decifracao data={reportData} />
          <NovaMarca data={reportData} />
          <Travessia data={reportData} />
          <Regeneracao data={reportData} />
          <NarrativaSimbolica data={reportData} />
          <ProximosPassos data={reportData} />
          <ReportFooter project={project} />
        </div>
      </div>
    </div>
  );
}
