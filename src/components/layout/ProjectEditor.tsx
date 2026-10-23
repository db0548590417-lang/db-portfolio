import React, { useEffect, useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import type { Project } from '../../types';

const brandFields: {key: keyof NonNullable<Project['brand']>; label: string; long?: boolean}[] = [
  {key:'endClient',label:'לקוח הקצה'}, {key:'brandName',label:'שם המותג המפורסם'},
  {key:'industry',label:'תחום פעילות'}, {key:'brandDescription',label:'תיאור המותג',long:true},
  {key:'brandValues',label:'ערכי המותג',long:true}, {key:'brandVoice',label:'טון ושפה פרסומית',long:true},
  {key:'audience',label:'קהל היעד של המותג',long:true}, {key:'brandRestrictions',label:'מגבלות מותג',long:true},
  {key:'typography',label:'גופנים וטיפוגרפיה'},
];
const briefFields: {key: keyof Project['brief']; label: string}[] = [
  {key:'productOrService', label:'מוצר או שירות'}, {key:'targetAudience',label:'קהל יעד לקמפיין'},
  {key:'campaignObjective',label:'מטרת הפרסום'}, {key:'primaryMessage',label:'המסר המרכזי'},
  {key:'brandPersonality',label:'אופי המותג'}, {key:'desiredEmotions',label:'רגשות רצויים'},
  {key:'creativeRestrictions',label:'מגבלות הקריאייטיב'}, {key:'preferredVisualStyle',label:'סגנון חזותי'},
];
export const ProjectEditor: React.FC<{onClose:()=>void}> = ({onClose}) => {
  const {activeProject, updateActiveProject, showToast} = useProject();
  const [draft,setDraft] = useState<Project>(activeProject);
  useEffect(()=>setDraft(activeProject),[activeProject.id]);
  const inputClass='w-full rounded-lg bg-[#183036] border border-white/15 px-3 py-2 text-[#F7F8F3] focus:outline-none focus:border-[#43D6CB]';
  const field=(label:string,value:string,onChange:(s:string)=>void,long=false)=><label className="text-xs text-zinc-200 font-semibold block" key={label}><span className="block mb-1">{label}</span>{long?<textarea rows={2} value={value} onChange={e=>onChange(e.target.value)} className={inputClass}/>:<input value={value} onChange={e=>onChange(e.target.value)} className={inputClass}/>}</label>;
  const save=()=>{updateActiveProject(old=>({...old,...draft,id:old.id,updatedAt:Date.now()}));showToast('פרטי הפרויקט והמותג נשמרו','success');onClose();};
  return <div dir="rtl" className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <section role="dialog" aria-modal="true" aria-label="עריכת פרויקט" className="w-full max-w-4xl max-h-[94vh] overflow-y-auto bg-[#103F46] border border-[#43D6CB]/40 rounded-2xl shadow-2xl p-5 space-y-5 text-right">
      <header className="flex items-center justify-between sticky top-0 bg-[#103F46] py-2 z-10"><div><h2 className="text-xl font-black text-[#F7F8F3]">תיק הפרויקט והמותג</h2><p className="text-xs text-zinc-300">מגדירים פעם אחת. מודול 2 משתמש בפרטים באופן אוטומטי.</p></div><button onClick={onClose} className="text-white border border-white/20 rounded-lg px-3 py-2">סגור ✕</button></header>
      <div className="grid sm:grid-cols-2 gap-3">{field('שם הפרויקט',draft.name,v=>setDraft(d=>({...d,name:v})))}{field('הלקוח המזמין',draft.clientName,v=>setDraft(d=>({...d,clientName:v})))}{brandFields.map(({key,label,long})=>field(label,String(draft.brand?.[key]||''),v=>setDraft(d=>({...d,brand:{...d.brand,[key]:v}})),long))}</div>
      <section className="border-t border-white/15 pt-4"><h3 className="font-bold text-white mb-3">בריף הקמפיין</h3><div className="grid sm:grid-cols-2 gap-3">{briefFields.map(({key,label})=>field(label,String(draft.brief[key]||''),v=>setDraft(d=>({...d,brief:{...d.brief,[key]:v}}))))}</div></section>
      <section className="border-t border-white/15 pt-4"><h3 className="font-bold text-white mb-3">קריאייטיב קיים / מאושר</h3><div className="grid sm:grid-cols-2 gap-3">{field('קופירייטינג קיים',draft.creativeWorkspace?.approvedCopy||'',v=>setDraft(d=>({...d,creativeWorkspace:{...({mode:'full',approvedCopy:'',visualDirection:'',visualReferenceUrl:'',notes:'',lockedCopy:false,lockedVisual:false,directorMode:false,history:[]}),...d.creativeWorkspace,approvedCopy:v}})),true)}{field('תיאור ויזואל קיים',draft.creativeWorkspace?.visualDirection||'',v=>setDraft(d=>({...d,creativeWorkspace:{...({mode:'full',approvedCopy:'',visualDirection:'',visualReferenceUrl:'',notes:'',lockedCopy:false,lockedVisual:false,directorMode:false,history:[]}),...d.creativeWorkspace,visualDirection:v}})),true)}</div><div className="flex gap-5 mt-3 text-xs text-white"><label><input type="checkbox" checked={!!draft.creativeWorkspace?.lockedCopy} onChange={e=>setDraft(d=>({...d,creativeWorkspace:{...({mode:'full',approvedCopy:'',visualDirection:'',visualReferenceUrl:'',notes:'',lockedCopy:false,lockedVisual:false,directorMode:false,history:[]}),...d.creativeWorkspace,lockedCopy:e.target.checked}}))}/> נעילת קופי מאושר</label><label><input type="checkbox" checked={!!draft.creativeWorkspace?.lockedVisual} onChange={e=>setDraft(d=>({...d,creativeWorkspace:{...({mode:'full',approvedCopy:'',visualDirection:'',visualReferenceUrl:'',notes:'',lockedCopy:false,lockedVisual:false,directorMode:false,history:[]}),...d.creativeWorkspace,lockedVisual:e.target.checked}}))}/> נעילת ויזואל מאושר</label></div></section>
      <section className="border-t border-white/15 pt-4"><h3 className="font-bold text-white mb-2">פלטת מותג רשמית</h3><select value={draft.brand?.officialPaletteId||''} onChange={e=>setDraft(d=>({...d,brand:{...d.brand,officialPaletteId:e.target.value}}))} className={inputClass}><option value="">לא הוגדרה פלטה רשמית</option>{draft.colorPalettes.map(p=><option key={p.id} value={p.id}>{p.name} — {p.colors.join(', ')}</option>)}</select><p className="text-xs text-zinc-400 mt-2">אפשר ליצור פלטה במעבדת הצבעים ולבחור אותה כאן.</p></section>
      <div className="sticky bottom-0 bg-[#103F46] pt-3 border-t border-white/15 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 text-white border border-white/20 rounded-lg">ביטול</button><button onClick={save} className="px-5 py-2 font-bold rounded-lg bg-[#43D6CB] text-[#183036]">שמור פרויקט</button></div>
    </section>
  </div>;
};
