import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMUM — Plataforma Interna',
  description: 'Sistema de gestão de projetos de branding estratégico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
