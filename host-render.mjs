import http from 'node:http';
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import worker from './dist/server/index.js';

const COOKIE = '__Host-dekel-config';
const CONFIG = 'users/owner/gemini-config.json';
const MAX_BODY = 50 * 1024 * 1024;

export function encryptConfig(config, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ config, expires: Date.now() + 30 * 86400000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function decryptConfig(value, secret) {
  try {
    if (!value || value.length > 3000) return null;
    const data = Buffer.from(value, 'base64url');
    if (data.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const parsed = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return parsed.expires > Date.now() ? parsed.config : null;
  } catch { return null; }
}

function authorized(header, password) {
  if (!header?.startsWith('Basic ')) return false;
  const pair = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const delimiter = pair.indexOf(':');
  if (delimiter < 0 || pair.slice(0, delimiter) !== 'dekel') return false;
  const supplied = createHash('sha256').update(pair.slice(delimiter + 1)).digest();
  return timingSafeEqual(supplied, createHash('sha256').update(password).digest());
}

export function createRenderServer(options = {}) {
  const password = options.password || process.env.APP_ACCESS_PASSWORD;
  const secret = options.secret || process.env.APP_SESSION_SECRET;
  const isHosted = options.hosted ?? Boolean(process.env.RENDER);
  if (!password || password.length < 12 || !secret || secret.length < 32)
    throw new Error('Set APP_ACCESS_PASSWORD (12+ characters) and APP_SESSION_SECRET (32+ characters) in the hosting dashboard.');
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
      if (!authorized(incoming.headers.authorization, password)) {
        if (failures.size > 10000) failures.clear();
        failures.set(address, { count: failure && Date.now() - failure.at < 60000 ? failure.count + 1 : 1, at: Date.now() });
        outgoing.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Dekel AI - username: dekel", charset="UTF-8"', 'Cache-Control': 'no-store' }).end('Sign in with username dekel and your app password.');
        return;
      }
      failures.delete(address);
      const host = incoming.headers.host;
      if (!host || !/^[a-zA-Z0-9.\-]+(?::\d+)?$/.test(host)) { outgoing.writeHead(400).end(); return; }
      const origin = `${isHosted ? 'https' : 'http'}://${host}`;
      if (!['GET', 'HEAD'].includes(incoming.method) && incoming.headers.origin !== origin) {
        outgoing.writeHead(403).end('Invalid request origin'); return;
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value && !['authorization', 'cookie', 'oai-authenticated-user-id', 'oai-authenticated-user-email'].includes(name))
          headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      // Only this authenticated adapter can establish the owner's worker identity.
      headers.set('oai-authenticated-user-id', 'owner');
      const cookie = String(incoming.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
      const config = decryptConfig(cookie, secret);
      let updatedConfig;
      const bucket = {
        async get(key) {
          const value = key === CONFIG ? config && JSON.stringify(config) : cache.get(key);
          if (!value) return null;
          return { body: value, text: async () => value, json: async () => JSON.parse(value) };
        },
        async put(key, value) {
          if (key === CONFIG) { updatedConfig = JSON.parse(value); return; }
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
      if (updatedConfig) responseHeaders['Set-Cookie'] = `${COOKIE}=${encryptConfig(updatedConfig, secret)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`;
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
