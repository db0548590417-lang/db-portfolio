import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Icon } from '../common/Icon';
import { GestaltConcept } from '../../types';

const GESTALT_PRINCIPLES = [
  { id: 'Closure', name: 'Closure (סגירות)', desc: 'המוח משלים קווים פתוחים או צלליות חסרות' },
  { id: 'Proximity', name: 'Proximity (קרבה)', desc: 'אלמנטים קרובים נתפסים כקבוצה אחת וצורה חדשה' },
  { id: 'Continuity', name: 'Continuity (המשכיות)', desc: 'העין מובלת בתנועה רציפה וזורמת' },
  { id: 'Similarity', name: 'Similarity (דמיון)', desc: 'צורות דומות מתלכדות ויוצרות אנומליה מכוונת' },
  { id: 'Figure-ground', name: 'Figure-Ground (צורה ורקע)', desc: 'החלפת תפקידים בין הדמות לרקע' },
  { id: 'Negative space', name: 'Negative Space (מרחב שלילי)', desc: 'החלל הלבן יוצר אובייקט סודי שני' },
  { id: 'Double meaning', name: 'Double Meaning (משמעות כפולה)', desc: 'אלמנט אחד עם שני פירושים ויזואליים' },
];

export const GestaltLab: React.FC = () => {
  const { activeProject, updateActiveProject, globalPrefs, setSelectedConceptForVisual, setActiveModule, showToast } = useProject();

  const [product, setProduct] = useState(activeProject.brief.productOrService || 'הרינג מטיאס וסלמון מעושן לקידוש');
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>(['Figure-ground', 'Negative space', 'Closure']);
  const [isLoading, setIsLoading] = useState(false);
  const [concepts, setConcepts] = useState<GestaltConcept[]>(activeProject.gestaltConcepts || []);
  const [activeSvgPreview, setActiveSvgPreview] = useState<string | null>(null);

  const togglePrinciple = (id: string) => {
    setSelectedPrinciples((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!product.trim()) {
      showToast('נא להזין מוצר או נושא', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/gestalt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product,
          selectedPrinciples,
          excludePeople: globalPrefs.excludePeople,
        }),
      });

      if (!res.ok) throw new Error('שגיאה בהפקת קונספטי גשטאלט');
      const data = await res.json();
      if (Array.isArray(data.concepts)) {
        setConcepts(data.concepts);
        updateActiveProject((p) => ({
          ...p,
          gestaltConcepts: data.concepts,
        }));
        showToast(`הופקו ${data.concepts.length} קונספטי גשטאלט עם אבות טיפוס SVG!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'שגיאה בהפקת גשטאלט', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sendToVisual = (gc: GestaltConcept) => {
    const concept = {
      id: 'concept-gestalt-' + Date.now(),
      conceptName: `${gc.principle}: ${gc.headline}`,
      coreIdea: gc.visualConcept,
      visualExecution: gc.executionSuggestion,
      suggestedHeadline: gc.headline,
      emotionalMechanism: `עקרון גשטאלט ${gc.principle}`,
      whyItWorks: 'פענוח פסיכולוגי מהיר ומספק',
      suggestedDesignTechnique: gc.principle,
      imageGenerationPrompt: gc.imagePrompt,
      createdAt: Date.now(),
    };
    setSelectedConceptForVisual(concept);
    setActiveModule('visual_generator');
    showToast('קונספט הגשטאלט הועבר למחולל הוויזואלי', 'success');
  };

  return (
    <div className="h-full overflow-y-auto studio-grid p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#43D6CB] font-bold mb-1">
            <Icon name="Shapes" className="w-4 h-4" />
            <span>מודול #6 — מעבדת גשטאלט ומרחב שלילי</span>
          </div>
          <h1 className="text-2xl font-black text-white">מחולל קונספטים מבוסס פסיכולוגיית גשטאלט</h1>
          <p className="text-xs text-zinc-400">
            סגירות, קרבה, צורה-רקע, מרחב שלילי ואבות טיפוס וקטוריים מיידיים.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-5 py-2.5 bg-gradient-to-r from-[#43D6CB] to-[#43D6CB] hover:from-teal-500 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-teal-500/25"
        >
          {isLoading ? (
            <>
              <Icon name="RefreshCw" className="w-4 h-4 animate-spin" />
              מייצר קונספטי גשטאלט...
            </>
          ) : (
            <>
              <Icon name="Sparkles" className="w-4 h-4" />
              הפק קונספטים גשטאלטיים
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls (4 cols) */}
        <div className="lg:col-span-4 bg-[#103F46] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
          <div>
            <label className="text-zinc-300 font-bold block mb-1">מוצר או נושא לקמפיין:</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#43D6CB]"
            />
          </div>

          <div>
            <label className="text-zinc-300 font-bold block mb-1.5">עקרונות גשטאלט מבוקשים:</label>
            <div className="space-y-1.5">
              {GESTALT_PRINCIPLES.map((gp) => {
                const isChecked = selectedPrinciples.includes(gp.id);
                return (
                  <button
                    key={gp.id}
                    onClick={() => togglePrinciple(gp.id)}
                    className={`w-full text-right p-2.5 rounded-xl border transition ${
                      isChecked
                        ? 'border-[#43D6CB] bg-[#43D6CB]/10 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{gp.name}</span>
                      <span className="text-[10px] font-mono">{isChecked ? '✓' : '+'}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5">{gp.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Concepts & Prototype Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {concepts.length === 0 && !isLoading && (
            <div className="p-12 text-center bg-[#103F46] border border-zinc-800 rounded-2xl space-y-3">
              <Icon name="Shapes" className="w-8 h-8 text-[#43D6CB] mx-auto opacity-70" />
              <h3 className="font-bold text-white text-sm">מעבדת הגשטאלט ממתינה למוצר שלך</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                בחר את העקרונות שמעניינים אותך (Figure-Ground, Negative Space, Closure) ולחץ על "הפק קונספטים גשטאלטיים".
              </p>
            </div>
          )}

          {concepts.map((concept, idx) => (
            <div
              key={concept.id || idx}
              className="bg-[#183036] border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#43D6CB]/15 text-[#43D6CB] border border-[#43D6CB]/30 mb-1 inline-block">
                    עקרון: {concept.principle}
                  </span>
                  <h3 className="text-base font-black text-white">{concept.headline}</h3>
                </div>

                <button
                  onClick={() => sendToVisual(concept)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition flex items-center gap-1.5 border border-zinc-700"
                >
                  <Icon name="Wand2" className="w-3.5 h-3.5 text-amber-400" />
                  הדמיה ויזואלית
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-zinc-500 text-[11px] font-bold block">הרעיון הוויזואלי:</span>
                    <p className="text-zinc-300 leading-relaxed">{concept.visualConcept}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] font-bold block">הצעת ביצוע גרפית:</span>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">{concept.executionSuggestion}</p>
                  </div>
                </div>

                {/* SVG Visual Prototype Render */}
                {concept.svgPrototypeCode && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-zinc-400 font-bold block">אב-טיפוס גאומטרי (SVG Prototype):</span>
                    <div
                      className="w-full h-36 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center p-2 overflow-hidden shadow-inner"
                      dangerouslySetInnerHTML={{ __html: concept.svgPrototypeCode }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
