import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { buildBrandContext } from '../../data/brandContext';

const CREATIVE_METHODS = [
  { id: 'auto', name: 'תן ל־AI לבחור את שיטת החשיבה', desc: 'המערכת תבחר לפי המותג והבריף במקום שתצטרך לבחור שיטה' },
  { id: 'Gestalt', name: 'עקרונות גשטאלט (Gestalt)', desc: 'סגירות, דמיון, המשכיות, צורה-רקע' },
  { id: 'Visual metaphors', name: 'מטאפורות ויזואליות', desc: 'חיבור של שני עולמות זרים ליצירת משמעות חדשה' },
  { id: 'Negative space', name: 'מרחב שלילי (Negative Space)', desc: 'החלל הריק יוצר צורה נוספת ומפתיעה' },
  { id: 'Optical illusions', name: 'אשליות אופטיות', desc: 'טריקים ויזואליים הדורשים מהמוח פענוח' },
  { id: 'Unexpected combinations', name: 'חיבורים בלתי צפויים', desc: 'הכלאה בין שני אובייקטים שלא נפגשו מעולם' },
  { id: 'Visual transformations', name: 'טרנספורמציות חזותיות', desc: 'אובייקט אחד שמשתנה והופך לאחר' },
  { id: 'Wordplay', name: 'משחקי מילים טיפוגרפיים', desc: 'כפל משמעות בין האותיות לצורה' },
  { id: 'Double meaning', name: 'כפל משמעות (Double Meaning)', desc: 'רעיון שמתפרש בשתי רמות עומק שונות' },
  { id: 'Surrealism', name: 'סוריאליזם אלגנטי', desc: 'מציאות בלתי אפשרית אך משכנעת ויוקרתית' },
  { id: 'Luxury advertising', name: 'פרסום יוקרה אולטימטיבי', desc: 'אנינות, טקסטורות עשירות, שקט וכבוד' },
  { id: 'Minimal advertising', name: 'מינימליזם קיצוני', desc: 'אלמנט אחד בלבד שמעביר 100% מהמסר' },
  { id: 'Product-based storytelling', name: 'סיפור מבוסס מוצר', desc: 'המוצר עצמו הוא הגיבור והעלילה כולה' },
];

const QUICK_ACTIONS = [
  { id: 'תן הברקה', label: 'תן הברקה', icon: 'Sparkles', color: 'text-amber-400' },
  { id: 'עוד יותר מפתיע', label: 'עוד יותר מפתיע', icon: 'Zap', color: 'text-[#43D6CB]' },
  { id: 'שבור את הקונספט', label: 'שבור את הקונספט', icon: 'Shapes', color: 'text-red-400' },
  { id: 'יותר גשטאלט', label: 'יותר גשטאלט', icon: 'Layers', color: 'text-cyan-400' },
  { id: 'יותר מקורי', label: 'יותר מקורי', icon: 'Lightbulb', color: 'text-emerald-400' },
  { id: 'תן לי 10 כיוונים', label: 'תן לי 10 כיוונים', icon: 'Grid', color: 'text-purple-400' },
];

export const IdeaFactory: React.FC = () => {
  const { activeProject, globalPrefs, updateActiveProject, showToast, setActiveModule } = useProject();

  // Persist working preferences in the active project, not in component-only memory.
  const saved = activeProject.ideaFactoryWorkspace;
  const topic = saved?.focus ?? '';
  const selectedMethod = saved?.method || 'auto';
  const intensity = saved?.intensity ?? 3;
  const effectiveTopic = topic.trim() || activeProject.brief.productOrService || activeProject.brand?.brandName || activeProject.name;
  const setSettings = (patch: Partial<NonNullable<typeof saved>>) => updateActiveProject(p => ({
    ...p, ideaFactoryWorkspace: { ...p.ideaFactoryWorkspace, focus: p.ideaFactoryWorkspace?.focus ?? '', method: p.ideaFactoryWorkspace?.method ?? 'auto', intensity: p.ideaFactoryWorkspace?.intensity ?? 3, ...patch }
  }));
  const projectIdRef = useRef(activeProject.id); projectIdRef.current = activeProject.id;
  const seedIdea = saved?.seedIdea || '';
  const feedback = saved?.feedback || '';
  const selectedConceptIds = saved?.selectedConceptIds || [];
  const [selectedCompare, setSelectedCompare] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<{
    method?: string;
    intensity?: number;
    action?: string;
    headlineSummary?: string;
    ideas?: {
      id: string;
      title: string;
      visualHook: string;
      mechanism: string;
      executionTip: string;
      suggestedCopy: string;
      imagePrompt: string;
    }[];
  } | null>(saved?.drafts?.length ? { ideas: saved.drafts } : null);
  useEffect(() => { setResultData(activeProject.ideaFactoryWorkspace?.drafts?.length ? {ideas: activeProject.ideaFactoryWorkspace.drafts} : null); setSelectedCompare([]); }, [activeProject.id]);

  const handleRunIdea = async (actionName: string) => {
    if (!effectiveTopic.trim()) {
      showToast('הזן נושא או מוצר תחילה', 'info');
      return;
    }
    if (isLoading) return;
    const previousIdeas = (resultData?.ideas || []).filter((idea, idx) => selectedCompare.includes(String(idea.id || idx)));
    const sourceConcepts = activeProject.concepts.filter(concept => selectedConceptIds.includes(concept.id));
    if (actionName === 'שלב קונספטים' && previousIdeas.length + sourceConcepts.length < 2) { showToast('בחר לפחות שני קונספטים או רעיונות לשילוב', 'info'); return; }
    if (actionName === 'המשך את הרעיון שלי' && !seedIdea.trim()) { showToast('כתוב התחלה של רעיון', 'info'); return; }
    if (actionName === 'לטש לפי ההערות' && !previousIdeas.length && !sourceConcepts.length && !seedIdea.trim()) { showToast('בחר רעיון או קונספט לליטוש', 'info'); return; }
    const targetProjectId = activeProject.id;
    setIsLoading(true);
    try {
      const res = await fetch('/api/idea-factory/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: effectiveTopic,
          method: selectedMethod,
          intensity,
          action: actionName,
          excludePeople: globalPrefs.excludePeople,
          seedIdea, feedback, sourceConcepts, previousIdeas,
        }),
      });

      if (!res.ok) { const e = await res.json().catch(() => ({})); const raw = String(e.error || ''); throw new Error(/429|RESOURCE_EXHAUSTED|quota/i.test(raw) ? 'מכסת Gemini מוגבלת כרגע. ההגדרות נשמרו; אפשר להמשיך אחר כך.' : 'שגיאה בהפקת רעיונות במעבדה'); }
      const data = await res.json();
      if (projectIdRef.current !== targetProjectId) return;
      if (!Array.isArray(data.ideas) || !data.ideas.length) throw new Error('לא התקבלו רעיונות. נסה שוב.');
      data.ideas = data.ideas.map((idea: any) => ({...idea, id: crypto.randomUUID()}));
      setResultData(data);
      setSettings({drafts: data.ideas});
      setSelectedCompare([]);
      showToast(`הופקו ${data.ideas?.length || 0} רעיונות לפעולה "${actionName}"!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהפקת רעיונות', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveIdeaAsConcept = (idea: any) => {
    const concept = {
      id: 'concept-idea-' + (idea.id || idea.title),
      conceptName: idea.title,
      coreIdea: idea.mechanism,
      visualExecution: idea.visualHook,
      suggestedHeadline: idea.suggestedCopy,
      emotionalMechanism: idea.mechanism,
      whyItWorks: idea.executionTip,
      suggestedDesignTechnique: selectedMethod,
      imageGenerationPrompt: idea.imagePrompt,
      createdAt: Date.now(),
      status:'approved' as const, version:1, sourceConceptIds:selectedConceptIds,
      referenceIds: [...new Set(activeProject.concepts.filter(concept => selectedConceptIds.includes(concept.id)).flatMap(concept => concept.referenceIds || []))],
    };
    updateActiveProject((p) => ({
      ...p,
      concepts: [concept, ...(p.concepts || []).filter(c => c.id !== concept.id)],
    }));
    showToast(`הרעיון "${idea.title}" נשמר כקונספט בפרויקט!`, 'success');
  };

  const sendIdeaToDirector = (idea: any) => {

    updateActiveProject(p => ({ ...p, creativeWorkspace: {
      mode: 'refine', approvedCopy: idea.suggestedCopy || '',
      visualDirection: idea.visualHook || '', visualReferenceUrl: p.creativeWorkspace?.visualReferenceUrl || '',
      notes: [p.creativeWorkspace?.notes || '', `רעיון ממעבדת רעיונות: ${idea.title}. ${idea.mechanism}`].filter(Boolean).join('\n'),
      lockedCopy: p.creativeWorkspace?.lockedCopy || false, lockedVisual: p.creativeWorkspace?.lockedVisual || false,
      directorMode: p.creativeWorkspace?.directorMode ?? true, history: p.creativeWorkspace?.history || []
    } }));
    setActiveModule('creative_director');
  };
  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Lightbulb" className="w-4 h-4" />
            <span>מודול #3 — מעבדת רעיונות והברקות</span>
          </div>
          <h1 className="text-2xl font-black text-white">מעבדת חשיבה ופירוק קונספטים</h1>
          <p className="text-xs text-[#C1D1D5]">
            12 מתודולוגיות קריאייטיב, בקרת אינטנסיביות (1-5) ופעולות שבירת פרדיגמות מהירות.
          </p>
        </div>
      </div>

      {/* Main Workspace Grid: Controls (4 cols) & Results (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5 text-xs">
          <div>
            <label className="text-zinc-300 font-bold block mb-1">במה נתמקד הפעם? (לא חובה)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setSettings({focus: e.target.value})}
              placeholder={activeProject.brief.productOrService || activeProject.brand?.brandName || 'ללא מיקוד נוסף — השתמש בנתוני הפרויקט'}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#43D6CB]"
            />
          </div>

          <div className="text-[13px] text-zinc-300 bg-[#183036] border border-[#43D6CB]/20 rounded-xl p-3 space-y-1">
            <div className="font-bold text-[#43D6CB]">הקשר הפרויקט נטען אוטומטית</div>
            <div className="line-clamp-3 whitespace-pre-line leading-relaxed">{buildBrandContext(activeProject) || 'לא הוגדרו עדיין נתוני פרויקט. אפשר לערוך בפאנל מאפיינים והקשר כלי.'}</div>
            <div className="text-[#C1D1D5]">הגדרות המעבדה נשמרות אוטומטית לכל פרויקט, גם בלי Gemini.</div>
          </div>
          <div className="space-y-3 rounded-xl border border-[#31535A] p-3">
            <label htmlFor="seed-idea" className="block font-bold text-white">יש לי התחלה של רעיון</label>
            <p className="text-xs text-[#C1D1D5]">אפשר לערוך ולהרחיב כאן את הרעיון שהועבר מהבמאי, להוסיף הערות ולבקש המשך או ליטוש. העריכה נשמרת אוטומטית בפרויקט.</p>
            <textarea id="seed-idea" value={seedIdea} onChange={e => setSettings({seedIdea:e.target.value})} rows={3} placeholder="כתוב את הרעיון שלך וה־AI יפתח אותו" className="w-full rounded-lg bg-zinc-900 p-3 text-white" />
            <button disabled={isLoading} onClick={() => handleRunIdea('המשך את הרעיון שלי')} className="rounded-lg border border-[#43D6CB] p-2 text-[#43D6CB] disabled:opacity-50">המשך את הרעיון שלי</button>
            <fieldset className="space-y-2"><legend className="mb-2 font-bold text-white">קונספטים לשילוב ולליטוש</legend>
              {!activeProject.concepts.length && <p className="text-zinc-300">קונספטים ששמרת בפרויקט יופיעו כאן.</p>}
              <div className="max-h-48 overflow-y-auto space-y-2">{activeProject.concepts.map(concept => <label key={concept.id} className="flex gap-2 text-zinc-200"><input type="checkbox" checked={selectedConceptIds.includes(concept.id)} onChange={e => setSettings({selectedConceptIds:e.target.checked ? [...selectedConceptIds,concept.id] : selectedConceptIds.filter(id => id !== concept.id)})} />{concept.conceptName}</label>)}</div>
            </fieldset>
            <label htmlFor="idea-feedback" className="block font-bold text-white">הערות לליטוש הקריאייטיב</label>
            <textarea id="idea-feedback" value={feedback} onChange={e => setSettings({feedback:e.target.value})} rows={2} placeholder="מה לשמר, מה לשנות ולאיזה כיוון להתקדם?" className="w-full rounded-lg bg-zinc-900 p-3 text-white" />
            <div className="flex flex-wrap gap-2"><button disabled={isLoading} onClick={() => handleRunIdea('שלב קונספטים')} className="rounded-lg border border-[#43D6CB] p-2 text-[#43D6CB] disabled:opacity-50">שלב קונספטים נבחרים</button><button disabled={isLoading} onClick={() => handleRunIdea('לטש לפי ההערות')} className="rounded-lg border border-[#43D6CB] p-2 text-[#43D6CB] disabled:opacity-50">לטש לפי ההערות</button></div>
          </div>
          {/* Intensity Slider */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-zinc-200">אינטנסיביות יצירתית (Creative Intensity):</span>
              <span className="font-mono text-[#43D6CB] font-bold text-sm">{intensity}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={intensity}
              onChange={(e) => setSettings({intensity: Number(e.target.value)})}
              className="w-full accent-[#43D6CB] h-1.5"
            />
            <div className="flex justify-between text-[12px] text-[#C1D1D5]">
              <span>1: סולידי ומסורתי</span>
              <span>3: מאוזן ומפתיע</span>
              <span>5: מהפכני וקיצוני</span>
            </div>
          </div>

          {/* 12 Methods */}
          <div className="space-y-2">
            <label className="text-zinc-300 font-bold block">בחירת שיטת חשיבה (12 שיטות או AI אוטומטי):</label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {CREATIVE_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSettings({method: m.id})}
                  className={`w-full text-right p-2 rounded-lg border transition ${
                    selectedMethod === m.id
                      ? 'border-[#43D6CB] bg-[#43D6CB]/15 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs">{m.name}</div>
                  <div className="text-[12px] text-[#C1D1D5] line-clamp-1">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <label className="text-zinc-300 font-bold block">פעולות הברקה מהירות:</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((act) => (
                <button
                  key={act.id}
                  onClick={() => handleRunIdea(act.id)}
                  disabled={isLoading}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-lg text-[13px] font-bold text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Icon name={act.icon} className={`w-3.5 h-3.5 ${act.color}`} />
                  <span>{act.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-8 space-y-4">
          {isLoading && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="RefreshCw" className="w-8 h-8 text-[#43D6CB] mx-auto animate-spin" />
              <p className="text-zinc-300 text-sm font-bold">מעבדת הרעיונות מנתחת את האובייקט ומייצרת הברקות...</p>
              <p className="text-xs text-[#C1D1D5]">שיטה: {selectedMethod} • אינטנסיביות {intensity}/5</p>
            </div>
          )}

          {!isLoading && !resultData && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="Lightbulb" className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
              <h3 className="font-bold text-white text-base">מוכן לחשיבה מחוץ לקופסה</h3>
              <p className="text-[#C1D1D5] text-xs max-w-md mx-auto">
                בחר שיטה ולחץ על אחת מפעולות ההברקה ("תן הברקה", "עוד יותר מפתיע", "שבור את הקונספט", "יותר גשטאלט" או "10 כיוונים").
              </p>
            </div>
          )}

          {!isLoading && resultData && (
            <div className="space-y-4 animate-in fade-in">
              {/* Summary Banner */}
              <div className="p-4 bg-gradient-to-r from-[#43D6CB]/10 to-transparent border border-[#43D6CB]/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[12px] text-[#43D6CB] font-bold uppercase tracking-wider block">
                    {resultData.action} • {resultData.method} (רמה {resultData.intensity}/5)
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{resultData.headlineSummary}</h3>
                </div>
                <span className="text-xs font-bold text-[#C1D1D5] bg-black/40 px-2.5 py-1 rounded-lg">
                  {resultData.ideas?.length} רעיונות הופקו
                </span>
              </div>

              {selectedCompare.length >= 2 && <div className="rounded-xl border border-[#43D6CB]/40 p-4 bg-[#183036] space-y-3">
                <button disabled={isLoading} onClick={() => handleRunIdea('שלב קונספטים')} className="rounded-lg border border-[#43D6CB] p-2 text-[#43D6CB]">שלב את הרעיונות שנבחרו</button>
                <h4 className="font-bold text-white text-sm">השוואת רעיונות ({selectedCompare.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{(resultData.ideas || []).filter((idea, idx) => selectedCompare.includes(String(idea.id || idx))).map((idea, idx) =>
                  <div key={idx} className="p-3 rounded-lg bg-[#103F46] text-xs space-y-2"><strong className="text-[#43D6CB]">{idea.title}</strong><p className="text-zinc-200">{idea.visualHook}</p><p className="text-[#C1D1D5]">{idea.mechanism}</p></div>)}</div>
              </div>}
              {/* Ideas Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resultData.ideas?.map((idea, idx) => (
                  <div
                    key={idea.id || idx}
                    className="bg-[#183036] border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-white">{idea.title}</span>
                        <span className="text-[12px] font-mono text-[#43D6CB] font-bold bg-[#43D6CB]/10 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg mb-2">
                        <span className="text-[12px] text-amber-400 font-bold block mb-0.5">ההברקה הוויזואלית:</span>
                        <p className="text-xs text-zinc-200 leading-snug">{idea.visualHook}</p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <p className="text-[#C1D1D5] text-[13px] leading-relaxed">
                          <strong>המנגנון:</strong> {idea.mechanism}
                        </p>
                        <p className="text-emerald-400 text-[13px] leading-relaxed">
                          <strong>טיפ לביצוע:</strong> {idea.executionTip}
                        </p>
                        {idea.suggestedCopy && (
                          <p className="text-[#43D6CB] text-[13px] font-bold">
                            סלוגן: "{idea.suggestedCopy}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedCompare(old => old.includes(String(idea.id || idx)) ? old.filter(id => id !== String(idea.id || idx)) : old.length < 3 ? [...old, String(idea.id || idx)] : old)}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${selectedCompare.includes(String(idea.id || idx)) ? 'border-[#43D6CB] text-[#43D6CB]' : 'border-zinc-700 text-zinc-300'}`}>{selectedCompare.includes(String(idea.id || idx)) ? '✓ נבחר לפיתוח' : 'בחר לפיתוח / שילוב'}</button>
                      <button type="button" onClick={() => sendIdeaToDirector(idea)} className="px-3 py-1.5 rounded-lg text-xs border border-zinc-600 text-white hover:border-[#43D6CB]">המשך ליטוש בבמאי הקריאייטיב</button>
                      <button
                        onClick={() => saveIdeaAsConcept(idea)}
                        className="flex-1 py-1.5 bg-[#43D6CB]/15 hover:bg-[#43D6CB]/25 text-[#43D6CB] text-xs font-bold rounded-lg border border-[#43D6CB]/30 transition flex items-center justify-center gap-1"
                      >
                        <Icon name="Plus" className="w-3.5 h-3.5" />
                        שמור כקונספט
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
