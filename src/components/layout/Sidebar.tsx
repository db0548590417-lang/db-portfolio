import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { MODULES_LIST } from '../../data/modules';
import { Icon } from '../common/Icon';
import { ModuleId } from '../../types';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeModule, setActiveModule, activeProject, setSelectedConceptForVisual } = useProject();

  const previousConcepts = useRef({ projectId: activeProject.id, count: activeProject.concepts.length });
  useEffect(() => {
    if (previousConcepts.current.projectId === activeProject.id && activeProject.concepts.length > previousConcepts.current.count && isCollapsed) onToggleCollapse();
    previousConcepts.current = { projectId: activeProject.id, count: activeProject.concepts.length };
  }, [activeProject.id, activeProject.concepts.length, isCollapsed, onToggleCollapse]);

  const categories = [
    { id: 'discover', label: 'גילוי והשראה' },
    { id: 'ideate', label: 'קריאייטיב וקונספטים' },
    { id: 'craft', label: 'ארגז כלי העיצוב' },
    { id: 'refine', label: 'חידוד, גשטאלט וביקורת' },
    { id: 'export', label: 'ייצוא וגיבוי' },
  ];

  return (
    <aside
      className={`h-full min-h-0 shrink-0 bg-[#183036] border-l border-[#31535A] flex flex-col transition-all duration-200 z-20 select-none ${
        isCollapsed ? 'w-[68px]' : 'w-[264px]'
      }`}
    >
      {/* Top Toggle Button */}
      <div className="p-2 border-b border-[#31535A] flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-xs font-bold uppercase tracking-wider text-[#C1D1D5] px-2">
            סביבת עבודה
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-[#103F46] text-[#C1D1D5] hover:text-white transition mx-auto"
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
              : 'text-[#C1D1D5] hover:text-white hover:bg-[#103F46]'
          }`}
          title="מסך הבית"
        >
          <div className="flex-shrink-0">
            <Icon name="LayoutDashboard" className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 text-right flex items-center justify-between">
              <span className="font-bold">מסך הבית</span>
              <span className="text-[12px] opacity-75">בית</span>
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
                <div className="px-3 py-1 text-[13px] font-bold text-[#C1D1D5] tracking-wide">
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
                        : 'text-[#C1D1D5] hover:text-zinc-200 hover:bg-[#103F46]'
                    }`}
                    title={module.titleHebrew}
                  >
                    {/* Module number & icon */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[#43D6CB] text-[#183036]'
                            : 'bg-[#183036] text-[#C1D1D5] group-hover:text-zinc-200'
                        }`}
                      >
                        <Icon name={module.iconName} className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="flex-1 text-right truncate">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{module.titleHebrew}</span>
                          
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

      {!isCollapsed && activeProject.concepts.length > 0 && <section aria-label="קונספטים שמורים" className="shrink-0 border-t border-[#31535A] p-3 text-right">
        <h2 className="mb-2 text-xs font-bold text-[#43D6CB]">הקונספטים שלי ({activeProject.concepts.length})</h2>
        <div className="max-h-48 space-y-2 overflow-y-auto">{activeProject.concepts.map(concept => <button key={concept.id} onClick={() => { setSelectedConceptForVisual(concept); setActiveModule('visual_generator'); }} className="block w-full rounded-lg border border-[#31535A] p-2 text-right hover:border-[#43D6CB]">
          <span className="block text-xs font-bold text-white">{concept.conceptName}</span>
          <span className="mt-1 block text-[12px] text-zinc-300 line-clamp-2">{concept.coreIdea}</span>
          <span className="mt-1 block text-[12px] text-[#43D6CB]">יצירת תמונה מהקונספט ←</span>
        </button>)}</div>
      </section>}

      {/* Project Quick Info Footer */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#31535A] bg-[#183036]/50">
          <div className="flex items-center justify-between text-[13px] text-[#C1D1D5] mb-1">
            <span>פרויקט פעיל:</span>
            <span className="font-bold text-zinc-200 truncate max-w-[110px]">{activeProject.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[12px] text-[#C1D1D5] pt-1 border-t border-zinc-800/60">
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
