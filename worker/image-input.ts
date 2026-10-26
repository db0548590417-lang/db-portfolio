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
  const roles:Record<string,string>={logo:'BRAND LOGO IMAGE: Apply this exact brand identity. Preserve its spelling, lettering, geometry, colors, proportions and transparent areas. Do not invent or redesign the logo.',product:'PRODUCT IMAGE: Preserve this product identity, shape, packaging and details; use it as the subject.',art_style:'STYLE REFERENCE IMAGE: Transfer the artistic language, technique and finish; preserve the requested subject.',composition:'COMPOSITION REFERENCE IMAGE: Transfer spatial arrangement, camera angle, framing and perspective.',materials:'MATERIALS REFERENCE IMAGE: Transfer materials, textures and surface finishes.',colors:'COLOR REFERENCE IMAGE: Transfer palette and color relationships.',lighting:'LIGHTING REFERENCE IMAGE: Transfer light direction, atmosphere, contrast and mood.',close:'VISUAL REFERENCE IMAGE: Follow visual properties closely while respecting the requested subject.'};
  const references:any[]=[];
  if(input.references!==undefined){
    if(!Array.isArray(input.references)||input.references.length>6)throw Error('אפשר לצרף עד 6 תמונות ליצירה, כולל לוגו');
    references.push(...input.references);
  }else if(input.referenceImageBase64)references.push({imageBase64:input.referenceImageBase64,mimeType:input.referenceMimeType,role:input.referenceAssetRole==='product'?'product':'art_style'});
  if(input.logoImageBase64)references.push({imageBase64:input.logoImageBase64,mimeType:input.logoMimeType,role:'logo'});
  if(references.length>6)throw Error('אפשר לצרף עד 6 תמונות ליצירה, כולל לוגו');
  let total=0;
  for(let index=0;index<references.length;index++){
    const reference=references[index];
    if(!reference||typeof reference!=='object'||typeof reference.role!=='string'||!Object.hasOwn(roles,reference.role))throw Error('יש לבחור תפקיד תקין לכל תמונה');
    const strength=reference.strength??3;
    if(!Number.isInteger(strength)||strength<1||strength>5)throw Error('עוצמת ההשפעה חייבת להיות בין 1 ל־5');
    if(reference.instruction!==undefined&&(typeof reference.instruction!=='string'||reference.instruction.length>1000))throw Error('הנחיה לתמונה מוגבלת ל־1000 תווים');
    const image=imageInput(reference.imageBase64,reference.mimeType||'image/png','רפרנס '+(index+1));
    total+=Buffer.from(image.inlineData.data,'base64').length;
    if(total>24_000_000)throw Error('הנפח הכולל של תמונות הרפרנס מוגבל ל־24MB');
    parts.push({text:'REFERENCE #'+(index+1)+' — '+roles[reference.role]+' Influence '+strength+'/5 (creative guidance, not a numeric guarantee). '+(reference.instruction?'User guidance for THIS image: '+reference.instruction:'')},image);
  }
  if(references.length)parts.push({text:'Treat every numbered image according to its own role. Logo and product images define identity; style, composition, materials, colors and lighting references provide only their selected properties. Apply all compatible instructions together. Do not replace the requested subject with an inspiration subject.'});
  parts.push({text:prompt});return parts;
}
