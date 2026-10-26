import React, { useEffect, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { UsagePanel } from './UsagePanel';
import { RecoveryPanel } from './RecoveryPanel';
import { GeminiSetup } from './GeminiSetup';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'creative'|'connection';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab='creative' }) => {
  const {
    globalPrefs,
    updateGlobalPrefs,
    exportProjectBackup,
    exportProjectMetadata,
    importProjectBackup,
    importProjectFile,
    cloudStatus, cloudConfigured, syncCloud,
    activeProject,
    updateActiveProject,
  } = useProject();

  const [activeTab, setActiveTab] = useState<'creative' | 'search_provider' | 'backup' | 'connection'>('creative');
  useEffect(()=>{if(isOpen)setActiveTab(initialTab);},[isOpen,initialTab]);
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
    if (!window.confirm('ייבוא הגיבוי יחליף את רשימת הפרויקטים במכשיר. מומלץ להוריד גיבוי קודם. להמשיך?')) return;
    void importProjectFile(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl bg-[#103F46] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-[#43D6CB]" />
            <h2 id="settings-title" className="text-xl font-bold text-white">הגדרות</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-[#C1D1D5] hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto whitespace-nowrap border-b border-zinc-800 px-6 gap-4 text-sm font-bold">
          <button
            onClick={() => setActiveTab('creative')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'creative'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-[#C1D1D5] hover:text-white'
            }`}
          >
            סגנון עבודה
          </button>
          <button
            onClick={() => setActiveTab('search_provider')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'search_provider'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-[#C1D1D5] hover:text-white'
            }`}
          >
            מקורות השראה
          </button>
          <button onClick={() => setActiveTab('connection')} className={`py-3 border-b-2 transition ${activeTab === 'connection' ? 'border-[#43D6CB] text-[#43D6CB]' : 'border-transparent text-[#C1D1D5] hover:text-white'}`}>חיבור AI</button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'backup'
                ? 'border-[#43D6CB] text-[#43D6CB]'
                : 'border-transparent text-[#C1D1D5] hover:text-white'
            }`}
          >
            גיבוי וייבוא
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
                      <div className="text-[12px] text-[#C1D1D5] mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* No people filter */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>סינון דמויות אנושיות (ללא אנשים)</span>
                    <span className="text-[12px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                      מומלץ למגזר הדתי/חרדי
                    </span>
                  </div>
                  <p className="text-[13px] text-[#C1D1D5] mt-0.5">
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
                          : 'border-zinc-800 bg-zinc-900 text-[#C1D1D5] hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'search_provider' && <div className="space-y-4 text-sm text-zinc-200"><h3 className="font-bold text-white">מקורות ההשראה הפעילים</h3><p>בחר בצייד ההשראות בין מקורות עיצוב חרדיים לבין חיפוש בינלאומי ב־Openverse. ניתן לבחור כל אתר בנפרד ולראות את מצב החיבור שלו.</p><p>חיפוש התמונות אינו דורש מפתח Gemini. ניתוח חזותי ומיקסר ההשראות משתמשים בחיבור ה־AI שלך.</p></div>}

          {activeTab === 'connection' && <><GeminiSetup /><UsagePanel /><RecoveryPanel /></>}
          {activeTab === 'backup' && (
            <div className="space-y-4"><section className="rounded-xl border border-[#31535A] p-4 space-y-3 text-sm text-zinc-200"><h3 className="font-bold text-white">שמירה בענן</h3><p role="status">{cloudStatus}</p>{cloudConfigured ? <><p>הפעלה ראשונה תעלה את הפרויקטים והתמונות בחשבון ותמזג לפי מועד העדכון עם העותק בענן. לאחר מכן שינויים מסתנכרנים אוטומטית. גיבוי ZIP עדיין מומלץ.</p><button onClick={()=>void syncCloud()} className="rounded-lg border border-[#43D6CB] p-2 text-[#43D6CB]">הפעל / סנכרן עכשיו</button></> : <p>חיבור הענן מוכן בקוד. הפעלת האחסון דורשת הגדרת מסד קבוע בשרת והפעלת CLOUD_STORAGE_ENABLED.</p>}</section>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Icon name="Download" className="w-4 h-4 text-[#43D6CB]" />
                  <span>ייצוא גיבוי מלא של כל הפרויקטים</span>
                </div>
                <p className="text-[#C1D1D5] text-[13px]">
                  שמירת הפרויקטים בקובץ גיבוי.
                </p>
                <button
                  onClick={exportProjectBackup}
                  className="px-4 py-2 bg-[#43D6CB] text-white font-bold rounded-lg hover:bg-teal-600 transition flex items-center gap-2"
                >
                  <Icon name="Download" className="w-3.5 h-3.5" />
                  הורד ZIP עם הפרויקטים והתמונות
                </button>
                <button onClick={exportProjectMetadata} className="block text-sm text-zinc-300 underline">גיבוי נתונים בלבד (JSON, ללא תמונות)</button>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <Icon name="Upload" className="w-4 h-4 text-emerald-400" />
                  <span>ייבוא פרויקטים מקובץ גיבוי</span>
                </div>
                <p className="text-[#C1D1D5] text-[13px]">
                  העלה ZIP לשחזור נתונים ותמונות, או JSON ישן לשחזור נתוני פרויקטים בלבד.
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg cursor-pointer transition">
                  <Icon name="Upload" className="w-3.5 h-3.5" />
                  <span>בחר קובץ גיבוי מהמחשב</span>
                  <input type="file" accept=".zip,.json" onChange={handleFileUpload} className="hidden" />
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
