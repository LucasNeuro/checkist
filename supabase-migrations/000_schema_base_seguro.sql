-- ============================================================
-- Schema base SEGURO (pode rodar mesmo se as tabelas já existirem)
-- Use CREATE TABLE IF NOT EXISTS para não dar erro 42P07.
-- ============================================================

-- project_repo (repositório do projeto)
CREATE TABLE IF NOT EXISTS public.project_repo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- checklist_tasks (tarefas – central)
CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id TEXT PRIMARY KEY,
  label TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- checklist_activity (eventos por tarefa)
CREATE TABLE IF NOT EXISTS public.checklist_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  label TEXT,
  event_type TEXT DEFAULT 'status_change',
  payload JSONB,
  agent_response TEXT,
  agent_response_at TIMESTAMPTZ,
  git_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- checklist_state (status por tarefa)
CREATE TABLE IF NOT EXISTS public.checklist_state (
  task_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('done', 'doing', 'pending')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- task_estimates (estimativas por tarefa)
CREATE TABLE IF NOT EXISTS public.task_estimates (
  task_id TEXT PRIMARY KEY,
  estimated_due_date DATE,
  estimated_time TEXT,
  estimated_cost NUMERIC(12,2),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_checklist_activity_task_id ON public.checklist_activity (task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_activity_created_at ON public.checklist_activity (created_at DESC);

-- FKs só depois das tabelas existirem (rode as migrações 002, 004, 005 para FKs e colunas extras)
-- Ou adicione as FKs manualmente se precisar.
