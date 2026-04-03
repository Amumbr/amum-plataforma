import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ encontrado: false, erro: 'Informe o email do contato' });
    }

    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return NextResponse.json({
        encontrado: false,
        erro: 'Variáveis de ambiente Supabase não configuradas.',
      });
    }

    // 1. Buscar usuário via REST direto (mais confiável em server-side do que SDK admin)
    const usersRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!usersRes.ok) {
      const errBody = await usersRes.text();
      console.error('auth/admin/users error:', usersRes.status, errBody);
      return NextResponse.json({
        encontrado: false,
        erro: `Erro na consulta de usuários: ${usersRes.status}`,
      });
    }

    const usersData = await usersRes.json();
    const users: Array<{ id: string; email: string }> = usersData.users ?? [];

    const user = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({
        encontrado: false,
        mensagem: `Nenhum cadastro encontrado para ${email}. O cliente pode ainda não ter criado conta no site.`,
      });
    }

    // 2. Buscar lead e reports via SDK (tabelas públicas — funciona com service role)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_id', user.id)
      .single();

    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('lead_id', user.id)
      .order('created_at', { ascending: false });

    const diagnostico = reports?.find(
      (r) => r.type === 'diagnostico' && r.status === 'delivered'
    );
    const espelho = reports?.find(
      (r) => r.type === 'espelho_simbolico' && r.status === 'delivered'
    );
    const mapaTensao = reports?.find(
      (r) => r.type === 'mapa_tensao_cultural' && r.status === 'delivered'
    );
    const planoTravessia = reports?.find(
      (r) => r.type === 'plano_travessia' && r.status === 'delivered'
    );

    return NextResponse.json({
      encontrado: true,
      email: user.email,
      userId: user.id,
      faseAtual: lead?.current_phase ?? null,
      jornadaCompleta: lead?.journey_completed ?? false,
      brandContext: lead?.brand_context ?? null,
      diagnostico: diagnostico?.client_report ?? null,
      diagnosticoInterno: diagnostico?.internal_report ?? null,
      respostasFormulario: diagnostico?.initial_answers ?? null,
      espelho: espelho?.client_report ?? null,
      mapaTensao: mapaTensao?.client_report ?? null,
      planoTravessia: planoTravessia?.client_report ?? null,
      todosReports: (reports ?? []).map((r) => ({
        type: r.type,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('site-import error:', msg);
    return NextResponse.json({
      encontrado: false,
      erro: `Erro interno: ${msg}`,
    });
  }
}
