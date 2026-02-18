
import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Search, 
  Zap, 
  Activity,
  ArrowRight,
  Clock,
  Loader2,
  X,
  Lock,
  ChevronDown,
  Info,
  Calendar,
  MessageSquare,
  Users,
  Layout,
  Code2,
  FileCode,
  AlertCircle,
  Database,
  Smartphone,
  FileDown,
  DollarSign,
  Target,
  UserPlus
} from 'lucide-react';
import { TECHNICAL_CHECKLIST } from './constants';
import { ChecklistItem, ItemStatus, FilterType, ProjectStats } from './types';
import { sendWebhookEvent } from './services/webhookService';
import { parseRepoUrl, fetchRepoInfo, fetchLastCommit, type RepoInfo } from './services/githubService';
import { getRepo, setRepo, getState, setState, ensureChecklistTasksExist, type RepoConfig } from './services/stateService';
import { downloadChecklistPdf } from './services/pdfReportService';
import { getAllEstimates, type TaskEstimate } from './services/estimatesService';
import { getCollaborators, getAssignments, setAssignment, type Collaborator } from './services/collaboratorsService';
import { ChecklistInfographic } from './components/ChecklistInfographic';
import { EstimateModal } from './components/EstimateModal';
import { CollaboratorsSidebar } from './components/CollaboratorsSidebar';

const App: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>(TECHNICAL_CHECKLIST);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(FilterType.ALL);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [activities, setActivities] = useState<{id: string, label: string, status: string, time: string}[]>([]);
  const [repoConfig, setRepoConfig] = useState<RepoConfig | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [repoSaving, setRepoSaving] = useState(false);
  const [lastCommit, setLastCommit] = useState<{ sha: string; message: string; date: string } | null>(null);
  const [estimates, setEstimates] = useState<Record<string, TaskEstimate>>({});
  const [estimateModalTask, setEstimateModalTask] = useState<ChecklistItem | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [assignments, setAssignmentsState] = useState<Record<string, string>>({});
  const [sidebarCollaboratorsOpen, setSidebarCollaboratorsOpen] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState<string>('');
  const [bulkAssignByCategory, setBulkAssignByCategory] = useState<Record<string, string>>({});
  const [bulkStatusByCategory, setBulkStatusByCategory] = useState<Record<string, string>>({});

  // Cores distintas por colaborador (índice estável)
  const COLLABORATOR_COLORS = [
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  ];
  const getCollaboratorColor = (collaboratorId: string) => {
    const idx = collaborators.findIndex(c => c.id === collaboratorId);
    return idx >= 0 ? COLLABORATOR_COLORS[idx % COLLABORATOR_COLORS.length] : 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const stats = useMemo((): ProjectStats => {
    const total = items.length;
    const completed = items.filter(i => i.status === 'done').length;
    const doing = items.filter(i => i.status === 'doing').length;
    return {
      total,
      completed,
      doing,
      percent: Math.round((completed / total) * 100)
    };
  }, [items]);

  const categories = useMemo(() => 
    Array.from(new Set(items.map(i => i.category))),
  [items]);

  // Carregar repositório e estado (Supabase ou localStorage)
  useEffect(() => {
    (async () => {
      const config = await getRepo();
      if (config) setRepoConfig(config);

      // Garantir que todas as tarefas existam no banco (para status e atribuição persistirem)
      await ensureChecklistTasksExist(
        TECHNICAL_CHECKLIST.map((i) => ({ id: i.id, label: i.label, category: i.category }))
      );

      const stateMap = await getState();
      if (Object.keys(stateMap).length > 0) {
        setItems(prev => prev.map(i => (stateMap[i.id] ? { ...i, status: stateMap[i.id] } : i)));
      }
      const est = await getAllEstimates();
      setEstimates(est);
      const [collab, assign] = await Promise.all([getCollaborators(), getAssignments()]);
      setCollaborators(collab);
      setAssignmentsState(assign);
    })();
  }, []);

  // Buscar infos do GitHub quando repo está configurado
  useEffect(() => {
    if (!repoConfig?.owner || !repoConfig?.repoName) return;
    (async () => {
      const info = await fetchRepoInfo(repoConfig.owner, repoConfig.repoName);
      setRepoInfo(info ?? null);
      if (info) {
        const commit = await fetchLastCommit(repoConfig.owner, repoConfig.repoName, info.defaultBranch);
        setLastCommit(commit ?? null);
      }
    })();
  }, [repoConfig?.owner, repoConfig?.repoName]);

  const saveRepo = async () => {
    const parsed = parseRepoUrl(repoUrlInput);
    if (!parsed) return;
    setRepoSaving(true);
    const config: RepoConfig = {
      repoUrl: repoUrlInput.trim(),
      owner: parsed.owner,
      repoName: parsed.repo,
    };
    await setRepo(config);
    setRepoConfig(config);
    setRepoInfo(null);
    setLastCommit(null);
    const info = await fetchRepoInfo(parsed.owner, parsed.repo);
    setRepoInfo(info ?? null);
    if (info) {
      const commit = await fetchLastCommit(parsed.owner, parsed.repo, info.defaultBranch);
      setLastCommit(commit ?? null);
    }
    setRepoSaving(false);
  };

  const persistState = (nextItems: ChecklistItem[]) => {
    const state: Record<string, ItemStatus> = {};
    nextItems.forEach(i => { state[i.id] = i.status; });
    setState(state);
  };

  const updateStatus = async (itemId: string, newStatus: ItemStatus) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setLoading(itemId);
    
    const nextItems = items.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
    setItems(nextItems);
    persistState(nextItems);

    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setActivities(prev => [{
      id: Math.random().toString(),
      label: item.label,
      status: newStatus,
      time: now
    }, ...prev].slice(0, 4));


    const completedAfter = stats.completed + (newStatus === 'done' ? 1 : 0) - (item.status === 'done' ? 1 : 0);
    const doingAfter = stats.doing + (newStatus === 'doing' ? 1 : 0) - (item.status === 'doing' ? 1 : 0);
    const percentAfter = Math.round((completedAfter / stats.total) * 100);

    const statsByCategory = categories.reduce<Record<string, { total: number; done: number; doing: number; pending: number }>>((acc, cat) => {
      const catItems = items.filter(i => i.category === cat);
      const inThisCat = cat === item.category;
      acc[cat] = {
        total: catItems.length,
        done: catItems.filter(i => i.status === 'done').length + (inThisCat && newStatus === 'done' ? 1 : 0) - (inThisCat && item.status === 'done' ? 1 : 0),
        doing: catItems.filter(i => i.status === 'doing').length + (inThisCat && newStatus === 'doing' ? 1 : 0) - (inThisCat && item.status === 'doing' ? 1 : 0),
        pending: catItems.filter(i => i.status === 'pending').length + (inThisCat && newStatus === 'pending' ? 1 : 0) - (inThisCat && item.status === 'pending' ? 1 : 0),
      };
      return acc;
    }, {});

    await sendWebhookEvent('zapflow_checklist_status_change', {
      project: 'Zapflow',
      source: 'checklist-dashboard',
      item: {
        id: item.id,
        label: item.label,
        category: item.category,
        statusPrevious: item.status,
        statusNew: newStatus,
        transition: `${item.status} -> ${newStatus}`,
        priority: item.priority ?? null,
        difficulty: item.difficulty ?? null,
        description: item.description ?? null,
        location: item.location ?? null,
        impactedFiles: item.impactedFiles ?? null,
      },
      stats: {
        total: stats.total,
        completed: completedAfter,
        doing: doingAfter,
        pending: stats.total - completedAfter - doingAfter,
        percent: percentAfter,
        summary: `${completedAfter}/${stats.total} (${percentAfter}%)`,
      },
      statsByCategory,
      meta: {
        timestamp: new Date().toISOString(),
        categoriesCount: categories.length,
        itemsCount: items.length,
      },
    });

    setLoading(null);
  };

  const bulkAssignSection = async (category: string, collaboratorId: string) => {
    const sectionItems = items.filter(i => i.category === category);
    for (const item of sectionItems) {
      await setAssignment(item.id, collaboratorId);
    }
    setAssignmentsState(prev => {
      const next = { ...prev };
      sectionItems.forEach(i => { next[i.id] = collaboratorId; });
      return next;
    });
  };

  const bulkStatusSection = (category: string, newStatus: ItemStatus) => {
    const sectionItems = items.filter(i => i.category === category);
    const ids = new Set(sectionItems.map(i => i.id));
    const nextItems = items.map(i => ids.has(i.id) ? { ...i, status: newStatus } : i);
    setItems(nextItems);
    persistState(nextItems);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === FilterType.ALL || item.status === activeFilter;
    const matchesAssigned = !assignedFilter || assignments[item.id] === assignedFilter;
    return matchesSearch && matchesFilter && matchesAssigned;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-24 relative overflow-x-hidden">
      
      {/* Side-over Detalhado (Concluídos, Fazendo ou Falta) */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-slate-200 ${selectedItem ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedItem && (
          <div className="h-full flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              {selectedItem.status === 'done' ? (
                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 size={12} />
                  IMPLEMENTAÇÃO CONCLUÍDA
                </div>
              ) : selectedItem.status === 'doing' ? (
                <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black border border-amber-200 flex items-center gap-2">
                  <Clock size={12} />
                  EM ANDAMENTO
                </div>
              ) : (
                <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 flex items-center gap-2">
                  <Target size={12} />
                  A IMPLEMENTAR
                </div>
              )}
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                {selectedItem.label}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">{selectedItem.category}</span>
                {selectedItem.priority && (
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${selectedItem.priority === 'Alta' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>Prio: {selectedItem.priority}</span>
                )}
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Zapflow Core</span>
              </div>
            </div>

            {/* Atribuído a */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <UserPlus size={12} /> Atribuído a
              </p>
              <select
                value={assignments[selectedItem.id] ?? ''}
                onChange={async (e) => {
                  const val = e.target.value || null;
                  await setAssignment(selectedItem.id, val);
                  setAssignmentsState(prev => (val ? { ...prev, [selectedItem.id]: val } : (() => { const next = { ...prev }; delete next[selectedItem.id]; return next; })()));
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Nenhum responsável</option>
                {collaborators.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Estimativas (para Fazendo e Falta) */}
            {(selectedItem.status === 'doing' || selectedItem.status === 'pending') && (
              <div className="mb-6 p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={14} /> Estimativas e prazos
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {estimates[selectedItem.id]?.estimated_due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-indigo-500" />
                      <span className="text-slate-700"><strong>Prazo:</strong> {new Date(estimates[selectedItem.id].estimated_due_date!).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {estimates[selectedItem.id]?.estimated_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-indigo-500" />
                      <span className="text-slate-700"><strong>Tempo est.:</strong> {estimates[selectedItem.id].estimated_time}</span>
                    </div>
                  )}
                  {estimates[selectedItem.id]?.estimated_cost != null && (
                    <div className="flex items-center gap-2 text-sm col-span-2">
                      <DollarSign size={14} className="text-indigo-500" />
                      <span className="text-slate-700"><strong>Custo estimado:</strong> R$ {Number(estimates[selectedItem.id].estimated_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
                {estimates[selectedItem.id]?.notes && (
                  <p className="text-xs text-slate-600 border-t border-indigo-100 pt-2 mt-2"><strong>Notas:</strong> {estimates[selectedItem.id].notes}</p>
                )}
                {(!estimates[selectedItem.id] || (!estimates[selectedItem.id].estimated_due_date && !estimates[selectedItem.id].estimated_time && estimates[selectedItem.id].estimated_cost == null)) && (
                  <p className="text-xs text-slate-500 italic">Nenhuma estimativa definida. Use o botão &quot;Estimar&quot; no card.</p>
                )}
                <button
                  type="button"
                  onClick={() => { setEstimateModalTask(selectedItem); setSelectedItem(null); }}
                  className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Abrir estimativa →
                </button>
              </div>
            )}

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Layout size={14} /> {selectedItem.status === 'done' ? 'Detalhes Técnicos' : 'O que precisa implementar'}
                </h4>
                <p className="text-slate-600 font-medium text-sm leading-relaxed">
                  {selectedItem.description}
                </p>
              </div>

              {selectedItem.location && (
                <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 text-slate-400">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Code2 size={14} /> Referência no Projeto
                  </h4>
                  <div className="bg-black/40 p-3 rounded-xl font-mono text-[11px] mb-4 text-emerald-400 overflow-x-auto">
                    {selectedItem.location}
                  </div>
                  
                  {selectedItem.impactedFiles && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Dependências / Arquivos</p>
                      {selectedItem.impactedFiles.map(file => (
                        <div key={file} className="flex items-center gap-2 text-xs">
                          <FileCode size={12} className="text-slate-600" />
                          <span>{file}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.status === 'done' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status Final</p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                      <CheckCircle2 size={12} /> OK
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Qualidade</p>
                    <p className="text-xs font-bold text-slate-900">Validado em Prod</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-700 uppercase mb-1">Status atual</p>
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
                    {selectedItem.status === 'doing' ? <><Clock size={12} /> Fazendo</> : <>Falta</>}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Lock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{selectedItem.status === 'done' ? 'Ativo no Ecossistema' : 'Checklist Zapflow'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay do Side-over */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity duration-500"
          onClick={() => setSelectedItem(null)}
        />
      )}

      <EstimateModal
        task={estimateModalTask}
        onClose={() => setEstimateModalTask(null)}
        onSaved={() => getAllEstimates().then(setEstimates)}
      />

      {sidebarCollaboratorsOpen && (
        <CollaboratorsSidebar
          collaborators={collaborators}
          onClose={() => setSidebarCollaboratorsOpen(false)}
          onUpdate={() => { getCollaborators().then(setCollaborators); getAssignments().then(setAssignmentsState); }}
        />
      )}

      <main className="max-w-6xl mx-auto px-6 pt-16">
        {/* Banner de Status e Branding */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                <Zap size={18} className="fill-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-indigo-600 uppercase">Zapflow SaaS Desk</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <h1 className="text-5xl font-black tracking-tight text-slate-900">Checklist de Implementação</h1>
              <button
                type="button"
                onClick={() => {
                  const list = filteredItems.length > 0 ? filteredItems : items;
                  const pct = list.length ? Math.round((list.filter(i => i.status === 'done').length / list.length) * 100) : 0;
                  downloadChecklistPdf(list, pct);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm border border-slate-700"
              >
                <FileDown size={18} />
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollaboratorsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm border border-indigo-700"
              >
                <UserPlus size={18} />
                Colaboradores
              </button>
            </div>

            {/* Repositório do projeto (GitHub = monitor) */}
            <div className="mt-6 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Repositório do projeto</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="https://github.com/owner/repo ou owner/repo"
                  value={repoUrlInput}
                  onChange={(e) => setRepoUrlInput(e.target.value)}
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={saveRepo}
                  disabled={!parseRepoUrl(repoUrlInput) || repoSaving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {repoSaving ? 'Salvando…' : 'Definir'}
                </button>
              </div>
              {repoConfig && (
                <p className="text-xs text-slate-500 mt-2">
                  Atual: <a href={repoConfig.repoUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{repoConfig.owner}/{repoConfig.repoName}</a>
                </p>
              )}
            </div>

            {repoInfo && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white border border-slate-700">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">Infos do GitHub</p>
                <p className="font-bold text-slate-100">{repoInfo.fullName}</p>
                {repoInfo.description && <p className="text-sm text-slate-400 mt-1">{repoInfo.description}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                  <span>⭐ {repoInfo.stars}</span>
                  <span>🔀 {repoInfo.forks}</span>
                  <span>Issues abertas: {repoInfo.openIssues}</span>
                  {repoInfo.language && <span>{repoInfo.language}</span>}
                </div>
                {lastCommit && (
                  <p className="text-xs text-slate-500 mt-2">
                    Último commit: <span className="text-slate-300">{lastCommit.sha}</span> {lastCommit.message}
                  </p>
                )}
                <a href={repoInfo.htmlUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-indigo-400 text-sm font-bold hover:underline">Abrir no GitHub →</a>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entrega SaaS</p>
                <p className="text-3xl font-black text-slate-900">{stats.percent}%</p>
              </div>
              <div className="w-16 h-16 rounded-full border-4 border-slate-100 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-indigo-600 rounded-full opacity-10 animate-pulse"></div>
                <Activity className="text-indigo-600" size={24} />
              </div>
            </div>
            
            <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-indigo-900/10 border border-slate-800">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={12} /> Atividade Recente (Webhooks)
              </p>
              <div className="space-y-3">
                {activities.length > 0 ? activities.map(act => (
                  <div key={act.id} className="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
                    <span className="truncate max-w-[120px] font-bold text-slate-300">{act.label}</span>
                    <span className={`font-black uppercase text-[9px] ${act.status === 'done' ? 'text-emerald-400' : 'text-amber-400'}`}>{act.status}</span>
                  </div>
                )) : (
                  <p className="text-[11px] text-slate-500 italic">Aguardando atualizações...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Infográfico: visão geral Pronto / Falta e por categoria */}
        <div className="mb-12">
          <ChecklistInfographic items={items} percent={stats.percent} />
        </div>

        {/* Busca e Filtros — um único bloco integrado */}
        <div className="mb-10 sticky top-6 z-40 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/30">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por tarefa, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-slate-50/50 sm:bg-transparent"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-0 sm:flex-1 sm:justify-end">
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100/80">
                {[
                  { id: FilterType.ALL, label: 'Todos' },
                  { id: FilterType.DONE, label: 'Prontos' },
                  { id: FilterType.DOING, label: 'Fazendo' },
                  { id: FilterType.PENDING, label: 'Falta' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as FilterType)}
                    className={`px-3 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider whitespace-nowrap ${
                      activeFilter === f.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                {collaborators.length > 0 && (
                  <>
                    <span className="w-px h-4 bg-slate-300 mx-0.5 shrink-0" aria-hidden />
                    <button
                      type="button"
                      onClick={() => setAssignedFilter('')}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                        !assignedFilter ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-700'
                      }`}
                    >
                      Resp.
                    </button>
                    {collaborators.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAssignedFilter(assignedFilter === c.id ? '' : c.id)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${COLLABORATOR_COLORS[idx % COLLABORATOR_COLORS.length]} ${assignedFilter === c.id ? 'ring-2 ring-offset-1 ring-slate-400' : 'opacity-90 hover:opacity-100'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {assignedFilter && collaborators.find(c => c.id === assignedFilter) && (
          <div className="mb-6 p-3 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lista filtrada:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${getCollaboratorColor(assignedFilter)}`}>
              <UserPlus size={14} />
              {collaborators.find(c => c.id === assignedFilter)?.name}
            </span>
            <span className="text-xs text-slate-500">({filteredItems.length} tarefa{filteredItems.length !== 1 ? 's' : ''})</span>
            <button type="button" onClick={() => setAssignedFilter('')} className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-700">Limpar filtro</button>
          </div>
        )}

        {/* Listagem de Tarefas Categorizada */}
        <div className="space-y-16">
          {categories.map(category => {
            const categoryItems = filteredItems.filter(i => i.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <section key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/30 shrink-0" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{category}</h3>
                    <div className="h-px bg-slate-200 flex-1 min-w-[20px]" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Em massa:</span>
                    {collaborators.length > 0 && (
                      <select
                        value={bulkAssignByCategory[category] ?? ''}
                        onChange={async (e) => {
                          const v = e.target.value;
                          if (!v) return;
                          await bulkAssignSection(category, v);
                          setBulkAssignByCategory(prev => ({ ...prev, [category]: '' }));
                        }}
                        className="appearance-none pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="">Atribuir todas</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                    <select
                      value={bulkStatusByCategory[category] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value as ItemStatus | '';
                        if (!v) return;
                        bulkStatusSection(category, v);
                        setBulkStatusByCategory(prev => ({ ...prev, [category]: '' }));
                      }}
                      className="appearance-none pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-600 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/30"
                    >
                      <option value="">Status da seção</option>
                      <option value="pending">Falta</option>
                      <option value="doing">Fazendo</option>
                      <option value="done">Concluir</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => (item.status === 'done' || item.status === 'doing' || item.status === 'pending') && setSelectedItem(item)}
                      className={`group flex items-start gap-4 p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
                        item.status === 'done' 
                          ? 'bg-white border-emerald-100 hover:border-emerald-300 cursor-pointer shadow-sm' 
                          : item.status === 'doing'
                          ? 'bg-amber-50/40 border-amber-200 ring-2 ring-amber-500/5 cursor-pointer hover:ring-amber-500/15'
                          : 'bg-white border-slate-200 hover:border-indigo-200 cursor-pointer'
                      }`}
                    >
                      {/* Borda de Status */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        item.status === 'done' ? 'bg-emerald-500' :
                        item.status === 'doing' ? 'bg-amber-500' : 'bg-slate-200'
                      }`} />

                      <div className="mt-1">
                        {item.status === 'done' ? (
                          <div className="bg-emerald-500 p-1.5 rounded-full text-white shadow-lg">
                            <CheckCircle2 size={16} />
                          </div>
                        ) : item.status === 'doing' ? (
                          <div className="bg-amber-500 p-1.5 rounded-full text-white animate-pulse">
                            <Clock size={16} />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-full border-2 border-slate-100 group-hover:border-indigo-200 transition-colors">
                            <Circle size={12} className="text-transparent" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <p className={`font-bold text-sm leading-relaxed ${
                            item.status === 'done' ? 'text-slate-900 opacity-60' : 
                            item.status === 'doing' ? 'text-amber-950' : 'text-slate-800'
                          }`}>
                            {item.label}
                          </p>
                          {(item.status === 'done' || item.status === 'doing' || item.status === 'pending') && (
                            <ArrowRight size={14} className={`opacity-0 group-hover:opacity-100 transform -rotate-45 group-hover:rotate-0 transition-all ${item.status === 'done' ? 'text-emerald-500' : 'text-amber-500'}`} />
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Dropdown de Status (permite reverter quando concluído) */}
                          <div className="relative">
                            <select
                              value={item.status}
                              onChange={(e) => updateStatus(item.id, e.target.value as ItemStatus)}
                              onClick={(e) => e.stopPropagation()}
                              className={`appearance-none text-[9px] font-black pl-3 pr-8 py-1 rounded-lg border uppercase tracking-widest cursor-pointer outline-none transition-all ${
                                item.status === 'done' ? 'bg-emerald-100 border-emerald-300 text-emerald-700' :
                                item.status === 'doing' ? 'bg-amber-100 border-amber-300 text-amber-700' :
                                'bg-slate-100 border-slate-200 text-slate-500 hover:bg-white'
                              }`}
                            >
                              <option value="pending">Falta</option>
                              <option value="doing">Fazendo</option>
                              <option value="done">Concluído</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                          </div>

                          {item.priority && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${
                              item.priority === 'Alta' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}>
                              Prio: {item.priority}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEstimateModalTask(item); }}
                            className="text-[9px] font-black px-2 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 uppercase tracking-widest flex items-center gap-1"
                          >
                            <Clock size={10} /> Estimar
                          </button>
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={assignments[item.id] ?? ''}
                              onChange={async (e) => {
                                const val = e.target.value || null;
                                await setAssignment(item.id, val);
                                setAssignmentsState(prev => (val ? { ...prev, [item.id]: val } : (() => { const next = { ...prev }; delete next[item.id]; return next; })()));
                              }}
                              className="appearance-none text-[9px] font-black pl-2 pr-6 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 uppercase tracking-wider cursor-pointer outline-none max-w-[140px]"
                            >
                              <option value="">Responsável</option>
                              {collaborators.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <UserPlus size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                          </div>
                        </div>
                        {(assignments[item.id] && collaborators.find(c => c.id === assignments[item.id])) && (
                          <p className="mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getCollaboratorColor(assignments[item.id])}`}>
                              <UserPlus size={10} />
                              {collaborators.find(c => c.id === assignments[item.id])?.name}
                            </span>
                          </p>
                        )}
                        {estimates[item.id] && (estimates[item.id].estimated_due_date || estimates[item.id].estimated_time) && (
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-500">
                            {estimates[item.id].estimated_due_date && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} />
                                Prazo: {new Date(estimates[item.id].estimated_due_date!).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {estimates[item.id].estimated_time && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                Est.: {estimates[item.id].estimated_time}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {loading === item.id && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm z-20">
                          <Loader2 className="text-indigo-600 animate-spin" size={24} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Endpoint Make Ativo
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Database size={14} className="text-indigo-400" />
              Sincronização Bidirecional
            </div>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-tighter flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            ZAPFLOW DEV HUB <span className="text-slate-300">|</span> v2.0.0
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
