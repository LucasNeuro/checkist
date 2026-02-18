/**
 * Previsão de prazos, tempo e custos por tarefa.
 * Persiste no Supabase (task_estimates) e usa localStorage como fallback.
 */
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'checklist_task_estimates';

export interface TaskEstimate {
  task_id: string;
  estimated_due_date: string | null;
  estimated_time: string | null;
  estimated_cost: number | null;
  notes: string | null;
  updated_at: string;
}

function getLocalEstimates(): Record<string, TaskEstimate> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TaskEstimate>;
    return parsed || {};
  } catch {
    return {};
  }
}

function setLocalEstimate(taskId: string, est: Omit<TaskEstimate, 'updated_at'>): void {
  const all = getLocalEstimates();
  all[taskId] = { ...est, updated_at: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function getEstimate(taskId: string): Promise<TaskEstimate | null> {
  const id = String(taskId);
  if (supabase) {
    const { data, error } = await supabase
      .from('task_estimates')
      .select('*')
      .eq('task_id', id)
      .maybeSingle();
    if (!error && data) return data as TaskEstimate;
  }
  const local = getLocalEstimates()[id];
  return local || null;
}

export async function getAllEstimates(): Promise<Record<string, TaskEstimate>> {
  const result: Record<string, TaskEstimate> = { ...getLocalEstimates() };
  if (supabase) {
    const { data, error } = await supabase.from('task_estimates').select('*');
    if (!error && data) {
      (data as TaskEstimate[]).forEach((row) => {
        result[row.task_id] = row;
      });
    }
  }
  return result;
}

function buildRow(
  taskId: string,
  payload: {
    estimated_due_date?: string | null;
    estimated_time?: string | null;
    estimated_cost?: number | null;
    notes?: string | null;
  }
): Omit<TaskEstimate, 'updated_at'> {
  const task_id = String(taskId);
  let estimated_due_date: string | null = null;
  if (payload.estimated_due_date && typeof payload.estimated_due_date === 'string') {
    const t = payload.estimated_due_date.trim();
    if (t.length >= 10) estimated_due_date = t.slice(0, 10);
  }
  let estimated_cost: number | null = null;
  if (payload.estimated_cost != null && typeof payload.estimated_cost === 'number' && !Number.isNaN(payload.estimated_cost)) {
    estimated_cost = payload.estimated_cost;
  }
  return {
    task_id,
    estimated_due_date,
    estimated_time: payload.estimated_time?.trim() || null,
    estimated_cost,
    notes: payload.notes?.trim() || null,
  };
}

export async function saveEstimate(
  taskId: string,
  payload: {
    estimated_due_date?: string | null;
    estimated_time?: string | null;
    estimated_cost?: number | null;
    notes?: string | null;
  }
): Promise<boolean> {
  const row = buildRow(taskId, payload);

  // Sempre salvar no localStorage para a UI atualizar
  setLocalEstimate(taskId, row);

  if (supabase) {
    const body = {
      task_id: row.task_id,
      estimated_due_date: row.estimated_due_date,
      estimated_time: row.estimated_time,
      estimated_cost: row.estimated_cost,
      notes: row.notes,
    };

    const { error: insertError } = await supabase.from('task_estimates').insert(body);

    if (!insertError) return true;

    // Conflito = registro já existe → fazer UPDATE
    const isConflict = insertError.code === '23505' || String(insertError.code) === '23505' || insertError.message?.includes('duplicate');
    if (isConflict) {
      const { error: updateError } = await supabase
        .from('task_estimates')
        .update({
          estimated_due_date: body.estimated_due_date,
          estimated_time: body.estimated_time,
          estimated_cost: body.estimated_cost,
          notes: body.notes,
        })
        .eq('task_id', body.task_id);
      if (!updateError) return true;
      console.warn('[estimatesService] Supabase update failed:', updateError.message);
    } else {
      console.warn('[estimatesService] Supabase insert failed, using localStorage:', insertError.message);
    }
  }

  return true;
}
