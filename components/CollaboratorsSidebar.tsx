import React, { useState } from 'react';
import { X, UserPlus, Trash2, Users } from 'lucide-react';
import type { Collaborator } from '../services/collaboratorsService';
import { addCollaborator, deleteCollaborator } from '../services/collaboratorsService';

interface CollaboratorsSidebarProps {
  collaborators: Collaborator[];
  onClose: () => void;
  onUpdate: () => void;
}

export function CollaboratorsSidebar({ collaborators, onClose, onUpdate }: CollaboratorsSidebarProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    await addCollaborator({ name: name.trim(), email: email.trim() || undefined });
    setName('');
    setEmail('');
    setAdding(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este colaborador? As tarefas atribuídas a ele ficarão sem responsável.')) return;
    await deleteCollaborator(id);
    onUpdate();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[98]" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-2xl z-[99] flex flex-col border-r border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900">Colaboradores</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleAdd} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <UserPlus size={12} /> Novo colaborador
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              type="submit"
              disabled={adding || !name.trim()}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {adding ? 'Adicionando…' : 'Adicionar'}
            </button>
          </form>

          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Lista ({collaborators.length})</p>
            {collaborators.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Nenhum colaborador. Adicione acima para poder atribuir tarefas.</p>
            ) : (
              <ul className="space-y-2">
                {collaborators.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
