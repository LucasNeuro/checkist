-- ============================================================
-- Migração: vincular repositório às tarefas (checklist_tasks.repo_id)
-- Execute no SQL Editor do projeto Supabase (uma vez).
-- ============================================================

-- 1) Adicionar coluna repo_id em checklist_tasks (referência a project_repo)
ALTER TABLE public.checklist_tasks
  ADD COLUMN IF NOT EXISTS repo_id UUID NULL;

-- 2) FK: checklist_tasks.repo_id -> project_repo.id
ALTER TABLE public.checklist_tasks
  DROP CONSTRAINT IF EXISTS fk_checklist_tasks_repo;

ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT fk_checklist_tasks_repo
  FOREIGN KEY (repo_id) REFERENCES public.project_repo(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.checklist_tasks.repo_id IS 'Repositório do projeto ao qual a tarefa está vinculada';

-- 3) Índice para filtrar tarefas por repositório
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_repo_id ON public.checklist_tasks (repo_id);
