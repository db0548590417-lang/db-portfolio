import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { userStorageKey } from '../../data/accountStorage';
import { Icon } from '../common/Icon';
import type { DesignAsset } from '../../types';
import { saveDesignImage, loadDesignImage, deleteDesignImage } from '../../data/designAssetsDb';
import { buildBrandContext } from '../../data/brandContext';

export const CreativeAnalyzer: React.FC = () => {
  const {
    selectedInspirationForAnalysis,
    setSelectedInspirationForAnalysis,
    activeProject,
    updateActiveProject,
    showToast,
    setActiveModule,
  } = useProject();

  const [imageUrl, setImageUrl] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [designKind, setDesignKind] = useState<DesignAsset['kind']>('ad');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assets = activeProject.designAssets || [];
  const projectId = activeProject.id;

  // Switching projects never carries the previous project's image or AI analysis.
  useEffect(() => {
    let cancelled = false;
    setImageUrl(''); setImageBase64(''); setAnalysisResult(null); setActiveAssetId(null);
    const inspiration = selectedInspirationForAnalysis;
    if (inspiration?.url) {
      setImageUrl(inspiration.url);
      fetch(inspiration.url).then(r => { if (!r.ok) throw Error('Image unavailable'); return r.blob(); }).then(blob => {
        const reader = new FileReader(); reader.onload = () => { if (!cancelled) setImageBase64(String(reader.result || '')); }; reader.readAsDataURL(blob);
      }).catch(() => { /* Cross-origin references may only be displayed, not analyzed. */ });
    } else {
      const requestedId = sessionStorage.getItem(userStorageKey(`dekel-design-${projectId}`));
      sessionStorage.removeItem(userStorageKey(`dekel-design-${projectId}`));
      const asset = (activeProject.designAssets || []).find(a => a.id === requestedId) || (activeProject.designAssets || []).slice(-1)[0];
      if (asset) loadDesignImage(asset.id).then(img => {
        if (!cancelled && img) { setImageUrl(img); setImageBase64(img); setActiveAssetId(asset.id); setDesignKind(asset.kind); }
      }).catch(() => { if (!cancelled) showToast('שגיאה בטעינת תמונה שמורה', 'error'); });
    }
    return () => { cancelled = true; };
  }, [projectId, selectedInspirationForAnalysis?.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLightboxOpen(false); setZoom(1); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen]);

  const openAsset = async (asset: DesignAsset) => {
    try {
      const img = await loadDesignImage(asset.id);
      if (!img) throw Error('התמונה אינה נמצאת באחסון הדפדפן');
      setImageUrl(img); setImageBase64(img); setActiveAssetId(asset.id); setDesignKind(asset.kind); setAnalysisResult(null);
      setSelectedInspirationForAnalysis(null);
    } catch (e: any) { showToast(e?.message || 'שגיאה בטעינת תמונה', 'error'); }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const info = (event as CustomEvent<{id:string;projectId:string}>).detail;
      if (info?.projectId !== projectId) return;
      const asset = assets.find(a => a.id === info.id);
      if (asset) void openAsset(asset);
    };
    window.addEventListener('dekel-open-design', handler);
    return () => window.removeEventListener('dekel-open-design', handler);
  }, [projectId, assets]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { showToast('נתמכים PNG, JPG ו-WebP בלבד', 'error'); return; }
    if (file.size > 8_000_000) { showToast('גודל מקסימלי: 8MB', 'error'); return; }
    const name = window.prompt('שם העיצוב:', file.name.replace(/\.[^.]+$/, ''));
    if (name === null) return;
    const selected = assets.find(a => a.id === activeAssetId);
    const asVersion = !!selected && window.confirm('לשמור כגרסה חדשה של העיצוב הנבחר? לחיצה על ביטול תיצור עיצוב חדש.');
    const groupId = asVersion && selected ? selected.groupId : `group-${crypto.randomUUID()}`;
    const version = asVersion ? Math.max(0, ...assets.filter(a => a.groupId === groupId).map(a => a.version)) + 1 : 1;
    const id = crypto.randomUUID();
    const reader = new FileReader();
    reader.onload = async () => {
      const img = String(reader.result || '');
      try {
        await saveDesignImage(id, img);
        const asset: DesignAsset = { id, groupId, name: name.trim() || file.name, version, kind: designKind, createdAt: Date.now() };
        updateActiveProject(project => ({ ...project, designAssets: [...(project.designAssets || []), asset] }));
        setImageUrl(img); setImageBase64(img); setActiveAssetId(id); setAnalysisResult(null);
        setSelectedInspirationForAnalysis(null);
        showToast(`העיצוב נשמר בפרויקט כגרסה ${version}`, 'success');
      } catch { showToast('לא ניתן לשמור את התמונה. ייתכן שהאחסון המקומי מלא.', 'error'); }
    };
    reader.readAsDataURL(file);
  };

  const removeAsset = async (asset: DesignAsset) => {
    if (!window.confirm(`למחוק לצמיתות את ${asset.name} — גרסה ${asset.version}?`)) return;
    try {
      await deleteDesignImage(asset.id);
      updateActiveProject(project => ({...project, designAssets:(project.designAssets || []).filter(a => a.id !== asset.id)}));
      if (activeAssetId === asset.id) { setImageUrl(''); setImageBase64(''); setActiveAssetId(null); setAnalysisResult(null); }
      showToast('העיצוב נמחק מהפרויקט', 'info');
    } catch { showToast('מחיקת התמונה נכשלה', 'error'); }
  };

  const useAsReference = () => {
    const asset = assets.find(a => a.id === activeAssetId);
    if (!asset) return;
    updateActiveProject(project => ({...project, savedInspirations: [
      ...(project.savedInspirations || []).filter(i => i.id !== `own-${asset.id}`),
      { id:`own-${asset.id}`, title:`${asset.name} (גרסה ${asset.version})`, url:'', thumbUrl:'', source:'עיצוב שלי',
        sourceUrl:'', style:`עיצוב שמור מסוג ${asset.kind}`, technique:'רפרנס אישי מהפרויקט', isSample:false }
    ]}));
    showToast('נוסף לרפרנסים; ה-AI יקבל תיאור, לא את הפיקסלים', 'success');
  };

  const sendRecommendation = (idea: any, module: 'creative_director' | 'idea_factory') => {
    updateActiveProject(project => module === 'creative_director' ? ({...project, creativeWorkspace: {
      mode: 'refine', approvedCopy: project.creativeWorkspace?.approvedCopy || '',
      visualDirection: idea.howToApply || '', visualReferenceUrl: project.creativeWorkspace?.visualReferenceUrl || '',
      notes: [project.creativeWorkspace?.notes, `המלצה מניתוח: ${idea.title}: ${idea.description}`].filter(Boolean).join('\n'),
      lockedCopy: project.creativeWorkspace?.lockedCopy || false, lockedVisual: project.creativeWorkspace?.lockedVisual || false,
      directorMode: true, history: project.creativeWorkspace?.history || []
    }}) : ({...project, ideaFactoryWorkspace: {
      ...(project.ideaFactoryWorkspace || {focus:'',method:'auto',intensity:3}),
      focus: `${idea.title}: ${idea.description}; ${idea.howToApply}`
    }}));
    setActiveModule(module);
  };

  const handleRunAnalysis = async () => {
    if (!imageBase64) {
      showToast('נא להעלות תמונה או לבחור רפרנס לניתוח', 'info');
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/creative-analyzer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageBase64.includes('image/png') ? 'image/png' : 'image/jpeg',
          designType: designKind,
          userProjectContext: buildBrandContext(activeProject),
        }),
      });

      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(/429|quota|RESOURCE_EXHAUSTED/i.test(String(err.error || '')) ? 'מכסת Gemini הסתיימה זמנית' : 'שגיאה בניתוח העיצוב על ידי ה-AI'); }
      const data = await res.json();
      setAnalysisResult(data);
      showToast('ניתוח הקריאייטיב הושלם בהצלחה!', 'success');
    } catch (err: any) {
      showToast(err.message || 'שגיאה בניתוח', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveIdeaToProject = (idea: any) => {
    const concept = {
      id: 'concept-critique-' + Date.now(),
      conceptName: idea.title,
      coreIdea: idea.description,
      visualExecution: idea.howToApply,
      suggestedHeadline: `${activeProject.brief.productOrService} — מנגנון שאול`,
      emotionalMechanism: analysisResult?.hiddenCreativeMechanism || 'מנגנון ויזואלי מתקדם',
      whyItWorks: 'יישום המנגנון הקריאייטיבי המנותח על הפרויקט הנוכחי',
      suggestedDesignTechnique: 'Metaphorical Synthesis',
      imageGenerationPrompt: `${idea.description}, high-end advertising, dramatic lighting, 8k`,
      createdAt: Date.now(),
    };
    updateActiveProject((p) => ({
      ...p,
      concepts: [concept, ...p.concepts],
    }));
    showToast(`הרעיון "${idea.title}" נשמר בפרויקט!`, 'success');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="ScanEye" className="w-4 h-4" />
            <span>מודול #4 — מנתח קריאייטיב מולטימודלי</span>
          </div>
          <h1 className="text-2xl font-black text-white">ניתוח רפרנסים ופיענוח מנגנונים</h1>
          <p className="text-xs text-[#C1D1D5]">
            הערכת 11 מדדי איכות חזותיים, חשיפת המנגנון הקוגניטיבי הנסתר והפקת 5 רעיונות יישומיים לפרויקט שלך.
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
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !imageBase64}
            className="px-5 py-2 bg-[#43D6CB] hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
          >
            {isAnalyzing ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
                מנתח קריאייטיב...
              </>
            ) : (
              <>
                <Icon name="Sparkles" className="w-4 h-4" />
                הפעל ניתוח מולטימודלי
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Image Preview Card (4 cols) */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-xs">העיצוב הנבדק:</h3>
          <label className="text-xs text-zinc-300 block">סוג העיצוב
            <select value={designKind} onChange={e => setDesignKind(e.target.value as DesignAsset['kind'])} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white">
              <option value="ad">מודעה מלאה</option><option value="logo">לוגו</option><option value="element">אלמנט גרפי</option><option value="sketch">סקיצה</option><option value="other">אחר</option>
            </select>
          </label>
          <div className="aspect-[4/3] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="לחץ להגדלת העיצוב" role="button" tabIndex={0} onClick={() => setLightboxOpen(true)} onKeyDown={e => { if (e.key === 'Enter') setLightboxOpen(true); }} className="w-full h-full object-contain cursor-zoom-in" />
            ) : (
              <span className="text-[#C1D1D5] text-xs">לא נבחרה תמונה</span>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-[#31535A] p-3 bg-[#183036]">
            <h4 className="font-bold text-white text-xs">העיצובים שלי — גרסאות ({assets.length})</h4>
            <p className="text-[12px] text-[#C1D1D5]">העיצובים שלך זמינים בפרויקט במחשב הזה.</p>
            <div className="max-h-48 overflow-auto space-y-1">
              {assets.map(asset => <div key={asset.id} className="flex gap-1 items-center text-[13px]">
                <button className="flex-1 truncate text-right rounded bg-zinc-900 hover:bg-zinc-800 p-2 text-zinc-200" onClick={() => openAsset(asset)}>{asset.name} · גרסה {asset.version}</button>
                <button className="text-red-300 rounded p-2 hover:bg-zinc-700" onClick={() => void removeAsset(asset)} title="מחק גרסה">✕</button>
              </div>)}
            </div>
            {activeAssetId && <button className="w-full rounded bg-[#43D6CB]/15 border border-[#43D6CB]/30 p-2 text-[#43D6CB] font-bold text-xs" onClick={useAsReference}>הוסף עיצוב נבחר לרפרנסים</button>}
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs space-y-1">
            <span className="text-[#C1D1D5] text-[12px] block">הקשר פרויקט פעיל:</span>
            <p className="font-bold text-zinc-200">{activeProject.name}</p>
            <p className="text-[13px] text-[#C1D1D5]">{activeProject.brief.productOrService}</p>
          </div>
        </div>

        {/* Right: Analysis Results (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {!analysisResult && !isAnalyzing && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="ScanEye" className="w-8 h-8 text-[#43D6CB] mx-auto opacity-70" />
              <h3 className="font-bold text-white text-sm">לחץ על "הפעל ניתוח מולטימודלי"</h3>
              <p className="text-xs text-[#C1D1D5] max-w-md mx-auto">
                Gemini יסרוק את הרפרנס, יפרק את המטאפורה הוויזואלית, יעריך 11 ממדים ויפיק 5 רעיונות תואמים לפרויקט הנוכחי.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="RefreshCw" className="w-8 h-8 text-[#43D6CB] mx-auto animate-spin" />
              <h3 className="font-bold text-white text-sm">מפענח עקרונות גשטאלט וקומפוזיציה...</h3>
              <p className="text-xs text-[#C1D1D5]">הפרדה בין עובדות נצפות לפרשנות קונספטואלית</p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-700 bg-[#103F46] p-4"><h4 className="text-white font-bold mb-1">ניתוח מקצועי</h4><p className="text-zinc-300">{analysisResult.constructiveCriticism || 'אין מידע'}</p></div>
                <div className="rounded-xl border border-zinc-700 bg-[#103F46] p-4"><h4 className="text-white font-bold mb-1">התאמה למותג ולבריף</h4><p className="text-zinc-300">{analysisResult.brandFit || 'עדיין לא ניתנה הערכת התאמה מפורשת'}</p></div>
              </div>
              {/* Overall Score & Mechanism */}
              <div className="p-5 bg-gradient-to-r from-zinc-900 to-[#103F46] border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-400">ציון איכות קריאייטיב כולל:</span>
                    <span className="text-xl font-black text-white">{analysisResult.overallScore} / 10</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-xl">
                    <strong>המנגנון הנסתר:</strong> {analysisResult.hiddenCreativeMechanism}
                  </p>
                </div>
              </div>

              {/* Observable vs Conceptual */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-[#103F46] border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-emerald-400 font-bold block">1. עובדות ויזואליות נצפות:</span>
                  <ul className="space-y-1 text-zinc-300 list-disc list-inside text-[13px]">
                    {analysisResult.observableElements?.map((el: string, i: number) => (
                      <li key={i}>{el}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-[#103F46] border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[#43D6CB] font-bold block">2. פרשנות קונספטואלית ותובנה:</span>
                  <p className="text-zinc-300 text-[13px] leading-relaxed">
                    {analysisResult.conceptualInterpretation}
                  </p>
                </div>
              </div>

              {/* 11 Criteria Grid */}
              <div className="p-4 bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white">ניתוח 11 מדדי תקשורת חזותית ופרסום:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                  {analysisResult.criteriaAnalysis &&
                    Object.entries(analysisResult.criteriaAnalysis).map(([key, val]: any) => (
                      <div key={key} className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[13px] font-bold text-zinc-300 truncate">{key}</span>
                          <span className="text-[12px] font-mono text-[#43D6CB] font-bold">
                            {val.score}/10
                          </span>
                        </div>
                        <p className="text-[12px] text-[#C1D1D5] line-clamp-2 leading-relaxed">
                          {val.analysis}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Constructive Criticism */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs space-y-1">
                <span className="text-amber-400 font-bold block">ביקורת בונה מקצועית:</span>
                <p className="text-zinc-300 text-[13px] leading-relaxed">
                  {analysisResult.constructiveCriticism}
                </p>
              </div>

              {/* 5 Actionable Ideas For User Project */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Icon name="Lightbulb" className="w-4 h-4 text-amber-400" />
                  <span>5 רעיונות מקוריים המיישמים מנגנון זה על "{activeProject.name}":</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysisResult.actionableIdeasForUserProject?.map((idea: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-[#183036] border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white">{idea.title}</span>
                          <span className="text-[12px] text-[#43D6CB] font-mono">#{idx + 1}</span>
                        </div>
                        <p className="text-[13px] text-zinc-300 leading-relaxed mb-1.5">{idea.description}</p>
                        <p className="text-[12px] text-emerald-400 leading-relaxed">
                          <strong>איך ליישם:</strong> {idea.howToApply}
                        </p>
                      </div>

                      <button
                        onClick={() => saveIdeaToProject(idea)}
                        className="py-1 px-2 bg-[#43D6CB]/15 hover:bg-[#43D6CB]/25 text-[#43D6CB] rounded-lg font-bold text-[13px] transition flex items-center justify-center gap-1 border border-[#43D6CB]/30"
                      >
                        <Icon name="Plus" className="w-3 h-3" />
                        שמור כקונספט לפרויקט
                      </button>
                      <div className="grid grid-cols-2 gap-2"><button onClick={() => sendRecommendation(idea,'creative_director')} className="rounded-lg border border-zinc-700 text-zinc-200 bg-zinc-800 p-2">העבר למודול 2</button><button onClick={() => sendRecommendation(idea,'idea_factory')} className="rounded-lg border border-zinc-700 text-zinc-200 bg-zinc-800 p-2">העבר למודול 3</button></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {lightboxOpen && imageUrl && <div role="dialog" aria-label="תצוגת תמונה מוגדלת" className="fixed inset-0 z-[90] bg-black/95 flex flex-col items-center p-5" onClick={() => {setLightboxOpen(false);setZoom(1);}}>
        <div className="flex gap-3 mb-3" onClick={e=>e.stopPropagation()}><button className="rounded bg-[#183036] px-4 py-2 text-white" onClick={()=>setZoom(z=>Math.min(5,z+.25))}>+ זום</button><button className="rounded bg-[#183036] px-4 py-2 text-white" onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>− זום</button><button className="rounded bg-[#183036] px-4 py-2 text-white" onClick={()=>setZoom(1)}>איפוס</button><button className="rounded bg-[#183036] px-4 py-2 text-white" onClick={()=>{setLightboxOpen(false);setZoom(1);}}>✕ סגור</button></div>
        <div className="w-full flex-1 overflow-auto text-center" onClick={e=>e.stopPropagation()}><img src={imageUrl} alt="הגדלת העיצוב" style={{width:`${zoom*100}%`, maxWidth:'none',height:'auto',objectFit:'contain',margin:'auto'}} /></div>
      </div>}
    </div>
  );
};
