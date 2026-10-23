import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { InspirationItem } from '../../types';
import { Icon } from '../common/Icon';
import { interpretBrief, type SourceMode } from '../../data/inspirationSearch';
import { saveDesignImage } from '../../data/designAssetsDb';

const OPENVERSE_API_URL = '/api/inspiration/openverse';

interface OpenverseImageRaw {
  id: string;
  title: string;
  foreign_landing_url: string;
  url: string;
  thumbnail?: string;
  creator?: string;
  creator_url?: string;
  source?: string;
  provider?: string;
  license?: string;
  license_version?: string;
  license_url?: string;
  tags?: { name: string }[];
}

export const InspirationHunter: React.FC = () => {
  const {
    activeProject,
    updateActiveProject,
    globalPrefs,
    setSelectedInspirationForAnalysis,
    setActiveModule,
    showToast,
  } = useProject();

  // Search input & filter state (Independent Openverse Search)
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceMode, setSourceMode] = useState<SourceMode>('haredi');
  const selectedSites = ['hafsakat','heller','blum','signon','juices','prog'];
  const [siteReports, setSiteReports] = useState<{source:string;count:number;warning:string}[]>([]);
  const [interpreted, setInterpreted] = useState<ReturnType<typeof interpretBrief> | null>(null);
  const [briefQuery, setBriefQuery] = useState(activeProject?.brief?.productOrService || '');
  const [styleFilter, setStyleFilter] = useState('הכל');
  const [industryFilter, setIndustryFilter] = useState('הכל');
  const [techniqueFilter, setTechniqueFilter] = useState('הכל');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'masonry'>('grid');

  // AI query expansion state (Strictly Optional & Separated)
  const [isAiSectionOpen, setIsAiSectionOpen] = useState(true);
  const [isAiToolsOpen, setIsAiToolsOpen] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isAiQuotaExhausted, setIsAiQuotaExhausted] = useState(false);
  const [aiNoticeMessage, setAiNoticeMessage] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<{
    expandedConcepts?: string[];
    englishKeywords?: string[];
    hebrewKeywords?: string[];
    searchQueries?: { engine: string; query: string }[];
    visualTechniqueSuggestions?: string[];
    colorPaletteAdvice?: string;
    gestaltApproach?: string;
  } | null>(null);

  // Openverse search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<InspirationItem[]>([]);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<InspirationItem | null>(null);
  const [sourceCandidates, setSourceCandidates] = useState<InspirationItem[]>([]);
  const [reviewedSourceUrls, setReviewedSourceUrls] = useState<string[]>([]);
  const [visionStatus, setVisionStatus] = useState<{ indexed: number; limit: number; aiConfigured: boolean } | null>(null);
  const [visionRanking, setVisionRanking] = useState<string>('');
  const [isLearning, setIsLearning] = useState(false);
  const [learningNotice, setLearningNotice] = useState('');
  const [portfolioCandidates, setPortfolioCandidates] = useState<InspirationItem[]>([]);
  const [isPortfolioReviewing, setIsPortfolioReviewing] = useState(false);
  const searchGenerationRef = useRef(0);
  const [isSavingReference, setIsSavingReference] = useState(false);

  const refreshVisionStatus = async () => {
    try {
      const r = await fetch('/api/inspiration/hafsakat/vision-status');
      if (r.ok) setVisionStatus(await r.json());
    } catch { /* A disconnected pilot server must not break international search. */ }
  };
  useEffect(() => { void refreshVisionStatus(); }, []);


  // Understand the subject locally. AI is optional, so searching never depends on Gemini quota.
  const handleSmartSearch = async (text: string, mode: SourceMode = sourceMode) => {
    const q = text.trim();
    if (!q) { showToast('כתוב מה אתה מחפש כדי להתחיל', 'info'); return; }
    const interpretation = interpretBrief(q, mode);
    setInterpreted(interpretation);
    setLastQuery(q);
    setSearchError(null);
    if (mode === 'haredi') {
      await searchHarediAll(q);
    } else {
      await searchOpenverse(interpretation.englishSearch);
    }
  };

  // Show only identifiable visual results relevant to the current query.
  // Link-only pages are not image inspirations and must not masquerade as visual results.
  const mergeHarediResults = (reviewed: InspirationItem[], candidates: InspirationItem[], queryOverride?: string): InspirationItem[] => {
    const seen = new Set<string>();
    const terms = (queryOverride || lastQuery || searchQuery).toLowerCase().split(/[\s,.;:()\-]+/).filter(w => w.length >= 3 && !['אני','מחפש','רוצה','עיצוב','מודעה','מיתוג','עבור','שיהיה','סגנון'].includes(w));
    return [...reviewed, ...candidates].filter((item) => {
      if (!(item.thumbUrl || item.url)) return false;
      const key = item.sourceUrl || item.id;
      if (!key || seen.has(key)) return false;
      const searchable = [item.title, item.technique].filter(Boolean).join(' ').toLowerCase();
      if (terms.length && !terms.some(w => searchable.includes(w))) return false;
      seen.add(key);
      return true;
    });
  };

  // V12.4: combine both source families exactly once. Parallel completion must never
  // overwrite a different source's results, and stale searches must not replace a newer one.
  const searchHarediAll = async (queryText: string) => {
    const generation = ++searchGenerationRef.current;
    setIsSearching(true);
    setSearchError(null);
    setLearningNotice('');
    setSearchResults([]);
    setSourceCandidates([]);
    setPortfolioCandidates([]);
    setSiteReports([]);
    setReviewedSourceUrls([]);
    try {
      const portfolioSources = selectedSites.filter(x=>x!=='hafsakat').join(',');
      const [rawHafsakat, indexedHafsakat, rawPortfolios] = await Promise.allSettled([
        fetch(`/api/inspiration/hafsakat?q=${encodeURIComponent(queryText)}`).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'המקור לא זמין');return d;}),
        fetch('/api/inspiration/hafsakat/visual-search', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:queryText})}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'הניתוח לא זמין');return d;}),
        fetch(`/api/inspiration/portfolios?q=${encodeURIComponent(queryText)}&sources=${encodeURIComponent(portfolioSources)}`).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'אתרי המעצבים לא זמינים');return d;}),
      ]);
      if (generation!==searchGenerationRef.current) return;
      const candidates: InspirationItem[] = rawHafsakat.status==='fulfilled' && Array.isArray(rawHafsakat.value.results) ? rawHafsakat.value.results : [];
      const reviewed: InspirationItem[] = indexedHafsakat.status==='fulfilled' && Array.isArray(indexedHafsakat.value.results) ? indexedHafsakat.value.results : [];
      const portfolios: InspirationItem[] = rawPortfolios.status==='fulfilled' && Array.isArray(rawPortfolios.value.results) ? rawPortfolios.value.results : [];
      setSourceCandidates(candidates);
      setReviewedSourceUrls(reviewed.map(item=>item.sourceUrl));
      setVisionRanking(indexedHafsakat.status==='fulfilled' ? indexedHafsakat.value.ranking||'' : '');
      setPortfolioCandidates(portfolios);
      setSiteReports(rawPortfolios.status==='fulfilled' && Array.isArray(rawPortfolios.value.sources) ? rawPortfolios.value.sources : []);
      setSearchResults(mergeHarediResults(reviewed, [...candidates,...portfolios], queryText));
      const issues = [rawHafsakat,rawPortfolios].filter(x=>x.status==='rejected').map(x=>String((x as PromiseRejectedResult).reason?.message||'מקור לא זמין'));
      if(issues.length) setLearningNotice(issues.join(' | '));
      void refreshVisionStatus();
    } catch(e:any) {
      if(generation===searchGenerationRef.current)setSearchError(e?.message||'שגיאה בחיפוש');
    } finally {
      if(generation===searchGenerationRef.current)setIsSearching(false);
    }
  };

  const reviewPortfoliosWithAI = async () => {
    if (!portfolioCandidates.length || isPortfolioReviewing) return;
    if (!window.confirm('בדיקה חזותית של עד 5 תמונות באמצעות AI צורכת קרדיטים. להמשיך?')) return;
    setIsPortfolioReviewing(true);
    try {
      const r = await fetch('/api/inspiration/portfolio-vision', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({query:lastQuery || searchQuery,items:portfolioCandidates.slice(0,5)}),
      });
      const data = await r.json();if (!r.ok) throw Error(data.error||'הבדיקה החזותית נכשלה');
      setSearchResults(prev=>mergeHarediResults(prev.filter(item=>!portfolioCandidates.some(p=>p.id===item.id)), data.results||[], lastQuery || searchQuery));
      setLearningNotice(`נבדקו עד ${data.checked} תמונות ממשרדי העיצוב. נמצאו ${data.approved} מתאימות חזותית. תוצאות שלא אומתו הוסרו.`);
    } catch(e:any){setLearningNotice(e.message||'לא ניתן להשלים בדיקת AI');}
    finally{setIsPortfolioReviewing(false);}
  };

  const handleVisualLearning = async () => {
    if (isLearning || !sourceCandidates.length) return;
    setIsLearning(true);
    setLearningNotice('ה-AI קורא את התמונות עצמן ומזהה רעיון, קומפוזיציה, צבעים וסגנון. פעולה זו עשויה להימשך כחצי דקה ולצרוך מכסת API.');
    try {
      const existingSources = new Set(reviewedSourceUrls);
      const sourceUrls = sourceCandidates
        .filter(item => !existingSources.has(item.sourceUrl))
        .slice(0, 6).map(item => item.sourceUrl);
      if (!sourceUrls.length) {
        setLearningNotice('כל המועמדות הזמינות כבר נבדקו. נסה בריף אחר כדי להרחיב את המאגר.');
        return;
      }
      const r = await fetch('/api/inspiration/hafsakat/vision-learn', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrls }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `שגיאת שרת ${r.status}`);
      setLearningNotice(`${data.message || 'הסריקה הסתיימה'}. ${data.failures?.length ? 'לא נותחו: ' + data.failures.join(' | ') : ''}`);
      await refreshVisionStatus();
      const rankingResponse = await fetch('/api/inspiration/hafsakat/visual-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: lastQuery || searchQuery }),
      });
      if (rankingResponse.ok) {
        const ranked = await rankingResponse.json();
        const reviewed = Array.isArray(ranked.results) ? ranked.results : [];
        setReviewedSourceUrls(reviewed.map((item: InspirationItem) => item.sourceUrl));
        setSearchResults(mergeHarediResults(reviewed, sourceCandidates));
        setVisionRanking(ranked.ranking || '');
      }
    } catch (e: any) {
      setLearningNotice(`לא ניתן לבצע ניתוח חזותי: ${e?.message || 'שגיאה'}`);
    } finally {
      setIsLearning(false);
    }
  };

  // Pure Openverse Search Execution — Completely Independent of Gemini AI
  const searchOpenverse = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setLastQuery(q);

    try {
      const url = `${OPENVERSE_API_URL}?q=${encodeURIComponent(q)}&page_size=20`;
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`שרת התמונות של Openverse החזיר שגיאה (${res.status})`);
      }

      const data = await res.json();

      if (!data || !Array.isArray(data.results)) {
        throw new Error('התקבל מענה בפורמט לא תקין מ-Openverse API');
      }

      const items: InspirationItem[] = data.results.map((img: OpenverseImageRaw) => ({
        id: `openverse-${img.id}`,
        title: img.title?.trim() || 'תמונה ללא כותרת',
        url: img.url,
        thumbUrl: img.thumbnail || img.url,
        source: img.source || img.provider || 'Openverse',
        sourceUrl: img.foreign_landing_url || img.url,
        author: img.creator || undefined,
        authorUrl: img.creator_url || undefined,
        style: img.license ? `רישיון: CC ${img.license.toUpperCase()} ${img.license_version || ''}`.trim() : 'Creative Commons',
        technique: img.tags?.slice(0, 3).map((t) => t.name).join(', ') || undefined,
        isSample: false,
      }));

      setSearchResults(items);
    } catch (err: any) {
      console.warn('Openverse API connection warning:', err);
      setSearchError('לא ניתן לטעון תמונות מ-Openverse כעת. אנא בדוק את החיבור לרשת ונסה שוב.');
      showToast('שגיאה בקבלת תמונות מ-Openverse', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Search only when requested to avoid automatic network calls on app startup.

  // Separate, Explicit Gemini AI Expansion — Only triggered by user click on AI button
  const handleExpandBrief = async () => {
    if (!briefQuery.trim() || isExpanding) return;
    setIsExpanding(true);
    setAiNoticeMessage(null);

    try {
      const res = await fetch('/api/inspiration/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: briefQuery,
          style: styleFilter,
          industry: industryFilter,
          technique: techniqueFilter,
          excludePeople: globalPrefs.excludePeople,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Check for 429 quota exhaustion gracefully
      const isQuota =
        res.status === 429 ||
        (typeof data?.error === 'string' &&
          (data.error.includes('429') ||
            data.error.includes('RESOURCE_EXHAUSTED') ||
            data.error.includes('quota') ||
            data.error.includes('Quota')));

      if (isQuota) {
        // Handle 429 gracefully: never show raw error, do not retry automatically, preserve query
        setIsAiQuotaExhausted(true);
        setAiNoticeMessage(
          'מכסת השימוש ב-Gemini AI (Free Tier) מוצתה זמנית. מנוע חיפוש התמונות ב-Openverse וכל כלי העיצוב ממשיכים לפעול כרגיל ללא תלות ב-AI.'
        );
        showToast('מכסת ה-AI מוצתה זמנית. חיפוש התמונות ב-Openverse פעיל כרגיל!', 'info');
        return;
      }

      if (!res.ok) {
        setAiNoticeMessage('לא ניתן היה להרחיב את הבריף כעת. ניתן להמשיך לחפש תמונות ישירות ב-Openverse.');
        return;
      }

      setExpandedData(data);
      setIsAiQuotaExhausted(false);
      showToast('הבריף פוענח בהצלחה למונחי חיפוש קריאייטיביים!', 'success');
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota')
      ) {
        setIsAiQuotaExhausted(true);
        setAiNoticeMessage(
          'מכסת השימוש ב-Gemini AI מוצתה זמנית. מנוע חיפוש התמונות ב-Openverse זמין במלואו.'
        );
      } else {
        setAiNoticeMessage('שגיאת תקשורת עם שירות ה-AI. חיפוש התמונות ב-Openverse זמין ישירות ללא הגבלה.');
      }
    } finally {
      setIsExpanding(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Save to project
  const saveToProject = async (item: InspirationItem) => {
    if ((activeProject?.savedInspirations || []).some(i=>i.id===item.id)) {
      showToast('ההשראה כבר קיימת בפרויקט הנוכחי','info');return;
    }
    if(!item.url) {showToast('לעבודה זו אין תמונה שניתן לשמור כרפרנס','error');return;}
    if(isSavingReference)return;
    setIsSavingReference(true);
    try {
      // The <img> element may display an image that fetch() cannot read due to CORS.
      // Prefer an approved public-source server read, retaining actual bytes locally.
      let dataUrl = item.url.startsWith('data:image/') ? item.url : '';
      if (!dataUrl) {
        try {
          const r=await fetch('/api/visual-generator/reference-image',{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:item.url}),
          });
          const body=await r.json().catch(()=>({}));
          if(r.ok && body.imageBase64 && ['image/png','image/jpeg','image/webp'].includes(body.mimeType))
            dataUrl=`data:${body.mimeType};base64,${body.imageBase64}`;
        } catch { /* try the browser directly next */ }
      }
      if (!dataUrl && item.url.startsWith('https://')) {
        // Some public image CDNs permit browser CORS even if the server cannot fetch them.
        try {
          const response = await fetch(item.url,{mode:'cors'});
          if (response.ok) {
            const blob=await response.blob();
            if (['image/png','image/jpeg','image/webp'].includes(blob.type) && blob.size<=4_000_000)
              dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
          }
        } catch { /* unavailable source; the page URL can still be saved */ }
      }
      // A local copy is not always available (source unavailable or restricted).
      // Preserve the link for later, but clearly say it is not a usable image reference yet.
      if(dataUrl) await saveDesignImage('ref-'+item.id,dataUrl);
      updateActiveProject(p=>({...p,savedInspirations:[item,...(p.savedInspirations||[])]}));
      showToast(dataUrl ? 'ההשראה נשמרה יחד עם תמונת הרפרנס' : 'הקישור נשמר, אך המקור אינו מאפשר עדיין שימוש בתמונה כרפרנס','info');
    } catch(e:any) {showToast('לא ניתן לשמור את תמונת הרפרנס: '+(e?.message||'שגיאה'),'error');}
    finally {setIsSavingReference(false);}
  };

  // Send to Creative Analyzer
  const sendToAnalyzer = (item: InspirationItem) => {
    setSelectedInspirationForAnalysis(item);
    setActiveModule('creative_analyzer');
    showToast('ההשראה נשלחה לניתוח קריאייטיב מולטימודלי', 'success');
  };

  const quickSearchPresets = [
    { label: 'עיצוב גרפי', query: 'graphic design' },
    { label: 'טיפוגרפיה', query: 'typography poster' },
    { label: 'מיתוג יוקרה', query: 'luxury packaging' },
    { label: 'מרחב שלילי', query: 'negative space design' },
    { label: 'מינימליזם', query: 'minimalist art' },
    { label: 'קולינריה', query: 'gourmet food photography' },
    { label: 'דפוס וזהב', query: 'gold foil print' },
  ];

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Compass" className="w-4 h-4" />
            <span>מודול #1 — צייד השראות</span>
          </div>
          <h1 className="text-2xl font-black text-white">מנוע גילוי השראות ורפרנסים</h1>
          <p className="text-xs text-zinc-400">
            כתוב בריף חופשי. המערכת מזהה תחום, סגנון ומילות חיפוש רלוונטיות; מקורות חרדיים בעדיפות.
          </p>
        </div>


      </div>

      {/* Primary: Pure Independent Openverse Image Search (NO Gemini required) */}
      <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-white block">
            מה תרצה לעצב? תאר בקצרה את הפרויקט:
          </label>
          <span className="text-[10px] text-zinc-500">פענוח ראשוני ללא צורך במפתח AI</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="למשל: מודעת דינר חסידית יוקרתית / מיתוג שעונים יוקרתיים..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#43D6CB]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSmartSearch(searchQuery);
                }
              }}
            />
          </div>

          <button
            onClick={() => handleSmartSearch(searchQuery)}
            disabled={isSearching}
            className="px-6 py-2.5 bg-[#43D6CB] hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 flex-shrink-0 cursor-pointer"
          >
            {isSearching ? (
              <>
                <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
                מחפש השראות...
              </>
            ) : (
              <>
                <Icon name="Search" className="w-4 h-4" />
                מצא השראות
              </>
            )}
          </button>
        </div>

        <div className="flex gap-2" role="group" aria-label="תחום מקורות">
          {([['haredi', 'חרדי'], ['international', 'בינלאומי']] as const).map(([mode, label]) => (
            <button key={mode} onClick={() => { setSourceMode(mode); setInterpreted(null); setSearchResults([]); setSourceCandidates([]); setSearchError(null); setLearningNotice(''); }}
              aria-pressed={sourceMode === mode}
              className={`px-5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${sourceMode === mode ? 'bg-teal-500 text-white border-teal-300' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-teal-500'}`}>{label}</button>
          ))}
        </div>
        {interpreted && (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 space-y-3">
            <div className="flex gap-2 items-center text-teal-300 text-xs font-bold"><Icon name="Sparkles" className="w-4 h-4" /> כך פירשתי את הבריף שלך</div>
            <p className="text-xs text-zinc-200">{interpreted.explanation}</p>
            <div className="flex flex-wrap gap-2">{interpreted.hebrewTerms.map(term => <span key={term} className="rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300">{term}</span>)}</div>
            <p className="text-[11px] text-zinc-500">זיהוי ראשוני לפי כללים מקומיים; אינו ניתוח AI מלא.</p>
          </div>
        )}
        {sourceMode === 'haredi' && siteReports.length > 0 && <div className="rounded-xl bg-[#183036] border border-[#45656A] p-3 text-xs text-zinc-200">
          החיפוש בודק אוטומטית את מקורות ההשראה החרדיים. מוצגות רק תוצאות שיש להן תמונה וזיקה לבריף.
          <details className="mt-2"><summary className="cursor-pointer text-[#43D6CB]">מצב מקורות</summary>
            <div className="flex flex-wrap gap-2 mt-2">{siteReports.map((r,i)=><span key={i} title={r.warning||''} className="border border-[#45656A] rounded-lg px-2 py-1">{r.source}: {r.count}{r.warning?' · לא זמין/אין התאמות':''}</span>)}</div>
          </details>
        </div>}
        {/* Quick Search Preset Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-zinc-400 font-bold ml-1">חיפושים מהירים:</span>
          {quickSearchPresets.map((preset) => (
            <button
              key={preset.query}
              onClick={() => {
                setSearchQuery(preset.query);
                handleSmartSearch(preset.query);
              }}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-[#43D6CB] rounded-lg text-[11px] text-zinc-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>{preset.label}</span>
              <span className="text-[10px] text-zinc-500 font-mono">({preset.query})</span>
            </button>
          ))}
        </div>
      </div>

        {/* AI tools are optional and stay out of the way until requested. */}
        <div className="flex justify-end">
          <button type="button" onClick={() => setIsAiToolsOpen(open => !open)}
            aria-expanded={isAiToolsOpen} aria-controls="dekel-ai-tools"
            title={isAiToolsOpen ? 'סגור כלי AI' : 'פתח כלי AI'}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${isAiToolsOpen ? 'border-[#43D6CB] bg-[#103F46] text-[#F7F8F3]' : 'border-[#43D6CB]/35 bg-[#183036] text-[#F7F8F3] hover:border-[#43D6CB]'}`}>
            <Icon name="Sparkles" className="h-4 w-4 text-[#43D6CB]" />
            <span>כלי AI</span>
            <span aria-hidden="true" className="text-zinc-400">{isAiToolsOpen ? '▴' : '▾'}</span>
          </button>
        </div>
        {sourceMode === 'haredi' && portfolioCandidates.length > 0 && (
          <div className="rounded-xl border border-[#45656A] bg-[#183036] p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
            <span>נמצאו {portfolioCandidates.length} תמונות מאתרי המעצבים. התאמתן החזותית עדיין לא אומתה.</span>
            <button type="button" onClick={reviewPortfoliosWithAI} disabled={isPortfolioReviewing || isSearching}
              className="rounded-lg bg-[#43D6CB] px-4 py-2 font-bold text-[#102B31] disabled:opacity-50">
              {isPortfolioReviewing ? 'בודק תמונות…' : 'בדוק התאמה חזותית ב-AI (עד 5, צורך קרדיטים)'}
            </button>
          </div>
        )}
        {isAiToolsOpen && sourceMode === 'haredi' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-xs text-zinc-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <strong className="text-amber-300">ניסוי: AI שמבין את התמונות עצמן</strong>
                <p className="mt-1 text-zinc-400">הפסקת פרסומות · {visionStatus ? `${visionStatus.indexed} מתוך ${visionStatus.limit} עבודות נלמדו` : 'בודק את המאגר...'} · {sourceCandidates.length} מועמדות מהחיפוש הנוכחי</p>
                <p className="mt-1 text-zinc-500">מוצגות עבודות אמיתיות ממקור האתר. עבודות שטרם נותחו מסומנות במפורש, והתאמתן לחיפוש אינה מאומתת.</p>
              </div>
              <button
                onClick={handleVisualLearning}
                disabled={isLearning || isSearching || !sourceCandidates.length || (visionStatus?.indexed || 0) >= 180}
                className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400"
              >
                {isLearning ? 'מנתח עד 6 עבודות ב-AI…' : 'נתח עד 6 עבודות מהמאגר עם AI'}
              </button>
            </div>
            {!visionStatus?.aiConfigured && <p className="text-amber-300">כדי להפעיל ניתוח תמונות אמיתי יש להגדיר GEMINI_API_KEY בשרת המקומי. ללא מפתח אפשר להמשיך בחיפוש הבינלאומי.</p>}
            {learningNotice && <p className="p-2 rounded-lg bg-zinc-900/70 text-zinc-300 break-words">{learningNotice}</p>}
            {visionRanking === 'ai' && !!searchResults.length && <p className="text-emerald-400">התוצאות מדורגות באמצעות AI לפי התיאור החזותי שלהן.</p>}
            {visionRanking === 'descriptions' && !!searchResults.length && <p className="text-zinc-400">הדירוג הזמני לפי התיאורים שנלמדו. הדירוג הסמנטי מחייב חיבור AI פעיל.</p>}
          </div>
        )}
      {/* Secondary & Optional: AI Creative Brief Expansion (Separated Panel) */}
      {isAiToolsOpen && <div id="dekel-ai-tools" className="bg-[#103F46]/80 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all">
        {/* Accordion header */}
        <div
          onClick={() => setIsAiSectionOpen(!isAiSectionOpen)}
          className="p-4 bg-zinc-900/50 hover:bg-zinc-900/80 flex items-center justify-between cursor-pointer border-b border-zinc-800/60"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="Sparkles" className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold text-zinc-200">הרחבת קונספט יצירתי ב-AI (אופציונלי)</h3>
              <p className="text-[10px] text-zinc-500">פירוק בריף בעברית למונחי עיצוב בינלאומיים והצעות גשטאלט</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAiQuotaExhausted && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                מכסת AI מוצתה — חיפוש התמונות פעיל
              </span>
            )}
            <span className="text-xs text-zinc-400">{isAiSectionOpen ? '▲ סגור' : '▼ פתח'}</span>
          </div>
        </div>

        {isAiSectionOpen && (
          <div className="p-5 space-y-4">
            {/* Graceful AI Quota / Notice Banner */}
            {aiNoticeMessage && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-300">
                <Icon name="Info" className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <p>{aiNoticeMessage}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={briefQuery}
                onChange={(e) => setBriefQuery(e.target.value)}
                placeholder="הזן תיאור בריף בעברית (למשל: מודעה יוקרתית להרינג לקידושים עם קונספט גשטאלט)..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleExpandBrief}
                disabled={isExpanding}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-amber-500/50 disabled:opacity-50 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
              >
                {isExpanding ? (
                  <>
                    <Icon name="RefreshCw" className="w-4 h-4 animate-spin text-amber-400" />
                    מרחיב עם Gemini...
                  </>
                ) : (
                  <>
                    <Icon name="Sparkles" className="w-4 h-4 text-amber-400" />
                    הרחב בריף עם Gemini AI
                  </>
                )}
              </button>
            </div>

            {/* Optional Creative Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">סגנון ויזואלי:</label>
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-[#43D6CB]"
                >
                  <option value="הכל">כל הסגנונות</option>
                  <option value="יוקרה">יוקרה ופרימיום (Haute)</option>
                  <option value="מינימליסטי">מינימליסטי נקי</option>
                  <option value="מסורתי">מסורתי / חסידי מלכותי</option>
                  <option value="גשטאלט">גשטאלט ומטאפורי</option>
                  <option value="סוריאליסטי">סוריאליסטי מעורר מחשבה</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">תעשייה / תחום:</label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-[#43D6CB]"
                >
                  <option value="הכל">כל התעשיות</option>
                  <option value="קולינריה">קולינריה ומזון יוקרה</option>
                  <option value="יודאיקה">יודאיקה וספרי קודש</option>
                  <option value="נדל״ן">אדריכלות ונדל״ן</option>
                  <option value="אירועים">אירועים ומוזיקה</option>
                  <option value="תכשיטים">תכשיטים ושעונים</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">טכניקה יצירתית:</label>
                <select
                  value={techniqueFilter}
                  onChange={(e) => setTechniqueFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-zinc-200 focus:outline-none focus:border-[#43D6CB]"
                >
                  <option value="הכל">כל הטכניקות</option>
                  <option value="מרחב שלילי">מרחב שלילי (Negative Space)</option>
                  <option value="Figure-Ground">צורה-רקע (Figure-Ground)</option>
                  <option value="הטבעות">הטבעות פויל וזהב</option>
                  <option value="Chiaroscuro">ניגודיות אור וצל (Chiaroscuro)</option>
                </select>
              </div>
            </div>

            {/* AI Expanded Intelligence Results */}
            {expandedData && (
              <div className="bg-zinc-900/60 border border-amber-500/20 rounded-xl p-4 space-y-3 mt-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon name="Lightbulb" className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="font-bold text-white text-xs">מונחי חיפוש וקונספט שהופקו:</h4>
                  </div>
                  <span className="text-[10px] text-amber-400">לחץ על מונח לחיפוש מיידי ב-Openverse</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-zinc-400 font-bold block text-[11px]">מילות חיפוש מומלצות:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {expandedData.englishKeywords?.map((kw, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSearchQuery(kw);
                            setSourceMode('international');
                            handleSmartSearch(kw, 'international');
                          }}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-[#43D6CB] rounded-md text-[11px] font-mono text-zinc-200 transition cursor-pointer flex items-center gap-1"
                          title="חפש מונח זה ב-Openverse"
                        >
                          <Icon name="Search" className="w-3 h-3 text-[#43D6CB]" />
                          <span>{kw}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-400">
                    <span className="text-zinc-300 font-bold block">הנחיות קונספט:</span>
                    {expandedData.gestaltApproach && (
                      <p>
                        <strong className="text-zinc-300">גשטאלט:</strong> {expandedData.gestaltApproach}
                      </p>
                    )}
                    {expandedData.colorPaletteAdvice && (
                      <p>
                        <strong className="text-zinc-300">פלטה:</strong> {expandedData.colorPaletteAdvice}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Openverse Connection Error Notice */}
      {searchError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <Icon name="AlertTriangle" className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <strong className="block font-bold">הודעת מערכת:</strong>
              <p className="text-[11px] text-red-300/90">{searchError}</p>
            </div>
          </div>
          <button
            onClick={() => handleSmartSearch(searchQuery)}
            className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 rounded-lg text-xs font-bold transition flex-shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Icon name="RefreshCw" className="w-3.5 h-3.5" />
            <span>נסה שוב</span>
          </button>
        </div>
      )}

      <>
      {/* Gallery Header & Layout Switcher */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {isSearching ? (
            <span className="text-zinc-300 flex items-center gap-2">
              <Icon name="RefreshCw" className="w-3.5 h-3.5 animate-spin text-[#43D6CB]" />
              טוען תמונות מהמקור עבור &ldquo;{lastQuery}&rdquo;...
            </span>
          ) : (
            <>
              נמצאו <strong className="text-white font-bold">{searchResults.length}</strong> {sourceMode === 'haredi' ? 'השראות עם תמונה ותאימות ראשונית לבריף' : 'עבודות אמיתיות'}
              <span className="text-zinc-500 mr-1.5">עבור &ldquo;{lastQuery}&rdquo;</span>
              {selectedItemIds.length > 0 && (
                <span className="text-[#43D6CB] mr-2">
                  ({selectedItemIds.length} נבחרו)
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayoutMode('grid')}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              layoutMode === 'grid'
                ? 'border-[#43D6CB] bg-[#43D6CB]/20 text-[#43D6CB]'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400'
            }`}
            title="תצוגת גריד"
          >
            <Icon name="Grid" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!isSearching && !searchError && searchResults.length === 0 && (
        <div className="text-center py-16 bg-[#103F46] border border-zinc-800 rounded-2xl p-8 space-y-3">
          <Icon name="Search" className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-white font-bold text-sm">לא נמצאו עבודות להצגה</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            {sourceMode === 'haredi' ? 'לא נמצאו עבודות במקור עבור החיפוש. נסה מילות מפתח אחרות.' : <>לא נמצאו תוצאות עבור &ldquo;{lastQuery}&rdquo;. נסה מילות מפתח ממוקדות יותר.</>}
          </p>
        </div>
      )}

      {/* Inspirations Grid - Real Genuine Openverse Images */}
      <div
        className={`grid gap-4 ${
          layoutMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {searchResults.map((item) => {
          const isSelected = selectedItemIds.includes(item.id);
          const isSavedInProject = (activeProject?.savedInspirations || []).some((i) => i.id === item.id);

          return (
            <div
              key={item.id}
              className={`group bg-[#183036] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-2xl ${
                isSelected
                  ? 'border-[#43D6CB] ring-1 ring-[#43D6CB]'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {/* Thumbnail with overlay buttons & click for preview */}
              <div
                className="relative aspect-[4/3] bg-zinc-900 overflow-hidden cursor-pointer"
                onClick={() => (item.thumbUrl || item.url) ? setPreviewItem(item) : window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')}
                title="לחץ לתצוגה מקדימה מלאה"
              >
                {(item.thumbUrl || item.url) ? <img
                  src={item.thumbUrl || item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (item.url && target.src !== item.url) {
                      target.src = item.url;
                    }
                  }}
                /> : <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center p-4 bg-[#102B31] text-white"><Icon name="ExternalLink" className="w-7 h-7 text-[#43D6CB]"/><span className="text-xs font-bold">{item.title}</span><span className="text-[10px] text-zinc-300">העיצוב זמין באתר המקור</span></div>}

                {/* Preview hover overlay hint */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                    <Icon name="Eye" className="w-3.5 h-3.5" />
                    <span>תצוגה מקדימה</span>
                  </div>
                </div>

                {/* Badges */}
                <div
                  className="absolute top-2 right-2 flex items-center gap-1.5 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-bold bg-black/75 backdrop-blur-sm text-zinc-300 px-2 py-0.5 rounded-md border border-white/10 uppercase">
                    {item.source}
                  </span>
                  {sourceMode === 'haredi' && (
                    <span className="text-[10px] font-bold bg-[#183036]/95 text-[#F7F8F3] px-2 py-0.5 rounded-md border border-[#43D6CB]/30">
                      {!item.url ? 'קישור לעבודה' : ((item as any).visuallyReviewed || reviewedSourceUrls.includes(item.sourceUrl)) ? 'נותחה ב־AI' : 'טרם נותחה ב־AI'}
                    </span>
                  )}
                </div>

                {/* Checkbox button */}
                <button
                  disabled={!item.url}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center transition border z-10 cursor-pointer ${
                    isSelected
                      ? 'bg-[#43D6CB] border-[#43D6CB] text-white'
                      : 'bg-black/60 border-white/20 text-transparent hover:border-white'
                  }`}
                  title="בחר רפרנס"
                >
                  <Icon name="Check" className="w-3.5 h-3.5" />
                </button>

                {/* Source attribution bar */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 flex items-center justify-between text-[10px] text-zinc-300 z-10">
                  <span className="truncate max-w-[120px] font-medium">{item.source}</span>
                  {item.author && <span className="text-zinc-400 truncate max-w-[110px]">© {item.author}</span>}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4
                    onClick={() => (item.thumbUrl || item.url) ? setPreviewItem(item) : window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')}
                    className="font-bold text-white text-xs line-clamp-2 leading-snug cursor-pointer hover:text-[#43D6CB] transition"
                    title={item.title}
                  >
                    {item.title}
                  </h4>

                  {/* Working link to original source */}
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#43D6CB] hover:text-teal-300 font-bold inline-flex items-center gap-1 hover:underline transition"
                      onClick={(e) => e.stopPropagation()}
                      title={`פתח את דף המקור המקורי ב-${item.source}`}
                    >
                      <span>מקור מקורי ↗</span>
                      <Icon name="ExternalLink" className="w-3 h-3" />
                    </a>

                    {item.author && (
                      <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                        {item.author}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
                  <button
                    disabled={!item.url}
                    title={!item.url ? 'זהו קישור לעמוד; שמירת תמונת רפרנס תהיה זמינה כשהמקור יספק תמונה' : undefined}
                    onClick={() => saveToProject(item)}
                    className={`py-1.5 px-2 rounded-lg font-bold transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer ${
                      isSavedInProject
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-[#43D6CB]/15 hover:bg-[#43D6CB]/25 text-[#43D6CB] border border-[#43D6CB]/30'
                    }`}
                  >
                    <Icon name={isSavedInProject ? 'Check' : 'Plus'} className="w-3 h-3" />
                    <span>{isSavedInProject ? 'שמור' : 'שמור לפרויקט'}</span>
                  </button>

                  <button
                    disabled={!item.url}
                    title={!item.url ? 'ניתוח תמונה זמין רק כאשר קובץ התמונה נגיש' : undefined}
                    onClick={() => sendToAnalyzer(item)}
                    className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg font-bold transition flex items-center justify-center gap-1 border border-zinc-700 cursor-pointer"
                  >
                    <Icon name="ScanEye" className="w-3 h-3 text-amber-400" />
                    <span>נתח קריאייטיב</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      </>
      {/* Full Image Preview Modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-[#103F46] border border-zinc-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#183036]">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="Compass" className="w-4 h-4 text-[#43D6CB] flex-shrink-0" />
                <h3 className="font-bold text-white text-sm truncate">
                  {previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition flex-shrink-0 mr-2 cursor-pointer"
                title="סגור תצוגה מקדימה"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Image View */}
            <div className="flex-1 bg-black/60 p-4 flex items-center justify-center overflow-auto max-h-[60vh]">
              <img
                src={previewItem.url || previewItem.thumbUrl}
                alt={previewItem.title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Modal Details & Actions */}
            <div className="p-4 border-t border-zinc-800 bg-[#141518] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">מקור: </span>
                    <span className="font-bold text-white capitalize">{previewItem.source}</span>
                    {previewItem.author && (
                      <span className="mr-3">
                        <span className="text-zinc-500">יוצר: </span>
                        <span className="text-zinc-200">{previewItem.author}</span>
                      </span>
                    )}
                  </div>
                  {previewItem.style && (
                    <span className="text-[11px] text-zinc-400 block">{previewItem.style}</span>
                  )}
                </div>

                <a
                  href={previewItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-[#43D6CB] hover:text-teal-300 border border-zinc-700 rounded-xl font-bold flex items-center justify-center gap-1.5 transition text-xs flex-shrink-0"
                >
                  <span>מעבר למקור המקורי</span>
                  <Icon name="ExternalLink" className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                <button
                  onClick={() => saveToProject(previewItem)}
                  className="px-4 py-2 bg-[#43D6CB] hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer"
                >
                  <Icon name="Plus" className="w-3.5 h-3.5" />
                  <span>שמור לפרויקט</span>
                </button>
                <button
                  onClick={() => {
                    sendToAnalyzer(previewItem);
                    setPreviewItem(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-zinc-700 cursor-pointer"
                >
                  <Icon name="ScanEye" className="w-3.5 h-3.5 text-amber-400" />
                  <span>נתח קריאייטיב</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
