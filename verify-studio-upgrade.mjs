import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import JSZip from 'jszip';
import {createRenderServer} from './host-render.mjs';
import {createSqliteAccountStore} from './account-store.mjs';
const {chromium}=await import(pathToFileURL('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const store=await createSqliteAccountStore(':memory:');const server=createRenderServer({accountStore:store,secret:'test-studio-upgrade-secret-with-more-than-32-characters',password:'local-test-password',hosted:false});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const login=async p=>{await p.route('**/api/settings/gemini',route=>route.fulfill({json:{configured:false}}));await p.goto(origin);await p.getByLabel('שם משתמש',{exact:true}).fill('dekel');await p.getByLabel('סיסמה',{exact:true}).fill('local-test-password');await p.getByRole('button',{name:'כניסה לסטודיו',exact:true}).click();await p.getByRole('button',{name:'דלג על ההדרכה'}).click();};
const settings=async p=>{await p.getByRole('button',{name:'הגדרות',exact:true}).click();await p.getByRole('button',{name:'גיבוי וייבוא',exact:true}).click();};
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await login(page);
 await page.evaluate(async image=>{
   const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));projects[0].name='בדיקת גיבוי';projects[0].generatedImages=[{id:'export-test',url:'',prompt:'תוצר אמיתי',aspectRatio:'1:1',createdAt:Date.now()}];projects[0].savedInspirations=[{id:'logo-test',title:'לוגו בדיקה',source:'מהמחשב',url:'',thumbUrl:'',assetRole:'logo'}];
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('dekel-design-assets-v1',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
   await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(image,'export-test');tx.objectStore('images').put(image,'ref-logo-test');tx.oncomplete=resolve;tx.onerror=reject;});db.close();localStorage.setItem('inspira_studio_projects_v1',JSON.stringify(projects));
 },image);
 await page.reload();await settings(page);const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'הורד ZIP עם הפרויקטים והתמונות',exact:true}).click();const backup=await downloaded;const archive=await JSZip.loadAsync(await fs.readFile(await backup.path()));const manifest=JSON.parse(await archive.file('manifest.json').async('string'));assert.equal(manifest.images.length,2);assert.equal(manifest.projects[0].name,'בדיקת גיבוי');
 const backupPath=path.resolve('.local-data/roundtrip-backup.zip');await backup.saveAs(backupPath);
 const fresh=await browser.newPage({viewport:{width:1440,height:1000}});fresh.on('pageerror',e=>errors.push(e.message));fresh.on('dialog',d=>d.accept());await login(fresh);await settings(fresh);await fresh.locator('input[type=file][accept=".zip,.json"]').setInputFiles(backupPath);await fresh.getByText('נטענו 1 פרויקטים בהצלחה מגיבוי!',{exact:true}).waitFor();await fresh.getByRole('button',{name:'סגור',exact:true}).click();
 await fresh.getByRole('button',{name:'סטודיו ייצוא מקצועי',exact:true}).click();await fresh.getByLabel('תוצר לייצוא').selectOption('export-test');await fresh.getByAltText('התוצר שנבחר לייצוא').waitFor();assert.equal(await fresh.getByAltText('התוצר שנבחר לייצוא').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 const pngPromise=fresh.waitForEvent('download');await fresh.getByRole('button',{name:'הורד קובץ',exact:true}).click();const png=await pngPromise;const bytes=await fs.readFile(await png.path());assert.equal(bytes.subarray(1,4).toString(),'PNG');
 await fresh.getByLabel('פורמט ייצוא').selectOption('pdf');const pdfPromise=fresh.waitForEvent('download');await fresh.getByRole('button',{name:'הורד קובץ',exact:true}).click();const pdf=await pdfPromise;assert.equal((await fs.readFile(await pdf.path())).subarray(0,4).toString(),'%PDF');
 const resumedId='11111111-1111-4111-8111-111111111111';
 await fresh.route('**/api/generation-jobs?id='+resumedId,route=>route.fulfill({json:route.request().method()==='DELETE'?{ok:true}:{state:'completed',result:{imageUrl:image}}}));
 await fresh.evaluate(id=>{const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));localStorage.setItem('dekel-image-jobs-v1',JSON.stringify([{id,projectId:projects[0].id,image:{id:'gen-'+id,prompt:'Recovered background image',aspectRatio:'1:1',createdAt:Date.now()}}]));},resumedId);
 await fresh.reload();
 await fresh.waitForFunction(id=>JSON.parse(localStorage.getItem('inspira_studio_projects_v1'))[0].generatedImages.some(image=>image.id==='gen-'+id),resumedId);
 console.log('PASS: completed background image is recovered and saved after browser reload');
 await fresh.getByRole('button',{name:'מעבדת רעיונות',exact:true}).click();await fresh.getByLabel('יש לי התחלה של רעיון').waitFor();await fresh.evaluate(()=>{const previous=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('inspira_studio_projects'))throw new DOMException('Quota exceeded','QuotaExceededError');return previous.call(this,key,value);};});await fresh.getByLabel('יש לי התחלה של רעיון').fill('בדיקת כשל שמירה');await fresh.getByText('השמירה במכשיר נכשלה.',{exact:false}).waitFor();
 await fresh.screenshot({path:'review/upgrade-save-error.png'});
 assert.deepEqual(errors,[]);console.log('PASS: ZIP includes exact image files, clean-browser import restores metadata and images, selected actual artwork exports as PNG and PDF, storage failure is persistent and visible');
}finally{await browser?.close();await new Promise(r=>server.close(r));await store.close();}
