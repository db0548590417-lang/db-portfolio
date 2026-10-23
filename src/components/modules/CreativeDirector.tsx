import React, { useState, useEffect } from 'react';
import { buildBrandContext } from '../../data/brandContext';
import { useProject } from '../../context/ProjectContext';
import { CreativeConcept, CreativeWorkspace, CreativeWorkMode } from '../../types';
import { Icon } from '../common/Icon';

export const CreativeDirector: React.FC = () => {
  const {
    activeProject,
    updateActiveProject,
    globalPrefs,
    setSelectedConceptForVisual,
    setActiveModule,
    showToast,
  } = useProject();

  const defaultWorkspace: CreativeWorkspace = {mode: 'full', approvedCopy: '', visualDirection: '', visualReferenceUrl: '', notes: '', lockedCopy: false, lockedVisual: false, directorMode: false, history: []};
  const [workspace, setWorkspace] = useState<CreativeWorkspace>({ ...defaultWorkspace, ...activeProject.creativeWorkspace });
  const [showHistory, setShowHistory] = useState(false);
  const [entryModal, setEntryModal] = useState<'visual' | 'copy' | null>(null);
  const [entryDraft, setEntryDraft] = useState({ copy: '', visual: '', url: '' });
  const updateWorkspace = (key: keyof CreativeWorkspace, value: any) => {
    setWorkspace(prev => ({ ...prev, [key]: value }));
    updateActiveProject(p => ({...p, creativeWorkspace: {...defaultWorkspace, ...p.creativeWorkspace, [key]: value}}));
  };
  const chooseMode = (mode: CreativeWorkMode) => {
    updateWorkspace('mode', mode);
    setActiveTab('brief');
    if (mode === 'visual' || mode === 'copy') {
      setEntryDraft({copy: activeProject.creativeWorkspace?.approvedCopy || '', visual: activeProject.creativeWorkspace?.visualDirection || '', url: activeProject.creativeWorkspace?.visualReferenceUrl || ''});
      setEntryModal(mode);
    } else setEntryModal(null);
  };
  const storeEntry = () => {
    if (entryModal === 'visual' && !entryDraft.copy.trim()) { showToast('כתוב את הקופירייטינג הקיים', 'info'); return; }
    if (entryModal === 'copy' && !entryDraft.visual.trim() && !entryDraft.url.trim()) { showToast('תאר את הוויזואל או צרף קישור', 'info'); return; }
    updateActiveProject(p => ({...p, creativeWorkspace: {...defaultWorkspace, ...p.creativeWorkspace, mode: entryModal === 'visual' ? 'visual' : 'copy', approvedCopy: entryModal === 'visual' ? entryDraft.copy : (p.creativeWorkspace?.approvedCopy || ''), visualDirection: entryModal === 'copy' ? entryDraft.visual : (p.creativeWorkspace?.visualDirection || ''), visualReferenceUrl: entryModal === 'copy' ? entryDraft.url : (p.creativeWorkspace?.visualReferenceUrl || '')}}));
    setWorkspace(prev => ({...prev, mode: entryModal === 'visual' ? 'visual' : 'copy', approvedCopy: entryModal === 'visual' ? entryDraft.copy : prev.approvedCopy, visualDirection: entryModal === 'copy' ? entryDraft.visual : prev.visualDirection, visualReferenceUrl: entryModal === 'copy' ? entryDraft.url : prev.visualReferenceUrl}));
    setEntryModal(null);
    showToast('נשמר בפרויקט — מופיע גם במאפיינים והקשר כלי', 'success');
  };
  const saveWorkspace = (version = false) => {
    updateActiveProject(project => {
      const current = { ...defaultWorkspace, ...project.creativeWorkspace, mode: workspace.mode };
      const history = version ? [{ id: `v-${Date.now()}`, time: Date.now(), label: 'גרסה שמורה', copy: current.approvedCopy, visual: current.visualDirection, notes: current.notes }, ...current.history].slice(0, 25) : current.history;
      return { ...project, creativeWorkspace: { ...current, history } };
    });
    showToast(version ? 'גרסה נשמרה בפרויקט' : 'נתוני הפרויקט נשמרים אוטומטית');
  };
  const modes: {key: CreativeWorkMode; icon: string; title: string; desc: string}[] = [
    {key:'full',icon:'Sparkles',title:'מתחילים מאפס',desc:'קונספט, קופי וויזואל'},
    {key:'visual',icon:'Image',title:'יש לי קופי',desc:'מפתחים ויזואל לקופי קיים'},
    {key:'copy',icon:'Type',title:'יש לי ויזואל',desc:'מפתחים כותרות וטקסטים'},
    {key:'refine',icon:'Sliders',title:'משפרים קיים',desc:'ביקורת ושיפור רעיון'},
  ];

  // Brief state prefilled from activeProject
  const brief = activeProject.brief;
  useEffect(() => { setGeneratedConcepts(activeProject.concepts || []); setWorkspace({ ...defaultWorkspace, ...activeProject.creativeWorkspace }); }, [activeProject.id]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedConcepts, setGeneratedConcepts] = useState<CreativeConcept[]>(activeProject.concepts || []);
  const [selectedForCombine, setSelectedForCombine] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'brief' | 'concepts'>('brief');

  const saveBrief = () => saveWorkspace();

  // Generate / Refine Concepts via Gemini
  const handleGenerate = async (mode: 'initial' | 'more_surprising' | 'more_luxurious' | 'more_minimal' | 'combine' = 'initial') => {
    if (workspace.mode === 'visual' && !(activeProject.creativeWorkspace?.approvedCopy || '').trim()) { showToast('כדי ליצור ויזואל, הזן תחילה את הקופי הקיים', 'info'); setActiveTab('brief'); return; }
    if (workspace.mode === 'copy' && !(activeProject.creativeWorkspace?.visualDirection || '').trim() && !(activeProject.creativeWorkspace?.visualReferenceUrl || '').trim()) { showToast('כדי ליצור קופי, תאר את הוויזואל או צרף כתובת תמונה', 'info'); setActiveTab('brief'); return; }
    updateActiveProject(p => ({...p, creativeWorkspace: {...defaultWorkspace,...p.creativeWorkspace,mode: workspace.mode}}));
    setIsLoading(true);
    try {
      let previousConceptsPayload: any = null;
      if (mode === 'combine') {
        previousConceptsPayload = generatedConcepts.filter((c) => selectedForCombine.includes(c.id));
        if (previousConceptsPayload.length < 2) {
          showToast('בחר לפחות 2 קונספטים לשילוב', 'info');
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch('/api/creative-director/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: { ...brief, creativeRestrictions: `${brief.creativeRestrictions}\n\nפרטי פרויקט ומותג מחייבים:\n${buildBrandContext({...activeProject, brief})}` },
          mode,
          previousConcepts: previousConceptsPayload,
          excludePeople: globalPrefs.excludePeople,
          workMode: workspace.mode,
          workContext: {...defaultWorkspace,...activeProject.creativeWorkspace,mode:workspace.mode},
        }),
      });

      if (!res.ok) { const error = await res.json().catch(() => ({})); throw new Error(String(error.error || `שגיאת AI (${res.status})`).includes('429') ? 'מכסת ה-AI מוגבלת כרגע (429). אפשר להמשיך לערוך ולשמור ללא AI.' : String(error.error || 'שגיאה בתקשורת עם במאי הקריאייטיב')); }
      const data = await res.json();

      if (Array.isArray(data.concepts) && data.concepts.length > 0) {
        const enriched: CreativeConcept[] = data.concepts.map((c: any, idx: number) => ({
          ...c,
          id: 'concept-' + Date.now() + '-' + idx,
          createdAt: Date.now(),
          suggestedHeadline: activeProject.creativeWorkspace?.lockedCopy && activeProject.creativeWorkspace?.approvedCopy?.trim() ? activeProject.creativeWorkspace.approvedCopy : c.suggestedHeadline,
          visualExecution: activeProject.creativeWorkspace?.lockedVisual && activeProject.creativeWorkspace?.visualDirection?.trim() ? activeProject.creativeWorkspace.visualDirection : c.visualExecution,
        }));

        setGeneratedConcepts((prev) => [...enriched, ...prev]);
        setActiveTab('concepts');
        showToast('קונספטים חדשים הופקו על ידי במאי הקריאייטיב!', 'success');
      } else {
        throw new Error('לא התקבלו קונספטים תקינים');
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהפקת קונספט', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save concept to project
  const saveConceptToProject = (concept: CreativeConcept) => {
    const isSaved = activeProject.concepts.some((c) => c.id === concept.id);
    if (isSaved) {
      showToast('הקונספט כבר שמור בפרויקט', 'info');
      return;
    }
    updateActiveProject((p) => ({
      ...p,
      concepts: [concept, ...p.concepts],
      brief,
      creativeWorkspace: workspace,
    }));
    showToast(`הקונספט "${concept.conceptName}" נשמר בפרויקט!`, 'success');
  };

  // Send prompt to Visual Generator
  const sendToVisualGenerator = (concept: CreativeConcept) => {
    setSelectedConceptForVisual(concept);
    setActiveModule('visual_generator');
    showToast('הפרומפט והקונספט נשלחו למחולל הוויזואלי', 'success');
  };

  // Toggle combine selection
  const toggleCombine = (id: string) => {
    setSelectedForCombine((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Sparkles" className="w-4 h-4" />
            <span>מודול #2 — במאי קריאייטיב AI בכיר</span>
          </div>
          <h1 className="text-2xl font-black text-white">הפקת קונספטים פרסומיים ומטאפורות</h1>
          <p className="text-xs text-[#C1D1D5]">
            תובנות צרכניות חדות, שבירת קלישאות, מנגנונים רגשיים ופרומפטים מקצועיים להדמיה.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-zinc-800 bg-zinc-900 rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('brief')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'brief'
                  ? 'bg-[#43D6CB] text-white shadow'
                  : 'text-[#C1D1D5] hover:text-white'
              }`}
            >
              עריכת בריף
            </button>
            <button
              onClick={() => setActiveTab('concepts')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'concepts'
                  ? 'bg-[#43D6CB] text-white shadow'
                  : 'text-[#C1D1D5] hover:text-white'
              }`}
            >
              קונספטים שהופקו ({generatedConcepts.length})
            </button>
          </div>
        </div>
      </div>

      {entryModal && (
        <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setEntryModal(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="dekel-creative-entry-heading" dir="rtl" className="w-full max-w-xl rounded-2xl border border-[#31535A] bg-[#183036] p-6 text-right shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 id="dekel-creative-entry-heading" className="text-lg font-bold text-[#F7F8F3]">{entryModal === 'visual' ? 'יש לי קופירייטינג מוכן' : 'יש לי ויזואל מוכן'}</h2><p className="text-xs text-zinc-300 mt-1">המידע יישמר בפרויקט ויופיע אוטומטית בפאנל הימני.</p></div>
              <button type="button" onClick={() => setEntryModal(null)} aria-label="סגור" className="rounded-lg border border-white/20 px-3 py-2 text-white">✕</button>
            </div>
            {entryModal === 'visual' ? (
              <label className="block space-y-2"><span className="text-sm text-[#F7F8F3] font-bold">הדבק כאן את הקופי שלך</span><textarea autoFocus rows={7} value={entryDraft.copy} onChange={e => setEntryDraft(p => ({...p, copy: e.target.value}))} placeholder="כותרת, סלוגן, טקסט למודעה..." className="w-full resize-y rounded-xl border border-[#31535A] bg-[#103F46] p-3 text-[#F7F8F3] focus:outline-none focus:border-[#43D6CB]" /></label>
            ) : (
              <div className="space-y-3"><label className="block space-y-2"><span className="text-sm text-[#F7F8F3] font-bold">תאר את הוויזואל הקיים</span><textarea autoFocus rows={6} value={entryDraft.visual} onChange={e => setEntryDraft(p => ({...p, visual: e.target.value}))} placeholder="מה מופיע בעיצוב? קומפוזיציה, דימוי, סגנון, צבעים..." className="w-full resize-y rounded-xl border border-[#31535A] bg-[#103F46] p-3 text-[#F7F8F3] focus:outline-none focus:border-[#43D6CB]" /></label><label className="block space-y-2"><span className="text-sm text-[#F7F8F3] font-bold">קישור לתמונת רפרנס (לא חובה)</span><input type="url" dir="ltr" value={entryDraft.url} onChange={e => setEntryDraft(p => ({...p, url: e.target.value}))} placeholder="https://..." className="w-full rounded-xl border border-[#31535A] bg-[#103F46] p-3 text-[#F7F8F3] focus:outline-none focus:border-[#43D6CB]" /></label><p className="text-xs text-[#C1D1D5]">לתשומת לבך: קישור לתמונה מועבר כטקסט, ואינו מאפשר ל־AI לראות את התמונה עצמה.</p></div>
            )}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEntryModal(null)} className="rounded-lg border border-white/20 px-4 py-2 text-zinc-200">ביטול</button><button type="button" onClick={storeEntry} className="rounded-lg bg-[#43D6CB] px-5 py-2 font-bold text-[#183036]">שמור בפרויקט</button></div>
          </section>
        </div>
      )}
      {/* Guided four-way workflow — stays available without AI */}
      <section className="rounded-2xl border border-[#43D6CB]/25 bg-[#103F46] p-5 space-y-4" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#F7F8F3]">מה אנחנו עושים היום?</h2><p className="text-xs text-zinc-300 mt-1">בחר מה כבר מוכן ומה דקל AI צריך להשלים. הבחירה נשמרת בנפרד לכל פרויקט.</p></div><span className="text-xs text-[#43D6CB]">{activeProject.name}</span></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {modes.map(option => <button key={option.key} type="button" onClick={() => chooseMode(option.key)} aria-pressed={workspace.mode === option.key} className={`min-h-[95px] text-right rounded-xl px-3 py-3 border transition ${workspace.mode === option.key ? 'border-[#43D6CB] bg-[#43D6CB]/15 text-white' : 'border-white/10 bg-[#183036] text-zinc-200 hover:border-[#43D6CB]/50'}`}><Icon name={option.icon} className="w-5 h-5 mb-1 text-[#43D6CB]"/><span className="text-sm font-bold block">{option.title}</span><span className="text-[13px] opacity-75 block mt-1">{option.desc}</span></button>)}
        </div>
        <div className="rounded-xl bg-[#183036] p-4 text-sm text-zinc-200 border border-white/10">
          הפרטים נשלפים אוטומטית מ<strong>״מאפיינים והקשר כלי״</strong> בצד ימין.
          <div className="text-xs text-[#C1D1D5] mt-2">קופי: {activeProject.creativeWorkspace?.approvedCopy ? 'קיים בפרויקט' : 'טרם הוגדר'} · ויזואל: {activeProject.creativeWorkspace?.visualDirection ? 'קיים בפרויקט' : 'טרם הוגדר'}</div>
          <p className="text-xs text-[#C1D1D5] mt-2">במצב ״מתחילים מאפס״ אין צורך במילוי שדות נוספים. ה-AI יציע כיוונים על בסיס המידע הקיים, וישאל רק אם חסר פרט מהותי.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={()=>saveWorkspace(false)} className="bg-[#43D6CB] text-[#183036] px-4 py-2 rounded-lg font-bold text-xs hover:brightness-110">שמור בריף ועבודה (ללא AI)</button>
          <button type="button" onClick={()=>saveWorkspace(true)} className="border border-[#43D6CB]/60 text-white px-4 py-2 rounded-lg text-xs">שמור גרסה מאושרת</button>
          <button type="button" onClick={()=>setShowHistory(!showHistory)} className="border border-white/20 text-white px-4 py-2 rounded-lg text-xs">היסטוריית גרסאות ({workspace.history.length})</button>
          <button type="button" onClick={()=>handleGenerate('initial')} disabled={isLoading} className="bg-[#183036] border border-white/20 text-white px-4 py-2 rounded-lg text-xs disabled:opacity-50">{isLoading ? 'מעבד...' : 'צור 3 כיוונים עם AI'}</button>
        </div>
        {showHistory && <div className="rounded-lg bg-[#183036] p-3 space-y-2">{workspace.history.length===0 ? <p className="text-xs text-[#C1D1D5]">עדיין לא נשמרו גרסאות.</p> : workspace.history.map(version=><div key={version.id} className="flex justify-between gap-3 items-center border-b border-white/10 pb-2 text-xs"><span>{new Date(version.time).toLocaleString('he-IL')}</span><button className="text-[#43D6CB]" type="button" onClick={()=>{updateActiveProject(p=>({...p,creativeWorkspace:{...defaultWorkspace,...p.creativeWorkspace,approvedCopy:version.copy,visualDirection:version.visual,notes:version.notes}}));showToast('הגרסה שוחזרה בתיק הפרויקט','info');}}>טען גרסה לעריכה</button></div>)}</div>}
      </section>

      {activeTab === 'concepts' && (
        <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#C1D1D5] font-bold">פעולות שדרוג ואיטרציה:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleGenerate('more_surprising')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Icon name="Zap" className="w-3.5 h-3.5 text-amber-400" />
              עוד יותר מפתיע!
            </button>

            <button
              onClick={() => handleGenerate('more_luxurious')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-yellow-400 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Icon name="Sparkles" className="w-3.5 h-3.5 text-yellow-400" />
              העלה לשיא היוקרה (Ultra Luxury)
            </button>

            <button
              onClick={() => handleGenerate('more_minimal')}
              disabled={isLoading}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-400 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Icon name="Shapes" className="w-3.5 h-3.5 text-cyan-400" />
              צמצם למינימום (Minimal Gestalt)
            </button>

            {selectedForCombine.length >= 2 && (
              <button
                onClick={() => handleGenerate('combine')}
                disabled={isLoading}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Icon name="Blend" className="w-3.5 h-3.5" />
                מזג {selectedForCombine.length} קונספטים נבחרים
              </button>
            )}

            <button
              onClick={() => handleGenerate('initial')}
              disabled={isLoading}
              className="px-4 py-1.5 bg-[#43D6CB] hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Icon name="RefreshCw" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              הפק עוד 3 כיוונים
            </button>
          </div>
        </div>
      )}

      {/* Generated Concepts Cards */}
      {activeTab === 'concepts' && (
        <div className="space-y-4">
          {generatedConcepts.length === 0 ? (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="Sparkles" className="w-8 h-8 text-[#43D6CB] mx-auto opacity-60" />
              <p className="text-[#C1D1D5] text-sm">עדיין לא הופקו קונספטים עבור פרויקט זה.</p>
              <button
                onClick={() => setActiveTab('brief')}
                className="px-5 py-2 bg-[#43D6CB] text-white text-xs font-bold rounded-xl hover:bg-teal-600 transition"
              >
                פתח את הבריף ובחר מצב עבודה
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {generatedConcepts.map((concept) => {
                const isSaved = activeProject.concepts.some((c) => c.id === concept.id);
                const isCombinedSelected = selectedForCombine.includes(concept.id);

                return (
                  <div
                    key={concept.id}
                    className={`bg-[#183036] border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-xl ${
                      isCombinedSelected
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : isSaved
                        ? 'border-[#43D6CB]/50'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-[#C1D1D5] border border-zinc-700">
                          {concept.suggestedDesignTechnique || 'קונספט מקורי'}
                        </span>

                        <button
                          onClick={() => toggleCombine(concept.id)}
                          className={`text-[12px] px-2 py-0.5 rounded font-bold transition border ${
                            isCombinedSelected
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-zinc-900 text-[#C1D1D5] border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          {isCombinedSelected ? '✓ נבחר למיזוג' : '+ סמן למיזוג'}
                        </button>
                      </div>

                      <h3 className="font-black text-white text-base leading-snug">
                        {concept.conceptName}
                      </h3>

                      {/* Headline / Copy */}
                      <div className="mt-2.5 p-2 bg-zinc-900/90 border border-zinc-800 rounded-lg">
                        <span className="text-[12px] text-[#C1D1D5] block mb-0.5">כותרת מוצעת (קופירייטינג):</span>
                        <p className="font-extrabold text-[#43D6CB] text-xs">
                          "{concept.suggestedHeadline}"
                        </p>
                      </div>
                    </div>

                    {/* Core Idea & Visual Execution */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[#C1D1D5] text-[13px] font-bold block">הרעיון והתובנה:</span>
                        <p className="text-zinc-300 leading-relaxed">{concept.coreIdea}</p>
                      </div>

                      <div>
                        <span className="text-[#C1D1D5] text-[13px] font-bold block">ביצוע ויזואלי במודעה:</span>
                        <p className="text-[#C1D1D5] text-[13px] leading-relaxed">{concept.visualExecution}</p>
                      </div>

                      <div className="pt-1 border-t border-zinc-800/80">
                        <span className="text-emerald-400 text-[12px] font-bold block">מדוע זה עובד:</span>
                        <p className="text-[#C1D1D5] text-[12px] leading-relaxed">{concept.whyItWorks}</p>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => saveConceptToProject(concept)}
                          className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                            isSaved
                              ? 'bg-zinc-800 text-[#C1D1D5]'
                              : 'bg-[#43D6CB]/15 hover:bg-[#43D6CB]/25 text-[#43D6CB] border border-[#43D6CB]/30'
                          }`}
                        >
                          <Icon name={isSaved ? 'Check' : 'Plus'} className="w-3.5 h-3.5" />
                          <span>{isSaved ? 'נשמר בפרויקט' : 'שמור בפרויקט'}</span>
                        </button>

                        <button
                          onClick={() => sendToVisualGenerator(concept)}
                          className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold transition flex items-center justify-center gap-1 border border-zinc-700"
                        >
                          <Icon name="Wand2" className="w-3.5 h-3.5 text-amber-400" />
                          <span>שלח להדמיה</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
