'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PhaseWorkspace from '@/components/PhaseWorkspace';
import TranscriptPanel from '@/components/TranscriptPanel';
import ResearchPanel from '@/components/ResearchPanel';
import IntelFeed from '@/components/IntelFeed';
import { getProject, saveProject, Project, PHASE_NAMES } from '@/lib/store';

type Tab = 'visao' | 'workspace' | 'transcricoes' | 'pesquisa' | 'intel';

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>('visao');

  useEffect(() => {
    const p = getProject(id);
    if (!p) { router.push('/projetos'); return; }
    setProject(p);
  }, [id, router]);

  function handleUpdate(p: Project) {
    setProject({ ...p });
    saveProject(p);
  }

  if (!project) return (
    <div className="layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: '24px', height: '24px' }} />
      </main>
    </div>
  );

  const unread = project.intel.filter(i => !i.read).length;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'visao', label: 'Visão Geral' },
    { key: 'workspace', label: 'Workspace IA' },
    { key: 'transcricoes', label: 'Transcrições' },
    { key: 'pesquisa', label: 'Pesquisa' },
    { key: 'intel', label: `Intel Feed${unread > 0 ? ` (${unread})` : ''}` },
  ];

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => router.push('/projetos')}>
                  Projetos
                </span>
                {' '}→ {project.nome}
              </div>
              <h2>{project.nome}</h2>
              <p>{project.setor}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span className="badge badge-gold">Fase {project.faseAtual} — {PHASE_NAMES[project.faseAtual]}</span>
              <span className="badge badge-dim">{project.investimento}</span>
            </div>
          </div>

          {/* Phase bar */}
          <div className="phase-bar" style={{ marginTop: '16px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                className={`phase-dot ${n < project.faseAtual ? 'done' : n === project.faseAtual ? 'active' : ''}`}
                title={`Fase ${n}: ${PHASE_NAMES[n]}`}
              />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'visao' && (
          <div>
            <div className="grid-2" style={{ marginBottom: '24px' }}>
              <div className="card">
                <div className="section-title">Dados do Projeto</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Setor', project.setor],
                      ['Investimento', project.investimento],
                      ['Escopo', project.escopo],
                      ['Status', project.status],
                      ['Interlocutor', project.interlocutor],
                      ['Início', new Date(project.createdAt).toLocaleDateString('pt-BR')],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td style={{ padding: '6px 0', fontSize: '12px', color: 'var(--text-muted)', width: '35%', verticalAlign: 'top' }}>{label}</td>
                        <td style={{ padding: '6px 0', fontSize: '13px', color: 'var(--text-dim)' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <div className="section-title">Jornada de Fases</div>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 0',
                    borderBottom: n < 5 ? '1px solid var(--border)' : 'none',
                    opacity: n > project.faseAtual ? 0.4 : 1,
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: n < project.faseAtual ? 'var(--gold-dim)' : n === project.faseAtual ? 'var(--gold)' : 'var(--border)',
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: '13px', color: n === project.faseAtual ? 'var(--text)' : 'var(--text-dim)' }}>
                        {n}. {PHASE_NAMES[n]}
                      </div>
                    </div>
                    {n === project.faseAtual && (
                      <span className="badge badge-gold" style={{ marginLeft: 'auto', fontSize: '10px' }}>Atual</span>
                    )}
                    {n < project.faseAtual && (
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--gold-dim)' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="section-title">Intel Feed Recente</div>
              <IntelFeed items={project.intel} compact />
            </div>
          </div>
        )}

        {tab === 'workspace' && (
          <PhaseWorkspace project={project} onUpdate={handleUpdate} />
        )}

        {tab === 'transcricoes' && (
          <TranscriptPanel project={project} onUpdate={handleUpdate} />
        )}

        {tab === 'pesquisa' && (
          <ResearchPanel project={project} />
        )}

        {tab === 'intel' && (
          <div>
            <div className="page-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px' }}>Intel Feed</h2>
              <p>{project.intel.length} itens · {unread} não lidos</p>
            </div>
            <IntelFeed items={project.intel} />
          </div>
        )}
      </main>
    </div>
  );
}
