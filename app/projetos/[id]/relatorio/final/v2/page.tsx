'use client';

/**
 * AMUM — Relatorio Final v2 (shape triade).
 *
 * Rota paralela a /relatorio/final durante a migração. Consome a action
 * `final_report_data_v2` que retorna o shape triade (via mapper server-side
 * nesta fase; direto no prompt a partir da Fase 6). Renderiza placeholder
 * navegável nas Fases 1-5 e componentes reais a partir da Fase 4.
 *
 * IMPORTANTE: esta página injeta apenas `REPORT_SHARED_CSS` nesta fase. O
 * CSS específico do relatório final é adicionado na Fase 3 como
 * `REPORT_FINAL_V2_CSS`. O wrapper `<div className="report">` é obrigatório
 * (contrato da fundação compartilhada).
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getProject, getProjectContext, saveProject, Project } from '@/lib/store';
import { REPORT_SHARED_CSS } from '@/lib/report-styles';
import type { FinalReportV2JSON } from '@/lib/final-report-v2-types';

// ─── CSS DE TRANSIÇÃO DA FASE 1 ──────────────────────────────────────────────
// Minimal. Substituído pelo CSS completo do v4 (~2000 linhas) na Fase 3.
const SKELETON_CSS = `
.report { min-height: 100vh; background: var(--cream); padding: 80px 0; }

.skeleton-cover {
  max-width: 720px; margin: 0 auto 80px; padding: 80px 40px;
  text-align: center;
}
.skeleton-cover .badge {
  font: 500 11px/1 var(--sans);
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink-60); margin-bottom: 32px;
}
.skeleton-cover h1 {
  font: 700 48px/1.1 var(--serif);
  color: var(--ink); margin-bottom: 16px;
}
.skeleton-cover .subtitle {
  font: 400 18px/1.5 var(--serif);
  color: var(--ink-60); font-style: normal;
}

.skeleton-part {
  max-width: 820px; margin: 0 auto 48px;
  padding: 48px 40px;
  background: #FFF; border-radius: 6px;
  border-left: 4px solid var(--accent-color, var(--ink-30));
}
.skeleton-part.diag { --accent-color: #8BA0C9; }
.skeleton-part.dest { --accent-color: #C9A96E; }
.skeleton-part.exec { --accent-color: #6AB56A; }

.skeleton-part .part-label {
  font: 500 11px/1 var(--sans);
  letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--accent-color); margin-bottom: 16px;
}
.skeleton-part h2 {
  font: 600 28px/1.2 var(--serif);
  color: var(--ink); margin-bottom: 12px;
}
.skeleton-part .part-desc {
  font: 400 15px/1.6 var(--serif);
  color: var(--ink-70); margin-bottom: 24px;
}
.skeleton-part .status {
  font: 400 13px/1.5 var(--sans);
  color: var(--ink-60);
  padding: 12px 16px;
  background: var(--cream-2);
  border-radius: 4px;
  display: inline-block;
}

.skeleton-actions {
  max-width: 820px; margin: 0 auto;
  padding: 0 40px; text-align: center;
}
.skeleton-actions button {
  font: 500 13px/1 var(--sans);
  padding: 10px 20px; border-radius: 4px;
  background: var(--ink); color: #FFF; border: none; cursor: pointer;
  letter-spacing: 0.05em;
}
.skeleton-actions button:hover { opacity: 0.85; }
.skeleton-actions button:disabled { opacity: 0.4; cursor: default; }
.skeleton-actions .secondary {
  background: transparent; color: var(--ink-70); margin-left: 12px;
}

.loading-screen, .error-screen, .notfound-screen {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--cream);
}
.loading-screen .box, .error-screen .box, .notfound-screen .box {
  text-align: center; max-width: 420px; padding: 32px;
}
.loading-screen .icon { font-size: 32px; margin-bottom: 16px; }
.loading-screen .step {
  font: 400 14px/1.5 var(--sans); color: var(--ink-70);
}
.error-screen .box { color: #A84040; }
.notfound-screen .icon { font-size: 40px; margin-bottom: 16px; }
`;

export default function RelatorioFinalV2Page() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [reportData, setReportData] = useState<FinalReportV2JSON | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState('Iniciando…');
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const proj = getProject(params.id);
    if (!proj) { setNotFound(true); return; }
    setProject(proj);
    const cached = proj.finalReportV2;
    if (cached?.json) {
      setReportData(cached.json as unknown as FinalReportV2JSON);
    } else {
      void generateReport(proj);
    }
     
  }, [params.id]);

  async function generateReport(proj: Project) {
    setGenerating(true);
    setError('');
    setGenStep('Lendo contexto completo do projeto…');
    try {
      const ctx = getProjectContext(proj);
      setGenStep('Gerando relatório no shape tríade (pode levar ~30s)…');
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'final_report_data_v2', projectContext: ctx }),
      });
      const result = await res.json() as { json?: FinalReportV2JSON; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.json) throw new Error('Nenhum dado retornado');

      setGenStep('Salvando relatório…');
      const updated: Project = {
        ...proj,
        finalReportV2: {
          json: result.json as unknown as Record<string, unknown>,
          createdAt: new Date().toISOString(),
        },
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
    const updated: Project = { ...project, finalReportV2: undefined };
    saveProject(updated);
    setProject(updated);
    setReportData(null);
    await generateReport(updated);
  }

  // ─── Render states ──────────────────────────────────────────────────────

  if (notFound) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
        <div className="notfound-screen">
          <div className="box">
            <div className="icon">📄</div>
            <p>Projeto não encontrado</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
        <div className="error-screen">
          <div className="box">
            <p>Erro ao gerar o relatório: {error}</p>
            <div style={{ marginTop: 16 }}>
              <button onClick={handleRegenerate}>Tentar de novo</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (generating || !reportData || !project) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
        <div className="loading-screen">
          <div className="box">
            <div className="icon">⏳</div>
            <div className="step">{genStep}</div>
          </div>
        </div>
      </>
    );
  }

  // ─── Render do skeleton (Fase 1) ────────────────────────────────────────

  const { capa, ondeEstamos, paraOndeVamos, comoVamosChegarLa } = reportData;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
      <div className="report">
        {/* Capa */}
        <div className="skeleton-cover">
          <div className="badge">{project.nome} · Relatório Final · v2</div>
          <h1>{capa.tagline || project.nome}</h1>
          <div className="subtitle">{capa.subtitulo || 'Uma jornada de reposicionamento estratégico'}</div>
        </div>

        {/* Parte 1 — Onde estamos */}
        <div className="skeleton-part diag">
          <div className="part-label">Parte 1</div>
          <h2>Onde estamos</h2>
          <div className="part-desc">
            Retrato da marca, plataforma Ser·Fazer·Comunicar, diagnóstico de touchpoints
            e tensões estruturais. Conteúdo disponível no shape tríade — renderização
            completa na Fase 4 da migração.
          </div>
          <div className="status">
            {ondeEstamos.perguntaFundadora
              ? `Pergunta fundadora já extraída: ${ondeEstamos.perguntaFundadora.slice(0, 120)}${ondeEstamos.perguntaFundadora.length > 120 ? '…' : ''}`
              : 'Shape carregado. Componentes visuais serão aplicados na Fase 4.'}
          </div>
        </div>

        {/* Parte 2 — Para onde vamos */}
        <div className="skeleton-part dest">
          <div className="part-label">Parte 2</div>
          <h2>Para onde vamos</h2>
          <div className="part-desc">
            Afirmação de posicionamento, arquétipo, território escolhido, plataforma de
            marca, código linguístico, manifesto e direção visual. Renderização completa
            na Fase 5.
          </div>
          <div className="status">
            {paraOndeVamos.afirmacaoDestaque.linhaA
              ? `Afirmação: "${paraOndeVamos.afirmacaoDestaque.linhaA}"${paraOndeVamos.afirmacaoDestaque.linhaB ? ` / "${paraOndeVamos.afirmacaoDestaque.linhaB}"` : ''}`
              : 'Shape carregado. Componentes visuais serão aplicados na Fase 5.'}
          </div>
        </div>

        {/* Parte 3 — Como vamos chegar lá */}
        <div className="skeleton-part exec">
          <div className="part-label">Parte 3</div>
          <h2>Como vamos chegar lá</h2>
          <div className="part-desc">
            Ondas de implementação, KPIs, riscos, enablement kit, desenho do treinamento
            e governança contínua. Renderização completa na Fase 6.
          </div>
          <div className="status">
            {comoVamosChegarLa.ondas.length > 0
              ? `${comoVamosChegarLa.ondas.length} ondas de implementação planejadas.`
              : 'Shape carregado. Componentes visuais serão aplicados na Fase 6.'}
          </div>
        </div>

        {/* Ações */}
        <div className="skeleton-actions">
          <button onClick={handleRegenerate} disabled={generating}>
            Regenerar
          </button>
          <button
            className="secondary"
            onClick={() => window.open(`/projetos/${params.id}/relatorio/final`, '_self')}
          >
            Abrir versão atual (legada)
          </button>
        </div>
      </div>
    </>
  );
}
