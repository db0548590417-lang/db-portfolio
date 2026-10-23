import React, { useState } from 'react';
import { StudioDialog } from '../common/StudioDialog';
import { Icon } from '../common/Icon';
import { MODULES_LIST } from '../../data/modules';
import { ModuleId } from '../../types';

const steps = [
  { title: 'ברוכים הבאים לסטודיו שלך', description: 'מתחילים מפרויקט, אוספים השראה והופכים רעיון לעיצוב.', tools: [] as ModuleId[] },
  { title: 'מוצאים כיוון', description: 'ארבעה כלים שיעזרו לעבור מבריף לרעיון.', tools: ['inspiration_hunter', 'creative_director', 'idea_factory', 'creative_analyzer'] as ModuleId[] },
  { title: 'נותנים לרעיון צורה', description: 'צבע, תמונה וקומפוזיציה — במקום אחד.', tools: ['color_lab', 'visual_generator', 'gestalt_lab', 'inspiration_mixer'] as ModuleId[] },
  { title: 'מלטשים ויוצאים לדרך', description: 'בודקים את העיצוב ומכינים את התוצרים.', tools: ['design_analyzer', 'export_studio'] as ModuleId[] },
];

export function WelcomeTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  return <StudioDialog open={open} onClose={onClose} titleId="tour-title">
    <div className="mb-7 flex items-center justify-between"><span className="text-sm font-medium text-[#43D6CB]">סיור קצר בסטודיו</span><button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10" aria-label="דלג על ההדרכה">דלג</button></div>
    <p className="mb-2 text-sm text-zinc-300">{index + 1} מתוך {steps.length}</p>
    <h2 id="tour-title" className="text-2xl font-bold leading-snug sm:text-3xl">{step.title}</h2>
    <p className="mb-7 mt-3 text-base leading-7 text-zinc-200">{step.description}</p>
    {index === 0 ? <div className="space-y-3">
      {[['FolderOpen', 'יוצרים פרויקט', 'נותנים שם ומוסיפים את הבריף דרך ״עריכת פרויקט״.'], ['Compass', 'בוחרים כלי', 'כל כלי נמצא בתפריט הצד. אפשר לעבור ביניהם בכל שלב.'], ['Download', 'שומרים ומייצאים', 'שומרים את הכיוונים שאהבת ומוציאים תוצרים בסטודיו הייצוא.']].map(([icon, title, text]) => <div key={title} className="flex gap-4 rounded-2xl bg-[#183036] p-4"><Icon name={icon} className="mt-1 h-5 w-5 shrink-0 text-[#43D6CB]" /><div><h3 className="text-base font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-200">{text}</p></div></div>)}
    </div> : <div className="grid gap-3 sm:grid-cols-2">{step.tools.map(id => { const tool = MODULES_LIST.find(item => item.id === id)!; return <div key={id} className="rounded-2xl bg-[#183036] p-4"><Icon name={tool.iconName} className="mb-3 h-6 w-6 text-[#43D6CB]" /><h3 className="text-base font-bold">{tool.titleHebrew}</h3><p className="mt-2 text-sm leading-6 text-zinc-200">{tool.subtitleHebrew}</p></div>; })}</div>}
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/15 pt-5">
      <div className="flex gap-2" aria-label={`שלב ${index + 1} מתוך ${steps.length}`}>{steps.map((_, i) => <span key={i} className={`h-2 rounded-full ${i === index ? 'w-6 bg-[#43D6CB]' : 'w-2 bg-white/25'}`} />)}</div>
      <div className="flex gap-2">{index > 0 && <button onClick={() => setIndex(index - 1)} className="rounded-xl border border-white/20 px-4 py-3 text-sm">חזרה</button>}<button onClick={() => index === steps.length - 1 ? onClose() : setIndex(index + 1)} className="rounded-xl bg-[#43D6CB] px-5 py-3 text-sm font-bold text-[#183036]">{index === steps.length - 1 ? 'מתחילים ליצור' : 'המשך'}</button></div>
    </div>
  </StudioDialog>;
}
