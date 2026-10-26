import {Buffer} from 'node:buffer';
export function imageInput(raw:unknown,mime:unknown,label:string){
  if(typeof raw!=='string'||raw.length>10_700_000)throw Error(label+': קובץ התמונה גדול מדי או אינו תקין');
  const dataUri=/^data:(image\/(?:png|jpeg|webp));base64,/.exec(raw);
  const type=dataUri?.[1]||mime;const data=dataUri?raw.slice(dataUri[0].length):raw;
  if(!['image/png','image/jpeg','image/webp'].includes(String(type))||!data||data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error(label+': נדרשת תמונת PNG, JPG או WebP תקינה');
  const bytes=Buffer.from(data,'base64');
  if(bytes.length>8_000_000||bytes.length<12)throw Error(label+': התמונה חייבת להיות עד 8MB');
  const valid=type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid)throw Error(label+': תוכן הקובץ אינו תואם לסוג התמונה');
  return{inlineData:{data,mimeType:String(type)}};
}
export function generationParts(input:any,prompt:string){
  const parts:any[]=[];
  if(input.referenceImageBase64){parts.push({text:input.referenceAssetRole==='product'?'PRODUCT IMAGE: Preserve this supplied product identity, shape, packaging and details. Place this product in the requested scene.':'STYLE REFERENCE IMAGE: Use for visual guidance only; this is separate from the brand logo.'},imageInput(input.referenceImageBase64,input.referenceMimeType||'image/png','רפרנס'));}
  if(input.logoImageBase64){parts.push({text:'BRAND LOGO IMAGE: This is the user-supplied brand identity, not a style inspiration. Apply THIS logo to the requested mockup surface, packaging or object. Preserve its spelling, lettering, geometry, colors and proportions. Do not invent, redesign or replace it. Preserve transparent areas; use realistic perspective, printing/embossing and lighting as appropriate to the requested mockup.'},imageInput(input.logoImageBase64,input.logoMimeType||'image/png','לוגו'));}
  parts.push({text:prompt});return parts;
}
