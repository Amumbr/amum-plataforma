'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getProjects, Project, PHASE_NAMES } from '@/lib/store';

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h2>Projetos</h2>
          <p>Gestão de projetos de branding estratégico</p>
        </div>

        <div className="project-grid">
          {projects.map(p => {
            const unread = p.intel.filter(i => !i.read).length;
            const totalTasks = Object.values(p.tasks).flat().length;
            const doneTasks = Object.values(p.tasks).flat().filter(t => t.done).length;

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
                    <span className="badge badge-gold">Fase {p.faseAtual} — {PHASE_NAMES[p.faseAtual]}</span>
                    <span className="badge badge-dim">{p.investimento}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
                    {p.status}
                  </div>

                  {/* Phase bar */}
                  <div className="phase-bar">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className={`phase-dot ${n < p.faseAtual ? 'done' : n === p.faseAtual ? 'active' : ''}`}
                        title={PHASE_NAMES[n]}
                      />
                    ))}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
                    {doneTasks}/{totalTasks} tarefas concluídas
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {projects.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '60px' }}>
            Nenhum projeto encontrado.
          </div>
        )}
      </main>
    </div>
  );
}
