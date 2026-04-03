'use client';
import { useState, useRef, useEffect } from 'react';
import { Project, PHASE_NAMES, saveProject } from '@/lib/store';

interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  project: Project;
  onUpdate: (p: Project) => void;
}

export default function PhaseWorkspace({ project, onUpdate }: Props) {
  const [phase, setPhase] = useState(project.faseAtual);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const tasks = project.tasks[phase] || [];

  function toggleTask(taskId: string) {
    const updated = { ...project };
    updated.tasks = { ...project.tasks };
    updated.tasks[phase] = project.tasks[phase].map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    saveProject(updated);
    onUpdate(updated);
  }

  function buildContext() {
    const intel = project.intel
      .slice(0, 5)
      .map(i => `[${i.type.toUpperCase()}] ${i.title}: ${i.content}`)
      .join('\n');

    return `PROJETO: ${project.nome}
SETOR: ${project.setor}
FASE ATUAL: ${phase} — ${PHASE_NAMES[phase]}
INVESTIMENTO: ${project.investimento}
ESCOPO: ${project.escopo}
STATUS: ${project.status}

INTEL RECENTE:
${intel || 'Nenhum intel registrado ainda.'}

PESQUISA:
Tensão central: ${project.research.tensaoCentral}
Território disponível: ${project.research.territorioDisponivel}
Concorrentes: ${project.research.concorrentes.map(c => `${c.nome} (${c.arquetipo})`).join(', ')}`;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          projectContext: buildContext(),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.text || 'Erro na resposta.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão.' }]);
    } finally {
      setLoading(false);
    }
  }

  const done = tasks.filter(t => t.done).length;

  return (
    <div>
      {/* Phase selector */}
      <div className="phases-selector">
        {[1, 2, 3, 4, 5].map(p => (
          <button
            key={p}
            className={`phase-btn ${phase === p ? 'active' : ''}`}
            onClick={() => setPhase(p)}
          >
            {p}. {PHASE_NAMES[p]}
          </button>
        ))}
      </div>

      <div className="grid-2">
        {/* Tasks */}
        <div>
          <div className="section-title">
            Tarefas — Fase {phase}: {PHASE_NAMES[phase]}
            <span style={{ marginLeft: '8px', color: 'var(--gold)' }}>{done}/{tasks.length}</span>
          </div>
          <div className="card">
            {tasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sem tarefas para esta fase.</p>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    id={task.id}
                  />
                  <label htmlFor={task.id}>{task.text}</label>
                </div>
              ))
            )}
          </div>

          {/* Phase progress bar */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                  background: 'var(--gold)',
                  borderRadius: '2px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {done === tasks.length && tasks.length > 0 ? '✓ Gate disponível para validação' : `${tasks.length - done} tarefas pendentes`}
            </p>
          </div>
        </div>

        {/* Chat */}
        <div>
          <div className="section-title">Inteligência AMUM</div>
          <div className="chat-container">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: 'auto' }}>
                  Pergunte sobre o projeto, peça análises,<br />roteiros de entrevista ou sínteses estratégicas.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="chat-msg assistant" style={{ color: 'var(--text-muted)' }}>
                  <span className="spinner" /> &nbsp;Processando…
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="chat-input-row">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunta ou solicitação..."
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={2}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={loading}>
                {loading ? '…' : '→'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
