import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, FileText } from 'lucide-react';
import type { ChecklistItem } from '../types';
import { getEstimate, saveEstimate, type TaskEstimate } from '../services/estimatesService';

interface EstimateModalProps {
  task: ChecklistItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EstimateModal({ task, onClose, onSaved }: EstimateModalProps) {
  const [dueDate, setDueDate] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    getEstimate(task.id).then((est) => {
      if (est) {
        setDueDate(est.estimated_due_date ?? '');
        setEstimatedTime(est.estimated_time ?? '');
        setCost(est.estimated_cost != null ? String(est.estimated_cost) : '');
        setNotes(est.notes ?? '');
      } else {
        setDueDate('');
        setEstimatedTime('');
        setCost('');
        setNotes('');
      }
    });
  }, [task?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    setSaving(true);
    const costNum = cost.trim() !== '' ? parseFloat(cost.replace(',', '.').replace(/\s/g, '')) : null;
    const ok = await saveEstimate(task.id, {
      estimated_due_date: dueDate.trim() || null,
      estimated_time: estimatedTime.trim() || null,
      estimated_cost: costNum != null && !Number.isNaN(costNum) ? costNum : null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  if (!task) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 z-[101] p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Estimar tempo e prazo</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{task.label}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              <Calendar size={14} /> Data prevista
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              <Clock size={14} /> Tempo estimado
            </label>
            <input
              type="text"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              placeholder="ex.: 2h, 3 dias, 1 semana"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              <DollarSign size={14} /> Custo estimado (opcional)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              <FileText size={14} /> Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
