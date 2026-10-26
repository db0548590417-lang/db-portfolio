import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { removeImageBackground } from '../../data/removeImageBackground';
import {createImageJob,acknowledgeImageJob} from '../../data/generationJobs';
import { loadDesignImage } from '../../data/designAssetsDb';

const STYLE_PRESETS = [
  { id: 'cinematic', label: 'צילום פרסום קולנועי (Cinematic)', promptSuffix: 'Ultra high-end advertising photography, dramatic chiaroscuro lighting, shallow depth of field, 8k resolution, Hasselblad medium format' },
  { id: 'luxury_minimal', label: 'יוקרה מינימליסטית (Luxury Minimal)', promptSuffix: 'Minimalist luxury aesthetic, matte slate textures, warm directional lighting, clean lines, museum caliber art direction' },
  { id: 'hasidic_royal', label: 'מלכותי חסידי (Hasidic Royal Heritage)', promptSuffix: 'Royal Judaica heritage, ornate gold foil filigree, deep burgundy velvet background, sacred books, crown motifs, majestic antique look' },
  { id: 'studio_packaging', label: 'צילום סטודיו לאריזות (Studio Mockup)', promptSuffix: 'Professional studio product photography, clean white and charcoal background, softbox lighting, crisp reflections' },
  { id: 'gestalt_negative', label: 'גשטאלט ומרחב שלילי (Gestalt Negative Space)', promptSuffix: 'Clever gestalt negative space art, dual meaning silhouette, high contrast black and gold, Cannes Lions winning design' },
];

const imageRequests = new Set<string>();
const imageRequestListeners = new Set<() => void>();
const subscribeImageRequests = (listener:() => void) => {imageRequestListeners.add(listener);return()=>{imageRequestListeners.delete(listener);};};
export const VisualGenerator: React.FC = () => {
  const {
    selectedConceptForVisual,
    setSelectedConceptForVisual,
    globalPrefs,
    updateActiveProject,
    activeProject,
    setSelectedArtworkForMockup,
    setSelectedImageForShadowMaster,
    setActiveModule,
    showToast,
  } = useProject();

  const [prompt, setPrompt] = useState<string>(
    selectedConceptForVisual?.imageGenerationPrompt || activeProject.brief.productOrService || activeProject.name || ''
  );

  const [selectedStyle, setSelectedStyle] = useState<string>('luxury_minimal');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>(
    globalPrefs.preferredAspectRatio || '1:1'
  );
  const [transparentPref, setTransparentPref] = useState(false);
  const [model, setModel] = useState('gemini-3.1-flash-lite-image');
  const [quality, setQuality] = useState<'1K'|'2K'|'4K'>('1K');
  const [removeBg, setRemoveBg] = useState(false);
  const [cutoutMode, setCutoutMode] = useState<'clean'|'soft'>('soft');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [removalChoice, setRemovalChoice] = useState<'local'|'advanced'>('local');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const isGenerating = useSyncExternalStore(subscribeImageRequests, () => imageRequests.has(activeProject.id));
  const setIsGenerating = (value:boolean) => {if(value)imageRequests.add(activeProject.id);else imageRequests.delete(activeProject.id);for(const listener of imageRequestListeners)listener();};
  const [generatedImages, setGeneratedImages] = useState(activeProject.generatedImages || []);
  const [selectedImage, setSelectedImage] = useState<string | null>(
    activeProject.generatedImages?.[0]?.url || null
  );

  const [chosenReferenceIds, setChosenReferenceIds] = useState<string[]>([]);
  const [referenceRole, setReferenceRole] = useState<'art_style'|'composition'|'materials'|'colors'|'lighting'|'close'>('art_style');
  const [referenceArtType, setReferenceArtType] = useState('auto');
  const [referenceStrength, setReferenceStrength] = useState(3);
  const [useBrandLogo,setUseBrandLogo]=useState(true);
  const brandLogo=activeProject.savedInspirations.find(item=>item.assetRole==='logo');
  useEffect(()=>{setUseBrandLogo(true);setChosenReferenceIds([]);},[activeProject.id]);
  useEffect(()=>{if(brandLogo)setChosenReferenceIds(ids=>ids.filter(id=>id!==brandLogo.id));},[brandLogo?.id]);
  const [preserveOwnSubject, setPreserveOwnSubject] = useState(true);
  const [chosenPaletteId, setChosenPaletteId] = useState<string>('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [loadedHistory, setLoadedHistory] = useState<Record<string,string>>({});
  const [referencePreviews, setReferencePreviews] = useState<Record<string,string>>({});
  useEffect(() => {
    let alive=true;
    Promise.all(activeProject.savedInspirations.map(async ref=>[ref.id,(await loadDesignImage('ref-'+ref.id).catch(()=>null)) || ref.thumbUrl || ref.url || ''] as const)).then(rows=>{if(alive)setReferencePreviews(Object.fromEntries(rows))});
    return ()=>{alive=false};
  },[activeProject.id,activeProject.savedInspirations]);
  useEffect(() => {
    setPrompt(selectedConceptForVisual?.imageGenerationPrompt || activeProject.brief.productOrService || activeProject.name || '');
    setChosenReferenceIds([]);
    setChosenPaletteId(activeProject.brand?.officialPaletteId || '');
    setGeneratedImages(activeProject.generatedImages || []);
    setSelectedImage(activeProject.generatedImages?.[0]?.url || null);
    setOriginalImage(null);
    setShowOriginal(false);
    setLoadedHistory({});
  }, [activeProject.id]);
  useEffect(() => {
    if (!activeProject.generatedImages?.length) return;
    let alive = true;
    Promise.all(activeProject.generatedImages.map(async item => {
      if (item.url?.startsWith('data:')) return [item.id, item.url] as const;
      const raw = await loadDesignImage(item.id).catch(()=>null);
      return [item.id, raw || ''] as const;
    })).then(all=>{if(alive) {const loaded=Object.fromEntries(all);setLoadedHistory(loaded);setSelectedImage(prev=>prev || (activeProject.generatedImages[0] ? loaded[activeProject.generatedImages[0].id] || null : null));}});
    return () => {alive=false;};
  }, [activeProject.id, activeProject.generatedImages]);
  const getHistoryUrl = (img: typeof generatedImages[number]) => loadedHistory[img.id] || (img.url?.startsWith('data:') ? img.url : '');
  const loadReference = async (id: string): Promise<string> => {
    const localReference = await loadDesignImage('ref-'+id).catch(()=>null);
    if (localReference && /^data:image\/(?:png|jpeg|webp);base64,/.test(localReference)) return localReference;
    if (id.startsWith('own-')) {
      const stored = await loadDesignImage(id.slice(4));
      return stored || '';
    }
    const ref = activeProject.savedInspirations.find(x => x.id === id);
    if (!ref?.url) return '';
    if (/^data:image\/(?:png|jpeg|webp);base64,/.test(ref.url)) return ref.url;
    if (!ref.url.startsWith('https://')) return '';
    // Try the browser first, then the local server for approved public sources (CORS fallback).
    try {
      const response = await fetch(ref.url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        if (['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) && blob.size <= 4_000_000) {
          return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        }
      }
    } catch { /* The browser can be blocked by CORS even when an image displays normally. */ }
    const response = await fetch('/api/visual-generator/reference-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: ref.url }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.imageBase64 || !['image/png', 'image/jpeg', 'image/webp'].includes(data.mimeType)) {
      throw Error(data.error || 'לא ניתן לקרוא את תמונת הרפרנס מהמקור');
    }
    return `data:${data.mimeType};base64,${data.imageBase64}`;
  };
  // If a concept was passed, update prompt
  useEffect(() => {
    if (selectedConceptForVisual) {
      setPrompt(selectedConceptForVisual.imageGenerationPrompt || [selectedConceptForVisual.coreIdea, selectedConceptForVisual.visualExecution].filter(Boolean).join('\n'));
      setChosenReferenceIds((selectedConceptForVisual.referenceIds||[]).filter(id=>activeProject.savedInspirations.some(ref=>ref.id===id&&ref.assetRole!=='logo')).slice(0,1));
    }
  }, [selectedConceptForVisual]);

  // Enhance prompt with Gemini
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    if (!window.confirm('שדרוג הפרומפט צורך קרדיטים. להמשיך?')) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/visual-generator/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roughPrompt: prompt,
          style: STYLE_PRESETS.find((s) => s.id === selectedStyle)?.label,
          hasTransparentPref: transparentPref || removeBg,
          excludePeople: globalPrefs.excludePeople,
        }),
      });

      if (!res.ok) throw new Error('שגיאה בשדרוג הפרומפט');
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        showToast('הפרומפט שודרג למפרט ארט מקצועי!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בשדרוג הפרומפט', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const cutoutImage = async (source: string): Promise<string> => {
    if (removalChoice === 'local') return removeImageBackground(source, cutoutMode);
    if (!window.confirm('הסרת רקע מתקדמת תעלה את התמונה לשירות חיצוני נפרד (remove.bg), שעלול להיות בתשלום. להמשיך?')) throw Error('הפעולה בוטלה');
    const response = await fetch('/api/image/remove-background', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image:source}) });
    const result = await response.json().catch(()=>({}));
    if (!response.ok || !result.imageUrl) throw Error(result.error || 'הסרת הרקע נכשלה');
    return result.imageUrl;
  };

  // Generate Image with Gemini image model
  const handleGenerate = async () => {
    if (imageRequests.has(activeProject.id)) return;
    if (!prompt.trim()) {
      showToast('נא להזין פרומפט', 'info');
      return;
    }

    setIsGenerating(true);
    try {
      const activeStyleObj = STYLE_PRESETS.find((s) => s.id === selectedStyle);
      const palette = activeProject.colorPalettes.find(p=>p.id===chosenPaletteId);
      const contextBrief = [activeProject.brief.productOrService, activeProject.brief.targetAudience, activeProject.brief.primaryMessage, activeProject.brief.creativeRestrictions].filter(Boolean).join(' | ');
      const fullPrompt = `${prompt}. ${contextBrief ? 'Project brief: '+contextBrief+'. ' : ''}${palette ? 'Preferred palette: '+palette.colors.join(', ')+'. ' : ''}Style: ${activeStyleObj?.promptSuffix || ''}${(transparentPref || removeBg) ? '. Isolated subject on a clean, uniform white studio background, no patterns, easy to mask; no environment.' : ''}`;
      // Reference guidance is applied in the *same* generation request, without a
      // separate image-analysis API call or additional Gemini credit consumption.
      const referenceRoles: Record<typeof referenceRole, string> = {
        art_style: 'Visual art style and artistic language only: medium, rendering technique, line quality, finish and visual character.',
        composition: 'Composition only: spatial arrangement, viewpoint, perspective and framing.',
        materials: 'Materials and textures only: surface finish, grain, reflectivity and material treatment.',
        colors: 'Color palette only: dominant colors and relationships; do not copy the reference subject.',
        lighting: 'Lighting and atmosphere only: direction, quality, contrast and mood.',
        close: 'Follow visual properties of the reference closely while still honoring the requested new subject and constraints.',
      };
      const referenceArtTypes: Record<string, string> = {
        auto: 'Infer the medium/technique visually from the reference image itself; do not assume it is photography.',
        photo: 'Make the result photorealistic, with professional photographic realism.',
        three_d: 'Make the result a polished three-dimensional render.',
        vector: 'Make the result a clean vector-style illustration with crisp shapes.',
        oil: 'Make the result a traditional oil painting with visible painterly brushwork.',
        watercolor: 'Make the result a watercolor painting with translucent pigments.',
        drawing: 'Make the result a hand-drawn illustration with natural linework.',
      };
      let referenceGuidance = chosenReferenceIds.length ? `\nREFERENCE IMAGE INSTRUCTIONS: Use the supplied image as a reference, not as the main subject. Specifically transfer: ${referenceRoles[referenceRole]} Medium: ${referenceArtTypes[referenceArtType]}. Influence strength ${referenceStrength}/5 (${referenceStrength <= 2 ? 'subtle' : referenceStrength === 3 ? 'moderate' : 'strong'}). ${preserveOwnSubject ? 'STRICT: Preserve the user-requested subject and concept. Never substitute the original reference subject for it.' : 'Adapt reference traits to the requested scene, but respect explicit user instructions.'} Avoid copying watermarks, lettering or logos from the reference. These are creative instructions, not exact numeric controls.\n` : '';
      if(activeProject.savedInspirations.find(item=>item.id===chosenReferenceIds[0])?.assetRole==='product')referenceGuidance=' PRODUCT INSTRUCTIONS: Preserve the supplied product identity, shape and details; use it as the subject of the requested scene or mockup.';
      let referenceImageBase64 = '';
      let logoImageBase64='';
      if(useBrandLogo&&brandLogo){logoImageBase64=await loadReference(brandLogo.id);if(!logoImageBase64)throw Error('קובץ הלוגו אינו זמין במחשב הזה. העלה אותו מחדש בפאנל הפרויקט.');}
      if (chosenReferenceIds.length) {
        const images = await Promise.all(chosenReferenceIds.map(id=>loadReference(id)));
        const available = images.filter(Boolean);
        if (!available.length) throw Error('לא ניתן לקרוא את תמונות הרפרנס שנבחרו. נסה עיצוב אישי או תמונה ממקור נגיש.');
        referenceImageBase64 = available[0];
        if (chosenReferenceIds.length > 1) showToast('בגרסה זו נשלח הרפרנס הראשון בלבד; שאר הבחירות אינן מועברות לתמונה.', 'info');
      }

      if (!window.confirm('יצירת תמונה צורכת קרדיטים. להמשיך?')) return;
      const data = await createImageJob({prompt:fullPrompt+referenceGuidance,aspectRatio,model,quality,excludePeople:globalPrefs.excludePeople,referenceImageBase64,referenceAssetRole:activeProject.savedInspirations.find(item=>item.id===chosenReferenceIds[0])?.assetRole||'reference',logoImageBase64,logoMimeType:/^data:(image\/(?:png|jpeg|webp));base64,/.exec(logoImageBase64)?.[1]||'image/png',referenceMimeType:/^data:(image\/(?:png|jpeg|webp));base64,/.exec(referenceImageBase64)?.[1]||'image/png'},activeProject.id,{prompt:fullPrompt+referenceGuidance,aspectRatio,model,quality,createdAt:Date.now(),conceptId:selectedConceptForVisual?.id,referenceIds:chosenReferenceIds});
      if (data.imageUrl) {
        setOriginalImage(data.imageUrl);
        let finalUrl = data.imageUrl;
        if (removeBg) {
          try { finalUrl = await cutoutImage(data.imageUrl); }
          catch (error: any) { showToast(error?.message || 'לא ניתן להסיר רקע אוטומטית', 'info'); }
        }
        const newImgObj = {
          id: 'gen-' + data.jobId,
          url: '',
          prompt: fullPrompt + referenceGuidance,
          aspectRatio, model, quality,
          conceptId:selectedConceptForVisual?.id, referenceIds:chosenReferenceIds,
          createdAt: Date.now(),
        };

        let imageSaved = true;
        try {
          const {saveDesignImage} = await import('../../data/designAssetsDb');
          await saveDesignImage(newImgObj.id, finalUrl);
          await saveDesignImage(newImgObj.id+'-original', data.imageUrl);
          setLoadedHistory(prev=>({...prev,[newImgObj.id]:finalUrl}));
        } catch { imageSaved = false; showToast('היצירה נוצרה אך שמירתה נכשלה. הורד אותה עכשיו.', 'error'); }
        const updated = [newImgObj, ...generatedImages];
        setGeneratedImages(updated);
        setSelectedImage(finalUrl);
        setShowOriginal(false);

        updateActiveProject((p) => ({
          ...p,
          generatedImages: [newImgObj, ...p.generatedImages.filter(image=>image.id!==newImgObj.id)],
        }));

        if (imageSaved) await acknowledgeImageJob(data.jobId).catch(()=>{});
        if (imageSaved) showToast(finalUrl === data.imageUrl && removeBg ? 'התמונה נוצרה, אך לא הוסר הרקע. המקור נשמר ללא שינוי.' : 'התמונה נוצרה ונשמרה בפרויקט', finalUrl === data.imageUrl && removeBg ? 'info' : 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה ביצירת תמונה', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const extractBackground = async () => {
    if (!selectedImage) return;
    setIsRemovingBg(true);
    try {
      const cutout = await cutoutImage(originalImage || selectedImage);
      setOriginalImage(originalImage || selectedImage);
      setSelectedImage(cutout); setShowOriginal(false);
      const matching = generatedImages.find(item=>getHistoryUrl(item)===selectedImage);
      if (matching) {
        await (await import('../../data/designAssetsDb')).saveDesignImage(matching.id, cutout);
        setLoadedHistory(prev=>({...prev,[matching.id]:cutout}));
      }
      showToast('נוצר PNG עם ערוץ שקיפות אמיתי. בדוק את איכות הקצוות.', 'success');
    } catch(e:any){ showToast(e.message || 'חילוץ הרקע נכשל', 'error'); }
    finally {setIsRemovingBg(false);}
  };

  // Send to Mockup Master
  const sendToMockup = (url: string) => {
    setSelectedArtworkForMockup(url);
    setActiveModule('mockup_master');
    showToast('היצירה נשלחה למאסטר מוקאפים!', 'success');
  };

  // Download image
  const downloadImage = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `dekel-visual-${Date.now()}.png`;
    a.click();
    showToast('התמונה הורדה בהצלחה', 'success');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Wand2" className="w-4 h-4" />
            <span>מודול #7 — מחולל ויזואלי AI</span>
          </div>
          <h1 className="text-2xl font-black text-white">הדמיית קונספטים ויזואלית</h1>
          <p className="text-xs text-[#C1D1D5]">
            יצירת תמונות לפרויקט עם שליטה בסגנון, ברזולוציה ובקומפוזיציה.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {globalPrefs.excludePeople && (
            <span className="text-[12px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold">
              סינון אנשים פעיל בפרומפט
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Prompt Editor & Controls (5 cols) */}
        <div className="lg:col-span-5 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="space-y-2">
            <label htmlFor="visual-concept" className="block font-bold text-zinc-300">בחירת קונספט מהפרויקט</label>
            <select id="visual-concept" value={selectedConceptForVisual?.id || ''} onChange={event => {
              const concept = activeProject.concepts.find(item => item.id === event.target.value) || null;
              setSelectedConceptForVisual(concept);
              setPrompt(concept ? concept.imageGenerationPrompt || [concept.coreIdea, concept.visualExecution].filter(Boolean).join('\n') : activeProject.brief.productOrService || '');
            }} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-white">
              <option value="">כתיבת פרומפט חופשי</option>
              {selectedConceptForVisual && !activeProject.concepts.some(item => item.id === selectedConceptForVisual.id) && <option value={selectedConceptForVisual.id}>{selectedConceptForVisual.conceptName}</option>}
              {activeProject.concepts.map(concept => <option key={concept.id} value={concept.id}>{concept.conceptName}</option>)}
            </select>
            {selectedConceptForVisual && <p className="text-xs leading-6 text-[#C1D1D5]">{selectedConceptForVisual.coreIdea}</p>}
          </div>
          <div className="flex items-center justify-between">
            <label className="text-zinc-300 font-bold block">פרומפט להדמיה (אנגלית/עברית):</label>
            <button
              onClick={handleEnhancePrompt}
              disabled={isEnhancing || !prompt.trim()}
              className="text-[13px] text-[#43D6CB] hover:underline font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <Icon name="Sparkles" className="w-3 h-3" />
              <span>{isEnhancing ? 'משדרג...' : 'שדרג פרומפט לארט דירקטור'}</span>
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="תאר את הסצנה, התאורה, החומרים והקומפוזיציה..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none focus:border-[#43D6CB]"
          />

          {/* Style Presets */}
          <div>
            <label className="text-zinc-300 font-bold block mb-1.5">סגנון אמנותי מוגדר מראש:</label>
            <div className="space-y-1.5">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`w-full text-right p-2 rounded-lg border transition ${
                    selectedStyle === style.id
                      ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900 text-[#C1D1D5] hover:border-zinc-700'
                  }`}
                >
                  <span className="block text-xs">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#183036] border border-[#31535A] p-3 space-y-3">
            <label className="block font-bold text-white">מודל יצירת תמונות</label>
            <select value={model} onChange={e => {setModel(e.target.value);setQuality('1K');}} className="w-full p-2 rounded-lg bg-zinc-900 text-white border border-zinc-700">
              <option value="gemini-3.1-flash-lite-image">Flash Lite — מהיר וחסכוני (1K בלבד)</option>
              <option value="gemini-3.1-flash-image">Flash Image — עד 4K</option>
              <option value="gemini-3-pro-image">Pro Image — עד 4K</option>
            </select>
            <label className="block font-bold text-white">רזולוציית יצירה (לפי תמיכת המודל)</label>
            <div className="flex gap-2">{(['1K','2K','4K'] as const).map(q => <button key={q} disabled={model==='gemini-3.1-flash-lite-image' && q!=='1K'} onClick={()=>setQuality(q)} className={`flex-1 rounded-lg py-2 font-bold border disabled:opacity-30 ${quality===q?'border-[#43D6CB] bg-[#43D6CB]/20 text-[#43D6CB]':'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>{q}</button>)}</div>
            <p className="text-[#C1D1D5] text-[12px]">בחירת איכות גבוהה עשויה לעלות יותר. הגודל בפועל נקבע על ידי Gemini; </p>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-zinc-300 font-bold block mb-1">יחס גובה-רוחב (Aspect Ratio):</label>
            <div className="flex gap-2">
              {(['1:1', '16:9', '9:16', '4:3', '3:4'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                    aspectRatio === r
                      ? 'border-[#43D6CB] bg-[#43D6CB] text-white'
                      : 'border-zinc-800 bg-zinc-900 text-[#C1D1D5] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Transparent option info */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-zinc-200 block">רקע מבודד (Studio Isolated):</span>
              <p className="text-[12px] text-[#C1D1D5] mt-0.5">
                מדריך את המודל לבודד את האובייקט על רקע אחיד לצורך שילוב נקי במוקאפ.
              </p>
            </div>
            <input
              type="checkbox"
              checked={transparentPref}
              onChange={(e) => setTransparentPref(e.target.checked)}
              className="w-4 h-4 accent-[#43D6CB] cursor-pointer"
            />
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-3 space-y-2">
            <label className="flex justify-between items-center text-white font-bold gap-2">PNG שקוף אמיתי (Alpha) <input type="checkbox" checked={removeBg} onChange={e=>{setRemoveBg(e.target.checked);if(e.target.checked)setTransparentPref(true);}} className="accent-[#43D6CB] w-4 h-4" /></label>
            <label className="text-zinc-300 block text-[13px]">מנגנון הסרת רקע</label>
            <select className="w-full bg-[#183036] border border-zinc-700 text-white p-2 rounded" value={removalChoice} onChange={e=>setRemovalChoice(e.target.value as 'local'|'advanced')}>
              <option value="local">מקומי — רקע אחיד (בחינם)</option>
              <option value="advanced">מתקדם — שירות חיצוני (עשוי להיות בתשלום)</option>
            </select>
            {removeBg && <><label className="text-zinc-300 block">סוג חיתוך</label><select className="w-full bg-[#183036] border border-zinc-700 text-white p-2 rounded" value={cutoutMode} onChange={e=>setCutoutMode(e.target.value as 'clean'|'soft')}><option value="clean">נקי — קצוות ברורים</option><option value="soft">רך — שימור קצוות וצללים בהירים ככל האפשר</option></select></>}
            <p className="text-[12px] text-amber-200">להסרת רקע מורכב ניתן לבחור בשירות חיצוני. התמונה תישלח רק לאחר אישורך; ייתכן חיוב נפרד.</p>
          </div>

          <section className="space-y-2 border border-[#31535A] bg-[#183036] rounded-xl p-3">
            <h3 className="font-bold text-white">פלטת צבעים מהפרויקט</h3>
            <select value={chosenPaletteId} onChange={e=>setChosenPaletteId(e.target.value)} className="w-full bg-[#101D23] text-white border border-[#45656A] rounded-lg p-2">
              <option value="">ללא פלטה מוגדרת</option>
              {activeProject.colorPalettes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {activeProject.colorPalettes.find(p=>p.id===chosenPaletteId) && <div className="flex gap-1" aria-label="צבעי הפלטה">{activeProject.colorPalettes.find(p=>p.id===chosenPaletteId)!.colors.map((c,i)=><span title={c} key={i} className="flex-1 h-5 rounded" style={{backgroundColor:c}} />)}</div>}
          </section>
          <section className="space-y-2 border border-[#31535A] bg-[#183036] rounded-xl p-3">
            <h3 className="font-bold text-white">רפרנסים מתיקיית ההשראות</h3>
            <p className="text-xs text-zinc-200">בחר תמונת השראה או מוצר. לוגו המותג יכול להישלח בנוסף אליה.</p>
            {brandLogo&&<div className="rounded-lg border border-[#43D6CB]/50 p-2 space-y-2"><label className="flex items-center gap-2 text-white"><input type="checkbox" checked={useBrandLogo} onChange={e=>setUseBrandLogo(e.target.checked)}/>שלב את לוגו המותג בתמונה</label><div className="flex items-center gap-2"><img src={referencePreviews[brandLogo.id]} alt="לוגו המותג" className="h-14 w-14 object-contain rounded bg-white/10"/><span className="truncate text-zinc-200">{brandLogo.title}</span></div><button type="button" onClick={()=>{setUseBrandLogo(true);setSelectedStyle('studio_packaging');setRemoveBg(false);setTransparentPref(false);setPrompt('צור מוקאפ פוטוריאליסטי מקצועי של אריזה ממותגת עם לוגו המותג המצורף. שלב את הלוגו באופן טבעי על האריזה ושמור על הכיתוב, הצבעים והפרופורציות שלו. תאורת סטודיו רכה, חומרים מציאותיים וקומפוזיציה נקייה.');}} className="rounded-lg bg-[#43D6CB] px-3 py-2 font-bold text-[#183036]">הכן מוקאפ עם הלוגו</button></div>}
            <div className="max-h-40 overflow-y-auto space-y-2">
              {activeProject.savedInspirations.length===0 && <p className="text-zinc-200">עדיין לא נשמרו השראות בפרויקט.</p>}
              {activeProject.savedInspirations.filter(ref=>ref.assetRole!=='logo').map(ref=><label key={ref.id} className="flex gap-2 items-center bg-[#102B31] text-white rounded-lg p-2 cursor-pointer">
                <input type="radio" name="dekel-reference" checked={chosenReferenceIds[0]===ref.id} onChange={()=>setChosenReferenceIds([ref.id])}/>
                <img src={referencePreviews[ref.id]} alt="" className="h-12 w-12 rounded-md object-cover bg-[#183036]" onError={e=>{e.currentTarget.style.visibility="hidden"}}/><span className="truncate">{ref.title}</span>
              </label>)}
              {chosenReferenceIds.length>0&&<button onClick={()=>setChosenReferenceIds([])} className="text-[#43D6CB] underline">הסר בחירת רפרנס</button>}
            </div>
            {chosenReferenceIds.length > 0 && <div className="space-y-3 rounded-xl border border-[#43D6CB]/40 bg-[#102B31] p-3" dir="rtl">
              <label className="block space-y-1.5"><span className="font-bold text-white">מה לקחת מהרפרנס?</span>
                <select value={referenceRole} onChange={e=>setReferenceRole(e.target.value as typeof referenceRole)} className="w-full rounded-lg border border-[#45656A] bg-[#183036] p-2 text-white">
                  <option value="art_style">סגנון אמנותי</option><option value="composition">קומפוזיציה וזווית</option>
                  <option value="materials">חומרים וטקסטורות</option><option value="colors">צבעוניות</option>
                  <option value="lighting">תאורה ואווירה</option><option value="close">מאפיינים חזותיים קרובים למקור</option>
                </select>
              </label>
              <label className="block space-y-1.5"><span className="font-bold text-white">סוג האמנות הרצוי</span>
                <select value={referenceArtType} onChange={e=>setReferenceArtType(e.target.value)} className="w-full rounded-lg border border-[#45656A] bg-[#183036] p-2 text-white">
                  <option value="auto">לפי האמנות בתמונה (זיהוי בזמן היצירה)</option>
                  <option value="photo">צילום פוטוריאליסטי</option><option value="three_d">רינדור תלת־ממד</option>
                  <option value="vector">איור וקטורי</option><option value="oil">ציור שמן</option>
                  <option value="watercolor">ציור בצבעי מים</option><option value="drawing">איור ידני</option>
                </select>
              </label>
              <label className="block space-y-1"><span className="flex justify-between font-bold text-white"><span>עוצמת השפעת הרפרנס</span><span>{referenceStrength} מתוך 5</span></span>
                <input type="range" min="1" max="5" step="1" value={referenceStrength} onChange={e=>setReferenceStrength(Number(e.target.value))} className="w-full accent-[#43D6CB]" />
              </label>
              <label className="flex items-start gap-2 text-white"><input type="checkbox" checked={preserveOwnSubject} onChange={e=>setPreserveOwnSubject(e.target.checked)} className="mt-0.5 accent-[#43D6CB]"/><span>שמור על הנושא שלי — למד מהרפרנס רק את הסגנון או המאפיינים שבחרתי</span></label>
              <p className="text-[12px] text-zinc-300 leading-relaxed">הבחירות נשלחות כהנחיות ביחד עם הרפרנס בפעולת היצירה הרגילה. אין חיוב נוסף על ניתוח נפרד; עוצמת ההשפעה היא הנחיה ולא מדד מדויק.</p>
            </div>}

          </section>
          <p className="text-[#D9F9F3] text-xs">יצירת תמונה צורכת קרדיטים.</p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3 bg-gradient-to-r from-[#43D6CB] to-[#43D6CB] hover:from-teal-500 hover:to-teal-700 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25"
          >
            {isGenerating ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
                יוצר תמונה...
              </>
            ) : (
              <>
                <Icon name="Wand2" className="w-4 h-4" />
                הפק הדמיה עכשיו
              </>
            )}
          </button>
        </div>

        {/* Right: Active Visual Preview & History (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">תצוגת הדמיה נוכחית:</span>
              {selectedImage && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={extractBackground} disabled={isRemovingBg} className="px-2 py-1 bg-zinc-800 rounded-lg text-[#43D6CB] disabled:opacity-50">{isRemovingBg?'מסיר...':'הסר רקע'}</button>
                  {originalImage && <button onClick={()=>setShowOriginal(x=>!x)} className="px-2 py-1 rounded-lg bg-zinc-800 text-white">{showOriginal?'הצג תוצאה':'הצג מקור'}</button>}
                  {false && <button
                    onClick={() => sendToMockup(selectedImage || '')}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold transition flex items-center gap-1 border border-zinc-700"
                  >
                    <Icon name="Layers" className="w-3 h-3 text-[#43D6CB]" />
                    שלח למוקאפ
                  </button>}
                  <button
                    onClick={() => downloadImage(showOriginal && originalImage ? originalImage : selectedImage)}
                    className="px-2.5 py-1 bg-[#43D6CB] hover:bg-teal-600 text-white rounded-lg font-bold transition flex items-center gap-1"
                  >
                    <Icon name="Download" className="w-3 h-3" />
                    הורד
                  </button>
                </div>
              )}
            </div>

            <div className="aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center relative shadow-2xl" style={{backgroundColor:'#11161a'}}> 
              {isGenerating ? (
                <div className="text-center space-y-2 p-6 rounded-xl bg-[#102B31]/95 border border-[#43D6CB]/40 shadow-2xl">
                  <Icon name="RefreshCw" className="w-8 h-8 text-[#43D6CB] mx-auto animate-spin" />
                  <p className="text-white text-xs font-bold">התמונה שלך נוצרת...</p>
                  <p className="text-zinc-200 text-[12px]">מכין את התמונה שלך</p>
                </div>
              ) : selectedImage ? (
                <img
                  src={showOriginal && originalImage ? originalImage : selectedImage}
                  alt="AI Generated"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center text-[#C1D1D5] text-xs">
                  <Icon name="Image" className="w-8 h-8 mx-auto opacity-50 mb-1" />
                  עדיין לא הופקו תמונות. הזן פרומפט ולחץ על "הפק הדמיה עכשיו".
                </div>
              )}
            </div>
          </div>

          {/* History Gallery */}
          {generatedImages.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#C1D1D5]">היסטוריית הדמיות שנוצרו בפרויקט:</span>
              <div className="grid grid-cols-4 gap-2">
                {generatedImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => {const url=getHistoryUrl(img); if(url){setSelectedImage(url);setOriginalImage(url); (async()=>{ const original=await loadDesignImage(img.id+'-original');if(original)setOriginalImage(original); })();setShowOriginal(false);}else showToast('הקובץ המקורי אינו זמין במחשב הזה', 'info');}}
                    className={`aspect-square rounded-xl overflow-hidden border transition ${
                      selectedImage === img.url
                        ? 'border-[#43D6CB] ring-2 ring-[#43D6CB]'
                        : 'border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={getHistoryUrl(img)} alt="תמונה שנוצרה" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedImage && <button className="rounded-lg bg-[#183036] border border-[#45656A] px-3 py-2 text-white" onClick={()=>setZoomImage(selectedImage)}>פתח בגודל מלא</button>}
                {selectedImage && <button className="rounded-lg bg-[#183036] border border-[#45656A] px-3 py-2 text-white" onClick={()=>downloadImage(selectedImage)}>הורד תמונה נבחרת</button>}
              </div>
            </div>
          )}
          {zoomImage && <div role="dialog" aria-label="תמונה מוגדלת" className="fixed inset-0 z-[100] bg-[#091115]/95 flex flex-col items-center justify-center gap-3 p-6" onClick={()=>setZoomImage(null)}>
            <button className="self-end text-white bg-[#183036] px-4 py-2 rounded-lg" onClick={()=>setZoomImage(null)}>סגור ✕</button>
            <img src={zoomImage} alt="תמונה מוגדלת" className="max-w-full max-h-[80vh] object-contain" />
            <button className="bg-[#43D6CB] text-[#102B31] font-bold px-4 py-2 rounded-lg" onClick={e=>{e.stopPropagation();downloadImage(zoomImage)}}>הורד תמונה</button>
          </div>}

        </div>
      </div>
    </div>
  );
};


