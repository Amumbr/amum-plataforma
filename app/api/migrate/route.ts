import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Rota de migração one-shot.
// Cria a tabela amum_projects com RLS permissivo (anon read/write).
// Chamar uma vez: GET /api/migrate?token=amum-migrate-2026
// Depois pode remover esta rota.

const MIGRATION_TOKEN = 'amum-migrate-2026';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS amum_projects (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amum_projects_updated
  ON amum_projects(updated_at DESC);

ALTER TABLE amum_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'amum_projects' AND policyname = 'anon_full_access'
  ) THEN
    EXECUTE 'CREATE POLICY anon_full_access ON amum_projects FOR ALL TO anon USING (true) WITH CHECK (true)';
  END IF;
END;
$$;
`;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== MIGRATION_TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: MIGRATION_SQL }).single();
    if (error) {
      // exec_sql pode não existir — usar abordagem alternativa via REST
      console.error('rpc exec_sql falhou, tentando via pg_query:', error.message);
    }
  } catch {
    // Ignorar — tentar verificar se a tabela já existe
  }

  // Verificar se a tabela existe (funciona independente do método acima)
  const { error: checkError } = await supabase
    .from('amum_projects')
    .select('id')
    .limit(1);

  if (!checkError) {
    return NextResponse.json({
      ok: true,
      message: 'Tabela amum_projects está acessível e pronta para uso.',
      note: 'Se acabou de ser criada, o deploy do Supabase pode levar alguns segundos.',
    });
  }

  // Tabela não existe — retornar SQL para Felipe executar manualmente
  return NextResponse.json({
    ok: false,
    message: 'A tabela amum_projects ainda não existe. Execute o SQL abaixo no Supabase Dashboard.',
    sql_to_run: MIGRATION_SQL.trim(),
    dashboard_url: 'https://supabase.com/dashboard/project/neynbhmaxwexvmfessxa/sql/new',
    error: checkError?.message,
  });
}
