/**
 * db.ts — Camada de persistência
 *
 * Estratégia: write-through cache
 *   - localStorage é a fonte de verdade local (UI sempre síncrona)
 *   - Supabase é a fonte de verdade persistente (sincronizado em background)
 *
 * Fluxo de escrita:
 *   saveProject() → localStorage (sync, imediato) + pushToSupabase() (async, fire-and-forget)
 *
 * Fluxo de leitura:
 *   syncFromSupabase() chamado no mount das páginas → hidrata localStorage → atualiza estado React
 *
 * Degradação graciosa:
 *   Se Supabase falhar (env vars ausentes, rede, RLS), o app continua funcionando via localStorage.
 *   Erros são logados mas nunca exibidos ao usuário como bloqueantes.
 */

import { getSupabaseClient } from './supabase';
import { Project, STORAGE_KEY } from './store';

const TABLE = 'amum_projects';

// ── PUSH ─────────────────────────────────────────────────────────────────────

/**
 * Persiste um projeto no Supabase (upsert por id).
 * Fire-and-forget — não bloqueia a UI.
 */
export async function pushToSupabase(project: Project): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { id: project.id, data: project, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (error) console.warn('[db] push error:', error.message);
  } catch (err) {
    console.warn('[db] push exception:', err);
  }
}

// ── SYNC (pull) ───────────────────────────────────────────────────────────────

/**
 * Puxa todos os projetos do Supabase e hidrata o localStorage.
 * Retorna a lista atualizada. Se falhar, retorna null (caller usa localStorage como fallback).
 */
export async function syncFromSupabase(): Promise<Project[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('[db] sync error:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    const projects: Project[] = data
      .map((row: { data: Project }) => row.data)
      .filter(Boolean);

    if (projects.length === 0) return null;

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }

    return projects;
  } catch (err) {
    console.warn('[db] sync exception:', err);
    return null;
  }
}

/**
 * Puxa um projeto específico do Supabase pelo id.
 * Útil para garantir que a página de detalhe tem a versão mais recente.
 */
export async function fetchProjectFromSupabase(id: string): Promise<Project | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data.data as Project;
  } catch {
    return null;
  }
}

/**
 * Push inicial: sobe todos os projetos do localStorage para o Supabase.
 * Chamado uma vez quando o Supabase está configurado mas a tabela está vazia.
 */
export async function bootstrapSupabase(projects: Project[]): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase || projects.length === 0) return;
  try {
    const rows = projects.map(p => ({
      id: p.id,
      data: p,
      updated_at: p.createdAt || new Date().toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) console.warn('[db] bootstrap error:', error.message);
    else console.info(`[db] bootstrap: ${projects.length} projeto(s) enviado(s) ao Supabase`);
  } catch (err) {
    console.warn('[db] bootstrap exception:', err);
  }
}
