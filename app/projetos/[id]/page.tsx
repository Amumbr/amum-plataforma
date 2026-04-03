'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  getProject,
  saveProject,
  approveStep,
  skipStep,
  reopenStep,
  updateStepData,
  getProjectContext,
  addIntel,
  STEP_DEFINITIONS,
  Project,
  WorkflowStep,
  TranscriptAnalysis,
  ClientDocument,
  DocumentSynthesis,
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

// ─── SHARED: HELPERS ──────────────────────────────────────────────────────────

function getStepNotes(step: WorkflowStep): string {
  return (step.data?.userNotes as string) || '';
}

function getStepChatHistory(step: WorkflowStep): { role: 'user' | 'assistant'; content: string }[] {
  return (step.data?.chatHistory as { role: 'user' | 'assistant'; content: string }[]) || [];
}

function buildStepContext(step: WorkflowStep, project: Project): string {
  const notes = getStepNotes(step);
  const parts: string[] = [];

  if (notes) parts.push(`NOTAS DO ESTRATEGISTA:\n${notes}`);

  switch (step.type) {
    case 'documents':
      if (project.documentSynthesis?.apresentacao) {
        const s = project.documentSynthesis;
        parts.push(
          `SÍNTESE DOCUMENTAL:\n${s.apresentacao}\nArquétipo dominante: ${s.arquetipo?.dominante}\nTensões: ${s.tensoes?.join('; ')}\nPotência latente: ${s.potencia_latente}`
        );
      }
      break;
    case 'web_research':
      if (project.researchResults.length > 0) {
        parts.push(`PESQUISA SETORIAL (${project.researchResults.length} dimensões aprovadas):`);
        project.researchResults.slice(0, 6).forEach(r => {
          parts.push(`[${r.tema}]: ${r.sintese.slice(0, 350)}`);
        });
      }
      break;
    case 'scripts':
      if (project.interviewScripts.length > 0) {
        parts.push(`ROTEIROS GERADOS para: ${project.interviewScripts.map(s => s.publico).join(', ')}`);
        project.interviewScripts.forEach(s => {
          parts.push(`Roteiro ${s.publico} (${s.duracao}) — ${s.blocos?.length || 0} blocos`);
        });
      }
      break;
    case 'transcripts':
      if (project.transcripts.length > 0) {
        parts.push(`TRANSCRIÇÕES PROCESSADAS (${project.transcripts.length}):`);
        project.transcripts.forEach(t => {
          parts.push(`[${t.publico || t.filename}]: ${t.synthesis.slice(0, 350)}`);
          if (t.keyQuotes.length > 0) parts.push(`  Citação: "${t.keyQuotes[0].citacao}"`);
        });
      }
      break;
    case 'deep_analysis':
      if (project.deepAnalysis.status === 'done') {
        const da = project.deepAnalysis;
        parts.push(
          `ANÁLISE DE DECIFRAÇÃO:\nArquétipo: ${da.arquetipo}\nTensão central: ${da.tensaoCentral}\nTerritório recomendado: ${da.territorioRecomendado}\nNarrativa-núcleo: ${da.narrativaNucleo}\nGaps: ${da.gapsPrincipais.join('; ')}`
        );
      }
      break;
    case 'chat':
      parts.push(`Espaço de co-criação — fase ${step.id}. Contexto completo disponível.`);
      break;
  }

  return parts.join('\n\n');
}

// ─── SHARED: STEP NOTES ───────────────────────────────────────────────────────

function StepNotes({
  step,
  project,
  onUpdate,
  placeholder = 'Adicione contexto, correções de rota, hipóteses ou qualquer informação relevante para esta etapa...',
}: {
  step: WorkflowStep;
  project: Project;
  onUpdate: (p: Project) => void;
  placeholder?: string;
}) {
  const [notes, setNotes] = useState(getStepNotes(step));
  const [dirty, setDirty] = useState(false);

  function handleSave() {
    const updated = updateStepData(project, step.id, { userNotes: notes });
    onUpdate(updated);
    setDirty(false);
  }

  return (
    <div className="step-notes-block">
      <p className="step-notes-label">
        <span>✏</span> Observações do estrategista
        {!dirty && notes && <span className="step-notes-saved"> — salvo</span>}
      </p>
      <textarea
        className="textarea step-notes-textarea"
        value={notes}
        onChange={e => { setNotes(e.target.value); setDirty(true); }}
        placeholder={placeholder}
        rows={3}
      />
      {dirty && (
        <button
          className="btn-small"
          style={{ marginTop: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          onClick={handleSave}
        >
          Salvar observações
        </button>
      )}
    </div>
  );
}

// ─── SHARED: STEP INLINE CHAT ─────────────────────────────────────────────────

function StepInlineChat({
  step,
  project,
  onUpdate,
  stepLabel,
}: {
  step: WorkflowStep;
  project: Project;
  onUpdate: (p: Project) => void;
  stepLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = React.useState(getStepChatHistory(step));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const stepCtx = buildStepContext(step, project);
    const fullContext = getProjectContext(project) + (stepCtx ? `\n\n${stepCtx}` : '');

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectContext: fullContext, messages: newMessages }),
      });
      const data = await res.json();
      const allMessages = [...newMessages, { role: 'assistant' as const, content: data.text }];
      setMessages(allMessages);
      const updated = updateStepData(project, step.id, { chatHistory: allMessages });
      onUpdate(updated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="step-inline-chat">
      <button className="step-chat-toggle" onClick={() => setOpen(!open)}>
        <span className="step-chat-toggle-label">
          <span className="step-chat-icon">💬</span>
          Chat com IA — {stepLabel}
        </span>
        <span className="step-chat-meta">
          {messages.length > 0 && <span className="step-chat-count">{messages.length} msg</span>}
          <span className="step-chat-chevron">{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div className="step-chat-body">
          {messages.length === 0 && (
            <p className="step-chat-empty">
              Faça perguntas sobre a análise, tensione hipóteses, peça alternativas ou corrija a direção — a IA tem o contexto completo desta etapa.
            </p>
          )}
          {messages.length > 0 && (
            <div className="chat-messages step-chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                  <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', margin: 0 }}>{m.content}</p>
                </div>
              ))}
              {loading && (
                <div className="chat-msg chat-msg-ai">
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Processando...</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          <div className="step-chat-input-row">
            <textarea
              className="textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Escreva aqui... (Enter envia, Shift+Enter nova linha)"
              rows={2}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              style={{ alignSelf: 'flex-end', padding: '8px 16px', minWidth: 'auto' }}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Contexto adicional sobre o cliente, histórico de relacionamento, percepções anteriores..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Importação do site" />
    </div>
  );
}

// ─── STEP: DOCUMENTOS ────────────────────────────────────────────────────────

// ─── FILE TYPE HELPERS ────────────────────────────────────────────────────────

function getFileIcon(fileType: string, filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf') || fileType === 'application/pdf') return '📄';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
  if (name.endsWith('.txt') || name.endsWith('.md')) return '📃';
  if (fileType.startsWith('image/')) return '🖼';
  return '📎';
}

function getFileTypeLabel(fileType: string, filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'Word';
  if (name.endsWith('.txt')) return 'TXT';
  if (name.endsWith('.md')) return 'Markdown';
  if (fileType.startsWith('image/')) return 'Imagem';
  return 'Arquivo';
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── STEP: DOCUMENTOS DA EMPRESA ─────────────────────────────────────────────

function StepDocuments({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<DocumentSynthesis | null>(
    project.documentSynthesis || null
  );
  const [synthError, setSynthError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  const ACCEPTED_TYPES = '.pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp';

  async function processFile(file: File) {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setUploading(prev => ({ ...prev, [docId]: true }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/documents', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      const newDoc: ClientDocument = {
        id: docId,
        filename: file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        content: data.extractedText || '',
        createdAt: new Date().toISOString(),
      };

      const updated = {
        ...project,
        documents: [...project.documents, newDoc],
      };
      saveProject(updated);
      onUpdate(updated);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    for (const file of arr) {
      await processFile(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleRemoveDoc(docId: string) {
    const updated = {
      ...project,
      documents: project.documents.filter(d => d.id !== docId),
      documentSynthesis: undefined,
    };
    saveProject(updated);
    onUpdate(updated);
    setSynthesis(null);
  }

  async function handleSynthesize() {
    if (project.documents.length === 0) return;
    setSynthesizing(true);
    setSynthError('');
    const notes = getStepNotes(step);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'synthesize',
          documents: project.documents.map(d => ({
            filename: d.filename,
            fileType: d.fileType,
            content: d.content,
          })),
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newSynthesis: DocumentSynthesis = {
        ...data.synthesis,
        createdAt: new Date().toISOString(),
      };
      setSynthesis(newSynthesis);

      const updated = { ...project, documentSynthesis: newSynthesis };
      saveProject(updated);
      onUpdate(updated);
    } catch (err) {
      setSynthError('Erro ao gerar síntese. Tente novamente.');
      console.error(err);
    } finally {
      setSynthesizing(false);
    }
  }

  function handleApprove() {
    if (synthesis) {
      addIntel(project.id, {
        type: 'analise',
        title: `Síntese documental — ${project.documents.length} doc(s)`,
        content: synthesis.apresentacao?.slice(0, 300) || '',
        source: 'Documentos',
      });
    }
    onUpdate(approveStep(project, step.id));
  }

  function handleSkip() {
    onUpdate(skipStep(project, step.id));
  }

  const isUploading = Object.keys(uploading).length > 0;

  return (
    <div className="step-body">
      {!isDone && (
        <>
          {/* ── Drop Zone ── */}
          <div
            className={`doc-dropzone${dragging ? ' doc-dropzone--active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            <div className="doc-dropzone-icon">⊕</div>
            <p className="doc-dropzone-label">
              {dragging ? 'Solte para fazer upload' : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="doc-dropzone-hint">
              PDF · Word · TXT · Imagens — múltiplos arquivos suportados
            </p>
            {isUploading && (
              <p className="doc-dropzone-hint" style={{ color: 'var(--gold)', marginTop: '8px' }}>
                Extraindo texto...
              </p>
            )}
          </div>

          {/* ── File List ── */}
          {project.documents.length > 0 && (
            <div className="doc-list">
              <p className="step-label" style={{ marginBottom: '10px' }}>
                {project.documents.length} documento{project.documents.length !== 1 ? 's' : ''} carregado{project.documents.length !== 1 ? 's' : ''}
              </p>
              {project.documents.map(doc => (
                <div key={doc.id} className="doc-item">
                  <span className="doc-item-icon">{getFileIcon(doc.fileType, doc.filename)}</span>
                  <div className="doc-item-info">
                    <span className="doc-item-name">{doc.filename}</span>
                    <span className="doc-item-meta">
                      {getFileTypeLabel(doc.fileType, doc.filename)}
                      {doc.size ? ` · ${formatBytes(doc.size)}` : ''}
                      {doc.content ? ` · ${doc.content.length.toLocaleString()} chars extraídos` : ''}
                    </span>
                  </div>
                  <button
                    className="doc-item-remove"
                    onClick={() => handleRemoveDoc(doc.id)}
                    title="Remover documento"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* ── Synthesize button ── */}
              {!synthesis && (
                <button
                  className="btn-primary"
                  style={{ marginTop: '16px', width: '100%' }}
                  onClick={handleSynthesize}
                  disabled={synthesizing || isUploading}
                >
                  {synthesizing
                    ? 'Gerando síntese estratégica...'
                    : `Gerar Síntese Estratégica — ${project.documents.length} documento${project.documents.length !== 1 ? 's' : ''}`}
                </button>
              )}
              {synthError && (
                <p style={{ color: '#e05555', marginTop: '8px', fontSize: '13px' }}>{synthError}</p>
              )}
            </div>
          )}

          {/* ── Synthesis Result ── */}
          {synthesis && synthesis.apresentacao && (
            <div className="doc-synthesis">
              <div className="doc-synthesis-header">
                <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Síntese Estratégica
                </span>
                <button
                  className="btn-small"
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onClick={handleSynthesize}
                  disabled={synthesizing}
                >
                  {synthesizing ? '...' : 'Regerar'}
                </button>
              </div>

              <div className="doc-synthesis-section">
                <p className="doc-synth-label">Como a empresa se apresenta</p>
                <p className="doc-synth-text">{synthesis.apresentacao}</p>
              </div>

              <div className="doc-synthesis-section">
                <p className="doc-synth-label">Linguagem</p>
                <p className="doc-synth-text">{synthesis.linguagem}</p>
              </div>

              <div className="doc-synthesis-grid">
                <div className="doc-synth-card">
                  <p className="doc-synth-label">Arquétipo dominante</p>
                  <p className="doc-synth-value">{synthesis.arquetipo?.dominante}</p>
                </div>
                <div className="doc-synth-card">
                  <p className="doc-synth-label">Arquétipo secundário</p>
                  <p className="doc-synth-value">{synthesis.arquetipo?.secundario}</p>
                </div>
                <div className="doc-synth-card" style={{ gridColumn: '1 / -1' }}>
                  <p className="doc-synth-label">Sombra — o que os documentos evitam</p>
                  <p className="doc-synth-value">{synthesis.arquetipo?.sombra}</p>
                </div>
              </div>

              <div className="doc-synthesis-section">
                <p className="doc-synth-label">Tensões estruturais</p>
                <ul className="doc-synth-list">
                  {synthesis.tensoes?.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>

              <div className="doc-synthesis-grid">
                <div>
                  <p className="doc-synth-label">Signos que funcionam</p>
                  <ul className="doc-synth-list doc-synth-list--green">
                    {synthesis.signos_fortes?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="doc-synth-label">Signos em conflito</p>
                  <ul className="doc-synth-list doc-synth-list--amber">
                    {synthesis.signos_conflito?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>

              <div className="doc-synthesis-section" style={{ background: 'rgba(201,169,110,0.06)', borderLeft: '3px solid var(--gold)', padding: '14px 16px', borderRadius: '4px' }}>
                <p className="doc-synth-label">Potência latente</p>
                <p className="doc-synth-text">{synthesis.potencia_latente}</p>
              </div>

              <div className="doc-synthesis-section">
                <p className="doc-synth-label">Hipóteses estratégicas</p>
                <ul className="doc-synth-list">
                  {synthesis.hipoteses_estrategicas?.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              </div>

              <div className="doc-synthesis-section">
                <p className="doc-synth-label">Perguntas que os documentos levantam para as entrevistas</p>
                <ul className="doc-synth-list doc-synth-list--questions">
                  {synthesis.perguntas_para_entrevista?.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button className="btn-approve" onClick={handleApprove}>
                  Aprovar síntese e avançar
                </button>
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </div>
          )}

          {/* Skip without docs */}
          {project.documents.length === 0 && (
            <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>
              Pular — sem documentos disponíveis
            </button>
          )}
        </>
      )}

      {isDone && (
        <div>
          <p className="step-done-msg">
            {step.status === 'skipped'
              ? 'Etapa pulada.'
              : `${project.documents.length} documento(s) processado(s). Síntese estratégica aprovada.`}
          </p>
          {synthesis && (
            <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--surface)', borderRadius: '6px', borderLeft: '3px solid var(--gold)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '6px' }}>ARQUÉTIPO IDENTIFICADO</p>
              <p style={{ color: 'var(--gold)', fontSize: '14px', fontWeight: 600 }}>{synthesis.arquetipo?.dominante}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{synthesis.potencia_latente?.slice(0, 180)}...</p>
            </div>
          )}
        </div>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Indique o que priorizar na análise, contexto sobre os documentos, ou informações que não estão nos arquivos..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Documentos da empresa" />
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
    const notes = getStepNotes(step);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_agenda',
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
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
    const notes = getStepNotes(step);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_research',
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
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
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Dimensões prioritárias, ângulos específicos do setor, concorrentes a monitorar, referências internacionais..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Pesquisa setorial" />
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
    const notes = getStepNotes(step);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_scripts',
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
        }),
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
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Públicos prioritários, temas sensíveis a abordar, abordagem específica para algum entrevistado..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Roteiros de entrevista" />
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
    const notes = getStepNotes(step);
    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: raw,
          filename: filename || 'transcrição',
          publico: publico || 'não especificado',
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
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
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Contexto das entrevistas, observações do campo, padrões que percebeu nas conversas mas que podem não estar nas transcrições..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Transcrições" />
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
    const notes = getStepNotes(step);
    const updated1 = { ...project, deepAnalysis: { ...project.deepAnalysis, status: 'running' as const } };
    onUpdate(updated1);
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deep_analysis',
          projectContext: getProjectContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : ''),
        }),
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
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Hipóteses sobre o arquétipo real, tensões que percebeu no campo, direções que quer explorar ou evitar na análise..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Análise de Decifração" />
    </div>
  );
}

// ─── STEP: CHAT ───────────────────────────────────────────────────────────────

function StepChat({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    getStepChatHistory(step)
  );
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

  const phaseHint = step.id === 'chat_decifração'
    ? 'Mapa Simbólico, Análise de Gaps, Imersão de Liderança.'
    : step.id === 'chat_reconstrucao'
    ? 'Plataforma de Marca, Código Linguístico, Narrativa de Marca.'
    : 'Plano de Travessia, Treinamento e Curadoria de Ativação.';

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const notes = getStepNotes(step);
    const userMsg = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const notesCtx = notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : '';

    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          projectContext: getProjectContext(project) + notesCtx,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      const allMessages = [...newMessages, { role: 'assistant' as const, content: data.text }];
      setMessages(allMessages);
      const updated = updateStepData(project, step.id, { chatHistory: allMessages });
      onUpdate(updated);
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
          {/* Notes above chat — gives the AI direction before the first message */}
          <StepNotes
            step={step}
            project={project}
            onUpdate={onUpdate}
            placeholder={`Intenções para esta fase, entregáveis prioritários, restrições, direções que quer explorar... (${phaseHint})`}
          />

          <div className="step-chat-section-label">
            <span>Co-criação — {label}</span>
            {messages.length > 0 && (
              <button
                className="btn-small"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '11px' }}
                onClick={() => {
                  setMessages([]);
                  const updated = updateStepData(project, step.id, { chatHistory: [] });
                  onUpdate(updated);
                }}
              >
                Limpar histórico
              </button>
            )}
          </div>

          {messages.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px', lineHeight: 1.6 }}>
              Espaço de co-criação com IA para entregáveis de {label}. A IA tem contexto completo do projeto e das suas notas acima. Comece com um pedido específico ou uma pergunta estratégica.
            </p>
          )}

          {messages.length > 0 && (
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`}>
                  <p style={{ fontSize: '13px', whiteSpace: 'pre-wrap', margin: 0 }}>{m.content}</p>
                </div>
              ))}
              {loading && (
                <div className="chat-msg chat-msg-ai">
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Processando...</p>
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
              placeholder="Escreva aqui... (Enter envia, Shift+Enter nova linha)"
              rows={3}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{ alignSelf: 'flex-end', padding: '8px 16px', minWidth: 'auto' }}
            >
              →
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
                            <StepChat project={project} step={step} onUpdate={handleUpdate} />
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
