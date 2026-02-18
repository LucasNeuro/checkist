/**
 * Colaboradores e atribuição de tarefas (Supabase + localStorage).
 */
import { supabase } from '../lib/supabase';

const STORAGE_COLLAB = 'checklist_collaborators';
const STORAGE_ASSIGN = 'checklist_assignments';

export interface Collaborator {
  id: string;
  name: string;
  email: string | null;
  role_label: string | null;
  created_at: string;
}

function getLocalCollaborators(): Collaborator[] {
  try {
    const raw = localStorage.getItem(STORAGE_COLLAB);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setLocalCollaborators(list: Collaborator[]): void {
  localStorage.setItem(STORAGE_COLLAB, JSON.stringify(list));
}

function getLocalAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_ASSIGN);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setLocalAssignment(taskId: string, collaboratorId: string | null): void {
  const all = getLocalAssignments();
  if (collaboratorId) all[taskId] = collaboratorId;
  else delete all[taskId];
  localStorage.setItem(STORAGE_ASSIGN, JSON.stringify(all));
}

export async function getCollaborators(): Promise<Collaborator[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('checklist_collaborators')
        .select('*')
        .order('name');
      if (!error && data) return data as Collaborator[];
    } catch {
      // Tabela pode não existir (migração 005 não rodada)
    }
  }
  return getLocalCollaborators();
}

export async function addCollaborator(payload: { name: string; email?: string; role_label?: string }): Promise<Collaborator | null> {
  const row = {
    name: payload.name.trim(),
    email: payload.email?.trim() || null,
    role_label: payload.role_label?.trim() || null,
  };
  if (supabase) {
    const { data, error } = await supabase
      .from('checklist_collaborators')
      .insert(row)
      .select()
      .single();
    if (!error && data) return data as Collaborator;
  }
  const local: Collaborator = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    ...row,
    created_at: new Date().toISOString(),
  };
  const list = [...getLocalCollaborators(), local];
  setLocalCollaborators(list);
  return local;
}

export async function updateCollaborator(id: string, payload: { name?: string; email?: string; role_label?: string }): Promise<boolean> {
  const updates: Partial<Collaborator> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.email !== undefined) updates.email = payload.email?.trim() || null;
  if (payload.role_label !== undefined) updates.role_label = payload.role_label?.trim() || null;

  if (supabase) {
    const { error } = await supabase
      .from('checklist_collaborators')
      .update(updates)
      .eq('id', id);
    if (!error) return true;
  }
  const list = getLocalCollaborators();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...updates };
  setLocalCollaborators(list);
  return true;
}

export async function deleteCollaborator(id: string): Promise<boolean> {
  if (supabase) {
    const { error } = await supabase.from('checklist_collaborators').delete().eq('id', id);
    if (!error) return true;
  }
  const list = getLocalCollaborators().filter(c => c.id !== id);
  setLocalCollaborators(list);
  const assign = getLocalAssignments();
  Object.keys(assign).forEach(taskId => { if (assign[taskId] === id) delete assign[taskId]; });
  localStorage.setItem(STORAGE_ASSIGN, JSON.stringify(assign));
  return true;
}

export async function getAssignments(): Promise<Record<string, string>> {
  const local = getLocalAssignments();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('checklist_tasks')
        .select('id, assigned_to')
        .not('assigned_to', 'is', null);
      if (!error && data) {
        const fromDb = (data as { id: string; assigned_to: string }[]).reduce<Record<string, string>>((acc, row) => {
          acc[row.id] = row.assigned_to;
          return acc;
        }, {});
        return { ...local, ...fromDb };
      }
    } catch {
      // Coluna assigned_to pode não existir (migração 005 não rodada)
    }
  }
  return local;
}

export async function setAssignment(taskId: string, collaboratorId: string | null): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('checklist_tasks')
        .update({ assigned_to: collaboratorId })
        .eq('id', taskId);
      if (!error) return true;
    } catch {
      // Coluna assigned_to pode não existir (migração 005 não rodada)
    }
  }
  setLocalAssignment(taskId, collaboratorId);
  return true;
}
