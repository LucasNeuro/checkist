-- ============================================================
-- Migração: adicionar coluna estimated_time em task_estimates
-- Execute no SQL Editor do projeto Supabase (uma vez).
-- ============================================================

ALTER TABLE public.task_estimates
  ADD COLUMN IF NOT EXISTS estimated_time TEXT;

COMMENT ON COLUMN public.task_estimates.estimated_time IS 'Tempo estimado em texto (ex.: 2h, 3 dias, 1 semana)';
