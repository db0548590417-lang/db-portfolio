import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { ColorPalette } from '../../types';
import { loadDesignImage } from '../../data/designAssetsDb';

// Helper color functions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Generate harmonies from single base color
function generateHarmonies(baseHex: string) {
  const rgb = hexToRgb(baseHex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const compH = (hsl.h + 180) % 360;
  const compRgb = hslToRgb(compH, hsl.s, hsl.l);

  // Complementary (5 colors)
  const complementary = [
    baseHex,
    rgbToHex(...Object.values(hslToRgb(hsl.h, Math.max(10, hsl.s - 25), Math.min(90, hsl.l + 20))) as [number, number, number]),
    rgbToHex(...Object.values(compRgb) as [number, number, number]),
    rgbToHex(...Object.values(hslToRgb(compH, Math.max(10, hsl.s - 20), Math.min(90, hsl.l + 25))) as [number, number, number]),
    rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.max(10, hsl.l - 30))) as [number, number, number]),
  ];

  // Analogous
  const analogous = [-40, -20, 0, 20, 40].map((offset) => {
    const nh = (hsl.h + offset + 360) % 360;
    const nRgb = hslToRgb(nh, hsl.s, hsl.l);
    return rgbToHex(nRgb.r, nRgb.g, nRgb.b);
  });

  // Triadic
  const triadic = [
    baseHex,
    rgbToHex(...Object.values(hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l)) as [number, number, number]),
    rgbToHex(...Object.values(hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)) as [number, number, number]),
    rgbToHex(...Object.values(hslToRgb((hsl.h + 120) % 360, hsl.s, Math.min(90, hsl.l + 20))) as [number, number, number]),
    rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, Math.max(10, hsl.l - 20))) as [number, number, number]),
  ];

  // Monochromatic
  const monochromatic = [15, 30, 50, 70, 85].map((lightness) => {
    const nRgb = hslToRgb(hsl.h, hsl.s, lightness);
    return rgbToHex(nRgb.r, nRgb.g, nRgb.b);
  });

  return { complementary, analogous, triadic, monochromatic };
}

const LUXURY_PRESETS: { name: string; colors: string[] }[] = [
  {
    name: 'זהב מלכותי וצפחה כהה (Royal Gold & Slate)',
    colors: ['#0A0B0D', '#103F46', '#8C7449', '#D4AF37', '#F9EBB2'],
  },
  {
    name: 'ברונזה מוזהבת וקטיפה עמוקה (Antique Bronze)',
    colors: ['#120B0A', '#2E1C18', '#6E473B', '#CD7F32', '#EAC5A8'],
  },
  {
    name: 'כסף פלטינום ואוניקס שחור (Platinum & Onyx)',
    colors: ['#050505', '#1F2023', '#5E636E', '#C0C0C0', '#F2F4F7'],
  },
  {
    name: 'ארגמן קיסרי וזהב חסידי (Imperial Burgundy & Gold)',
    colors: ['#1A070D', '#4A0E17', '#7A1826', '#D4AF37', '#FFF3D1'],
  },
  {
    name: 'ירוק אמרלד יוקרתי (Emerald Atelier)',
    colors: ['#05140E', '#0B291D', '#164E3A', '#C5A059', '#E8F5E9'],
  },
];

// Offline emotion-to-palette engine. These are design associations, not claims of semantic AI.
// New phrases blend matched emotional dimensions; unknown phrases use a reproducible fallback.
type MoodVector = { hue: number; saturation: number; lightness: number; contrast: number; warmth: number };
type MoodRule = { words: string[]; label: string; vector: MoodVector };
const MOOD_RULES: MoodRule[] = [
  { words: ['שמחה','שמח','חגיג','עליז','אושר','צהלה','joy','happy'], label:'שמחה', vector:{hue:39,saturation:85,lightness:62,contrast:64,warmth:90}},
  { words: ['פחד','חרדה','אימה','מאיים','בהלה','פוביה','fear','scary'], label:'פחד', vector:{hue:263,saturation:36,lightness:23,contrast:92,warmth:10}},
  { words: ['כעס','זעם','עצבים','רתיחה','rage','anger'], label:'כעס', vector:{hue:3,saturation:83,lightness:35,contrast:88,warmth:97}},
  { words: ['תקווה','אופטימ','אמונה','התחלה חדשה','hope'], label:'תקווה', vector:{hue:148,saturation:63,lightness:68,contrast:38,warmth:62}},
  { words: ['געגוע','כמיהה','נוסטלג','זיכרון','עבר','longing'], label:'געגוע', vector:{hue:215,saturation:28,lightness:57,contrast:24,warmth:38}},
  { words: ['רוגע','רגוע','מרגיע','שלווה','שקט','רכות','נינוח','calm','peace'], label:'רוגע', vector:{hue:181,saturation:34,lightness:71,contrast:21,warmth:35}},
  { words: ['יוקר','פרימיום','אציל','אלגנט','luxury'], label:'יוקרה', vector:{hue:39,saturation:38,lightness:31,contrast:66,warmth:64}},
  { words: ['חסיד','מלכות','מסורת','קודש','תורנ','רוחני'], label:'מסורת ומלכות', vector:{hue:145,saturation:42,lightness:32,contrast:64,warmth:62}},
  { words: ['חדשנ','מודרנ','טכנולוג','עתיד','דיגיטל','חדשני'], label:'חדשנות', vector:{hue:188,saturation:67,lightness:53,contrast:65,warmth:25}},
  { words: ['דרמ','מסתור','סוד','מסתורי','מתח','אפלה','suspense','mystery'], label:'מסתורין ודרמה', vector:{hue:278,saturation:45,lightness:24,contrast:90,warmth:18}},
  { words: ['חמימ','חום','משפחת','ביתי','נעים','אהבה','love'], label:'חמימות', vector:{hue:24,saturation:53,lightness:59,contrast:33,warmth:95}},
  { words: ['עצב','עצוב','אבל','בדידות','צער','melancholy','sad'], label:'עצב', vector:{hue:215,saturation:29,lightness:35,contrast:28,warmth:15}},
  { words: ['ביטחון','בטוח','יציב','אמינות','trust','security'], label:'ביטחון', vector:{hue:208,saturation:47,lightness:42,contrast:42,warmth:25}},
  { words: ['אנרג','תוסס','מרץ','קצב','מהיר','התלהבות','energy'], label:'אנרגיה', vector:{hue:18,saturation:90,lightness:55,contrast:89,warmth:85}},
  { words: ['טבע','אדמה','יער','צמיח','סביבה','organic'], label:'טבע', vector:{hue:114,saturation:41,lightness:47,contrast:31,warmth:58}},
  { words: ['ילד','ילדות','משחק','שובב','צעיר','playful'], label:'משחקיות', vector:{hue:332,saturation:78,lightness:72,contrast:63,warmth:73}},
  { words: ['נקי','טהור','רעננ','קליל','פשטות','clean'], label:'ניקיון', vector:{hue:180,saturation:28,lightness:85,contrast:22,warmth:39}},
  { words: ['עוצמה','כוח','חזק','גיבור','נחוש','power'], label:'עוצמה', vector:{hue:355,saturation:61,lightness:30,contrast:84,warmth:74}},
  { words: ['רומנט','עדינ','רוך','חיבה','romantic'], label:'רכות', vector:{hue:336,saturation:38,lightness:76,contrast:19,warmth:72}},
  { words: ['יצירת','דמיון','קסם','פנטז','wonder'], label:'דמיון', vector:{hue:282,saturation:67,lightness:57,contrast:64,warmth:48}},
];
const clampColor = (v: number, lo=0, hi=100) => Math.min(hi,Math.max(lo,v));
const stableHash = (text: string) => [...text].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
function blendMoodVectors(items: MoodVector[]): MoodVector {
  // Circular average prevents hue wrap-around (e.g. 355° + 5° should be red).
  const radians=items.map(v=>v.hue*Math.PI/180);
  const x=radians.reduce((sum,rad)=>sum+Math.cos(rad),0);
  const y=radians.reduce((sum,rad)=>sum+Math.sin(rad),0);
  const mean=(field: keyof Omit<MoodVector,'hue'>) => items.reduce((sum,v)=>sum+v[field],0)/items.length;
  return {hue:(Math.atan2(y,x)*180/Math.PI+360)%360,saturation:mean('saturation'),lightness:mean('lightness'),contrast:mean('contrast'),warmth:mean('warmth')};
}
function makeDynamicPalettes(query: string,intensity: number,warmth: number,drama: number): { palettes: {name:string;colors:string[]}[]; note:string } {
  const matches=MOOD_RULES.filter(rule=>rule.words.some(word=>query.includes(word)));
  const fallback=matches.length===0;
  const hash=stableHash(query);
  // A fallback always returns distinct colors, but does not pretend to understand unknown wording.
  const vector=matches.length ? blendMoodVectors(matches.map(m=>m.vector)) : {
    hue:hash%360,saturation:45,lightness:52,contrast:45,warmth:50
  };
  const muted=/עדין|סולידי|מאופק|לא צבעוני|לא צעקני|מעודן|רגוע/.test(query);
  const bright=/בהיר|זוהר|קורן|קליל/.test(query);
  const dark=/כהה|אפל|עמוק/.test(query);
  const vivid=/ססגוני|צבעוני|מתפרץ|עז/.test(query) && !/לא צבעוני/.test(query);
  const h=(vector.hue +(warmth-50)*0.32+360)%360;
  const saturation=clampColor(vector.saturation+(intensity-50)*0.3+(vivid?20:0)-(muted?20:0),9,96);
  const lightness=clampColor(vector.lightness+(bright?13:0)-(dark?15:0),12,91);
  const contrast=clampColor(vector.contrast+(drama-50)*0.68,12,98);
  const hex=(hue:number,s:number,l:number) => {const rgb=hslToRgb((hue+720)%360,clampColor(s),clampColor(l));return rgbToHex(rgb.r,rgb.g,rgb.b);};
  const shift=18+contrast*.38;
  const sets=[
    {name:'הרמוניה ראשית',colors:[hex(h,saturation*.65,clampColor(lightness-contrast*.32,9,80)),hex(h,saturation,lightness),hex(h+shift,saturation*.70,clampColor(lightness+20,10,91)),hex(h+180,saturation*.55,clampColor(lightness+4,12,83)),hex(h,saturation*.28,clampColor(lightness+35,12,96))]},
    {name:'דרמה וניגוד',colors:[hex(h+10,saturation*.52,clampColor(lightness-contrast*.47,7,72)),hex(h,saturation*.87,clampColor(lightness-14,10,76)),hex(h+180,saturation*.75,clampColor(lightness+6,16,82)),hex(h+32,saturation*.74,clampColor(lightness+23,18,89)),hex(h,saturation*.22,clampColor(lightness+40,15,97))]},
    {name:'גרסה מעודנת',colors:[hex(h,saturation*.38,clampColor(lightness-23,12,75)),hex(h-26,saturation*.53,clampColor(lightness+2,12,86)),hex(h+23,saturation*.44,clampColor(lightness+18,16,90)),hex(h+180,saturation*.28,clampColor(lightness+28,18,94)),hex(h,saturation*.17,clampColor(lightness+37,20,97))]},
  ];
  return {palettes:sets.map(set=>({...set,name:`${query} · ${set.name}`})),note:fallback
    ? 'הביטוי אינו מזוהה במילון הרגשות. נוצרה פלטה דינמית ייחודית לפי המילים שהקלדת, אך ללא הבנה של משמעותן. אפשר לדייק בעזרת הסליידרים.'
    : `זוהו מאפיינים: ${matches.map(m=>m.label).join(' + ')}. הצבעים חושבו מקומית לפי מאפייני הרגש והסליידרים.`};
}
const normalizeHex = (s: string): string | null => /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null;
function colorDistances(a: string, b: string): number {
  const x = hexToRgb(a), y = hexToRgb(b);
  return Math.sqrt((x.r-y.r)**2+(x.g-y.g)**2+(x.b-y.b)**2);
}
function uniqueColors(input: string[], limit=5): string[] {
  const out: string[]=[];
  for(const candidate of input) {
    const h=normalizeHex(candidate);
    if(h && out.every(prev => colorDistances(prev,h)>26)) out.push(h);
    if(out.length>=limit) break;
  }
  return out;
}
function imagePalette(image: HTMLImageElement): string[] {
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx) return [];
  ctx.drawImage(image,0,0,96,96);
  const pixels=ctx.getImageData(0,0,96,96).data;
  const counts=new Map<string,number>();
  for(let i=0;i<pixels.length;i+=16){
    if(pixels[i+3]<160) continue;
    const r=Math.min(255,Math.round(pixels[i]/24)*24);
    const g=Math.min(255,Math.round(pixels[i+1]/24)*24);
    const b=Math.min(255,Math.round(pixels[i+2]/24)*24);
    const c=rgbToHex(r,g,b);counts.set(c,(counts.get(c)||0)+1);
  }
  return uniqueColors([...counts.entries()].sort((a,b)=>b[1]-a[1]).map(([c])=>c),7);
}
function loadColorsFromUrl(url: string): Promise<string[]> {
  return new Promise((resolve,reject)=>{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{try{resolve(imagePalette(img));}catch{reject(new Error('cross-origin'));}};
    img.onerror=()=>reject(new Error('image-unavailable'));
    img.src=url;
  });
}
// If the browser is blocked by CORS, request image bytes from a strictly allowlisted source.
// All pixel sampling remains local in the browser, and no Gemini request is made.
async function loadReferenceColors(url: string): Promise<string[]> {
  try { return await loadColorsFromUrl(url); }
  catch (directError) {
    if (!/^https:\/\//i.test(url)) throw directError;
    const response = await fetch('/api/color-lab/reference-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(String(data.error || 'השרת לא הצליח לגשת לתמונה'));
    if (!data.imageBase64 || !['image/png','image/jpeg','image/webp'].includes(data.mimeType))
      throw new Error('לא התקבלו פיקסלים תקינים');
    return loadColorsFromUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
  }
}

export const ColorLaboratory: React.FC = () => {
  const { activeProject, updateActiveProject, showToast } = useProject();

  const [moodText, setMoodText] = useState('');
  const [moodIntensity, setMoodIntensity] = useState(55);
  const [moodWarmth, setMoodWarmth] = useState(50);
  const [moodDrama, setMoodDrama] = useState(50);
  const [moodNote, setMoodNote] = useState('');
  const [moodPalettes, setMoodPalettes] = useState<{ name: string; colors: string[] }[]>([]);
  const [referencePalettes, setReferencePalettes] = useState<{ name: string; colors: string[]; source: string }[]>([]);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState('');
  const [paletteMode, setPaletteMode] = useState<'original'|'adapted'>('original');
  const inspirations = activeProject?.savedInspirations || [];

  // Current Base Color
  const [baseColor, setBaseColor] = useState('#D4AF37');
  const [rgb, setRgb] = useState(hexToRgb('#D4AF37'));
  const [hsl, setHsl] = useState(rgbToHsl(rgb.r, rgb.g, rgb.b));

  // Active Gradient Builder
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientStops, setGradientStops] = useState<{ color: string; offset: number }[]>([
    { color: '#103F46', offset: 0 },
    { color: '#8C7449', offset: 50 },
    { color: '#D4AF37', offset: 100 },
  ]);

  // Image color extraction
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  // Sync color changes
  const handleHexChange = (newHex: string) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(newHex)) {
      setBaseColor(newHex.toUpperCase());
      const newRgb = hexToRgb(newHex);
      setRgb(newRgb);
      setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b));
    } else {
      setBaseColor(newHex);
    }
  };

  const handleRgbChange = (part: 'r' | 'g' | 'b', val: number) => {
    const nextRgb = { ...rgb, [part]: val };
    setRgb(nextRgb);
    const hex = rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b);
    setBaseColor(hex);
    setHsl(rgbToHsl(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  const handleHslChange = (part: 'h' | 's' | 'l', val: number) => {
    const nextHsl = { ...hsl, [part]: val };
    setHsl(nextHsl);
    const nextRgb = hslToRgb(nextHsl.h, nextHsl.s, nextHsl.l);
    setRgb(nextRgb);
    setBaseColor(rgbToHex(nextRgb.r, nextRgb.g, nextRgb.b));
  };

  const harmonies = generateHarmonies(
    baseColor.length === 7 ? baseColor : '#D4AF37'
  );

  // Gradient CSS string
  const cssGradient =
    gradientType === 'linear'
      ? `linear-gradient(${gradientAngle}deg, ${gradientStops
          .map((s) => `${s.color} ${s.offset}%`)
          .join(', ')})`
      : `radial-gradient(circle at center, ${gradientStops
          .map((s) => `${s.color} ${s.offset}%`)
          .join(', ')})`;

  // Copy to clipboard
  const copyToClipboard = (text: string, label = 'הועתק ללוח') => {
    navigator.clipboard.writeText(text);
    showToast(label, 'success');
  };

  // Save palette to active project
  const savePaletteToProject = (name: string, colors: string[]) => {
    const newPal: ColorPalette = {
      id: 'pal-' + Date.now(),
      name,
      colors,
      type: 'custom',
      createdAt: Date.now(),
    };
    updateActiveProject((p) => ({
      ...p,
      colorPalettes: [newPal, ...p.colorPalettes],
    }));
    showToast(`הפלטה "${name}" נשמרה בהצלחה בפרויקט!`, 'success');
  };

  const buildMoodPalettes = () => {
    const query=moodText.trim().toLowerCase();
    if(!query){showToast('כתוב אווירה, למשל: פחד ותקווה','info');return;}
    const result=makeDynamicPalettes(query,moodIntensity,moodWarmth,moodDrama);
    setMoodPalettes(result.palettes);
    setMoodNote(result.note);
  };

  const extractProjectReferences = async () => {
    if(!inspirations.length){showToast('אין רפרנסים שמורים בפרויקט הנוכחי','info');return;}
    setReferenceBusy(true);setReferenceMessage('');
    const results: {name:string;colors:string[];source:string}[]=[];
    let failed=0;
    let missingLocal=0;
    // Personal references use the ORIGINAL pixels in this browser's IndexedDB.
    // CreativeAnalyzer registers them as `own-${asset.id}` with empty URL fields.
    // Never send these images to the server or Gemini for color extraction.
    for(const item of inspirations.slice(0,12)) {
      try {
        const isOwnDesign = item.id.startsWith('own-');
        let colors: string[] = [];
        if (isOwnDesign) {
          const assetId = item.id.slice('own-'.length);
          const inCurrentProject = (activeProject.designAssets || []).some(asset => asset.id === assetId);
          if (!inCurrentProject) { missingLocal++; failed++; continue; }
          const dataUrl = await loadDesignImage(assetId);
          if (!dataUrl) { missingLocal++; failed++; continue; }
          colors = await loadColorsFromUrl(dataUrl); // data: URL, no CORS and no network.
        } else {
          const src = item.url || item.thumbUrl;
          if (!src) { failed++; continue; }
          colors = await loadReferenceColors(src);
        }
        if (colors.length) results.push({
          name: item.title || 'רפרנס',
          colors,
          source: isOwnDesign ? '' : (item.sourceUrl || item.url || item.thumbUrl),
        });
        else failed++;
      } catch { failed++; }
    }
    setReferencePalettes(results);
    setReferenceMessage(results.length
      ? `חולצו צבעים מ־${results.length} רפרנסים.${failed ? ` ${failed} רפרנסים לא נקראו.${missingLocal ? ` מתוכם ${missingLocal} עיצובים אישיים שחסר להם קובץ מקורי בדפדפן הזה.` : ''}` : ''}`
      : missingLocal ? 'לא נמצא קובץ המקור של העיצוב האישי באחסון הדפדפן הנוכחי. בדוק שהעיצוב מופיע ב״העיצובים שלי״ במודול 4.' : 'לא ניתן לקרוא את תמונות הרפרנס החיצוניות גם דרך השרת. אפשר לדגום תמונה שהורדת למחשב.');
    setReferenceBusy(false);
  };

  const referenceColorSets = referencePalettes.map(p=>{
    if(paletteMode==='original') return p;
    const rgb=hexToRgb(p.colors[0]);const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    const adjusted=[p.colors[0],...[-22,22,180,0].map((offset,i)=>{
      const c=hslToRgb((hsl.h+offset+360)%360,Math.min(70,Math.max(22,hsl.s-(i*8))),[34,68,56,88][i]);
      return rgbToHex(c.r,c.g,c.b);
    })];
    return {...p,name:p.name+' · עיבוד הרמוני',colors:adjusted};
  });

  // Export Palette as SVG
  const exportPaletteSvg = (name: string, colors: string[]) => {
    const width = 800;
    const height = 240;
    const rectWidth = width / colors.length;

    const rects = colors
      .map(
        (c, idx) => `
      <g transform="translate(${idx * rectWidth}, 0)">
        <rect width="${rectWidth}" height="${height}" fill="${c}" />
        <rect y="${height - 40}" width="${rectWidth}" height="40" fill="rgba(0,0,0,0.6)" />
        <text x="${rectWidth / 2}" y="${height - 15}" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">${c}</text>
      </g>
    `
      )
      .join('');

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <title>${name}</title>
      ${rects}
    </svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palette-${name.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('קובץ SVG של הפלטה הורד למחשב', 'success');
  };

  // Extract colors from image
  const handleImageExtract = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 150;
        canvas.height = 150;
        ctx.drawImage(img, 0, 0, 150, 150);

        const imgData = ctx.getImageData(0, 0, 150, 150).data;
        const colorCounts: Record<string, number> = {};

        // Sample pixels with step
        for (let i = 0; i < imgData.length; i += 40) {
          const r = Math.round(imgData[i] / 24) * 24;
          const g = Math.round(imgData[i + 1] / 24) * 24;
          const b = Math.round(imgData[i + 2] / 24) * 24;
          const hex = rgbToHex(r, g, b);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }

        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([hex]) => hex)
          .slice(0, 6);

        setExtractedColors(sorted);
        if (sorted[0]) handleHexChange(sorted[0]);
        showToast(`נדגמו ${sorted.length} צבעים דומיננטיים מהתמונה`, 'success');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-8 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Palette" className="w-4 h-4" />
            <span>מודול #5 — מעבדת צבע אינטראקטיבית</span>
          </div>
          <h1 className="text-2xl font-black text-white">מעבדת צבע, הרמוניות וגרדיאנטים</h1>
          <p className="text-xs text-zinc-400">
            דיוק גוונים מקומי, חישובי HSL מתמטיים, דגימת צבעים מתמונה ופלטות יוקרה מוכנות.
          </p>
        </div>

        <button
          onClick={() => savePaletteToProject('פלטה נוכחית', harmonies.complementary)}
          className="px-4 py-2 bg-[#43D6CB] hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
        >
          <Icon name="Plus" className="w-3.5 h-3.5" />
          שמור פלטה פעילה לפרויקט
        </button>
      </div>

      {/* Project inspiration and free-text mood palettes — fully local, no Gemini */}
      <section className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5" dir="rtl">
        <div>
          <h2 className="font-bold text-white text-base">פלטות לפי אווירה והשראות הפרויקט</h2>
          <p className="text-xs text-zinc-400 mt-1">כללי צבע מקומיים ודגימת פיקסלים בלבד — ללא Gemini. </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#43D6CB]" value={moodText} onChange={e=>setMoodText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')buildMoodPalettes();}} placeholder="איזו אווירה תרצה? למשל: שמחה חסידית יוקרתית, לא צבעונית מדי" aria-label="תיאור אווירה חופשי" />
          <button onClick={buildMoodPalettes} className="bg-[#43D6CB] text-[#103F46] font-bold px-5 py-2.5 rounded-xl text-xs hover:brightness-110">צור פלטות לפי אווירה</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            {title:'עוצמת הרגש',value:moodIntensity,set:setMoodIntensity},
            {title:'חמימות הצבע',value:moodWarmth,set:setMoodWarmth},
            {title:'דרמטיות וניגודיות',value:moodDrama,set:setMoodDrama},
          ] as const).map(control=><label key={control.title} className="bg-zinc-900/70 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200">
            <span className="flex justify-between mb-2"><span>{control.title}</span><span className="font-mono text-[#43D6CB]">{control.value}%</span></span>
            <input type="range" min="0" max="100" value={control.value} onChange={e=>control.set(Number(e.target.value))} className="w-full accent-[#43D6CB]"/>
          </label>)}
        </div>
        <p className="text-[11px] text-zinc-500">לאחר שינוי הסליידרים, לחץ שוב על ״צור פלטות לפי אווירה״ כדי לעדכן את ההצעות.</p>
        {moodNote&&<p className="rounded-lg bg-[#183036] px-3 py-2 text-xs text-zinc-200" role="status">{moodNote}</p>}
        {!!moodPalettes.length && <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {moodPalettes.map((pal,i)=><div key={i} className="bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2"><strong className="text-xs text-white">{pal.name}</strong><button onClick={()=>savePaletteToProject(pal.name,pal.colors)} className="text-xs text-[#43D6CB]">שמור בפרויקט</button></div>
            <div className="flex gap-1">{pal.colors.map((c,j)=><button key={j} onClick={()=>{handleHexChange(c);copyToClipboard(c,`HEX ${c} הועתק`);}} title={`העתק ${c}`} className="flex-1 h-14 rounded-md border border-white/10" style={{backgroundColor:c}} />)}</div>
            <div className="flex flex-wrap gap-1">{pal.colors.map((c,j)=><button key={j} className="font-mono text-[10px] bg-[#183036] text-white rounded px-1.5 py-1 hover:text-[#43D6CB]" onClick={()=>copyToClipboard(c,`HEX ${c} הועתק`)}>{c}</button>)}</div>
          </div>)}
        </div>}
        <div className="border-t border-zinc-700 pt-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <p className="text-xs text-zinc-200 font-bold">רפרנסים בפרויקט: {inspirations.length}</p>
            <button disabled={referenceBusy || !inspirations.length} onClick={extractProjectReferences} className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-900 text-[#43D6CB] border border-[#43D6CB]/40 disabled:opacity-40">{referenceBusy?'מחלץ צבעים...':'חלץ צבעים מהרפרנסים'}</button>
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={()=>setPaletteMode('original')} className={`rounded-lg px-3 py-2 border ${paletteMode==='original'?'bg-[#43D6CB]/15 border-[#43D6CB] text-white':'border-zinc-700 text-zinc-400'}`}>צבעים מקוריים</button>
            <button onClick={()=>setPaletteMode('adapted')} className={`rounded-lg px-3 py-2 border ${paletteMode==='adapted'?'bg-[#43D6CB]/15 border-[#43D6CB] text-white':'border-zinc-700 text-zinc-400'}`}>פלטה הרמונית מעובדת</button>
          </div>
          {referenceMessage&&<p className="text-xs text-amber-200">{referenceMessage}</p>}
          {!!referenceColorSets.length&&<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{referenceColorSets.map((p,i)=><div key={i} className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 space-y-2">
            <div className="flex justify-between items-center gap-2"><span className="text-xs text-[#43D6CB] truncate">{p.source ? <a href={p.source} target="_blank" rel="noreferrer">{p.name} ↗</a> : `${p.name} · עיצוב שלי`}</span><button onClick={()=>savePaletteToProject(p.name,p.colors)} className="text-xs text-white">שמור</button></div>
            <div className="flex gap-1">{p.colors.map((hex,j)=><button key={j} style={{backgroundColor:hex}} className="flex-1 h-12 rounded-md border border-white/10" onClick={()=>{handleHexChange(hex);copyToClipboard(hex,`HEX ${hex} הועתק`);}} title={`העתק ${hex}`}/>)}</div>
            <div className="flex gap-1 flex-wrap">{p.colors.map((hex,j)=><button key={j} className="text-[10px] text-white font-mono bg-[#183036] px-1.5 py-1 rounded" onClick={()=>copyToClipboard(hex,`HEX ${hex} הועתק`)}>{hex}</button>)}</div>
          </div>)}</div>}
        </div>
      </section>

      {/* Main Color Picker & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Color Preview & Hex / RGB / HSL Controls */}
        <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">בחירת צבע בסיס</h3>
            <button
              onClick={() => copyToClipboard(baseColor, `HEX ${baseColor} הועתק`)}
              className="text-[11px] text-[#43D6CB] hover:underline font-mono"
            >
              העתק HEX
            </button>
          </div>

          {/* Color Box with native picker overlay */}
          <div
            className="h-28 rounded-xl shadow-inner relative flex items-center justify-center border border-white/10 group cursor-pointer overflow-hidden"
            style={{ backgroundColor: baseColor }}
          >
            <input
              type="color"
              value={baseColor.length === 7 ? baseColor : '#D4AF37'}
              onChange={(e) => handleHexChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 text-white font-mono text-xs font-bold group-hover:scale-105 transition pointer-events-none">
              {baseColor} (לחץ לבחירה)
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">HEX Code:</label>
              <input
                type="text"
                value={baseColor}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-[#43D6CB] focus:outline-none"
              />
            </div>

            {/* RGB Sliders */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">ערכי RGB:</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['r', 'g', 'b'] as const).map((ch) => (
                  <div key={ch} className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span className="uppercase">{ch}</span>
                      <span className="font-mono text-zinc-300">{rgb[ch]}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgb[ch]}
                      onChange={(e) => handleRgbChange(ch, Number(e.target.value))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* HSL Sliders */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 block">ערכי HSL (גוון, רוויה, בהירות):</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Hue</span>
                    <span className="font-mono text-zinc-300">{hsl.h}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hsl.h}
                    onChange={(e) => handleHslChange('h', Number(e.target.value))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Sat</span>
                    <span className="font-mono text-zinc-300">{hsl.s}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hsl.s}
                    onChange={(e) => handleHslChange('s', Number(e.target.value))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>
                <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                    <span>Light</span>
                    <span className="font-mono text-zinc-300">{hsl.l}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={hsl.l}
                    onChange={(e) => handleHslChange('l', Number(e.target.value))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Color Extraction from Image */}
          <div className="pt-2 border-t border-zinc-800">
            <input
              type="file"
              ref={imageUploadRef}
              accept="image/*"
              onChange={handleImageExtract}
              className="hidden"
            />
            <button
              onClick={() => imageUploadRef.current?.click()}
              className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 transition flex items-center justify-center gap-2"
            >
              <Icon name="Upload" className="w-3.5 h-3.5 text-zinc-400" />
              דגום צבעים מתמונת רפרנס
            </button>

            {extractedColors.length > 0 && (
              <div className="mt-2.5">
                <span className="text-[10px] text-zinc-400 block mb-1">צבעים שחולצו:</span>
                <div className="flex gap-1.5">
                  {extractedColors.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => handleHexChange(hex)}
                      className="w-7 h-7 rounded-lg border border-white/20 transition hover:scale-110"
                      style={{ backgroundColor: hex }}
                      title={`בחר ${hex}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Interactive Harmonies */}
        <div className="lg:col-span-2 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">הרמוניות צבע מבוססות גלגל הצבעים</h3>
            <span className="text-xs text-zinc-500">חישוב מתמטי מדויק</span>
          </div>

          {/* Harmonies list */}
          <div className="space-y-4">
            {[
              { label: 'משלימים (Complementary)', key: 'complementary', colors: harmonies.complementary },
              { label: 'אנלוגיים (Analogous)', key: 'analogous', colors: harmonies.analogous },
              { label: 'טריאדי (Triadic)', key: 'triadic', colors: harmonies.triadic },
              { label: 'מונוכרומטי (Monochromatic)', key: 'monochromatic', colors: harmonies.monochromatic },
            ].map((harm) => (
              <div key={harm.key} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200">{harm.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportPaletteSvg(harm.label, harm.colors)}
                      className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition"
                      title="ייצוא קובץ SVG וקטורי של הפלטה"
                    >
                      ייצוא SVG
                    </button>
                    <button
                      onClick={() => savePaletteToProject(harm.label, harm.colors)}
                      className="text-[10px] text-[#43D6CB] hover:text-teal-300 font-bold px-2 py-0.5 rounded bg-[#43D6CB]/10 border border-[#43D6CB]/30 transition"
                    >
                      שמור לפרויקט
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 h-16">
                  {harm.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        handleHexChange(c);
                        copyToClipboard(c, `HEX ${c} נבחר והועתק`);
                      }}
                      className="group relative rounded-lg border border-white/10 flex flex-col items-center justify-end p-1 transition hover:scale-[1.03]"
                      style={{ backgroundColor: c }}
                      title={`בחר והעתק ${c}`}
                    >
                      <span className="text-[10px] font-mono font-bold bg-black/60 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition">
                        {c}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Luxury Presets Section (Gold, Bronze, Silver, Burgundy, Emerald) */}
      <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">פלטות יוקרה וספרי קודש (Luxury & Traditional Presets)</h3>
          </div>
          <span className="text-xs text-zinc-500">זהב, ברונזה, כסף, ארגמן ואמרלד פרימיום</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {LUXURY_PRESETS.map((preset) => (
            <div key={preset.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200 truncate">{preset.name}</span>
                <button
                  onClick={() => savePaletteToProject(preset.name, preset.colors)}
                  className="text-[10px] text-[#43D6CB] hover:underline"
                >
                  שמור
                </button>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {preset.colors.map((hex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleHexChange(hex);
                      copyToClipboard(hex, `HEX ${hex} הועתק`);
                    }}
                    className="relative h-14 rounded-md border border-white/10 transition hover:scale-105 overflow-hidden"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  ><span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[9px] font-mono">{hex}</span></button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Gradient Builder */}
      <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm">בונה גרדיאנטים חי (Interactive Gradient Builder)</h3>
            <p className="text-xs text-zinc-400">תמיכה בנקודות עצירה מרובות, זווית, מעגלי/ליניארי ותצוגה חיה</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(`background: ${cssGradient};`, 'קוד CSS הועתק')}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition flex items-center gap-1.5"
            >
              <Icon name="Copy" className="w-3 h-3" />
              העתק CSS Gradient
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setGradientType('linear')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                  gradientType === 'linear'
                    ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-[#43D6CB]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                ליניארי (Linear)
              </button>
              <button
                onClick={() => setGradientType('radial')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                  gradientType === 'radial'
                    ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-[#43D6CB]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                מעגלי (Radial)
              </button>
            </div>

            {gradientType === 'linear' && (
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>זווית מעלות:</span>
                  <span className="font-mono text-zinc-200">{gradientAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  className="w-full accent-[#43D6CB] h-1"
                />
              </div>
            )}

            {/* Gradient Stops */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>נקודות עצירה (Stops):</span>
                {gradientStops.length < 5 && (
                  <button
                    onClick={() =>
                      setGradientStops([
                        ...gradientStops,
                        { color: baseColor, offset: Math.min(100, gradientStops[gradientStops.length - 1].offset + 20) },
                      ])
                    }
                    className="text-[#43D6CB] hover:underline text-[11px]"
                  >
                    + הוסף נקודה
                  </button>
                )}
              </div>

              {gradientStops.map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => {
                      const updated = [...gradientStops];
                      updated[idx].color = e.target.value;
                      setGradientStops(updated);
                    }}
                    className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={stop.offset}
                    onChange={(e) => {
                      const updated = [...gradientStops];
                      updated[idx].offset = Number(e.target.value);
                      setGradientStops(updated);
                    }}
                    className="flex-1 accent-[#43D6CB] h-1"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-left">{stop.offset}%</span>
                  {gradientStops.length > 2 && (
                    <button
                      onClick={() => setGradientStops(gradientStops.filter((_, i) => i !== idx))}
                      className="text-zinc-600 hover:text-red-400 text-xs px-1"
                      title="הסר נקודה"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Gradient Preview Box */}
          <div className="lg:col-span-2 flex flex-col space-y-2">
            <div
              className="h-48 rounded-xl border border-white/10 shadow-2xl flex items-center justify-center p-6 text-center"
              style={{ background: cssGradient }}
            >
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white font-black text-sm tracking-widest shadow-lg">
                תצוגת גרדיאנט חיה
              </div>
            </div>

            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-400 break-all select-all">
              {cssGradient}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
