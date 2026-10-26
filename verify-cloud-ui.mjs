import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRenderServer} from './host-render.mjs';
import {createSqliteAccountStore} from './account-store.mjs';
const {chromium}=await import(pathToFileURL('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const store=await createSqliteAccountStore(':memory:');const server=createRenderServer({accountStore:store,cloudEnabled:true,secret:'cloud-ui-test-secret-longer-than-thirty-two-characters',password:'local-test-password',hosted:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';
const login=async page=>{await page.route('**/api/settings/gemini',route=>route.fulfill({json:{configured:false}}));await page.goto(origin);await page.getByLabel('שם משתמש',{exact:true}).fill('dekel');await page.getByLabel('סיסמה',{exact:true}).fill('local-test-password');await page.getByRole('button',{name:'כניסה לסטודיו',exact:true}).click();await page.getByRole('button',{name:'דלג על ההדרכה'}).click();};
const openSync=async page=>{await page.getByRole('button',{name:'הגדרות',exact:true}).click();await page.getByRole('button',{name:'גיבוי וייבוא',exact:true}).click();await page.getByRole('button',{name:'הפעל / סנכרן עכשיו',exact:true}).click();await page.getByRole('dialog',{name:'הגדרות'}).getByText('נשמר בענן',{exact:true}).waitFor();await page.getByRole('button',{name:'סגור',exact:true}).click();};
try{
 browser=await chromium.launch({channel:'chrome',headless:true});const a=await browser.newPage();await login(a);
 await a.evaluate(async image=>{const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));projects[0].name='פרויקט מסונכרן';projects[0].generatedImages=[{id:'cloud-image-test',url:'',prompt:'Cloud image',aspectRatio:'1:1',createdAt:Date.now()}];localStorage.setItem('inspira_studio_projects_v1',JSON.stringify(projects));const db=await new Promise(resolve=>{const request=indexedDB.open('dekel-design-assets-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);});await new Promise(resolve=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(image,'cloud-image-test');tx.oncomplete=resolve;});db.close();},image);
 await a.reload();await openSync(a);
 const b=await browser.newPage();await login(b);await openSync(b);
 await b.locator('header').getByRole('button').filter({hasText:'הפרויקט הראשון שלי'}).click();await b.locator('header').getByRole('button').filter({hasText:'פרויקט מסונכרן'}).click();
 await b.getByRole('button',{name:'סטודיו ייצוא מקצועי',exact:true}).click();await b.getByLabel('תוצר לייצוא').selectOption('cloud-image-test');await b.getByAltText('התוצר שנבחר לייצוא').waitFor();await b.waitForFunction(()=>document.querySelector('img[alt="התוצר שנבחר לייצוא"]')?.naturalWidth>0);
 assert.equal(await b.getByAltText('התוצר שנבחר לייצוא').evaluate(img=>img.naturalWidth),1);
 await a.getByRole('button',{name:'מעבדת רעיונות',exact:true}).click();await a.getByLabel('יש לי התחלה של רעיון').fill('שינוי מקביל');await a.getByText('יש שינוי ממכשיר אחר.',{exact:false}).waitFor();
 console.log('PASS: explicit cloud opt-in uploads metadata and image, independent browser downloads actual image, stale writer conflict is visible instead of overwriting');
}finally{await browser?.close();await new Promise(r=>server.close(r));await store.close();}
