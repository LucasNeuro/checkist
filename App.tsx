
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
  FileDown
} from 'lucide-react';
import { TECHNICAL_CHECKLIST } from './constants';
import { ChecklistItem, ItemStatus, FilterType, ProjectStats } from './types';
import { sendWebhookEvent } from './services/webhookService';
import { parseRepoUrl, fetchRepoInfo, fetchLastCommit, type RepoInfo } from './services/githubService';
import { getRepo, setRepo, getState, setState, type RepoConfig } from './services/stateService';
import { downloadChecklistPdf } from './services/pdfReportService';
import { ChecklistInfographic } from './components/ChecklistInfographic';

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

      const stateMap = await getState();
      if (Object.keys(stateMap).length > 0) {
        setItems(prev => prev.map(i => (stateMap[i.id] ? { ...i, status: stateMap[i.id] } : i)));
      }
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
    if (!item || item.status === 'done') return;

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

  const filteredItems = items.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === FilterType.ALL || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-24 relative overflow-x-hidden">
      
      {/* Side-over Detalhado para Itens Concluídos */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[100] transform transition-transform duration-500 ease-in-out border-l border-slate-200 ${selectedItem ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedItem && (
          <div className="h-full flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 size={12} />
                IMPLEMENTAÇÃO CONCLUÍDA
              </div>
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
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded border border-indigo-100">Zapflow Core</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Layout size={14} /> Detalhes Técnicos
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
            </div>

            <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-2">
                <Lock size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Ativo no Ecossistema</span>
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
                onClick={() => downloadChecklistPdf(items, stats.percent)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm border border-slate-700"
              >
                <FileDown size={18} />
                Baixar PDF
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

        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-10 sticky top-6 z-40">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar por tarefa, código ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-base shadow-xl shadow-slate-200/20 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
            {[
              { id: FilterType.ALL, label: 'Todos' },
              { id: FilterType.DONE, label: 'Prontos' },
              { id: FilterType.DOING, label: 'Fazendo' },
              { id: FilterType.PENDING, label: 'Falta' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as FilterType)}
                className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest whitespace-nowrap ${
                  activeFilter === f.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listagem de Tarefas Categorizada */}
        <div className="space-y-16">
          {categories.map(category => {
            const categoryItems = filteredItems.filter(i => i.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <section key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/30"></div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{category}</h3>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {categoryItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => item.status === 'done' && setSelectedItem(item)}
                      className={`group flex items-start gap-4 p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
                        item.status === 'done' 
                          ? 'bg-white border-emerald-100 hover:border-emerald-300 cursor-pointer shadow-sm' 
                          : item.status === 'doing'
                          ? 'bg-amber-50/40 border-amber-200 ring-2 ring-amber-500/5'
                          : 'bg-white border-slate-200 hover:border-indigo-200'
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
                          {item.status === 'done' && (
                            <ArrowRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transform -rotate-45 group-hover:rotate-0 transition-all" />
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Dropdown de Status (somente para não-concluídos) */}
                          {item.status !== 'done' ? (
                            <div className="relative">
                              <select 
                                value={item.status}
                                onChange={(e) => updateStatus(item.id, e.target.value as ItemStatus)}
                                onClick={(e) => e.stopPropagation()}
                                className={`appearance-none text-[9px] font-black pl-3 pr-8 py-1 rounded-lg border uppercase tracking-widest cursor-pointer outline-none transition-all ${
                                  item.status === 'doing' ? 'bg-amber-100 border-amber-300 text-amber-700' :
                                  'bg-slate-100 border-slate-200 text-slate-500 hover:bg-white'
                                }`}
                              >
                                <option value="pending">Falta</option>
                                <option value="doing">Fazendo</option>
                                <option value="done">Concluir</option>
                              </select>
                              <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                            </div>
                          ) : (
                            <div className="text-[9px] font-black px-2 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                              <Lock size={10} /> Concluído
                            </div>
                          )}

                          {item.priority && (
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${
                              item.priority === 'Alta' ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-slate-50 border-slate-100 text-slate-400'
                            }`}>
                              Prio: {item.priority}
                            </span>
                          )}
                        </div>
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
