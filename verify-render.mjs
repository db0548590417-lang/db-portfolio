import assert from 'node:assert/strict';
import { createRenderServer, encryptConfig, decryptConfig } from './host-render.mjs';
const password = 'local-test-password-123';
const secret = 'local-test-only-secret-with-32-or-more-characters';
const config = { apiKey: 'not-a-real-key-used-for-local-tests', model: 'gemini-2.5-flash' };
const encrypted = encryptConfig(config, secret);
assert.deepEqual(decryptConfig(encrypted, secret), config);
assert.equal(decryptConfig(encrypted, secret + '-wrong'), null);
assert.equal(decryptConfig(encrypted.slice(0, -6) + 'abcdef', secret), null);
assert.equal(encrypted.includes(config.apiKey), false);
assert.throws(() => createRenderServer({ password: 'short', secret }));
const server = createRenderServer({ password, secret, hosted: false });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const authorization = 'Basic ' + Buffer.from('dekel:' + password).toString('base64');
try {
  assert.equal((await fetch(base + '/healthz')).status, 200);
  assert.equal((await fetch(base + '/')).status, 401);
  assert.equal((await fetch(base + '/api/health', { headers: { 'oai-authenticated-user-id': 'spoofed' } })).status, 401);
  assert.equal((await fetch(base + '/', { headers: { authorization } })).status, 200);
  const headers = { authorization, cookie: '__Host-dekel-config=' + encrypted };
  const status = await (await fetch(base + '/api/settings/gemini', { headers })).json();
  assert.equal(status.configured, true);
  assert.equal(status.apiKey, undefined);
  assert.equal((await (await fetch(base + '/api/health', { headers })).json()).hasApiKey, true);
  assert.equal((await (await fetch(base + '/api/health', { headers: { authorization } })).json()).hasApiKey, false);
  assert.equal((await fetch(base + '/api/settings/gemini', { method: 'POST', headers: { authorization, origin: 'https://untrusted.example' }, body: '{}' })).status, 403);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => String(url).startsWith('https://generativelanguage.googleapis.com/')
    ? Response.json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] })
    : originalFetch(url, options);
  try {
    const saved = await fetch(base + '/api/settings/gemini', { method: 'POST', headers: { authorization, origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: config.apiKey }) });
    assert.equal(saved.status, 200);
    const savedCookie = saved.headers.get('set-cookie');
    assert.ok(savedCookie.includes('HttpOnly; Secure; SameSite=Strict'));
    assert.equal(savedCookie.includes(config.apiKey), false);
    assert.equal((await (await fetch(base + '/api/health', { headers: { authorization, cookie: savedCookie.split(';')[0] } })).json()).hasApiKey, true);
  } finally { globalThis.fetch = originalFetch; }
  console.log('PASS: Render auth, spoofed headers, encrypted configuration, tampering, origin checks and app routing');
} finally { await new Promise(resolve => server.close(resolve)); }
