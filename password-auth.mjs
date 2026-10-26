import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { encryptConfig, decryptConfig } from './session-crypto.mjs';
const deriveKey = promisify(scrypt);
const SESSION = '__Host-dekel-session';
export const readCookie = (header, name) => String(header || '').split(';').map(item => item.trim()).find(item => item.startsWith(name + '='))?.slice(name.length + 1);
const userKey = value => value.normalize('NFKC').trim().toLowerCase();
const publicUser = account => ({ sessionVersion:account.sessionVersion || 0, id: account.id, username: account.username, email: '', provider: 'password' });

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const digest = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${digest.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, hash] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const digest = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(digest, Buffer.from(hash, 'hex'));
}

export function createPasswordAuth({ secret, ownerPassword, storePromise, getStore }) {
  const sessionSecret = secret + ':password-session-v1';
  const cookie = (value, age) => `${SESSION}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
  const sessionCookie = user => cookie(encryptConfig({ purpose: 'password-session', user }, sessionSecret), 30 * 86400);
  const send = (response, body, status = 200, cookies) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(cookies ? { 'Set-Cookie': cookies } : {}) });
    response.end(JSON.stringify(body));
  };
  async function readJson(request) {
    const chunks = []; let size = 0;
    for await (const chunk of request) { size += chunk.length; if (size > 4096) throw new Error('Request too large'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  }
  const dummy = hashPassword(randomBytes(24).toString('hex'));
  return {
    async readUser(request) {
      const value = decryptConfig(readCookie(request.headers.cookie, SESSION), sessionSecret);
      if (!(value?.purpose === 'password-session' && typeof value.user?.id === 'string' && ['owner','password'].includes(value.user.provider))) return null;
      if (value.user.provider === 'owner') return value.user;
      const store = await (getStore ? getStore() : storePromise);
      if (!store) throw Error('Account database unavailable');
      if (store.security && (await store.security(value.user.id)).session_version !== (value.user.sessionVersion || 0)) return null;
      return value.user;
    },
    async handle(request, response, origin) {
      const pathname = new URL(request.url, origin).pathname;
      if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/auth/')) return false;

      if (pathname === '/api/auth/session' && request.method === 'GET') {
        const store = await (getStore ? getStore() : storePromise);
        send(response, { user: await this.readUser(request), registrationEnabled: Boolean(store), ownerLoginEnabled: Boolean(ownerPassword), authMode: 'password' }); return true;
      }
      if (request.method !== 'POST') { send(response, { error: 'הפעולה אינה זמינה' }, 405); return true; }
      if (request.headers.origin !== origin) { send(response, { error: 'בקשה לא מורשית' }, 403); return true; }
      if (pathname === '/api/auth/logout') {
        send(response, { ok: true }, 200, [cookie('', 0), '__Host-dekel-config=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0']); return true;
      }
      if (!['/api/auth/register', '/api/auth/login', '/api/auth/owner', '/api/auth/recover', '/api/auth/recovery-code'].includes(pathname)) { send(response, { error: 'הכתובת לא נמצאה' }, 404); return true; }
      let input;
      try { input = await readJson(request); } catch { send(response, { error: 'הבקשה אינה תקינה' }, 400); return true; }
      if (pathname === '/api/auth/recovery-code') {
        const user = await this.readUser(request);
        const store = await (getStore ? getStore() : storePromise);
        if (!user || user.provider !== 'password' || !store?.setRecovery) { send(response,{error:'קוד שחזור זמין לחשבון משתמש מחובר'},403); return true; }
        const account=await store.findById(user.id);
        if (!await verifyPassword(input.password,account?.password_hash)) {send(response,{error:'הסיסמה אינה נכונה'},401);return true;}
        const recoveryCode=randomBytes(32).toString('hex');
        await store.setRecovery(user.id,createHash('sha256').update(recoveryCode).digest('hex'),new Date(Date.now()+365*86400000).toISOString());
        send(response,{recoveryCode});return true;
      }
      if (pathname === '/api/auth/recover') {
        const store=await (getStore ? getStore() : storePromise);
        const newPassword=typeof input.newPassword==='string'?input.newPassword:'';
        const code=typeof input.recoveryCode==='string'?input.recoveryCode.trim():'';
        if (!store?.recoverPassword) {send(response,{error:'שחזור החשבון אינו זמין כרגע'},503);return true;}
        if (newPassword.length<8||newPassword.length>128||!/^[a-f0-9]{64}$/.test(code)) {send(response,{error:'יש להזין קוד שחזור תקין וסיסמה חדשה של 8–128 תווים'},400);return true;}
        const account=await store.find(userKey(String(input.username||'')));
        const hash=await hashPassword(newPassword);
        const ok=account&&await store.recoverPassword(account.id,createHash('sha256').update(code).digest('hex'),hash);
        if (!ok) {send(response,{error:'שם המשתמש או קוד השחזור אינם תקינים, או שהקוד כבר נוצל'},400);return true;}
        send(response,{ok:true},200,[cookie('',0),'__Host-dekel-config=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0']);return true;
      }
      const username = typeof input.username === 'string' ? input.username.normalize('NFKC').trim() : '';
      const password = typeof input.password === 'string' ? input.password : '';
      if (pathname === '/api/auth/owner' || (pathname === '/api/auth/login' && userKey(username) === 'dekel')) {
        if (!ownerPassword) { send(response, { error: 'הכניסה אינה זמינה' }, 403); return true; }
        const supplied = createHash('sha256').update(password).digest();
        if (!timingSafeEqual(supplied, createHash('sha256').update(ownerPassword).digest())) { send(response, { error: 'הסיסמה אינה נכונה' }, 401); return true; }
        const owner = { id: 'owner', username: 'בעל הסטודיו', email: '', provider: 'owner' };
        send(response, { user: owner }, 200, sessionCookie(owner)); return true;
      }
      const store = await (getStore ? getStore() : storePromise);
      if (!store) { send(response, { error: 'ההרשמה והכניסה לחשבונות ייפתחו לאחר חיבור מסד הנתונים. בעל הסטודיו יכול להיכנס עם הסיסמה הקיימת.' }, 503); return true; }
      if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username) || password.length < (pathname === '/api/auth/register' ? 8 : 1) || password.length > 128) {
        send(response, { error: 'שם משתמש: 3–32 אותיות, מספרים, נקודה, קו או קו תחתון. סיסמה: 8–128 תווים.' }, 400); return true;
      }
      const key = userKey(username);
      if (['owner', 'admin', 'dekel'].includes(key)) { send(response, { error: 'שם המשתמש שמור. בחר שם אחר.' }, 400); return true; }
      if (pathname === '/api/auth/register') {
        const account = await store.create(username, key, await hashPassword(password));
        if (!account) { send(response, { error: 'שם המשתמש כבר תפוס. בחר שם אחר.' }, 409); return true; }
        const user = publicUser(account);
        send(response, { user }, 201, sessionCookie(user)); return true;
      }
      const account = await store.find(key);
      const valid = await verifyPassword(password, account?.password_hash || await dummy);
      if (!account || !valid) { send(response, { error: 'שם המשתמש או הסיסמה אינם נכונים' }, 401); return true; }
      const user = publicUser({...account,sessionVersion:account.session_version || 0});
      send(response, { user }, 200, sessionCookie(user)); return true;
    },
  };
}

