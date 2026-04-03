import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { email, empresa } = await req.json();

    if (!email && !empresa) {
      return NextResponse.json({ encontrado: false, erro: 'Informe email ou nome da empresa' });
    }

    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json({
        encontrado: false,
        erro: 'SUPABASE_SERVICE_ROLE_KEY não configurada. Configure a variável de ambiente no Vercel.',
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Tentativa 1: buscar por usuário (email)
    let userData = null;
    if (email) {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .limit(1);
      if (users && users.length > 0) userData = users[0];
    }

    // Tentativa 2: buscar diagnóstico diretamente
    let diagnosticoData = null;
    if (email) {
      // Tenta tabelas comuns de diagnóstico
      for (const tableName of ['diagnostics', 'diagnostic_results', 'reports']) {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .or(email ? `email.ilike.${email}` : '')
          .limit(5);
        if (data && data.length > 0) {
          diagnosticoData = data;
          break;
        }
      }
    }

    if (empresa) {
      for (const tableName of ['diagnostics', 'diagnostic_results', 'reports', 'orders']) {
        const { data } = await supabase
          .from(tableName)
          .select('*')
          .ilike('empresa', `%${empresa}%`)
          .limit(5);
        if (data && data.length > 0) {
          diagnosticoData = diagnosticoData ? [...diagnosticoData, ...data] : data;
          break;
        }
      }
    }

    if (!userData && !diagnosticoData) {
      return NextResponse.json({
        encontrado: false,
        mensagem: `Nenhum dado encontrado para ${email || empresa}. O cliente pode ainda não ter passado pelo diagnóstico do site.`,
      });
    }

    return NextResponse.json({
      encontrado: true,
      email,
      empresa,
      diagnostico: diagnosticoData?.[0] || null,
      relatorios: diagnosticoData || [],
      usuario: userData,
    });
  } catch (err) {
    console.error('site-import error:', err);
    return NextResponse.json({
      encontrado: false,
      erro: 'Erro ao consultar o banco de dados. Verifique as credenciais Supabase.',
    });
  }
}
