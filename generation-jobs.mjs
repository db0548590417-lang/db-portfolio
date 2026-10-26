import {randomUUID} from 'node:crypto';
export function createGenerationJobs({getStore,worker}){
  const active=new Map();
  let retainedInputBytes=0;
  const send=(res,body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  return async(request,response,user,env)=>{
    const url=new URL(request.url);if(url.pathname!=='/api/generation-jobs')return false;
    const store=await getStore();
    if(!store?.readDocument){send(response,{error:'כדי לשמור יצירות ברקע נדרש חיבור למסד החשבונות'},503);return true;}
    const id=url.searchParams.get('id');
    if(request.method==='POST'){
      if(active.size>=32||[...active.values()].filter(value=>value===user.id).length>=3){send(response,{error:'יש בקשות יצירה קודמות. המתן לסיומן.'},429);return true;}
      const text=await request.text();if(text.length>46000000){send(response,{error:'נתוני היצירה גדולים מדי'},413);return true;}
      let body;try{body=JSON.parse(text);}catch{send(response,{error:'בקשה לא תקינה'},400);return true;}
      if(typeof body.prompt!=='string'||!body.prompt.trim()){send(response,{error:'חסר פרומפט'},400);return true;}
      const jobId=typeof body.requestId==='string'&&/^[a-f0-9-]{36}$/.test(body.requestId)?body.requestId:randomUUID(),key='job/'+jobId,activeKey=user.id+':'+jobId;
      if(active.has(activeKey)||await store.readDocument(user.id,key)){send(response,{id:jobId,state:'queued'},202);return true;}
      const reservedBytes=Buffer.byteLength(text);
      if(retainedInputBytes+reservedBytes>48_000_000){send(response,{error:'השרת מטפל כעת בתמונות גדולות. המתן לסיום בקשה קודמת ונסה שוב.'},429);return true;}
      retainedInputBytes+=reservedBytes;
      const record={id:jobId,state:'queued',createdAt:Date.now()};
      active.set(activeKey,user.id);
      try{await store.writeDocument(user.id,key,JSON.stringify(record));}
      catch{active.delete(activeKey);retainedInputBytes-=reservedBytes;send(response,{error:'לא ניתן לשמור את בקשת היצירה. לא הופעלה בקשת AI.'},503);return true;}
      // Run independently of the browser connection. Only the result, never input keys, is persisted.
      void (async()=>{
        try{
          const result=await worker.fetch(new Request(url.origin+'/api/visual-generator/generate',{method:'POST',headers:request.headers,body:JSON.stringify(body)}),env);
          const data=await result.json();
          await store.writeDocument(user.id,key,JSON.stringify({...record,state:result.ok?'completed':'failed',status:result.status,result:data}));
        }catch{await store.writeDocument(user.id,key,JSON.stringify({...record,state:'failed',status:502,result:{error:'היצירה לא הושלמה או שלא ניתן לשמור אותה. לא תבוצע בקשה חוזרת אוטומטית.'}})).catch(()=>{});}
        finally{active.delete(activeKey);retainedInputBytes-=reservedBytes;}
      })();
      send(response,{id:jobId,state:'queued'},202);return true;
    }
    if(!id||!/^[a-f0-9-]{36}$/.test(id)){send(response,{error:'מזהה בקשה אינו תקין'},400);return true;}
    const key='job/'+id,item=await store.readDocument(user.id,key);
    if(!item){send(response,{error:'בקשת היצירה לא נמצאה'},404);return true;}
    if(request.method==='DELETE'){await store.removeDocument(user.id,key);send(response,{ok:true});return true;}
    if(request.method!=='GET'){send(response,{error:'פעולה אינה נתמכת'},405);return true;}
    let record;try{record=JSON.parse(item.content);}catch{send(response,{error:'נתוני בקשת היצירה אינם תקינים'},500);return true;}
    if(record.state==='queued'&&!active.has(user.id+':'+id))record={...record,state:'failed',status:503,result:{error:'השרת הופעל מחדש לפני סיום היצירה. ניתן להפעיל אותה שוב ידנית.'}};
    send(response,record);return true;
  };
}
