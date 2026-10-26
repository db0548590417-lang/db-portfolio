import type {Project} from '../types';
import {listDesignImages,restoreDesignImages} from './designAssetsDb';
let enabled=false;
const uploaded=new Map<string,string>();
const imageKey=async(id:string)=>'image/'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)))).map(value=>value.toString(16).padStart(2,'0')).join('');
export const setCloudAssetsEnabled=(value:boolean)=>{enabled=value;if(!value)uploaded.clear();};
export async function loadCloudImage(id:string):Promise<string|null>{
  if(!enabled)return null;
  const response=await fetch('/api/storage?key='+encodeURIComponent(await imageKey(id)),{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('לא ניתן לטעון את תמונת הענן');
  return (await response.json()).content||null;
}
export async function uploadCloudImages(){
  const images=await listDesignImages();
  for(const [id,content] of Object.entries(images)){
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))).map(x=>x.toString(16).padStart(2,'0')).join('');
    if(uploaded.get(id)===hash)continue;
    const response=await fetch('/api/storage?key='+encodeURIComponent(await imageKey(id)),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('העלאת התמונות לענן נכשלה. הנתונים המקומיים נשמרו.');
    uploaded.set(id,hash);
  }
}
export async function readCloudWorkspace(){
  const response=await fetch('/api/storage?key=workspace',{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('לא ניתן להתחבר לאחסון הענן');
  return response.json();
}
export async function writeCloudWorkspace(projects:Project[],version:number){
  await uploadCloudImages();
  const response=await fetch('/api/storage?key=workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:JSON.stringify({projects}),expectedVersion:version}),signal:AbortSignal.timeout(30000)});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'הסנכרון נכשל');
  return data.version as number;
}
export async function cacheCloudImage(id:string,data:string){await restoreDesignImages({[id]:data});}
