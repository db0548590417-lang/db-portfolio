import {userStorageKey} from './accountStorage';
const running=new Set<string>();
const storageKey=()=>userStorageKey('dekel-image-jobs-v1');
type Pending={id:string;projectId:string;image:any};
export const pendingImageJobs=():Pending[]=>{try{return JSON.parse(localStorage.getItem(storageKey())||'[]');}catch{return [];}};
export const isImageJobRunning=(id:string)=>running.has(id);
export async function acknowledgeImageJob(id:string,failed=false){
  if(!failed){let saved=false;try{const projects=JSON.parse(localStorage.getItem(userStorageKey('inspira_studio_projects_v1'))||'[]');saved=projects.some((p:any)=>p.generatedImages?.some((image:any)=>image.id==='gen-'+id));}catch{}if(!saved)return false;}
  const response=await fetch('/api/generation-jobs?id='+id,{method:'DELETE'});
  if(!response.ok)throw Error('לא ניתן לסיים את מעקב היצירה');
  localStorage.setItem(storageKey(),JSON.stringify(pendingImageJobs().filter(item=>item.id!==id)));
  running.delete(id);
}
export async function imageJobStatus(id:string){const response=await fetch('/api/generation-jobs?id='+id,{signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'לא ניתן לקרוא את מצב היצירה');return result;}
export async function createImageJob(body:unknown,projectId:string,image:any){
  const created={id:crypto.randomUUID()};
  const job={id:created.id,projectId,image:{...image,id:'gen-'+created.id}};
  try{localStorage.setItem(storageKey(),JSON.stringify([...pendingImageJobs(),job]));}catch{throw Error('לא ניתן לשמור פרטי מעקב במכשיר. הורד גיבוי ופנה מקום לפני יצירה חדשה. לא הופעלה בקשת AI.');}
  const response=await fetch('/api/generation-jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body as any,requestId:created.id}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok){localStorage.setItem(storageKey(),JSON.stringify(pendingImageJobs().filter(item=>item.id!==created.id)));throw Error(result.error||'לא ניתן להתחיל את היצירה');}
  running.add(created.id);
  try{
    const deadline=Date.now()+300000;
    while(Date.now()<deadline){
      const status=await imageJobStatus(created.id);
      if(status.state==='completed')return {...status.result,jobId:created.id};
      if(status.state==='failed'){await acknowledgeImageJob(created.id,true);throw Error(status.result?.error||'היצירה נכשלה');}
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    throw Error('היצירה עדיין בטיפול. המעקב ימשיך ברקע.');
  }finally{running.delete(created.id);}
}
