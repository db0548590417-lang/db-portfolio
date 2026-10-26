// API keys are opaque. Google validates their format; the UI only cleans paste artifacts.
export function normalizeGeminiKey(value:unknown):string {
  if(typeof value!=='string')return '';
  let key=value.replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,'');
  if(key.length>=2&&[['"','"'],["'","'"],['“','”'],['‘','’']].some(([start,end])=>key.startsWith(start)&&key.endsWith(end)))key=key.slice(1,-1);
  return key;
}
export function canSubmitGeminiKey(key:string):boolean {
  // Bound requests and reject unsafe header characters without assuming a Google key prefix/length.
  return key.length>0&&key.length<=1024&&/^[\x21-\x7e]+$/.test(key);
}
