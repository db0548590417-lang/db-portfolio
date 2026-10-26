import assert from 'node:assert/strict';
import {createSqliteAccountStore} from './account-store.mjs';
import {createRenderServer} from './host-render.mjs';
const store=await createSqliteAccountStore(':memory:');
const server=createRenderServer({accountStore:store,cloudEnabled:true,hosted:false,secret:'test-secret-longer-than-thirty-two-characters',password:'owner-test-password'});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const call=(path,method='GET',body,cookie)=>fetch(base+path,{method,headers:{origin:base,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
const cookies=r=>r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
try{
 const a=await call('/api/auth/register','POST',{username:'alice',password:'alice-password'});const alice=cookies(a);assert.equal(a.status,201);
 const b=await call('/api/auth/register','POST',{username:'bob',password:'bob-password'});const bob=cookies(b);
 const write=await call('/api/storage?key=workspace','PUT',{content:JSON.stringify({projects:[{id:'p',name:'Alice project'}]}),expectedVersion:0},alice);assert.equal(write.status,200);assert.equal((await write.json()).version,1);
 assert.equal((await call('/api/storage?key=workspace','PUT',{content:JSON.stringify({projects:[]}),expectedVersion:0},alice)).status,409);
 assert.equal((await (await call('/api/storage?key=workspace','GET',null,bob)).json()).content,null);
 assert.match((await (await call('/api/storage?key=workspace','GET',null,alice)).json()).content,/Alice project/);
 assert.equal((await call('/api/storage?key=../other','GET',null,alice)).status,400);
 assert.equal((await call('/api/auth/recovery-code','POST',{password:'wrong-password'},alice)).status,401);
 const codeResponse=await call('/api/auth/recovery-code','POST',{password:'alice-password'},alice);assert.equal(codeResponse.status,200);const {recoveryCode}=await codeResponse.json();assert.equal(recoveryCode.length,64);
 assert.equal((await call('/api/auth/recover','POST',{username:'alice',recoveryCode:'0'.repeat(64),newPassword:'replacement-password'})).status,400);
 assert.equal((await call('/api/auth/recover','POST',{username:'alice',recoveryCode,newPassword:'replacement-password'})).status,200);
 assert.equal((await (await call('/api/auth/session','GET',null,alice)).json()).user,null);
 assert.equal((await call('/api/auth/recover','POST',{username:'alice',recoveryCode,newPassword:'reused-code-password'})).status,400);
 assert.equal((await call('/api/auth/login','POST',{username:'alice',password:'alice-password'})).status,401);
 assert.equal((await call('/api/auth/login','POST',{username:'alice',password:'replacement-password'})).status,200);
 console.log('PASS: cloud document persistence, revision conflict, per-user isolation, forbidden keys, single-use recovery, old session invalidation, old password revoked');
}finally{await new Promise(r=>server.close(r));await store.close();}
