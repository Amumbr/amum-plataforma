import { NextResponse } from 'next/server';

interface UserCredential {
  email: string;
  password: string;
}

function getCredentials(): UserCredential[] {
  const credentials: UserCredential[] = [];

  const email1 = process.env.AUTH_EMAIL;
  const password1 = process.env.AUTH_PASSWORD;
  if (email1 && password1) credentials.push({ email: email1, password: password1 });

  const email2 = process.env.AUTH_EMAIL_2;
  const password2 = process.env.AUTH_PASSWORD_2;
  if (email2 && password2) credentials.push({ email: email2, password: password2 });

  return credentials;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const credentials = getCredentials();

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente.' },
        { status: 500 }
      );
    }

    const match = credentials.find(
      (c) =>
        email.trim().toLowerCase() === c.email.toLowerCase() &&
        password === c.password
    );

    if (match) {
      return NextResponse.json({ success: true, email: match.email.toLowerCase() });
    }

    return NextResponse.json(
      { error: 'Credenciais inválidas.' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro ao processar autenticação.' },
      { status: 400 }
    );
  }
}
