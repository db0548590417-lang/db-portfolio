import assert from 'node:assert/strict';
import {runAiTask,aiUsage} from './ai-jobs.mjs';
import worker from './dist/server/index.js';
let active=0,max=0;
const work=()=>runAiTask('same-account',async()=>{max=Math.max(max,++active);await new Promise(r=>setTimeout(r,20));active--;return true;});
const outcomes=await Promise.allSettled([work(),work(),work(),work()]);assert.equal(max,1);assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);assert.equal(aiUsage('same-account').completed,3);
let globalActive=0,globalMax=0;
await Promise.all(Array.from({length:8},(_,i)=>runAiTask('user-'+i,async()=>{globalMax=Math.max(globalMax,++globalActive);await new Promise(r=>setTimeout(r,10));globalActive--;})));assert.equal(globalMax,4);
const original=globalThis.fetch;let sent;
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const env={BUCKET:{get:async()=>({json:async()=>({apiKey:'test-only-not-a-real-key',model:'gemini-2.5-flash'})})}};
const call=body=>worker.fetch(new Request('https://studio.example/api/inspiration-mixer/mix',{method:'POST',headers:{origin:'https://studio.example','Content-Type':'application/json','oai-authenticated-user-id':'test-mixer-user'},body:JSON.stringify(body)}),env);
try{
 globalThis.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({synthesizedConcepts:[{title:'mixed result'}]})}]}}]});};
 const result=await call({items:[{title:'first'},{title:'second'}],images:[image,image]});assert.equal(result.status,200);assert.equal((await result.json()).synthesizedConcepts[0].title,'mixed result');assert.equal(sent.contents.flatMap(x=>x.parts).filter(x=>x.inlineData).length,2);
 assert.equal((await call({items:[{title:'first'},{title:'second'}]})).status,400);
 console.log('PASS: per-account serialization, bounded waiting queue, global AI concurrency, mixer sends both actual image bytes to mocked Gemini, missing images rejected');
}finally{globalThis.fetch=original;}
