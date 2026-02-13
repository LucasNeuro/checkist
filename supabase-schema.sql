-- ============================================================
-- Checklist Acompanhador — Supabase
-- Execute no SQL Editor do projeto Supabase.
-- ============================================================

-- 1) Atividade: movimentações de tarefa + resposta do agente Make + referência Git
CREATE TABLE IF NOT EXISTS checklist_activity (
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

CREATE INDEX IF NOT EXISTS idx_checklist_activity_task_id ON checklist_activity (task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_activity_created_at ON checklist_activity (created_at DESC);

COMMENT ON TABLE checklist_activity IS 'Eventos do checklist (webhook Make + resposta do agente e link Git)';

-- 2) Previsão de prazos e custos por tarefa
CREATE TABLE IF NOT EXISTS task_estimates (
  task_id TEXT PRIMARY KEY,
  estimated_due_date DATE,
  estimated_cost NUMERIC(12,2),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE task_estimates IS 'Previsão de prazos e custos por item do checklist';

-- 3) Repositório do projeto (link GitHub — monitor)
CREATE TABLE IF NOT EXISTS project_repo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_repo_created_at ON project_repo (created_at DESC);

COMMENT ON TABLE project_repo IS 'URL do repositório GitHub do projeto (fonte das infos)';

-- 4) Estado do checklist (task_id -> status) para persistir sem depender do Make
CREATE TABLE IF NOT EXISTS checklist_state (
  task_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('done', 'doing', 'pending')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE checklist_state IS 'Estado de cada item do checklist (monitor = GitHub + esta tabela)';

-- RLS (opcional): descomente e ajuste se quiser isolamento por usuário/empresa
-- ALTER TABLE checklist_activity ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE task_estimates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_repo ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE checklist_state ENABLE ROW LEVEL SECURITY;
