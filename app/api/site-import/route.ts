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

    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json({
        encontrado: false,
        erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Configure a variável de ambiente no Vercel.',
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Buscar usuário pelo email em auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const user = authData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return NextResponse.json({
        encontrado: false,
        mensagem: `Nenhum cadastro encontrado para ${email}. O cliente pode ainda não ter criado conta no site.`,
      });
    }

    // 2. Buscar lead (jornada do cliente)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('lead_id', user.id)
      .single();

    if (leadError && leadError.code !== 'PGRST116') {
      console.error('lead fetch error:', leadError);
    }

    // 3. Buscar todos os reports do usuário
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('lead_id', user.id)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('reports fetch error:', reportsError);
    }

    // 4. Selecionar o relatório de diagnóstico entregue (o mais relevante)
    const diagnostico = reports?.find(
      (r) => r.type === 'diagnostico' && r.status === 'delivered'
    );

    // 5. Outros relatórios do funil (em ordem de profundidade)
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
      // Dados da jornada
      faseAtual: lead?.current_phase || null,
      jornadaCompleta: lead?.journey_completed || false,
      brandContext: lead?.brand_context || null,
      // Relatórios entregues
      diagnostico: diagnostico?.client_report || null,
      diagnosticoInterno: diagnostico?.internal_report || null,
      respostasFormulario: diagnostico?.initial_answers || null,
      espelho: espelho?.client_report || null,
      mapaTensao: mapaTensao?.client_report || null,
      planoTravessia: planoTravessia?.client_report || null,
      // Lista completa para referência
      todosReports: (reports || []).map((r) => ({
        type: r.type,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('site-import error:', err);
    return NextResponse.json({
      encontrado: false,
      erro: 'Erro ao consultar banco. Verifique as credenciais Supabase.',
    });
  }
}
