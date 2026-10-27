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

 await page.route('https://images.unsplash.com/test-transfer.png',route=>route.abort());
 await page.route('**/api/inspiration/image?url=*',route=>route.fulfill({contentType:'image/png',body:Buffer.from(image.split(',')[1],'base64')}));
 await page.evaluate(()=>{const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));projects[0].savedInspirations.push({id:'remote-test',title:'Remote inspiration',url:'https://images.unsplash.com/test-transfer.png',source:'Test source'});localStorage.setItem('inspira_studio_projects_v1',JSON.stringify(projects));});
 await page.reload();
 const requests=[];
 await page.route('**/api/creative-analyzer/analyze',route=>{requests.push(route.request().postDataJSON());return route.fulfill({json:{overallScore:8,observableElements:[],creativeRecommendations:[]}});});
 for(const title of ['Test brand logo','Remote inspiration']){
   await page.getByRole('button',{name:'צייד השראות',exact:true}).click();
   await page.locator('summary').filter({hasText:'ספריית ההשראות שלי'}).click();
   await page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'נתח את ההשראה',exact:true}).click();
   const analyze=page.getByRole('button',{name:'הפעל ניתוח מולטימודלי',exact:false});
   await analyze.click({timeout:15000});
   await page.getByText('ניתוח הקריאייטיב הושלם בהצלחה!',{exact:true}).waitFor();
   assert.equal(requests.at(-1).imageBase64,image);assert.equal(requests.at(-1).mimeType,'image/png');
 }
 assert.equal(requests.length,2);assert.deepEqual(errors,[]);
 console.log('PASS: library-to-analyzer transfer loads exact local image without URL and remote image through proxy when direct access is blocked');
}finally{await browser?.close();await new Promise(r=>server.close(r));await store.close();}
