# Colocar em produção

## Visão geral

- **Frontend**: app React (Vite) — pode ir em Vercel, Netlify ou GitHub Pages.
- **Backend**: servidor Node (Express) que usa Supabase — pode ir em Railway, Render, Fly.io, etc.
- **Banco**: Supabase (tabelas criadas pelo [schema](../supabase-schema.sql)).

---

## 1. Supabase (já feito)

- Projeto criado.
- SQL do [supabase-schema.sql](../supabase-schema.sql) executado no **SQL Editor**.
- Anotar **Project URL** e **service_role** em **Project Settings** → **API**.

---

## 2. Backend em produção

O servidor (`server.js`) precisa rodar em um host que aceite Node e variáveis de ambiente.

### Variáveis de ambiente no host

| Variável | Obrigatório | Exemplo |
|----------|-------------|--------|
| `SUPABASE_URL` | Sim | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Sim | `eyJhbGciOiJIUzI1NiIs...` |
| `WEBHOOK_SERVER_PORT` | Não | `3001` (o host geralmente define a porta) |

### Exemplo: Railway

1. Crie um projeto em [railway.app](https://railway.app).
2. **New** → **GitHub repo** (ou upload do projeto).
3. Railway detecta Node. Defina o **Start Command**: `node server.js` (ou `npm run server`).
4. Em **Variables** adicione `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
5. Gere um domínio em **Settings** → **Networking** (ex.: `https://seu-app.up.railway.app`).

### Exemplo: Render

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Conecte o repositório.
3. **Build command**: `npm install`
4. **Start command**: `node server.js`
5. Em **Environment** adicione `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
6. Anote a URL do serviço (ex.: `https://seu-app.onrender.com`).

---

## 3. Frontend em produção

O front chama `/api/*`. Em produção essa URL deve apontar para o backend.

### 3a. Vercel ou Netlify (recomendado)

- O front é deployado na Vercel/Netlify.
- Configure **Rewrites/Proxies** para que `/api/*` seja redirecionado para a URL do seu backend (ex.: `https://seu-app.onrender.com`).

**Vercel** — crie `vercel.json` na raiz:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://SEU_BACKEND_URL/api/:path*" }
  ]
}
```

**Netlify** — crie `public/_redirects` ou `netlify.toml`:

```
/api/*  https://SEU_BACKEND_URL/api/:splat  200
```

- **Build**: `npm run build`
- **Publish directory**: `dist`
- Não é necessário definir `VITE_BASE_URL` se o app fica na raiz do domínio.

### 3b. GitHub Pages (só front, sem backend na mesma origem)

- Se você **não** configurar proxy, o app em GitHub Pages não terá `/api` (retorna 404). Nesse caso o app usa **localStorage** para repo e estado (comportamento já implementado).
- Para usar Supabase em produção com GitHub Pages, coloque o backend em outro host (Railway, Render, etc.) e defina no build do front a variável **`VITE_API_URL`** = URL do backend (ex.: `https://seu-app.onrender.com`). O app já usa essa variável: todas as chamadas a `/api/*` passam a ir para `VITE_API_URL + '/api/...'`.

---

## 4. Checklist antes de ir ao ar

- [ ] Tabelas criadas no Supabase (SQL executado).
- [ ] Backend no ar com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`.
- [ ] Front deployado com proxy `/api` → backend (ou `VITE_API_URL` apontando ao backend).
- [ ] Testar: abrir o app, definir repositório, mudar status de uma tarefa e recarregar a página (estado deve persistir).

---

## 5. Resumo de URLs

| Onde | URL exemplo |
|------|-------------|
| Supabase | Project URL em Settings → API |
| Backend (Railway/Render) | `https://seu-servidor.up.railway.app` ou `.onrender.com` |
| Front (Vercel/Netlify) | `https://seu-app.vercel.app` (com rewrite `/api` → backend) |
