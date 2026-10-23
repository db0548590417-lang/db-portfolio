import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { SystemHealthDashboard } from '../modules/SystemHealthDashboard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    globalPrefs,
    updateGlobalPrefs,
    exportProjectBackup,
    importProjectBackup,
    activeProject,
    updateActiveProject,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'creative' | 'search_provider' | 'backup' | 'diagnostics'>('creative');
  const [unsplashKey, setUnsplashKey] = useState(globalPrefs.unsplashApiKey || '');
  const [pexelsKey, setPexelsKey] = useState(globalPrefs.pexelsApiKey || '');

  if (!isOpen) return null;

  const handleSaveApiKeys = (e: React.FormEvent) => {
    e.preventDefault();
    updateGlobalPrefs({
      unsplashApiKey: unsplashKey.trim(),
      pexelsApiKey: pexelsKey.trim(),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        importProjectBackup(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-6xl bg-[#103F46] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-[#43D6CB]" />
            <h2 className="text-base font-bold text-white">הגדרות קריאייטיב וחיבורים מקצועיים</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-6 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('creative')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'creative'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            פרופיל קריאייטיב גלובלי
          </button>
          <button
            onClick={() => setActiveTab('search_provider')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'search_provider'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            ספקי חיפוש השראות
          </button>
          <button onClick={() => setActiveTab('diagnostics')} className={`py-3 border-b-2 transition ${activeTab === 'diagnostics' ? 'border-[#43D6CB] text-[#43D6CB]' : 'border-transparent text-zinc-400 hover:text-white'}`}>בדיקות מודלים ומערכת</button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            גיבוי וייבוא פרויקטים
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
          {activeTab === 'creative' && (
            <div className="space-y-4">
              <div>
                <label className="block text-zinc-300 font-bold mb-1.5">
                  פרופיל עיצוב לפרויקט הפעיל (נשמר בנפרד בכל פרויקט):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'hasidic_traditional', label: 'מסורתי / מלכותי / חסידי', desc: 'שערים מלכותיים, זהב מוטבע, הדר, ספרי קודש' },
                    { id: 'modern_luxury', label: 'יוקרה בינלאומית (Haute)', desc: 'אלגנטיות שקטה, chiaroscuro, מינימליזם אנין' },
                    { id: 'minimalist', label: 'שוויצרי מינימליסטי', desc: 'גריד קפדני, טיפוגרפיה חזקה, מרחב לבן' },
                    { id: 'bold_brutalist', label: 'ברוטליסטי נועז ועכשווי', desc: 'קונטרסט גבוה, טיפוגרפיה מונומנטלית' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => updateActiveProject(project => ({...project, creativeProfile: p.id as typeof globalPrefs.creativeProfile}))}
                      className={`p-3 rounded-xl border text-right transition ${
                        (activeProject.creativeProfile || globalPrefs.creativeProfile) === p.id
                          ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-white'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* No people filter */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>סינון דמויות אנושיות (ללא אנשים)</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                      מומלץ למגזר הדתי/חרדי
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    מחייב את מחוללי ה-AI ומנועי החיפוש להתמקד במוצרים, חפצים, טיפוגרפיה ומרחב שלילי בלבד.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={globalPrefs.excludePeople}
                  onChange={(e) => updateGlobalPrefs({ excludePeople: e.target.checked })}
                  className="w-4 h-4 accent-[#43D6CB] cursor-pointer"
                />
              </div>

              {/* Aspect Ratio preference */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1.5">יחס גובה-רוחב מועדף להדמיות:</label>
                <div className="flex gap-2">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => updateGlobalPrefs({ preferredAspectRatio: ratio })}
                      className={`px-3 py-1.5 rounded-lg border font-mono text-xs transition ${
                        globalPrefs.preferredAspectRatio === ratio
                          ? 'border-[#43D6CB] bg-[#43D6CB] text-white font-bold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search_provider' && (
            <form onSubmit={handleSaveApiKeys} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px]">
                <strong>שקיפות ואמינות מקצועית:</strong> דקל AI לעולם אינה מייצרת תוצאות חיפוש מזויפות. כברירת מחדל פעיל מאגר דגימות מקצועי ומאומת. לחיפוש תמונות חי מול שירותים חיצוניים, ניתן להגדיר מפתח חינמי של Unsplash או Pexels.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">
                    ספק פעיל במנוע צייד ההשראות:
                  </label>
                  <select
                    value={globalPrefs.searchProvider}
                    onChange={(e) => updateGlobalPrefs({ searchProvider: e.target.value as any })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#43D6CB]"
                  >
                    <option value="samples">מאגר דגימות ורפרנסים מקצועיים (מובנה ללא מפתח)</option>
                    <option value="unsplash">Unsplash API (דורש Access Key)</option>
                    <option value="pexels">Pexels API (דורש API Key)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Unsplash Access Key:</label>
                  <input
                    type="password"
                    value={unsplashKey}
                    onChange={(e) => setUnsplashKey(e.target.value)}
                    placeholder="הדבק כאן מפתח Unsplash Access Key..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#43D6CB]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Pexels API Key:</label>
                  <input
                    type="password"
                    value={pexelsKey}
                    onChange={(e) => setPexelsKey(e.target.value)}
                    placeholder="הדבק כאן מפתח Pexels API Key..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#43D6CB]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#43D6CB] text-white font-bold rounded-lg hover:bg-teal-600 transition"
                >
                  שמור הגדרות ספקים
                </button>
              </div>
            </form>
          )}

          {activeTab === 'diagnostics' && (
            <div className="h-[62vh] -mx-4"><SystemHealthDashboard /></div>
          )}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Icon name="Download" className="w-4 h-4 text-[#43D6CB]" />
                  <span>ייצוא גיבוי מלא של כל הפרויקטים</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  מוריד קובץ JSON מאובטח המכיל את כל הבריפים, הקונספטים שנשמרו, ההשראות, פלטות הצבעים ועיצובי הטיפוגרפיה.
                </p>
                <button
                  onClick={exportProjectBackup}
                  className="px-4 py-2 bg-[#43D6CB] text-white font-bold rounded-lg hover:bg-teal-600 transition flex items-center gap-2"
                >
                  <Icon name="Download" className="w-3.5 h-3.5" />
                  הורד קובץ JSON של כל העבודות
                </button>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Icon name="Upload" className="w-4 h-4 text-emerald-400" />
                  <span>ייבוא פרויקטים מקובץ גיבוי</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  העלה קובץ גיבוי JSON שיוצא בעבר כדי לשחזר את כל הנתונים.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg cursor-pointer transition">
                  <Icon name="Upload" className="w-3.5 h-3.5" />
                  <span>בחר קובץ JSON מהמחשב</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg transition"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
