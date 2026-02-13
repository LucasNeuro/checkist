import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChecklistItem } from '../types';

interface ChecklistInfographicProps {
  items: ChecklistItem[];
  percent: number;
}

const STATUS_COLORS: Record<string, string> = {
  Pronto: '#059669',
  Fazendo: '#d97706',
  Falta: '#64748b',
};

const CATEGORY_PALETTE = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#64748b', '#94a3b8'];

export function ChecklistInfographic({ items, percent }: ChecklistInfographicProps) {
  const done = items.filter((i) => i.status === 'done').length;
  const doing = items.filter((i) => i.status === 'doing').length;
  const pending = items.filter((i) => i.status === 'pending').length;
  const totalStatus = done + doing + pending;

  const statusData = [
    { name: 'Pronto', value: done, color: STATUS_COLORS.Pronto, total: totalStatus },
    { name: 'Fazendo', value: doing, color: STATUS_COLORS.Fazendo, total: totalStatus },
    { name: 'Falta', value: pending, color: STATUS_COLORS.Falta, total: totalStatus },
  ].filter((d) => d.value > 0);

  const categories = Array.from(new Set(items.map((i) => i.category)));
  const sorted = categories
    .map((cat) => ({
      name: cat,
      value: items.filter((j) => j.category === cat).length,
    }))
    .sort((a, b) => b.value - a.value);
  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const otherSum = rest.reduce((acc, r) => acc + r.value, 0);
  const categoryData = [
    ...top5.map((r, i) => ({
      ...r,
      name: r.name.length > 18 ? r.name.slice(0, 16) + '…' : r.name,
      color: CATEGORY_PALETTE[i],
      total: items.length,
    })),
    ...(otherSum > 0
      ? [{ name: 'Outros', value: otherSum, color: CATEGORY_PALETTE[5], total: items.length }]
      : []),
  ];

  const renderLabel = (props: {
    value: number;
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    total?: number;
  }) => {
    const total = props.total ?? 1;
    const pct = Math.round((props.value / total) * 100);
    if (props.value === 0 || pct < 5) return null;
    const RADIAN = Math.PI / 180;
    const r = props.innerRadius + (props.outerRadius - props.innerRadius) * 0.55;
    const x = props.cx + r * Math.cos(-props.midAngle * RADIAN);
    const y = props.cy + r * Math.sin(-props.midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="600"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {pct}%
      </text>
    );
  };

  return (
    <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-6 md:p-8">
      <h3 className="text-sm font-semibold text-slate-700 mb-6">Visão geral</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* Donut Status */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[200px] aspect-square relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={(p) => renderLabel({ ...p, total: (p as { total?: number }).total ?? totalStatus })}
                  labelLine={false}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} itens`, name]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800 tabular-nums">{percent}%</span>
              <span className="text-[11px] text-slate-500 mt-0.5">concluído</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            {statusData.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Donut Categoria (top 5 + Outros) */}
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[200px] aspect-square relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={(p) => renderLabel({ ...p, total: (p as { total?: number }).total ?? items.length })}
                  labelLine={false}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} itens`, name]}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-[280px]">
            {categoryData.map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 px-2 py-1 rounded-md bg-white/80 border border-slate-100"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="truncate max-w-[100px]">{d.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
