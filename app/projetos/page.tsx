'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getProjects, Project, PHASE_NAMES } from '@/lib/store';
import { syncFromSupabase, bootstrapSupabase } from '@/lib/db';

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load from localStorage immediately
    const local = getProjects();
    setProjects(local);

    // Then sync from Supabase in background
    setSyncing(true);
    syncFromSupabase().then(remote => {
      if (remote && remote.length > 0) {
        setProjects(remote);
      } else if (remote !== null && remote.length === 0) {
        // Supabase is configured but empty — bootstrap with local data
        bootstrapSupabase(local);
      }
    }).finally(() => setSyncing(false));
  }, []);

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

        <div className="project-grid">
          {projects.map(p => {
            const unread = p.intel.filter(i => !i.read).length;
            const steps = p.workflowSteps || [];
            const doneSteps = steps.filter(s => s.status === 'done' || s.status === 'skipped').length;
            const activeStep = steps.find(s => s.status === 'active');
            const faseAtiva = activeStep?.fase ?? p.faseAtual ?? 1;
            const progress = steps.length > 0 ? Math.round((doneSteps / steps.length) * 100) : 0;

            return (
              <Link key={p.id} href={`/projetos/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="project-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3>{p.nome}</h3>
                    {unread > 0 && (
                      <span className="badge badge-gold">{unread} intel</span>
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
