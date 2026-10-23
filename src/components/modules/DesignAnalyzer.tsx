import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';

interface ChecklistItem {
  id: string;
  item: string;
  status: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export const DesignAnalyzer: React.FC = () => {
  const { activeProject, showToast } = useProject();

  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80'
  );
  const [imageBase64, setImageBase64] = useState<string>('');
  const [designGoal, setDesignGoal] = useState<string>(
    'מודעת פרימיום למגזין סופ״ש — יוקרה, בהירות וקריאות גבוהה'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [critiqueResult, setCritiqueResult] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setImageBase64(b64);
      setImageUrl(b64);
      showToast('הקובץ נטען ומוכן לביקורת', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRunCritique = async () => {
    let payloadBase64 = imageBase64;
    if (!payloadBase64 && imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        payloadBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {}
    }

    if (!payloadBase64) {
      showToast('נא להעלות תמונת עיצוב לבדיקה', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/design-analyzer/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: payloadBase64,
          designGoal,
        }),
      });

      if (!res.ok) throw new Error('שגיאה בביקורת העיצוב');
      const data = await res.json();
      setCritiqueResult(data);
      if (Array.isArray(data.checklist)) {
        setChecklist(
          data.checklist.map((c: any) => ({
            ...c,
            status: 'pending',
          }))
        );
      }
      showToast('ביקורת העיצוב הושלמה!', 'success');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בניתוח העיצוב', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' }
          : item
      )
    );
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="CheckCircle2" className="w-4 h-4" />
            <span>מודול #9 — מבקר עיצוב גרפי מעשי</span>
          </div>
          <h1 className="text-2xl font-black text-white">ביקורת קריאות, היררכיה וצ׳קליסט לשיפור</h1>
          <p className="text-xs text-zinc-400">
            הערכת מוקד משיכה, מרווחי נשימה, ניגודיות טיפוגרפית וצ׳קליסט מעשי שניתן לסמן כהושלם.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Icon name="Upload" className="w-3.5 h-3.5 text-[#43D6CB]" />
            העלה עיצוב לבדיקה
          </button>
          <button
            onClick={handleRunCritique}
            disabled={isLoading}
            className="px-5 py-2 bg-[#43D6CB] hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {isLoading ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
                מבצע ביקורת...
              </>
            ) : (
              <>
                <Icon name="CheckCircle2" className="w-4 h-4" />
                הפעל ביקורת עיצוב
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Design Image & Goal Setting (4 cols) */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
          <div>
            <label className="text-zinc-300 font-bold block mb-1">הגדרת מטרת העיצוב:</label>
            <textarea
              value={designGoal}
              onChange={(e) => setDesignGoal(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#43D6CB]"
            />
          </div>

          <div>
            <span className="text-zinc-400 font-bold block mb-1">תצוגת העיצוב:</span>
            <div className="aspect-[4/3] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Design to critique" className="w-full h-full object-contain" />
              ) : (
                <span className="text-zinc-600 text-xs">לא הועלתה תמונה</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Critique Results & Interactive Checklist (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {!critiqueResult && !isLoading && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="CheckCircle2" className="w-8 h-8 text-[#43D6CB] mx-auto opacity-70" />
              <h3 className="font-bold text-white text-sm">הארט דירקטור מוכן לבדיקה</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                לחץ על "הפעל ביקורת עיצוב" כדי לקבל ניתוח מקצועי של קריאות, היררכיה, מרווחי נשימה וצ׳קליסט מעשי.
              </p>
            </div>
          )}

          {critiqueResult && (
            <div className="space-y-5 animate-in fade-in">
              {/* Score Banner */}
              <div className="p-5 bg-gradient-to-r from-zinc-900 to-[#103F46] border border-zinc-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-400 block mb-0.5">ציון איכות עיצוב:</span>
                  <h3 className="text-xl font-black text-white">{critiqueResult.overallScore} / 10</h3>
                  <p className="text-xs text-zinc-300 mt-1 max-w-xl">{critiqueResult.summary}</p>
                </div>
              </div>

              {/* 10 Scores Matrix */}
              {critiqueResult.scores && (
                <div className="p-4 bg-[#103F46] border border-zinc-800 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-zinc-300">מדדי ביקורת (1-10):</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {Object.entries(critiqueResult.scores).map(([metric, score]: any) => (
                      <div key={metric} className="bg-zinc-900 p-2 rounded-lg border border-zinc-800 text-center">
                        <span className="text-[10px] text-zinc-400 block truncate">{metric}</span>
                        <span className="text-xs font-bold text-[#43D6CB] font-mono">{score}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Checklist */}
              {checklist.length > 0 && (
                <div className="p-5 bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Icon name="CheckCircle2" className="w-4 h-4 text-emerald-400" />
                      <span>צ׳קליסט מעשי לשיפור (סמן כהושלם):</span>
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {checklist.filter((c) => c.status === 'completed').length} / {checklist.length} בוצעו
                    </span>
                  </div>

                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklistItem(item.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          item.status === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/30 line-through text-zinc-400'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            onChange={() => {}} // handled by div
                            className="w-4 h-4 accent-[#43D6CB] cursor-pointer"
                          />
                          <span className="text-xs font-medium">{item.item}</span>
                        </div>

                        {item.priority && (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              item.priority === 'high'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            עדיפות {item.priority === 'high' ? 'גבוהה' : 'בינונית'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
