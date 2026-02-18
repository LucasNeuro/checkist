-- ============================================================
-- Migração: novas tarefas (Conexão API UAZAPI + Banco de Dados)
-- Execute no SQL Editor se você já rodou 002 e quer só as novas tarefas.
-- ============================================================

INSERT INTO public.checklist_tasks (id, label, category) VALUES
  ('api-1', 'Configuração de credenciais e URL base da UAZAPI/WatasAPI', 'Conexão API UAZAPI / WatasAPI'),
  ('api-2', 'Autenticação (token/API key) nas requisições à API', 'Conexão API UAZAPI / WatasAPI'),
  ('api-3', 'Endpoint de health/status da conexão com a API', 'Conexão API UAZAPI / WatasAPI'),
  ('api-4', 'Webhook URL configurado no painel UAZAPI (recebimento de mensagens)', 'Conexão API UAZAPI / WatasAPI'),
  ('api-5', 'Tratamento de erros e retry (timeout, 5xx, rate limit)', 'Conexão API UAZAPI / WatasAPI'),
  ('api-6', 'Envio de mensagem de texto via API (POST send-message)', 'Conexão API UAZAPI / WatasAPI'),
  ('api-7', 'Recebimento e parsing do payload do webhook (mensagens, status)', 'Conexão API UAZAPI / WatasAPI'),
  ('api-8', '(Opcional) Log de requisições/respostas para debug', 'Conexão API UAZAPI / WatasAPI'),
  ('db-1', 'Schema inicial Supabase (projeto e conexão)', 'Banco de Dados e Arquitetura'),
  ('db-2', 'Tabela companies (multi-tenant)', 'Banco de Dados e Arquitetura'),
  ('db-3', 'Tabela users (company_id, role_id, auth)', 'Banco de Dados e Arquitetura'),
  ('db-4', 'Tabela roles e role_permissions', 'Banco de Dados e Arquitetura'),
  ('db-5', 'Tabela leads (company_id, seller_id, status, conversation_status)', 'Banco de Dados e Arquitetura'),
  ('db-6', 'Tabela messages (lead_id, sender, content, direction, created_at)', 'Banco de Dados e Arquitetura'),
  ('db-7', 'Tabela instances (WhatsApp por company/seller)', 'Banco de Dados e Arquitetura'),
  ('db-8', 'Tabela sellers (vínculo user/company/instance)', 'Banco de Dados e Arquitetura'),
  ('db-9', 'Tabela appointments (agendamentos)', 'Banco de Dados e Arquitetura'),
  ('db-10', 'Índices por company_id, lead_id, created_at (performance)', 'Banco de Dados e Arquitetura'),
  ('db-11', 'RLS (Row Level Security) por company_id nas tabelas', 'Banco de Dados e Arquitetura'),
  ('db-12', 'Migrações versionadas (controle de alterações do schema)', 'Banco de Dados e Arquitetura'),
  ('db-13', '(Opcional) Tabelas message_templates, tags, lead_tags', 'Banco de Dados e Arquitetura')
ON CONFLICT (id) DO NOTHING;
