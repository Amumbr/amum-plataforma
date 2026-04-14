'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth, isAuthenticated } from '@/components/AuthGuard';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/projetos');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAuth(data.email);
        router.replace('/projetos');
      } else {
        setError(data.error || 'Credenciais inválidas.');
        setLoading(false);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* Logo / marca */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.75rem',
            letterSpacing: '0.25em',
            color: 'var(--gold)',
            marginBottom: '0.35rem',
          }}>
            AMUM
          </div>
          <div style={{
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            Plataforma Interna
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                marginBottom: '0.5rem',
              }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu@email.com"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                marginBottom: '0.5rem',
              }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--gold-dim)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--danger)',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(192,96,64,0.08)',
                border: '1px solid rgba(192,96,64,0.2)',
                borderRadius: 'var(--radius)',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.65rem',
                background: loading ? 'var(--surface-2)' : 'var(--gold)',
                color: loading ? 'var(--text-dim)' : '#0d0c09',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontSize: '0.75rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s, opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
