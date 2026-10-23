import dekelLogo from '../../dekel-ai-logo.svg';
import React, { useState } from 'react';
import { AccountButton } from './AccountGate';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { ProjectEditor } from './ProjectEditor';

interface NavbarProps {
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const {
    activeProject,
    projects,
    setActiveProjectId,
    createProject,
    deleteProject,
    setActiveModule,
    activeModule,
    globalPrefs,
  } = useProject();

  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreatingProject(false);
    setIsProjectDropdownOpen(false);
  };

  return (
    <header className="h-16 bg-[#183036] border-b border-[#31535A] px-4 flex items-center justify-between z-30 select-none">
      {/* Right side in RTL: Branding & Project selector */}
      <div className="flex items-center gap-4">
        {/* Brand */}
        <button
          onClick={() => setActiveModule('dashboard')}
          className="flex items-center gap-2.5 group cursor-pointer text-right"
          title="חזרה למסך הבית"
        >
          <span className="dekel-logo-frame" aria-label="דקל AI">
            <img src={dekelLogo} alt="דקל AI" className="dekel-logo" />
          </span>
          <span className="dekel-brand-caption hidden xl:flex">סביבת העבודה היצירתית שלך</span>
        </button>

        <div className="h-5 w-px bg-zinc-800 hidden md:block" />

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#103F46] hover:bg-[#103F46] border border-zinc-800 rounded-lg text-sm text-zinc-200 transition-colors"
          >
            <Icon name="FolderOpen" className="w-4 h-4 text-[#43D6CB]" />
            <span className="font-semibold max-w-[140px] truncate">{activeProject.name}</span>
            <span className="text-xs text-zinc-500 hidden sm:inline">({activeProject.clientName || 'ללא לקוח'})</span>
            <Icon name="ChevronRight" className="w-3.5 h-3.5 text-zinc-400 rotate-90" />
          </button>

          {isProjectDropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-72 bg-[#103F46] border border-zinc-700/80 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
              onMouseLeave={() => setIsProjectDropdownOpen(false)}
            >
              <div className="text-xs font-bold text-zinc-400 px-2 py-1.5 mb-1 flex items-center justify-between">
                <span>פרויקטים שמורים</span>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                  {projects.length} פרויקטים
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 mb-2">
                {projects.map((proj) => (
                  <div key={proj.id} className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-right px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      proj.id === activeProject.id
                        ? 'bg-[#43D6CB]/15 text-[#43D6CB] font-bold border border-[#43D6CB]/30'
                        : 'text-zinc-300 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate font-semibold">{proj.name}</p>
                      <p className="text-[10px] text-zinc-500">{proj.clientName || 'לקוח כללי'}</p>
                    </div>
                    {proj.id === activeProject.id && <Icon name="Check" className="w-3.5 h-3.5 text-[#43D6CB]" />}
                  </button>
                  <button type="button" title={`מחק את ${proj.name}`} aria-label={`מחק את ${proj.name}`}
                    disabled={projects.length <= 1}
                    onClick={(e) => {e.stopPropagation(); if(window.confirm(`למחוק לצמיתות את הפרויקט ״${proj.name}״ וכל הנתונים שלו? לא ניתן לבטל.`)) {deleteProject(proj.id); setIsProjectDropdownOpen(false);} }}
                    className="p-2 text-rose-400 hover:bg-rose-500/15 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                    <Icon name="Trash2" className="w-4 h-4" />
                  </button>
                  </div>
                ))}
              </div>

              {isCreatingProject ? (
                <form onSubmit={handleCreateNewProject} className="pt-2 border-t border-zinc-800">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="שם הפרויקט החדש..."
                    autoFocus
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white mb-2 focus:outline-none focus:border-[#43D6CB]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-1 px-2 text-xs bg-[#43D6CB] text-white font-bold rounded-lg hover:bg-blue-600 transition cursor-pointer"
                    >
                      צור פרויקט
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProject(false)}
                      className="py-1 px-2 text-xs bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 cursor-pointer"
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingProject(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-xs text-zinc-400 hover:text-white transition"
                >
                  <Icon name="Plus" className="w-3.5 h-3.5" />
                  <span>יצירת פרויקט חדש</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isProjectEditorOpen && <ProjectEditor onClose={()=>setIsProjectEditorOpen(false)}/>}
      {/* Center: Quick navigation / current mode badge */}
      <div className="hidden lg:flex items-center gap-2">
        {globalPrefs.excludePeople && (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            פילטר ללא אנשים פעיל
          </span>
        )}
        <span className="text-xs text-zinc-400 bg-[#103F46] px-2.5 py-1 rounded-md border border-zinc-800">
          פרופיל עיצוב: <strong className="text-zinc-200">
            {(activeProject.creativeProfile || globalPrefs.creativeProfile) === 'hasidic_traditional' ? 'מסורתי / מלכותי' :
             (activeProject.creativeProfile || globalPrefs.creativeProfile) === 'modern_luxury' ? 'יוקרה בינלאומית' :
             (activeProject.creativeProfile || globalPrefs.creativeProfile) === 'minimalist' ? 'מינימליזם שוויצרי' : 'ברוטליסטי נועז'}
          </strong>
        </span>
      </div>

      {/* Left side in RTL: Quick tools & settings */}
      <div className="flex items-center gap-2">
        <AccountButton />
        <button onClick={()=>setIsProjectEditorOpen(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#43D6CB] text-[#183036] font-bold text-xs">עריכת פרויקט</button>
        <button
          onClick={() => setActiveModule('system_health')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeModule === 'system_health'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-[#103F46] text-zinc-200 hover:bg-[#103F46] border border-zinc-800'
          }`}
          title="בדיקת תקינות המערכת ומוכנות לפריסה"
        >
          <Icon name="ShieldCheck" className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">בדיקת תקינות</span>
        </button>

        <button
          onClick={() => setActiveModule('export_studio')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            activeModule === 'export_studio'
              ? 'bg-[#43D6CB] text-white shadow-md shadow-blue-500/20'
              : 'bg-[#103F46] text-zinc-200 hover:bg-[#103F46] border border-zinc-800'
          }`}
        >
          <Icon name="Download" className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ייצוא סטודיו</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 bg-[#103F46] hover:bg-[#103F46] text-zinc-300 hover:text-white border border-zinc-800 rounded-lg transition-colors"
          title="הגדרות קריאייטיב וחיבורי API"
        >
          <Icon name="Settings" className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
