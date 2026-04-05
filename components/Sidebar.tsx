'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAuth } from '@/components/AuthGuard';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.replace('/login');
  }

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
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '4px 0',
            transition: 'color 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
