import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { TypographyDesign } from '../../types';

interface TypographyHistoryState {
  text: string;
  fontFamily: string;
  fontSize: number;
  letterSpacing: number;
  lineHeight: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  isCurved: boolean;
  curveRadius: number;
  curveArch: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  textAlign: 'right' | 'center' | 'left';
  posX: number;
  posY: number;
  fillType: 'solid' | 'gold_gradient' | 'chrome_gradient';
}

const FONTS_LIST = [
  { id: 'Heebo', name: 'Heebo (מודרני נקי, גרוטסק)' },
  { id: 'Assistant', name: 'Assistant (אלגנטי, קריא ורך)' },
  { id: 'Frank Ruhl Libre', name: 'Frank Ruhl Libre (סריף יוקרתי, קלאסי)' },
  { id: 'Rubik', name: 'Rubik (נועז, שובב ועכשווי)' },
  { id: 'Secular One', name: 'Secular One (כותרות עבות ומונומנטליות)' },
  { id: 'David Libre', name: 'David Libre (מסורתי, ספרי קודש ויוקרה)' },
];

export const TypographyPlayground: React.FC = () => {
  const { updateActiveProject, showToast } = useProject();

  const [state, setState] = useState<TypographyHistoryState>({
    text: 'יש מלך בקידוש',
    fontFamily: 'Frank Ruhl Libre',
    fontSize: 54,
    letterSpacing: 4,
    lineHeight: 1.2,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    isCurved: false,
    curveRadius: 180,
    curveArch: 80,
    fillColor: '#D4AF37',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 10,
    shadowOffsetX: 2,
    shadowOffsetY: 6,
    textAlign: 'center',
    posX: 400,
    posY: 220,
    fillType: 'gold_gradient',
  });

  // Undo / Redo history
  const [history, setHistory] = useState<TypographyHistoryState[]>([state]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 400,
    posY: 220,
  });

  const updateState = (partial: Partial<TypographyHistoryState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial };
      // Push to history
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(next);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setState(history[prevIdx]);
      showToast('פעולה בוטלה (Undo)', 'info');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setState(history[nextIdx]);
      showToast('בוצע שוב (Redo)', 'info');
    }
  };

  // Canvas Mouse Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: state.posX,
      posY: state.posY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setState((prev) => ({
      ...prev,
      posX: Math.round(dragStartRef.current.posX - dx), // RTL direction
      posY: Math.round(dragStartRef.current.posY + dy),
    }));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // save to history
      const newHist = history.slice(0, historyIndex + 1);
      newHist.push(state);
      setHistory(newHist);
      setHistoryIndex(newHist.length - 1);
    }
  };

  // Export SVG file
  const exportSvg = () => {
    if (!canvasRef.current) return;
    const svgData = new XMLSerializer().serializeToString(canvasRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `typography-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('קובץ SVG וקטורי יוצא בהצלחה!', 'success');
  };

  // Save to active project
  const saveToProject = () => {
    const design: TypographyDesign = {
      id: 'typo-' + Date.now(),
      text: state.text,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      fontWeight: 'bold',
      letterSpacing: state.letterSpacing,
      lineHeight: state.lineHeight,
      rotation: state.rotation,
      scaleX: state.scaleX,
      scaleY: state.scaleY,
      skewX: state.skewX,
      isCurved: state.isCurved,
      curveRadius: state.curveRadius,
      fillColor: state.fillColor,
      strokeColor: state.strokeColor,
      strokeWidth: state.strokeWidth,
      shadowColor: state.shadowColor,
      shadowBlur: state.shadowBlur,
      shadowOffsetX: state.shadowOffsetX,
      shadowOffsetY: state.shadowOffsetY,
      textAlign: state.textAlign,
      canvasWidth: 800,
      canvasHeight: 450,
      backgroundColor: '#183036',
      updatedAt: Date.now(),
    };

    updateActiveProject((p) => ({
      ...p,
      typographyDesigns: [design, ...p.typographyDesigns],
    }));
    showToast('הקומפוזיציה הטיפוגרפית נשמרה לפרויקט!', 'success');
  };

  // Curved text path calculations
  // Arc path from (150, 250) to (650, 250) bowing upward or downward
  const arcHeight = state.curveArch;
  const pathD = `M 100,${state.posY} Q 400,${state.posY - arcHeight} 700,${state.posY}`;

  // Fill gradient definition
  const fillValue =
    state.fillType === 'gold_gradient'
      ? 'url(#goldGrad)'
      : state.fillType === 'chrome_gradient'
      ? 'url(#chromeGrad)'
      : state.fillColor;

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Type" className="w-4 h-4" />
            <span>מודול #6 — מגרש טיפוגרפיה עברית</span>
          </div>
          <h1 className="text-2xl font-black text-white">עורך טיפוגרפיה וקטורי חי</h1>
          <p className="text-xs text-zinc-400">
            עיקול טקסט עברי אמיתי לאורך נתיב SVG, מתיחה, זווית, צלליות ואוטליין עם ייצוא SVG טהור.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg text-xs transition"
            title="בטל (Undo)"
          >
            <Icon name="RotateCcw" className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg text-xs transition"
            title="בצע שוב (Redo)"
          >
            <Icon name="RotateCcw" className="w-4 h-4 -scale-x-100" />
          </button>
          <button
            onClick={exportSvg}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
          >
            <Icon name="Download" className="w-3.5 h-3.5" />
            ייצוא SVG
          </button>
          <button
            onClick={saveToProject}
            className="px-4 py-2 bg-[#43D6CB] hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20"
          >
            <Icon name="Plus" className="w-3.5 h-3.5" />
            שמור לפרויקט
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Sidebar (Left in RTL is right column, so 4 cols) */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 max-h-[750px] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">טקסט בעברית:</label>
            <textarea
              value={state.text}
              onChange={(e) => updateState({ text: e.target.value })}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#43D6CB]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">פונט עברי:</label>
            <select
              value={state.fontFamily}
              onChange={(e) => updateState({ fontFamily: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#43D6CB]"
            >
              {FONTS_LIST.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Size & Letter Spacing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>גודל גופן:</span>
                <span className="font-mono">{state.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="120"
                value={state.fontSize}
                onChange={(e) => updateState({ fontSize: Number(e.target.value) })}
                className="w-full accent-[#43D6CB] h-1"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span>מרווח אותיות:</span>
                <span className="font-mono">{state.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-5"
                max="30"
                value={state.letterSpacing}
                onChange={(e) => updateState({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-[#43D6CB] h-1"
              />
            </div>
          </div>

          {/* Curved Text Mode */}
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">טקסט מעוקל על קשת (Curved Path)</span>
              <input
                type="checkbox"
                checked={state.isCurved}
                onChange={(e) => updateState({ isCurved: e.target.checked })}
                className="accent-[#43D6CB] w-4 h-4 cursor-pointer"
              />
            </div>
            {state.isCurved && (
              <div>
                <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                  <span>עוצמת הקשת:</span>
                  <span className="font-mono">{state.curveArch}px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  value={state.curveArch}
                  onChange={(e) => updateState({ curveArch: Number(e.target.value) })}
                  className="w-full accent-[#43D6CB] h-1"
                />
              </div>
            )}
          </div>

          {/* Scale X, Scale Y & Skew */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-300">טרנספורמציות גאומטריות:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block mb-1">מתיחה X ({state.scaleX})</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={state.scaleX}
                  onChange={(e) => updateState({ scaleX: Number(e.target.value) })}
                  className="w-full accent-[#43D6CB] h-1"
                />
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block mb-1">מתיחה Y ({state.scaleY})</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={state.scaleY}
                  onChange={(e) => updateState({ scaleY: Number(e.target.value) })}
                  className="w-full accent-[#43D6CB] h-1"
                />
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block mb-1">הטיה Skew ({state.skewX}°)</span>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={state.skewX}
                  onChange={(e) => updateState({ skewX: Number(e.target.value) })}
                  className="w-full accent-[#43D6CB] h-1"
                />
              </div>
            </div>
          </div>

          {/* Fill Type */}
          <div>
            <label className="text-xs font-bold text-zinc-300 block mb-1">מילוי צבע:</label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <button
                onClick={() => updateState({ fillType: 'gold_gradient' })}
                className={`py-1.5 text-xs font-bold rounded border transition ${
                  state.fillType === 'gold_gradient'
                    ? 'border-[#43D6CB] bg-[#43D6CB]/20 text-[#43D6CB]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                זהב מוטבע
              </button>
              <button
                onClick={() => updateState({ fillType: 'chrome_gradient' })}
                className={`py-1.5 text-xs font-bold rounded border transition ${
                  state.fillType === 'chrome_gradient'
                    ? 'border-[#43D6CB] bg-[#43D6CB]/20 text-[#43D6CB]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                כרום כסוף
              </button>
              <button
                onClick={() => updateState({ fillType: 'solid' })}
                className={`py-1.5 text-xs font-bold rounded border transition ${
                  state.fillType === 'solid'
                    ? 'border-[#43D6CB] bg-[#43D6CB]/20 text-[#43D6CB]'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                צבע אחיד
              </button>
            </div>
            {state.fillType === 'solid' && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={state.fillColor}
                  onChange={(e) => updateState({ fillColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={state.fillColor}
                  onChange={(e) => updateState({ fillColor: e.target.value })}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-xs text-white font-mono"
                />
              </div>
            )}
          </div>

          {/* Stroke / Outline */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>עובי מסגרת (Stroke):</span>
              <span className="font-mono">{state.strokeWidth}px</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={state.strokeColor}
                onChange={(e) => updateState({ strokeColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer"
              />
              <input
                type="range"
                min="0"
                max="10"
                value={state.strokeWidth}
                onChange={(e) => updateState({ strokeWidth: Number(e.target.value) })}
                className="flex-1 accent-[#43D6CB] h-1"
              />
            </div>
          </div>

          {/* Shadow */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>טשטוש צל (Shadow Blur):</span>
              <span className="font-mono">{state.shadowBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={state.shadowBlur}
              onChange={(e) => updateState({ shadowBlur: Number(e.target.value) })}
              className="w-full accent-[#43D6CB] h-1"
            />
          </div>

          <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 leading-relaxed">
            💡 <strong>מיקום:</strong> ניתן לגרור את הטקסט בחופשיות עם העכבר ישירות מעל הקנבס, או לאפס למרכז.
          </div>
        </div>

        {/* Live SVG Canvas */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>קנבס וקטורי חי (800x450)</span>
            <button
              onClick={() => updateState({ posX: 400, posY: 220, rotation: 0 })}
              className="text-[#43D6CB] hover:underline"
            >
              איפוס למרכז
            </button>
          </div>

          <div
            className="w-full aspect-[16/9] canvas-checkerboard rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl relative select-none cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <svg
              ref={canvasRef}
              viewBox="0 0 800 450"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gold Gradient */}
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8C7449" />
                  <stop offset="25%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#FFF3D1" />
                  <stop offset="75%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#7D6A4E" />
                </linearGradient>

                {/* Chrome Gradient */}
                <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="45%" stopColor="#E2E8F0" />
                  <stop offset="50%" stopColor="#64748B" />
                  <stop offset="100%" stopColor="#1E293B" />
                </linearGradient>

                {/* Shadow Filter */}
                <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx={state.shadowOffsetX}
                    dy={state.shadowOffsetY}
                    stdDeviation={state.shadowBlur / 2}
                    floodColor={state.shadowColor}
                  />
                </filter>

                {/* Curved Text Path */}
                {state.isCurved && (
                  <path id="curvePath" d={pathD} fill="none" stroke="transparent" />
                )}
              </defs>

              {/* Background Plate */}
              <rect width="800" height="450" fill="#131417" />
              <rect x="20" y="20" width="760" height="410" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />

              {/* Text Render */}
              <g
                transform={`translate(${state.posX}, ${state.posY}) rotate(${state.rotation}) scale(${state.scaleX}, ${state.scaleY}) skewX(${state.skewX}) translate(${-state.posX}, ${-state.posY})`}
                filter="url(#textShadow)"
              >
                {state.isCurved ? (
                  <text
                    fontSize={state.fontSize}
                    fontFamily={state.fontFamily}
                    fontWeight="bold"
                    letterSpacing={state.letterSpacing}
                    fill={fillValue}
                    stroke={state.strokeWidth > 0 ? state.strokeColor : 'none'}
                    strokeWidth={state.strokeWidth}
                    textAnchor="middle"
                  >
                    <textPath href="#curvePath" startOffset="50%" textAnchor="middle">
                      {state.text}
                    </textPath>
                  </text>
                ) : (
                  <text
                    x={state.posX}
                    y={state.posY}
                    fontSize={state.fontSize}
                    fontFamily={state.fontFamily}
                    fontWeight="bold"
                    letterSpacing={state.letterSpacing}
                    fill={fillValue}
                    stroke={state.strokeWidth > 0 ? state.strokeColor : 'none'}
                    strokeWidth={state.strokeWidth}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {state.text}
                  </text>
                )}
              </g>
            </svg>
          </div>

          <div className="text-[11px] text-zinc-500 flex items-center justify-between px-2">
            <span>גופן: {state.fontFamily} • מילוי: {state.fillType}</span>
            <span>פורמט שמירה: וקטורי אמיתי (SVG) ללא ירידת איכות</span>
          </div>
        </div>
      </div>
    </div>
  );
};
