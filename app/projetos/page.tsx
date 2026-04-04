'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getProjects, deleteProject, Project, PHASE_NAMES } from '@/lib/store';
import { syncFromSupabase, bootstrapSupabase } from '@/lib/db';

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // id do projeto a excluir

  useEffect(() => {
    const local = getProjects();
    setProjects(local);

    setSyncing(true);
    syncFromSupabase().then(remote => {
      if (remote && remote.length > 0) {
        setProjects(remote);
      } else if (remote !== null && remote.length === 0) {
        bootstrapSupabase(local);
      }
    }).finally(() => setSyncing(false));
  }, []);

  function handleDelete(id: string) {
    deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDelete(null);
  }

  const toDelete = confirmDelete ? projects.find(p => p.id === confirmDelete) : null;

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h2>Projetos</h2>
            <p>
              Gestão de projetos de branding estratégico
              {syncing && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>● sincronizando...</span>}
            </p>
          </div>
          <Link href="/projetos/novo">
            <button className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
              + Novo projeto
            </button>
          </Link>
        </div>

        {/* Modal de confirmação de exclusão */}
        {confirmDelete && toDelete && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '28px 32px', maxWidth: '400px', width: '90%',
            }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
                Excluir projeto?
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text)' }}>{toDelete.nome}</strong> será removido permanentemente do localStorage e do Supabase. Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                    background: '#c0392b', color: '#fff', fontSize: '13px',
                    fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Excluir permanentemente
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '6px',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text)', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="project-grid">
          {projects.map(p => {
            const unread = p.intel.filter(i => !i.read).length;
            const steps = p.workflowSteps || [];
            const doneSteps = steps.filter(s => s.status === 'done' || s.status === 'skipped').length;
            const activeStep = steps.find(s => s.status === 'active');
            const faseAtiva = activeStep?.fase ?? p.faseAtual ?? 1;
            const progress = steps.length > 0 ? Math.round((doneSteps / steps.length) * 100) : 0;

            return (
              <div key={p.id} style={{ position: 'relative' }}>
                {/* Botão excluir */}
                <button
                  onClick={(e) => { e.preventDefault(); setConfirmDelete(p.id); }}
                  title="Excluir projeto"
                  style={{
                    position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                    background: 'transparent', border: '1px solid transparent',
                    borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                    color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#c0392b';
                    (e.currentTarget as HTMLButtonElement).style.color = '#c0392b';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                  }}
                >
                  ✕
                </button>

                <Link href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div className="project-card" style={{ paddingRight: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <h3>{p.nome}</h3>
                      {unread > 0 && (
                        <span className="badge badge-gold" style={{ marginRight: '20px' }}>{unread} intel</span>
                      )}
                    </div>
                    <div className="project-sector">{p.setor}</div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span className="badge badge-gold">Fase {faseAtiva} — {PHASE_NAMES[faseAtiva]}</span>
                      <span className="badge badge-dim">{p.investimento}</span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
                      {p.status}
                    </div>

                    <div className="progress-bar-container">
                      <div className="progress-bar" style={{ width: `${progress}%` }} />
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      {doneSteps}/{steps.length} etapas concluídas
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '60px' }}>
            <p style={{ marginBottom: '16px' }}>Nenhum projeto encontrado.</p>
            <Link href="/projetos/novo">
              <button className="btn-primary">+ Criar primeiro projeto</button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

