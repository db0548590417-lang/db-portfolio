import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { userStorageKey } from '../../data/accountStorage';
import { Icon } from '../common/Icon';
import { loadDesignImage, saveDesignImage, deleteDesignImage } from '../../data/designAssetsDb';

export const PropertyPanel: React.FC = () => {
  const { activeModule, activeProject, updateActiveProject, setActiveModule, globalPrefs, showToast } = useProject();
  const uploadRef = useRef<HTMLInputElement>(null);
  const [refPreviews, setRefPreviews] = useState<Record<string,string>>({});
  const [uploadingRefs, setUploadingRefs] = useState(false);
  useEffect(() => {
    let alive=true;
    Promise.all(activeProject.savedInspirations.map(async item => {
      const data = await loadDesignImage('ref-'+item.id).catch(()=>null);
      return [item.id, data || ''] as const;
    })).then(items => { if(alive) setRefPreviews(Object.fromEntries(items)); });
    return () => {alive=false};
  }, [activeProject.id, activeProject.savedInspirations]);
  const uploadReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadingRefs(true);
    try {
      let count=0;
      for (const file of Array.from(files).slice(0,12)) {
        if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>8_000_000) {
          showToast('אפשר להעלות PNG, JPG או WebP עד 8MB לתמונה', 'error');
          continue;
        }
        const dataUrl = await new Promise<string>((resolve,reject) => {
          const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
        });
        const id='local-ref-'+(globalThis.crypto?.randomUUID?.() || Date.now()+'-'+count);
        await saveDesignImage('ref-'+id, dataUrl);
        updateActiveProject(prev => ({...prev, savedInspirations:[...prev.savedInspirations, {id,title:file.name,source:'מהמחשב',url:'',thumbUrl:'',savedAt:Date.now(),isSample:false}]}));
        setRefPreviews(prev=>({...prev,[id]:dataUrl}));
        count++;
      }
      if(count) showToast(`${count} רפרנסים נשמרו בפרויקט`, 'success');
    } catch (e) {showToast('שמירת תמונת הרפרנס נכשלה. נסה שוב.', 'error');}
    finally {setUploadingRefs(false);if(uploadRef.current)uploadRef.current.value='';}
  };
  const removeReference = async (id:string) => {
    const item=activeProject.savedInspirations.find(x=>x.id===id);
    if (item?.source==='מהמחשב') await deleteDesignImage('ref-'+id).catch(()=>{});
    updateActiveProject(prev=>({...prev,savedInspirations:prev.savedInspirations.filter(x=>x.id!==id)}));
    setRefPreviews(prev=>{const next={...prev};delete next[id];return next;});
  };
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-start py-4 px-1.5 bg-[#183036] border-r border-[#31535A] z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          title="הרחב פאנל מאפיינים (Properties)"
        >
          <Icon name="Sliders" className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="hidden lg:flex flex-col w-80 bg-[#183036] border-r border-[#31535A] h-[calc(100vh-3.5rem)] select-none text-right z-20">
      {/* Header */}
      <div className="p-3 border-b border-[#31535A] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          <Icon name="Sliders" className="w-3.5 h-3.5 text-[#43D6CB]" />
          <span>מאפיינים והקשר כלי</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          title="כווץ פאנל"
        >
          <Icon name="ChevronLeft" className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content based on active module */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* One editable project source-of-truth across every module. Updates are persisted by ProjectContext. */}
        <section className="space-y-3" dir="rtl">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm text-white">תיק הפרויקט</strong>
            <span className="text-[10px] text-[#43D6CB]">שמירה אוטומטית</span>
          </div>
          <p className="text-[11px] text-zinc-400">כל שינוי נשמר בפרויקט הפעיל ומשמש כמידע רקע לפקודות AI.</p>
          {([
            ['פרויקט ולקוחות', [
              ['name', 'שם הפרויקט'], ['clientName', 'הלקוח המזמין'],
              ['brand.endClient','לקוח הקצה'], ['brand.brandName','שם המותג']]],
            ['זהות המותג', [
              ['brand.industry','תחום פעילות'],['brand.brandDescription','תיאור המותג'],
              ['brand.brandValues','ערכי המותג'],['brand.brandVoice','טון ושפה'],
              ['brand.audience','קהל היעד'],['brand.typography','טיפוגרפיה'],
              ['brand.logoUrl','קישור ללוגו'],['brand.brandRestrictions','מגבלות מותג']]],
            ['הבריף הפרסומי', [
              ['brief.productOrService','מוצר או שירות'],['brief.campaignObjective','מטרת הקמפיין'],
              ['brief.primaryMessage','מסר מרכזי'],['brief.targetAudience','קהל היעד לקמפיין'],
              ['brief.brandPersonality','אופי המותג'],['brief.desiredEmotions','רגשות רצויים'],
              ['brief.preferredVisualStyle','סגנון חזותי'],['brief.creativeRestrictions','מגבלות העיצוב']]],
            ['קופי, ויזואל והנחיות', [
              ['creativeWorkspace.approvedCopy','קופירייטינג קיים'],
              ['creativeWorkspace.visualDirection','תיאור ויזואל קיים'],
              ['creativeWorkspace.visualReferenceUrl','קישור לוויזואל'],
              ['creativeWorkspace.notes','הערות והוראות']]],
          ] as [string, [string,string][]][]).map(([section, fields], idx) => (
            <details key={section} open={idx === 0} className="rounded-xl border border-[#31535A] bg-[#103F46] overflow-hidden">
              <summary className="cursor-pointer p-3 font-bold text-zinc-100 select-none">{section}</summary>
              <div className="p-3 pt-0 space-y-3">
                {fields.map(([key,label]) => {
                  const [group,field] = key.includes('.') ? key.split('.') : ['',key];
                  const value = String(group ? ((activeProject as any)[group]?.[field] ?? '') : ((activeProject as any)[field] ?? ''));
                  return <label key={key} className="block space-y-1">
                    <span className="text-[11px] text-zinc-300">{label}</span>
                    <textarea rows={['brand.brandDescription','brief.creativeRestrictions','creativeWorkspace.approvedCopy','creativeWorkspace.visualDirection','creativeWorkspace.notes'].includes(key) ? 3 : 1}
                      value={value} placeholder="טרם הוגדר" dir="auto"
                      onChange={e => updateActiveProject(prev => group
                        ? ({...prev,[group]: {...((prev as any)[group] || {}), [field]: e.target.value}})
                        : ({...prev,[field]:e.target.value}))}
                      className="w-full rounded-lg bg-[#183036] text-[#F7F8F3] border border-[#31535A] px-2.5 py-2 text-xs focus:outline-none focus:border-[#43D6CB] resize-y" />
                  </label>;
                })}
              </div>
            </details>
          ))}
          <details className="rounded-xl border border-[#31535A] bg-[#103F46] p-3">
            <summary className="cursor-pointer font-bold text-white">העיצובים שלי ({activeProject.designAssets?.length || 0})</summary>
            <div className="mt-3 space-y-2 text-[11px] text-zinc-300">
              <p>עיצובים וגרסאות נשמרים בנפרד לכל פרויקט.</p>
              {(activeProject.designAssets || []).map(asset => <button key={asset.id} className="block w-full rounded-lg bg-[#183036] px-2 py-2 text-right hover:bg-zinc-800" onClick={() => {sessionStorage.setItem(userStorageKey(`dekel-design-${activeProject.id}`),asset.id);setActiveModule('creative_analyzer');window.dispatchEvent(new CustomEvent('dekel-open-design', {detail:{id:asset.id,projectId:activeProject.id}}));}}>{asset.name} · גרסה {asset.version}</button>)}
              {!activeProject.designAssets?.length && <p>טרם הועלו עיצובים לפרויקט.</p>}
            </div>
          </details>
          <details className="rounded-xl border border-[#31535A] bg-[#103F46] p-3">
            <summary className="cursor-pointer font-bold text-white">הגדרות קריאייטיב</summary>
            <div className="space-y-2 mt-3">
              {([['lockedCopy','קופירייטינג מאושר — אין לשנות'],['lockedVisual','ויזואל מאושר — אין לשנות'],['directorMode','מנהל קריאייטיב ביקורתי']] as const).map(([key,label]) =>
                <label key={key} className="flex items-center gap-2 text-[11px] text-zinc-200">
                  <input className="accent-[#43D6CB]" type="checkbox" checked={!!activeProject.creativeWorkspace?.[key]}
                    onChange={e => updateActiveProject(prev => ({...prev, creativeWorkspace: {...{
                      mode:'full' as const, approvedCopy:'', visualDirection:'', visualReferenceUrl:'', notes:'',
                      lockedCopy:false,lockedVisual:false,directorMode:false,history:[]
                    },...prev.creativeWorkspace,[key]:e.target.checked}}))}/>{label}
                </label>
              )}
            </div>
          </details>
          <div className="rounded-xl border border-[#31535A] bg-[#103F46] p-3 space-y-2">
            <strong className="text-zinc-200">פלטת המותג הרשמית</strong>
            <select value={activeProject.brand?.officialPaletteId || ''}
              onChange={e => updateActiveProject(prev=>({...prev,brand:{...prev.brand,officialPaletteId:e.target.value}}))}
              className="w-full bg-[#183036] text-zinc-100 p-2 rounded-lg border border-[#31535A]">
              <option value="">ללא פלטה רשמית</option>
              {activeProject.colorPalettes.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {activeProject.colorPalettes.find(p=>p.id===activeProject.brand?.officialPaletteId) &&
              <div className="flex h-5 gap-1">{activeProject.colorPalettes.find(p=>p.id===activeProject.brand?.officialPaletteId)!.colors.map((c,i)=><div key={i} className="flex-1 rounded" style={{backgroundColor:c}} title={c}/>)}</div>}
          </div>
          <details className="rounded-xl border border-[#31535A] bg-[#103F46] p-3">
            <summary className="cursor-pointer font-bold text-white">רפרנסים והשראות שמורות ({activeProject.savedInspirations.length})</summary>
            <p className="mt-2 text-[10px] text-zinc-300">העלה תמונות מהמחשב או שמור השראות מצייד ההשראות. תמונות מקומיות זמינות במחולל הוויזואלי.</p>
             <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={e=>void uploadReferences(e.target.files)} />
             <button type="button" disabled={uploadingRefs} onClick={()=>uploadRef.current?.click()} className="mt-3 w-full rounded-lg bg-[#43D6CB] text-[#103036] font-bold px-3 py-2 hover:bg-[#69E1D7] disabled:opacity-50">{uploadingRefs?'שומר תמונות...':'＋ העלה רפרנסים מהמחשב'}</button>
             <p className="text-[10px] text-zinc-300 mt-1">PNG, JPG, WebP · עד 8MB לקובץ · שמירה מקומית במחשב זה</p>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {activeProject.savedInspirations.length === 0 && <p className="text-zinc-400">אין רפרנסים. פתח את צייד ההשראות ושמור השראה לפרויקט.</p>}
              {activeProject.savedInspirations.map(item => <div key={item.id} className="flex gap-2 items-center rounded-lg p-2 border border-[#31535A] bg-[#183036]">
                {refPreviews[item.id] || item.thumbUrl || item.url ? <img src={refPreviews[item.id] || item.thumbUrl || item.url} alt="" loading="lazy" className="w-12 h-12 object-cover rounded-md" /> : <div className="w-12 h-12 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-400"><Icon name="Image" className="w-5 h-5" /></div>}
                <div className="min-w-0 flex-1"><p className="truncate text-zinc-100 font-semibold">{item.title}</p><p className="truncate text-[10px] text-zinc-400">{item.source}</p></div>
                <button type="button" title="הסר רפרנס מהפרויקט" onClick={() => void removeReference(item.id)} className="text-rose-300 hover:text-rose-200 p-1"><Icon name="Trash2" className="w-4 h-4" /></button>
              </div>)}
            </div>
          </details>
        </section>

        {/* Module Specific Quick Tools */}
        {activeModule === 'color_lab' && (
          <div className="space-y-3">
            <span className="font-bold text-zinc-300 block">פלטות צבעים בפרויקט ({activeProject.colorPalettes.length}):</span>
            {activeProject.colorPalettes.length === 0 ? (
              <p className="text-[11px] text-zinc-500">שמור פלטה ממעבדת הצבע כדי לראותה כאן.</p>
            ) : (
              <div className="space-y-2">
                {activeProject.colorPalettes.map((pal) => (
                  <div key={pal.id} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
                    <span className="text-[11px] font-bold text-zinc-200 block truncate mb-1">{pal.name}</span>
                    <div className="flex gap-1 h-5">
                      {pal.colors.map((c, i) => (
                        <div key={i} className="flex-1 rounded" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeModule === 'typography_playground' && (
          <div className="space-y-3">
            <span className="font-bold text-zinc-300 block">קיצורי דרך לטיפוגרפיה:</span>
            <div className="space-y-2 text-zinc-400 text-[11px]">
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                <span className="text-white font-bold block mb-0.5">עיקול SVG:</span>
                הפעל מצב קשת (Curved Path) לעיצוב כותרות מעגליות בסגנון מדליות עבריות.
              </div>
              <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                <span className="text-white font-bold block mb-0.5">זהב מוטבע:</span>
                גרדיאנט זהב 5 תחנות עם צללית עמוקה מותאם במיוחד לספרי קודש ומיתוג יוקרה.
              </div>
            </div>
          </div>
        )}

        {activeModule === 'creative_director' && (
          <div className="space-y-3">
            <span className="font-bold text-zinc-300 block">קונספטים שמורים בפרויקט ({activeProject.concepts.length}):</span>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeProject.concepts.map((c) => (
                <div key={c.id} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{c.conceptName}</span>
                    <span className="text-[9px] text-[#43D6CB] font-mono">#{c.suggestedDesignTechnique}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2">"{c.suggestedHeadline}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeModule === 'mockup_master' && (
          <div className="space-y-3">
            <span className="font-bold text-zinc-300 block">מאסטר מוקאפים — טיפים:</span>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
              <p>
                • <strong>שלטים:</strong> השתמש במצב <em>Multiply</em> עבור התמזגות טבעית עם טקסטורת הבטון או הנייר.
              </p>
              <p>
                • <strong>מסכים:</strong> השתמש במצב <em>Screen</em> לתאורה פולטת זוהרת.
              </p>
            </div>
          </div>
        )}

        {activeModule === 'shadow_master' && (
          <div className="space-y-3">
            <span className="font-bold text-zinc-300 block">מעבדת שקיפות וצללים — הנחיות:</span>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
              <p>
                • <strong>מקור אור וצל:</strong> הזזת מקור האור בגלגל 360° מעדכנת את כיוון הצל הנגדי (180°) באופן אוטומטי.
              </p>
              <p>
                • <strong>התאמת תאורה AI:</strong> העלה רקע שולחן או ריצוף ולחץ על "התאם תאורה לרקע AI" לחישוב זווית האור וצללי הרקע.
              </p>
              <p>
                • <strong>ייצוא שכבות ZIP:</strong> מייצר ארכיון עם שכבות PNG שקופות אמיתיות וקובץ מניפסט JSON לפוטושופ ואילוס.
              </p>
            </div>
          </div>
        )}

        {/* Global profile badge */}
        <div className="pt-3 border-t border-zinc-800 space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase">הגדרות קריאייטיב:</span>
          <div className="p-2.5 bg-zinc-900/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">סגנון פעיל:</span>
              <span className="text-zinc-200 font-bold">{(activeProject.creativeProfile || globalPrefs.creativeProfile)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">ללא אנשים:</span>
              <span className={globalPrefs.excludePeople ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                {globalPrefs.excludePeople ? 'מופעל' : 'כבוי'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer shortcut */}
      <div className="p-3 border-t border-[#31535A] bg-[#183036]">
        <button
          onClick={() => setActiveModule('export_studio')}
          className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Icon name="Download" className="w-3.5 h-3.5 text-[#43D6CB]" />
          <span>פתח סטודיו ייצוא</span>
        </button>
      </div>
    </aside>
  );
};
