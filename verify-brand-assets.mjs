import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64');
const data='data:image/png;base64,'+image.toString('base64');
let sent,calls=0;const original=globalThis.fetch;
globalThis.fetch=async(_url,options)=>{calls++;sent=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:image.toString('base64')}}]}}]});};
const env={BUCKET:{get:async()=>({json:async()=>({apiKey:'test-only-not-a-real-api-key',model:'gemini-2.5-flash'})})}};
const call=body=>worker.fetch(new Request('https://studio.example/api/visual-generator/generate',{method:'POST',headers:{origin:'https://studio.example','content-type':'application/json','oai-authenticated-user-id':'test-user'},body:JSON.stringify({prompt:'Make a branded package mockup',...body})}),env);
try{
 const result=await call({referenceImageBase64:data,referenceAssetRole:'product',logoImageBase64:data});assert.equal(result.status,200);assert((await result.json()).imageUrl.startsWith('data:image/png;base64,'));
 const parts=sent.contents.flatMap(content=>content.parts);assert.equal(parts.filter(p=>p.inlineData).length,2);assert(parts.some(p=>p.text?.includes('PRODUCT IMAGE')));assert(parts.some(p=>p.text?.includes('BRAND LOGO IMAGE')));assert(parts.some(p=>p.text?.includes('Preserve its spelling')));assert(parts.filter(p=>p.inlineData).every(p=>p.inlineData.data===image.toString('base64')));
 const before=calls;assert.equal((await call({logoImageBase64:'data:image/png;base64,'+Buffer.from('<html>not an image</html>').toString('base64')})).status,400);assert.equal(calls,before);
 assert.equal((await call({logoImageBase64:'data:image/svg+xml;base64,PHN2Zz4='})).status,400);
 await call({});assert.equal(sent.contents.flatMap(content=>content.parts).filter(p=>p.inlineData).length,0);
 console.log('PASS: exact logo and product bytes reach mocked Gemini in the same request with distinct roles; logo-preservation instructions; invalid images rejected before model call; ordinary generation unchanged');
}finally{globalThis.fetch=original;}
