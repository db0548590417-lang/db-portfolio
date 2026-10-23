import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { SAMPLE_INSPIRATIONS } from '../../data/sampleInspirations';
import { InspirationItem } from '../../types';
import { Icon } from '../common/Icon';

export const InspirationMixer: React.FC = () => {
  const { activeProject, updateActiveProject, globalPrefs, showToast } = useProject();

  // Candidate inspirations: saved from active project + curated samples
  const candidates: InspirationItem[] = [
    ...activeProject.savedInspirations,
    ...SAMPLE_INSPIRATIONS.filter(
      (s) => !activeProject.savedInspirations.some((i) => i.id === s.id)
    ),
  ];

  const [selectedIds, setSelectedIds] = useState<string[]>([
    candidates[0]?.id || '',
    candidates[1]?.id || '',
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [mixResult, setMixResult] = useState<any>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 5) {
        showToast('ניתן לבחור עד 5 השראות למיקס', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleMix = async (action = 'ערבב השראות') => {
    const selectedItems = candidates.filter((c) => selectedIds.includes(c.id));
    if (selectedItems.length < 2) {
      showToast('בחר לפחות 2 השראות כדי לערבב', 'info');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/inspiration-mixer/mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: selectedItems,
          action,
          excludePeople: globalPrefs.excludePeople,
        }),
      });

      if (!res.ok) throw new Error('שגיאה בערבוב ההשראות');
      const data = await res.json();
      setMixResult(data);
      showToast('הסינתזה הקריאייטיבית הושלמה!', 'success');
    } catch (err: any) {
      showToast(err.message || 'שגיאה במיקסר', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveMixToProject = (concept: any) => {
    const newConcept = {
      id: 'concept-mix-' + Date.now(),
      conceptName: concept.title,
      coreIdea: concept.coreIdea,
      visualExecution: concept.visualExecution,
      suggestedHeadline: concept.headline,
      emotionalMechanism: 'מיקס השראות וסינתזה מקורית',
      whyItWorks: concept.howItAvoidsDirectCopying,
      suggestedDesignTechnique: 'Hybrid Creative Synthesis',
      imageGenerationPrompt: concept.imagePrompt,
      createdAt: Date.now(),
    };
    updateActiveProject((p) => ({
      ...p,
      concepts: [newConcept, ...p.concepts],
    }));
    showToast(`הקונספט הממוזג "${concept.title}" נשמר בפרויקט!`, 'success');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Blend" className="w-4 h-4" />
            <span>מודול #8 — מיקסר השראות וסינתזה</span>
          </div>
          <h1 className="text-2xl font-black text-white">מיזוג עקרונות חזותיים ללא העתקה</h1>
          <p className="text-xs text-zinc-400">
            בחר 2 עד 5 רפרנסים שונים. Gemini יחלץ את מנגנוני הקומפוזיציה, המטאפורה והצבע ויחשל מהם כיוון חדש לחלוטין.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['ערבב השראות', 'צור כיוון חדש', 'הפתע אותי', 'שדרג את הרעיון'].map((actionText) => (
            <button
              key={actionText}
              onClick={() => handleMix(actionText)}
              disabled={isLoading || selectedIds.length < 2}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-[#43D6CB] text-white disabled:opacity-40 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Icon name="Sparkles" className="w-3.5 h-3.5" />
              <span>{actionText}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Inspirations Tray */}
      <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white">
            בחר 2–5 השראות למיזוג (נבחרו {selectedIds.length}/5):
          </span>
          <span className="text-zinc-500 text-[11px]">לחץ על תמונה לבחירה או הסרה</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {candidates.slice(0, 12).map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`relative aspect-square rounded-xl overflow-hidden border transition ${
                  isSelected
                    ? 'border-[#43D6CB] ring-2 ring-[#43D6CB] scale-95'
                    : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
                }`}
              >
                <img src={item.thumbUrl || item.url} alt={item.title} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-[#43D6CB]/20 flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-[#43D6CB] text-white flex items-center justify-center font-bold text-xs shadow-md">
                      ✓
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 p-1 bg-black/70 text-[9px] text-white truncate text-center">
                  {item.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mixing Results */}
      {isLoading && (
        <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
          <Icon name="RefreshCw" className="w-8 h-8 text-[#43D6CB] mx-auto animate-spin" />
          <h3 className="font-bold text-white text-sm">מחלץ מנגנונים ומסנתז כיוון חדש...</h3>
          <p className="text-xs text-zinc-500">מיזוג של {selectedIds.length} השראות ללא העתקה ישירה</p>
        </div>
      )}

      {mixResult && !isLoading && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-white">קונספטים שנוצרו מהסינתזה:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mixResult.synthesizedConcepts?.map((concept: any, idx: number) => (
              <div
                key={concept.id || idx}
                className="bg-[#183036] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-black text-white">{concept.title}</h4>
                    <span className="text-[10px] font-mono text-[#43D6CB] bg-[#43D6CB]/10 px-2 py-0.5 rounded font-bold">
                      מיזוג #{idx + 1}
                    </span>
                  </div>

                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl mb-3">
                    <span className="text-[10px] text-zinc-500 block">כותרת מומלצת:</span>
                    <p className="font-bold text-[#43D6CB] text-xs">"{concept.headline}"</p>
                  </div>

                  <div className="space-y-2 text-zinc-300">
                    <div>
                      <strong className="text-white block">הרעיון המרכזי:</strong>
                      <p className="leading-relaxed">{concept.coreIdea}</p>
                    </div>
                    <div>
                      <strong className="text-white block">ביצוע ויזואלי:</strong>
                      <p className="leading-relaxed text-zinc-400">{concept.visualExecution}</p>
                    </div>
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 text-[11px]">
                      <strong>מדוע זו יצירה מקורית:</strong> {concept.howItAvoidsDirectCopying}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={() => saveMixToProject(concept)}
                    className="px-4 py-2 bg-[#43D6CB] hover:bg-teal-600 text-white font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Icon name="Plus" className="w-3.5 h-3.5" />
                    שמור קונספט לפרויקט
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
