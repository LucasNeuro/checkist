/**
 * Estado do checklist: repositório + status por tarefa.
 * Persiste direto no Supabase (browser) ou localStorage.
 * Sem backend necessário.
 */

import type { ItemStatus } from '../types';
import { supabase } from '../lib/supabase';

const REPO_KEY = 'checkist_project_repo';
const STATE_KEY = 'checkist_state';

export interface RepoConfig {
  repoUrl: string;
  owner: string;
  repoName: string;
}

// ---- localStorage (fallback) ----
export function getRepoFromStorage(): RepoConfig | null {
  try {
    const raw = localStorage.getItem(REPO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RepoConfig;
  } catch {
    return null;
  }
}

export function setRepoInStorage(config: RepoConfig): void {
  localStorage.setItem(REPO_KEY, JSON.stringify(config));
}

export function getStateFromStorage(): Record<string, ItemStatus> {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ItemStatus>;
  } catch {
    return {};
  }
}

export function setStateInStorage(state: Record<string, ItemStatus>): void {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// ---- Supabase (direto do browser) ----
export async function getRepoFromSupabase(): Promise<RepoConfig | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('project_repo')
      .select('repo_url, owner, repo_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.repo_url) return null;
    return {
      repoUrl: data.repo_url,
      owner: data.owner,
      repoName: data.repo_name,
    };
  } catch {
    return null;
  }
}

export async function setRepoInSupabase(config: RepoConfig): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: repoRow, error: insertError } = await supabase
      .from('project_repo')
      .insert({
        repo_url: config.repoUrl,
        owner: config.owner,
        repo_name: config.repoName,
      })
      .select('id')
      .single();

    if (insertError || !repoRow?.id) return false;

    // Vincular todas as tarefas a este repositório
    const { error: updateError } = await supabase
      .from('checklist_tasks')
      .update({ repo_id: repoRow.id });

    return !updateError;
  } catch {
    return false;
  }
}

export async function getStateFromSupabase(): Promise<Record<string, ItemStatus>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase.from('checklist_state').select('task_id, status');
    if (error || !Array.isArray(data)) return {};
    return data.reduce<Record<string, ItemStatus>>((acc, row) => {
      if (row.task_id && ['done', 'doing', 'pending'].includes(row.status)) {
        acc[row.task_id] = row.status as ItemStatus;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export async function setStateInSupabase(state: Record<string, ItemStatus>): Promise<boolean> {
  if (!supabase) return false;
  try {
    let anyError = false;
    for (const [task_id, status] of Object.entries(state)) {
      const { error } = await supabase.from('checklist_state').upsert(
        { task_id, status, updated_at: new Date().toISOString() },
        { onConflict: 'task_id' }
      );
      if (error) anyError = true;
    }
    return !anyError;
  } catch {
    return false;
  }
}

/** Garante que todas as tarefas do app existam em checklist_tasks (para estado e atribuições persistirem). */
export async function ensureChecklistTasksExist(
  items: { id: string; label: string; category: string }[]
): Promise<void> {
  if (!supabase || items.length === 0) return;
  try {
    const { error } = await supabase
      .from('checklist_tasks')
      .upsert(items, { onConflict: 'id', ignoreDuplicates: true });
    if (error) console.warn('[stateService] ensureChecklistTasksExist:', error.message);
  } catch (e) {
    console.warn('[stateService] ensureChecklistTasksExist:', e);
  }
}

// ---- API unificada: Supabase primeiro, depois localStorage ----
export async function getRepo(): Promise<RepoConfig | null> {
  const config = await getRepoFromSupabase();
  if (config) return config;
  return getRepoFromStorage();
}

export async function setRepo(config: RepoConfig): Promise<void> {
  const ok = await setRepoInSupabase(config);
  if (!ok) setRepoInStorage(config);
}

export async function getState(): Promise<Record<string, ItemStatus>> {
  const fromDb = await getStateFromSupabase();
  const fromStorage = getStateFromStorage();
  return { ...fromStorage, ...fromDb };
}

export async function setState(state: Record<string, ItemStatus>): Promise<void> {
  const ok = await setStateInSupabase(state);
  setStateInStorage(state);
  if (!ok) console.warn('[stateService] setState: Supabase falhou, estado salvo no navegador (localStorage).');
}
