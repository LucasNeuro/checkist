/**
 * Gera um PDF com infográfico: o que está pronto e o que falta, no estilo da interface.
 */
import { jsPDF } from 'jspdf';
import type { ChecklistItem } from '../types';

const INDIGO = [79, 70, 229] as [number, number, number];
const SLATE_900 = [15, 23, 42] as [number, number, number];
const SLATE_500 = [100, 116, 139] as [number, number, number];
const EMERALD = [16, 185, 129] as [number, number, number];
const AMBER = [245, 158, 11] as [number, number, number];

function groupByCategory(items: ChecklistItem[]) {
  const map = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

/** Desenha um bloco de progresso (número grande + barra) no PDF */
function drawProgressBlock(doc: jsPDF, x: number, y: number, w: number, percent: number) {
  doc.setFontSize(24);
  doc.setTextColor(...INDIGO);
  doc.setFont('helvetica', 'bold');
  doc.text(`${percent}%`, x + w / 2, y + 6, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_500);
  doc.setFont('helvetica', 'normal');
  doc.text('concluído', x + w / 2, y + 11, { align: 'center' });
  doc.setFillColor(226, 232, 240);
  doc.rect(x, y + 14, w, 6, 'F');
  doc.setFillColor(...INDIGO);
  doc.rect(x, y + 14, (percent / 100) * w, 6, 'F');
}

/** Desenha um mini gráfico de barras horizontais por categoria */
function drawCategoryBars(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  items: ChecklistItem[]
) {
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const data = categories
    .map((cat) => {
      const catItems = items.filter((i) => i.category === cat);
      const done = catItems.filter((i) => i.status === 'done').length;
      return { name: cat, pct: catItems.length ? Math.round((done / catItems.length) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  const barH = (h - 10) / data.length;
  const maxBarW = w - 35;
  doc.setFontSize(7);
  doc.setTextColor(...SLATE_500);
  doc.setFont('helvetica', 'normal');
  data.forEach((row, i) => {
    const yy = y + 5 + i * barH;
    const label = row.name.length > 20 ? row.name.slice(0, 18) + '…' : row.name;
    doc.text(label, x, yy + 3);
    doc.setFillColor(226, 232, 240);
    doc.rect(x + 28, yy, maxBarW, 4, 'F');
    doc.setFillColor(...INDIGO);
    doc.rect(x + 28, yy, (row.pct / 100) * maxBarW, 4, 'F');
    doc.setTextColor(...SLATE_900);
    doc.text(`${row.pct}%`, x + 30 + maxBarW, yy + 3);
    doc.setTextColor(...SLATE_500);
  });
}

export function downloadChecklistPdf(items: ChecklistItem[], percent: number): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  const done = items.filter((i) => i.status === 'done');
  const falta = items.filter((i) => i.status !== 'done');

  // Título
  doc.setFontSize(22);
  doc.setTextColor(...SLATE_900);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist de Implementação', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(...SLATE_500);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Zapflow SaaS Desk · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    margin,
    y
  );
  y += 14;

  // Infográfico: progresso geral + barras por categoria
  drawProgressBlock(doc, margin, y, 42, percent);
  drawCategoryBars(doc, margin + 50, y, pageW - margin - 58, 52, items);
  y += 60;

  // Resumo em faixa
  doc.setFillColor(...INDIGO, 0.08);
  doc.rect(margin, y, pageW - margin * 2, 10, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...INDIGO);
  doc.setFont('helvetica', 'bold');
  doc.text(`${done.length} concluídos · ${falta.length} pendentes · ${items.length} itens no total`, margin + 4, y + 6.5);
  y += 16;

  const addCategoryBlock = (
    list: ChecklistItem[],
    color: [number, number, number],
    checkChar: string
  ) => {
    if (list.length === 0) return;
    const grouped = groupByCategory(list);
    for (const [category, catItems] of grouped) {
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_500);
      doc.setFont('helvetica', 'normal');
      doc.text(category.toUpperCase(), margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(...SLATE_900);
      for (const item of catItems) {
        if (y > 278) {
          doc.addPage();
          y = margin;
        }
        doc.setTextColor(...color);
        doc.text(`  ${checkChar}`, margin, y);
        doc.setTextColor(...SLATE_900);
        const label = item.label.length > 82 ? item.label.slice(0, 79) + '…' : item.label;
        doc.text(label, margin + 5, y);
        y += 5;
      }
      y += 3;
    }
  };

  // Seção Pronto
  doc.setFontSize(12);
  doc.setTextColor(...EMERALD);
  doc.setFont('helvetica', 'bold');
  doc.text('Pronto', margin, y);
  y += 7;
  addCategoryBlock(done, EMERALD, '✓');
  y += 4;

  // Seção Falta
  doc.setFontSize(12);
  doc.setTextColor(...AMBER);
  doc.setFont('helvetica', 'bold');
  doc.text('Falta', margin, y);
  y += 7;
  addCategoryBlock(falta, AMBER, '○');

  doc.setFontSize(7);
  doc.setTextColor(...SLATE_500);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR')} · Zapflow`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  doc.save(`checklist-implementacao-${new Date().toISOString().slice(0, 10)}.pdf`);
}
