import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRenderServer} from './host-render.mjs';
import {createSqliteAccountStore} from './account-store.mjs';
const {chromium}=await import(pathToFileURL('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const store=await createSqliteAccountStore(':memory:');const server=createRenderServer({accountStore:store,secret:'multi-reference-ui-test-secret-more-than-thirty-two-characters',password:'local-test-password',hosted:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.route('**/api/settings/gemini',route=>route.fulfill({json:{configured:false}}));
 await page.goto(origin);await page.getByLabel('שם משתמש',{exact:true}).fill('dekel');await page.getByLabel('סיסמה',{exact:true}).fill('local-test-password');await page.getByRole('button',{name:'כניסה לסטודיו',exact:true}).click();await page.getByRole('button',{name:'דלג על ההדרכה'}).click();
 const image=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const context=canvas.getContext('2d');context.fillStyle='#43D6CB';context.fillRect(0,0,40,40);const data=canvas.toDataURL('image/png');const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));projects[0].savedInspirations=[{id:'brand-test',title:'Test brand logo',source:'מהמחשב',url:'',thumbUrl:'',assetRole:'logo'}];const db=await new Promise(resolve=>{const request=indexedDB.open('dekel-design-assets-v1',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('images'))request.result.createObjectStore('images');};request.onsuccess=()=>resolve(request.result);});await new Promise(resolve=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(data,'ref-brand-test');tx.oncomplete=resolve;});db.close();localStorage.setItem('inspira_studio_projects_v1',JSON.stringify(projects));return data;});
 await page.reload();await page.getByRole('button',{name:'מחולל תמונות',exact:true}).click();
 const names=['product.png','composition.png','lighting.png'];await page.getByLabel('העלאת כמה תמונות רפרנס',{exact:true}).setInputFiles(names.map(name=>({name,mimeType:'image/png',buffer:Buffer.from(image.split(',')[1],'base64')})));
 for(const [index,name] of names.entries()){await page.getByLabel('תפקיד עבור '+name,{exact:true}).selectOption(['product','composition','lighting'][index]);await page.getByLabel('הנחיה עבור '+name,{exact:true}).fill('Use '+name+' for its selected purpose');}
 await page.getByLabel('הנחיה ללוגו המותג',{exact:true}).fill('Emboss the exact logo on the package');await page.getByText('נבחרו 4 מתוך 6 תמונות',{exact:true}).waitFor();
 let resolveRequest;const captured=new Promise(resolve=>{resolveRequest=resolve;});

 let directCalls=0, directPayload;
 await page.route('**/api/visual-generator/generate',route=>{directCalls++;directPayload=route.request().postDataJSON();return route.fulfill({json:{imageUrl:image}});});
 await page.route('**/api/generation-jobs*',route=>{assert.equal(route.request().method(),'POST');resolveRequest(route.request().postDataJSON());return route.fulfill({status:503,json:{code:'BACKGROUND_STORAGE_UNAVAILABLE',error:'No background store'}});});

 await page.getByRole('button',{name:'הפק הדמיה עכשיו',exact:true}).click();const body=await captured;assert.equal(body.references.length,4);assert.deepEqual(body.references.map(ref=>ref.role),['logo','product','composition','lighting']);assert.equal(body.references[0].instruction,'Emboss the exact logo on the package');assert(body.references.every(ref=>ref.imageBase64===image));for(let index=0;index<names.length;index++)assert.equal(body.references[index+1].instruction,'Use '+names[index]+' for its selected purpose');
 await page.getByText('התמונה נוצרה ונשמרה בפרויקט',{exact:true}).waitFor();assert.equal(directCalls,1);assert.equal(directPayload.references.length,4);assert(directPayload.references.every(ref=>ref.imageBase64===image));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dekel-image-jobs-v1')||'[]').length),0);
 await page.route('**/api/generation-jobs*',route=>route.fulfill({status:503,json:{error:'Other storage error'}}));
 await page.getByRole('button',{name:'הפק הדמיה עכשיו',exact:true}).click();await page.getByText('Other storage error',{exact:true}).waitFor();assert.equal(directCalls,1);assert.deepEqual(errors,[]);
 const {createGenerationJobs}=await import('./generation-jobs.mjs');let code,status;const handler=createGenerationJobs({getStore:async()=>null,worker:{fetch:()=>{throw Error('AI must not run before fallback');}}});
 await handler(new Request('https://example.test/api/generation-jobs',{method:'POST',body:JSON.stringify({prompt:'Test'})}),{writeHead(value){status=value;return this;},end(value){code=JSON.parse(value).code;}},{id:'owner'},{});assert.equal(status,503);assert.equal(code,'BACKGROUND_STORAGE_UNAVAILABLE');
 console.log('PASS: no-database fallback makes exactly one direct generation with all image references, saves locally, clears tracking; unrelated errors never trigger a second AI request');
}finally{await browser?.close();await new Promise(r=>server.close(r));await store.close();}
