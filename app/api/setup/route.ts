/**
 * POST /api/setup
 * Cria as tabelas necessárias na plataforma via service_role.
 * Chamar uma vez após o deploy. Idempotente (IF NOT EXISTS).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST() {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const sql = `
    -- Tabela principal de projetos
    CREATE TABLE IF NOT EXISTS amum_projects (
      id text PRIMARY KEY,
      data jsonb NOT NULL DEFAULT '{}',
      updated_at timestamptz DEFAULT now()
    );

    -- RLS: permitir tudo para anon (plataforma interna sem auth)
    ALTER TABLE amum_projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "allow_all_anon" ON amum_projects;
    CREATE POLICY "allow_all_anon"
      ON amum_projects FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);

    -- Índice de atualização para ordenação
    CREATE INDEX IF NOT EXISTS idx_amum_projects_updated
      ON amum_projects (updated_at DESC);
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: sql }).single();

    // rpc exec_sql pode não existir — tentar via execute_sql extension
    if (error && error.message.includes('exec_sql')) {
      // Fallback: tentar criar via Management API (não disponível via client)
      return NextResponse.json({
        ok: false,
        message: 'A função exec_sql não existe neste projeto Supabase. Execute o SQL manualmente no dashboard.',
        sql: sql.trim(),
      });
    }

    if (error) throw error;

    return NextResponse.json({ ok: true, message: 'Tabelas criadas com sucesso.' });
  } catch (err) {
    // Provavelmente não tem exec_sql — retornar SQL para execução manual
    return NextResponse.json({
      ok: false,
      message: 'Execute o SQL abaixo no Supabase SQL Editor.',
      sql: sql.trim(),
      error: String(err),
    });
  }
}
