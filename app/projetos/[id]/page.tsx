'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  getProject,
  saveProject,
  approveStep,
  skipStep,
  reopenStep,
  getProjectContext,
  addIntel,
  STEP_DEFINITIONS,
  Project,
  WorkflowStep,
  TranscriptAnalysis,
  ClientDocument,
  ResearchAgendaItem,
  ResearchResult,
  InterviewScript,
  PHASE_NAMES,
} from '@/lib/store';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function StepBadge({ status }: { status: WorkflowStep['status'] }) {
  const map = {
    done: { label: 'Aprovado', cls: 'step-badge-done' },
    active: { label: 'Em andamento', cls: 'step-badge-active' },
    pending: { label: 'Aguardando', cls: 'step-badge-pending' },
    skipped: { label: 'Pulado', cls: 'step-badge-skipped' },
  };
  const { label, cls } = map[status];
  return <span className={`step-badge ${cls}`}>{label}</span>;
}

// ─── STEP: IMPORTAR SITE ─────────────────────────────────────────────────────

function StepImportSite({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [email, setEmail] = useState(project.emailContato || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(project.siteImport || null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  async function handleImport() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/site-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), empresa: project.nome }),
      });
      const data = await res.json();
      setResult(data);
      const updated = { ...project, emailContato: email.trim(), siteImport: data };
      saveProject(updated);
      onUpdate(updated);
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    const updated = approveStep(project, step.id);
    onUpdate(updated);
  }

  function handleSkip() {
    const updated = skipStep(project, step.id);
    onUpdate(updated);
  }

  return (
    <div className="step-body">
      {!isDone && (
        <>
          <div className="step-field">
            <label className="step-label">Email do contato / cliente</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@cliente.com.br"
                style={{ flex: 1 }}
              />
              <button className="btn-primary btn-small" onClick={handleImport} disabled={loading || !email.trim()}>
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          {result && (
            <div className="ai-output" style={{ marginTop: '12px' }}>
              {result.encontrado ? (
                <>
                  <p style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: '12px' }}>
                    ✓ Dados encontrados — {result.empresa || result.email}
                  </p>

                  {/* Identidade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {[
                      ['Empresa', result.empresa],
                      ['Setor', result.setor],
                      ['Fase atual', result.faseAtual],
                      ['Jornada completa', result.jornadaCompleta ? 'Sim' : 'Não'],
                      ['Score prontidão', result.scoreProntidao != null ? `${result.scoreProntidao}/100` : null],
                      ['Score fit AMUM', result.scoreMetodoFit != null ? `${result.scoreMetodoFit}/100` : null],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>{k}: </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{v as string}</span>
                      </div>
                    ))}
                  </div>

                  {/* Relatórios disponíveis */}
                  {(result.todosReports?.length ?? 0) > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        Relatórios no funil
                      </p>
                      {(result.todosReports ?? []).map((r: { type: string; status: string; deliveredAt?: string }) => (
                        <p key={r.type} style={{ fontSize: '12px', color: r.status === 'delivered' ? 'var(--text-secondary)' : 'var(--text-dim)', marginBottom: '3px' }}>
                          {r.status === 'delivered' ? '✓' : '○'} {r.type.replace(/_/g, ' ')}
                          {r.status === 'delivered' && r.deliveredAt
                            ? ` — entregue ${new Date(r.deliveredAt).toLocaleDateString('pt-BR')}`
                            : ` — ${r.status}`}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* brand_context acumulado */}
                  {result.brandContext && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        Brand context acumulado
                      </p>
                      {Object.entries(result.brandContext as Record<string, unknown>)
                        .filter(([, v]) => v && (typeof v === 'string' || Array.isArray(v)))
                        .slice(0, 8)
                        .map(([k, v]) => (
                          <p key={k} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{k}: </span>
                            {Array.isArray(v) ? (v as string[]).join(', ') : v as string}
                          </p>
                        ))}
                    </div>
                  )}

                  {/* commercial_score */}
                  {result.commercialScore && (
                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                        Score comercial
                      </p>
                      {[
                        ['Maturidade', result.commercialScore.maturity],
                        ['Capacidade de investimento', result.commercialScore.investment_capacity],
                        ['Prontidão', result.commercialScore.readiness != null ? `${result.commercialScore.readiness}/100` : null],
                        ['Fit método', result.commercialScore.method_fit != null ? `${result.commercialScore.method_fit}/100` : null],
                        ['Prioridade comercial', result.commercialScore.commercial_priority],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <p key={k as string} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{k}: </span>{v as string}
                        </p>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button className="btn-approve" onClick={handleApprove}>Aprovar e continuar</button>
                    <button className="btn-skip" onClick={handleSkip}>Pular esta etapa</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {result.mensagem || result.erro || 'Nenhum dado encontrado.'}
                  </p>
                  <button className="btn-skip" onClick={handleSkip}>Pular esta etapa</button>
                </>
              )}
            </div>
          )}

          {!result && (
            <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
              Pular — cliente não passou pelo diagnóstico do site
            </button>
          )}
        </>
      )}
      {isDone && (
        <p className="step-done-msg">
          {step.status === 'skipped'
            ? 'Etapa pulada — cliente sem diagnóstico no site.'
            : project.siteImport?.encontrado
            ? `Dados importados para ${project.emailContato}.`
            : 'Etapa aprovada.'}
        </p>
      )}
    </div>
  );
}

// ─── STEP: DOCUMENTOS ────────────────────────────────────────────────────────

function StepDocuments({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [filename, setFilename] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  async function handleAnalyze() {
    if (!content.trim()) return;
    const docId = `doc_${Date.now()}`;
    setLoading(docId);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectContext: getProjectContext(project),
          messages: [{
            role: 'user',
            content: `Analise este documento corporativo (${filename || 'documento'}) da empresa ${project.nome}.
Extraia: (1) como a empresa se apresenta, (2) linguagem usada, (3) arquétipos presentes, (4) tensões entre discurso e realidade, (5) oportunidades de reposicionamento.
Seja denso e preciso. 3-4 parágrafos.

DOCUMENTO:\n${content.slice(0, 3000)}`,
          }],
        }),
      });
      const data = await res.json();
      const newDoc: ClientDocument = {
        id: docId,
        filename: filename || 'documento',
        content: content.slice(0, 5000),
        analysis: data.text,
        createdAt: new Date().toISOString(),
      };
      const updated = { ...project, documents: [...project.documents, newDoc] };
      saveProject(updated);
      onUpdate(updated);
      setFilename('');
      setContent('');
      addIntel(project.id, {
        type: 'diagnostico',
        title: `Análise: ${newDoc.filename}`,
        content: data.text.slice(0, 300),
        source: 'Documentos',
      });
    } finally {
      setLoading(null);
    }
  }

  function handleApprove() {
    onUpdate(approveStep(project, step.id));
  }

  function handleSkip() {
    onUpdate(skipStep(project, step.id));
  }

  return (
    <div className="step-body">
      {!isDone && (
        <>
          <div className="step-field">
            <label className="step-label">Nome do documento</label>
            <input
              className="input"
              value={filename}
              onChange={e => setFilename(e.target.value)}
              placeholder="Apresentação institucional, Pitch, Portfólio..."
            />
          </div>
          <div className="step-field">
            <label className="step-label">Conteúdo (cole o texto do documento)</label>
            <textarea
              className="textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Cole aqui o conteúdo do documento..."
              rows={6}
            />
          </div>
          <button className="btn-primary btn-small" onClick={handleAnalyze} disabled={!content.trim() || !!loading}>
            {loading ? 'Analisando...' : 'Analisar com IA'}
          </button>

          {project.documents.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p className="step-label" style={{ marginBottom: '8px' }}>Documentos analisados ({project.documents.length})</p>
              {project.documents.map(doc => (
                <div key={doc.id} className="card" style={{ marginBottom: '8px' }}>
                  <p style={{ fontWeight: 600, color: 'var(--gold)', marginBottom: '6px' }}>{doc.filename}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{doc.analysis?.slice(0, 200)}...</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar documentos e continuar</button>
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </div>
          )}

          {project.documents.length === 0 && (
            <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
              Pular — sem documentos disponíveis
            </button>
          )}
        </>
      )}
      {isDone && (
        <p className="step-done-msg">
          {step.status === 'skipped'
            ? 'Etapa pulada.'
            : `${project.documents.length} documento(s) analisado(s) e aprovado(s).`}
        </p>
      )}
    </div>
  );
}

// ─── STEP: PESQUISA SETORIAL ──────────────────────────────────────────────────

const DIMENSOES_LABELS: Record<number, string> = {
  1: 'Visão geral da marca', 2: 'Negócio e contexto', 3: 'Desafio central',
  4: 'Valores e propósito declarado', 5: 'Para quem a marca existe',
  6: 'Como a marca se apresenta hoje', 7: 'Intenção vs. percepção',
  8: 'Identidade visual e códigos', 9: 'Comunicação do setor',
  10: 'Concorrentes e referências', 11: 'Contradição do setor',
  12: 'Contradição específica da marca', 13: 'Pressões externas',
  14: 'O que não pode ser perdido', 15: 'O que precisa mudar',
  16: 'Recursos e obstáculos reais', 17: 'Horizonte de 12 meses',
  18: 'Síntese estratégica final',
};

function StepWebResearch({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<ResearchAgendaItem | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  function saveAgenda(agenda: ResearchAgendaItem[]) {
    const updated = { ...project, researchAgenda: agenda };
    saveProject(updated);
    onUpdate(updated);
  }

  async function generateAgenda() {
    setLoading('agenda');
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_agenda',
          projectContext: getProjectContext(project),
          customInstructions: customInstructions.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.agenda) saveAgenda(data.agenda);
    } finally {
      setLoading('');
    }
  }

  function addItem() {
    const newItem: ResearchAgendaItem = {
      id: `r${Date.now()}`,
      tema: 'Novo tema',
      objetivo: 'Descreva o que quer descobrir',
      queries: ['query 1'],
    };
    saveAgenda([...project.researchAgenda, newItem]);
    setEditingId(newItem.id);
    setEditBuf(newItem);
  }

  function startEdit(item: ResearchAgendaItem) {
    setEditingId(item.id);
    setEditBuf({ ...item });
  }

  function saveEdit() {
    if (!editBuf) return;
    saveAgenda(project.researchAgenda.map(i => i.id === editBuf.id ? editBuf : i));
    setEditingId(null);
    setEditBuf(null);
  }

  function removeItem(id: string) {
    saveAgenda(project.researchAgenda.filter(i => i.id !== id));
  }

  async function runResearch() {
    setLoading('research');
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_research',
          projectContext: getProjectContext(project),
          agenda: project.researchAgenda,
        }),
      });
      const data = await res.json();
      if (data.results) {
        const results: ResearchResult[] = data.results.map((r: ResearchResult) => ({
          ...r,
          createdAt: new Date().toISOString(),
        }));
        const updated = { ...project, researchResults: results };
        saveProject(updated);
        onUpdate(updated);
        results.forEach(r => {
          addIntel(project.id, {
            type: 'pesquisa',
            title: r.tema,
            content: r.sintese.slice(0, 300),
            source: 'Pesquisa setorial',
          });
        });
      }
    } finally {
      setLoading('');
    }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  const hasAgenda = project.researchAgenda.length > 0;
  const hasResults = project.researchResults.length > 0;

  return (
    <div className="step-body">

      {/* ── FASE 1: sem agenda ── */}
      {!hasAgenda && (
        <div>
          <p className="step-label" style={{ marginBottom: '8px' }}>Instruções adicionais (opcional)</p>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Ex: priorizar contradição entre discurso de inovação e percepção de commodity; incluir benchmarks internacionais do setor..."
            value={customInstructions}
            onChange={e => setCustomInstructions(e.target.value)}
            style={{ marginBottom: '12px' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            A agenda será gerada com base no framework de dossiê AMUM (18 dimensões), calibrada para este projeto.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={generateAgenda} disabled={loading === 'agenda'}>
              {loading === 'agenda' ? 'Gerando agenda...' : 'Gerar agenda de pesquisa'}
            </button>
            <button className="btn-skip" onClick={handleSkip}>Pular pesquisa</button>
          </div>
        </div>
      )}

      {/* ── FASE 2: agenda gerada, editável ── */}
      {hasAgenda && !hasResults && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="step-label">{project.researchAgenda.length} temas — edite, adicione ou remova antes de executar</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-small" onClick={addItem}>+ Adicionar tema</button>
              <button className="btn-small" style={{ opacity: 0.6 }} onClick={() => saveAgenda([])}>Refazer</button>
            </div>
          </div>

          {project.researchAgenda.map((item: ResearchAgendaItem) => (
            <div key={item.id} className="card" style={{ marginBottom: '8px', position: 'relative' }}>
              {editingId === item.id && editBuf ? (
                // ── Modo edição ──
                <div>
                  <input
                    className="input"
                    style={{ marginBottom: '8px', fontWeight: 600 }}
                    value={editBuf.tema}
                    onChange={e => setEditBuf({ ...editBuf, tema: e.target.value })}
                    placeholder="Nome do tema"
                  />
                  <textarea
                    className="textarea"
                    rows={2}
                    style={{ marginBottom: '8px', fontSize: '13px' }}
                    value={editBuf.objetivo}
                    onChange={e => setEditBuf({ ...editBuf, objetivo: e.target.value })}
                    placeholder="Objetivo — o que queremos descobrir"
                  />
                  <input
                    className="input"
                    style={{ fontSize: '12px' }}
                    value={editBuf.queries.join(' | ')}
                    onChange={e => setEditBuf({ ...editBuf, queries: e.target.value.split(' | ').map(q => q.trim()).filter(Boolean) })}
                    placeholder="queries separadas por ' | '"
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button className="btn-primary btn-small" onClick={saveEdit}>Salvar</button>
                    <button className="btn-small" onClick={() => { setEditingId(null); setEditBuf(null); }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                // ── Modo leitura ──
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--gold)' }}>
                      {(item as ResearchAgendaItem & { dimensao?: number }).dimensao
                        ? <span style={{ fontSize: '11px', opacity: 0.6, marginRight: '6px' }}>
                            D{(item as ResearchAgendaItem & { dimensao?: number }).dimensao}
                          </span>
                        : null}
                      {item.tema}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.objetivo}</p>
                    {item.queries.length > 0 && (
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        🔍 {item.queries.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '12px', flexShrink: 0 }}>
                    <button className="btn-small" style={{ fontSize: '11px' }} onClick={() => startEdit(item)}>Editar</button>
                    <button className="btn-small" style={{ fontSize: '11px', opacity: 0.5 }} onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn-primary" onClick={runResearch} disabled={loading === 'research' || project.researchAgenda.length === 0}>
              {loading === 'research' ? 'Executando pesquisa...' : `Executar pesquisa (${project.researchAgenda.length} temas)`}
            </button>
            <button className="btn-skip" onClick={handleSkip}>Pular</button>
          </div>
          {loading === 'research' && (
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
              Pesquisa com web search ativa — pode levar 1 a 2 minutos dependendo do número de temas.
            </p>
          )}
        </div>
      )}

      {/* ── FASE 3: resultados ── */}
      {hasResults && (
        <div>
          <p className="step-label" style={{ marginBottom: '12px' }}>
            {project.researchResults.length} temas pesquisados
          </p>

          {project.researchResults.map((r: ResearchResult & {
            fatos?: string[];
            tensoes?: string[];
            implicacoes?: string[];
          }) => (
            <div key={r.id} className="card" style={{ marginBottom: '10px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', alignItems: 'center' }}
                onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id)}
              >
                <p style={{ fontWeight: 600, color: 'var(--gold)' }}>{r.tema}</p>
                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                  {expandedResult === r.id ? '▲' : '▼'}
                </span>
              </div>

              {expandedResult !== r.id && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {r.sintese.slice(0, 200)}…
                </p>
              )}

              {expandedResult === r.id && (
                <div style={{ marginTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                    {r.sintese}
                  </p>
                  {r.tensoes && r.tensoes.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Tensões identificadas
                      </p>
                      {r.tensoes.map((t, i) => (
                        <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>— {t}</p>
                      ))}
                    </div>
                  )}
                  {r.implicacoes && r.implicacoes.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Implicações para o projeto
                      </p>
                      {r.implicacoes.map((imp, i) => (
                        <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {imp}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!isDone && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-approve" onClick={handleApprove}>Aprovar pesquisa e continuar</button>
              <button className="btn-skip" onClick={handleSkip}>Pular</button>
            </div>
          )}

          {isDone && (
            <p className="step-done-msg">
              {step.status === 'skipped' ? 'Etapa pulada.' : `${project.researchResults.length} temas aprovados.`}
            </p>
          )}
        </div>
      )}

      {isDone && !hasResults && (
        <p className="step-done-msg">Etapa pulada.</p>
      )}
    </div>
  );
}

// ─── STEP: ROTEIROS ───────────────────────────────────────────────────────────

function StepScripts({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  async function generateScripts() {
    setLoading(true);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_scripts', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.scripts) {
        const updated = { ...project, interviewScripts: data.scripts };
        saveProject(updated);
        onUpdate(updated);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    onUpdate(approveStep(project, step.id));
  }

  function handleSkip() {
    onUpdate(skipStep(project, step.id));
  }

  return (
    <div className="step-body">
      {!isDone && (
        <>
          {project.interviewScripts.length === 0 && (
            <>
              <button className="btn-primary" onClick={generateScripts} disabled={loading}>
                {loading ? 'Gerando roteiros...' : 'Gerar roteiros de entrevista'}
              </button>
              <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
                Pular roteiros
              </button>
            </>
          )}

          {project.interviewScripts.length > 0 && (
            <>
              {project.interviewScripts.map((script: InterviewScript) => (
                <div key={script.id} className="card" style={{ marginBottom: '8px' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === script.id ? null : script.id)}
                  >
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--gold)' }}>{script.publico}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{script.duracao}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{expanded === script.id ? '▲' : '▼'}</span>
                  </div>
                  {expanded === script.id && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      {script.blocos?.map((bloco, bi) => (
                        <div key={bi} style={{ marginBottom: '12px' }}>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            {bloco.titulo}
                          </p>
                          <ol style={{ paddingLeft: '16px' }}>
                            {bloco.perguntas?.map((q, qi) => (
                              <li key={qi} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {q}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar roteiros e continuar</button>
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </>
          )}
        </>
      )}
      {isDone && (
        <p className="step-done-msg">
          {step.status === 'skipped'
            ? 'Etapa pulada.'
            : `${project.interviewScripts.length} roteiro(s) aprovado(s).`}
        </p>
      )}
    </div>
  );
}

// ─── STEP: TRANSCRIÇÕES ───────────────────────────────────────────────────────

function StepTranscripts({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [filename, setFilename] = useState('');
  const [publico, setPublico] = useState('');
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  async function handleProcess() {
    if (!raw.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: raw,
          filename: filename || 'transcrição',
          publico: publico || 'não especificado',
          projectContext: getProjectContext(project),
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        const t: TranscriptAnalysis = {
          id: `t_${Date.now()}`,
          filename: filename || 'transcrição',
          publico: publico || 'não especificado',
          raw: raw.slice(0, 8000),
          ...data.analysis,
          createdAt: new Date().toISOString(),
        };
        const updated = { ...project, transcripts: [...project.transcripts, t] };
        saveProject(updated);
        onUpdate(updated);
        addIntel(project.id, {
          type: 'transcricao',
          title: `Transcrição: ${t.publico}`,
          content: t.synthesis.slice(0, 300),
          source: t.filename,
        });
        setFilename('');
        setPublico('');
        setRaw('');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    onUpdate(approveStep(project, step.id));
  }

  function handleSkip() {
    onUpdate(skipStep(project, step.id));
  }

  return (
    <div className="step-body">
      {!isDone && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="step-field">
              <label className="step-label">Nome do arquivo</label>
              <input
                className="input"
                value={filename}
                onChange={e => setFilename(e.target.value)}
                placeholder="entrevista-socias-01.txt"
              />
            </div>
            <div className="step-field">
              <label className="step-label">Público entrevistado</label>
              <input
                className="input"
                value={publico}
                onChange={e => setPublico(e.target.value)}
                placeholder="Sócias, Gerente de Conta..."
              />
            </div>
          </div>
          <div className="step-field">
            <label className="step-label">Transcrição (cole o texto)</label>
            <textarea
              className="textarea"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="Cole aqui a transcrição da entrevista..."
              rows={7}
            />
          </div>
          <button className="btn-primary btn-small" onClick={handleProcess} disabled={!raw.trim() || loading}>
            {loading ? 'Processando...' : 'Processar transcrição'}
          </button>

          {project.transcripts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p className="step-label" style={{ marginBottom: '8px' }}>
                Transcrições processadas ({project.transcripts.length})
              </p>
              {project.transcripts.map(t => (
                <div key={t.id} className="card" style={{ marginBottom: '8px' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', alignItems: 'center' }}
                    onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  >
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--gold)' }}>{t.publico}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.filename}</p>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{expanded === t.id ? '▲' : '▼'}</span>
                  </div>
                  {expanded === t.id && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{t.synthesis}</p>
                      {t.keyQuotes.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '4px' }}>Citações-chave</p>
                          {t.keyQuotes.slice(0, 3).map((q, i) => (
                            <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', borderLeft: '2px solid var(--gold)', paddingLeft: '8px', marginBottom: '4px' }}>
                              "{q.citacao}"
                            </p>
                          ))}
                        </div>
                      )}
                      {t.archetypes.length > 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          <strong>Arquétipos:</strong> {t.archetypes.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar transcrições e continuar</button>
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </div>
          )}

          {project.transcripts.length === 0 && (
            <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
              Pular — entrevistas ainda não realizadas
            </button>
          )}
        </>
      )}
      {isDone && (
        <p className="step-done-msg">
          {step.status === 'skipped'
            ? 'Etapa pulada.'
            : `${project.transcripts.length} transcrição(ões) aprovada(s).`}
        </p>
      )}
    </div>
  );
}

// ─── STEP: DEEP ANALYSIS ─────────────────────────────────────────────────────

function StepDeepAnalysis({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const isDone = step.status === 'done' || step.status === 'skipped';
  const analysis = project.deepAnalysis;

  async function runAnalysis() {
    setLoading(true);
    const updated1 = { ...project, deepAnalysis: { ...project.deepAnalysis, status: 'running' as const } };
    onUpdate(updated1);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deep_analysis', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.arquetipo) {
        const updated2 = {
          ...project,
          deepAnalysis: { ...data, status: 'done' as const, createdAt: new Date().toISOString() },
        };
        saveProject(updated2);
        onUpdate(updated2);
        addIntel(project.id, {
          type: 'analise',
          title: 'Análise de Decifração',
          content: `Arquétipo: ${data.arquetipo} | Tensão: ${data.tensaoCentral} | Território: ${data.territorioRecomendado}`,
          source: 'Decifração',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    onUpdate(approveStep(project, step.id));
  }

  function handleSkip() {
    onUpdate(skipStep(project, step.id));
  }

  return (
    <div className="step-body">
      {!isDone && (
        <>
          {analysis.status === 'not_started' && (
            <>
              <button className="btn-primary" onClick={runAnalysis} disabled={loading}>
                Executar análise de Decifração
              </button>
              <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
                Pular análise
              </button>
            </>
          )}
          {analysis.status === 'running' && (
            <p style={{ color: 'var(--text-muted)' }}>Processando análise estratégica completa...</p>
          )}
          {analysis.status === 'done' && (
            <>
              <div className="ai-output">
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>ARQUÉTIPO</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{analysis.arquetipo}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>TENSÃO CENTRAL</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{analysis.tensaoCentral}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>TERRITÓRIO RECOMENDADO</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{analysis.territorioRecomendado}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>NARRATIVA-NÚCLEO</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{analysis.narrativaNucleo}</p>
                  </div>
                  {analysis.gapsPrincipais.length > 0 && (
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600 }}>GAPS PRINCIPAIS</p>
                      <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                        {analysis.gapsPrincipais.map((g, i) => (
                          <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar análise e continuar</button>
                <button className="btn-skip" onClick={handleSkip}>Refazer depois</button>
              </div>
            </>
          )}
        </>
      )}
      {isDone && (
        <p className="step-done-msg">
          {step.status === 'skipped' ? 'Etapa pulada.' : 'Análise de Decifração aprovada.'}
        </p>
      )}
    </div>
  );
}

// ─── STEP: CHAT ───────────────────────────────────────────────────────────────

function StepChat({
  project,
  step,
}: {
  project: Project;
  step: WorkflowStep;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isActive = step.status === 'active';
  const label = step.id === 'chat_decifração'
    ? 'Decifração'
    : step.id === 'chat_reconstrucao'
    ? 'Reconstrução'
    : 'Travessia';

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          projectContext: getProjectContext(project),
          messages: newMessages,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.text }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="step-body">
      {!isActive && step.status === 'pending' && (
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Disponível após a conclusão das etapas anteriores.
        </p>
      )}
      {(isActive || step.status === 'done') && (
        <>
          {messages.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
              Espaço de co-criação para entregáveis de {label}. Comece pedindo um entregável específico ou faça uma pergunta estratégica.
            </p>
          )}
          {messages.length > 0 && (
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                  <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{m.content}</p>
                </div>
              ))}
              {loading && (
                <div className="chat-msg chat-msg-ai">
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Processando...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <textarea
              className="textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Faça uma pergunta ou solicite um entregável..."
              rows={3}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{ alignSelf: 'flex-end' }}
            >
              Enviar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const p = getProject(id);
    if (!p) { router.push('/projetos'); return; }
    setProject(p);
  }, [id, router]);

  function handleUpdate(p: Project) {
    setProject({ ...p });
  }

  function toggleExpand(stepId: string) {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId); else next.add(stepId);
      return next;
    });
  }

  function handleReopen(stepId: string) {
    if (!project) return;
    const updated = reopenStep(project, stepId);
    setProject({ ...updated });
    setExpandedSteps(prev => new Set(prev).add(stepId));
  }

  if (!project) {
    return (
      <div className="layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="spinner" style={{ width: '24px', height: '24px' }} />
        </main>
      </div>
    );
  }

  const activeStep = project.workflowSteps.find(s => s.status === 'active');
  const doneSteps = project.workflowSteps.filter(s => s.status === 'done' || s.status === 'skipped').length;
  const progress = Math.round((doneSteps / project.workflowSteps.length) * 100);

  // Agrupar steps por fase
  const fases = [1, 2, 3, 4];

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="project-header">
          <div>
            <p className="project-setor">{project.setor}</p>
            <h1 className="project-title">{project.nome}</h1>
            <p className="project-meta">{project.escopo} · {project.investimento}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Progresso geral
            </p>
            <div className="progress-bar-container" style={{ width: '180px' }}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--gold)', marginTop: '4px' }}>
              {doneSteps}/{project.workflowSteps.length} etapas
            </p>
          </div>
        </div>

        {/* Workflow */}
        <div className="workflow-container">
          {fases.map(fase => {
            const faseSteps = project.workflowSteps.filter(s => s.fase === fase);
            const faseDef = faseSteps.map(s => STEP_DEFINITIONS.find(d => d.id === s.id)!).filter(Boolean);
            if (faseSteps.length === 0) return null;

            return (
              <div key={fase} className="workflow-fase">
                <div className="workflow-fase-header">
                  <span className="workflow-fase-num">{fase}</span>
                  <h2 className="workflow-fase-title">{PHASE_NAMES[fase]}</h2>
                </div>

                {faseSteps.map((step, si) => {
                  const def = faseDef[si];
                  if (!def) return null;
                  const isActive = step.status === 'active';
                  const isExpanded = isActive || expandedSteps.has(step.id);
                  const isClickable = !isActive; // headers de steps não-ativos são clicáveis

                  return (
                    <div
                      key={step.id}
                      className={`workflow-step ${isExpanded ? 'workflow-step-active' : ''} ${step.status === 'done' ? 'workflow-step-done' : ''} ${step.status === 'skipped' ? 'workflow-step-skipped' : ''}`}
                    >
                      {/* Step header */}
                      <div
                        className="step-header"
                        onClick={isClickable ? () => toggleExpand(step.id) : undefined}
                        style={isClickable ? { cursor: 'pointer' } : undefined}
                      >
                        <div className="step-icon-wrap">
                          {step.status === 'done' && <span className="step-icon-done">✓</span>}
                          {step.status === 'skipped' && <span className="step-icon-skipped">—</span>}
                          {step.status === 'pending' && <span className="step-icon-pending" />}
                          {step.status === 'active' && <span className="step-icon-active" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p className="step-title">{def.label}</p>
                          {isExpanded && (
                            <p className="step-narrativa">{def.narrativa}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <StepBadge status={step.status} />
                          {(step.status === 'done' || step.status === 'skipped') && (
                            <button
                              className="btn-small"
                              style={{ fontSize: '11px', opacity: 0.7 }}
                              onClick={(e) => { e.stopPropagation(); handleReopen(step.id); }}
                            >
                              Reabrir
                            </button>
                          )}
                          {isClickable && (
                            <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Step content */}
                      {isExpanded && (
                        <>
                          {step.type === 'import' && (
                            <StepImportSite project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'documents' && (
                            <StepDocuments project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'web_research' && (
                            <StepWebResearch project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'scripts' && (
                            <StepScripts project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'transcripts' && (
                            <StepTranscripts project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'deep_analysis' && (
                            <StepDeepAnalysis project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'chat' && (
                            <StepChat project={project} step={step} />
                          )}
                        </>
                      )}

                      {/* Steps done/skipped: mostrar resumo */}
                      {(step.status === 'done' || step.status === 'skipped') && step.type === 'chat' && !isExpanded && (
                        <div style={{ padding: '0 16px 16px', color: 'var(--text-dim)', fontSize: '13px' }}>
                          Chat disponível — clique no cabeçalho para expandir.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {!activeStep && doneSteps === project.workflowSteps.length && (
          <div className="card" style={{ textAlign: 'center', padding: '32px', marginTop: '24px' }}>
            <p style={{ color: 'var(--gold)', fontSize: '16px', fontWeight: 600 }}>
              Jornada concluída
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '13px' }}>
              Todas as etapas foram aprovadas. Os entregáveis estão disponíveis nos chats de co-criação.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
