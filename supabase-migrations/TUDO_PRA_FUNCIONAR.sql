-- ============================================================
-- TUDO QUE FALTA PRA O CHECKLIST FUNCIONAR (status, estimativas, repo, colaboradores)
-- Copie e rode no SQL Editor do Supabase (uma vez). Pode rodar de novo sem erro.
-- ============================================================

-- 1) Tabelas base (se não existirem)
CREATE TABLE IF NOT EXISTS public.project_repo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT NOT NULL,
  owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checklist_tasks (
  id TEXT PRIMARY KEY,
  label TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.checklist_state (
  task_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('done', 'doing', 'pending')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_estimates (
  task_id TEXT PRIMARY KEY,
  estimated_due_date DATE,
  estimated_time TEXT,
  estimated_cost NUMERIC(12,2),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Inserir todas as tarefas (ON CONFLICT DO NOTHING = não dá erro se já existir)
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
  ('db-13', '(Opcional) Tabelas message_templates, tags, lead_tags', 'Banco de Dados e Arquitetura'),
  ('wa-1', 'Integração UAZAPI (webhook, envio e recebimento)', 'WhatsApp e Canais'),
  ('wa-2', 'Múltiplas instâncias por empresa (QR Code, status)', 'WhatsApp e Canais'),
  ('wa-3', 'Recebimento de mensagens → salva em messages e cria/atualiza leads', 'WhatsApp e Canais'),
  ('wa-4', 'Envio de mensagens pela plataforma (Conversas + API/Edge)', 'WhatsApp e Canais'),
  ('wa-5', 'Normalização de número (código país 55)', 'WhatsApp e Canais'),
  ('in-1', 'Listagem de conversas por lead (última msg, data)', 'Caixa de Entrada / Conversas'),
  ('in-2', 'Histórico de mensagens por conversa', 'Caixa de Entrada / Conversas'),
  ('in-3', 'Enviar mensagem de texto na conversa', 'Caixa de Entrada / Conversas'),
  ('in-4', 'Busca por nome/telefone', 'Caixa de Entrada / Conversas'),
  ('in-5', 'Filtro por vendedor e por "não lidas"', 'Caixa de Entrada / Conversas'),
  ('lead-1', 'Listagem de leads com status', 'Leads'),
  ('lead-2', 'Lead vinculado a vendedor (seller_id)', 'Leads'),
  ('lead-3', 'Contagem de mensagens por lead', 'Leads'),
  ('user-1', 'Criar, editar e listar usuários (por empresa)', 'Usuários, Cargos e Acessos'),
  ('user-2', 'Criar e editar cargos (roles) por empresa', 'Usuários, Cargos e Acessos'),
  ('user-3', 'Lista de permissões e atribuição de permissões por cargo', 'Usuários, Cargos e Acessos'),
  ('user-4', 'Usuário com um cargo; permissões derivadas do cargo', 'Usuários, Cargos e Acessos'),
  ('user-5', 'Controle de acesso por tela (sidebar e rotas conforme permissões)', 'Usuários, Cargos e Acessos'),
  ('user-6', 'Regras por cargo (admin, supervisor, vendedor, leitor)', 'Usuários, Cargos e Acessos'),
  ('user-7', 'Tela de configurações (Perfil, Permissões, Cargos, Usuários)', 'Usuários, Cargos e Acessos'),
  ('user-8', 'Multi-tenant (tudo por company_id)', 'Usuários, Cargos e Acessos'),
  ('ai-1', 'Resposta automática a saudação (Mistral)', 'Automação e IA'),
  ('ai-2', 'Detecção de intenção de agendamento → cria registro em appointments', 'Automação e IA'),
  ('ai-3', 'Análise de intenção (Mistral)', 'Automação e IA'),
  ('other-1', 'Dashboard (Overview) com totais (leads, mensagens, agendamentos)', 'Outros'),
  ('other-2', 'Página de instâncias WhatsApp (criar, conectar, sincronizar status)', 'Outros'),
  ('other-3', 'Tabela sellers e vínculo com instâncias/leads', 'Outros'),
  ('dist-1', 'Fila de conversas "não atendidas"', 'Fila e Distribuição'),
  ('dist-2', 'Botão "Pegar conversa"', 'Fila e Distribuição'),
  ('dist-3', 'Atribuir conversa manualmente a um atendente', 'Fila e Distribuição'),
  ('dist-4', 'Distribuição automática (round-robin ao chegar mensagem)', 'Fila e Distribuição'),
  ('dist-5', '(Opcional) Limite de conversas em atendimento por usuário', 'Fila e Distribuição'),
  ('flow-1', 'Status da conversa (Fila | Em atendimento | Aguardando cliente | Fechada)', 'Status e Fluxo'),
  ('flow-2', 'Transferir conversa para outro atendente', 'Status e Fluxo'),
  ('flow-3', 'Botão "Encerrar atendimento"', 'Status e Fluxo'),
  ('flow-4', 'Regra: nova mensagem em conversa fechada → reabre na fila', 'Status e Fluxo'),
  ('flow-5', 'Unificar "atendente" (user vs seller) na atribuição', 'Status e Fluxo'),
  ('rt-1', 'Realtime: novas mensagens sem recarregar', 'Tempo Real'),
  ('rt-2', '(Opcional) Notificação sonora ou push', 'Tempo Real'),
  ('rt-3', 'Badge/contador de não lidas em tempo real', 'Tempo Real'),
  ('ux-1', 'Respostas rápidas / templates por empresa', 'Experiência do Atendente'),
  ('ux-2', 'Tags/etiquetas em conversa ou lead', 'Experiência do Atendente'),
  ('ux-3', 'Horário comercial + mensagem fora do horário', 'Experiência do Atendente'),
  ('ux-4', '(Opcional) Indicador "digitando"', 'Experiência do Atendente'),
  ('cal-1', 'Página Agenda (rota existe, página não)', 'Agenda'),
  ('cal-2', 'Listar e editar agendamentos', 'Agenda'),
  ('cal-3', '(Opcional) Botão "Agendar" na conversa', 'Agenda'),
  ('rep-1', 'Tempo até primeira resposta', 'Relatórios e Métricas'),
  ('rep-2', 'Tempo de resolução / duração do atendimento', 'Relatórios e Métricas'),
  ('rep-3', 'Volume por atendente', 'Relatórios e Métricas'),
  ('rep-4', 'Página Analytics com gráficos', 'Relatórios e Métricas'),
  ('rep-5', '(Opcional) Exportação CSV/Excel', 'Relatórios e Métricas'),
  ('med-1', 'Exibir imagem/áudio/documento recebido', 'Mídia'),
  ('med-2', 'Enviar mídia (imagem, PDF) pela interface', 'Mídia'),
  ('bot-1', 'Regras configuráveis de quando o bot responde', 'Bot e Handoff'),
  ('bot-2', 'Handoff bot → humano', 'Bot e Handoff'),
  ('bot-3', '(Opcional) Marcar "resolvido pelo bot"', 'Bot e Handoff'),
  ('adj-1', 'Deixar "atendente" claro na UI', 'Ajustes e Robustez'),
  ('adj-2', '(Opcional) Política de senha, 2FA, auditoria de acesso', 'Ajustes e Robustez'),
  ('adj-3', 'Unificar fluxo de envio e tratamento de erro UAZAPI', 'Ajustes e Robustez')
ON CONFLICT (id) DO NOTHING;

-- 3) Coluna estimated_time (estimativa de tempo no modal)
ALTER TABLE public.task_estimates ADD COLUMN IF NOT EXISTS estimated_time TEXT;

-- 4) Coluna repo_id (vincular tarefas ao repositório)
ALTER TABLE public.checklist_tasks ADD COLUMN IF NOT EXISTS repo_id UUID NULL;
ALTER TABLE public.checklist_tasks DROP CONSTRAINT IF EXISTS fk_checklist_tasks_repo;
ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT fk_checklist_tasks_repo
  FOREIGN KEY (repo_id) REFERENCES public.project_repo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_repo_id ON public.checklist_tasks (repo_id);

-- 5) Tabela de colaboradores + coluna assigned_to (atribuir tarefa a alguém)
CREATE TABLE IF NOT EXISTS public.checklist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  role_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.checklist_tasks ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;
ALTER TABLE public.checklist_tasks DROP CONSTRAINT IF EXISTS fk_checklist_tasks_assigned_to;
ALTER TABLE public.checklist_tasks
  ADD CONSTRAINT fk_checklist_tasks_assigned_to
  FOREIGN KEY (assigned_to) REFERENCES public.checklist_collaborators(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_assigned_to ON public.checklist_tasks (assigned_to);

-- 6) FKs: activity, state e estimates apontam para checklist_tasks (status e estimativas persistirem)
ALTER TABLE public.checklist_activity DROP CONSTRAINT IF EXISTS fk_checklist_activity_task;
ALTER TABLE public.checklist_activity
  ADD CONSTRAINT fk_checklist_activity_task
  FOREIGN KEY (task_id) REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.checklist_state DROP CONSTRAINT IF EXISTS fk_checklist_state_task;
ALTER TABLE public.checklist_state
  ADD CONSTRAINT fk_checklist_state_task
  FOREIGN KEY (task_id) REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_estimates DROP CONSTRAINT IF EXISTS fk_task_estimates_task;
ALTER TABLE public.task_estimates
  ADD CONSTRAINT fk_task_estimates_task
  FOREIGN KEY (task_id) REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;
