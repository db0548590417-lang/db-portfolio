import { randomBytes, createHash } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { encryptConfig, decryptConfig } from './session-crypto.mjs';

const SESSION = '__Host-dekel-session';
const FLOW = '__Host-dekel-google-flow';
export const readCookie = (header, name) => String(header || '').split(';').map(value => value.trim()).find(value => value.startsWith(name + '='))?.slice(name.length + 1);
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length <= 500 && a === b;

export function createGoogleAuth(options) {
  const { secret, clientId, clientSecret, ownerPassword } = options;
  const googleEnabled = Boolean(clientId && clientSecret);
  const sessionSecret = secret + ':user-session';
  const cookie = (name, value, seconds, sameSite = 'Lax') => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${seconds}`;
  const sessionCookie = user => cookie(SESSION, encryptConfig({ purpose: 'session', user }, sessionSecret), 30 * 86400);
  const readUser = request => {
    const value = decryptConfig(readCookie(request.headers.cookie, SESSION), sessionSecret);
    const user = value?.purpose === 'session' ? value.user : null;
    return user && typeof user.id === 'string' && ['google', 'owner'].includes(user.provider)
      && !(googleEnabled && user.provider === 'owner') ? user : null;
  };
  const send = (response, data, status = 200, cookies) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...(cookies ? { 'Set-Cookie': cookies } : {}) });
    response.end(JSON.stringify(data));
  };
  const redirect = (response, url, cookies) => {
    response.writeHead(303, { Location: url, 'Cache-Control': 'no-store', ...(cookies ? { 'Set-Cookie': cookies } : {}), 'Referrer-Policy': 'no-referrer' });
    response.end();
  };
  async function readJson(request) {
    const chunks = [];
    let length = 0;
    for await (const chunk of request) {
      length += chunk.length;
      if (length > 4096) throw new Error('Request too large');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString() || '{}');
  }
  return {
    readUser,
    async handle(request, response, origin) {
      const url = new URL(request.url, origin);
      const pathname = url.pathname;
      if (!pathname.startsWith('/auth/') && !pathname.startsWith('/api/auth/')) return false;
      const user = readUser(request);
      if (request.method === 'GET' && pathname === '/api/auth/session') {
        send(response, { user, googleEnabled, ownerLoginEnabled: !googleEnabled && Boolean(ownerPassword), storage: 'browser' });
        return true;
      }
      if (request.method === 'GET' && pathname === '/auth/google') {
        if (!googleEnabled) { redirect(response, '/?auth_error=not_configured'); return true; }
        const state = randomBytes(24).toString('base64url');
        const nonce = randomBytes(24).toString('base64url');
        const verifier = randomBytes(48).toString('base64url');
        const flow = encryptConfig({ purpose: 'oauth', state, nonce, verifier, expiresAt: Date.now() + 600000 }, secret + ':oauth');
        const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        target.search = new URLSearchParams({ client_id: clientId, redirect_uri: origin + '/auth/google/callback', response_type: 'code', scope: 'openid email profile',
          state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
        redirect(response, target.href, cookie(FLOW, flow, 600));
        return true;
      }
      if (request.method === 'GET' && pathname === '/auth/google/callback') {
        const flow = decryptConfig(readCookie(request.headers.cookie, FLOW), secret + ':oauth');
        const clear = cookie(FLOW, '', 0);
        if (!googleEnabled || !flow || flow.purpose !== 'oauth' || flow.expiresAt < Date.now() || !same(flow.state, url.searchParams.get('state')) || !url.searchParams.get('code')) {
          redirect(response, '/?auth_error=invalid_state', clear); return true;
        }
        try {
          const client = options.oauthFactory ? options.oauthFactory() : new OAuth2Client(clientId, clientSecret, origin + '/auth/google/callback');
          const { tokens } = await client.getToken({ code: url.searchParams.get('code'), codeVerifier: flow.verifier });
          const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
          const payload = ticket.getPayload();
          if (!payload?.sub || !payload.email_verified || !same(payload.nonce, flow.nonce)) throw new Error('Invalid identity');
          const profile = { id: 'google-' + payload.sub, email: payload.email, googleName: String(payload.name || '').slice(0, 80), username: '', provider: 'google' };
          redirect(response, '/', [clear, sessionCookie(profile)]);
        } catch { redirect(response, '/?auth_error=google_failed', clear); }
        return true;
      }
      if (request.method !== 'POST') { send(response, { error: 'הפעולה אינה זמינה' }, 405); return true; }
      if (request.headers.origin !== origin) { send(response, { error: 'בקשה לא מורשית' }, 403); return true; }
      if (pathname === '/api/auth/logout') {
        send(response, { ok: true }, 200, [cookie(SESSION, '', 0), cookie('__Host-dekel-config', '', 0)]); return true;
      }
      if (pathname === '/api/auth/owner') {
        if (googleEnabled || !ownerPassword) { send(response, { error: 'יש להתחבר דרך Google' }, 403); return true; }
        const input = await readJson(request);
        const expected = createHash('sha256').update(ownerPassword).digest('hex');
        const actual = createHash('sha256').update(typeof input.password === 'string' ? input.password : '').digest('hex');
        const { timingSafeEqual } = await import('node:crypto');
        if (!timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) { send(response, { error: 'הסיסמה אינה נכונה' }, 401); return true; }
        const owner = { id: 'owner', username: 'בעל הסטודיו', email: '', provider: 'owner' };
        send(response, { user: owner }, 200, sessionCookie(owner)); return true;
      }
      if (pathname === '/api/auth/profile') {
        if (!user) { send(response, { error: 'נדרשת התחברות' }, 401); return true; }
        const input = await readJson(request);
        const username = typeof input.username === 'string' ? input.username.trim().normalize('NFC') : '';
        if (!/^[\p{L}\p{N} _.-]{2,32}$/u.test(username)) { send(response, { error: 'בחר שם של 2–32 תווים: אותיות, מספרים, רווח, נקודה, קו או קו תחתון' }, 400); return true; }
        const updated = { ...user, username };
        send(response, { user: updated }, 200, sessionCookie(updated)); return true;
      }
      send(response, { error: 'הכתובת לא נמצאה' }, 404); return true;
    },
  };
}
