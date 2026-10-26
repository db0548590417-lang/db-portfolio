export function createCloudStorage({getStore,enabled=false,quotaBytes=250_000_000}) {
  const send=(res,body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  return async (req,res,user,origin)=>{
    const url=new URL(req.url,origin);
    if(url.pathname!=='/api/storage')return false;
    if(!enabled){send(res,{enabled:false},req.method==='GET'?200:503);return true;}
    const store=await getStore();
    if(!store?.readDocument){send(res,{error:'אחסון הענן אינו מחובר'},503);return true;}
    const key=url.searchParams.get('key');
    if(!key){send(res,{enabled:true,provider:'postgres',maxImageBytes:32000000,quotaBytes});return true;}
    if(!/^(workspace|image\/[A-Za-z0-9_-]{1,500})$/.test(key)){send(res,{error:'כתובת אחסון לא תקינה'},400);return true;}
    if(req.method==='GET'){const item=await store.readDocument(user.id,key);send(res,item?{enabled:true,...item}:{enabled:true,content:null,version:0});return true;}
    if(req.method==='DELETE'){await store.removeDocument(user.id,key);send(res,{ok:true});return true;}
    if(req.method!=='PUT'){send(res,{error:'הפעולה אינה נתמכת'},405);return true;}
    const chunks=[];let size=0;const limit=key==='workspace'?5000000:44000000;
    for await(const chunk of req){size+=chunk.length;if(size>limit){send(res,{error:'הקובץ גדול מדי'},413);return true;}chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{send(res,{error:'בקשה אינה תקינה'},400);return true;}
    if(typeof body.content!=='string'||(key!=='workspace'&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.content))){send(res,{error:'תוכן לא נתמך'},400);return true;}
    if(key==='workspace'){let data;try{data=JSON.parse(body.content);}catch{}if(!Array.isArray(data?.projects)||!Number.isInteger(body.expectedVersion)||body.expectedVersion<0){send(res,{error:'נתוני הפרויקט אינם תקינים'},400);return true;}}
    let version;
    try{version=await store.writeDocument(user.id,key,body.content,key==='workspace'?body.expectedVersion:null,quotaBytes);}
    catch(error){if(String(error.message).includes('מכסת אחסון')){send(res,{error:error.message},413);return true;}throw error;}
    send(res,version?{ok:true,version}:{error:'יש שינוי ממכשיר אחר. הורד גיבוי ורענן לפני סנכרון נוסף.'},version?200:409);return true;
  };
}
