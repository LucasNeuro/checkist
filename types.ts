
export type ItemStatus = 'done' | 'pending' | 'doing';

export interface ChecklistItem {
  id: string;
  label: string;
  status: ItemStatus;
  category: string;
  priority?: 'Alta' | 'Média' | 'Baixa';
  difficulty?: 'Fácil' | 'Médio' | 'Complexo';
  description?: string;
  impactedFiles?: string[];
  location?: string;
}

export interface ProjectStats {
  total: number;
  completed: number;
  doing: number;
  percent: number;
}

export enum FilterType {
  ALL = 'all',
  DONE = 'done',
  DOING = 'doing',
  PENDING = 'pending'
}

export type NavigationTab = 'overview' | 'checklist' | 'settings';
