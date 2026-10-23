/** Local alpha extraction for approximately uniform, edge-connected backgrounds.
 * Refuses complex backgrounds rather than pretending segmentation was successful.
 * No uploads, no AI calls. For detailed objects use Shadow Master for manual cleanup.
 */
export async function removeImageBackground(dataUrl: string, mode: 'clean' | 'soft'): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw Error('לא ניתן לפתוח משטח עיבוד תמונה');
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data, w = canvas.width, h = canvas.height;
  const corners = [0,(w-1)*4,(w*(h-1))*4,(w*h-1)*4];
  const rgb = [0,1,2].map(channel => corners.reduce((sum,i)=>sum+d[i+channel],0)/4);
  const cornerSpread = Math.max(...corners.map(i => Math.hypot(d[i]-rgb[0],d[i+1]-rgb[1],d[i+2]-rgb[2])));
  if (cornerSpread > 55) throw Error('הרקע אינו אחיד מספיק לחיתוך אוטומטי. השתמש במעבדת השקיפות והצללים להסרה מדויקת.');
  const n=w*h;
  const seen = new Uint8Array(n), queue = new Int32Array(n);
  let head=0, tail=0;
  const matches=(pix:number)=>{const o=pix*4;return Math.hypot(d[o]-rgb[0],d[o+1]-rgb[1],d[o+2]-rgb[2]) < (mode==='soft' ? 52 : 33)};
  const push=(pix:number)=>{if(!seen[pix]&&matches(pix)){seen[pix]=1;queue[tail++]=pix;}};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);if(x)push(p-1);if(x<w-1)push(p+1);if(y)push(p-w);if(y<h-1)push(p+w);}
  if(tail/n < .035) throw Error('לא נמצא רקע אחיד בקצוות. לא בוצעה הסרת רקע כדי לא לפגוע בתמונה.');
  for(let p=0;p<n;p++){
    if(seen[p])d[p*4+3]=0;
    else if(mode==='soft'){
      const x=p%w,y=Math.floor(p/w);
      if((x>0&&seen[p-1])||(x<w-1&&seen[p+1])||(y>0&&seen[p-w])||(y<h-1&&seen[p+w]))d[p*4+3]=Math.min(d[p*4+3],190);
    }
  }
  ctx.putImageData(image,0,0);
  return canvas.toDataURL('image/png');
}
