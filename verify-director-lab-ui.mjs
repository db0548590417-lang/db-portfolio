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

 const concept=(id,title)=>({id,conceptName:title,coreIdea:'Core '+id,visualExecution:'Visual '+id,suggestedHeadline:'Copy '+id,imageGenerationPrompt:'Prompt '+id,referenceIds:['ref-'+id],createdAt:1});
 await page.evaluate(({one,two})=>{const projects=JSON.parse(localStorage.getItem('inspira_studio_projects_v1'));projects[0].creativeDrafts=[one,two];projects[0].creativeWorkspace={mode:'full',approvedCopy:'Workspace copy',visualDirection:'Workspace visual',notes:'Workspace notes'};localStorage.setItem('inspira_studio_projects_v1',JSON.stringify(projects));},{one:concept('one','First direction'),two:concept('two','Second direction')});
 await page.reload();
 const director=()=>page.getByRole('button',{name:'במאי קריאייטיב',exact:true});
 await director().click();await page.getByRole('button',{name:'המשך את הרעיון הנוכחי במעבדת הרעיונות',exact:true}).click();
 assert.match(await page.locator('#seed-idea').inputValue(),/Workspace copy/);
 await director().click();await page.getByRole('button',{name:/קונספטים שהופקו/}).click();await page.getByRole('button',{name:'ערוך והרחב במעבדת הרעיונות',exact:true}).first().click();
 assert.match(await page.locator('#seed-idea').inputValue(),/Core one/);assert.match(await page.locator('#seed-idea').inputValue(),/Prompt one/);
 await page.locator('#seed-idea').fill('My edited idea with additional detail');await page.reload();await page.getByRole('button',{name:'מעבדת רעיונות',exact:true}).click();assert.equal(await page.locator('#seed-idea').inputValue(),'My edited idea with additional detail');
 await director().click();await page.getByRole('button',{name:/קונספטים שהופקו/}).click();await page.getByRole('button',{name:'+ סמן למיזוג',exact:true}).first().click();await page.getByRole('button',{name:'+ סמן למיזוג',exact:true}).first().click();
 await page.getByRole('button',{name:'פתח את הנבחרים במעבדת הרעיונות',exact:true}).click();assert.match(await page.locator('#seed-idea').inputValue(),/Core one/);assert.match(await page.locator('#seed-idea').inputValue(),/Core two/);
 await director().click();await page.getByRole('button',{name:/קונספטים שהופקו/}).click();await page.getByRole('button',{name:'+ סמן למיזוג',exact:true}).first().click();await page.getByRole('button',{name:'+ סמן למיזוג',exact:true}).first().click();
 await page.route('**/api/creative-director/generate',route=>{assert.equal(route.request().postDataJSON().mode,'combine');return route.fulfill({json:{concepts:[concept('merged','Merged direction')]}});});
 await page.getByRole('button',{name:'מזג 2 קונספטים נבחרים',exact:true}).click();await page.getByRole('heading',{name:'Merged direction',exact:true}).waitFor();await page.getByRole('button',{name:'ערוך והרחב במעבדת הרעיונות',exact:true}).first().click();assert.match(await page.locator('#seed-idea').inputValue(),/Core merged/);
 await page.locator('#seed-idea').fill('Edited merged idea');await page.locator('#idea-feedback').fill('Add a new visual twist');
 let payload;
 await page.route('**/api/idea-factory/generate',route=>{payload=route.request().postDataJSON();return route.fulfill({json:{ideas:[{id:'refined',title:'Refined idea',visualHook:'New visual',mechanism:'New mechanism',executionTip:'Tip',suggestedCopy:'Headline',imagePrompt:'Final prompt'}]}});});
 await page.getByRole('button',{name:'לטש לפי ההערות',exact:true}).click();await page.getByText('Refined idea',{exact:true}).waitFor({timeout:5000}).catch(async error=>{console.log(JSON.stringify({payload,errors,text:(await page.locator('body').innerText()).slice(-6500)}));throw error;});assert.equal(payload.seedIdea,'Edited merged idea');assert.equal(payload.feedback,'Add a new visual twist');assert.equal(payload.sourceConcepts[0].conceptName,'Merged direction');
 await page.getByRole('button',{name:'שמור כקונספט',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('inspira_studio_projects_v1'))[0].concepts.find(c=>c.conceptName==='Refined idea'));assert(saved);assert(saved.referenceIds.includes('ref-one'));assert(saved.referenceIds.includes('ref-two'));assert.deepEqual(errors,[]);
 console.log('PASS: workspace, single and multiple drafts, merged concept transfer to idea lab; edits persist, AI receives edited idea and feedback, saved refinement retains references');
}finally{await browser?.close();await new Promise(r=>server.close(r));await store.close();}
