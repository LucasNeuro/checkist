
import React from 'react';
import { SIDEBAR_ITEMS } from '../constants';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-64 bg-slate-900 h-screen fixed left-0 top-0 flex flex-col text-slate-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">Z</div>
        <span className="text-xl font-bold text-white tracking-tight">SaaS Desk</span>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as NavigationTab)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2">
          <img src="https://picsum.photos/seed/user123/40/40" className="w-10 h-10 rounded-full border border-slate-700" alt="Avatar" />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">Admin Principal</p>
            <p className="text-xs text-slate-500 truncate">Sua Empresa SaaS</p>
          </div>
        </div>
      </div>
    </div>
  );
};
