'use client';

/**
 * AMUM — Relatório Final v2 (shape tríade, geração particionada).
 *
 * A partir da Fase 1.1 da migração, esta rota dispara QUATRO actions backend
 * em paralelo (final_ondeEstamos, final_paraOndeVamos, final_comoVamosChegarLa,
 * final_meta) via Promise.all. Cada parte é persistida no cache assim que
 * retorna — regenerar é seletivo (por parte ou global).
 *
 * O contexto do projeto é cacheado no backend (ephemeral, 5min) via
 * cachedUserMessage: a primeira chamada paga input cheio, as três seguintes
 * pagam ~10% da porção cacheada.
 *
 * Compat retroativa: se o cache `project.finalReportV2` estiver no shape
 * anterior ({ json, createdAt }) ou ausente, o orquestrador regera tudo.
 *
 * IMPORTANTE: esta página injeta apenas `REPORT_SHARED_CSS` nesta fase. O
 * CSS específico do relatório final é adicionado na Fase 3 como
 * `REPORT_FINAL_V2_CSS`. O wrapper `<div className="report">` é obrigatório
 * (contrato da fundação compartilhada).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getProject, getProjectContext, saveProject, Project } from '@/lib/store';
import { REPORT_SHARED_CSS } from '@/lib/report-styles';
import type {
  OndeEstamosJSON,
  ParaOndeVamosJSON,
  ComoVamosChegarLaJSON,
  FinalReportMetaJSON,
} from '@/lib/final-report-v2-types';

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
  position: relative;
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
.skeleton-part .status.generating {
  background: #F4F0E6;
  color: var(--ink-70);
}
.skeleton-part .status.error {
  background: #F9E8E6;
  color: #A84040;
}
.skeleton-part .regen-part {
  font: 500 11px/1 var(--sans);
  letter-spacing: 0.05em;
  padding: 6px 12px; border-radius: 3px;
  background: transparent; color: var(--ink-60);
  border: 1px solid var(--ink-30); cursor: pointer;
  margin-left: 12px;
}
.skeleton-part .regen-part:hover { background: var(--cream-2); }
.skeleton-part .regen-part:disabled { opacity: 0.4; cursor: default; }

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

.loading-screen, .notfound-screen {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--cream);
}
.loading-screen .box, .notfound-screen .box {
  text-align: center; max-width: 420px; padding: 32px;
}
.loading-screen .icon { font-size: 32px; margin-bottom: 16px; }
.loading-screen .step {
  font: 400 14px/1.5 var(--sans); color: var(--ink-70);
}
.notfound-screen .icon { font-size: 40px; margin-bottom: 16px; }
`;

// ─── TIPAGEM LOCAL ───────────────────────────────────────────────────────────

type PartKey = 'ondeEstamos' | 'paraOndeVamos' | 'comoVamosChegarLa' | 'meta';

const ACTION_BY_PART: Record<PartKey, string> = {
  ondeEstamos: 'final_ondeEstamos',
  paraOndeVamos: 'final_paraOndeVamos',
  comoVamosChegarLa: 'final_comoVamosChegarLa',
  meta: 'final_meta',
};

const ALL_PARTS: PartKey[] = ['ondeEstamos', 'paraOndeVamos', 'comoVamosChegarLa', 'meta'];

type PartStatus = 'idle' | 'generating' | 'ready' | 'error';

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function RelatorioFinalV2Page() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Estado por parte (cast dos Record<string, unknown> do cache em sub-types)
  const [ondeEstamos, setOndeEstamos] = useState<OndeEstamosJSON | null>(null);
  const [paraOndeVamos, setParaOndeVamos] = useState<ParaOndeVamosJSON | null>(null);
  const [comoVamosChegarLa, setComoVamosChegarLa] = useState<ComoVamosChegarLaJSON | null>(null);
  const [meta, setMeta] = useState<FinalReportMetaJSON | null>(null);

  const [status, setStatus] = useState<Record<PartKey, PartStatus>>({
    ondeEstamos: 'idle',
    paraOndeVamos: 'idle',
    comoVamosChegarLa: 'idle',
    meta: 'idle',
  });
  const [errors, setErrors] = useState<Record<PartKey, string>>({
    ondeEstamos: '',
    paraOndeVamos: '',
    comoVamosChegarLa: '',
    meta: '',
  });

  // ─── Setter por parte (mantém tipagem forte) ──────────────────────────────
  const applyPart = useCallback((part: PartKey, json: Record<string, unknown>) => {
    if (part === 'ondeEstamos') setOndeEstamos(json as unknown as OndeEstamosJSON);
    else if (part === 'paraOndeVamos') setParaOndeVamos(json as unknown as ParaOndeVamosJSON);
    else if (part === 'comoVamosChegarLa') setComoVamosChegarLa(json as unknown as ComoVamosChegarLaJSON);
    else if (part === 'meta') setMeta(json as unknown as FinalReportMetaJSON);
  }, []);

  // ─── Gera uma parte específica; persiste no cache ao retornar ─────────────
  const generatePart = useCallback(async (proj: Project, part: PartKey): Promise<boolean> => {
    setStatus(s => ({ ...s, [part]: 'generating' }));
    setErrors(e => ({ ...e, [part]: '' }));
    try {
      const ctx = getProjectContext(proj);
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: ACTION_BY_PART[part], projectContext: ctx }),
      });
      const result = await res.json() as { json?: Record<string, unknown>; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.json) throw new Error('Nenhum dado retornado');

      // Atualiza UI
      applyPart(part, result.json);
      setStatus(s => ({ ...s, [part]: 'ready' }));

      // Persiste parcial no cache (evita perder progresso se reload)
      // Lê o projeto atual do store para não sobrescrever partes concorrentes.
      const current = getProject(proj.id) ?? proj;
      const updated: Project = {
        ...current,
        finalReportV2: {
          ...(current.finalReportV2 ?? {}),
          [part]: result.json,
          createdAt: new Date().toISOString(),
        },
      };
      saveProject(updated);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors(e => ({ ...e, [part]: msg }));
      setStatus(s => ({ ...s, [part]: 'error' }));
      return false;
    }
  }, [applyPart]);

  // ─── Gera todas as partes em paralelo ─────────────────────────────────────
  const generateAll = useCallback(async (proj: Project) => {
    await Promise.all(ALL_PARTS.map(part => generatePart(proj, part)));
    // Re-sincroniza project com o que foi salvo por cada generatePart
    const latest = getProject(proj.id);
    if (latest) setProject(latest);
  }, [generatePart]);

  // ─── Detecta shape antigo ou ausente ──────────────────────────────────────
  // Retorna true se o cache está no shape antigo ({ json, createdAt }) ou
  // simplesmente não tem nenhuma das partes novas.
  function isStaleOrEmpty(cache: Project['finalReportV2']): boolean {
    if (!cache) return true;
    const hasAnyPart = !!(cache.ondeEstamos || cache.paraOndeVamos || cache.comoVamosChegarLa || cache.meta);
    return !hasAnyPart;
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const proj = getProject(params.id);
    if (!proj) { setNotFound(true); return; }
    setProject(proj);

    const cache = proj.finalReportV2;
    if (isStaleOrEmpty(cache)) {
      // Sem partes válidas — gera tudo
      void generateAll(proj);
      return;
    }

    // Hidrata partes presentes do cache; gera as ausentes
    const missing: PartKey[] = [];
    if (cache?.ondeEstamos) applyPart('ondeEstamos', cache.ondeEstamos);
    else missing.push('ondeEstamos');
    setStatus(s => ({ ...s, ondeEstamos: cache?.ondeEstamos ? 'ready' : s.ondeEstamos }));

    if (cache?.paraOndeVamos) applyPart('paraOndeVamos', cache.paraOndeVamos);
    else missing.push('paraOndeVamos');
    setStatus(s => ({ ...s, paraOndeVamos: cache?.paraOndeVamos ? 'ready' : s.paraOndeVamos }));

    if (cache?.comoVamosChegarLa) applyPart('comoVamosChegarLa', cache.comoVamosChegarLa);
    else missing.push('comoVamosChegarLa');
    setStatus(s => ({ ...s, comoVamosChegarLa: cache?.comoVamosChegarLa ? 'ready' : s.comoVamosChegarLa }));

    if (cache?.meta) applyPart('meta', cache.meta);
    else missing.push('meta');
    setStatus(s => ({ ...s, meta: cache?.meta ? 'ready' : s.meta }));

    if (missing.length > 0) {
      void Promise.all(missing.map(p => generatePart(proj, p))).then(() => {
        const latest = getProject(proj.id);
        if (latest) setProject(latest);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ─── Handlers de regeneração ──────────────────────────────────────────────
  async function handleRegenerateAll() {
    if (!project) return;
    // Limpa cache de todas as partes
    const cleared: Project = { ...project, finalReportV2: undefined };
    saveProject(cleared);
    setProject(cleared);
    setOndeEstamos(null);
    setParaOndeVamos(null);
    setComoVamosChegarLa(null);
    setMeta(null);
    setStatus({
      ondeEstamos: 'idle',
      paraOndeVamos: 'idle',
      comoVamosChegarLa: 'idle',
      meta: 'idle',
    });
    setErrors({ ondeEstamos: '', paraOndeVamos: '', comoVamosChegarLa: '', meta: '' });
    await generateAll(cleared);
  }

  async function handleRegeneratePart(part: PartKey) {
    if (!project) return;
    // Limpa apenas a parte especifica no cache
    const updated: Project = {
      ...project,
      finalReportV2: {
        ...(project.finalReportV2 ?? {}),
        [part]: undefined,
      },
    };
    saveProject(updated);
    setProject(updated);
    if (part === 'ondeEstamos') setOndeEstamos(null);
    else if (part === 'paraOndeVamos') setParaOndeVamos(null);
    else if (part === 'comoVamosChegarLa') setComoVamosChegarLa(null);
    else if (part === 'meta') setMeta(null);

    await generatePart(updated, part);
    const latest = getProject(updated.id);
    if (latest) setProject(latest);
  }

  // ─── Render states ───────────────────────────────────────────────────────

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

  if (!project) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
        <div className="loading-screen">
          <div className="box">
            <div className="icon">⏳</div>
            <div className="step">Carregando projeto…</div>
          </div>
        </div>
      </>
    );
  }

  const anyGenerating = ALL_PARTS.some(p => status[p] === 'generating');
  const readyCount = ALL_PARTS.filter(p => status[p] === 'ready').length;

  // ─── Render do skeleton com progresso por parte ──────────────────────────

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
      <div className="report">
        {/* Capa */}
        <div className="skeleton-cover">
          <div className="badge">
            {project.nome} · Relatório Final · v2 · {readyCount}/{ALL_PARTS.length} partes prontas
          </div>
          <h1>{meta?.capa.tagline || project.nome}</h1>
          <div className="subtitle">
            {meta?.capa.subtitulo
              || (status.meta === 'generating' ? 'Gerando síntese editorial…'
                : status.meta === 'error' ? 'Erro ao gerar capa'
                : 'Uma jornada de reposicionamento estratégico')}
          </div>
        </div>

        {/* Parte 1 — Onde estamos */}
        <div className="skeleton-part diag">
          <div className="part-label">Parte 1</div>
          <h2>Onde estamos</h2>
          <div className="part-desc">
            Retrato da marca, plataforma Ser·Fazer·Comunicar, diagnóstico de touchpoints
            e tensões estruturais. Renderização completa na Fase 4 da migração.
          </div>
          <PartStatusBlock
            status={status.ondeEstamos}
            error={errors.ondeEstamos}
            onRegenerate={() => handleRegeneratePart('ondeEstamos')}
            readyMessage={
              ondeEstamos?.perguntaFundadora
                ? `Pergunta fundadora: ${ondeEstamos.perguntaFundadora.slice(0, 120)}${ondeEstamos.perguntaFundadora.length > 120 ? '…' : ''}`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 4.'
            }
          />
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
          <PartStatusBlock
            status={status.paraOndeVamos}
            error={errors.paraOndeVamos}
            onRegenerate={() => handleRegeneratePart('paraOndeVamos')}
            readyMessage={
              paraOndeVamos?.afirmacaoDestaque.linhaA
                ? `Afirmação: "${paraOndeVamos.afirmacaoDestaque.linhaA}"${paraOndeVamos.afirmacaoDestaque.linhaB ? ` / "${paraOndeVamos.afirmacaoDestaque.linhaB}"` : ''}`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 5.'
            }
          />
        </div>

        {/* Parte 3 — Como vamos chegar lá */}
        <div className="skeleton-part exec">
          <div className="part-label">Parte 3</div>
          <h2>Como vamos chegar lá</h2>
          <div className="part-desc">
            Ondas de implementação, KPIs, riscos, enablement kit, desenho do treinamento
            e governança contínua. Renderização completa na Fase 6.
          </div>
          <PartStatusBlock
            status={status.comoVamosChegarLa}
            error={errors.comoVamosChegarLa}
            onRegenerate={() => handleRegeneratePart('comoVamosChegarLa')}
            readyMessage={
              comoVamosChegarLa && comoVamosChegarLa.ondas.length > 0
                ? `${comoVamosChegarLa.ondas.length} onda(s) de implementação planejadas.`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 6.'
            }
          />
        </div>

        {/* Ações globais */}
        <div className="skeleton-actions">
          <button onClick={handleRegenerateAll} disabled={anyGenerating}>
            Regenerar tudo
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

// ─── Bloco de status por parte ──────────────────────────────────────────────

function PartStatusBlock({
  status,
  error,
  onRegenerate,
  readyMessage,
}: {
  status: PartStatus;
  error: string;
  onRegenerate: () => void;
  readyMessage: string;
}) {
  if (status === 'generating') {
    return (
      <div className="status generating">
        ⏳ Gerando esta parte…
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div>
        <div className="status error">
          ✗ Erro: {error}
        </div>
        <button className="regen-part" onClick={onRegenerate}>
          Tentar de novo
        </button>
      </div>
    );
  }
  if (status === 'ready') {
    return (
      <div>
        <div className="status">✓ {readyMessage}</div>
        <button className="regen-part" onClick={onRegenerate}>
          Regenerar parte
        </button>
      </div>
    );
  }
  return <div className="status">Aguardando geração…</div>;
}
