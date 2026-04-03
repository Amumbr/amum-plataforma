import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ encontrado: false, erro: 'Informe o email do contato' });
    }

    if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
      return NextResponse.json({
        encontrado: false,
        erro: 'Variáveis de ambiente Supabase não configuradas.',
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Buscar lead diretamente pelo email (sem precisar de auth.users)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .ilike('email', email.trim())
      .single();

    if (leadError || !lead) {
      console.log('lead not found for:', email, leadError?.message);
      return NextResponse.json({
        encontrado: false,
        mensagem: `Nenhum cadastro encontrado para ${email}. O cliente pode ainda não ter passado pelo diagnóstico do site.`,
      });
    }

    // 2. Buscar case do lead (onde ficam brand_context e commercial_score)
    const { data: caso } = await supabase
      .from('cases')
      .select('*')
      .eq('lead_id', lead.id)
      .single();

    // 3. Buscar todos os reports via lead_id (campo denormalizado nos reports)
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, type, status, delivered_at, created_at, initial_answers, followup_answers, final_client, final_internal')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true });

    if (reportsError) {
      console.error('reports error:', reportsError.message);
    }

    // 4. Separar por tipo — apenas relatórios entregues
    const delivered = (reports ?? []).filter(r => r.status === 'delivered');
    const diagnostico = delivered.find(r => r.type === 'diagnostico');
    const espelho = delivered.find(r => r.type === 'espelho_simbolico');
    const mapaTensao = delivered.find(r => r.type === 'mapa_tensao_cultural');
    const planoTravessia = delivered.find(r => r.type === 'plano_travessia');

    return NextResponse.json({
      encontrado: true,
      // Dados do lead
      email: lead.email,
      leadId: lead.id,
      nome: lead.name,
      empresa: lead.company_name,
      setor: lead.industry,
      faixaFuncionarios: lead.employee_range,
      faixaFaturamento: lead.revenue_range,
      scoreProntidao: lead.readiness_score,
      scoreMetodoFit: lead.method_fit_score,
      // Dados do case (jornada acumulada)
      caseId: caso?.id ?? null,
      faseAtual: caso?.current_phase ?? null,
      jornadaCompleta: caso?.journey_completed ?? false,
      brandContext: caso?.brand_context ?? null,
      commercialScore: caso?.commercial_score ?? null,
      // Relatórios entregues
      diagnostico: diagnostico?.final_client ?? null,
      diagnosticoInterno: diagnostico?.final_internal ?? null,
      respostasFormulario: diagnostico?.initial_answers ?? null,
      espelho: espelho?.final_client ?? null,
      mapaTensao: mapaTensao?.final_client ?? null,
      planoTravessia: planoTravessia?.final_client ?? null,
      // Histórico completo
      todosReports: (reports ?? []).map(r => ({
        type: r.type,
        status: r.status,
        deliveredAt: r.delivered_at,
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
