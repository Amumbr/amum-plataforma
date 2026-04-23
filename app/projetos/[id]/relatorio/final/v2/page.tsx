'use client';

/**
 * AMUM — Relatório Final v2 (Fase 1.2 · geração em duas camadas).
 *
 * Fluxo por parte da tríade:
 *   Camada 1 · final_txt_<parte>        → markdown editorial denso
 *   Camada 2 · final_json_<parte>(txt)  → JSON estruturado alinhado ao v4
 *   Persiste   { txt, json, createdAt }   no cache
 *
 * As três partes rodam em paralelo (Promise.all), cada uma encadeia suas
 * duas camadas internamente. `final_meta` dispara em paralelo também.
 *
 * O contexto é cacheado no backend (ephemeral 5min) via cachedUserMessage:
 * a primeira chamada paga input cheio, as 6 seguintes entram em cache hit.
 *
 * Compat: cache com shape anterior (qualquer um) é detectado via ausência
 * dos campos `secao_*_*` e regenerado automaticamente.
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
.skeleton-part .actions-row {
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;
}
.skeleton-part .regen-part {
  font: 500 11px/1 var(--sans);
  letter-spacing: 0.05em;
  padding: 6px 12px; border-radius: 3px;
  background: transparent; color: var(--ink-60);
  border: 1px solid var(--ink-30); cursor: pointer;
}
.skeleton-part .regen-part:hover { background: var(--cream-2); }
.skeleton-part .regen-part:disabled { opacity: 0.4; cursor: default; }
.skeleton-part .regen-part.ghost { color: var(--ink-70); border-color: var(--ink-20); }

.skeleton-part .section-list {
  margin-top: 12px;
  font: 400 12px/1.6 var(--sans);
  color: var(--ink-60);
}
.skeleton-part .section-list .sec {
  display: block; padding: 4px 0;
  border-top: 1px solid var(--ink-10);
}
.skeleton-part .section-list .sec strong { color: var(--ink); }

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

type TriadePart = 'ondeEstamos' | 'paraOndeVamos' | 'comoVamosChegarLa';
type PartKey = TriadePart | 'meta';

const TRIADE_PARTS: TriadePart[] = ['ondeEstamos', 'paraOndeVamos', 'comoVamosChegarLa'];
const ALL_PARTS: PartKey[] = [...TRIADE_PARTS, 'meta'];

/**
 * Status granular por parte. 'generating_txt' e 'generating_json' refletem
 * as duas camadas da Fase 1.2.
 */
type PartStatus = 'idle' | 'generating_txt' | 'generating_json' | 'ready' | 'error';

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function RelatorioFinalV2Page() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Dados tipados por parte
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

  // ─── Setter tipado por parte ──────────────────────────────────────────────
  const applyTriadePart = useCallback((part: TriadePart, json: Record<string, unknown>) => {
    if (part === 'ondeEstamos') setOndeEstamos(json as unknown as OndeEstamosJSON);
    else if (part === 'paraOndeVamos') setParaOndeVamos(json as unknown as ParaOndeVamosJSON);
    else if (part === 'comoVamosChegarLa') setComoVamosChegarLa(json as unknown as ComoVamosChegarLaJSON);
  }, []);

  // ─── Geração de uma parte da tríade — duas camadas encadeadas ─────────────
  // Se `skipTxt` é true e existe TXT cacheado, pula a Camada 1 e só refaz JSON.
  const generateTriadePart = useCallback(async (
    proj: Project,
    part: TriadePart,
    opts?: { skipTxt?: boolean; existingTxt?: string },
  ): Promise<boolean> => {
    setErrors(e => ({ ...e, [part]: '' }));
    try {
      const ctx = getProjectContext(proj);

      // ─── Camada 1: TXT editorial ──────────────────────────────────────────
      let txt = opts?.existingTxt ?? '';
      if (!opts?.skipTxt || !txt) {
        setStatus(s => ({ ...s, [part]: 'generating_txt' }));
        const resTxt = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: `final_txt_${part}`,
            projectContext: ctx,
          }),
        });
        const resultTxt = await resTxt.json() as { text?: string; error?: string };
        if (resultTxt.error) throw new Error(`TXT: ${resultTxt.error}`);
        if (!resultTxt.text) throw new Error('TXT: resposta vazia');
        txt = resultTxt.text;

        // Persiste TXT parcial imediatamente — protege contra perda se JSON falhar
        const currentA = getProject(proj.id) ?? proj;
        const updatedA: Project = {
          ...currentA,
          finalReportV2: {
            ...(currentA.finalReportV2 ?? {}),
            [part]: {
              txt,
              json: currentA.finalReportV2?.[part]?.json ?? {},
              createdAt: new Date().toISOString(),
            },
          },
        };
        saveProject(updatedA);
      }

      // ─── Camada 2: extração JSON a partir do TXT ──────────────────────────
      setStatus(s => ({ ...s, [part]: 'generating_json' }));
      const resJson = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: `final_json_${part}`,
          projectContext: ctx,
          sourceTxt: txt,
        }),
      });
      const resultJson = await resJson.json() as { json?: Record<string, unknown>; error?: string };
      if (resultJson.error) throw new Error(`JSON: ${resultJson.error}`);
      if (!resultJson.json) throw new Error('JSON: resposta vazia');

      // UI
      applyTriadePart(part, resultJson.json);
      setStatus(s => ({ ...s, [part]: 'ready' }));

      // Persiste resultado completo { txt, json, createdAt }
      const currentB = getProject(proj.id) ?? proj;
      const updatedB: Project = {
        ...currentB,
        finalReportV2: {
          ...(currentB.finalReportV2 ?? {}),
          [part]: {
            txt,
            json: resultJson.json,
            createdAt: new Date().toISOString(),
          },
        },
      };
      saveProject(updatedB);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors(e => ({ ...e, [part]: msg }));
      setStatus(s => ({ ...s, [part]: 'error' }));
      return false;
    }
  }, [applyTriadePart]);

  // ─── Geração da meta (independente) ────────────────────────────────────────
  const generateMeta = useCallback(async (proj: Project): Promise<boolean> => {
    setStatus(s => ({ ...s, meta: 'generating_json' }));
    setErrors(e => ({ ...e, meta: '' }));
    try {
      const ctx = getProjectContext(proj);
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'final_meta', projectContext: ctx }),
      });
      const result = await res.json() as { json?: Record<string, unknown>; error?: string };
      if (result.error) throw new Error(result.error);
      if (!result.json) throw new Error('Resposta vazia');

      setMeta(result.json as unknown as FinalReportMetaJSON);
      setStatus(s => ({ ...s, meta: 'ready' }));

      const current = getProject(proj.id) ?? proj;
      const updated: Project = {
        ...current,
        finalReportV2: {
          ...(current.finalReportV2 ?? {}),
          meta: result.json,
          createdAt: new Date().toISOString(),
        },
      };
      saveProject(updated);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors(e => ({ ...e, meta: msg }));
      setStatus(s => ({ ...s, meta: 'error' }));
      return false;
    }
  }, []);

  // ─── Gera todas as partes em paralelo ─────────────────────────────────────
  const generateAll = useCallback(async (proj: Project) => {
    await Promise.all([
      ...TRIADE_PARTS.map(part => generateTriadePart(proj, part)),
      generateMeta(proj),
    ]);
    const latest = getProject(proj.id);
    if (latest) setProject(latest);
  }, [generateTriadePart, generateMeta]);

  // ─── Detecta shape antigo ou ausente ──────────────────────────────────────
  // Um cache é considerado válido se TRIADE tem .json E esse .json tem chaves
  // "secao_*" (shape da Fase 1.2). Qualquer outra forma → regera.
  function isStaleOrEmpty(cache: Project['finalReportV2']): boolean {
    if (!cache) return true;
    const hasSomeTriade = TRIADE_PARTS.some((part) => {
      const p = cache[part];
      if (!p || typeof p !== 'object' || !('json' in p) || !p.json) return false;
      const keys = Object.keys(p.json);
      return keys.some(k => k.startsWith('secao_'));
    });
    return !hasSomeTriade && !cache.meta;
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const proj = getProject(params.id);
    if (!proj) { setNotFound(true); return; }
    setProject(proj);

    const cache = proj.finalReportV2;
    if (isStaleOrEmpty(cache)) {
      void generateAll(proj);
      return;
    }

    // Hidrata partes presentes; gera as ausentes
    const missingTriade: TriadePart[] = [];
    for (const part of TRIADE_PARTS) {
      const p = cache?.[part];
      const hasNewShape = p && p.json && Object.keys(p.json).some(k => k.startsWith('secao_'));
      if (hasNewShape) {
        applyTriadePart(part, p.json);
        setStatus(s => ({ ...s, [part]: 'ready' }));
      } else {
        missingTriade.push(part);
      }
    }
    const needsMeta = !cache?.meta;
    if (cache?.meta) {
      setMeta(cache.meta as unknown as FinalReportMetaJSON);
      setStatus(s => ({ ...s, meta: 'ready' }));
    }

    const jobs: Promise<boolean>[] = [
      ...missingTriade.map(p => generateTriadePart(proj, p)),
    ];
    if (needsMeta) jobs.push(generateMeta(proj));

    if (jobs.length > 0) {
      void Promise.all(jobs).then(() => {
        const latest = getProject(proj.id);
        if (latest) setProject(latest);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // ─── Handlers de regeneração ──────────────────────────────────────────────
  async function handleRegenerateAll() {
    if (!project) return;
    const cleared: Project = { ...project, finalReportV2: undefined };
    saveProject(cleared);
    setProject(cleared);
    setOndeEstamos(null);
    setParaOndeVamos(null);
    setComoVamosChegarLa(null);
    setMeta(null);
    setStatus({ ondeEstamos: 'idle', paraOndeVamos: 'idle', comoVamosChegarLa: 'idle', meta: 'idle' });
    setErrors({ ondeEstamos: '', paraOndeVamos: '', comoVamosChegarLa: '', meta: '' });
    await generateAll(cleared);
  }

  async function handleRegeneratePartFull(part: TriadePart) {
    if (!project) return;
    // Limpa TXT + JSON da parte — regenera desde a Camada 1
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
    await generateTriadePart(updated, part);
    const latest = getProject(updated.id);
    if (latest) setProject(latest);
  }

  async function handleRegenerateJsonOnly(part: TriadePart) {
    if (!project) return;
    const existingTxt = project.finalReportV2?.[part]?.txt;
    if (!existingTxt) {
      // Sem TXT em cache → cai para regeneração full
      await handleRegeneratePartFull(part);
      return;
    }
    await generateTriadePart(project, part, { skipTxt: true, existingTxt });
    const latest = getProject(project.id);
    if (latest) setProject(latest);
  }

  async function handleRegenerateMeta() {
    if (!project) return;
    const updated: Project = {
      ...project,
      finalReportV2: {
        ...(project.finalReportV2 ?? {}),
        meta: undefined,
      },
    };
    saveProject(updated);
    setProject(updated);
    setMeta(null);
    await generateMeta(updated);
    const latest = getProject(updated.id);
    if (latest) setProject(latest);
  }

  // ─── Contadores de seção (preview) ────────────────────────────────────────
  function countSecoesRendered(json: Record<string, unknown> | null, expected: number): number {
    if (!json) return 0;
    return Object.keys(json).filter(k => k.startsWith('secao_')).slice(0, expected).length;
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

  const anyGenerating = ALL_PARTS.some(p => status[p] === 'generating_txt' || status[p] === 'generating_json');
  const readyCount = ALL_PARTS.filter(p => status[p] === 'ready').length;

  const ondeJson = ondeEstamos as unknown as Record<string, unknown> | null;
  const paraJson = paraOndeVamos as unknown as Record<string, unknown> | null;
  const comoJson = comoVamosChegarLa as unknown as Record<string, unknown> | null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_SHARED_CSS + SKELETON_CSS }} />
      <div className="report">
        {/* Capa */}
        <div className="skeleton-cover">
          <div className="badge">
            {project.nome} · Relatório Final · v2 · {readyCount}/{ALL_PARTS.length} prontas
          </div>
          <h1>{meta?.capa.tagline || project.nome}</h1>
          <div className="subtitle">
            {meta?.capa.subtitulo
              || (status.meta === 'generating_json' ? 'Gerando síntese editorial…'
                : status.meta === 'error' ? 'Erro ao gerar capa'
                : 'Uma jornada de reposicionamento estratégico')}
          </div>
        </div>

        {/* Parte 1 — Onde estamos (4 seções esperadas) */}
        <div className="skeleton-part diag">
          <div className="part-label">Parte 1 · 4 seções</div>
          <h2>Onde estamos</h2>
          <div className="part-desc">
            Diagnóstico: retrato da marca, plataforma Ser·Fazer·Comunicar, touchpoints
            críticos e tensões estruturais. Renderização visual completa na Fase 4.
          </div>
          <PartStatusBlock
            status={status.ondeEstamos}
            error={errors.ondeEstamos}
            onRegenerateFull={() => handleRegeneratePartFull('ondeEstamos')}
            onRegenerateJsonOnly={() => handleRegenerateJsonOnly('ondeEstamos')}
            hasTxtCached={!!project.finalReportV2?.ondeEstamos?.txt}
            readyMessage={
              ondeEstamos?.secao_1_4?.perguntaFundadora
                ? `Pergunta fundadora: ${ondeEstamos.secao_1_4.perguntaFundadora.slice(0, 120)}${ondeEstamos.secao_1_4.perguntaFundadora.length > 120 ? '…' : ''}`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 4.'
            }
            sectionsPreview={
              ondeEstamos ? [
                ondeEstamos.secao_1_1?.title,
                ondeEstamos.secao_1_2?.title,
                ondeEstamos.secao_1_3?.title,
                ondeEstamos.secao_1_4?.title,
              ].filter(Boolean) : []
            }
            expectedSections={4}
            renderedCount={countSecoesRendered(ondeJson, 4)}
          />
        </div>

        {/* Parte 2 — Para onde vamos (6 seções esperadas) */}
        <div className="skeleton-part dest">
          <div className="part-label">Parte 2 · 6 seções</div>
          <h2>Para onde vamos</h2>
          <div className="part-desc">
            Afirmação de posicionamento, arquétipo, território, plataforma, arquitetura +
            ODS, código linguístico + manifesto, direção visual. Renderização completa na
            Fase 5.
          </div>
          <PartStatusBlock
            status={status.paraOndeVamos}
            error={errors.paraOndeVamos}
            onRegenerateFull={() => handleRegeneratePartFull('paraOndeVamos')}
            onRegenerateJsonOnly={() => handleRegenerateJsonOnly('paraOndeVamos')}
            hasTxtCached={!!project.finalReportV2?.paraOndeVamos?.txt}
            readyMessage={
              paraOndeVamos?.secao_2_1?.afirmacaoDestaque?.linhaA
                ? `Afirmação: "${paraOndeVamos.secao_2_1.afirmacaoDestaque.linhaA}"${paraOndeVamos.secao_2_1.afirmacaoDestaque.linhaB ? ` / "${paraOndeVamos.secao_2_1.afirmacaoDestaque.linhaB}"` : ''}`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 5.'
            }
            sectionsPreview={
              paraOndeVamos ? [
                paraOndeVamos.secao_2_1?.title,
                paraOndeVamos.secao_2_2?.title,
                paraOndeVamos.secao_2_3?.title,
                paraOndeVamos.secao_2_4?.title,
                paraOndeVamos.secao_2_5?.title,
                paraOndeVamos.secao_2_6?.title,
              ].filter(Boolean) : []
            }
            expectedSections={6}
            renderedCount={countSecoesRendered(paraJson, 6)}
          />
        </div>

        {/* Parte 3 — Como vamos chegar lá (6 seções esperadas) */}
        <div className="skeleton-part exec">
          <div className="part-label">Parte 3 · 6 seções</div>
          <h2>Como vamos chegar lá</h2>
          <div className="part-desc">
            Ondas, KPIs, riscos, enablement kit, desenho do treinamento e governança
            contínua. Renderização completa na Fase 6.
          </div>
          <PartStatusBlock
            status={status.comoVamosChegarLa}
            error={errors.comoVamosChegarLa}
            onRegenerateFull={() => handleRegeneratePartFull('comoVamosChegarLa')}
            onRegenerateJsonOnly={() => handleRegenerateJsonOnly('comoVamosChegarLa')}
            hasTxtCached={!!project.finalReportV2?.comoVamosChegarLa?.txt}
            readyMessage={
              comoVamosChegarLa?.secao_3_1?.ondas && comoVamosChegarLa.secao_3_1.ondas.length > 0
                ? `${comoVamosChegarLa.secao_3_1.ondas.length} onda(s) de implementação.`
                : 'Shape carregado. Componentes visuais serão aplicados na Fase 6.'
            }
            sectionsPreview={
              comoVamosChegarLa ? [
                comoVamosChegarLa.secao_3_1?.title,
                comoVamosChegarLa.secao_3_2?.title,
                comoVamosChegarLa.secao_3_3?.title,
                comoVamosChegarLa.secao_3_4?.title,
                comoVamosChegarLa.secao_3_5?.title,
                comoVamosChegarLa.secao_3_6?.title,
              ].filter(Boolean) : []
            }
            expectedSections={6}
            renderedCount={countSecoesRendered(comoJson, 6)}
          />
        </div>

        {/* Meta (capa + abertura + próximos passos) */}
        <div className="skeleton-part" style={{ borderLeftColor: '#999' }}>
          <div className="part-label">Meta</div>
          <h2>Capa · Abertura · Próximos passos</h2>
          <div className="part-desc">
            Síntese transversal. A abertura (150-200 palavras) registra o princípio do
            processo; os próximos passos sintetizam ações priorizadas.
          </div>
          <MetaStatusBlock
            status={status.meta}
            error={errors.meta}
            meta={meta}
            onRegenerate={handleRegenerateMeta}
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

// ─── Bloco de status por parte da tríade ────────────────────────────────────

function PartStatusBlock({
  status,
  error,
  onRegenerateFull,
  onRegenerateJsonOnly,
  hasTxtCached,
  readyMessage,
  sectionsPreview,
  expectedSections,
  renderedCount,
}: {
  status: PartStatus;
  error: string;
  onRegenerateFull: () => void;
  onRegenerateJsonOnly: () => void;
  hasTxtCached: boolean;
  readyMessage: string;
  sectionsPreview: (string | undefined)[];
  expectedSections: number;
  renderedCount: number;
}) {
  if (status === 'generating_txt') {
    return <div className="status generating">⏳ Camada 1 · gerando texto editorial…</div>;
  }
  if (status === 'generating_json') {
    return <div className="status generating">⏳ Camada 2 · extraindo estrutura do texto…</div>;
  }
  if (status === 'error') {
    return (
      <div>
        <div className="status error">✗ {error}</div>
        <div className="actions-row">
          <button className="regen-part" onClick={onRegenerateFull}>
            Regenerar desde o texto
          </button>
          {hasTxtCached && (
            <button className="regen-part ghost" onClick={onRegenerateJsonOnly}>
              Só extrair JSON (texto em cache)
            </button>
          )}
        </div>
      </div>
    );
  }
  if (status === 'ready') {
    const filled = sectionsPreview.filter((t): t is string => typeof t === 'string' && t.length > 0);
    return (
      <div>
        <div className="status">✓ {readyMessage}</div>
        <div className="section-list">
          <span className="sec"><strong>{renderedCount}/{expectedSections} seções</strong> extraídas</span>
          {filled.map((title, i) => (
            <span key={i} className="sec">{i + 1}. {title}</span>
          ))}
        </div>
        <div className="actions-row">
          <button className="regen-part" onClick={onRegenerateFull}>
            Regenerar desde o texto
          </button>
          <button className="regen-part ghost" onClick={onRegenerateJsonOnly}>
            Só re-extrair JSON
          </button>
        </div>
      </div>
    );
  }
  return <div className="status">Aguardando geração…</div>;
}

// ─── Bloco de status da meta ────────────────────────────────────────────────

function MetaStatusBlock({
  status,
  error,
  meta,
  onRegenerate,
}: {
  status: PartStatus;
  error: string;
  meta: FinalReportMetaJSON | null;
  onRegenerate: () => void;
}) {
  if (status === 'generating_json') {
    return <div className="status generating">⏳ Gerando síntese editorial…</div>;
  }
  if (status === 'error') {
    return (
      <div>
        <div className="status error">✗ {error}</div>
        <div className="actions-row">
          <button className="regen-part" onClick={onRegenerate}>Tentar de novo</button>
        </div>
      </div>
    );
  }
  if (status === 'ready' && meta) {
    return (
      <div>
        <div className="status">
          ✓ Capa + abertura ({meta.abertura ? `${meta.abertura.split(/\s+/).length} palavras` : 'sem conteúdo'}) + {meta.proximosPassos?.length ?? 0} próximos passos
        </div>
        <div className="actions-row">
          <button className="regen-part" onClick={onRegenerate}>Regenerar</button>
        </div>
      </div>
    );
  }
  return <div className="status">Aguardando geração…</div>;
}
