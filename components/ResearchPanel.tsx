'use client';
import { Project } from '@/lib/store';

interface Props { project: Project }

export default function ResearchPanel({ project }: Props) {
  const r = project.research;

  return (
    <div>
      <div className="section">
        <div className="section-title">Tensão Central</div>
        <div className="card">
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: 'var(--gold)', lineHeight: '1.6' }}>
            "{r.tensaoCentral}"
          </p>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Território Disponível</div>
        <div className="card">
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', lineHeight: '1.6' }}>{r.territorioDisponivel}</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="section">
          <div className="section-title">Mapa Competitivo</div>
          <div className="card">
            {r.concorrentes.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < r.concorrentes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '13px' }}>{c.nome}</span>
                <span className="badge badge-dim">{c.arquetipo}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Contexto Macro</div>
          <div className="card">
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.7', marginBottom: '16px' }}>{r.contextoMacro}</p>
            <div className="section-title" style={{ marginBottom: '8px' }}>Benchmark</div>
            {r.benchmark.map((b, i) => (
              <div key={i} style={{ fontSize: '13px', color: 'var(--text-dim)', padding: '6px 0', borderBottom: i < r.benchmark.length - 1 ? '1px solid var(--border)' : 'none', lineHeight: '1.5' }}>
                → {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
