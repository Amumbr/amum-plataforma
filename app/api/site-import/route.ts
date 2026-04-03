import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { email, debug } = await req.json();

    if (!email?.trim()) {
      return NextResponse.json({ encontrado: false, erro: 'Informe o email do contato' });
    }

    // ── Diagnóstico de configuração ──
    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json({ encontrado: false, erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada' });
    }
    if (!SUPABASE_URL) {
      return NextResponse.json({ encontrado: false, erro: 'NEXT_PUBLIC_SUPABASE_URL não configurada' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1. Buscar lead pelo email
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .ilike('email', email.trim())
      .single();

    if (leadError || !lead) {
      // Log detalhado para diagnóstico
      console.error('leads query failed:', JSON.stringify({
        email: email.trim(),
        code: leadError?.code,
        message: leadError?.message,
        details: leadError?.details,
        hint: leadError?.hint,
        url_prefix: SUPABASE_URL.slice(0, 40),
        key_prefix: SERVICE_ROLE_KEY.slice(0, 20),
      }));

      // Em modo debug, retorna o erro detalhado
      if (debug) {
        return NextResponse.json({
          encontrado: false,
          debug: {
            code: leadError?.code,
            message: leadError?.message,
            hint: leadError?.hint,
            url: SUPABASE_URL,
            key_valid: SERVICE_ROLE_KEY.startsWith('eyJ'),
          }
        });
      }

      return NextResponse.json({
        encontrado: false,
        mensagem: `Nenhum cadastro encontrado para ${email}. O cliente pode ainda não ter passado pelo diagnóstico do site.`,
      });
    }

    // 2. Buscar case (brand_context, commercial_score, journey_completed)
    const { data: caso } = await supabase
      .from('cases')
      .select('*')
      .eq('lead_id', lead.id)
      .single();

    // 3. Buscar reports — mais recente primeiro
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, type, status, delivered_at, created_at, initial_answers, followup_answers, final_client, final_internal')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('reports query failed:', JSON.stringify(reportsError));
    }

    // Apenas os entregues — .find() já pega o mais recente de cada tipo (ordem desc)
    const delivered = (reports ?? []).filter(r => r.status === 'delivered');
    const diagnostico    = delivered.find(r => r.type === 'diagnostico');
    const espelho        = delivered.find(r => r.type === 'espelho_simbolico');
    const mapaTensao     = delivered.find(r => r.type === 'mapa_tensao_cultural');
    const planoTravessia = delivered.find(r => r.type === 'plano_travessia');

    // Resumo deduplicado: um por tipo (o mais recente)
    const tiposVistos = new Set<string>();
    const resumo = (reports ?? []).filter(r => {
      if (r.status !== 'delivered') return false;
      if (tiposVistos.has(r.type)) return false;
      tiposVistos.add(r.type);
      return true;
    });

    return NextResponse.json({
      encontrado: true,
      email: lead.email,
      leadId: lead.id,
      nome: lead.name,
      empresa: lead.company_name,
      setor: lead.industry,
      faixaFuncionarios: lead.employee_range,
      faixaFaturamento: lead.revenue_range,
      scoreProntidao: lead.readiness_score,
      scoreMetodoFit: lead.method_fit_score,
      caseId: caso?.id ?? null,
      faseAtual: caso?.current_phase ?? null,
      jornadaCompleta: caso?.journey_completed ?? false,
      brandContext: caso?.brand_context ?? null,
      commercialScore: caso?.commercial_score ?? null,
      diagnostico: diagnostico?.final_client ?? null,
      diagnosticoInterno: diagnostico?.final_internal ?? null,
      respostasFormulario: diagnostico?.initial_answers ?? null,
      espelho: espelho?.final_client ?? null,
      mapaTensao: mapaTensao?.final_client ?? null,
      planoTravessia: planoTravessia?.final_client ?? null,
      todosReports: resumo.map(r => ({
        type: r.type,
        status: r.status,
        deliveredAt: r.delivered_at,
      })),
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('site-import exception:', msg);
    return NextResponse.json({ encontrado: false, erro: `Erro interno: ${msg}` });
  }
}
