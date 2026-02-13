/**
 * Servidor: webhook Make + persistência Supabase (atividade + previsão prazos/custos).
 * Variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_KEY (opcional).
 */
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.WEBHOOK_SERVER_PORT || 3001;

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    console.log('Supabase conectado.');
  } catch (e) {
    console.warn('Supabase não disponível:', e.message);
  }
} else {
  console.warn('SUPABASE_URL e SUPABASE_SERVICE_KEY não definidos — persistência apenas em memória.');
}

let lastMakePayload = null;
let memoryRepo = null;
const memoryState = {};

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Raiz: aviso de que o front roda na porta 3000
app.get('/', (_req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html><body style="font-family:sans-serif;padding:2rem;max-width:480px;">
      <h1>Backend do Checklist</h1>
      <p>Esta é a porta <strong>3001</strong> (API). O front da aplicação roda na porta <strong>3000</strong>.</p>
      <p><a href="http://localhost:3000" style="color:#4f46e5;">Abrir o app → http://localhost:3000</a></p>
      <p><small>Rode <code>npm run dev</code> em outro terminal para subir o front.</small></p>
    </body></html>
  `);
});

// ---- Webhook de retorno do Make ----
app.post('/api/webhooks/make-callback', async (req, res) => {
  const body = req.body || {};
  lastMakePayload = {
    receivedAt: new Date().toISOString(),
    body,
  };
  console.log('[Make callback]', lastMakePayload.receivedAt, JSON.stringify(body).slice(0, 200));

  const taskId = body.task_id ?? body.item?.id ?? body.itemId;
  const label = body.item?.label ?? body.label ?? null;
  const agentResponse = body.agent_response ?? body.agentResponse ?? body.response ?? null;
  const gitUrl = body.git_url ?? body.gitUrl ?? body.git_ref ?? null;

  if (supabase && taskId) {
    try {
      await supabase.from('checklist_activity').insert({
        task_id: taskId,
        label: label || null,
        event_type: body.event_type ?? 'status_change',
        payload: body,
        agent_response: agentResponse,
        agent_response_at: agentResponse ? new Date().toISOString() : null,
        git_url: gitUrl,
      });
    } catch (e) {
      console.error('[Make callback] Erro ao salvar no Supabase:', e.message);
    }
  }

  res.status(200).json({ ok: true, receivedAt: lastMakePayload.receivedAt });
});

app.get('/api/webhooks/make-last', (_req, res) => {
  if (!lastMakePayload) {
    return res.status(200).json({ receivedAt: null, body: null });
  }
  res.status(200).json({
    receivedAt: lastMakePayload.receivedAt,
    body: lastMakePayload.body,
  });
});

// ---- Atividade (histórico por tarefa, com resposta do agente) ----
app.get('/api/activity', async (req, res) => {
  const taskId = req.query.taskId;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  if (supabase) {
    try {
      let q = supabase.from('checklist_activity').select('*').order('created_at', { ascending: false }).limit(limit);
      if (taskId) q = q.eq('task_id', taskId);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (e) {
      console.error('[GET /api/activity]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (lastMakePayload && lastMakePayload.body) {
    const task = lastMakePayload.body.task_id ?? lastMakePayload.body.item?.id;
    if (!taskId || task === taskId) {
      return res.status(200).json([{
        id: 'memory-1',
        task_id: task,
        label: lastMakePayload.body.item?.label,
        payload: lastMakePayload.body,
        agent_response: lastMakePayload.body.agent_response ?? lastMakePayload.body.agentResponse,
        git_url: lastMakePayload.body.git_url ?? lastMakePayload.body.gitUrl,
        created_at: lastMakePayload.receivedAt,
      }]);
    }
  }
  res.status(200).json([]);
});

// ---- Previsão de prazos e custos ----
app.get('/api/estimates', async (req, res) => {
  const taskId = req.query.taskId;

  if (!supabase) {
    return res.status(200).json(taskId ? null : []);
  }
  try {
    if (taskId) {
      const { data, error } = await supabase.from('task_estimates').select('*').eq('task_id', taskId).maybeSingle();
      if (error) throw error;
      return res.status(200).json(data);
    }
    const { data, error } = await supabase.from('task_estimates').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (e) {
    console.error('[GET /api/estimates]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.post('/api/estimates', async (req, res) => {
  const body = req.body || {};
  const taskId = body.task_id ?? body.taskId;
  if (!taskId) {
    return res.status(400).json({ error: 'task_id obrigatório' });
  }

  if (!supabase) {
    return res.status(200).json({ ok: true, message: 'Sem Supabase, não persistido' });
  }
  try {
    const row = {
      task_id: taskId,
      estimated_due_date: body.estimated_due_date || body.estimatedDueDate || null,
      estimated_cost: body.estimated_cost != null ? Number(body.estimated_cost) : (body.estimatedCost != null ? Number(body.estimatedCost) : null),
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('task_estimates').upsert(row, { onConflict: 'task_id' });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[POST /api/estimates]', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ---- Repositório do projeto (GitHub = monitor) ----
app.get('/api/repo', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('project_repo').select('repo_url, owner, repo_name').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (data) return res.status(200).json(data);
    } catch (e) {
      console.error('[GET /api/repo]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  return res.status(200).json(memoryRepo || {});
});

app.post('/api/repo', async (req, res) => {
  const body = req.body || {};
  const repoUrl = (body.repo_url || body.repoUrl || '').trim();
  const owner = (body.owner || '').trim();
  const repoName = (body.repo_name || body.repoName || '').trim();
  if (!repoUrl || !owner || !repoName) {
    return res.status(400).json({ error: 'repo_url, owner e repo_name obrigatórios' });
  }
  if (supabase) {
    try {
      await supabase.from('project_repo').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('project_repo').insert({ repo_url: repoUrl, owner, repo_name: repoName });
    } catch (e) {
      console.error('[POST /api/repo]', e.message);
      return res.status(500).json({ error: e.message });
    }
  } else {
    memoryRepo = { repo_url: repoUrl, owner, repo_name: repoName };
  }
  return res.status(200).json({ ok: true });
});

// ---- Estado do checklist (tabela simples) ----
app.get('/api/checklist-state', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('checklist_state').select('task_id, status');
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (e) {
      console.error('[GET /api/checklist-state]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  const list = Object.entries(memoryState).map(([task_id, status]) => ({ task_id, status }));
  return res.status(200).json(list);
});

app.post('/api/checklist-state', async (req, res) => {
  const body = req.body || {};
  const list = Array.isArray(body.state) ? body.state : [];
  const valid = list.filter((r) => r && r.task_id && ['done', 'doing', 'pending'].includes(r.status));
  if (supabase) {
    try {
      for (const row of valid) {
        await supabase.from('checklist_state').upsert(
          { task_id: row.task_id, status: row.status, updated_at: new Date().toISOString() },
          { onConflict: 'task_id' }
        );
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[POST /api/checklist-state]', e.message);
      return res.status(500).json({ error: e.message });
    }
  }
  valid.forEach((r) => { memoryState[r.task_id] = r.status; });
  return res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
  console.log('  POST /api/webhooks/make-callback   <- Make envia retorno + agent_response, git_url');
  console.log('  GET  /api/webhooks/make-last');
  console.log('  GET  /api/activity?taskId=xxx       <- Histórico com resposta do agente');
  console.log('  GET  /api/estimates?taskId=xxx       <- Previsão prazos/custos');
  console.log('  POST /api/estimates                  <- Salvar previsão (body: task_id, estimated_due_date, estimated_cost, notes)');
  console.log('  GET  /api/repo                        <- Repositório configurado (GitHub)');
  console.log('  POST /api/repo                        <- Definir repo (body: repo_url, owner, repo_name)');
  console.log('  GET  /api/checklist-state             <- Estado das tarefas');
  console.log('  POST /api/checklist-state            <- Salvar estado (body: { state: [{ task_id, status }] })');
});
