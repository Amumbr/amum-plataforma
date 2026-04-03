'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>AMUM</h1>
        <p>Plataforma Interna</p>
      </div>
      <nav className="sidebar-nav">
        <Link href="/projetos" className={pathname.startsWith('/projetos') ? 'active' : ''}>
          Projetos
        </Link>
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          METODOLOGIA
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.8' }}>
          Escuta · Decifração<br />
          Reconstrução · Travessia<br />
          Regeneração
        </p>
      </div>
    </div>
  );
}
