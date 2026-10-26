import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=','base64');
const images=[0,1,2,3].map(index=>'data:image/png;base64,'+Buffer.concat([bytes,Buffer.from([index])]).toString('base64'));
const original=globalThis.fetch;let sent,calls=0;
globalThis.fetch=async(_url,options)=>{calls++;sent=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:bytes.toString('base64')}}]}}]});};
const env={BUCKET:{get:async()=>({json:async()=>({apiKey:'test-only-not-a-real-key',model:'gemini-2.5-flash'})})}};
const call=body=>worker.fetch(new Request('https://studio.example/api/visual-generator/generate',{method:'POST',headers:{origin:'https://studio.example','content-type':'application/json','oai-authenticated-user-id':'multi-reference-test'},body:JSON.stringify({prompt:'Create an advertisement using all references',...body})}),env);
try{
 const refs=['logo','product','composition','lighting'].map((role,index)=>({imageBase64:images[index],role,strength:index+1,instruction:'Instruction for reference '+index}));
 assert.equal((await call({references:refs})).status,200);
 const parts=sent.contents.flatMap(content=>content.parts);assert.deepEqual(parts.filter(part=>part.inlineData).map(part=>part.inlineData.data),images.map(image=>image.split(',')[1]));
 for(let index=0;index<refs.length;index++)assert(parts.some(part=>part.text?.includes('REFERENCE #'+(index+1))&&part.text.includes(refs[index].instruction)));
 assert(parts.some(part=>part.text?.includes('BRAND LOGO IMAGE')));assert(parts.some(part=>part.text?.includes('PRODUCT IMAGE')));
 let before=calls;
 for(const body of [{references:Array.from({length:7},()=>refs[0])},{references:[{...refs[0],role:'constructor'}]},{references:[{...refs[0],strength:99}]},{references:[{...refs[0],imageBase64:'data:image/svg+xml;base64,PHN2Zz4='}]}])assert.equal((await call(body)).status,400);
 assert.equal(calls,before);
 const large='data:image/png;base64,'+Buffer.concat([bytes,Buffer.alloc(6_000_001-bytes.length)]).toString('base64');
 assert.equal((await call({references:Array.from({length:4},()=>({imageBase64:large,role:'art_style'}))})).status,400);assert.equal(calls,before);
 console.log('PASS: four distinct images reach one mocked Gemini request in order, per-image roles and instructions preserved, count/type/role/strength/total-size validation rejects before model call');
}finally{globalThis.fetch=original;}
