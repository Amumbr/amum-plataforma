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
  getResearchItemContext,
  addIntel,
  STEP_DEFINITIONS,
  Project,
  WorkflowStep,
  TranscriptAnalysis,
  ClientDocument,
  DocumentSynthesis,
  ResearchAgendaItem,
  ResearchResult,
  ResearchDirectives,
  ResearchDirective,
  ResearchSynthesis,
  SocialMediaAnalysis,
  SocialProfileResult,
  TrendsAnalysis,
  NetnographyAnalysis,
  InterviewScript,
  BrandChannelResult,
  BrandAuditSynthesis,
  SocialListeningResult,
  SocialResearchSynthesis,
  IndependentResearchFile,
  Interviewee,
  PHASE_NAMES,
} from '@/lib/store';
import { fetchProjectFromSupabase } from '@/lib/db';

// ─── DOWNLOAD BUTTON ──────────────────────────────────────────────────────────

function DownloadButton({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const [status, setStatus] = useState<'idle' | 'done'>('idle');

  function handleDownload() {
    if (!content?.trim()) return;
    const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const header = `# ${title}\n\n*Gerado pela plataforma AMUM em ${date}*\n\n---\n\n`;
    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('done');
    setTimeout(() => setStatus('idle'), 3000);
  }

  return (
    <button
      className="drive-save-btn"
      onClick={handleDownload}
      disabled={!content?.trim()}
      title="Baixar como arquivo de texto"
    >
      {status === 'done' ? '✓ Baixado' : '↓ Baixar'}
    </button>
  );
}

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

function formatSynthesisMarkdown(s: DocumentSynthesis): string {
  return [
    `## Como a empresa se apresenta\n${s.apresentacao}`,
    `## Linguagem\n${s.linguagem}`,
    `## Arquétipos\n**Dominante:** ${s.arquetipo?.dominante}\n**Secundário:** ${s.arquetipo?.secundario}\n**Sombra:** ${s.arquetipo?.sombra}`,
    `## Tensões estruturais\n${s.tensoes?.map(t => `- ${t}`).join('\n')}`,
    `## Signos que funcionam\n${s.signos_fortes?.map(t => `- ${t}`).join('\n')}`,
    `## Signos em conflito\n${s.signos_conflito?.map(t => `- ${t}`).join('\n')}`,
    `## Potência latente\n${s.potencia_latente}`,
    `## Hipóteses estratégicas\n${s.hipoteses_estrategicas?.map(t => `- ${t}`).join('\n')}`,
    `## Perguntas para entrevistas\n${s.perguntas_para_entrevista?.map(t => `- ${t}`).join('\n')}`,
  ].join('\n\n');
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
    case 'brand_audit':
      if (project.brandAuditResults && project.brandAuditResults.length > 0) {
        parts.push(`AUDITORIA DE CANAIS (${project.brandAuditResults.length} canais):`);
        project.brandAuditResults.forEach(r => {
          parts.push(`- ${r.canal}: ${r.sintese?.slice(0, 300)}`);
        });
      }
      if (project.brandAuditSynthesis) {
        parts.push(`Diagnóstico: ${project.brandAuditSynthesis.diagnostico?.slice(0, 400)}`);
      }
      break;
    case 'social_research':
      if (project.socialListeningResults && project.socialListeningResults.length > 0) {
        parts.push(`SOCIAL LISTENING (${project.socialListeningResults.length} perfis):`);
        project.socialListeningResults.forEach(r => {
          parts.push(`- ${r.entidade}: ${r.posicionamento?.slice(0, 200)}`);
        });
      }
      if (project.socialResearchSynthesis) {
        parts.push(`Territórios disponíveis: ${project.socialResearchSynthesis.territoriosDisponiveis?.join(', ')}`);
      }
      break;
    case 'research_report':
      if (project.consolidatedReport) {
        parts.push(`RELATÓRIO CONSOLIDADO:\n${project.consolidatedReport.slice(0, 600)}`);
      }
      break;
    case 'interview_scripts':
      if (project.interviewees && project.interviewees.length > 0) {
        parts.push(`ENTREVISTADOS (${project.interviewees.length}):`);
        project.interviewees.forEach(iv => {
          parts.push(`- ${iv.nome} (${iv.cargo}): ${iv.questions.length} perguntas`);
        });
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
  if (name.endsWith('.html') || name.endsWith('.htm')) return '🌐';
  if (fileType.startsWith('image/')) return '🖼';
  return '📎';
}

function getFileTypeLabel(fileType: string, filename: string): string {
  const name = filename.toLowerCase();
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'Word';
  if (name.endsWith('.txt')) return 'TXT';
  if (name.endsWith('.md')) return 'Markdown';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'HTML';
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

interface PendingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'extracting' | 'error' | 'manual';
  errorMsg?: string;
  manualText?: string;
}

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
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [recentSuccess, setRecentSuccess] = useState<string[]>([]);
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState<DocumentSynthesis | null>(
    project.documentSynthesis || null
  );
  const [synthError, setSynthError] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const projectRef = React.useRef(project);
  projectRef.current = project;
  const isDone = step.status === 'done' || step.status === 'skipped';

  const ACCEPTED_TYPES = '.pdf,.docx,.doc,.txt,.md,.html,.htm,.png,.jpg,.jpeg,.webp';


  async function processFileSafe(file: File) {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nameLower = file.name.toLowerCase();
    const isHtml = nameLower.endsWith('.html') || nameLower.endsWith('.htm') || file.type === 'text/html';
    const isPdf = nameLower.endsWith('.pdf') || file.type === 'application/pdf';

    setPending(prev => [...prev, {
      id: docId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      status: 'extracting',
    }]);

    try {
      let extractedText = '';

      // ── HTML: extração 100% no browser, sem API ───────────────────────────
      if (isHtml) {
        const rawHtml = await file.text();
        // Usa DOMParser nativo do browser para extração limpa
        const parser = new DOMParser();
        const dom = parser.parseFromString(rawHtml, 'text/html');
        // Remove scripts, estilos e elementos não-textuais
        dom.querySelectorAll('script, style, noscript, svg, canvas, [aria-hidden="true"]').forEach(el => el.remove());
        // innerText respeita display:none, textContent não — usamos textContent para garantir
        extractedText = (dom.body?.textContent || '')
          .replace(/\s{3,}/g, '\n\n')
          .trim();
        if (!extractedText) throw new Error('HTML sem conteúdo textual. Cole o texto manualmente.');
      }

      // ── PDF/DOCX/Imagem: verifica tamanho antes de enviar ────────────────
      else {
        // Limite conservador: 3.5MB de arquivo original (~4.7MB base64 < 4.5MB Vercel limit)
        const MAX_BYTES = isPdf ? 3.5 * 1024 * 1024 : 6 * 1024 * 1024;
        if (file.size > MAX_BYTES) {
          throw new Error(
            `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). ` +
            `Limite: ${isPdf ? '3.5MB para PDF' : '6MB'}. Compacte o arquivo ou use "Colar texto".`
          );
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'extract',
            filename: file.name,
            fileType: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          }),
        });

        // Lê como texto primeiro para evitar JSON.parse de resposta HTML de erro
        const responseText = await res.text();
        let data: { extractedText?: string; error?: string; charCount?: number };
        try {
          data = JSON.parse(responseText);
        } catch {
          // Servidor retornou não-JSON: limite de payload, timeout, ou erro de infra
          if (res.status === 413 || res.status === 0) {
            throw new Error('Arquivo excede o limite do servidor. Use "Colar texto" para incluir o conteúdo.');
          }
          throw new Error(`Erro no servidor (${res.status}). Tente novamente ou use "Colar texto".`);
        }
        if (data.error) throw new Error(data.error);
        extractedText = data.extractedText || '';
      }

      const newDoc: ClientDocument = {
        id: docId,
        filename: file.name,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        content: extractedText.slice(0, 12000),
        createdAt: new Date().toISOString(),
      };

      setPending(prev => prev.filter(p => p.id !== docId));
      setRecentSuccess(prev => [...prev, docId]);
      setTimeout(() => setRecentSuccess(prev => prev.filter(id => id !== docId)), 4000);

      const current = projectRef.current;
      const updated = { ...current, documents: [...current.documents, newDoc] };
      saveProject(updated);
      onUpdate(updated);

    } catch (err) {
      console.error('Upload error:', err);
      const msg = err instanceof Error ? err.message : 'Falha na extração';
      setPending(prev =>
        prev.map(p => p.id === docId
          ? { ...p, status: 'error' as const, errorMsg: msg }
          : p
        )
      );
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    // Processa em paralelo (até 3 simultâneos para não sobrecarregar)
    const chunks: File[][] = [];
    for (let i = 0; i < arr.length; i += 3) chunks.push(arr.slice(i, i + 3));
    for (const chunk of chunks) {
      await Promise.all(chunk.map(f => processFileSafe(f)));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function dismissError(docId: string) {
    setPending(prev => prev.filter(p => p.id !== docId));
  }

  function switchToManual(docId: string) {
    setPending(prev => prev.map(p => p.id === docId
      ? { ...p, status: 'manual' as const, errorMsg: undefined, manualText: '' }
      : p
    ));
  }

  function updateManualText(docId: string, text: string) {
    setPending(prev => prev.map(p => p.id === docId ? { ...p, manualText: text } : p));
  }

  function saveManualText(pf: PendingFile) {
    if (!pf.manualText?.trim()) return;
    const newDoc: ClientDocument = {
      id: pf.id,
      filename: pf.name,
      fileType: pf.type || 'text/plain',
      size: pf.size,
      content: pf.manualText.slice(0, 8000),
      createdAt: new Date().toISOString(),
    };
    setPending(prev => prev.filter(p => p.id !== pf.id));
    setRecentSuccess(prev => [...prev, pf.id]);
    setTimeout(() => setRecentSuccess(prev => prev.filter(id => id !== pf.id)), 4000);
    const current = projectRef.current;
    const updated = { ...current, documents: [...current.documents, newDoc] };
    saveProject(updated);
    onUpdate(updated);
  }

  async function retryFile(pf: PendingFile) {
    // Cria um File sintético com o nome e tipo original para retentar
    // O usuário precisará re-selecionar o arquivo (sem acesso ao File original)
    // Por isso oferecemos o modo manual como alternativa
    switchToManual(pf.id);
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

  const isUploading = pending.some(p => p.status === 'extracting');
  const totalDocs = project.documents.length;
  const showList = totalDocs > 0 || pending.length > 0;

  return (
    <div className="step-body">
      {!isDone && (
        <>
          {/* ── Drop Zone ── */}
          <div
            className={`doc-dropzone${dragging ? ' doc-dropzone--active' : ''}${isUploading ? ' doc-dropzone--busy' : ''}`}
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
              PDF · Word · TXT · HTML · Imagens — múltiplos arquivos simultâneos
            </p>
          </div>



          {/* ── Lista unificada: pending + incorporados ── */}
          {showList && (
            <div className="doc-list">

              {/* Arquivos em processamento / erro / modo manual */}
              {pending.map(pf => (
                <div key={pf.id} className={`doc-pending-item doc-pending--${pf.status}`}>
                  {/* Linha principal */}
                  <div className="doc-pending-row">
                    <span className={`doc-item-icon${pf.status === 'extracting' ? ' doc-item-spinner' : ''}`}>
                      {pf.status === 'extracting' && getFileIcon(pf.type, pf.name)}
                      {pf.status === 'error' && '⚠'}
                      {pf.status === 'manual' && '✏'}
                    </span>
                    <div className="doc-item-info">
                      <span className="doc-item-name">{pf.name}</span>
                      <span className="doc-item-meta">
                        {pf.status === 'extracting' && (
                          <span className="doc-extracting-label">Extraindo texto...</span>
                        )}
                        {pf.status === 'error' && (
                          <span style={{ color: '#e05555' }}>Falha — {pf.errorMsg}</span>
                        )}
                        {pf.status === 'manual' && (
                          <span style={{ color: 'var(--gold-dim)' }}>Cole o texto do documento abaixo</span>
                        )}
                      </span>
                    </div>
                    {/* Ações de erro */}
                    {pf.status === 'error' && (
                      <div className="doc-error-actions">
                        <button className="doc-error-btn" onClick={() => switchToManual(pf.id)}>
                          Colar texto
                        </button>
                        <button className="doc-error-dismiss" onClick={() => dismissError(pf.id)}>
                          ×
                        </button>
                      </div>
                    )}
                    {pf.status === 'manual' && (
                      <button className="doc-error-dismiss" onClick={() => dismissError(pf.id)}>×</button>
                    )}
                  </div>

                  {/* Erro expandido */}
                  {pf.status === 'error' && (
                    <div className="doc-error-detail">
                      <p>A extração automática falhou. Isso ocorre com PDFs protegidos por senha, PDFs escaneados sem camada de texto, ou arquivos maiores que 3.5MB.</p>
                      <p>Clique em <strong>Colar texto</strong> para incluir o conteúdo manualmente.</p>
                    </div>
                  )}

                  {/* Modo manual: textarea */}
                  {pf.status === 'manual' && (
                    <div className="doc-manual-entry">
                      <textarea
                        className="textarea"
                        rows={6}
                        placeholder={`Cole aqui o conteúdo de "${pf.name}"...`}
                        value={pf.manualText || ''}
                        onChange={e => updateManualText(pf.id, e.target.value)}
                      />
                      <button
                        className="btn-primary btn-small"
                        style={{ marginTop: '8px' }}
                        onClick={() => saveManualText(pf)}
                        disabled={!pf.manualText?.trim()}
                      >
                        Incorporar à base
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Arquivos incorporados */}
              {project.documents.map(doc => {
                const isNew = recentSuccess.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`doc-item${isNew ? ' doc-item--success' : ''}`}
                  >
                    <span className="doc-item-icon">
                      {isNew ? '✓' : getFileIcon(doc.fileType, doc.filename)}
                    </span>
                    <div className="doc-item-info">
                      <span className="doc-item-name">{doc.filename}</span>
                      <span className="doc-item-meta">
                        {getFileTypeLabel(doc.fileType, doc.filename)}
                        {doc.size ? ` · ${formatBytes(doc.size)}` : ''}
                        {' · '}
                        <span style={{ color: '#5a9e6f' }}>
                          {doc.content
                            ? `${doc.content.length.toLocaleString('pt-BR')} chars incorporados`
                            : 'sem texto extraído'}
                        </span>
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
                );
              })}

              {/* Status bar */}
              {(totalDocs > 0 || isUploading) && (
                <div className="doc-status-bar">
                  {isUploading && (
                    <span className="doc-status-extracting">
                      Extraindo {pending.filter(p => p.status === 'extracting').length} arquivo(s)...
                    </span>
                  )}
                  {!isUploading && totalDocs > 0 && (
                    <span className="doc-status-done">
                      ✓ {totalDocs} arquivo{totalDocs !== 1 ? 's' : ''} incorporado{totalDocs !== 1 ? 's' : ''} à base
                    </span>
                  )}
                  <span className="doc-status-add" onClick={() => fileInputRef.current?.click()}>
                    + Adicionar mais
                  </span>
                </div>
              )}

              {/* Botão de síntese */}
              {!synthesis && !isUploading && totalDocs > 0 && (
                <button
                  className="btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={handleSynthesize}
                  disabled={synthesizing}
                >
                  {synthesizing
                    ? 'Gerando síntese estratégica...'
                    : `Gerar Síntese Estratégica — ${totalDocs} documento${totalDocs !== 1 ? 's' : ''}`}
                </button>
              )}
              {isUploading && totalDocs > 0 && !synthesis && (
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '10px', textAlign: 'center' }}>
                  Aguardando extração para gerar síntese...
                </p>
              )}
              {synthError && (
                <p style={{ color: '#e05555', marginTop: '8px', fontSize: '13px' }}>{synthError}</p>
              )}
            </div>
          )}

          {/* ── Síntese ── */}
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', alignItems: 'center' }}>
                <button className="btn-approve" onClick={handleApprove}>
                  Aprovar síntese e avançar
                </button>
                <DownloadButton
                  title={`Síntese Documental — ${project.nome}`}
                  content={synthesis ? formatSynthesisMarkdown(synthesis) : ''}
                />
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </div>
          )}

          {/* Skip sem docs */}
          {project.documents.length === 0 && pending.length === 0 && (
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
              : `${project.documents.length} documento(s) incorporado(s). Síntese aprovada.`}
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

// ─── HOOK: PROGRESS CYCLER ───────────────────────────────────────────────────

function useProgressCycler(messages: string[], active: boolean, intervalMs = 2800): string {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const timer = setInterval(() => setIdx(i => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(timer);
  }, [active, messages.length, intervalMs]);
  return active ? messages[idx] : '';
}

// ─── COMPONENTE: PROGRESS DISPLAY ────────────────────────────────────────────

function ProgressDisplay({ message, sub }: { message: string; sub?: string }) {
  if (!message) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: 'rgba(201,169,110,0.06)', borderRadius: '6px', border: '1px solid rgba(201,169,110,0.2)', marginTop: '12px' }}>
      <span style={{ fontSize: '14px', animation: 'spin 2s linear infinite', display: 'inline-block', flexShrink: 0 }}>◌</span>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
        {sub && <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── MÓDULO: DOSSIÊ DE MERCADO ────────────────────────────────────────────────

function ModuleDossie({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progressSub, setProgressSub] = useState('');
  const [partialResults, setPartialResults] = useState<ResearchResult[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<ResearchAgendaItem | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  const agendaProgress = useProgressCycler([
    'Lendo contexto do projeto...',
    'Identificando dimensões relevantes...',
    'Calibrando agenda ao momento da marca...',
    'Estruturando temas de pesquisa...',
  ], loading === 'agenda');

  const researchProgress = useProgressCycler([
    'Pesquisando na web...',
    'Analisando dados coletados...',
    'Sintetizando informação...',
    'Identificando tensões e contradições...',
  ], loading === 'research');

  function saveAgenda(agenda: ResearchAgendaItem[]) {
    const updated = { ...project, researchAgenda: agenda };
    saveProject(updated);
    onUpdate(updated);
  }

  async function generateAgenda() {
    setLoading('agenda');
    setError(null);
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
      if (data.error) {
        setError(`Erro ao gerar agenda: ${data.error}`);
      } else if (data.agenda) {
        saveAgenda(data.agenda);
      } else {
        setError('Resposta inesperada. Tente novamente.');
      }
    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
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

  // ── Rate-limit helpers ────────────────────────────────────────────────────
  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function is429(detail: unknown): boolean {
    if (!detail) return false;
    const s = String(detail);
    // Match both {"status":429} and raw 429 mentions from OpenAI error envelope
    if (s.includes('"status":429') || s.includes("'status': 429")) return true;
    try {
      const parsed = JSON.parse(s) as { status?: number; error?: { code?: string; type?: string } };
      if (parsed.status === 429) return true;
      const code = parsed.error?.code ?? '';
      const type = parsed.error?.type ?? '';
      if (code === 'rate_limit_exceeded' || type === 'tokens' || type === 'requests') return true;
    } catch { /* not JSON */ }
    if (s.toLowerCase().includes('rate limit') || s.toLowerCase().includes('tokens per m')) return true;
    return false;
  }

  async function fetchResearchItem(
    body: object,
    onRetry: (attempt: number, delaySec: number) => void
  ): Promise<Record<string, unknown>> {
    // Delays progressivos: 20s → 45s → 90s — margem suficiente para resetar a janela de TPM
    const RETRY_DELAYS = [20_000, 45_000, 90_000];
    let lastData: Record<string, unknown> = { error: 'Max retries exceeded' };

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      const res = await fetch('/api/openai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      lastData = (await res.json()) as Record<string, unknown>;

      // Retry only on 429 and while retries remain
      if (lastData.error && is429(lastData.detail) && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        onRetry(attempt + 1, Math.round(delay / 1000));
        await sleep(delay);
        continue;
      }

      return lastData; // success or non-429 error — stop retrying
    }

    return lastData;
  }
  // ─────────────────────────────────────────────────────────────────────────

  async function runResearch() {
    setLoading('research');
    setError(null);
    const notes = getStepNotes(step);
    // Contexto enxuto para pesquisa por item — exclui blobs JSON pesados (diagnostico, espelho, etc.)
    // que inflariam o TPM desnecessariamente sem agregar valor à pesquisa setorial.
    const ctx = getResearchItemContext(project) + (notes ? `\n\nNOTAS DO ESTRATEGISTA:\n${notes}` : '');
    const agenda = project.researchAgenda; // snapshot — won't change during loop
    const accumulated: ResearchResult[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < agenda.length; i++) {
        const item = agenda[i];
        setProgressSub(`${i + 1} de ${agenda.length}: ${item.tema}`);

        try {
          const data = await fetchResearchItem(
            { action: 'run_research_item', projectContext: ctx, agenda: item },
            (attempt, delaySec) => {
              setProgressSub(`Rate limit — aguardando ${delaySec}s antes da tentativa ${attempt}/3… (${i + 1}/${agenda.length}: ${item.tema})`);
            }
          );

          // Restore progress label after a retry
          setProgressSub(`${i + 1} de ${agenda.length}: ${item.tema}`);

          if (data.error) {
            const detail = data.detail ? ` (${String(data.detail).slice(0, 120)})` : '';
            errors.push(`"${item.tema}": ${data.error}${detail}`);
            // Continue to next item — don't abort the whole loop
          } else {
            accumulated.push({ ...(data as unknown as ResearchResult), createdAt: new Date().toISOString() });

            // Show result immediately in UI (no full re-render of parent)
            setPartialResults([...accumulated]);
            // Persist to localStorage after each item (no re-render mid-loop)
            saveProject({ ...project, researchResults: [...accumulated] });
          }

          // 15s cooldown entre itens — suficiente para não saturar a janela de TPM
          // do gpt-4o-search-preview sem comprometer o fluxo de trabalho.
          if (i < agenda.length - 1) {
            setProgressSub(`Aguardando 15s antes do próximo tema…`);
            await sleep(15_000);
          }

        } catch (itemErr) {
          errors.push(`"${item.tema}": ${String(itemErr)}`);
          // keep going
        }
      }

      // Single re-render at the end with all results
      const finalProject = { ...project, researchResults: accumulated };
      saveProject(finalProject);
      onUpdate(finalProject);

      // Add to Intel Feed
      accumulated.forEach(r => {
        addIntel(project.id, {
          type: 'pesquisa',
          title: r.tema,
          content: r.sintese.slice(0, 300),
          source: 'Dossiê de mercado',
        });
      });

      if (errors.length > 0) {
        setError(`${accumulated.length} de ${agenda.length} temas pesquisados. Erros: ${errors.slice(0, 2).join(' | ')}${errors.length > 2 ? ` (+${errors.length - 2})` : ''}`);
      }

    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
    } finally {
      setLoading('');
      setProgressSub('');
      setPartialResults([]);
    }
  }

  const hasAgenda = project.researchAgenda.length > 0;
  const hasResults = project.researchResults.length > 0;

  return (
    <div>

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
          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(180,100,100,0.3)' }}>
              <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={generateAgenda} disabled={loading === 'agenda'}>
              {loading === 'agenda' ? 'Gerando...' : 'Gerar agenda de pesquisa'}
            </button>
          </div>
          <ProgressDisplay message={agendaProgress} />
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
              {loading === 'research' ? 'Pesquisando...' : `Executar pesquisa (${project.researchAgenda.length} temas)`}
            </button>
          </div>
          {error && (
            <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginTop: '10px', border: '1px solid rgba(180,100,100,0.3)' }}>
              <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
            </div>
          )}
          <ProgressDisplay message={researchProgress} sub={progressSub} />

          {/* Resultados parciais — aparecem um a um durante a pesquisa */}
          {partialResults.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {partialResults.length} de {project.researchAgenda.length} temas concluídos
              </p>
              {partialResults.map(r => (
                <div key={r.id} style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: '4px', marginBottom: '6px', borderLeft: '2px solid var(--gold)', opacity: 0.85 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gold)', marginBottom: '3px' }}>✓ {r.tema}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{r.sintese.slice(0, 120)}…</p>
                </div>
              ))}
            </div>
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
                  {r.fontes && r.fontes.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Fontes
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {r.fontes.map((fonte, i) => {
                          const isUrl = fonte.startsWith('http://') || fonte.startsWith('https://') || fonte.startsWith('www.');
                          const href = isUrl ? (fonte.startsWith('www.') ? `https://${fonte}` : fonte) : null;
                          return href ? (
                            <a
                              key={i}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '12px', color: 'var(--gold)', opacity: 0.75, textDecoration: 'none', wordBreak: 'break-all' }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
                            >
                              ↗ {fonte}
                            </a>
                          ) : (
                            <p key={i} style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '2px' }}>· {fonte}</p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasResults && (
            <button className="btn-small" style={{ marginTop: '16px', opacity: 0.6 }} onClick={() => { const updated = { ...project, researchResults: [], researchAgenda: [], researchDirectives: undefined }; saveProject(updated); onUpdate(updated); }}>
              ↺ Refazer pesquisa
            </button>
          )}
        </div>
      )}

      {/* ── DIRETRIZES: aparece após resultados existirem ── */}
      {hasResults && (
        <DirectivesPanel project={project} onUpdate={onUpdate} />
      )}

    </div>
  );
}

// ─── PAINEL DE DIRETRIZES ─────────────────────────────────────────────────────

function DirectivesPanel({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const directives = project.researchDirectives;

  const progress = useProgressCycler([
    'Lendo dados do site AMUM...',
    'Analisando documentos da empresa...',
    'Cruzando com achados do dossiê...',
    'Identificando tensões entre camadas...',
    'Elaborando diretrizes de pesquisa...',
  ], loading);

  async function extractDirectives() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract_directives',
          projectContext: getProjectContext(project),
        }),
      });
      const data = await res.json();
      if (data.error) { setError(`${data.error}${data.raw ? ` — Resposta bruta: ${String(data.raw).slice(0, 150)}` : ''}`); return; }
      if (data.marcas || data.termos) {
        const updated = { ...project, researchDirectives: data as ResearchDirectives };
        saveProject(updated);
        onUpdate(updated);
      } else { setError('Resposta inesperada. Tente novamente.'); }
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  function toggleDirective(field: 'marcas' | 'termos' | 'comunidades' | 'plataformas', id: string) {
    if (!directives) return;
    const updated = {
      ...project,
      researchDirectives: {
        ...directives,
        [field]: directives[field].map((d: ResearchDirective) => d.id === id ? { ...d, ativo: !d.ativo } : d),
      },
    };
    saveProject(updated);
    onUpdate(updated);
  }

  function addDirective(field: 'marcas' | 'termos' | 'comunidades' | 'plataformas', tipo: ResearchDirective['tipo'], valor: string) {
    if (!directives || !valor.trim()) return;
    const newItem: ResearchDirective = { id: `${tipo}_${Date.now()}`, tipo, valor: valor.trim(), justificativa: 'Adicionado manualmente', ativo: true };
    const updated = { ...project, researchDirectives: { ...directives, [field]: [...directives[field], newItem] } };
    saveProject(updated);
    onUpdate(updated);
  }

  function removeDirective(field: 'marcas' | 'termos' | 'comunidades' | 'plataformas', id: string) {
    if (!directives) return;
    const updated = { ...project, researchDirectives: { ...directives, [field]: directives[field].filter((d: ResearchDirective) => d.id !== id) } };
    saveProject(updated);
    onUpdate(updated);
  }

  if (!directives) {
    return (
      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px' }}>Próximo passo — diretrizes de pesquisa</p>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '14px', lineHeight: 1.6 }}>
          O sistema vai cruzar os dados do site AMUM (diagnóstico, brand_context), os documentos da empresa e os achados do Dossiê para derivar as diretrizes das pesquisas seguintes. A tensão central e os perfis a investigar emergem do atrito entre essas camadas — não de uma fonte única.
        </p>
        {error && <p style={{ fontSize: '12px', color: '#b56a6a', marginBottom: '10px' }}>{error}</p>}
        <button className="btn-primary" onClick={extractDirectives} disabled={loading}>
          {loading ? 'Processando...' : 'Gerar diretrizes de pesquisa'}
        </button>
        <ProgressDisplay message={progress} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--gold)', fontWeight: 600, marginBottom: '4px' }}>Inteligência extraída — contexto para os próximos steps</p>
          {directives.tensaoCentral && (
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>"{directives.tensaoCentral}"</p>
          )}
        </div>
        <button className="btn-small" style={{ opacity: 0.6, flexShrink: 0 }} onClick={extractDirectives} disabled={loading}>
          {loading ? '...' : '↺ Regerar'}
        </button>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: '16px', padding: '10px 12px', background: 'rgba(201,169,110,0.05)', borderRadius: '6px', borderLeft: '2px solid rgba(201,169,110,0.3)' }}>
        Estes dados já estão incorporados ao contexto de todos os steps seguintes. Use as marcas e perfis abaixo como referência ao inserir URLs nos steps de <strong style={{ color: 'var(--text-secondary)' }}>Auditoria de Canais</strong> e <strong style={{ color: 'var(--text-secondary)' }}>Pesquisa de Redes Sociais</strong>. Aprove este step para avançar.
      </p>

      <DirectiveGroup
        label="Marcas e perfis para social listening"
        subtitle="→ Pesquisa de Redes Sociais"
        items={directives.marcas}
        onToggle={id => toggleDirective('marcas', id)}
        onAdd={v => addDirective('marcas', 'marca', v)}
        onRemove={id => removeDirective('marcas', id)}
        placeholder="Adicionar marca ou perfil..."
      />
      <DirectiveGroup
        label="Termos e conceitos relevantes"
        subtitle="→ referência estratégica"
        items={directives.termos}
        onToggle={id => toggleDirective('termos', id)}
        onAdd={v => addDirective('termos', 'termo', v)}
        onRemove={id => removeDirective('termos', id)}
        placeholder="Adicionar termo de busca..."
      />
      <DirectiveGroup
        label="Comunidades e espaços de referência"
        subtitle="→ contexto setorial"
        items={directives.comunidades}
        onToggle={id => toggleDirective('comunidades', id)}
        onAdd={v => addDirective('comunidades', 'comunidade', v)}
        onRemove={id => removeDirective('comunidades', id)}
        placeholder="Adicionar comunidade ou fórum..."
      />
      <DirectiveGroup
        label="Plataformas prioritárias"
        subtitle="→ Auditoria de Canais"
        items={directives.plataformas}
        onToggle={id => toggleDirective('plataformas', id)}
        onAdd={v => addDirective('plataformas', 'plataforma', v)}
        onRemove={id => removeDirective('plataformas', id)}
        placeholder="Ex: TikTok, Pinterest..."
      />
    </div>
  );
}

function DirectiveGroup({
  label, subtitle, items, onToggle, onAdd, onRemove, placeholder,
}: {
  label: string; subtitle: string; items: ResearchDirective[];
  onToggle: (id: string) => void; onAdd: (v: string) => void;
  onRemove: (id: string) => void; placeholder: string;
}) {
  const [input, setInput] = useState('');

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>→ {subtitle}</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {items.map(item => (
          <div
            key={item.id}
            title={item.justificativa}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '14px', fontSize: '12px',
              background: item.ativo ? 'rgba(201,169,110,0.12)' : 'var(--surface)',
              border: `1px solid ${item.ativo ? 'rgba(201,169,110,0.4)' : 'var(--border)'}`,
              color: item.ativo ? 'var(--gold)' : 'var(--text-dim)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onClick={() => onToggle(item.id)}
          >
            <span>{item.valor}</span>
            <span
              onClick={e => { e.stopPropagation(); onRemove(item.id); }}
              style={{ opacity: 0.5, fontSize: '10px', marginLeft: '2px' }}
            >✕</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          className="input"
          style={{ flex: 1, fontSize: '12px', padding: '5px 10px' }}
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onAdd(input); setInput(''); } }}
        />
        <button className="btn-small" onClick={() => { onAdd(input); setInput(''); }} disabled={!input.trim()}>
          +
        </button>
      </div>
    </div>
  );
}

// ─── MÓDULO: REDES SOCIAIS ────────────────────────────────────────────────────

function ModuleSocial({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const analysis = project.socialMediaAnalysis;
  const directives = project.researchDirectives;

  const marcasAtivas = directives?.marcas.filter(m => m.ativo).map(m => m.valor) ?? [];
  const plataformasAtivas = directives?.plataformas.filter(p => p.ativo).map(p => p.valor) ?? [];

  const progress = useProgressCycler([
    'Buscando perfis da marca...',
    'Analisando comunicação dos concorrentes...',
    'Comparando narrativas e formatos...',
    'Mapeando territórios digitais ocupados...',
    'Identificando espaços disponíveis...',
  ], loading);

  function buildDirectivesContext() {
    if (!directives) return '';
    const parts = ['\n\nDIRETRIZES DO DOSSIÊ PARA ESTA ANÁLISE:'];
    if (marcasAtivas.length) parts.push(`Marcas/perfis a analisar obrigatoriamente: ${marcasAtivas.join(', ')}`);
    if (plataformasAtivas.length) parts.push(`Plataformas prioritárias: ${plataformasAtivas.join(', ')}`);
    if (directives.tensaoCentral) parts.push(`Tensão central a observar: ${directives.tensaoCentral}`);
    return parts.join('\n');
  }

  async function runSocialAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social_analysis',
          projectContext: getProjectContext(project) + buildDirectivesContext(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erro: ${data.error}${data.detail ? ` — ${data.detail}` : ''}`);
      } else if (data.marca) {
        const updated = { ...project, socialMediaAnalysis: data as SocialMediaAnalysis };
        saveProject(updated);
        onUpdate(updated);
        addIntel(project.id, {
          type: 'pesquisa',
          title: 'Análise de redes sociais',
          content: data.comparativo?.slice(0, 300) || 'Análise de presença digital concluída.',
          source: 'Módulo Social',
        });
      } else {
        setError('Resposta inesperada da API. Tente novamente.');
      }
    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function renderProfile(profile: SocialProfileResult) {
    return (
      <div key={profile.entidade} style={{ marginBottom: '12px' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setExpanded(expanded === profile.entidade ? null : profile.entidade)}
        >
          <p style={{ fontWeight: 600, color: profile.tipo === 'marca' ? 'var(--gold)' : 'var(--text-secondary)' }}>
            {profile.tipo === 'marca' ? '★ ' : '◦ '}{profile.entidade}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{expanded === profile.entidade ? '▲' : '▼'}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{profile.posicionamento}</p>
        {expanded === profile.entidade && (
          <div style={{ marginTop: '10px', paddingLeft: '12px', borderLeft: '2px solid var(--border)' }}>
            {profile.arquetipo && (
              <p style={{ fontSize: '12px', color: 'var(--gold)', marginBottom: '8px' }}>Arquétipo: {profile.arquetipo}</p>
            )}
            {profile.plataformas.map(plat => (
              <div key={plat.nome} className="card" style={{ marginBottom: '8px', padding: '10px 12px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {plat.nome} {plat.handle && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {plat.handle}</span>}
                  {plat.seguidores && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {plat.seguidores}</span>}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Freq: {plat.frequencia}</span>
                  <span>Engajamento: {plat.engajamento}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Temas: {plat.temasRecorrentes.join(' · ')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tom: {plat.tomDeVoz}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div style={{ background: 'rgba(100,180,100,0.08)', borderRadius: '4px', padding: '6px 8px' }}>
                    <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, marginBottom: '2px' }}>✓ Forte</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{plat.pontoForte}</p>
                  </div>
                  <div style={{ background: 'rgba(180,100,100,0.08)', borderRadius: '4px', padding: '6px 8px' }}>
                    <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '2px' }}>✗ Fraco</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{plat.pontoFraco}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.6 }}>
          Analisa presença no Instagram, LinkedIn, YouTube e outras plataformas — da marca e dos concorrentes. Mapeia territórios digitais ocupados e disponíveis.
        </p>
        {directives && marcasAtivas.length > 0 && (
          <div style={{ padding: '10px 12px', background: 'rgba(201,169,110,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(201,169,110,0.2)' }}>
            <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px' }}>Diretrizes — perfis a analisar</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {marcasAtivas.map((m, i) => <span key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>{m}</span>)}
              {plataformasAtivas.map((p, i) => <span key={i} style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>{p}</span>)}
            </div>
          </div>
        )}
        {!directives && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(180,100,100,0.2)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>Recomendado: execute o Dossiê primeiro e gere as diretrizes antes desta etapa.</p>
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(180,100,100,0.3)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
          </div>
        )}
        <button className="btn-primary" onClick={runSocialAnalysis} disabled={loading}>
          {loading ? 'Analisando...' : 'Executar análise de redes sociais'}
        </button>
        <ProgressDisplay message={progress} />
      </div>
    );
  }

  return (
    <div>
      {renderProfile(analysis.marca)}
      {analysis.concorrentes.map(c => renderProfile(c))}

      {analysis.comparativo && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Análise comparativa</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{analysis.comparativo}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
        {analysis.territoriosOcupados.length > 0 && (
          <div style={{ padding: '10px', background: 'rgba(180,100,100,0.07)', borderRadius: '6px' }}>
            <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Territórios saturados</p>
            {analysis.territoriosOcupados.map((t, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>— {t}</p>)}
          </div>
        )}
        {analysis.territoriosVazios.length > 0 && (
          <div style={{ padding: '10px', background: 'rgba(100,180,100,0.07)', borderRadius: '6px' }}>
            <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Territórios disponíveis</p>
            {analysis.territoriosVazios.map((t, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>→ {t}</p>)}
          </div>
        )}
      </div>

      {analysis.insights.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insights estratégicos</p>
          {analysis.insights.map((ins, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {ins}</p>
          ))}
        </div>
      )}

      <button className="btn-small" style={{ marginTop: '14px', opacity: 0.6 }} onClick={runSocialAnalysis} disabled={loading}>
        {loading ? 'Reexecutando...' : '↺ Refazer análise'}
      </button>
    </div>
  );
}

// ─── MÓDULO: GOOGLE TRENDS ────────────────────────────────────────────────────

function ModuleTrends({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analysis = project.trendsAnalysis;
  const directives = project.researchDirectives;
  const termosAtivos = directives?.termos.filter(t => t.ativo).map(t => t.valor) ?? [];

  const progress = useProgressCycler([
    'Pesquisando volumes de busca...',
    'Analisando direção das tendências...',
    'Identificando termos emergentes...',
    'Mapeando sazonalidade do setor...',
    'Identificando janelas de oportunidade...',
  ], loading);

  function buildDirectivesContext() {
    if (!directives) return '';
    const parts = ['\n\nDIRETRIZES DO DOSSIÊ PARA ESTA ANÁLISE:'];
    if (termosAtivos.length) parts.push(`Termos-chave obrigatórios a pesquisar: ${termosAtivos.join(', ')}`);
    if (directives.tensaoCentral) parts.push(`Tensão central: ${directives.tensaoCentral}`);
    return parts.join('\n');
  }

  async function runTrendsAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trends_analysis',
          projectContext: getProjectContext(project) + buildDirectivesContext(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erro: ${data.error}${data.detail ? ` — ${data.detail}` : ''}`);
      } else if (data.tendencias) {
        const updated = { ...project, trendsAnalysis: data as TrendsAnalysis };
        saveProject(updated);
        onUpdate(updated);
        addIntel(project.id, {
          type: 'pesquisa',
          title: 'Google Trends & buscas',
          content: `Termos crescendo: ${(data.termosCrescentes || []).slice(0, 3).join(', ')}. ${(data.janelasDeOportunidade || [])[0] || ''}`,
          source: 'Módulo Trends',
        });
      } else {
        setError('Resposta inesperada da API. Tente novamente.');
      }
    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.6 }}>
          Pesquisa de tendências de busca para a marca, o setor e os concorrentes. Identifica termos crescentes, em declínio, sazonalidade e janelas de oportunidade.
        </p>
        {termosAtivos.length > 0 && (
          <div style={{ padding: '10px 12px', background: 'rgba(201,169,110,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(201,169,110,0.2)' }}>
            <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px' }}>Diretrizes — termos a rastrear</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {termosAtivos.map((t, i) => <span key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>{t}</span>)}
            </div>
          </div>
        )}
        {!directives && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(180,100,100,0.2)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>Recomendado: execute o Dossiê e gere as diretrizes antes desta etapa.</p>
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(180,100,100,0.3)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
          </div>
        )}
        <button className="btn-primary" onClick={runTrendsAnalysis} disabled={loading}>
          {loading ? 'Pesquisando...' : 'Executar análise de tendências'}
        </button>
        <ProgressDisplay message={progress} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <div style={{ padding: '10px', background: 'rgba(100,180,100,0.07)', borderRadius: '6px' }}>
          <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>↑ Crescendo</p>
          {analysis.termosCrescentes.map((t, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>{t}</p>)}
        </div>
        <div style={{ padding: '10px', background: 'rgba(180,100,100,0.07)', borderRadius: '6px' }}>
          <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>↓ Em declínio</p>
          {analysis.termosDeclinando.map((t, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>{t}</p>)}
        </div>
      </div>

      {analysis.tendencias.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Termos analisados</p>
          {analysis.tendencias.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: t.direcao === 'crescendo' ? '#6ab56a' : t.direcao === 'declinio' ? '#b56a6a' : 'var(--text-dim)', flexShrink: 0, marginTop: '2px' }}>
                {t.direcao === 'crescendo' ? '↑' : t.direcao === 'declinio' ? '↓' : '→'}
              </span>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{t.termo}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '8px' }}>{t.contexto}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {analysis.sazonalidade && (
        <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '4px' }}>Sazonalidade</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{analysis.sazonalidade}</p>
        </div>
      )}

      {analysis.janelasDeOportunidade.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Janelas de oportunidade</p>
          {analysis.janelasDeOportunidade.map((j, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {j}</p>
          ))}
        </div>
      )}

      {analysis.insights.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insights</p>
          {analysis.insights.map((ins, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>— {ins}</p>
          ))}
        </div>
      )}

      <button className="btn-small" style={{ marginTop: '14px', opacity: 0.6 }} onClick={runTrendsAnalysis} disabled={loading}>
        {loading ? 'Reexecutando...' : '↺ Refazer análise'}
      </button>
    </div>
  );
}

// ─── MÓDULO: NETNOGRAFIA ─────────────────────────────────────────────────────

function ModuleNetnography({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const analysis = project.netnographyAnalysis;
  const directives = project.researchDirectives;
  const comunidadesAtivas = directives?.comunidades.filter(c => c.ativo).map(c => c.valor) ?? [];

  const progress = useProgressCycler([
    'Pesquisando Reddit e fóruns...',
    'Analisando avaliações e reviews...',
    'Mapeando discurso orgânico...',
    'Cruzando com discurso oficial da marca...',
    'Identificando contradições e desejos...',
    'Sintetizando discurso de rua...',
  ], loading);

  function buildDirectivesContext() {
    if (!directives) return '';
    const parts = ['\n\nDIRETRIZES DO DOSSIÊ PARA ESTA ANÁLISE:'];
    if (comunidadesAtivas.length) parts.push(`Espaços/comunidades a investigar obrigatoriamente: ${comunidadesAtivas.join(', ')}`);
    if (directives.tensaoCentral) parts.push(`Tensão central a rastrear nas conversas: ${directives.tensaoCentral}`);
    const marcasAtivas = directives.marcas.filter(m => m.ativo).map(m => m.valor);
    if (marcasAtivas.length) parts.push(`Marcas a monitorar: ${marcasAtivas.join(', ')}`);
    return parts.join('\n');
  }

  async function runNetnography() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/openai-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'netnography',
          projectContext: getProjectContext(project) + buildDirectivesContext(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erro: ${data.error}${data.detail ? ` — ${data.detail}` : ''}`);
      } else if (data.fontes) {
        const updated = { ...project, netnographyAnalysis: data as NetnographyAnalysis };
        saveProject(updated);
        onUpdate(updated);
        addIntel(project.id, {
          type: 'pesquisa',
          title: 'Netnografia — discurso de rua',
          content: data.discursoDeRua?.slice(0, 300) || 'Análise netnográfica concluída.',
          source: 'Módulo Netnografia',
        });
        if (data.alertas?.length > 0) {
          addIntel(project.id, {
            type: 'alerta',
            title: 'Alertas netnográficos',
            content: data.alertas.slice(0, 3).join(' | '),
            source: 'Módulo Netnografia',
          });
        }
      } else {
        setError('Resposta inesperada da API. Tente novamente.');
      }
    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  const sentimentColor = (s: string) => {
    if (s === 'positivo') return '#6ab56a';
    if (s === 'negativo') return '#b56a6a';
    if (s === 'ambivalente') return 'var(--gold)';
    return 'var(--text-dim)';
  };

  if (!analysis) {
    return (
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.6 }}>
          Pesquisa o que as pessoas dizem sobre a marca e o setor fora dos canais oficiais — Reddit, ReclameAqui, avaliações, comentários, grupos, fóruns. O discurso real sem filtro institucional.
        </p>
        {comunidadesAtivas.length > 0 && (
          <div style={{ padding: '10px 12px', background: 'rgba(201,169,110,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(201,169,110,0.2)' }}>
            <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px' }}>Diretrizes — espaços a investigar</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {comunidadesAtivas.map((c, i) => <span key={i} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>{c}</span>)}
            </div>
          </div>
        )}
        {!directives && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.06)', borderRadius: '6px', marginBottom: '14px', border: '1px solid rgba(180,100,100,0.2)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>Recomendado: execute o Dossiê e gere as diretrizes antes desta etapa.</p>
          </div>
        )}
        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(180,100,100,0.3)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
          </div>
        )}
        <button className="btn-primary" onClick={runNetnography} disabled={loading}>
          {loading ? 'Pesquisando...' : 'Executar pesquisa netnográfica'}
        </button>
        <ProgressDisplay message={progress} />
      </div>
    );
  }

  return (
    <div>
      {analysis.discursoDeRua && (
        <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discurso de rua</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{analysis.discursoDeRua}</p>
        </div>
      )}

      {analysis.fontes.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fontes pesquisadas ({analysis.fontes.length})</p>
          {analysis.fontes.map((fonte, i) => (
            <div key={i} className="card" style={{ marginBottom: '8px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === `fonte_${i}` ? null : `fonte_${i}`)}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>{fonte.fonte}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '8px' }}>{fonte.tipo} · {fonte.volume}</span>
                </div>
                <span style={{ fontSize: '11px', color: sentimentColor(fonte.sentimento), flexShrink: 0, marginLeft: '8px' }}>
                  ● {fonte.sentimento}
                </span>
              </div>
              {expanded === `fonte_${i}` && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.6 }}>{fonte.sintese}</p>
                  {fonte.citacoes.length > 0 && (
                    <div>
                      {fonte.citacoes.map((c, j) => (
                        <p key={j} style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '4px', paddingLeft: '10px', borderLeft: '2px solid var(--border)' }}>
                          "{c}"
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        {analysis.contradicoes.length > 0 && (
          <div style={{ padding: '10px', background: 'rgba(180,100,100,0.07)', borderRadius: '6px' }}>
            <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '6px' }}>Contradições</p>
            {analysis.contradicoes.map((c, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>— {c}</p>)}
          </div>
        )}
        {analysis.mitos.length > 0 && (
          <div style={{ padding: '10px', background: 'rgba(200,150,50,0.07)', borderRadius: '6px' }}>
            <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px' }}>Mitos do setor</p>
            {analysis.mitos.map((m, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>— {m}</p>)}
          </div>
        )}
      </div>

      {analysis.desejos.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desejos não atendidos</p>
          {analysis.desejos.map((d, i) => <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {d}</p>)}
        </div>
      )}

      {analysis.vocabularioComunidade.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vocabulário da comunidade</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {analysis.vocabularioComunidade.map((v, i) => (
              <span key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 10px' }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {analysis.oportunidades.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oportunidades identificadas</p>
          {analysis.oportunidades.map((o, i) => <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {o}</p>)}
        </div>
      )}

      {analysis.alertas.length > 0 && (
        <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.07)', borderRadius: '6px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '6px' }}>⚠ Alertas</p>
          {analysis.alertas.map((a, i) => <p key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>— {a}</p>)}
        </div>
      )}

      <button className="btn-small" style={{ marginTop: '6px', opacity: 0.6 }} onClick={runNetnography} disabled={loading}>
        {loading ? 'Reexecutando...' : '↺ Refazer pesquisa'}
      </button>
    </div>
  );
}

// ─── MÓDULO: SÍNTESE GERAL ────────────────────────────────────────────────────

function ModuleSynthesis({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (p: Project) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const synthesis = project.researchSynthesis;

  const progress = useProgressCycler([
    'Integrando dossiê de mercado...',
    'Cruzando com dados do site AMUM...',
    'Analisando redes sociais e tendências...',
    'Lendo discurso de rua da netnografia...',
    'Identificando contradições entre camadas...',
    'Elaborando síntese estratégica...',
    'Formulando perguntas para as entrevistas...',
  ], loading, 2500);

  async function generateSynthesis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'research_synthesis',
          projectContext: getProjectContext(project),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(`Erro: ${data.error}${data.detail ? ` — ${data.detail}` : ''}`);
      } else if (data.visaoGeral) {
        const updated = { ...project, researchSynthesis: data as ResearchSynthesis };
        saveProject(updated);
        onUpdate(updated);
        addIntel(project.id, {
          type: 'analise',
          title: 'Síntese geral da pesquisa',
          content: data.tensaoCentral || data.visaoGeral?.slice(0, 300),
          source: 'Síntese Geral',
        });
      } else {
        setError('Resposta inesperada. Tente novamente.');
      }
    } catch (e) {
      setError(`Erro de rede: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function downloadSynthesis() {
    if (!synthesis) return;
    const lines = [
      'AMUM — SÍNTESE GERAL DA PESQUISA',
      `${project.nome} · ${new Date(synthesis.createdAt).toLocaleDateString('pt-BR')}`,
      '',
      '═══════════════════════════════════════',
      '',
      'VISÃO GERAL',
      synthesis.visaoGeral,
      '',
      'TENSÃO CENTRAL',
      synthesis.tensaoCentral,
      '',
      'TERRITÓRIO DISPONÍVEL',
      synthesis.territorioDisponivel,
      '',
      'MAPA COMPETITIVO DIGITAL',
      synthesis.mapaCompetitivoDigital,
      '',
      'DISCURSO DE RUA',
      synthesis.discursoDeRua,
      '',
      'CONTRADIÇÕES CENTRAIS',
      ...synthesis.contradicoesCentral.map(c => `• ${c}`),
      '',
      'JANELAS DE OPORTUNIDADE',
      ...synthesis.janelasOportunidade.map(j => `→ ${j}`),
      '',
      'INSIGHTS INTEGRADOS',
      ...synthesis.insightsIntegrados.map(i => `— ${i}`),
      '',
      'RECOMENDAÇÕES ESTRATÉGICAS',
      ...synthesis.recomendacoesEstrategicas.map(r => `✓ ${r}`),
      '',
      'PERGUNTAS PARA AS ENTREVISTAS',
      ...synthesis.perguntasParaEntrevista.map((p, i) => `${i + 1}. ${p}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMUM_Sintese_Pesquisa_${project.nome.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!synthesis) {
    return (
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: 1.6 }}>
          Integra todos os módulos de pesquisa em um único relatório estratégico. Cruza achados do Dossiê, Redes Sociais, Google Trends e Netnografia para produzir insights que só aparecem na interseção — e as perguntas-chave para as entrevistas.
        </p>
        <div style={{ padding: '10px 12px', background: 'rgba(201,169,110,0.06)', borderRadius: '6px', marginBottom: '16px', border: '1px solid rgba(201,169,110,0.2)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--gold)' }}>Dados disponíveis para síntese: </strong>
            {[
              project.researchResults.length > 0 && 'Dossiê de Mercado',
              !!project.researchDirectives && 'Diretrizes',
              !!project.socialMediaAnalysis && 'Redes Sociais',
              !!project.trendsAnalysis && 'Google Trends',
              !!project.netnographyAnalysis && 'Netnografia',
            ].filter(Boolean).join(' · ') || 'Nenhum módulo executado ainda'}
          </p>
        </div>
        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(180,100,100,0.1)', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(180,100,100,0.3)' }}>
            <p style={{ fontSize: '12px', color: '#b56a6a' }}>{error}</p>
          </div>
        )}
        <button className="btn-primary" onClick={generateSynthesis} disabled={loading}>
          {loading ? 'Sintetizando...' : 'Gerar síntese geral da pesquisa'}
        </button>
        <ProgressDisplay message={progress} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Síntese concluída</p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{new Date(synthesis.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="btn-small" onClick={downloadSynthesis}>↓ Baixar .txt</button>
          <button className="btn-small" style={{ opacity: 0.6 }} onClick={generateSynthesis} disabled={loading}>{loading ? '...' : '↺ Regerar'}</button>
        </div>
      </div>
      {loading && <ProgressDisplay message={progress} />}

      {/* Tensão central */}
      <div style={{ padding: '14px 16px', background: 'rgba(201,169,110,0.08)', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.25)', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tensão central</p>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', fontFamily: 'Georgia, serif', lineHeight: 1.6, fontStyle: 'italic' }}>"{synthesis.tensaoCentral}"</p>
      </div>

      {/* Visão geral */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visão geral integrada</p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{synthesis.visaoGeral}</p>
      </div>

      {/* Grid: território + discurso */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px' }}>Território disponível</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{synthesis.territorioDisponivel}</p>
        </div>
        <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px' }}>Discurso de rua</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{synthesis.discursoDeRua}</p>
        </div>
      </div>

      {/* Mapa competitivo */}
      {synthesis.mapaCompetitivoDigital && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mapa competitivo digital</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{synthesis.mapaCompetitivoDigital}</p>
        </div>
      )}

      {/* Contradições */}
      {synthesis.contradicoesCentral.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#b56a6a', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contradições centrais</p>
          {synthesis.contradicoesCentral.map((c, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'rgba(180,100,100,0.06)', borderRadius: '4px', marginBottom: '6px', borderLeft: '3px solid rgba(180,100,100,0.4)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c}</p>
            </div>
          ))}
        </div>
      )}

      {/* Insights integrados */}
      {synthesis.insightsIntegrados.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insights integrados</p>
          {synthesis.insightsIntegrados.map((ins, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', paddingLeft: '12px', borderLeft: '2px solid var(--border)' }}>— {ins}</p>
          ))}
        </div>
      )}

      {/* Janelas de oportunidade */}
      {synthesis.janelasOportunidade.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#6ab56a', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Janelas de oportunidade</p>
          {synthesis.janelasOportunidade.map((j, i) => (
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {j}</p>
          ))}
        </div>
      )}

      {/* Recomendações */}
      {synthesis.recomendacoesEstrategicas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recomendações estratégicas</p>
          {synthesis.recomendacoesEstrategicas.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <span style={{ color: '#6ab56a', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✓</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r}</p>
            </div>
          ))}
        </div>
      )}

      {/* Perguntas para entrevistas */}
      {synthesis.perguntasParaEntrevista.length > 0 && (
        <div style={{ padding: '14px 16px', background: 'rgba(201,169,110,0.06)', borderRadius: '8px', border: '1px solid rgba(201,169,110,0.2)' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perguntas estratégicas para as entrevistas</p>
          {synthesis.perguntasParaEntrevista.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, flexShrink: 0, minWidth: '20px' }}>{i + 1}.</span>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STEP: PESQUISA PROFUNDA (5 módulos) ─────────────────────────────────────

function StepWebResearch({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const isDone = step.status === 'done' || step.status === 'skipped';

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  return (
    <div className="step-body">
      <ModuleDossie project={project} step={step} onUpdate={onUpdate} />

      {!isDone && project.researchResults.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
            {project.researchResults.length} tema(s) pesquisados. Aprovar para avançar.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-approve" onClick={handleApprove}>Aprovar Pesquisa de Mercado</button>
            <button className="btn-skip" onClick={handleSkip}>Pular</button>
          </div>
        </div>
      )}
      {!isDone && project.researchResults.length === 0 && (
        <div style={{ marginTop: '16px' }}>
          <button className="btn-skip" onClick={handleSkip}>Pular pesquisa de mercado</button>
        </div>
      )}
      {isDone && (
        <p className="step-done-msg" style={{ marginTop: '16px' }}>
          {step.status === 'skipped' ? 'Etapa pulada.' : `Pesquisa de mercado aprovada — ${project.researchResults.length} tema(s).`}
        </p>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Temas prioritários, ângulos específicos, fontes a priorizar..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Pesquisa de Mercado" />
    </div>
  );
}

// ─── STEP: AUDITORIA DE CANAIS DA MARCA ──────────────────────────────────────

function StepBrandAudit({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [profiles, setProfiles] = useState<string[]>(project.brandAuditProfiles || []);
  const [newUrl, setNewUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  function addUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed || profiles.includes(trimmed)) return;
    const updated = [...profiles, trimmed];
    setProfiles(updated);
    setNewUrl('');
    const proj = { ...project, brandAuditProfiles: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  function removeUrl(url: string) {
    const updated = profiles.filter(u => u !== url);
    setProfiles(updated);
    const proj = { ...project, brandAuditProfiles: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  async function runAudit() {
    if (profiles.length === 0) return;
    setRunning(true);
    const results = [...(project.brandAuditResults || [])];
    const ctx = getProjectContext(project);

    for (let i = 0; i < profiles.length; i++) {
      const url = profiles[i];
      setCurrentUrl(url);
      try {
        const res = await fetch('/api/openai-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'brand_channel_research', url, projectContext: ctx }),
        });
        const data = await res.json();
        if (!data.error) {
          const idx = results.findIndex(r => r.url === url);
          if (idx >= 0) results[idx] = data;
          else results.push(data);
          const proj = { ...project, brandAuditResults: [...results] };
          saveProject(proj);
          onUpdate(proj);
        }
      } catch { /* continue */ }
      if (i < profiles.length - 1) await new Promise(r => setTimeout(r, 4000));
    }
    setCurrentUrl('');
    setRunning(false);
  }

  async function runSynthesis() {
    setSynthesizing(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'brand_audit_synthesis',
          projectContext: getProjectContext(project),
          brandAuditResults: project.brandAuditResults,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        const proj = { ...project, brandAuditSynthesis: data };
        saveProject(proj);
        onUpdate(proj);
      }
    } finally {
      setSynthesizing(false);
    }
  }

  return (
    <div className="step-body">
      {/* URL inputs */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Insira os endereços dos canais próprios da marca — Instagram, LinkedIn, site, YouTube, TikTok ou qualquer canal ativo.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input
            className="input"
            style={{ flex: 1, fontSize: '13px' }}
            placeholder="https://instagram.com/nomemarca ou URL do canal"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUrl()}
            disabled={isDone}
          />
          <button className="btn-primary" onClick={addUrl} disabled={!newUrl.trim() || isDone} style={{ whiteSpace: 'nowrap' }}>
            + Adicionar
          </button>
        </div>
        {profiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {profiles.map(url => (
              <div key={url} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{url}</span>
                {project.brandAuditResults?.find(r => r.url === url) && (
                  <span style={{ fontSize: '11px', color: '#6ab56a' }}>✓</span>
                )}
                {running && currentUrl === url && (
                  <span style={{ fontSize: '11px', color: 'var(--gold)' }}>analisando…</span>
                )}
                {!isDone && (
                  <button onClick={() => removeUrl(url)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {!isDone && profiles.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button className="btn-primary" onClick={runAudit} disabled={running || synthesizing}>
            {running ? `Analisando: ${currentUrl.slice(0, 40)}…` : 'Analisar canais'}
          </button>
        </div>
      )}

      {/* Results per channel */}
      {project.brandAuditResults && project.brandAuditResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '10px' }}>
            {project.brandAuditResults.length} canal(is) analisado(s)
          </p>
          {project.brandAuditResults.map((r) => (
            <div key={r.url} className="card" style={{ marginBottom: '8px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === r.url ? null : r.url)}
              >
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '14px' }}>{r.canal}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', wordBreak: 'break-all' }}>{r.url}</p>
                </div>
                <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{expanded === r.url ? '▲' : '▼'}</span>
              </div>
              {expanded === r.url && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '10px' }}>{r.sintese}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div><span style={{ color: 'var(--text-dim)' }}>Tom:</span> <span style={{ color: 'var(--text-secondary)' }}>{r.tomDeVoz}</span></div>
                    <div><span style={{ color: 'var(--text-dim)' }}>Frequência:</span> <span style={{ color: 'var(--text-secondary)' }}>{r.frequencia}</span></div>
                    <div><span style={{ color: '#6ab56a' }}>✓ {r.pontoForte}</span></div>
                    <div><span style={{ color: '#c97b7b' }}>✗ {r.pontoFraco}</span></div>
                  </div>
                  {r.temas && r.temas.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {r.temas.map((t, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(201,169,110,0.1)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Synthesis */}
          {!project.brandAuditSynthesis && !isDone && (
            <button className="btn-primary" onClick={runSynthesis} disabled={synthesizing} style={{ marginTop: '8px' }}>
              {synthesizing ? 'Sintetizando análise diagnóstica…' : 'Gerar síntese diagnóstica'}
            </button>
          )}
        </div>
      )}

      {/* Synthesis result */}
      {project.brandAuditSynthesis && (
        <div className="ai-output" style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
            SÍNTESE DIAGNÓSTICA DOS CANAIS
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
            {project.brandAuditSynthesis.diagnostico}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>Coerência com posicionamento declarado</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
            {project.brandAuditSynthesis.coerencia}
          </p>
          {project.brandAuditSynthesis.contradicoes?.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>Contradições detectadas</p>
              {project.brandAuditSynthesis.contradicoes.map((c, i) => (
                <p key={i} style={{ fontSize: '13px', color: '#c97b7b', marginBottom: '4px' }}>• {c}</p>
              ))}
            </div>
          )}
          {project.brandAuditSynthesis.recomendacoes?.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>Direcionamentos estratégicos</p>
              {project.brandAuditSynthesis.recomendacoes.map((r, i) => (
                <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>→ {r}</p>
              ))}
            </div>
          )}
          <DownloadButton title={`Auditoria de Canais — ${project.nome}`} content={JSON.stringify(project.brandAuditSynthesis, null, 2)} />
        </div>
      )}

      {/* Approve */}
      {!isDone && project.brandAuditSynthesis && (
        <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-approve" onClick={handleApprove}>Aprovar Auditoria e continuar</button>
          <button className="btn-skip" onClick={handleSkip}>Pular</button>
        </div>
      )}
      {!isDone && !project.brandAuditSynthesis && (
        <div style={{ marginTop: '16px' }}>
          <button className="btn-skip" onClick={handleSkip}>Pular auditoria de canais</button>
        </div>
      )}
      {isDone && (
        <p className="step-done-msg" style={{ marginTop: '16px' }}>
          {step.status === 'skipped' ? 'Etapa pulada.' : `Auditoria aprovada — ${project.brandAuditResults?.length || 0} canal(is) analisado(s).`}
        </p>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Canais prioritários, aspectos específicos a observar, comparação com período anterior..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Auditoria de Canais da Marca" />
    </div>
  );
}

// ─── STEP: PESQUISA DE REDES SOCIAIS ─────────────────────────────────────────

function StepSocialResearch({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [profiles, setProfiles] = useState<string[]>(project.socialProfiles || []);
  const [newUrl, setNewUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  function addUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed || profiles.includes(trimmed)) return;
    const updated = [...profiles, trimmed];
    setProfiles(updated);
    setNewUrl('');
    const proj = { ...project, socialProfiles: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  function removeUrl(url: string) {
    const updated = profiles.filter(u => u !== url);
    setProfiles(updated);
    const proj = { ...project, socialProfiles: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  async function runListening() {
    if (profiles.length === 0) return;
    setRunning(true);
    const results = [...(project.socialListeningResults || [])];
    const ctx = getProjectContext(project);

    for (let i = 0; i < profiles.length; i++) {
      const url = profiles[i];
      setCurrentUrl(url);
      try {
        const res = await fetch('/api/openai-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'social_listening_item', url, projectContext: ctx }),
        });
        const data = await res.json();
        if (!data.error) {
          const idx = results.findIndex(r => r.url === url);
          if (idx >= 0) results[idx] = data;
          else results.push(data);
          const proj = { ...project, socialListeningResults: [...results] };
          saveProject(proj);
          onUpdate(proj);
        }
      } catch { /* continue */ }
      if (i < profiles.length - 1) await new Promise(r => setTimeout(r, 4000));
    }
    setCurrentUrl('');
    setRunning(false);
  }

  async function runSynthesis() {
    setSynthesizing(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social_expert_synthesis',
          projectContext: getProjectContext(project),
          socialListeningResults: project.socialListeningResults,
          brandAuditSynthesis: project.brandAuditSynthesis,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        const proj = { ...project, socialResearchSynthesis: data };
        saveProject(proj);
        onUpdate(proj);
      }
    } finally {
      setSynthesizing(false);
    }
  }

  return (
    <div className="step-body">
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Insira os endereços dos perfis de concorrentes, referências setoriais e marcas relevantes para o mercado deste cliente.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          className="input"
          style={{ flex: 1, fontSize: '13px' }}
          placeholder="https://instagram.com/concorrente ou URL de perfil/homepage"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addUrl()}
          disabled={isDone}
        />
        <button className="btn-primary" onClick={addUrl} disabled={!newUrl.trim() || isDone} style={{ whiteSpace: 'nowrap' }}>
          + Adicionar
        </button>
      </div>

      {profiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {profiles.map(url => (
            <div key={url} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{url}</span>
              {project.socialListeningResults?.find(r => r.url === url) && <span style={{ fontSize: '11px', color: '#6ab56a' }}>✓</span>}
              {running && currentUrl === url && <span style={{ fontSize: '11px', color: 'var(--gold)' }}>analisando…</span>}
              {!isDone && (
                <button onClick={() => removeUrl(url)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>×</button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isDone && profiles.length > 0 && (
        <button className="btn-primary" onClick={runListening} disabled={running || synthesizing} style={{ marginBottom: '16px' }}>
          {running ? `Analisando: ${currentUrl.slice(0, 40)}…` : 'Iniciar social listening'}
        </button>
      )}

      {project.socialListeningResults && project.socialListeningResults.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '10px' }}>
            {project.socialListeningResults.length} perfil(is) analisado(s)
          </p>
          {project.socialListeningResults.map(r => (
            <div key={r.url} className="card" style={{ marginBottom: '8px' }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === r.url ? null : r.url)}
              >
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '14px' }}>{r.entidade || r.url}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{r.arquetipo}</p>
                </div>
                <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{expanded === r.url ? '▲' : '▼'}</span>
              </div>
              {expanded === r.url && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '10px' }}>{r.posicionamento}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                    <div><span style={{ color: '#6ab56a' }}>✓ {r.pontoForte}</span></div>
                    <div><span style={{ color: '#c97b7b' }}>✗ {r.pontoFraco}</span></div>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>Território: {r.territorioOcupado}</p>
                  {r.temas && r.temas.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {r.temas.map((t, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(201,169,110,0.1)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-dim)' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!project.socialResearchSynthesis && !isDone && (
            <button className="btn-primary" onClick={runSynthesis} disabled={synthesizing} style={{ marginTop: '8px' }}>
              {synthesizing ? 'Gerando análise estratégica…' : 'Gerar síntese estratégica'}
            </button>
          )}
        </div>
      )}

      {project.socialResearchSynthesis && (
        <div className="ai-output" style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
            ANÁLISE ESTRATÉGICA — SOCIAL RESEARCH
          </p>
          {project.socialResearchSynthesis.territoriosOcupados?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px' }}>Territórios ocupados pelo mercado</p>
              {project.socialResearchSynthesis.territoriosOcupados.map((t, i) => (
                <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '3px' }}>• {t}</p>
              ))}
            </div>
          )}
          {project.socialResearchSynthesis.territoriosDisponiveis?.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '6px' }}>Territórios disponíveis</p>
              {project.socialResearchSynthesis.territoriosDisponiveis.map((t, i) => (
                <p key={i} style={{ fontSize: '13px', color: '#6ab56a', marginBottom: '3px' }}>→ {t}</p>
              ))}
            </div>
          )}
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '12px' }}>
            {project.socialResearchSynthesis.comparativoComMarca}
          </p>
          {project.socialResearchSynthesis.oportunidades?.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '4px' }}>Oportunidades identificadas</p>
              {project.socialResearchSynthesis.oportunidades.map((o, i) => (
                <p key={i} style={{ fontSize: '13px', color: 'var(--gold)', marginBottom: '4px' }}>◈ {o}</p>
              ))}
            </div>
          )}
          <DownloadButton title={`Social Research — ${project.nome}`} content={JSON.stringify(project.socialResearchSynthesis, null, 2)} />
        </div>
      )}

      {!isDone && project.socialResearchSynthesis && (
        <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-approve" onClick={handleApprove}>Aprovar Social Research e continuar</button>
          <button className="btn-skip" onClick={handleSkip}>Pular</button>
        </div>
      )}
      {!isDone && !project.socialResearchSynthesis && (
        <div style={{ marginTop: '16px' }}>
          <button className="btn-skip" onClick={handleSkip}>Pular pesquisa de redes sociais</button>
        </div>
      )}
      {isDone && (
        <p className="step-done-msg" style={{ marginTop: '16px' }}>
          {step.status === 'skipped' ? 'Etapa pulada.' : `Social Research aprovado — ${project.socialListeningResults?.length || 0} perfil(is) analisado(s).`}
        </p>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Concorrentes prioritários, plataformas específicas, ângulos de comparação..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Pesquisa de Redes Sociais" />
    </div>
  );
}

// ─── STEP: RELATÓRIO CONSOLIDADO ─────────────────────────────────────────────

function StepResearchReport({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isDone = step.status === 'done' || step.status === 'skipped';
  const fileRef = React.useRef<HTMLInputElement>(null);

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  async function generateReport() {
    setGenerating(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'consolidate_report',
          projectContext: getProjectContext(project),
          independentResearch: project.independentResearch || [],
        }),
      });
      const data = await res.json();
      if (data.report) {
        const proj = { ...project, consolidatedReport: data.report };
        saveProject(proj);
        onUpdate(proj);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Ler como base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Falha na leitura'));
        reader.readAsDataURL(file);
      });

      const extractRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', filename: file.name, fileType: file.type, size: file.size, base64 }),
      });
      const extractData = await extractRes.json();
      const fileContent = extractData.extractedText || '';
      if (!fileContent) {
        alert(extractData.error || 'Não foi possível extrair o texto do arquivo.');
        return;
      }

      // Gerar resumo estratégico
      const summaryRes = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Faça um resumo estratégico conciso (máximo 200 palavras) do seguinte documento, destacando os dados e insights mais relevantes para um projeto de branding:\n\n${fileContent.slice(0, 4000)}` }],
        }),
      });
      const summaryData = await summaryRes.json();
      const resumo = summaryData.text || fileContent.slice(0, 300);
      const content = fileContent;

      const newFile = {
        id: `ir_${Date.now()}`,
        filename: file.name,
        content,
        resumo,
        uploadedAt: new Date().toISOString(),
      };
      const updated = [...(project.independentResearch || []), newFile];
      const proj = { ...project, independentResearch: updated };
      saveProject(proj);
      onUpdate(proj);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeFile(id: string) {
    const updated = (project.independentResearch || []).filter(f => f.id !== id);
    const proj = { ...project, independentResearch: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  return (
    <div className="step-body">
      {/* Independent research uploads */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Inclua pesquisas independentes realizadas fora da plataforma — relatórios, estudos de mercado, análises externas. Elas serão analisadas e incorporadas ao relatório final.
        </p>
        {!isDone && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.doc"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn-primary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Processando arquivo…' : '+ Adicionar pesquisa independente'}
            </button>
          </div>
        )}

        {project.independentResearch && project.independentResearch.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {project.independentResearch.map(f => (
              <div key={f.id} style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>{f.filename}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{f.resumo}</p>
                  </div>
                  {!isDone && (
                    <button onClick={() => removeFile(f.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', marginLeft: '8px', flexShrink: 0 }}>×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate report */}
      {!isDone && (
        <button className="btn-primary" onClick={generateReport} disabled={generating} style={{ marginBottom: '20px' }}>
          {generating ? 'Gerando relatório consolidado…' : project.consolidatedReport ? 'Regenerar relatório' : 'Gerar relatório consolidado'}
        </button>
      )}

      {/* Report display */}
      {project.consolidatedReport && (
        <div className="ai-output" style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: 'var(--gold)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
            RELATÓRIO CONSOLIDADO DE PESQUISA
          </p>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {project.consolidatedReport}
          </div>
          <div style={{ marginTop: '16px' }}>
            <DownloadButton title={`Relatório Consolidado — ${project.nome}`} content={project.consolidatedReport} />
          </div>
        </div>
      )}

      {!isDone && project.consolidatedReport && (
        <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-approve" onClick={handleApprove}>Aprovar relatório e continuar</button>
          <button className="btn-skip" onClick={handleSkip}>Pular</button>
        </div>
      )}
      {!isDone && !project.consolidatedReport && (
        <div style={{ marginTop: '8px' }}>
          <button className="btn-skip" onClick={handleSkip}>Pular relatório consolidado</button>
        </div>
      )}
      {isDone && (
        <p className="step-done-msg" style={{ marginTop: '16px' }}>
          {step.status === 'skipped' ? 'Etapa pulada.' : 'Relatório consolidado aprovado.'}
        </p>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Ajustes no relatório, seções a reforçar, dados a incluir manualmente..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Relatório Consolidado" />
    </div>
  );
}

// ─── STEP: ROTEIROS DE ENTREVISTA ────────────────────────────────────────────

function StepInterviewScripts({
  project,
  step,
  onUpdate,
}: {
  project: Project;
  step: WorkflowStep;
  onUpdate: (p: Project) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formBio, setFormBio] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingQ, setEditingQ] = useState<{ ivId: string; qi: number } | null>(null);
  const [editText, setEditText] = useState('');
  const [newQ, setNewQ] = useState<string>('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }

  function addInterviewee() {
    if (!formNome.trim() || !formCargo.trim()) return;
    const iv: Interviewee = {
      id: `iv_${Date.now()}`,
      nome: formNome.trim(),
      cargo: formCargo.trim(),
      minibio: formBio.trim(),
      questions: [],
    };
    const updated = [...(project.interviewees || []), iv];
    const proj = { ...project, interviewees: updated };
    saveProject(proj);
    onUpdate(proj);
    setFormNome(''); setFormCargo(''); setFormBio('');
    setShowForm(false);
    setExpanded(iv.id);
  }

  function removeInterviewee(id: string) {
    const updated = (project.interviewees || []).filter(iv => iv.id !== id);
    const proj = { ...project, interviewees: updated };
    saveProject(proj);
    onUpdate(proj);
  }

  async function generateQuestions(iv: Interviewee) {
    setGenerating(iv.id);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_interview_questions',
          projectContext: getProjectContext(project),
          interviewee: { nome: iv.nome, cargo: iv.cargo, minibio: iv.minibio },
        }),
      });
      const data = await res.json();
      if (data.perguntas) {
        const updated = (project.interviewees || []).map(i =>
          i.id === iv.id ? { ...i, questions: data.perguntas, generatedAt: new Date().toISOString() } : i
        );
        const proj = { ...project, interviewees: updated };
        saveProject(proj);
        onUpdate(proj);
      }
    } finally {
      setGenerating(null);
    }
  }

  function saveEdit(ivId: string, qi: number) {
    const updated = (project.interviewees || []).map(iv => {
      if (iv.id !== ivId) return iv;
      const qs = [...iv.questions];
      qs[qi] = editText;
      return { ...iv, questions: qs };
    });
    const proj = { ...project, interviewees: updated };
    saveProject(proj); onUpdate(proj);
    setEditingQ(null); setEditText('');
  }

  function deleteQuestion(ivId: string, qi: number) {
    const updated = (project.interviewees || []).map(iv => {
      if (iv.id !== ivId) return iv;
      const qs = iv.questions.filter((_, i) => i !== qi);
      return { ...iv, questions: qs };
    });
    const proj = { ...project, interviewees: updated };
    saveProject(proj); onUpdate(proj);
  }

  function addQuestion(ivId: string) {
    if (!newQ.trim()) return;
    const updated = (project.interviewees || []).map(iv => {
      if (iv.id !== ivId) return iv;
      return { ...iv, questions: [...iv.questions, newQ.trim()] };
    });
    const proj = { ...project, interviewees: updated };
    saveProject(proj); onUpdate(proj);
    setNewQ(''); setAddingTo(null);
  }

  return (
    <div className="step-body">
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Cadastre cada entrevistado com nome, cargo e minibiografia. Com base em todo o contexto das pesquisas, o sistema gerará perguntas calibradas para cada pessoa. As perguntas são editáveis e você pode adicionar novas livremente.
      </p>

      {/* Add interviewee form */}
      {!isDone && !showForm && (
        <button className="btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '16px' }}>
          + Adicionar entrevistado
        </button>
      )}

      {showForm && (
        <div style={{ padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold)', marginBottom: '12px' }}>Novo entrevistado</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <input className="input" placeholder="Nome completo *" value={formNome} onChange={e => setFormNome(e.target.value)} style={{ fontSize: '13px' }} />
            <input className="input" placeholder="Cargo / função *" value={formCargo} onChange={e => setFormCargo(e.target.value)} style={{ fontSize: '13px' }} />
          </div>
          <textarea
            className="textarea"
            placeholder="Minibiografia — trajetória, experiência anterior, contexto relevante para a entrevista (opcional mas recomendado)"
            value={formBio}
            onChange={e => setFormBio(e.target.value)}
            rows={3}
            style={{ fontSize: '13px', width: '100%', marginBottom: '10px', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-approve" onClick={addInterviewee} disabled={!formNome.trim() || !formCargo.trim()}>Adicionar</button>
            <button className="btn-skip" onClick={() => { setShowForm(false); setFormNome(''); setFormCargo(''); setFormBio(''); }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Interviewees list */}
      {(project.interviewees || []).map(iv => (
        <div key={iv.id} className="card" style={{ marginBottom: '12px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div
              style={{ cursor: 'pointer', flex: 1 }}
              onClick={() => setExpanded(expanded === iv.id ? null : iv.id)}
            >
              <p style={{ fontWeight: 600, color: 'var(--gold)', fontSize: '14px' }}>{iv.nome}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                {iv.cargo}
                {iv.questions.length > 0 && <span style={{ marginLeft: '8px', color: '#6ab56a' }}>• {iv.questions.length} perguntas</span>}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {!isDone && (
                <button
                  className="btn-primary"
                  onClick={() => generateQuestions(iv)}
                  disabled={generating === iv.id}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  {generating === iv.id ? 'Gerando…' : iv.questions.length > 0 ? 'Regerar' : 'Gerar perguntas'}
                </button>
              )}
              {!isDone && (
                <button
                  onClick={() => removeInterviewee(iv.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                >
                  ×
                </button>
              )}
              <button
                onClick={() => setExpanded(expanded === iv.id ? null : iv.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
              >
                {expanded === iv.id ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Expanded content */}
          {expanded === iv.id && (
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              {iv.minibio && (
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '12px', lineHeight: 1.5 }}>
                  {iv.minibio}
                </p>
              )}

              {iv.questions.length === 0 && generating !== iv.id && (
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Nenhuma pergunta gerada ainda. Clique em &quot;Gerar perguntas&quot; para iniciar.
                </p>
              )}
              {generating === iv.id && (
                <p style={{ fontSize: '13px', color: 'var(--gold)' }}>
                  Gerando perguntas calibradas para {iv.cargo}…
                </p>
              )}

              {iv.questions.length > 0 && (
                <ol style={{ paddingLeft: '0', listStyle: 'none', margin: '0' }}>
                  {iv.questions.map((q, qi) => (
                    <li key={qi} style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', minWidth: '18px', paddingTop: '2px' }}>{qi + 1}.</span>
                      {editingQ?.ivId === iv.id && editingQ.qi === qi ? (
                        <div style={{ flex: 1 }}>
                          <textarea
                            className="textarea"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            rows={2}
                            style={{ fontSize: '13px', width: '100%', marginBottom: '6px', resize: 'vertical' }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn-approve" onClick={() => saveEdit(iv.id, qi)} style={{ fontSize: '12px', padding: '4px 10px' }}>Salvar</button>
                            <button className="btn-skip" onClick={() => setEditingQ(null)} style={{ fontSize: '12px', padding: '4px 10px' }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{q}</p>
                          {!isDone && (
                            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                              <button
                                onClick={() => { setEditingQ({ ivId: iv.id, qi }); setEditText(q); }}
                                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}
                                title="Editar"
                              >✎</button>
                              <button
                                onClick={() => deleteQuestion(iv.id, qi)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}
                                title="Remover"
                              >×</button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {/* Add custom question */}
              {!isDone && (
                <div style={{ marginTop: '10px' }}>
                  {addingTo === iv.id ? (
                    <div>
                      <textarea
                        className="textarea"
                        placeholder="Escreva a pergunta..."
                        value={newQ}
                        onChange={e => setNewQ(e.target.value)}
                        rows={2}
                        style={{ fontSize: '13px', width: '100%', marginBottom: '6px', resize: 'vertical' }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-approve" onClick={() => addQuestion(iv.id)} disabled={!newQ.trim()} style={{ fontSize: '12px', padding: '4px 10px' }}>Adicionar</button>
                        <button className="btn-skip" onClick={() => { setAddingTo(null); setNewQ(''); }} style={{ fontSize: '12px', padding: '4px 10px' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(iv.id)}
                      style={{ fontSize: '12px', color: 'var(--text-dim)', background: 'none', border: '1px dashed var(--border)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer' }}
                    >
                      + Adicionar pergunta manualmente
                    </button>
                  )}
                </div>
              )}

              {iv.questions.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <DownloadButton
                    title={`Roteiro — ${iv.nome} (${iv.cargo})`}
                    content={`ENTREVISTADO: ${iv.nome}\nCARGO: ${iv.cargo}\n${iv.minibio ? `PERFIL: ${iv.minibio}\n` : ''}\nROTEIRO DE ENTREVISTA:\n\n${iv.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Approve */}
      {!isDone && (project.interviewees || []).some(iv => iv.questions.length > 0) && (
        <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
          <button className="btn-approve" onClick={handleApprove}>Aprovar roteiros e continuar</button>
          <button className="btn-skip" onClick={handleSkip}>Pular</button>
        </div>
      )}
      {!isDone && !(project.interviewees || []).some(iv => iv.questions.length > 0) && (
        <div style={{ marginTop: '16px' }}>
          <button className="btn-skip" onClick={handleSkip}>Pular roteiros de entrevista</button>
        </div>
      )}
      {isDone && (
        <p className="step-done-msg" style={{ marginTop: '16px' }}>
          {step.status === 'skipped' ? 'Etapa pulada.' : `Roteiros aprovados — ${(project.interviewees || []).length} entrevistado(s).`}
        </p>
      )}
      <StepNotes step={step} project={project} onUpdate={onUpdate} placeholder="Observações gerais sobre a condução das entrevistas, aspectos sensíveis, ordem sugerida..." />
      <StepInlineChat step={step} project={project} onUpdate={onUpdate} stepLabel="Roteiros de Entrevista" />
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
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const isDone = step.status === 'done' || step.status === 'skipped';

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('Falha na leitura do arquivo'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract', filename: file.name, fileType: file.type, size: file.size, base64 }),
      });
      const data = await res.json();
      if (data.extractedText) {
        setRaw(data.extractedText);
        if (!filename) setFilename(file.name);
      } else {
        alert(data.error || 'Não foi possível extrair o texto do arquivo.');
      }
    } catch {
      alert('Erro ao processar o arquivo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="step-label" style={{ marginBottom: 0 }}>Transcrição (cole o texto ou carregue um arquivo)</label>
              <button
                className="btn-small"
                style={{ fontSize: '12px', opacity: uploading ? 0.6 : 1 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading || isDone}
              >
                {uploading ? 'Carregando…' : '↑ Carregar .txt ou .docx'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.docx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <textarea
              className="textarea"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="Cole aqui a transcrição da entrevista ou carregue um arquivo .txt/.docx…"
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
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar análise e continuar</button>
                <DownloadButton
                  title={`Análise de Decifração — ${project.nome}`}
                  content={analysis.status === 'done' ? [
                    `## Arquétipo\n${analysis.arquetipo}`,
                    `## Tensão Central\n${analysis.tensaoCentral}`,
                    `## Território Recomendado\n${analysis.territorioRecomendado}`,
                    `## Narrativa-Núcleo\n${analysis.narrativaNucleo}`,
                    `## Gaps Principais\n${analysis.gapsPrincipais.map(g => `- ${g}`).join('\n')}`,
                    `## Próximos Passos\n${analysis.proximosPassos.map(p => `- ${p}`).join('\n')}`,
                  ].join('\n\n') : ''}
                />
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

// ─── STEP: TOUCHPOINT AUDIT ───────────────────────────────────────────────────

function StepTouchpointAudit({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const audit = project.touchpointAudit;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'touchpoint_audit', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.touchpoints) {
        const updated = { ...project, touchpointAudit: data };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {audit ? `${audit.touchpoints.length} touchpoints mapeados · ${audit.quickWins.length} quick wins` : 'Auditoria aprovada'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!audit ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Gera inventário completo de touchpoints com score de peso/coerência e quick wins.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando inventário...' : 'Gerar Auditoria de Touchpoints'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Touchpoint','Canal','Peso','Coerência','Quick Win','Observação'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {audit.touchpoints.map((tp) => (
                      <tr key={tp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px', fontWeight: 500 }}>{tp.touchpoint}</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{tp.canal}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{ color: tp.peso >= 4 ? 'var(--gold)' : 'var(--text-muted)' }}>{tp.peso}/5</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{ color: tp.scoreCoerencia <= 2 ? '#e05252' : tp.scoreCoerencia >= 4 ? '#52c47a' : 'var(--text-muted)' }}>
                            {tp.scoreCoerencia}/5
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{tp.quickWin ? '⚡' : '—'}</td>
                        <td style={{ padding: '8px', color: 'var(--text-muted)', maxWidth: '200px', fontSize: '12px' }}>{tp.observacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {audit.quickWins.length > 0 && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px' }}>QUICK WINS PRIORITÁRIOS</p>
                  {audit.quickWins.map((qw, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>⚡ {qw}</p>
                  ))}
                </div>
              )}
              {audit.analise && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px' }}>ANÁLISE ESTRATÉGICA</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{audit.analise}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar e continuar</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!audit && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular esta etapa</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: INCOHERENCE MAP ─────────────────────────────────────────────────────

function StepIncoherenceMap({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const imap = project.incoherenceMap;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'incoherence_map', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.items) {
        const updated = { ...project, incoherenceMap: data };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const colStyle: React.CSSProperties = { flex: 1, minWidth: 0 };
  const colHeader: React.CSSProperties = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' as const };

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {imap ? `${imap.items.length} dimensões mapeadas · Gate 1 validado` : 'Mapa aprovado'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!imap ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Cruza o que a marca declara ser, o que ela faz e o que ela comunica — revelando os gaps que estruturam o reposicionamento.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando mapa...' : 'Gerar Mapa de Incoerências'}
              </button>
            </div>
          ) : (
            <>
              {imap.items.map((item, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', marginBottom: '12px' }}>{item.dimensao}</p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={colStyle}>
                      <p style={{ ...colHeader, color: '#4a9eff' }}>É (declara)</p>
                      <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{item.eDeclara}</p>
                    </div>
                    <div style={colStyle}>
                      <p style={{ ...colHeader, color: '#52c47a' }}>Faz</p>
                      <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{item.eFaz}</p>
                    </div>
                    <div style={colStyle}>
                      <p style={{ ...colHeader, color: '#e0a52a' }}>Fala</p>
                      <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{item.eFala}</p>
                    </div>
                  </div>
                  {item.discrepancia && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text)' }}>Gap: </strong>{item.discrepancia}
                    </p>
                  )}
                  {item.risco && (
                    <p style={{ fontSize: '12px', color: '#e05252' }}>
                      <strong>Risco: </strong>{item.risco}
                    </p>
                  )}
                </div>
              ))}
              {imap.implicacoesEstrategicas?.length > 0 && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px' }}>IMPLICAÇÕES ESTRATÉGICAS · GATE 1</p>
                  {imap.implicacoesEstrategicas.map((impl, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>→ {impl}</p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Liderança reconhece — Aprovar Gate 1</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!imap && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular esta etapa</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: POSITIONING THESIS ──────────────────────────────────────────────────

function StepPositioningThesis({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const thesis = project.positioningThesis;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'positioning_thesis', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.afirmacaoCentral) {
        const updated = { ...project, positioningThesis: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          {thesis && <p style={{ fontSize: '14px', color: 'var(--text)', fontStyle: 'italic', marginBottom: '12px' }}>"{thesis.afirmacaoCentral}"</p>}
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!thesis ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Não apenas "para onde vamos" — mas "o que deixamos de ser e fazer". Trade-offs explícitos são obrigatórios.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando tese...' : 'Gerar Tese de Posicionamento'}
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px' }}>AFIRMAÇÃO CENTRAL</p>
                <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.6, fontWeight: 500 }}>{thesis.afirmacaoCentral}</p>
              </div>
              {thesis.tradeoffs?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trade-offs</p>
                  {thesis.tradeoffs.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: '#e05252', fontWeight: 600, marginBottom: '2px' }}>ABANDONA</p>
                        <p style={{ fontSize: '13px', color: 'var(--text)' }}>{t.abandona}</p>
                      </div>
                      <div style={{ padding: '0 8px', color: 'var(--text-dim)', alignSelf: 'center' }}>→</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: '#52c47a', fontWeight: 600, marginBottom: '2px' }}>GANHA</p>
                        <p style={{ fontSize: '13px', color: 'var(--text)' }}>{t.ganha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {thesis.justificativa && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>JUSTIFICATIVA</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{thesis.justificativa}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Trade-offs aceitos — Aprovar</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!thesis && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: BRAND ARCHITECTURE ──────────────────────────────────────────────────

function StepBrandArchitecture({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const arch = project.brandArchitecture;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brand_architecture', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.portfolioMap || data.brandToOperating) {
        const updated = { ...project, brandArchitecture: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const prioColor = (p: string) => p === 'alta' ? '#e05252' : p === 'media' ? '#e0a52a' : 'var(--text-muted)';

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {arch ? `${arch.brandToOperating?.length || 0} funções mapeadas` : 'Arquitetura aprovada'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!arch ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Como o posicionamento se traduz em decisões por função — portfólio, nomenclatura e brand-to-operating model.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando arquitetura...' : 'Gerar Arquitetura de Marca'}
              </button>
            </div>
          ) : (
            <>
              {arch.portfolioMap && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>MAPA DE PORTFÓLIO</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{arch.portfolioMap}</p>
                </div>
              )}
              {arch.nomenclaturaRegras && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px' }}>REGRAS DE NOMENCLATURA</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{arch.nomenclaturaRegras}</p>
                </div>
              )}
              {arch.brandToOperating?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>BRAND-TO-OPERATING MODEL</p>
                  {arch.brandToOperating.map((b, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: '120px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{b.funcao}</p>
                        <p style={{ fontSize: '11px', color: prioColor(b.prioridade), marginTop: '2px' }}>{b.prioridade}</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>{b.implicacao}</p>
                        {b.responsavel && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Owner: {b.responsavel}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Owners nomeados — Aprovar Gate 2</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!arch && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: ODS MATRIX ──────────────────────────────────────────────────────────

function StepODSMatrix({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const matrix = project.odsMatrix;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ods_matrix', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.items) {
        const updated = { ...project, odsMatrix: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {matrix ? `${matrix.items.length} ODS selecionados com iniciativas verificáveis` : 'Matriz aprovada'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!matrix ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                ODS como comprometimento operacional — não linguagem cosmética. Iniciativas concretas, indicadores verificáveis, owners e cadência.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando matriz...' : 'Gerar Matriz ODS'}
              </button>
            </div>
          ) : (
            <>
              {matrix.items.map((item, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold)', marginBottom: '12px' }}>{item.ods}</p>
                  {item.iniciativas.map((ini, j) => (
                    <div key={j} style={{ background: 'var(--card-bg)', borderRadius: '6px', padding: '10px 12px', marginBottom: '6px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '6px' }}>{ini.descricao}</p>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}><strong>Indicador:</strong> {ini.indicador}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}><strong>Owner:</strong> {ini.owner}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}><strong>Cadência:</strong> {ini.cadencia}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Matriz ODS</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!matrix && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: BRAND PLATFORM ─────────────────────────────────────────────────────

function StepBrandPlatform({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const bp = project.brandPlatform;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brand_platform', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.proposito) {
        const updated = { ...project, brandPlatform: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() {
    const updated = project.brandPlatform
      ? { ...project, brandPlatform: { ...project.brandPlatform, aprovadoEm: new Date().toISOString() } }
      : project;
    saveProject(updated);
    onUpdate(approveStep(updated, step.id));
  }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const fieldStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' };
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '6px', textTransform: 'uppercase' as const };

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          {bp && <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', marginBottom: '4px' }}>"{bp.essencia}"</p>}
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
            {bp?.aprovadoEm ? `Assinada em ${new Date(bp.aprovadoEm).toLocaleDateString('pt-BR')}` : 'Plataforma aprovada · Gate 3'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!bp ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Documento-mãe: propósito, essência, posicionamento, promessa e valores com comportamentos operacionais.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando plataforma...' : 'Gerar Plataforma de Marca'}
              </button>
            </div>
          ) : (
            <>
              <div style={fieldStyle}><p style={labelStyle}>Propósito</p><p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{bp.proposito}</p></div>
              <div style={fieldStyle}><p style={labelStyle}>Essência</p><p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{bp.essencia}</p></div>
              <div style={fieldStyle}><p style={labelStyle}>Posicionamento</p><p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{bp.posicionamento}</p></div>
              <div style={fieldStyle}><p style={labelStyle}>Promessa</p><p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>{bp.promessa}</p></div>
              {bp.valores?.length > 0 && (
                <div style={fieldStyle}>
                  <p style={labelStyle}>Valores e comportamentos operacionais</p>
                  {bp.valores.map((v, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{v.valor}</p>
                      {v.comportamentos.map((c, j) => (
                        <p key={j} style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '12px', marginBottom: '3px' }}>• {c}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Plataforma assinada — Aprovar Gate 3</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!bp && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: LINGUISTIC CODE ─────────────────────────────────────────────────────

function StepLinguisticCode({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const lc = project.linguisticCode;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'linguistic_code', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.tomDeVoz) {
        const updated = { ...project, linguisticCode: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const sectionStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' };
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' as const };
  const tag = (txt: string, color = 'var(--text-muted)') => (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '100px', border: `1px solid ${color}`, color, fontSize: '12px', margin: '3px' }}>{txt}</span>
  );

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          {lc && <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Tom de voz: {lc.tomDeVoz.adjetivos.join(' · ')}</p>}
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!lc ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Tradução do posicionamento em linguagem operacional: tom, vocabulário, padrões de frase, exemplos e QA checklist.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando código...' : 'Gerar Código Linguístico'}
              </button>
            </div>
          ) : (
            <>
              <div style={sectionStyle}>
                <p style={labelStyle}>Tom de Voz</p>
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#52c47a', marginBottom: '4px', fontWeight: 600 }}>A marca é:</p>
                  {lc.tomDeVoz.adjetivos.map((a, i) => <React.Fragment key={i}>{tag(a, '#52c47a')}</React.Fragment>)}
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#e05252', marginBottom: '4px', fontWeight: 600 }}>A marca NÃO é:</p>
                  {lc.tomDeVoz.antiAdjetivos.map((a, i) => <React.Fragment key={i}>{tag(a, '#e05252')}</React.Fragment>)}
                </div>
              </div>
              {lc.vocabularioPreferencial?.length > 0 && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>Vocabulário Preferencial</p>
                  {lc.vocabularioPreferencial.map((v, i) => <React.Fragment key={i}>{tag(v, '#4a9eff')}</React.Fragment>)}
                  {lc.vocabularioProibido?.length > 0 && (
                    <>
                      <p style={{ fontSize: '11px', color: '#e05252', fontWeight: 600, margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Proibido:</p>
                      {lc.vocabularioProibido.map((v, i) => <React.Fragment key={i}>{tag(v, '#e05252')}</React.Fragment>)}
                    </>
                  )}
                </div>
              )}
              {lc.exemplosAplicacao?.length > 0 && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>Exemplos por Contexto</p>
                  {lc.exemplosAplicacao.map((ex, i) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '3px' }}>{ex.contexto}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid var(--gold)' }}>"{ex.exemplo}"</p>
                    </div>
                  ))}
                </div>
              )}
              {lc.qaChecklist?.length > 0 && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>QA Checklist</p>
                  {lc.qaChecklist.map((q, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>☐ {q}</p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Código Linguístico</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!lc && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: BRAND NARRATIVE ────────────────────────────────────────────────────

function StepBrandNarrative({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const narrative = project.brandNarrative;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'brand_narrative', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.manifesto) {
        const updated = { ...project, brandNarrative: { manifesto: data.manifesto, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
        setDraft(data.manifesto);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() {
    const updated = project.brandNarrative
      ? { ...project, brandNarrative: { ...project.brandNarrative, versaoAprovada: project.brandNarrative.manifesto } }
      : project;
    saveProject(updated);
    onUpdate(approveStep(updated, step.id));
  }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  function saveDraft() {
    if (!project.brandNarrative) return;
    const updated = { ...project, brandNarrative: { ...project.brandNarrative, manifesto: draft } };
    saveProject(updated); onUpdate(updated); setEditMode(false);
  }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Manifesto aprovado</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!narrative ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                O texto que ancora toda a comunicação — narrativa com força real, tensão e direção. Gerado a partir da Plataforma aprovada.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Escrevendo manifesto...' : 'Gerar Narrativa de Marca'}
              </button>
            </div>
          ) : editMode ? (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{ width: '100%', minHeight: '320px', background: 'var(--card-bg)', border: '1px solid var(--gold)', borderRadius: '8px', padding: '16px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={saveDraft}>Salvar edições</button>
                <button className="btn-skip" onClick={() => setEditMode(false)}>Cancelar</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
                {narrative.manifesto.split('\n\n').map((p, i) => (
                  <p key={i} style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, marginBottom: '16px' }}>{p}</p>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar versão final</button>
                <button className="btn-skip" onClick={() => { setDraft(narrative.manifesto); setEditMode(true); }}>Editar</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!narrative && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: MESSAGE LIBRARY ────────────────────────────────────────────────────

function StepMessageLibrary({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const library = project.messageLibrary;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message_library', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.items) {
        const updated = { ...project, messageLibrary: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {library ? `${library.items.length} públicos com afirmações e provas` : 'Biblioteca aprovada'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!library ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Sistema de narrativa verificável por público — afirmações centrais com provas concretas, não aspiração vazia.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando biblioteca...' : 'Gerar Biblioteca de Mensagens'}
              </button>
            </div>
          ) : (
            <>
              {library.items.map((item, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' }}>{item.publico}</p>
                  <p style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500, lineHeight: 1.5, marginBottom: '10px' }}>{item.afirmacaoCentral}</p>
                  {item.provas.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>PROVAS</p>
                      {item.provas.map((prova, j) => (
                        <p key={j} style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '10px', borderLeft: '2px solid var(--border)', marginBottom: '4px' }}>{prova}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Biblioteca</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!library && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: VISUAL DIRECTION ───────────────────────────────────────────────────

function StepVisualDirection({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const vd = project.visualDirection;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'visual_direction', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.principiosSimbolicos) {
        const updated = { ...project, visualDirection: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const sectionStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' };
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px', textTransform: 'uppercase' as const };

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Direção visual aprovada</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!vd ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Princípios simbólicos, paleta, tipografia e moodboard — diretrizes estratégicas que orientam qualquer designer que toque na marca.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando direção...' : 'Gerar Direção Visual'}
              </button>
            </div>
          ) : (
            <>
              {vd.principiosSimbolicos?.length > 0 && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>Princípios Simbólicos</p>
                  {vd.principiosSimbolicos.map((p, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--gold)' }}>→ {p}</p>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                {vd.paleta && (
                  <div style={{ ...sectionStyle, flex: 1 }}>
                    <p style={labelStyle}>Paleta</p>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{vd.paleta}</p>
                  </div>
                )}
                {vd.tipografia && (
                  <div style={{ ...sectionStyle, flex: 1 }}>
                    <p style={labelStyle}>Tipografia</p>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{vd.tipografia}</p>
                  </div>
                )}
              </div>
              {vd.moodboardReferencias?.length > 0 && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>Referências Moodboard</p>
                  {vd.moodboardReferencias.map((r, i) => (
                    <p key={i} style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>• {r}</p>
                  ))}
                </div>
              )}
              {vd.diretrizes && (
                <div style={sectionStyle}>
                  <p style={labelStyle}>Diretrizes para o Designer</p>
                  <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{vd.diretrizes}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Direção Visual</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!vd && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: ROLLOUT PLAN ───────────────────────────────────────────────────────

function StepRolloutPlan({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const plan = project.rolloutPlan;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollout_plan', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.ondas) {
        const updated = { ...project, rolloutPlan: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const ondaColors = ['#4a9eff', '#52c47a', '#e0a52a'];

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
            {plan ? `${plan.ondas.length} ondas de rollout definidas` : 'Plano aprovado'}
          </p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!plan ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Reposicionamento por ondas — Interno → Parceiros → Mercado. Cada onda com touchpoints, responsáveis, timeline e critério de conclusão.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando plano...' : 'Gerar Plano de Rollout'}
              </button>
            </div>
          ) : (
            <>
              {plan.ondas.map((onda, i) => (
                <div key={i} style={{ border: `1px solid ${ondaColors[i] || 'var(--border)'}`, borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: ondaColors[i] || 'var(--text)' }}>{onda.onda}</p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--card-bg)', padding: '3px 10px', borderRadius: '100px' }}>{onda.timeline}</span>
                  </div>
                  {onda.touchpoints?.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>TOUCHPOINTS</p>
                      {onda.touchpoints.map((t, j) => <p key={j} style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '2px' }}>• {t}</p>)}
                    </div>
                  )}
                  {onda.responsaveis?.length > 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <strong>Responsáveis:</strong> {onda.responsaveis.join(', ')}
                    </p>
                  )}
                  {onda.criteriosConclusao?.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>CRITÉRIOS DE CONCLUSÃO</p>
                      {onda.criteriosConclusao.map((c, j) => <p key={j} style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '2px' }}>✓ {c}</p>)}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Plano de Rollout · Gate 4</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!plan && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: ENABLEMENT KIT ─────────────────────────────────────────────────────

function StepEnablementKit({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const kit = project.enablementKit;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enablement_kit', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.faqs || data.templates) {
        const updated = { ...project, enablementKit: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Kit de habilitação aprovado</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!kit ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                FAQs, templates, trilha de adoção por área e checklist de QA — o que permite aplicar a marca sem o estrategista na sala.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando kit...' : 'Gerar Kit de Habilitação'}
              </button>
            </div>
          ) : (
            <>
              {kit.faqs?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>FAQs DE APLICAÇÃO</p>
                  {kit.faqs.map((f, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Q: {f.pergunta}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', paddingLeft: '8px' }}>A: {f.resposta}</p>
                    </div>
                  ))}
                </div>
              )}
              {kit.checklistQA?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '8px' }}>QA CHECKLIST DE LINGUAGEM</p>
                  {kit.checklistQA.map((q, i) => (
                    <p key={i} style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '4px' }}>☐ {q}</p>
                  ))}
                </div>
              )}
              {kit.trilhaAdocao?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>TRILHA DE ADOÇÃO POR ÁREA</p>
                  {kit.trilhaAdocao.map((area, i) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{area.area}</p>
                      {area.passos.map((p, j) => (
                        <p key={j} style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '10px', marginBottom: '2px' }}>{j + 1}. {p}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Kit de Habilitação</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!kit && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: TRAINING DESIGN ────────────────────────────────────────────────────

function StepTrainingDesign({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const [loading, setLoading] = React.useState(false);
  const td = project.trainingDesign;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'training_design', projectContext: getProjectContext(project) }),
      });
      const data = await res.json();
      if (data.formatos || data.agenda) {
        const updated = { ...project, trainingDesign: { ...data, createdAt: new Date().toISOString() } };
        saveProject(updated); onUpdate(updated);
      }
    } finally { setLoading(false); }
  }

  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Programa de treinamento aprovado</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!td ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Objetivos por público, formatos, agenda e materiais — o que transforma posicionamento em comportamento real.
              </p>
              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? 'Gerando programa...' : 'Gerar Programa de Treinamento'}
              </button>
            </div>
          ) : (
            <>
              {td.objetivosPorPublico?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>OBJETIVOS POR PÚBLICO</p>
                  {td.objetivosPorPublico.map((item, i) => (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{item.publico}</p>
                      {item.objetivos.map((o, j) => (
                        <p key={j} style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '10px', marginBottom: '2px' }}>• {o}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              {td.agenda?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>AGENDA</p>
                  {td.agenda.map((bloco, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < td.agenda.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ minWidth: '40px', fontSize: '12px', color: 'var(--text-muted)' }}>{bloco.duracao}</span>
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text)' }}>{bloco.bloco}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bloco.formato}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Programa de Treinamento</button>
                <button className="btn-skip" onClick={handleGenerate} disabled={loading}>
                  {loading ? 'Regenerando...' : 'Regenerar'}
                </button>
              </div>
            </>
          )}
          {!td && <button className="btn-skip" onClick={handleSkip} style={{ marginTop: '8px' }}>Pular</button>}
        </>
      )}
    </div>
  );
}

// ─── STEP: COHERENCE MONITOR (Fase 5) ────────────────────────────────────────

function StepCoherenceMonitor({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const monitor = project.coherenceMonitor;
  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  const scoreColor = (s: number) => s >= 8 ? '#52c47a' : s >= 5 ? '#e0a52a' : '#e05252';
  const tendenciaIcon = (t: string) => t === 'subindo' ? '↑' : t === 'caindo' ? '↓' : '→';

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Monitor ativo · Gate 5</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <>
          {!monitor ? (
            <div style={{ padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Painel trimestral de coerência de marca — scorecard com tendências e plano corretivo. Configure o primeiro trimestre de monitoramento.
              </p>
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  O monitor de coerência é configurado manualmente após o primeiro ciclo de aplicação do reposicionamento. Aprovação aqui significa que a cadência e os owners foram definidos — Gate 5.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Sistema de gestão ativo — Aprovar Gate 5</button>
                <button className="btn-skip" onClick={handleSkip}>Pular</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {monitor.scores.map((s, i) => (
                  <div key={i} style={{ border: `1px solid ${scoreColor(s.score)}`, borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{s.dimensao}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: scoreColor(s.score) }}>
                      {s.score} <span style={{ fontSize: '14px' }}>{tendenciaIcon(s.tendencia)}</span>
                    </p>
                    {s.planoCorretivo && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.planoCorretivo}</p>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-approve" onClick={handleApprove}>Aprovar Gate 5</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── STEP: COMPLIANCE AUDIT (Fase 5) ─────────────────────────────────────────

function StepComplianceAudit({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const audit = project.complianceAudit;
  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Auditoria de compliance registrada</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Auditoria de aderência por touchpoint — amostragem, % de conformidade por área, backlog priorizado. Realizada com dados reais após aplicação.
          </p>
          {!audit && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Auditoria realizada com amostragem real de materiais produzidos após o reposicionamento. Configure após o primeiro ciclo completo de aplicação (mínimo 60 dias pós-rollout).
              </p>
            </div>
          )}
          {audit && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
                Média geral: <span style={{ color: audit.mediaGeral >= 70 ? '#52c47a' : '#e05252' }}>{audit.mediaGeral}%</span>
              </p>
              {audit.itens.map((item, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 12px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{item.touchpoint}</p>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: item.percentualConformidade >= 70 ? '#52c47a' : '#e05252' }}>
                      {item.percentualConformidade}%
                    </span>
                  </div>
                  {item.backlogCorrecoes.length > 0 && (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Correções: {item.backlogCorrecoes.join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-approve" onClick={handleApprove}>Registrar auditoria como concluída</button>
            <button className="btn-skip" onClick={handleSkip}>Pular</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP: ANNUAL REVIEW (Fase 5) ─────────────────────────────────────────────

function StepAnnualReview({
  project, step, onUpdate,
}: { project: Project; step: WorkflowStep; onUpdate: (p: Project) => void }) {
  const review = project.annualReview;
  function handleApprove() { onUpdate(approveStep(project, step.id)); }
  function handleSkip() { onUpdate(skipStep(project, step.id)); }
  function handleReopen() { onUpdate(reopenStep(project, step.id)); }

  return (
    <div style={{ padding: '0 16px 24px' }}>
      {step.status === 'done' ? (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>Revisão anual aprovada e registrada</p>
          <button className="btn-skip" onClick={handleReopen}>Reabrir</button>
        </div>
      ) : (
        <div style={{ padding: '24px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
            Business case anual da marca — KPIs conectados a resultados de negócio, análise de ROI e recomendações para o conselho.
          </p>
          {!review ? (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                A revisão anual é realizada com dados reais de performance — 12 meses após o início do rollout. Gera o documento executivo para conselho e finanças que transforma branding de custo em investimento com evidência.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {review.kpisMarca?.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '10px' }}>KPIs DE MARCA</p>
                  {review.kpisMarca.map((kpi, i) => (
                    <div key={i} style={{ marginBottom: '8px', padding: '8px', background: 'var(--card-bg)', borderRadius: '6px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{kpi.indicador}</p>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Meta: {kpi.meta}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Realizado: {kpi.realizado}</p>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{kpi.conexaoNegocio}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-approve" onClick={handleApprove}>Revisão anual concluída</button>
            <button className="btn-skip" onClick={handleSkip}>Pular</button>
          </div>
        </div>
      )}
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
                  {m.role === 'assistant' && m.content.length > 100 && (
                    <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <DownloadButton
                        title={`Entregável ${label} — mensagem ${i + 1}`}
                        content={m.content}
                      />
                    </div>
                  )}
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
    // Load from localStorage immediately
    const local = getProject(id);
    if (!local) { router.push('/projetos'); return; }
    setProject(local);

    // Then try Supabase for fresher data (cross-device sync)
    fetchProjectFromSupabase(id).then(remote => {
      if (remote) {
        setProject(remote);
        // Also update localStorage so it stays consistent
        saveProject(remote);
      }
    }).catch(() => {});
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
                          {step.type === 'brand_audit' && (
                            <StepBrandAudit project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'social_research' && (
                            <StepSocialResearch project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'research_report' && (
                            <StepResearchReport project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'interview_scripts' && (
                            <StepInterviewScripts project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'scripts' && (
                            <StepScripts project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'transcripts' && (
                            <StepTranscripts project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'touchpoint_audit' && (
                            <StepTouchpointAudit project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'incoherence_map' && (
                            <StepIncoherenceMap project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'deep_analysis' && (
                            <StepDeepAnalysis project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'positioning_thesis' && (
                            <StepPositioningThesis project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'brand_architecture' && (
                            <StepBrandArchitecture project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'ods_matrix' && (
                            <StepODSMatrix project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'brand_platform' && (
                            <StepBrandPlatform project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'linguistic_code' && (
                            <StepLinguisticCode project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'brand_narrative' && (
                            <StepBrandNarrative project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'message_library' && (
                            <StepMessageLibrary project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'visual_direction' && (
                            <StepVisualDirection project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'rollout_plan' && (
                            <StepRolloutPlan project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'enablement_kit' && (
                            <StepEnablementKit project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'training_design' && (
                            <StepTrainingDesign project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'coherence_monitor' && (
                            <StepCoherenceMonitor project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'compliance_audit' && (
                            <StepComplianceAudit project={project} step={step} onUpdate={handleUpdate} />
                          )}
                          {step.type === 'annual_review' && (
                            <StepAnnualReview project={project} step={step} onUpdate={handleUpdate} />
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
