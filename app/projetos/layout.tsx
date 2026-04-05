import AuthGuard from '@/components/AuthGuard';

export default function ProjetosLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
