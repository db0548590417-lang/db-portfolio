import app from '../server';
import { requestScope } from './runtime';
import assets from './assets.json';
import {geminiError} from './gemini-errors';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const configPath = (userId: string) => `users/${encodeURIComponent(userId)}/gemini-config.json`;

async function getConfig(bucket: any, userId: string) {
  if (!bucket) throw new Error('אחסון האתר אינו זמין');
  const item = await bucket.get(configPath(userId));
  return item ? item.json() : null;
}

async function configure(request: Request, env: any, userId: string) {
  if (request.method === 'GET') {
    const config = await getConfig(env.BUCKET, userId);
    return json({ configured: Boolean(config?.apiKey), model: config?.model || null });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: 'הבקשה לא מורשית' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 10000) return json({ error: 'בקשה גדולה מדי' }, 413);
  const text = await request.text();
  if (text.length > 10000) return json({ error: 'בקשה גדולה מדי' }, 413);
  let value: any;
  try { value = JSON.parse(text); } catch { return json({ error: 'בקשה לא תקינה' }, 400); }
  if(value.test===true){
    const config=await getConfig(env.BUCKET,userId);
    if(!config?.apiKey)return json({error:'לא נשמר מפתח בדפדפן הזה. שמור חיבור לפני הבדיקה.',code:'KEY_MISSING'},400);
    try{
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(config.model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':config.apiKey},body:JSON.stringify({contents:[{parts:[{text:'Reply OK'}]}],generationConfig:{maxOutputTokens:4}}),signal:AbortSignal.timeout(20000)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)return json(geminiError(response.status,body),response.status===429?429:400);
      return json({working:true,message:'החיבור נבדק בהצלחה. Gemini השלים בקשת טקסט.',model:config.model});
    }catch{return json({error:'השרת לא הצליח להגיע ל־Gemini בזמן. נסה שוב בעוד רגע.',code:'CONNECTION_FAILED'},502);}
  }
  const key = typeof value.apiKey === 'string' ? value.apiKey.trim() : '';
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(key)) return json({ error: 'יש להזין מפתח Gemini תקין' }, 400);
  let response: Response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
      headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(20000),
    });
  } catch { return json({ error: 'לא ניתן להתחבר ל-Gemini כרגע. נסה שוב בעוד רגע.' }, 502); }
  if (!response.ok) return json(geminiError(response.status,await response.json().catch(()=>({}))),response.status===429?429:400);
  const result: any = await response.json();
  const available = (result.models || []).filter((model: any) => model.supportedGenerationMethods?.includes('generateContent')).map((model: any) => model.name.replace(/^models\//, ''));
  const preferred = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
  const model = preferred.find(name => available.includes(name)) || available.find((name: string) => /flash/.test(name) && !/image|audio|tts|live/.test(name));
  if (!model) return json({ error: 'לא נמצא מודל טקסט זמין למפתח הזה' }, 400);
  await env.BUCKET.put(configPath(userId), JSON.stringify({ apiKey: key, model }));
  return json({ configured: true, model });
}

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const userId = request.headers.get('oai-authenticated-user-id');
      if (!userId) return json({ error: 'נדרשת התחברות לחשבון שלך' }, 401);
      try {
        if (url.pathname === '/api/settings/gemini') return await configure(request, env, userId);
        const config = await getConfig(env.BUCKET, userId);
        const values = { ...env, GEMINI_API_KEY: config?.apiKey || '', INSPIRA_VISION_MODEL: config?.model || 'gemini-2.5-flash' };
        return await requestScope.run({ userId, bucket: env.BUCKET, values }, () => app.handle(request));
      } catch { return json({ error: 'לא ניתן לטעון את הגדרות האתר כרגע' }, 503); }
    }
    const asset = (assets as Record<string, { type: string; data: string }>)[url.pathname] || (!url.pathname.includes('.') ? (assets as any)['/index.html'] : null);
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.data), char => char.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, { headers: {
      'Content-Type': asset.type,
      'Cache-Control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    } });
  },
};
