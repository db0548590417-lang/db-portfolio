import JSZip from 'jszip';
import { listDesignImages, loadDesignImage, restoreDesignImages } from './designAssetsDb';
import type { Project } from '../types';

export async function createProjectArchive(projects: Project[]): Promise<Blob> {
  const zip = new JSZip();
  for (const project of projects) {
    const ids = [...(project.designAssets || []).map(item=>item.id), ...project.generatedImages.filter(item=>!item.url).map(item=>item.id), ...project.savedInspirations.filter(item=>item.source==='מהמחשב').map(item=>'ref-'+item.id)];
    for (const id of ids) if (!await loadDesignImage(id)) throw Error('חסרה תמונה שמקושרת לפרויקט. חבר את אחסון הענן או העלה אותה מחדש לפני גיבוי מלא.');
  }
  const images = await listDesignImages();
  const entries: {id: string; file: string; mime: string}[] = [];
  for (const [id, data] of Object.entries(images)) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data);
    if (!match) throw Error('תמונה שמורה בפורמט לא נתמך. לא נוצר גיבוי חלקי.');
    const file = `images/${entries.length}.${match[1].split('/')[1]}`;
    zip.file(file, match[2], {base64:true});
    entries.push({id, file, mime:match[1]});
  }
  zip.file('manifest.json', JSON.stringify({format:'dekel-studio', version:2, projects, images:entries}));
  return zip.generateAsync({type:'blob', compression:'DEFLATE'});
}

export async function readProjectArchive(file: File): Promise<unknown[]> {
  if (file.size > 250_000_000) throw Error('הגיבוי גדול מדי. המגבלה היא 250MB.');
  if (file.name.toLowerCase().endsWith('.json')) return JSON.parse(await file.text());
  const zip = await JSZip.loadAsync(file);
  // Check central-directory sizes before allocating decompression buffers.
  let expanded = 0;
  for (const entry of Object.values(zip.files)) {
    if(entry.dir)continue;
    const size=(entry as any)._data?.uncompressedSize;
    if(!Number.isSafeInteger(size)||size<0)throw Error('מבנה ZIP אינו תקין');
    expanded+=size;
    if(expanded>250_000_000 || (entry.name==='manifest.json'&&size>10_000_000) || (entry.name!=='manifest.json'&&size>50_000_000))throw Error('הגיבוי חורג ממגבלת הנפח');
  }
  const manifest = zip.file('manifest.json');
  if (!manifest) throw Error('לא נמצא קובץ נתונים בגיבוי');
  const data = JSON.parse(await manifest.async('string'));
  if (data.format !== 'dekel-studio' || data.version !== 2 || !Array.isArray(data.projects) || !Array.isArray(data.images) || data.images.length > 5000) throw Error('פורמט גיבוי אינו נתמך');
  const images: Record<string,string> = {};
  let total = 0;
  for (const entry of data.images) {
    if (typeof entry.id !== 'string' || !/^image\/(png|jpeg|webp)$/.test(entry.mime) || !/^images\/\d+\.(png|jpeg|webp)$/.test(entry.file)) throw Error('רשומת תמונה לא תקינה בגיבוי');
    const image = zip.file(entry.file);
    if (!image) throw Error('חסרה תמונה בגיבוי');
    const bytes = await image.async('uint8array');
    total += bytes.length;
    if (total > 250_000_000 || bytes.length > 50_000_000) throw Error('נפח התמונות בגיבוי גדול מדי');
    const base64 = await image.async('base64');
    images[entry.id] = `data:${entry.mime};base64,${base64}`;
  }
  // Validate project records before making any database changes.
  if (!data.projects.length || data.projects.some((p:any) => !p || typeof p.id !== 'string' || typeof p.name !== 'string')) throw Error('נתוני הפרויקטים בגיבוי אינם תקינים');
  await restoreDesignImages(images);
  return data.projects;
}
