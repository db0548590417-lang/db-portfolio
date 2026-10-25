import React, { useEffect, useState } from 'react';

export function ArtworkImage({src,fallbackSrc,alt,className}:{src:string;fallbackSrc?:string;alt:string;className?:string}) {
  const [index,setIndex]=useState(0);
  useEffect(()=>setIndex(0),[src,fallbackSrc]);
  const sources=[...new Set([src,fallbackSrc].filter(Boolean) as string[])].flatMap(url=>url.startsWith('https://')?['/api/inspiration/image?url='+encodeURIComponent(url),url]:[url]);
  if(index>=sources.length)return <div role="status" className="flex h-full min-h-32 w-full items-center justify-center p-5 text-center text-sm text-zinc-300">תמונת המקור אינה זמינה כרגע. אפשר לפתוח את העבודה באתר המקור.</div>;
  return <img src={sources[index]} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={()=>setIndex(i=>i+1)} />;
}
