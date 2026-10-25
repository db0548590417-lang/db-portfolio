import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
const image=Buffer.concat([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64'),Buffer.alloc(100)]);
const origin='https://studio.example';
const call=(url,user='test-user')=>worker.fetch(new Request(origin+url,{headers:user?{'oai-authenticated-user-id':user}:{}}),{BUCKET:{get:async()=>null}});
const original=globalThis.fetch;let reads=0;
globalThis.fetch=async()=>{reads++;return new Response(image,{headers:{'content-type':'image/png'}});};
try{
 const path='/api/inspiration/image?url='+encodeURIComponent('https://m-blum.co.il/wp-content/uploads/work.png');
 assert.equal((await call(path,'')).status,401);
 assert.equal((await call('/api/inspiration/image?url=https://127.0.0.1/image.png')).status,403);
 assert.equal(reads,0);
 const result=await call(path);
 assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'image/png');
 assert.match(result.headers.get('cache-control'),/private/);
 assert.deepEqual(Buffer.from(await result.arrayBuffer()),image);
 globalThis.fetch=async()=>new Response('<html>Sign in</html>',{headers:{'content-type':'text/html'}});
 assert.equal((await call(path)).status,502);
 console.log('PASS: authenticated binary artwork route, private cache, exact bytes, forbidden hosts rejected before network, HTML rejected');
}finally{globalThis.fetch=original;}
