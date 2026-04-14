'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_KEY = 'amum_auth';
const AUTH_TOKEN = 'authenticated';
const AUTH_USER_KEY = 'amum_auth_user';

export function setAuth(email?: string) {
  localStorage.setItem(AUTH_KEY, AUTH_TOKEN);
  if (email) localStorage.setItem(AUTH_USER_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === AUTH_TOKEN;
}

export function getCurrentUser(): string | null {
  return localStorage.getItem(AUTH_USER_KEY);
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
