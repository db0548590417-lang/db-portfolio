const active = new Map(), history = new Map(), queue = [];
let running = 0;
const statsFor = id => {if(!history.has(id)){if(history.size>10000)history.delete(history.keys().next().value);history.set(id,{completed:0,failed:0,lastDurationMs:0});}return history.get(id);};
export const aiUsage = id => ({...statsFor(id),running:active.get(id)||0,waiting:queue.filter(item=>item.id===id).length,since:'server-start'});
function drain(){
  while(running<4){
    const index=queue.findIndex(item=>!active.get(item.id));if(index<0)return;
    const item=queue.splice(index,1)[0];clearTimeout(item.timer);
    running++;active.set(item.id,1);item.resolve();
  }
}
export async function runAiTask(id,task){
  if(queue.length>=32||queue.filter(item=>item.id===id).length>=2)throw Error('תור ה־AI מלא. המתן לסיום הבקשה הקודמת.');
  await new Promise((resolve,reject)=>{
    const item={id,resolve,timer:null};
    item.timer=setTimeout(()=>{const index=queue.indexOf(item);if(index>=0)queue.splice(index,1);reject(Error('ההמתנה בתור הסתיימה. נסה שוב.'));},60000);
    queue.push(item);drain();
  });
  const start=Date.now();
  try{const result=await task(AbortSignal.timeout(120000));statsFor(id).completed++;return result;}
  catch(error){statsFor(id).failed++;throw error;}
  finally{statsFor(id).lastDurationMs=Date.now()-start;running--;active.delete(id);drain();}
}
