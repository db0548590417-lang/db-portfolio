import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { MODULES_LIST } from '../../data/modules';
import { Icon } from '../common/Icon';

export const Dashboard: React.FC = () => {
  const {
    activeProject,
    setActiveModule,
    updateActiveProject,
    projects,
    setActiveProjectId,
    createProject,
    showToast,
  } = useProject();

  const [briefInput, setBriefInput] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjName, setNewProjName] = useState('');

  const handleNewProject = () => {
    const name = briefInput.trim();
    if (!name) { showToast('יש לתת שם לפרויקט', 'info'); return; }
    createProject(name);
    setBriefInput('');
    showToast('הפרויקט נפתח בהצלחה', 'success');
  };

  const handleInspirationBomb = () => {
    if (briefInput.trim()) {
      updateActiveProject((p) => ({
        ...p,
        brief: { ...p.brief, productOrService: briefInput.trim() },
      }));
    }
    setActiveModule('inspiration_hunter');
  };

  const handleConceptDirector = () => {
    if (briefInput.trim()) {
      updateActiveProject((p) => ({
        ...p,
        brief: { ...p.brief, productOrService: briefInput.trim() },
      }));
    }
    setActiveModule('creative_director');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 lg:p-10 space-y-12 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4">

        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
          איזה פרויקט מתחילים היום?
        </h1>

        <p className="text-base lg:text-lg text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed">
          ההשראה, הקריאייטיב וכלי העיצוב שלך — במקום אחד.
        </p>

        {/* Central Search & Action Input */}
        <div className="max-w-3xl mx-auto bg-[#181A1E] border border-zinc-700/80 rounded-2xl p-2.5 shadow-2xl focus-within:border-[#43D6CB] transition-all duration-200">
          <div className="flex items-center gap-3 px-3">
            <Icon name="Sparkle" className="w-5 h-5 text-[#43D6CB] flex-shrink-0" />
            <input
              type="text"
              value={briefInput}
              onChange={(e) => setBriefInput(e.target.value)}
              placeholder="איך נקרא לפרויקט החדש?"
              className="w-full bg-transparent border-none text-white placeholder-zinc-500 text-sm focus:outline-none py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewProject();
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 px-1 border-t border-zinc-800/80 mt-2">
            <div className="text-[11px] text-zinc-500 hidden sm:block">
              פרויקט פעיל: <strong className="text-zinc-300">{activeProject.name}</strong>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleConceptDirector}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#22252A] hover:bg-[#2A2E35] border border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Icon name="Lightbulb" className="w-3.5 h-3.5 text-amber-400" />
                <span>בוא נחשוב על קונספט</span>
              </button>

              <button
                onClick={handleNewProject}
                className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-[#43D6CB] to-[#43D6CB] hover:from-teal-500 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2"
              >
                <Icon name="Compass" className="w-4 h-4" />
                <span>פתח פרויקט חדש</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Immediate Access / Quick Interactive Tools preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Color Laboratory Banner */}
        <div
          onClick={() => setActiveModule('color_lab')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#1A1C21] to-[#141518] border border-zinc-800 hover:border-[#43D6CB]/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-[#43D6CB]">
                <Icon name="Palette" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-[#43D6CB] transition">מעבדת צבע אינטראקטיבית</h3>
                <p className="text-xs text-zinc-400">הרמוניות, גרדיאנטים חיים, זהב מלכותי ודגימת צבע מתמונה</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
              זמין תמיד
            </span>
          </div>

          <div className="flex items-center gap-1.5 h-7 rounded-lg overflow-hidden border border-zinc-800 p-1 bg-zinc-950">
            {['#0C0D0E', '#1D2125', '#7D6A4E', '#C5A059', '#F3E8CE'].map((hex) => (
              <div key={hex} className="flex-1 h-full rounded transition-transform group-hover:scale-95" style={{ backgroundColor: hex }} title={hex} />
            ))}
          </div>
        </div>

        {/* Typography Playground Banner – hidden in V8 */}
        {false && (
        <div
          onClick={() => setActiveModule('typography_playground')}
          className="group relative overflow-hidden bg-gradient-to-br from-[#1A1C21] to-[#141518] border border-zinc-800 hover:border-[#43D6CB]/50 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Icon name="Type" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">מגרש טיפוגרפיה עברית</h3>
                <p className="text-xs text-zinc-400">עורך קנבס חי, טקסט עקמומי לאורך נתיב, צלליות ואוטליין</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
              זמין תמיד
            </span>
          </div>

          <div className="h-7 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center px-4">
            <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-teal-300 to-amber-100">
              אותיות מדברות. קומפוזיציה חיה.
            </span>
          </div>
        </div>
        )}
      </div>

      {/* Visible Tool Modules Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Grid" className="w-4 h-4 text-[#43D6CB]" />
            <h2 className="text-base font-bold text-white">11 מודולי העבודה של דקל AI</h2>
          </div>
          
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {MODULES_LIST.filter((m) => m.id !== 'dashboard').map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className="text-right p-4 rounded-2xl bg-[#183036] hover:bg-[#1D2026] border border-zinc-800 hover:border-zinc-700 transition-all duration-200 group flex flex-col justify-between h-36 relative overflow-hidden"
            >
              <div className="flex items-start justify-between w-full">
                <div className="w-8 h-8 rounded-xl bg-zinc-800/80 border border-zinc-700 group-hover:border-[#43D6CB]/40 flex items-center justify-center text-zinc-300 group-hover:text-[#43D6CB] transition">
                  <Icon name={module.iconName} className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  {module.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {module.badge}
                    </span>
                  )}
                  <span className="text-[11px] font-black text-zinc-600 group-hover:text-zinc-400">
                    #{module.number}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#43D6CB] transition">
                  {module.titleHebrew}
                </h4>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {module.subtitleHebrew}
                </p>
              </div>

              <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-transparent group-hover:bg-[#43D6CB] transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Saved Projects & Recent Work Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="FolderOpen" className="w-4 h-4 text-zinc-400" />
            <h2 className="text-base font-bold text-white">פרויקטים שמורים ועבודות אחרונות</h2>
          </div>
          <button
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className="flex items-center gap-1.5 text-xs text-[#43D6CB] hover:text-teal-300 font-bold"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            <span>פרויקט חדש</span>
          </button>
        </div>

        {isCreatingNew && (
          <div className="p-4 bg-[#181A1E] border border-zinc-700 rounded-xl flex items-center gap-3">
            <input
              type="text"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="שם הפרויקט (למשל: מיתוג בוטיק יין כנען)..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#43D6CB]"
            />
            <button
              onClick={() => {
                if (newProjName.trim()) {
                  createProject(newProjName.trim());
                  setNewProjName('');
                  setIsCreatingNew(false);
                }
              }}
              className="px-4 py-2 bg-[#43D6CB] text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition"
            >
              צור עכשיו
            </button>
            <button
              onClick={() => setIsCreatingNew(false)}
              className="px-3 py-2 bg-zinc-800 text-zinc-400 text-xs rounded-lg hover:bg-zinc-700"
            >
              ביטול
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setActiveProjectId(proj.id)}
              className={`p-4 rounded-xl border cursor-pointer transition text-right ${
                proj.id === activeProject.id
                  ? 'bg-[#103F46] border-[#43D6CB]/50 shadow-md'
                  : 'bg-[#183036] border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-white text-sm">{proj.name}</span>
                {proj.id === activeProject.id && (
                  <span className="text-[10px] bg-[#43D6CB]/20 text-[#43D6CB] px-2 py-0.5 rounded font-bold">
                    נוכחי
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mb-3 truncate">לקוח: {proj.clientName || 'כללי'}</p>
              <div className="flex items-center gap-3 text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-2">
                <span>{proj.concepts.length} קונספטים</span>
                <span>•</span>
                <span>{proj.savedInspirations.length} השראות</span>
                <span>•</span>
                <span>{proj.colorPalettes.length} פלטות</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
