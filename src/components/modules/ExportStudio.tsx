import React, {useEffect,useState} from 'react';
import {useProject} from '../../context/ProjectContext';
import {loadDesignImage} from '../../data/designAssetsDb';

export const ExportStudio: React.FC = () => {
  const {activeProject,exportProjectBackup,showToast,setActiveModule}=useProject();
  const [format,setFormat]=useState('png');
  const [selectedId,setSelectedId]=useState('');
  const [preview,setPreview]=useState('');
  const [busy,setBusy]=useState(false);
  const [scale,setScale]=useState(1);
  const [background,setBackground]=useState(false);
  const [filename,setFilename]=useState(activeProject.name);
  const items=[...(activeProject.generatedImages||[]).map(item=>({id:item.id,title:item.prompt.slice(0,70)||'תמונה שנוצרה',url:item.url})),...(activeProject.designAssets||[]).map(item=>({id:item.id,title:item.name,url:''}))];
  const selected=items.find(item=>item.id===selectedId);
  useEffect(()=>{setSelectedId('');setPreview('');setFilename(activeProject.name);},[activeProject.id]);
  useEffect(()=>{
    let alive=true;setPreview('');
    if(selected) void loadDesignImage(selected.id).then(data=>{if(alive)setPreview(data||selected.url||'');}).catch(()=>{if(alive)showToast('לא ניתן לטעון את התוצר','error');});
    return()=>{alive=false};
  },[selectedId,activeProject.id]);
  const download=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
  const exportImage=async()=>{
    if(busy)return;setBusy(true);
    try{
      if(format==='zip'){await exportProjectBackup();return;}
      const name=(filename||'dekel-export').replace(/[\\/:*?"<>|]/g,'_');
      if(format==='css'){
        const colors=activeProject.colorPalettes.find(p=>p.id===activeProject.brand?.officialPaletteId)?.colors||activeProject.colorPalettes[0]?.colors;
        if(!colors?.length)throw Error('שמור פלטת צבעים בפרויקט תחילה');
        download(new Blob([':root {\n'+colors.map((color,i)=>`  --brand-${i+1}: ${color};`).join('\n')+'\n}'],{type:'text/css'}),name+'.css');return;
      }
      if(!preview)throw Error('בחר תוצר זמין לייצוא');
      const image=new Image();image.src=preview;await image.decode();
      const width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale);
      if(width*height>40_000_000)throw Error('גודל הייצוא גדול מדי. בחר קנה מידה קטן יותר.');
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('הדפדפן אינו תומך בייצוא');
      if(background||format==='jpg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
      ctx.drawImage(image,0,0,width,height);
      if(format==='pdf'){
        const {jsPDF}=await import('jspdf');
        const pdf=new jsPDF({orientation:width>height?'landscape':'portrait',unit:'px',format:[width,height],hotfixes:['px_scaling']});
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,width,height);pdf.save(name+'.pdf');
      }else{
        const mime=format==='jpg'?'image/jpeg':'image/png';
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('יצירת הקובץ נכשלה')),mime,0.95));
        download(blob,name+'.'+format);
      }
      showToast('התוצר שנבחר יוצא בהצלחה');
    }catch(error:any){showToast(error.message||'הייצוא נכשל','error');}finally{setBusy(false);}
  };
  return <div dir="rtl" className="h-full overflow-y-auto p-6 space-y-5 text-white">
    <h1 className="text-2xl font-bold">ייצוא תוצרים וגיבוי</h1>
    <p className="text-sm text-zinc-300">בחר את העבודה שיצרת, בדוק את התצוגה המקדימה והורד אותה. הגדלת פיקסלים אינה מוסיפה פרטים לתמונה ואינה הופכת אותה לווקטור.</p>
    <p className="text-sm text-zinc-300">לייצוא SVG מתוך הטיפוגרפיה העריכה, <button className="underline text-[#43D6CB]" onClick={()=>setActiveModule('typography_playground')}>פתח את כלי הטיפוגרפיה</button>.</p>
    <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-4 rounded-xl border border-[#31535A] bg-[#103F46] p-5">
      <label className="block">פורמט ייצוא<select aria-label="פורמט ייצוא" value={format} onChange={e=>setFormat(e.target.value)} className="block w-full mt-2 bg-[#183036] p-3 rounded-lg"><option value="png">PNG — שמירת שקיפות קיימת</option><option value="jpg">JPG — רקע לבן</option><option value="pdf">PDF — התמונה בפועל</option><option value="zip">ZIP — כל הפרויקטים והתמונות</option><option value="css">CSS — צבעי המותג</option></select></label>
      {['png','jpg','pdf'].includes(format)&&<><label className="block">תוצר לייצוא<select aria-label="תוצר לייצוא" value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="block w-full mt-2 bg-[#183036] p-3 rounded-lg"><option value="">בחר עבודה</option>{items.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      {!items.length&&<p>אין עדיין תוצרים בפרויקט. צור תמונה במחולל או שמור עיצוב אישי.</p>}
      <label className="block">קנה מידה<select aria-label="קנה מידה" value={scale} onChange={e=>setScale(Number(e.target.value))} className="block w-full mt-2 bg-[#183036] p-3 rounded-lg">{[1,2,4].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/>הוסף רקע לבן</label></>}
      <label className="block">שם הקובץ<input aria-label="שם הקובץ" value={filename} onChange={e=>setFilename(e.target.value)} className="block w-full mt-2 bg-[#183036] p-3 rounded-lg"/></label>
      <button disabled={busy} onClick={()=>void exportImage()} className="rounded-lg bg-[#43D6CB] px-5 py-3 font-bold text-[#183036] disabled:opacity-50">{busy?'מכין קובץ…':'הורד קובץ'}</button>
    </section><section aria-label="תצוגה מקדימה לייצוא" className="rounded-xl border border-[#31535A] bg-[#103F46] p-5 flex items-center justify-center min-h-64">{preview?<img src={preview} alt="התוצר שנבחר לייצוא" className="max-h-[65vh] max-w-full object-contain"/>:<p className="text-zinc-300">בחר תוצר לתצוגה מקדימה</p>}</section></div>
  </div>;
};
