# Checklist — Sistema de Acompanhamento (Zapflow)

Central de checklist. **Só a página (front) + Supabase** — sem backend.

- Estado e repositório são salvos **direto no Supabase** pelo navegador (chave anon).
- Infos do GitHub vêm da API pública.

## Rodar

1. `npm install`
2. Crie o projeto no [Supabase](https://supabase.com) e rode o SQL em **[supabase-schema.sql](supabase-schema.sql)** (SQL Editor).
3. No `.env` (na raiz do projeto):
   ```env
   VITE_SUPABASE_URL=https://SEU_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...   # chave "anon" em Settings → API
   ```
4. `npm run dev`  
5. Abra **http://localhost:3000**

Não precisa rodar servidor (porta 3001). Se não configurar Supabase, o app usa **localStorage**.

## Repositório do projeto (GitHub = monitor)

Na tela, em **Repositório do projeto**, informe a URL (ex.: `https://github.com/owner/repo` ou `owner/repo`) e clique em **Definir**. O app mostra nome, descrição, estrelas e último commit do GitHub.

## Deploy (GitHub Pages, Vercel, etc.)

- Build: `npm run build` → pasta `dist/`
- Em produção, defina as mesmas variáveis no host: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Para GitHub Pages em subpasta: `.env.production` com `VITE_BASE_URL=/nome-do-repo/`

## Backend (opcional)

O arquivo `server.js` existe só se você quiser receber **webhook do Make** ou rodar APIs extras. Para o checklist em si, **não é necessário**.
