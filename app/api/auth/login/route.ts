import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const validEmail = process.env.AUTH_EMAIL;
    const validPassword = process.env.AUTH_PASSWORD;

    if (!validEmail || !validPassword) {
      return NextResponse.json(
        { error: 'Configuração de autenticação ausente.' },
        { status: 500 }
      );
    }

    if (
      email.trim().toLowerCase() === validEmail.toLowerCase() &&
      password === validPassword
    ) {
      return NextResponse.json({ success: true });
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
