import http from 'node:http';
import { pathToFileURL } from 'node:url';
import worker from './dist/server/index.js';
import { createGoogleAuth, readCookie } from './google-auth.mjs';
import { encryptConfig, decryptConfig } from './session-crypto.mjs';
export { encryptConfig, decryptConfig } from './session-crypto.mjs';

const COOKIE = '__Host-dekel-config';
const MAX_BODY = 50 * 1024 * 1024;

export function createRenderServer(options = {}) {
  const password = options.password || process.env.APP_ACCESS_PASSWORD;
  const secret = options.secret || process.env.APP_SESSION_SECRET;
  const isHosted = options.hosted ?? Boolean(process.env.RENDER);
  if (!secret || secret.length < 32)
    throw new Error('Set APP_SESSION_SECRET (32+ characters) in the hosting dashboard.');
  if (password && password.length < 12) throw new Error('APP_ACCESS_PASSWORD must contain at least 12 characters.');
  const auth = createGoogleAuth({ secret, ownerPassword: password,
    oauthFactory: options.oauthFactory,
    clientId: options.clientId ?? process.env.GOOGLE_CLIENT_ID,
    clientSecret: options.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET });
  const cache = new Map();
  const failures = new Map();
  return http.createServer(async (incoming, outgoing) => {
    try {
      const pathname = new URL(incoming.url, 'http://localhost').pathname;
      if (pathname === '/healthz') {
        outgoing.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end('{"status":"ok"}');
        return;
      }
      // The trusted proxy's client address is the last address in its forwarded chain.
      const address = isHosted ? String(incoming.headers['x-forwarded-for'] || '').split(',').at(-1).trim() || incoming.socket.remoteAddress : incoming.socket.remoteAddress;
      const failure = failures.get(address);
      if (failure && failure.count >= 20 && Date.now() - failure.at < 60000) {
        outgoing.writeHead(429, { 'Retry-After': '60', 'Cache-Control': 'no-store' }).end('Please wait one minute before trying again.');
        return;
      }
      const host = incoming.headers.host;
      if (!host || !/^[a-zA-Z0-9.\-]+(?::\d+)?$/.test(host)) { outgoing.writeHead(400).end(); return; }
      const origin = `${isHosted ? 'https' : 'http'}://${host}`;
      const expectedOrigin = options.publicOrigin || process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
      if (expectedOrigin && new URL(expectedOrigin).origin !== origin) { outgoing.writeHead(400).end('Invalid host'); return; }
      if (!['GET', 'HEAD'].includes(incoming.method) && incoming.headers.origin !== origin) {
        outgoing.writeHead(403).end('Invalid request origin'); return;
      }
      if (pathname === '/api/auth/owner' || pathname === '/auth/google') {
        if (failures.size > 10000) failures.clear();
        failures.set(address, { count: failure && Date.now() - failure.at < 60000 ? failure.count + 1 : 1, at: Date.now() });
      }
      if (await auth.handle(incoming, outgoing, origin)) return;
      const user = auth.readUser(incoming);
      if (user && incoming.headers['x-dekel-user-id'] && incoming.headers['x-dekel-user-id'] !== user.id) {
        outgoing.writeHead(409, { 'Cache-Control': 'no-store' }).end('Account changed. Reload the page.'); return;
      }
      if (pathname.startsWith('/api/') && !user) {
        outgoing.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'נדרשת התחברות לחשבון שלך' }));
        return;
      }
      if (pathname.startsWith('/api/') && !user.username && pathname !== '/api/health') {
        outgoing.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: 'יש לבחור שם משתמש כדי להשלים הרשמה' }));
        return;
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value && !['authorization', 'cookie', 'oai-authenticated-user-id', 'oai-authenticated-user-email'].includes(name))
          headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      // Only this authenticated adapter can establish the owner's worker identity.
      if (user) headers.set('oai-authenticated-user-id', user.id);
      const cookie = readCookie(incoming.headers.cookie, COOKIE);
      const saved = decryptConfig(cookie, secret);
      const config = user && saved?.userId === user.id ? saved.keyConfig : user?.provider === 'owner' && saved?.apiKey ? saved : null;
      const configPath = `users/${encodeURIComponent(user?.id || '')}/gemini-config.json`;
      let updatedConfig;
      const bucket = {
        async get(key) {
          const value = key === configPath ? config && JSON.stringify(config) : cache.get(key);
          if (!value) return null;
          return { body: value, text: async () => value, json: async () => JSON.parse(value) };
        },
        async put(key, value) {
          if (key === configPath) { updatedConfig = JSON.parse(value); return; }
          if (cache.size >= 200 && !cache.has(key)) cache.delete(cache.keys().next().value);
          cache.set(key, value);
        },
        async delete(key) { cache.delete(key); },
      };
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > MAX_BODY) { outgoing.writeHead(413).end('File too large'); return; }
        chunks.push(chunk);
      }
      const request = new Request(origin + incoming.url, { method: incoming.method, headers,
        body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks) });
      const response = await worker.fetch(request, { BUCKET: bucket });
      const responseHeaders = Object.fromEntries(response.headers);
      responseHeaders['Cache-Control'] = 'private, no-store';
      responseHeaders['X-Content-Type-Options'] = 'nosniff';
      responseHeaders['Referrer-Policy'] = 'same-origin';
      if (updatedConfig) responseHeaders['Set-Cookie'] = `${COOKIE}=${encryptConfig({ userId: user.id, keyConfig: updatedConfig }, secret)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
      outgoing.writeHead(response.status, responseHeaders);
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch { if (!outgoing.headersSent) outgoing.writeHead(500); outgoing.end('The request could not be completed.'); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 10000);
  const server = createRenderServer();
  server.listen(port, '0.0.0.0', () => console.log(`Dekel AI listening on port ${port}`));
}
