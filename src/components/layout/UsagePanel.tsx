import React,{useEffect,useState} from 'react';
export function UsagePanel(){
 const [usage,setUsage]=useState<any>(null);
 useEffect(()=>{let alive=true;const read=()=>fetch('/api/usage/status').then(r=>r.ok?r.json():null).then(data=>{if(alive)setUsage(data);}).catch(()=>{});void read();const timer=setInterval(read,5000);return()=>{alive=false;clearInterval(timer);};},[]);
 return <section className="mt-4 rounded-lg border border-[#31535A] p-3 text-sm text-zinc-200"><h3 className="font-bold text-white">פעילות AI</h3>{usage?<><p>{usage.running} בקשות פעילות · {usage.waiting} ממתינות · {usage.completed} הושלמו · {usage.failed} נכשלו</p><p className="mt-2 text-xs">הספירה מאז עליית השרת. זהו מעקב בקשות ולא חשבון חיוב. עלויות ומכסה בפועל מנוהלות בחשבון Google שלך.</p></>:<p>אין נתוני פעילות זמינים כרגע.</p>}</section>;
}
