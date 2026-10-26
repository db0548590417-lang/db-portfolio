import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRenderServer} from './host-render.mjs';
import {createSqliteAccountStore} from './account-store.mjs';
const store=await createSqliteAccountStore(':memory:');
let server,base,calls=0;const original=globalThis.fetch;
const start=async()=>{server=createRenderServer({accountStore:store,secret:'background-job-secret-longer-than-thirty-two-characters',password:'local-owner-password',hosted:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;};
const call=(path,method='GET',body,cookie)=>original(base+path,{method,headers:{origin:base,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
const cookie=r=>r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
try{
 globalThis.fetch=async(url,options)=>{if(!String(url).includes('generativelanguage.googleapis.com'))return original(url,options);calls++;await new Promise(r=>setTimeout(r,50));return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII='}}]}}]});};
 await start();const login=await call('/api/auth/login','POST',{username:'dekel',password:'local-owner-password'});let owner=cookie(login);
 // Store a fake model key in the same encrypted cookie used by production.
 const {encryptConfig}=await import('./session-crypto.mjs');owner+='; __Host-dekel-config='+encryptConfig({userId:'owner',keyConfig:{apiKey:'test-only-not-a-real-api-key',model:'gemini-2.5-flash'}},'background-job-secret-longer-than-thirty-two-characters');
 const requestId=randomUUID();const created=await call('/api/generation-jobs','POST',{requestId,prompt:'Test durable image result'},owner);assert.equal(created.status,202);const {id}=await created.json();assert.equal(id,requestId);
 assert.equal((await call('/api/generation-jobs','POST',{requestId,prompt:'Duplicate request'},owner)).status,202);
 let job;for(let i=0;i<100;i++){job=await (await call('/api/generation-jobs?id='+id,'GET',null,owner)).json();if(job.state!=='queued')break;await new Promise(r=>setTimeout(r,30));}
 assert.equal(job.state,'completed',JSON.stringify(job));assert.match(job.result.imageUrl,/^data:image\/png;base64,/);assert.equal(calls,1);
 const registered=await call('/api/auth/register','POST',{username:'other-user',password:'other-user-password'});assert.equal((await call('/api/generation-jobs?id='+id,'GET',null,cookie(registered))).status,404);
 await new Promise(r=>server.close(r));await start();assert.equal((await (await call('/api/generation-jobs?id='+id,'GET',null,owner)).json()).state,'completed');
 assert.equal((await call('/api/generation-jobs?id='+id,'DELETE',null,owner)).status,200);assert.equal((await call('/api/generation-jobs?id='+id,'GET',null,owner)).status,404);
 console.log('PASS: image jobs persist independently of request, idempotent retries make one mocked model call, user isolation, completed results survive server recreation, acknowledged result cleanup');
}finally{globalThis.fetch=original;if(server)await new Promise(r=>server.close(r));await store.close();}
