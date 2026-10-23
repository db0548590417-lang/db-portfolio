import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';

interface Point {
  x: number;
  y: number;
}

interface MockupTemplate {
  id: string;
  name: string;
  category: string;
  bgUrl: string;
  // Default 4 corners in normalized coordinates (0..1) [TL, TR, BR, BL]
  defaultCorners: [Point, Point, Point, Point];
  aspectRatio: number;
}

const TEMPLATES: MockupTemplate[] = [
  {
    id: 'billboard_highway',
    name: 'שלט חוצות ענק בכביש מהיר',
    category: 'שלטי חוצות',
    bgUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.28, y: 0.18 },
      { x: 0.72, y: 0.22 },
      { x: 0.71, y: 0.52 },
      { x: 0.29, y: 0.49 },
    ],
    aspectRatio: 16 / 9,
  },
  {
    id: 'poster_subway',
    name: 'כרזת קיר בגלריה / תחנה',
    category: 'פוסטרים',
    bgUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.32, y: 0.22 },
      { x: 0.68, y: 0.25 },
      { x: 0.67, y: 0.78 },
      { x: 0.33, y: 0.76 },
    ],
    aspectRatio: 16 / 9,
  },
  {
    id: 'luxury_packaging',
    name: 'אריזת פרימיום יוקרתית שחורה',
    category: 'אריזות',
    bgUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.35, y: 0.35 },
      { x: 0.65, y: 0.32 },
      { x: 0.63, y: 0.68 },
      { x: 0.36, y: 0.72 },
    ],
    aspectRatio: 16 / 9,
  },
  {
    id: 'business_card',
    name: 'כרטיס ביקור יוקרתי על נייר כותנה',
    category: 'כרטיסי ביקור',
    bgUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.25, y: 0.32 },
      { x: 0.75, y: 0.28 },
      { x: 0.73, y: 0.68 },
      { x: 0.26, y: 0.73 },
    ],
    aspectRatio: 16 / 9,
  },
  {
    id: 'store_sign',
    name: 'שילוט חוץ לחנות בוטיק',
    category: 'שילוט',
    bgUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.30, y: 0.28 },
      { x: 0.70, y: 0.30 },
      { x: 0.69, y: 0.65 },
      { x: 0.31, y: 0.63 },
    ],
    aspectRatio: 16 / 9,
  },
  {
    id: 'imac_screen',
    name: 'מסך מחשב סטודיו לעיצוב',
    category: 'מסכים',
    bgUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    defaultCorners: [
      { x: 0.315, y: 0.17 },
      { x: 0.685, y: 0.17 },
      { x: 0.685, y: 0.61 },
      { x: 0.315, y: 0.61 },
    ],
    aspectRatio: 16 / 9,
  },
];

// Helper: Affine warp triangle on Canvas
function drawWarpedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  p0: Point,
  p1: Point,
  p2: Point,
  u0: Point,
  u1: Point,
  u2: Point
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();

  const delta = u0.x * (u1.y - u2.y) + u1.x * (u2.y - u0.y) + u2.x * (u0.y - u1.y);
  if (Math.abs(delta) < 0.0001) {
    ctx.restore();
    return;
  }

  const deltaA = p0.x * (u1.y - u2.y) + p1.x * (u2.y - u0.y) + p2.x * (u0.y - u1.y);
  const deltaB = u0.x * (p1.x - p2.x) + u1.x * (p2.x - p0.x) + u2.x * (p0.x - p1.x);
  const deltaC = u0.x * (u1.y * p2.x - u2.y * p1.x) + u1.x * (u2.y * p0.x - u0.y * p2.x) + u2.x * (u0.y * p1.x - u1.y * p0.x);

  const deltaD = p0.y * (u1.y - u2.y) + p1.y * (u2.y - u0.y) + p2.y * (u0.y - u1.y);
  const deltaE = u0.x * (p1.y - p2.y) + u1.x * (p2.y - p0.y) + u2.x * (p0.y - p1.y);
  const deltaF = u0.x * (u1.y * p2.y - u2.y * p1.y) + u1.x * (u2.y * p0.y - u0.y * p2.y) + u2.x * (u0.y * p1.y - u1.y * p0.y);

  ctx.transform(
    deltaA / delta,
    deltaD / delta,
    deltaB / delta,
    deltaE / delta,
    deltaC / delta,
    deltaF / delta
  );

  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// Full 4-corner mesh warping
function drawQuadMesh(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  corners: [Point, Point, Point, Point],
  gridSteps = 8
) {
  const [cTL, cTR, cBR, cBL] = corners;
  const iw = (img as any).naturalWidth || (img as any).width || 800;
  const ih = (img as any).naturalHeight || (img as any).height || 600;

  // Bilinear interpolation for grid vertices
  const getQuadPoint = (u: number, v: number): Point => {
    const topX = cTL.x + (cTR.x - cTL.x) * u;
    const topY = cTL.y + (cTR.y - cTL.y) * u;
    const botX = cBL.x + (cBR.x - cBL.x) * u;
    const botY = cBL.y + (cBR.y - cBL.y) * u;
    return {
      x: topX + (botX - topX) * v,
      y: topY + (botY - topY) * v,
    };
  };

  for (let gy = 0; gy < gridSteps; gy++) {
    for (let gx = 0; gx < gridSteps; gx++) {
      const u1 = gx / gridSteps;
      const v1 = gy / gridSteps;
      const u2 = (gx + 1) / gridSteps;
      const v2 = (gy + 1) / gridSteps;

      const pTL = getQuadPoint(u1, v1);
      const pTR = getQuadPoint(u2, v1);
      const pBR = getQuadPoint(u2, v2);
      const pBL = getQuadPoint(u1, v2);

      const uvTL = { x: u1 * iw, y: v1 * ih };
      const uvTR = { x: u2 * iw, y: v1 * ih };
      const uvBR = { x: u2 * iw, y: v2 * ih };
      const uvBL = { x: u1 * iw, y: v2 * ih };

      // Triangle 1: TL -> TR -> BR
      drawWarpedTriangle(ctx, img, pTL, pTR, pBR, uvTL, uvTR, uvBR);
      // Triangle 2: TL -> BR -> BL
      drawWarpedTriangle(ctx, img, pTL, pBR, pBL, uvTL, uvBR, uvBL);
    }
  }
}

export const MockupMaster: React.FC = () => {
  const { selectedArtworkForMockup, showToast, updateActiveProject } = useProject();

  const [activeTemplate, setActiveTemplate] = useState<MockupTemplate>(TEMPLATES[0]);
  const [artworkUrl, setArtworkUrl] = useState<string>(
    selectedArtworkForMockup ||
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80'
  );

  // Normalized corners 0..1
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>(
    activeTemplate.defaultCorners
  );

  // Blend modes & filters
  const [blendMode, setBlendMode] = useState<GlobalCompositeOperation>('multiply');
  const [opacity, setOpacity] = useState(0.9);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [shadowDepth, setShadowDepth] = useState(15);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const artworkImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change template
  const handleSelectTemplate = (tpl: MockupTemplate) => {
    setActiveTemplate(tpl);
    setCorners(tpl.defaultCorners);
  };

  // Render Canvas
  const renderMockup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // 1. Draw Background Mockup Image
    if (bgImageRef.current && bgImageRef.current.complete) {
      ctx.drawImage(bgImageRef.current, 0, 0, cw, ch);
    } else {
      ctx.fillStyle = '#103F46';
      ctx.fillRect(0, 0, cw, ch);
    }

    // 2. Absolute Corner Coordinates
    const absCorners: [Point, Point, Point, Point] = [
      { x: corners[0].x * cw, y: corners[0].y * ch },
      { x: corners[1].x * cw, y: corners[1].y * ch },
      { x: corners[2].x * cw, y: corners[2].y * ch },
      { x: corners[3].x * cw, y: corners[3].y * ch },
    ];

    // 3. Draw Warped Artwork with Filter and BlendMode
    if (artworkImageRef.current && artworkImageRef.current.complete) {
      ctx.save();
      ctx.globalCompositeOperation = blendMode;
      ctx.globalAlpha = opacity;
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

      // Shadow under quad
      if (shadowDepth > 0) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = shadowDepth;
        ctx.shadowOffsetY = shadowDepth / 2;
      }

      drawQuadMesh(ctx, artworkImageRef.current, absCorners, 8);
      ctx.restore();
    }

    // 4. Draw Transform Handles & Quad Outline if in editor mode
    ctx.save();
    ctx.strokeStyle = '#43D6CB';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(absCorners[0].x, absCorners[0].y);
    ctx.lineTo(absCorners[1].x, absCorners[1].y);
    ctx.lineTo(absCorners[2].x, absCorners[2].y);
    ctx.lineTo(absCorners[3].x, absCorners[3].y);
    ctx.closePath();
    ctx.stroke();

    // Corner handle circles
    const handleLabels = ['TL', 'TR', 'BR', 'BL'];
    absCorners.forEach((pt, i) => {
      ctx.setLineDash([]);
      ctx.fillStyle = activeHandle === i ? '#43D6CB' : '#43D6CB';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(handleLabels[i], pt.x, pt.y);
    });
    ctx.restore();
  }, [corners, blendMode, opacity, brightness, contrast, shadowDepth, activeHandle]);

  // Load BG Image
  useEffect(() => {
    const bg = new Image();
    bg.crossOrigin = 'anonymous';
    bg.src = activeTemplate.bgUrl;
    bg.onload = () => {
      bgImageRef.current = bg;
      renderMockup();
    };
  }, [activeTemplate, renderMockup]);

  // Load Artwork Image
  useEffect(() => {
    if (!artworkUrl) return;
    const art = new Image();
    art.crossOrigin = 'anonymous';
    art.src = artworkUrl;
    art.onload = () => {
      artworkImageRef.current = art;
      renderMockup();
    };
  }, [artworkUrl, renderMockup]);

  // Re-render when controls change
  useEffect(() => {
    renderMockup();
  }, [renderMockup]);

  // Mouse interaction for 4 handles
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const cw = canvas.width;
    const ch = canvas.height;

    // Check which handle was clicked (within 18px radius)
    let found = -1;
    corners.forEach((c, i) => {
      const hx = c.x * cw;
      const hy = c.y * ch;
      const dist = Math.hypot(mouseX - hx, mouseY - hy);
      if (dist < 20) found = i;
    });

    if (found !== -1) {
      setActiveHandle(found);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeHandle === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const updated = [...corners] as [Point, Point, Point, Point];
    updated[activeHandle] = { x: nx, y: ny };
    setCorners(updated);
  };

  const handleCanvasMouseUp = () => {
    setActiveHandle(null);
  };

  // Upload user artwork
  const handleUploadArtwork = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setArtworkUrl(ev.target.result as string);
        showToast('יצירת האמנות עודכנה במוקאפ בהצלחה!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Export Mockup as PNG
  const exportMockupPng = () => {
    // Hide handles temporarily for export
    setActiveHandle(-2);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mockup-${activeTemplate.id}-${Date.now()}.png`;
      a.click();
      setActiveHandle(null);
      showToast('המוקאפ יוצא כקובץ PNG ברזולוציה מלאה!', 'success');
    }, 50);
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Layers" className="w-4 h-4" />
            <span>מודול #7 — מאסטר מוקאפים אינטראקטיבי</span>
          </div>
          <h1 className="text-2xl font-black text-white">מיפוי פרספקטיבה ב-4 נקודות</h1>
          <p className="text-xs text-zinc-400">
            עיוות גאומטרי אמיתי (Quad Texture Mapping) מעל תבניות שילוט, שלטי חוצות, אריזות ומסכים.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleUploadArtwork}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Icon name="Upload" className="w-3.5 h-3.5 text-[#43D6CB]" />
            העלה יצירה (Artwork)
          </button>
          <button
            onClick={exportMockupPng}
            className="px-4 py-2 bg-[#43D6CB] hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            ייצוא מוקאפ PNG
          </button>
        </div>
      </div>

      {/* Templates Selector Carousel */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-zinc-400">בחר תבנית מוקאפ:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className={`p-2 rounded-xl border text-right transition flex flex-col justify-between h-20 ${
                activeTemplate.id === tpl.id
                  ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-white shadow-md'
                  : 'border-zinc-800 bg-[#183036] text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <span className="text-[10px] text-zinc-500 font-bold">{tpl.category}</span>
              <span className="text-xs font-bold truncate text-zinc-200">{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Workspace: Left Controls + Center Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Sidebar (4 cols) */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-bold text-white">בקרות פרספקטיבה ואינטגרציה</span>
            <button
              onClick={() => setCorners(activeTemplate.defaultCorners)}
              className="text-[#43D6CB] hover:underline text-[11px]"
            >
              איפוס נקודות
            </button>
          </div>

          {/* Blend Mode */}
          <div>
            <label className="text-zinc-300 font-bold block mb-1">מצב שילוב (Blend Mode):</label>
            <select
              value={blendMode}
              onChange={(e) => setBlendMode(e.target.value as GlobalCompositeOperation)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white focus:outline-none focus:border-[#43D6CB]"
            >
              <option value="multiply">Multiply (הכפלה - מתאים לנייר ושלטים)</option>
              <option value="normal">Normal (אטום)</option>
              <option value="screen">Screen (הבהרה - מתאים למסכים זוהרים)</option>
              <option value="overlay">Overlay (שילוב קונטרסטי)</option>
              <option value="soft-light">Soft Light (תאורה רכה)</option>
            </select>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>שקיפות (Opacity):</span>
              <span className="font-mono">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-[#43D6CB] h-1"
            />
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>בהירות תאורה:</span>
              <span className="font-mono">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full accent-[#43D6CB] h-1"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>ניגודיות (Contrast):</span>
              <span className="font-mono">{contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-[#43D6CB] h-1"
            />
          </div>

          {/* Shadow Depth */}
          <div>
            <div className="flex justify-between text-zinc-400 mb-1">
              <span>עומק צל (Drop Shadow):</span>
              <span className="font-mono">{shadowDepth}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={shadowDepth}
              onChange={(e) => setShadowDepth(Number(e.target.value))}
              className="w-full accent-[#43D6CB] h-1"
            />
          </div>

          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1.5 text-[11px] text-zinc-400">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Icon name="Maximize2" className="w-3.5 h-3.5 text-[#43D6CB]" />
              <span>הנחיות עריכת פרספקטיבה:</span>
            </div>
            <p>
              גרור ישירות בעכבר כל אחת מארבע הנקודות הכתומות (TL, TR, BR, BL) כדי להצמיד את העבודה בדיוק לזוויות המוקאפ.
            </p>
          </div>
        </div>

        {/* Center Live Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>תצוגה חיה ואינטראקטיבית</span>
            <span className="text-[11px] text-emerald-400 font-mono">Quad Mesh Active (64 Triangles)</span>
          </div>

          <div className="w-full aspect-[16/9] bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative select-none cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={1000}
              height={562}
              className="w-full h-full object-contain"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
