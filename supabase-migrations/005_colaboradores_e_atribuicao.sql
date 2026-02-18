-- ============================================================
-- Migração: colaboradores e atribuição de tarefas
-- Execute no SQL Editor do projeto Supabase (uma vez).
-- ============================================================

-- 1) Tabela de colaboradores
CREATE TABLE IF NOT EXISTS public.checklist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.checklist_collaborators IS 'Colaboradores que podem ser atribuídos às tarefas do checklist';

-- 2) Coluna assigned_to em checklist_tasks (tarefa atribuída a um colaborador)
ALTER TABLE public.checklist_tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;

ALTER TABLE public.checklist_tasks
  DROP CONSTRAINT IF EXISTS fk_checklist_tasks_assigned_to;

ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT fk_checklist_tasks_assigned_to
  FOREIGN KEY (assigned_to) REFERENCES public.checklist_collaborators(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.checklist_tasks.assigned_to IS 'Colaborador responsável pela tarefa';

CREATE INDEX IF NOT EXISTS idx_checklist_tasks_assigned_to ON public.checklist_tasks (assigned_to);
