import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { MODULES_LIST } from '../../data/modules';
import { Icon } from '../common/Icon';
import { ModuleId } from '../../types';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeModule, setActiveModule, activeProject } = useProject();

  const categories = [
    { id: 'discover', label: 'גילוי והשראה' },
    { id: 'ideate', label: 'קריאייטיב וקונספטים' },
    { id: 'craft', label: 'ארגז כלי העיצוב' },
    { id: 'refine', label: 'חידוד, גשטאלט וביקורת' },
    { id: 'export', label: 'ייצוא וגיבוי' },
  ];

  return (
    <aside
      className={`h-[calc(100vh-4rem)] bg-[#183036] border-l border-[#31535A] flex flex-col transition-all duration-200 z-20 select-none ${
        isCollapsed ? 'w-[68px]' : 'w-[264px]'
      }`}
    >
      {/* Top Toggle Button */}
      <div className="p-2 border-b border-[#31535A] flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-2">
            סביבת עבודה
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-[#103F46] text-zinc-400 hover:text-white transition mx-auto"
          title={isCollapsed ? 'הרחב תפריט' : 'כווץ תפריט'}
        >
          <Icon name={isCollapsed ? 'ChevronLeft' : 'ChevronRight'} className="w-4 h-4" />
        </button>
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {/* Dashboard Item */}
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
            activeModule === 'dashboard'
              ? 'bg-[#43D6CB] text-[#183036] shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-[#103F46]'
          }`}
          title="מסך הבית"
        >
          <div className="flex-shrink-0">
            <Icon name="LayoutDashboard" className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-right flex items-center justify-between">
              <span className="font-bold">מסך הבית</span>
              <span className="text-[10px] opacity-75">בית</span>
            </div>
          )}
        </button>
        {/* Categorized modules */}
        {categories.map((cat) => {
          const catModules = MODULES_LIST.filter((m) => m.category === cat.id && m.id !== 'dashboard');
          if (catModules.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[11px] font-bold text-zinc-500 tracking-wide">
                  {cat.label}
                </div>
              )}
              {catModules.map((module) => {
                const isActive = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveModule(module.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all relative group cursor-pointer ${
                      isActive
                        ? 'bg-[#103F46] text-[#43D6CB] font-bold border border-[#43D6CB]/50 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#103F46]'
                    }`}
                    title={`${module.titleHebrew} (#${module.number})`}
                  >
                    {/* Module number & icon */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[#43D6CB] text-[#183036]'
                            : 'bg-[#183036] text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      >
                        <Icon name={module.iconName} className="w-3.5 h-3.5" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-[#183036] text-zinc-400 px-1 rounded border border-zinc-800">
                        {module.number}
                      </span>
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 text-right truncate">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{module.titleHebrew}</span>
                          {module.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-medium">
                              {module.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#43D6CB] rounded-l-full" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Project Quick Info Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#31535A] bg-[#183036]/50">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
            <span>פרויקט פעיל:</span>
            <span className="font-bold text-zinc-200 truncate max-w-[110px]">{activeProject.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
            <div className="text-center">
              <span className="text-[#43D6CB] font-bold block">{activeProject.concepts.length}</span>
              קונספטים
            </div>
            <div className="text-center">
              <span className="text-[#43D6CB] font-bold block">{activeProject.savedInspirations.length}</span>
              השראות
            </div>
            <div className="text-center">
              <span className="text-[#43D6CB] font-bold block">{activeProject.colorPalettes.length}</span>
              פלטות
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
