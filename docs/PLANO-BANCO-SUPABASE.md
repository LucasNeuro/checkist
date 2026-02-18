# Plano no banco (Supabase) para o checklist funcionar

Execute no **SQL Editor** do seu projeto Supabase, na ordem abaixo. Cada script pode ser rodado **uma vez**; usar `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` evita erro se rodar de novo.

---

## Ordem das migrações

### 1. Tabelas base (se ainda não existirem)

Se você **já tem** as tabelas `project_repo`, `checklist_tasks`, `checklist_state`, `checklist_activity`, `task_estimates`, **pule** para o passo 2.

Caso contrário, use o script **`000_schema_base_seguro.sql`**: ele cria essas tabelas com `CREATE TABLE IF NOT EXISTS` (não dá erro se já existirem).

---

### 2. Tarefas e relacionamentos (status depende disso)

**Arquivo:** `002_tabela_tarefas_e_relacionamentos.sql`

- Garante que a tabela **`checklist_tasks`** existe com as colunas certas.
- Insere todas as tarefas do checklist (ids como `wa-1`, `db-1`, `api-1`, etc.) com **ON CONFLICT DO NOTHING**.
- Cria as **FK** de `checklist_activity`, `checklist_state` e `task_estimates` para `checklist_tasks(id)`.

**Por que importa:** o **status** de cada tarefa é salvo em `checklist_state(task_id, status)`. O `task_id` precisa existir em `checklist_tasks`. Sem isso, o status não persiste.

---

### 3. Novas tarefas (API + Banco de Dados)

**Arquivo:** `003_novas_tarefas_api_e_banco.sql`

- Insere as tarefas extras (Conexão API, Banco de Dados e Arquitetura) em `checklist_tasks`.
- Use só se já rodou a 002 **antes** de termos adicionado essas tarefas no app (senão a 002 já as insere).

---

### 4. Coluna de tempo estimado

**Arquivo:** `001_add_estimated_time.sql`

- Adiciona a coluna **`estimated_time`** em **`task_estimates`** (ex.: "2h", "3 dias").

**Por que importa:** o app grava e exibe “tempo estimado” nessa coluna. Sem ela, o campo não é salvo no banco.

---

### 5. Repositório vinculado às tarefas

**Arquivo:** `004_vincular_repo_as_tarefas.sql`

- Adiciona **`repo_id`** em **`checklist_tasks`** (FK para `project_repo.id`).
- Assim você consegue saber a qual repositório cada tarefa está ligada.

---

### 6. Colaboradores e atribuição (nome → banco)

**Arquivo:** `005_colaboradores_e_atribuicao.sql`

- Cria a tabela **`checklist_collaborators`** (id, name, email, role_label).
- Adiciona a coluna **`assigned_to`** em **`checklist_tasks`** (FK para `checklist_collaborators.id`).

**Por que importa:**  
- O **nome** (Lucas, Ramon, etc.) fica em **`checklist_collaborators`**.  
- A **atribuição** da tarefa ao colaborador fica em **`checklist_tasks.assigned_to`** (só o id do colaborador).  
Sem essa migração, atribuição e colaboradores não persistem no banco (o app usa só localStorage).

---

## Resumo: o que precisa existir no banco

| Recurso no app        | Tabela / coluna no Supabase                    |
|-----------------------|-------------------------------------------------|
| Status (Falta/Fazendo/Concluído) | `checklist_state` + `checklist_tasks` com os ids |
| Estimativas (prazo, tempo, custo) | `task_estimates` (+ coluna `estimated_time`)   |
| Repositório do projeto | `project_repo` + `checklist_tasks.repo_id`     |
| Colaboradores e “quem está atribuído” | `checklist_collaborators` + `checklist_tasks.assigned_to` |

---

## Ordem prática no SQL Editor

1. **002** – tarefas + FKs (obrigatório para status persistir).  
2. **003** – (opcional) só se a 002 for antiga e não tiver as tarefas de API/DB.  
3. **001** – coluna `estimated_time` em `task_estimates`.  
4. **004** – coluna `repo_id` em `checklist_tasks`.  
5. **005** – tabela `checklist_collaborators` + coluna `assigned_to` em `checklist_tasks`.

Depois disso, **não precisa mexer mais no banco** para o checklist funcionar com status, estimativas, repositório e colaboradores persistidos.
