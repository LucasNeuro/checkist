# Criar tabelas no Supabase

## 1. Acessar o SQL Editor

1. Entre em [supabase.com](https://supabase.com) e abra seu projeto.
2. No menu lateral: **SQL Editor**.
3. Clique em **New query**.

## 2. Colar e executar o schema

Copie todo o conteúdo do arquivo **`supabase-schema.sql`** (na raiz do projeto) e cole no editor.  
Depois clique em **Run** (ou Ctrl+Enter).

## 3. Conferir as tabelas

Em **Table Editor** você deve ver:

| Tabela | Uso |
|--------|-----|
| `checklist_activity` | Eventos (webhook Make, resposta do agente, link Git) |
| `task_estimates` | Previsão de prazos e custos por tarefa |
| `project_repo` | Repositório GitHub configurado (um registro) |
| `checklist_state` | Estado de cada item (done / doing / pending) |

## 4. Chaves para o servidor (produção)

Em **Project Settings** → **API**:

- **Project URL** → use como `SUPABASE_URL`
- **service_role** (secret) → use como `SUPABASE_SERVICE_KEY`

Não use a chave `anon` pública para o servidor; use `service_role` para o backend ter acesso total às tabelas.
