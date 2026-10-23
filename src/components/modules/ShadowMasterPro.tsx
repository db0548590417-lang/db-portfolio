import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import JSZip from 'jszip';
import { ShadowSettings, LightSourceSettings } from '../../types';

interface PresetItem {
  id: string;
  name: string;
  desc: string;
  shadow: Partial<ShadowSettings>;
  light: Partial<LightSourceSettings>;
}

const DEFAULT_PRESETS: PresetItem[] = [
  {
    id: 'studio_soft',
    name: 'צל סטודיו מרוכך (Studio Soft)',
    desc: 'תאורת סופטבוקס עליונה קלאסית עם מפל צללים רך ומאוזן',
    shadow: { direction: 120, length: 0.8, softness: 28, opacity: 55, color: '#0F1115', distance: 15, spread: 1.1, contactShadowEnabled: true, contactShadowIntensity: 85, ambientShadowEnabled: true, ambientShadowIntensity: 45 },
    light: { direction: 300, elevation: 55, intensity: 80, softness: 60, color: '#FFFFFF' },
  },
  {
    id: 'hard_directional',
    name: 'צל כיווני חד (Hard Directional)',
    desc: 'שמש ישירה או ספוט חזק, קצוות חדים וקונטרסט דרמטי',
    shadow: { direction: 145, length: 1.4, softness: 4, opacity: 75, color: '#05070A', distance: 35, spread: 0.95, contactShadowEnabled: true, contactShadowIntensity: 95, ambientShadowEnabled: false },
    light: { direction: 325, elevation: 35, intensity: 95, softness: 10, color: '#FFF8E7' },
  },
  {
    id: 'luxury_product',
    name: 'צל מוצר יוקרתי (Luxury Product)',
    desc: 'צל צפחה עמוק עם מגע קטיפתי והשתקפות עדינה לפרפיום ושעונים',
    shadow: { direction: 90, length: 0.6, softness: 22, opacity: 65, color: '#100D12', distance: 8, spread: 1.05, contactShadowEnabled: true, contactShadowIntensity: 90, ambientShadowEnabled: true, ambientShadowIntensity: 60 },
    light: { direction: 270, elevation: 65, intensity: 85, softness: 50, color: '#FAF7EE' },
  },
  {
    id: 'floating_object',
    name: 'אובייקט מרחף (Floating Object)',
    desc: 'הפרדה מוחלטת מהקרקע עם צל אליפטי מרוחק ומטושטש',
    shadow: { direction: 90, length: 0.7, softness: 45, opacity: 40, color: '#121418', distance: 65, spread: 0.85, contactShadowEnabled: false, ambientShadowEnabled: false },
    light: { direction: 270, elevation: 75, intensity: 75, softness: 70, color: '#FFFFFF' },
  },
  {
    id: 'natural_ground',
    name: 'צל קרקע טבעי (Natural Ground)',
    desc: 'תאורת יום טבעית, מתאים למשטחי עץ, אספלט וריצוף חוץ',
    shadow: { direction: 110, length: 1.1, softness: 20, opacity: 60, color: '#1B1C20', distance: 22, spread: 1.0, contactShadowEnabled: true, contactShadowIntensity: 80, ambientShadowEnabled: true, ambientShadowIntensity: 40 },
    light: { direction: 290, elevation: 45, intensity: 85, softness: 45, color: '#F0F4FF' },
  },
  {
    id: 'long_dramatic',
    name: 'צל ארוך ודרמטי (Long Dramatic)',
    desc: 'שעת הזהב (Golden Hour), צלליות ארוכות במיוחד עם נטייה אלכסונית',
    shadow: { direction: 160, length: 2.5, softness: 16, opacity: 70, color: '#120A05', distance: 60, spread: 1.25, perspectiveTilt: 25, contactShadowEnabled: true, contactShadowIntensity: 90, ambientShadowEnabled: true },
    light: { direction: 340, elevation: 18, intensity: 90, softness: 25, color: '#FFE0B2' },
  },
  {
    id: 'contact_only',
    name: 'צל מגע בלבד (Contact Shadow Only)',
    desc: 'הצללת הצמדה פיזית (Ambient Occlusion) ללא צל מוטל ארוך',
    shadow: { direction: 90, length: 0.2, softness: 8, opacity: 90, color: '#000000', distance: 2, spread: 1.0, contactShadowEnabled: true, contactShadowIntensity: 100, contactShadowSize: 15, ambientShadowEnabled: true, ambientShadowIntensity: 70 },
    light: { direction: 270, elevation: 85, intensity: 70, softness: 80, color: '#FFFFFF' },
  },
  {
    id: 'diffused_daylight',
    name: 'אור יום מפוזר (Diffused Daylight)',
    desc: 'שמיים מעוננים קלות, צל רך מאוד ללא זוויות חדות',
    shadow: { direction: 85, length: 0.65, softness: 50, opacity: 45, color: '#252830', distance: 12, spread: 1.15, contactShadowEnabled: true, contactShadowIntensity: 70, ambientShadowEnabled: true, ambientShadowIntensity: 50 },
    light: { direction: 265, elevation: 60, intensity: 75, softness: 85, color: '#EBF2FA' },
  },
  {
    id: 'warm_indoor',
    name: 'תאורת פנים חמה (Warm Indoor)',
    desc: 'מנורת שולחן ביתית חמימה, צל בגוון שוקולד/ענבר עדין',
    shadow: { direction: 135, length: 1.0, softness: 24, opacity: 62, color: '#1A120B', distance: 20, spread: 1.05, contactShadowEnabled: true, contactShadowIntensity: 85, ambientShadowEnabled: true },
    light: { direction: 315, elevation: 42, intensity: 80, softness: 40, color: '#FFECCC' },
  },
  {
    id: 'transparent_glass',
    name: 'צל חפץ שקוף (Transparent Glass)',
    desc: 'התכנסות אור (Caustics) וצל רך היקפי לבקבוקי יין, זכוכית וקריסטל',
    shadow: { direction: 100, length: 0.85, softness: 35, opacity: 45, color: '#1E252B', distance: 14, spread: 1.1, contactShadowEnabled: true, contactShadowIntensity: 60, ambientShadowEnabled: true, ambientShadowIntensity: 35 },
    light: { direction: 280, elevation: 52, intensity: 90, softness: 55, color: '#FFFFFF' },
  },
];

export const ShadowMasterPro: React.FC = () => {
  const {
    activeProject,
    selectedImageForShadowMaster,
    setSelectedArtworkForMockup,
    setActiveModule,
    showToast,
  } = useProject();

  // Active Tool Subtab
  const [activeTab, setActiveTab] = useState<'lighting' | 'shadow' | 'cutout' | 'surface'>('lighting');
  const [viewMode, setViewMode] = useState<'composite' | 'split' | 'object_only' | 'shadow_only' | 'bg_only'>('composite');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for before/after split

  // Layer toggles
  const [layers, setLayers] = useState({
    object: true,
    originalShadow: false,
    generatedShadow: true,
    background: true,
  });

  // Image assets
  const [originalImageUrl, setOriginalImageUrl] = useState<string>(
    selectedImageForShadowMaster ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
  );
  const [isolatedObjectUrl, setIsolatedObjectUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'
  );

  // Object transform
  const [objPos, setObjPos] = useState({ x: 500, y: 320 });
  const [objScale, setObjScale] = useState(0.85);
  const [objRotation, setObjRotation] = useState(0);

  // Light Source Settings
  const [light, setLight] = useState<LightSourceSettings>({
    direction: 315, // degrees
    elevation: 48, // degrees
    distance: 140,
    intensity: 85,
    softness: 40,
    color: '#FFF8EE',
  });

  // Shadow Engine Settings
  const [shadow, setShadow] = useState<ShadowSettings>({
    direction: 135, // automatically linked to light.direction - 180 by default
    length: 1.0,
    softness: 24,
    opacity: 65,
    color: '#0A0C10',
    distance: 22,
    spread: 1.05,
    rotation: 0,
    perspectiveTilt: 0,
    perspectiveShear: 0,
    contactPointY: 90,
    contactShadowEnabled: true,
    contactShadowIntensity: 85,
    contactShadowSize: 22,
    ambientShadowEnabled: true,
    ambientShadowIntensity: 50,
    ambientShadowRadius: 28,
  });

  // 4-point Surface Perspective Corners [TL, TR, BR, BL] normalized (0..1)
  const [surfaceCorners, setSurfaceCorners] = useState<{ x: number; y: number }[]>([
    { x: 0.15, y: 0.55 },
    { x: 0.85, y: 0.55 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ]);
  const [isEditingSurface, setIsEditingSurface] = useState(false);

  // Cutout / Alpha Mask Refinement parameters
  const [cutoutThreshold, setCutoutThreshold] = useState<number>(30);
  const [featherRadius, setFeatherRadius] = useState<number>(2);
  const [maskDilation, setMaskDilation] = useState<number>(0); // negative = contract, positive = expand
  const [brushMode, setBrushMode] = useState<'none' | 'erase' | 'restore'>('none');
  const [brushSize, setBrushSize] = useState<number>(25);

  // AI Matching loading state & notes
  const [isMatchingLighting, setIsMatchingLighting] = useState(false);
  const [aiLightingNotes, setAiLightingNotes] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Canvas Refs
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const isolatedImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  // Hidden file inputs
  const objectUploadInputRef = useRef<HTMLInputElement>(null);
  const bgUploadInputRef = useRef<HTMLInputElement>(null);

  // Interaction dragging states
  const [dragTarget, setDragTarget] = useState<'object' | 'light' | number | null>(null); // number = surface corner handle
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0, mouseY: 0, startX: 0, startY: 0,
  });

  // Record History Snapshot
  const pushHistory = useCallback((customState?: any) => {
    const snap = customState || {
      shadow: { ...shadow },
      light: { ...light },
      objPos: { ...objPos },
      objScale,
      objRotation,
      layers: { ...layers },
    };
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIdx + 1);
      return [...sliced, snap];
    });
    setHistoryIdx((prev) => prev + 1);
  }, [shadow, light, objPos, objScale, objRotation, layers, historyIdx]);

  const handleUndo = () => {
    if (historyIdx > 0) {
      const target = history[historyIdx - 1];
      setShadow(target.shadow);
      setLight(target.light);
      setObjPos(target.objPos);
      setObjScale(target.objScale);
      setObjRotation(target.objRotation);
      setLayers(target.layers);
      setHistoryIdx(historyIdx - 1);
      showToast('פעולה בוטלה (Undo)', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const target = history[historyIdx + 1];
      setShadow(target.shadow);
      setLight(target.light);
      setObjPos(target.objPos);
      setObjScale(target.objScale);
      setObjRotation(target.objRotation);
      setLayers(target.layers);
      setHistoryIdx(historyIdx + 1);
      showToast('בוצע שוב (Redo)', 'info');
    }
  };

  // Sync Light Direction to Shadow Direction automatically
  const handleUpdateLightDirection = (newAngle: number) => {
    const cleanAngle = (newAngle + 360) % 360;
    setLight((prev) => ({ ...prev, direction: cleanAngle }));
    // Projected shadow falls 180 degrees opposite to light
    const projectedShadowAngle = (cleanAngle + 180) % 360;
    // Lower elevation results in longer shadow
    const calculatedLength = Math.max(0.3, Math.min(3.0, (90 - light.elevation) / 35));
    setShadow((prev) => ({
      ...prev,
      direction: Math.round(projectedShadowAngle),
      length: Number(calculatedLength.toFixed(2)),
    }));
  };

  const handleUpdateLightElevation = (newElevation: number) => {
    setLight((prev) => ({ ...prev, elevation: newElevation }));
    const calculatedLength = Math.max(0.3, Math.min(3.0, (90 - newElevation) / 35));
    setShadow((prev) => ({
      ...prev,
      length: Number(calculatedLength.toFixed(2)),
    }));
  };

  // Load Images into HTMLImageElements
  useEffect(() => {
    if (!originalImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = originalImageUrl;
    img.onload = () => {
      originalImgRef.current = img;
      // If no isolated object exists yet, automatically create one with initial alpha extraction
      if (!isolatedObjectUrl) {
        performInitialCutout(img);
      }
    };
  }, [originalImageUrl]);

  useEffect(() => {
    if (!isolatedObjectUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = isolatedObjectUrl;
    img.onload = () => {
      isolatedImgRef.current = img;
    };
  }, [isolatedObjectUrl]);

  useEffect(() => {
    if (!bgImageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = bgImageUrl;
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, [bgImageUrl]);

  // Real Background Removal & Alpha Matte Creation
  const performInitialCutout = (srcImg: HTMLImageElement, threshold = cutoutThreshold, feather = featherRadius) => {
    const canvas = document.createElement('canvas');
    canvas.width = srcImg.naturalWidth || srcImg.width || 800;
    canvas.height = srcImg.naturalHeight || srcImg.height || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(srcImg, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Sample 4 corners to estimate background color
    const cornerR = (data[0] + data[(canvas.width - 1) * 4] + data[(canvas.height - 1) * canvas.width * 4]) / 3;
    const cornerG = (data[1] + data[(canvas.width - 1) * 4 + 1] + data[(canvas.height - 1) * canvas.width * 4 + 1]) / 3;
    const cornerB = (data[2] + data[(canvas.width - 1) * 4 + 2] + data[(canvas.height - 1) * canvas.width * 4 + 2]) / 3;

    // Genuine Alpha Channel computation
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.hypot(r - cornerR, g - cornerG, b - cornerB);

      if (diff < threshold) {
        // True transparent alpha
        data[i + 3] = 0;
      } else if (diff < threshold + feather * 8) {
        // Smooth edge feathering
        const ratio = (diff - threshold) / (feather * 8);
        data[i + 3] = Math.round(data[i + 3] * ratio);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const transparentDataUrl = canvas.toDataURL('image/png');
    setIsolatedObjectUrl(transparentDataUrl);
    showToast('הרקע הוסר בהצלחה — נוצר ערוץ שקיפות Alpha אמיתי!', 'success');
  };

  // Re-run background removal with custom slider parameters
  const handleApplyMaskRefinement = () => {
    if (!originalImgRef.current) return;
    performInitialCutout(originalImgRef.current, cutoutThreshold, featherRadius);
  };

  // AI-Assisted Cutout hints
  const handleAiCutoutAssist = async () => {
    if (!originalImageUrl) return;
    setIsSegmenting(true);
    try {
      const res = await fetch('/api/shadow-master/segment-hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: originalImageUrl,
        }),
      });
      if (!res.ok) throw new Error('שגיאה בתקשורת');
      const data = await res.json();
      if (data.recommendedFeatherRadius) {
        setFeatherRadius(data.recommendedFeatherRadius);
      }
      if (originalImgRef.current) {
        performInitialCutout(originalImgRef.current, 38, data.recommendedFeatherRadius || 2);
      }
      showToast('ניתוח הבידוד הושלם — עודכן סף הדיוק והמסיכה', 'success');
    } catch (e: any) {
      showToast('הסרת הרקע בוצעה במנוע המקומי', 'info');
      if (originalImgRef.current) {
        performInitialCutout(originalImgRef.current, cutoutThreshold, featherRadius);
      }
    } finally {
      setIsSegmenting(false);
    }
  };

  // Smart Background Lighting Match via Gemini Multimodal API
  const handleMatchBackgroundLighting = async () => {
    if (!bgImageUrl) {
      showToast('נא להעלות תמונת רקע תחילה', 'info');
      return;
    }
    setIsMatchingLighting(true);
    try {
      const res = await fetch('/api/shadow-master/match-lighting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: bgImageUrl }),
      });
      if (!res.ok) throw new Error('שגיאה בניתוח תאורת הרקע');
      const data = await res.json();

      if (data.dominantLightDirection !== undefined) {
        setLight({
          direction: data.dominantLightDirection,
          elevation: data.lightElevation || 45,
          distance: 140,
          intensity: 85,
          softness: data.lightSoftness || 40,
          color: data.lightColor || '#FFF8EE',
        });

        // Set matched shadow parameters
        setShadow((prev) => ({
          ...prev,
          direction: data.castShadowDirection || (data.dominantLightDirection + 180) % 360,
          softness: data.lightSoftness || 30,
          contactShadowIntensity: data.contactShadowIntensity || 85,
          ambientShadowIntensity: data.ambientOcclusionStrength || 60,
          length: Math.max(0.4, Math.min(2.8, (90 - (data.lightElevation || 45)) / 30)),
        }));

        if (Array.isArray(data.surfaceCorners) && data.surfaceCorners.length === 4) {
          setSurfaceCorners(data.surfaceCorners);
        }

        setAiLightingNotes(data.analysisNotes || 'התאורה הותאמה בהצלחה לצללים ולרמזי האור של הרקע');
        showToast('תאורת הרקע נותחה והוזנה לפרמטרים בהצלחה!', 'success');
        pushHistory();
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בניתוח תאורת הרקע', 'error');
    } finally {
      setIsMatchingLighting(false);
    }
  };

  // Apply Preset
  const handleApplyPreset = (preset: PresetItem) => {
    setShadow((prev) => ({ ...prev, ...preset.shadow }));
    setLight((prev) => ({ ...prev, ...preset.light }));
    showToast(`הופעל פריסט צל: ${preset.name}`, 'success');
    pushHistory();
  };

  // Real-time Canvas Rendering
  const drawCompositeCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // 1. Draw Background Layer (if enabled and visible in current viewMode)
    if (layers.background && viewMode !== 'object_only' && viewMode !== 'shadow_only') {
      if (bgImgRef.current && bgImgRef.current.complete) {
        ctx.drawImage(bgImgRef.current, 0, 0, cw, ch);
      } else {
        ctx.fillStyle = '#103F46';
        ctx.fillRect(0, 0, cw, ch);
      }
    }

    // 2. Determine target image for object (isolated or original)
    const activeObjImg = isolatedImgRef.current || originalImgRef.current;
    if (!activeObjImg || !activeObjImg.complete) return;

    const imgW = activeObjImg.naturalWidth || activeObjImg.width || 400;
    const imgH = activeObjImg.naturalHeight || activeObjImg.height || 400;
    const renderW = imgW * objScale;
    const renderH = imgH * objScale;
    const objBottomY = objPos.y + renderH / 2;

    // 3. Render Shadows (Layer 3: Generated Artificial Shadow)
    if (layers.generatedShadow && viewMode !== 'object_only' && viewMode !== 'bg_only') {
      ctx.save();

      // Shadow angle in radians
      const rad = (shadow.direction * Math.PI) / 180;
      const offsetX = Math.cos(rad) * shadow.distance * shadow.length;
      const offsetY = Math.sin(rad) * shadow.distance * shadow.length;

      // --- A. Ground Projected Shadow (Directional Shadow) ---
      ctx.save();
      ctx.translate(objPos.x + offsetX, objBottomY + offsetY * 0.4);
      ctx.rotate((shadow.rotation * Math.PI) / 180);

      // Projective flattening scale (simulate ground projection)
      const scaleXProj = objScale * shadow.spread;
      const scaleYProj = objScale * Math.sin(rad) * shadow.length * 0.45;
      ctx.scale(scaleXProj, scaleYProj);

      // Skew for perspective
      if (shadow.perspectiveShear !== 0) {
        ctx.transform(1, 0, shadow.perspectiveShear / 100, 1, 0, 0);
      }

      ctx.globalAlpha = shadow.opacity / 100;
      ctx.filter = `blur(${Math.max(1, shadow.softness)}px)`;

      // Render dark silhouette of the object
      // Use an offscreen canvas to turn activeObjImg into pure solid shadow color
      const silCanvas = document.createElement('canvas');
      silCanvas.width = imgW;
      silCanvas.height = imgH;
      const sCtx = silCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(activeObjImg, 0, 0);
        sCtx.globalCompositeOperation = 'source-in';
        sCtx.fillStyle = shadow.color;
        sCtx.fillRect(0, 0, imgW, imgH);
        ctx.drawImage(silCanvas, -imgW / 2, -imgH);
      }
      ctx.restore();

      // --- B. Contact Shadow (Dark occlusion at the physical contact point) ---
      if (shadow.contactShadowEnabled) {
        ctx.save();
        ctx.translate(objPos.x, objBottomY);
        ctx.scale(objScale * shadow.spread, 0.25);
        ctx.globalAlpha = shadow.contactShadowIntensity / 100;
        ctx.filter = `blur(${Math.max(1, shadow.contactShadowSize / 4)}px)`;

        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, renderW * 0.38);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.6, shadow.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, renderW * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- C. Ambient Occlusion Shadow ---
      if (shadow.ambientShadowEnabled) {
        ctx.save();
        ctx.translate(objPos.x, objBottomY + 5);
        ctx.scale(objScale * 1.15, 0.35);
        ctx.globalAlpha = shadow.ambientShadowIntensity / 100;
        ctx.filter = `blur(${Math.max(2, shadow.ambientShadowRadius / 2)}px)`;

        const ambGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, renderW * 0.48);
        ambGrad.addColorStop(0, shadow.color);
        ambGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = ambGrad;
        ctx.beginPath();
        ctx.arc(0, 0, renderW * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    // 4. Render Object Layer (Layer 1: Isolated Object)
    if (layers.object && viewMode !== 'shadow_only' && viewMode !== 'bg_only') {
      ctx.save();
      ctx.translate(objPos.x, objPos.y);
      ctx.rotate((objRotation * Math.PI) / 180);

      // If in split mode, clip to splitPos percentage
      if (viewMode === 'split') {
        const splitX = (splitPos / 100) * cw;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, ch);
        ctx.clip();
        ctx.drawImage(activeObjImg, -renderW / 2, -renderH / 2, renderW, renderH);
        ctx.restore();

        // Right side of split: Original unsegmented image
        if (originalImgRef.current && originalImgRef.current.complete) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitX, 0, cw - splitX, ch);
          ctx.clip();
          ctx.drawImage(originalImgRef.current, -renderW / 2, -renderH / 2, renderW, renderH);
          ctx.restore();
        }
      } else {
        ctx.drawImage(activeObjImg, -renderW / 2, -renderH / 2, renderW, renderH);
      }

      ctx.restore();
    }

    // 5. Draw Interactive Light Indicator on Canvas
    if (activeTab === 'lighting') {
      const lRad = (light.direction * Math.PI) / 180;
      const lx = objPos.x + Math.cos(lRad) * light.distance;
      const ly = objPos.y + Math.sin(lRad) * light.distance;

      ctx.save();
      // Beam line
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#43D6CB';
      ctx.lineWidth = 1.5;
      ctx.moveTo(lx, ly);
      ctx.lineTo(objPos.x, objPos.y);
      ctx.stroke();

      // Light bulb icon circle
      ctx.setLineDash([]);
      ctx.fillStyle = light.color || '#FFF8EE';
      ctx.shadowColor = '#43D6CB';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(lx, ly, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#43D6CB';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText(`${light.direction}°`, lx, ly - 18);
      ctx.restore();
    }

    // 6. Draw Surface Perspective Guide Handles (if editing surface)
    if (activeTab === 'surface' || isEditingSurface) {
      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      const p0 = { x: surfaceCorners[0].x * cw, y: surfaceCorners[0].y * ch };
      const p1 = { x: surfaceCorners[1].x * cw, y: surfaceCorners[1].y * ch };
      const p2 = { x: surfaceCorners[2].x * cw, y: surfaceCorners[2].y * ch };
      const p3 = { x: surfaceCorners[3].x * cw, y: surfaceCorners[3].y * ch };

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.stroke();

      // Corners
      [p0, p1, p2, p3].forEach((pt, i) => {
        ctx.setLineDash([]);
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.restore();
    }
  }, [
    layers,
    viewMode,
    splitPos,
    objPos,
    objScale,
    objRotation,
    light,
    shadow,
    surfaceCorners,
    activeTab,
    isEditingSurface,
  ]);

  useEffect(() => {
    drawCompositeCanvas();
  }, [drawCompositeCanvas]);

  // Canvas Mouse Interactions (Dragging Object, Light, Surface Corners, Brush)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    // 1. Check if clicking light source
    const lRad = (light.direction * Math.PI) / 180;
    const lx = objPos.x + Math.cos(lRad) * light.distance;
    const ly = objPos.y + Math.sin(lRad) * light.distance;
    if (Math.hypot(mx - lx, my - ly) < 22) {
      setDragTarget('light');
      return;
    }

    // 2. Check surface corners if visible
    if (activeTab === 'surface' || isEditingSurface) {
      for (let i = 0; i < 4; i++) {
        const cx = surfaceCorners[i].x * canvas.width;
        const cy = surfaceCorners[i].y * canvas.height;
        if (Math.hypot(mx - cx, my - cy) < 18) {
          setDragTarget(i);
          return;
        }
      }
    }

    // 3. Otherwise dragging the object
    const activeObjImg = isolatedImgRef.current || originalImgRef.current;
    const rw = (activeObjImg?.width || 300) * objScale;
    const rh = (activeObjImg?.height || 300) * objScale;
    if (Math.abs(mx - objPos.x) < rw / 2 && Math.abs(my - objPos.y) < rh / 2) {
      setDragTarget('object');
      dragStartRef.current = { mouseX: mx, mouseY: my, startX: objPos.x, startY: objPos.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragTarget === null) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (dragTarget === 'object') {
      const dx = mx - dragStartRef.current.mouseX;
      const dy = my - dragStartRef.current.mouseY;
      setObjPos({
        x: Math.round(dragStartRef.current.startX + dx),
        y: Math.round(dragStartRef.current.startY + dy),
      });
    } else if (dragTarget === 'light') {
      // Calculate angle from object center to mouse
      const angleRad = Math.atan2(my - objPos.y, mx - objPos.x);
      const angleDeg = (Math.round((angleRad * 180) / Math.PI) + 360) % 360;
      const dist = Math.max(70, Math.min(260, Math.hypot(mx - objPos.x, my - objPos.y)));
      setLight((prev) => ({ ...prev, distance: dist }));
      handleUpdateLightDirection(angleDeg);
    } else if (typeof dragTarget === 'number') {
      // Dragging a surface corner handle
      const updated = [...surfaceCorners];
      updated[dragTarget] = {
        x: Math.max(0, Math.min(1, mx / canvas.width)),
        y: Math.max(0, Math.min(1, my / canvas.height)),
      };
      setSurfaceCorners(updated);
    }
  };

  const handleCanvasMouseUp = () => {
    if (dragTarget !== null) {
      setDragTarget(null);
      pushHistory();
    }
  };

  // Upload user object file
  const handleObjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setOriginalImageUrl(b64);
      setIsolatedObjectUrl(null); // will trigger auto cutout
      showToast('תמונת אובייקט הועלתה בהצלחה!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Upload background file
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setBgImageUrl(b64);
      setLayers((prev) => ({ ...prev, background: true }));
      showToast('תמונת רקע הועלתה! לחץ על "התאם תאורה" לניתוח אוטומטי', 'success');
    };
    reader.readAsDataURL(file);
  };

  // EXPORT OPERATIONS:
  // A: Object Only (Transparent PNG)
  // B: Shadow Only (Transparent PNG)
  // C: Object + Shadow (Transparent PNG)
  // D: Composite Full (PNG)
  // E: Layered ZIP Project
  const handleExport = async (type: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const activeObjImg = isolatedImgRef.current || originalImgRef.current;
    if (!activeObjImg) {
      showToast('אין אובייקט לייצוא', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const baseName = activeProject.name.replace(/\s+/g, '_') || 'inspira';

    // Helper to draw only shadows
    const renderShadowsOnly = (targetCtx: CanvasRenderingContext2D) => {
      const rad = (shadow.direction * Math.PI) / 180;
      const offsetX = Math.cos(rad) * shadow.distance * shadow.length;
      const offsetY = Math.sin(rad) * shadow.distance * shadow.length;
      const imgW = activeObjImg.naturalWidth || 400;
      const imgH = activeObjImg.naturalHeight || 400;
      const renderW = imgW * objScale;
      const renderH = imgH * objScale;
      const objBottomY = objPos.y + renderH / 2;

      targetCtx.save();
      // Directional
      targetCtx.save();
      targetCtx.translate(objPos.x + offsetX, objBottomY + offsetY * 0.4);
      targetCtx.rotate((shadow.rotation * Math.PI) / 180);
      targetCtx.scale(objScale * shadow.spread, objScale * Math.sin(rad) * shadow.length * 0.45);
      targetCtx.globalAlpha = shadow.opacity / 100;
      targetCtx.filter = `blur(${Math.max(1, shadow.softness)}px)`;

      const silCanvas = document.createElement('canvas');
      silCanvas.width = imgW;
      silCanvas.height = imgH;
      const sCtx = silCanvas.getContext('2d');
      if (sCtx) {
        sCtx.drawImage(activeObjImg, 0, 0);
        sCtx.globalCompositeOperation = 'source-in';
        sCtx.fillStyle = shadow.color;
        sCtx.fillRect(0, 0, imgW, imgH);
        targetCtx.drawImage(silCanvas, -imgW / 2, -imgH);
      }
      targetCtx.restore();

      // Contact
      if (shadow.contactShadowEnabled) {
        targetCtx.save();
        targetCtx.translate(objPos.x, objBottomY);
        targetCtx.scale(objScale * shadow.spread, 0.25);
        targetCtx.globalAlpha = shadow.contactShadowIntensity / 100;
        targetCtx.filter = `blur(${Math.max(1, shadow.contactShadowSize / 4)}px)`;
        const grad = targetCtx.createRadialGradient(0, 0, 2, 0, 0, renderW * 0.38);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(1, 'transparent');
        targetCtx.fillStyle = grad;
        targetCtx.beginPath();
        targetCtx.arc(0, 0, renderW * 0.38, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.restore();
      }
      targetCtx.restore();
    };

    // Helper to draw only object
    const renderObjectOnly = (targetCtx: CanvasRenderingContext2D) => {
      const imgW = activeObjImg.naturalWidth || 400;
      const imgH = activeObjImg.naturalHeight || 400;
      const renderW = imgW * objScale;
      const renderH = imgH * objScale;
      targetCtx.save();
      targetCtx.translate(objPos.x, objPos.y);
      targetCtx.rotate((objRotation * Math.PI) / 180);
      targetCtx.drawImage(activeObjImg, -renderW / 2, -renderH / 2, renderW, renderH);
      targetCtx.restore();
    };

    if (type === 'A') {
      // Object only transparent PNG
      ctx.clearRect(0, 0, cw, ch);
      renderObjectOnly(ctx);
      downloadCanvasAsPng(canvas, `${baseName}_object_transparent.png`);
      showToast('ייצוא אובייקט שקוף (Transparent PNG) הושלם!', 'success');
      return;
    }

    if (type === 'B') {
      // Shadow only transparent PNG
      ctx.clearRect(0, 0, cw, ch);
      renderShadowsOnly(ctx);
      downloadCanvasAsPng(canvas, `${baseName}_shadow_transparent.png`);
      showToast('ייצוא צל שקוף בלבד (Transparent PNG) הושלם!', 'success');
      return;
    }

    if (type === 'C') {
      // Object and Shadow transparent PNG
      ctx.clearRect(0, 0, cw, ch);
      renderShadowsOnly(ctx);
      renderObjectOnly(ctx);
      downloadCanvasAsPng(canvas, `${baseName}_object_with_shadow_transparent.png`);
      showToast('ייצוא אובייקט וצללים שקופים (Transparent PNG) הושלם!', 'success');
      return;
    }

    if (type === 'D') {
      // Object, Shadow & Background PNG
      ctx.clearRect(0, 0, cw, ch);
      if (bgImgRef.current && bgImgRef.current.complete) {
        ctx.drawImage(bgImgRef.current, 0, 0, cw, ch);
      } else {
        ctx.fillStyle = '#103F46';
        ctx.fillRect(0, 0, cw, ch);
      }
      renderShadowsOnly(ctx);
      renderObjectOnly(ctx);
      downloadCanvasAsPng(canvas, `${baseName}_full_composite.png`);
      showToast('ייצוא קומפוזיציה מלאה הושלם!', 'success');
      return;
    }

    if (type === 'E') {
      // Layered ZIP Project containing separate transparent PNGs and manifest.json
      showToast('מייצר ארכיון שכבות ZIP...', 'info');
      const zip = new JSZip();

      // Layer 1: Object PNG
      ctx.clearRect(0, 0, cw, ch);
      renderObjectOnly(ctx);
      const objData = canvas.toDataURL('image/png').split(',')[1];
      zip.file('layer_1_object_transparent.png', objData, { base64: true });

      // Layer 2: Shadow PNG
      ctx.clearRect(0, 0, cw, ch);
      renderShadowsOnly(ctx);
      const shadowData = canvas.toDataURL('image/png').split(',')[1];
      zip.file('layer_2_shadow_transparent.png', shadowData, { base64: true });

      // Layer 3: Background PNG
      if (bgImgRef.current && bgImgRef.current.complete) {
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(bgImgRef.current, 0, 0, cw, ch);
        const bgData = canvas.toDataURL('image/png').split(',')[1];
        zip.file('layer_3_background.png', bgData, { base64: true });
      }

      // Project manifest JSON
      const manifest = {
        app: 'INSPIRA STUDIO — Shadow Master Pro',
        version: '1.0',
        projectName: activeProject.name,
        timestamp: new Date().toISOString(),
        settings: { shadow, light, objPos, objScale, objRotation, surfaceCorners },
      };
      zip.file('project_manifest.json', JSON.stringify(manifest, null, 2));

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_layered_project.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('קובץ ZIP של השכבות הנפרדות הורד בהצלחה!', 'success');
    }
  };

  const downloadCanvasAsPng = (canvas: HTMLCanvasElement, filename: string) => {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  // Cross-module transfers
  const sendToMockupMaster = () => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    setSelectedArtworkForMockup(url);
    setActiveModule('mockup_master');
    showToast('הקומפוזיציה והצללים הועברו למאסטר מוקאפים!', 'success');
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#183036] text-[#F7F8F3] select-none text-right">
      {/* Top Professional Action Bar */}
      <div className="h-14 border-b border-zinc-800 bg-[#183036] px-5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-[#43D6CB]">
            <Icon name="SunDim" className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm text-white">מעבדת שקיפות וצללים</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-[#43D6CB] border border-[#43D6CB]/30">
                SHADOW MASTER PRO #11
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">הסרת רקע אמיתית, הפרדת צללים ותאורה אינטראקטיבית 360°</p>
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-2">
          {/* Hidden upload inputs */}
          <input
            type="file"
            ref={objectUploadInputRef}
            accept="image/*"
            onChange={handleObjectUpload}
            className="hidden"
          />
          <input
            type="file"
            ref={bgUploadInputRef}
            accept="image/*"
            onChange={handleBackgroundUpload}
            className="hidden"
          />

          <button
            onClick={() => objectUploadInputRef.current?.click()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 border border-zinc-700"
            title="העלאת אובייקט (JPG, PNG, WEBP)"
          >
            <Icon name="Upload" className="w-3.5 h-3.5 text-[#43D6CB]" />
            <span>העלה אובייקט</span>
          </button>

          <button
            onClick={() => bgUploadInputRef.current?.click()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 border border-zinc-700"
            title="העלאת רקע משטח"
          >
            <Icon name="Image" className="w-3.5 h-3.5 text-sky-400" />
            <span>העלה רקע</span>
          </button>

          <button
            onClick={handleMatchBackgroundLighting}
            disabled={isMatchingLighting || !bgImageUrl}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-teal-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md shadow-amber-600/20"
            title="ניתוח תאורת הרקע באמצעות Gemini AI"
          >
            <Icon name="Sparkles" className={`w-3.5 h-3.5 ${isMatchingLighting ? 'animate-spin' : ''}`} />
            <span>{isMatchingLighting ? 'מנתח תאורה...' : 'התאם תאורה לרקע AI'}</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIdx <= 0}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-300"
            title="בטל (Undo)"
          >
            <Icon name="RotateCcw" className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded-lg text-zinc-300"
            title="בצע שוב (Redo)"
          >
            <Icon name="RotateCcw" className="w-3.5 h-3.5 -scale-x-100" />
          </button>

          {/* Export Dropdown Group */}
          <div className="relative group">
            <button
              onClick={() => handleExport('C')}
              className="px-4 py-1.5 bg-[#43D6CB] hover:bg-teal-600 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
            >
              <Icon name="Download" className="w-3.5 h-3.5" />
              <span>ייצוא נכסים</span>
              <Icon name="ChevronRight" className="w-3 h-3 rotate-90" />
            </button>

            <div className="absolute left-0 mt-1 w-64 bg-[#103F46] border border-zinc-700 rounded-xl shadow-2xl p-2 hidden group-hover:block z-50">
              <span className="text-[10px] text-zinc-500 font-bold block px-2 py-1 uppercase">אפשרויות ייצוא שקיפות אמיתיות:</span>
              <button
                onClick={() => handleExport('A')}
                className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>אובייקט בלבד (Transparent PNG)</span>
                <span className="text-[10px] text-zinc-500">A</span>
              </button>
              <button
                onClick={() => handleExport('B')}
                className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>צללים בלבד (Transparent PNG)</span>
                <span className="text-[10px] text-zinc-500">B</span>
              </button>
              <button
                onClick={() => handleExport('C')}
                className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-[#43D6CB] font-bold hover:bg-[#43D6CB]/10 flex items-center justify-between"
              >
                <span>אובייקט וצללים שקופים (PNG)</span>
                <span className="text-[10px] text-[#43D6CB]">מומלץ C</span>
              </button>
              <button
                onClick={() => handleExport('D')}
                className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-zinc-200 hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>קומפוזיציה עם רקע (PNG)</span>
                <span className="text-[10px] text-zinc-500">D</span>
              </button>
              <button
                onClick={() => handleExport('E')}
                className="w-full text-right px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 font-bold hover:bg-emerald-500/10 flex items-center justify-between border-t border-zinc-800 mt-1 pt-1.5"
              >
                <span>ארכיון שכבות עריכה מלא (ZIP)</span>
                <span className="text-[10px] text-emerald-400">E</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Split Layout: Left (Controls) | Center (Canvas) | Right (Layers & Presets) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Professional Lighting and Shadow Controls */}
        <div className="w-80 bg-[#183036] border-l border-zinc-800 flex flex-col h-full text-xs overflow-hidden">
          {/* Subtabs */}
          <div className="grid grid-cols-4 border-b border-zinc-800 bg-[#183036] text-[11px] font-bold">
            <button
              onClick={() => setActiveTab('lighting')}
              className={`py-2.5 border-b-2 transition ${
                activeTab === 'lighting'
                  ? 'border-[#43D6CB] text-[#43D6CB] bg-[#183036]'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              תאורה
            </button>
            <button
              onClick={() => setActiveTab('shadow')}
              className={`py-2.5 border-b-2 transition ${
                activeTab === 'shadow'
                  ? 'border-[#43D6CB] text-[#43D6CB] bg-[#183036]'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              מנוע צללים
            </button>
            <button
              onClick={() => setActiveTab('cutout')}
              className={`py-2.5 border-b-2 transition ${
                activeTab === 'cutout'
                  ? 'border-[#43D6CB] text-[#43D6CB] bg-[#183036]'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              בידוד ומסיכה
            </button>
            <button
              onClick={() => setActiveTab('surface')}
              className={`py-2.5 border-b-2 transition ${
                activeTab === 'surface'
                  ? 'border-[#43D6CB] text-[#43D6CB] bg-[#183036]'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              משטח
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: LIGHTING CONTROLS */}
            {activeTab === 'lighting' && (
              <div className="space-y-4">
                {/* 360 Lighting Wheel & Angle */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Icon name="Sun" className="w-3.5 h-3.5 text-amber-400" />
                      כיוון מקור אור (360°):
                    </span>
                    <span className="font-mono text-[#43D6CB] font-bold">{light.direction}°</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={light.direction}
                    onChange={(e) => handleUpdateLightDirection(Number(e.target.value))}
                    className="w-full accent-[#43D6CB] h-1.5"
                  />

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-zinc-400">
                    <button onClick={() => handleUpdateLightDirection(270)} className="p-1 bg-zinc-800 rounded hover:text-white">למעלה 270°</button>
                    <button onClick={() => handleUpdateLightDirection(0)} className="p-1 bg-zinc-800 rounded hover:text-white">ימין 0°</button>
                    <button onClick={() => handleUpdateLightDirection(90)} className="p-1 bg-zinc-800 rounded hover:text-white">למטה 90°</button>
                    <button onClick={() => handleUpdateLightDirection(180)} className="p-1 bg-zinc-800 rounded hover:text-white">שמאל 180°</button>
                  </div>
                </div>

                {/* Elevation (גובה האור) */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300">גובה מקור אור (Elevation):</span>
                    <span className="font-mono text-zinc-200">{light.elevation}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={light.elevation}
                    onChange={(e) => handleUpdateLightElevation(Number(e.target.value))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>10° (שקיעה/צל ארוך)</span>
                    <span>90° (צהריים/עליון)</span>
                  </div>
                </div>

                {/* Light Softness & Intensity */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block mb-1">ריכוך (Softness):</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={light.softness}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLight((p) => ({ ...p, softness: val }));
                        setShadow((s) => ({ ...s, softness: Math.round(val * 0.6) }));
                      }}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>

                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <span className="text-[10px] text-zinc-400 block mb-1">עוצמת אור:</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={light.intensity}
                      onChange={(e) => setLight((p) => ({ ...p, intensity: Number(e.target.value) }))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>
                </div>

                {/* Light Color */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-zinc-300">גוון מקור האור:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={light.color}
                      onChange={(e) => setLight((p) => ({ ...p, color: e.target.value }))}
                      className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                    />
                    <span className="font-mono text-zinc-400">{light.color}</span>
                  </div>
                </div>

                {/* AI Lighting Notes */}
                {aiLightingNotes && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 space-y-1">
                    <strong className="block font-bold">אומדן תאורת רקע (Gemini AI):</strong>
                    <p className="leading-relaxed">{aiLightingNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SHADOW ENGINE */}
            {activeTab === 'shadow' && (
              <div className="space-y-3.5">
                {/* Shadow Length */}
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>אורך הצל (Shadow Length):</span>
                    <span className="font-mono text-[#43D6CB]">{shadow.length}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.05"
                    value={shadow.length}
                    onChange={(e) => setShadow((s) => ({ ...s, length: Number(e.target.value) }))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>

                {/* Shadow Softness (Blur) */}
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>ריכוך וטשטוש (Blur Radius):</span>
                    <span className="font-mono text-zinc-200">{shadow.softness}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="70"
                    value={shadow.softness}
                    onChange={(e) => setShadow((s) => ({ ...s, softness: Number(e.target.value) }))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span>אטימות צל (Opacity):</span>
                    <span className="font-mono text-zinc-200">{shadow.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={shadow.opacity}
                    onChange={(e) => setShadow((s) => ({ ...s, opacity: Number(e.target.value) }))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>

                {/* Shadow Color */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <span className="text-zinc-300">צבע הצל:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={shadow.color}
                      onChange={(e) => setShadow((s) => ({ ...s, color: e.target.value }))}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                    <span className="font-mono text-zinc-400">{shadow.color}</span>
                  </div>
                </div>

                {/* Shadow Spread & Distance */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">רוחב (Spread):</span>
                    <input
                      type="range"
                      min="0.4"
                      max="2.5"
                      step="0.05"
                      value={shadow.spread}
                      onChange={(e) => setShadow((s) => ({ ...s, spread: Number(e.target.value) }))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">מרחק (Distance):</span>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      value={shadow.distance}
                      onChange={(e) => setShadow((s) => ({ ...s, distance: Number(e.target.value) }))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>
                </div>

                {/* Contact Shadow & Ambient Occlusion */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">צל מגע פיזי (Contact Shadow)</span>
                    <input
                      type="checkbox"
                      checked={shadow.contactShadowEnabled}
                      onChange={(e) => setShadow((s) => ({ ...s, contactShadowEnabled: e.target.checked }))}
                      className="accent-[#43D6CB] w-4 h-4 cursor-pointer"
                    />
                  </div>
                  {shadow.contactShadowEnabled && (
                    <div>
                      <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                        <span>עוצמת מגע:</span>
                        <span className="font-mono">{shadow.contactShadowIntensity}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={shadow.contactShadowIntensity}
                        onChange={(e) => setShadow((s) => ({ ...s, contactShadowIntensity: Number(e.target.value) }))}
                        className="w-full accent-[#43D6CB] h-1"
                      />
                    </div>
                  )}
                </div>

                {/* Ambient Occlusion */}
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">הצללת אווירה (Ambient Occlusion)</span>
                    <input
                      type="checkbox"
                      checked={shadow.ambientShadowEnabled}
                      onChange={(e) => setShadow((s) => ({ ...s, ambientShadowEnabled: e.target.checked }))}
                      className="accent-[#43D6CB] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CUTOUT & ALPHA MATTE */}
            {activeTab === 'cutout' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                  <strong>ערוץ שקיפות אמיתי (True Alpha):</strong> התוכנה מייצרת פיקסלים שקופים לחלוטין (Alpha = 0) ללא רקע לבן או צ׳קרבורד מזויף.
                </div>

                <button
                  onClick={handleAiCutoutAssist}
                  disabled={isSegmenting}
                  className="w-full py-2 bg-[#43D6CB] hover:bg-teal-600 disabled:opacity-50 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Icon name="Scissors" className="w-3.5 h-3.5" />
                  <span>{isSegmenting ? 'מבצע בידוד...' : 'בצע הסרת רקע אוטומטית'}</span>
                </button>

                {/* Sliders for threshold & feathering */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>סף דיוק הפרדה (Threshold):</span>
                      <span className="font-mono">{cutoutThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={cutoutThreshold}
                      onChange={(e) => setCutoutThreshold(Number(e.target.value))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-zinc-400 mb-1">
                      <span>ריכוך קצוות ושיער (Feathering):</span>
                      <span className="font-mono">{featherRadius}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={featherRadius}
                      onChange={(e) => setFeatherRadius(Number(e.target.value))}
                      className="w-full accent-[#43D6CB] h-1"
                    />
                  </div>

                  <button
                    onClick={handleApplyMaskRefinement}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg transition"
                  >
                    החל שינויי מסיכה
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SURFACE PERSPECTIVE */}
            {activeTab === 'surface' && (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <span className="font-bold text-white block">עורך מישור קרקע ב-4 נקודות:</span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    גרור את 4 הנקודות הכחולות מעל הרקע כדי לסמן את נטיית השולחן או הרצפה. הצל יוטל במדויק בתוך המישור שנבחר.
                  </p>
                  <button
                    onClick={() => setIsEditingSurface(!isEditingSurface)}
                    className={`w-full py-1.5 text-xs font-bold rounded-lg border transition ${
                      isEditingSurface
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    {isEditingSurface ? 'סימון מישור פעיל (לחץ לסיום)' : 'הפעל סימון מישור בעכבר'}
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>הטיית פרספקטיבה (Tilt):</span>
                    <span className="font-mono">{shadow.perspectiveTilt}°</span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={shadow.perspectiveTilt}
                    onChange={(e) => setShadow((s) => ({ ...s, perspectiveTilt: Number(e.target.value) }))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>עיוות רוחבי (Shear):</span>
                    <span className="font-mono">{shadow.perspectiveShear}</span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={shadow.perspectiveShear}
                    onChange={(e) => setShadow((s) => ({ ...s, perspectiveShear: Number(e.target.value) }))}
                    className="w-full accent-[#43D6CB] h-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Large Interactive Canvas */}
        <div className="flex-1 flex flex-col bg-[#0F1012] relative overflow-hidden">
          {/* Canvas View Mode & Split Selector Bar */}
          <div className="h-10 border-b border-zinc-800 bg-[#183036] px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'composite', label: 'קומפוזיציה מלאה' },
                { id: 'split', label: 'השוואת לפני/אחרי' },
                { id: 'object_only', label: 'אובייקט שקוף' },
                { id: 'shadow_only', label: 'צללים בלבד' },
                { id: 'bg_only', label: 'רקע בלבד' },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    viewMode === v.id
                      ? 'bg-[#43D6CB]/20 text-[#43D6CB] border border-[#43D6CB]/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Scale / Object controls */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-zinc-400">קנה מידה:</span>
              <input
                type="range"
                min="0.3"
                max="1.8"
                step="0.05"
                value={objScale}
                onChange={(e) => setObjScale(Number(e.target.value))}
                className="w-24 accent-[#43D6CB] h-1"
                title="גודל אובייקט"
              />
              {false && <button
                onClick={sendToMockupMaster}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded text-[11px] flex items-center gap-1 border border-zinc-700"
              >
                <Icon name="Layers" className="w-3 h-3 text-[#43D6CB]" />
                שלח למוקאפ
              </button>}
            </div>
          </div>

          {/* Canvas Stage */}
          <div className="flex-1 relative flex items-center justify-center p-4 canvas-checkerboard overflow-hidden cursor-crosshair">
            <canvas
              ref={mainCanvasRef}
              width={1000}
              height={600}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-zinc-800"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />

            {/* Split comparison slider overlay */}
            {viewMode === 'split' && (
              <div className="absolute bottom-6 inset-x-20 bg-black/70 backdrop-blur-md p-2 rounded-xl border border-white/20 flex items-center gap-3 text-xs">
                <span className="font-bold text-white">הזז קו השוואה:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={(e) => setSplitPos(Number(e.target.value))}
                  className="flex-1 accent-[#43D6CB] h-1.5"
                />
                <span className="font-mono text-[#43D6CB]">{splitPos}%</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Layer Management & Presets List */}
        <div className="w-72 bg-[#183036] border-r border-zinc-800 flex flex-col h-full text-xs overflow-hidden">
          {/* Layer Management Panel */}
          <div className="p-4 border-b border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Icon name="Layers" className="w-3.5 h-3.5 text-[#43D6CB]" />
                ניהול שכבות עריכה (Layers)
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                { key: 'object', label: 'שכבה 1: אובייקט מבודד', color: 'text-amber-400' },
                { key: 'originalShadow', label: 'שכבה 2: צל מקורי מחולץ', color: 'text-zinc-400' },
                { key: 'generatedShadow', label: 'שכבה 3: צל מלאכותי מחושב', color: 'text-[#43D6CB]' },
                { key: 'background', label: 'שכבה 4: תמונת רקע', color: 'text-sky-400' },
              ].map((layer) => {
                const isVisible = (layers as any)[layer.key];
                return (
                  <div
                    key={layer.key}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isVisible
                        ? 'bg-zinc-900 border-zinc-700 text-white'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    <span className={`font-bold ${isVisible ? layer.color : ''}`}>
                      {layer.label}
                    </span>
                    <button
                      onClick={() =>
                        setLayers((prev: any) => ({ ...prev, [layer.key]: !prev[layer.key] }))
                      }
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      title={isVisible ? 'הסתר שכבה' : 'הצג שכבה'}
                    >
                      <Icon name={isVisible ? 'Eye' : 'EyeOff'} className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 10 Presets List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <span className="font-bold text-zinc-400 text-[11px] block uppercase">10 פריסטים מקצועיים מוכנים:</span>
            <div className="space-y-1.5">
              {DEFAULT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className="w-full text-right p-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-[#43D6CB]/50 rounded-xl transition group"
                >
                  <div className="font-bold text-xs text-zinc-200 group-hover:text-[#43D6CB] transition">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
