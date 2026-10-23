import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import jsPDF from 'jspdf';

export const ExportStudio: React.FC = () => {
  const {
    activeProject,
    exportProjectBackup,
    showToast,
  } = useProject();

  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'svg' | 'pdf' | 'json' | 'css'>('png');
  const [scale, setScale] = useState<number>(2); // 1x, 2x, 4x
  const [baseWidth, setBaseWidth] = useState<number>(1920);
  const [baseHeight, setBaseHeight] = useState<number>(1080);
  const [includeBackground, setIncludeBackground] = useState<boolean>(true);
  const [customFilename, setCustomFilename] = useState<string>(
    `${activeProject.name.replace(/\s+/g, '_')}_export`
  );

  // Pick what item to export
  const [exportTarget, setExportTarget] = useState<'project_backup' | 'latest_typography' | 'active_palette' | 'first_concept'>('project_backup');

  // Calculated pixel dimensions
  const finalWidth = baseWidth * scale;
  const finalHeight = baseHeight * scale;

  // Handle Export Execution
  const handleExecuteExport = () => {
    const filename = (customFilename || 'inspira_export').replace(/\.[^/.]+$/, '');

    // 1. JSON Backup
    if (exportFormat === 'json') {
      exportProjectBackup();
      return;
    }

    // 2. CSS Export
    if (exportFormat === 'css') {
      const palette = activeProject.colorPalettes[0];
      const colors = palette ? palette.colors : ['#0C0D0E', '#7D6A4E', '#D4AF37'];
      const cssString = `/* INSPIRA STUDIO — ${activeProject.name} */\n:root {\n  --primary: ${colors[0] || '#183036'};\n  --accent: ${colors[2] || '#43D6CB'};\n  --luxury-gold: ${colors[3] || '#D4AF37'};\n}\n.inspira-gradient {\n  background: linear-gradient(135deg, ${colors.join(', ')});\n}\n`;

      const blob = new Blob([cssString], { type: 'text/css;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.css`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('קובץ CSS הורד בהצלחה', 'success');
      return;
    }

    // 3. SVG Export
    if (exportFormat === 'svg') {
      const typo = activeProject.typographyDesigns[0];
      const svgText = typo ? typo.text : activeProject.brief.productOrService;
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${baseWidth} ${baseHeight}" width="${finalWidth}" height="${finalHeight}">
  ${includeBackground ? `<rect width="${baseWidth}" height="${baseHeight}" fill="#183036" />` : ''}
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8C7449" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#FFF3D1" />
    </linearGradient>
  </defs>
  <text x="50%" y="50%" font-family="sans-serif" font-size="${baseHeight / 10}" font-weight="900" fill="url(#gold)" text-anchor="middle" dominant-baseline="middle" direction="rtl">
    ${svgText}
  </text>
  <text x="50%" y="${baseHeight * 0.7}" font-family="sans-serif" font-size="${baseHeight / 30}" fill="#9CA3AF" text-anchor="middle" direction="rtl">
    ${activeProject.name} — נוצר ב-INSPIRA STUDIO
  </text>
</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('קובץ SVG וקטורי אמיתי יוצא בהצלחה!', 'success');
      return;
    }

    // 4. PDF Export using jsPDF
    if (exportFormat === 'pdf') {
      try {
        const doc = new jsPDF({
          orientation: baseWidth > baseHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [baseWidth, baseHeight],
        });

        if (includeBackground) {
          doc.setFillColor(18, 19, 22);
          doc.rect(0, 0, baseWidth, baseHeight, 'F');
        }

        doc.setTextColor(249, 115, 22);
        doc.setFontSize(28);
        doc.text(`INSPIRA STUDIO — ${activeProject.name}`, baseWidth / 2, 60, { align: 'center' });

        doc.setTextColor(230, 230, 230);
        doc.setFontSize(16);
        doc.text(`Client: ${activeProject.clientName || 'General'}`, baseWidth / 2, 90, { align: 'center' });

        // Add concept details
        const firstConcept = activeProject.concepts[0];
        if (firstConcept) {
          doc.setTextColor(212, 175, 55);
          doc.setFontSize(20);
          doc.text(`Concept: ${firstConcept.conceptName}`, 40, 150);

          doc.setTextColor(200, 200, 200);
          doc.setFontSize(14);
          doc.text(`Headline: "${firstConcept.suggestedHeadline}"`, 40, 180);
          doc.text(`Technique: ${firstConcept.suggestedDesignTechnique}`, 40, 210);

          const splitIdea = doc.splitTextToSize(`Core Idea: ${firstConcept.coreIdea}`, baseWidth - 80);
          doc.text(splitIdea, 40, 240);
        }

        doc.save(`${filename}.pdf`);
        showToast('קובץ PDF מקצועי יוצא בהצלחה!', 'success');
      } catch (err: any) {
        showToast('שגיאה בייצוא PDF', 'error');
      }
      return;
    }

    // 5. Raster PNG / JPG Export with real Canvas rendering
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (includeBackground || exportFormat === 'jpg') {
      ctx.fillStyle = '#183036';
      ctx.fillRect(0, 0, finalWidth, finalHeight);
    }

    // Render design card onto canvas
    const gradient = ctx.createLinearGradient(0, 0, finalWidth, finalHeight);
    gradient.addColorStop(0, '#8C7449');
    gradient.addColorStop(0.5, '#D4AF37');
    gradient.addColorStop(1, '#FFF3D1');

    ctx.fillStyle = gradient;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(finalHeight / 12)}px 'Heebo', sans-serif`;

    const typo = activeProject.typographyDesigns[0];
    const textToDraw = typo ? typo.text : activeProject.brief.productOrService;
    ctx.fillText(textToDraw, finalWidth / 2, finalHeight / 2 - 30);

    ctx.font = `normal ${Math.round(finalHeight / 32)}px 'Heebo', sans-serif`;
    ctx.fillStyle = '#A1A1AA';
    ctx.fillText(
      `${activeProject.name} • ${finalWidth}x${finalHeight}px (${scale}x)`,
      finalWidth / 2,
      finalHeight / 2 + 50
    );

    const mime = exportFormat === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.${exportFormat}`;
    a.click();
    showToast(`קובץ ${exportFormat.toUpperCase()} יוצא ברזולוציה של ${finalWidth}x${finalHeight}px!`, 'success');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Download" className="w-4 h-4" />
            <span>מודול #10 — סטודיו ייצוא מקצועי</span>
          </div>
          <h1 className="text-2xl font-black text-white">ייצוא נכסים, וקטורים, PDF וגיבוי מלא</h1>
          <p className="text-xs text-zinc-400">
            שליטה מלאה בקנה מידה (1x, 2x, 4x), הבחנה בין רזולוציית פיקסלים ל-DPI, ייצוא וקטורי אמיתי וקובצי PDF.
          </p>
        </div>

        <button
          onClick={handleExecuteExport}
          className="px-6 py-2.5 bg-gradient-to-r from-[#43D6CB] to-[#43D6CB] hover:from-teal-500 hover:to-teal-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-500/25"
        >
          <Icon name="Download" className="w-4 h-4" />
          <span>בצע ייצוא עכשיו ({exportFormat.toUpperCase()})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Export Settings (5 cols) */}
        <div className="lg:col-span-5 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-5 text-xs">
          {/* Format selection */}
          <div>
            <label className="text-zinc-300 font-bold block mb-2">פורמט ייצוא מבוקש:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'png', label: 'PNG (רסטר שקוף)' },
                { id: 'jpg', label: 'JPG (תמונה קומפקטית)' },
                { id: 'svg', label: 'SVG (וקטורי אמיתי)' },
                { id: 'pdf', label: 'PDF (מסמך מודפס)' },
                { id: 'json', label: 'JSON (גיבוי מלא)' },
                { id: 'css', label: 'CSS (פלטת צבעים)' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    exportFormat === fmt.id
                      ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-white font-bold'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-xs uppercase font-mono">{fmt.id}</span>
                  <span className="text-[9px] text-zinc-500 block mt-0.5">{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="text-zinc-300 font-bold block mb-1">שם קובץ לייצוא:</label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 font-mono text-white text-xs focus:outline-none focus:border-[#43D6CB]"
            />
          </div>

          {/* Scale Multiplier */}
          {['png', 'jpg'].includes(exportFormat) && (
            <div>
              <label className="text-zinc-300 font-bold block mb-1.5">קנה מידה ורזולוציה (Scale Multiplier):</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`py-2 rounded-lg border font-mono font-bold text-xs transition ${
                      scale === s
                        ? 'border-[#43D6CB] bg-[#43D6CB] text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s}x {s === 4 ? '(Ultra HD 4K)' : s === 2 ? '(Retina 2x)' : '(1x Standard)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1">רוחב בסיס (Width px):</label>
              <input
                type="number"
                value={baseWidth}
                onChange={(e) => setBaseWidth(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">גובה בסיס (Height px):</label>
              <input
                type="number"
                value={baseHeight}
                onChange={(e) => setBaseHeight(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Transparency / Background */}
          {['png', 'svg'].includes(exportFormat) && (
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-200 block">כלול רקע כהה:</span>
                <span className="text-[10px] text-zinc-500">בטל סימון לשמירה עם שקיפות (Transparent PNG/SVG)</span>
              </div>
              <input
                type="checkbox"
                checked={includeBackground}
                onChange={(e) => setIncludeBackground(e.target.checked)}
                className="w-4 h-4 accent-[#43D6CB] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Right: Technical Inspector & Live Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Metadata Inspector Box */}
          <div className="p-5 bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3 text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Icon name="Info" className="w-4 h-4 text-[#43D6CB]" />
              <span>מפרט טכני של קובץ הייצוא:</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">פורמט קובץ</span>
                <span className="font-mono font-bold text-white uppercase text-sm">
                  .{exportFormat}
                </span>
              </div>

              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">מימדים בפועל (Actual Pixels)</span>
                <span className="font-mono font-bold text-[#43D6CB] text-sm">
                  {finalWidth} × {finalHeight}
                </span>
              </div>

              <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">צפיפות מומלצת (DPI)</span>
                <span className="font-mono font-bold text-zinc-300 text-sm">
                  {scale >= 2 ? '300 DPI (דפוס פרימיום)' : '72 DPI (מסכים)'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 space-y-1">
              <strong className="text-zinc-200 block">דיוק הנדסי ומקצועיות:</strong>
              <p>
                {exportFormat === 'svg'
                  ? 'הייצוא שומר על גאומטריית נתיבים וקטורית תקינה הניתנת להגדלה אינסופית ללא ירידת איכות.'
                  : exportFormat === 'pdf'
                  ? 'מסמך PDF וקטורי מובנה עם פירוט בריף, כותרות והנחיות קריאייטיב להדפסה.'
                  : exportFormat === 'json'
                  ? 'גיבוי מלא של הפרויקט הכולל את כל 12 המודולים וניתן לשחזור בכל עת.'
                  : 'קובץ רסטר באיכות גבוהה המחושב בדיוק לפי קנה המידה שנבחר.'}
              </p>
            </div>
          </div>

          {/* Visual Simulation Box */}
          <div className="bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-zinc-300 block">תצוגת סימולציה מקדימה של הייצוא:</span>
            <div
              className={`w-full aspect-[16/9] rounded-xl border border-zinc-800 overflow-hidden flex flex-col items-center justify-center p-6 text-center ${
                includeBackground || exportFormat === 'jpg' ? 'bg-[#183036]' : 'canvas-checkerboard'
              }`}
            >
              <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-md space-y-2">
                <span className="text-[10px] uppercase tracking-widest text-[#43D6CB] font-bold">
                  {activeProject.clientName || 'INSPIRA STUDIO'}
                </span>
                <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-teal-300 to-amber-100">
                  {activeProject.typographyDesigns[0]?.text || activeProject.brief.productOrService}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {activeProject.name} — ייצוא מוכן
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
