import assert from 'node:assert/strict';
import { createRenderServer, encryptConfig, decryptConfig } from './host-render.mjs';
const secret = 'local-test-only-secret-with-32-or-more-characters';
const password = 'local-test-password-123';
const config = { apiKey: 'not-a-real-key-used-for-local-tests', model: 'gemini-2.5-flash' };
const encrypted = encryptConfig(config, secret);
assert.deepEqual(decryptConfig(encrypted, secret), config);
assert.equal(decryptConfig(encrypted, secret + '-wrong'), null);
assert.equal(decryptConfig(encrypted.slice(0, -6) + 'abcdef', secret), null);
assert.equal(encrypted.includes(config.apiKey), false);
assert.throws(() => createRenderServer({ password: 'short', secret }));
const getCookies = response => response.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
let nonce;
let identityOverride = {};
const server = createRenderServer({ password, secret, hosted: false, clientId: 'test-client', clientSecret: 'test-secret',
  oauthFactory: () => ({
    async getToken({ code, codeVerifier }) { assert.ok(code); assert.ok(codeVerifier); return { tokens: { id_token: 'mocked-token' } }; },
    async verifyIdToken({ audience }) { assert.equal(audience, 'test-client'); return { getPayload: () => ({ sub: 'test-google-id', email: 'test@example.com', email_verified: true, nonce, name: 'Test User', ...identityOverride }) }; },
  }),
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const request = (url, options = {}) => fetch(base + url, { redirect: 'manual', ...options });
try {
  assert.equal((await request('/healthz')).status, 200);
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers.has('www-authenticate'), false);
  assert.equal((await request('/api/health')).status, 401);
  assert.equal((await request('/api/health', { headers: { 'oai-authenticated-user-id': 'spoofed' } })).status, 401);
  const status = await (await request('/api/auth/session')).json();
  assert.equal(status.googleEnabled, true);
  assert.equal(status.ownerLoginEnabled, false);
  assert.equal((await request('/api/auth/owner', { method: 'POST', headers: { origin: base }, body: '{}' })).status, 403);
  const started = await request('/auth/google');
  const google = new URL(started.headers.get('location'));
  assert.equal(google.origin, 'https://accounts.google.com');
  assert.equal(google.searchParams.get('scope'), 'openid email profile');
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256');
  nonce = google.searchParams.get('nonce');
  const state = google.searchParams.get('state');
  const flowCookie = getCookies(started);
  const rejected = await request('/auth/google/callback?state=wrong&code=test', { headers: { cookie: flowCookie } });
  assert.ok(rejected.headers.get('location').includes('invalid_state'));
  identityOverride = { nonce: 'incorrect-nonce' };
  const wrongNonce = await request('/auth/google/callback?state=' + state + '&code=test', { headers: { cookie: flowCookie } });
  assert.ok(wrongNonce.headers.get('location').includes('google_failed'));
  identityOverride = { email_verified: false };
  const unverified = await request('/auth/google/callback?state=' + state + '&code=test', { headers: { cookie: flowCookie } });
  assert.ok(unverified.headers.get('location').includes('google_failed'));
  identityOverride = {};
  const callback = await request('/auth/google/callback?state=' + state + '&code=test', { headers: { cookie: flowCookie } });
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get('location'), '/');
  let cookie = getCookies(callback);
  const session = await (await request('/api/auth/session', { headers: { cookie } })).json();
  assert.equal(session.user.id, 'google-test-google-id');
  assert.equal(session.user.username, '');
  assert.equal((await request('/api/settings/gemini', { headers: { cookie } })).status, 403);
  const profile = await request('/api/auth/profile', { method: 'POST', headers: { cookie, origin: base }, body: JSON.stringify({ username: 'מעצב חדש' }) });
  assert.equal(profile.status, 200);
  cookie = getCookies(profile);
  assert.equal((await (await request('/api/auth/session', { headers: { cookie } })).json()).user.username, 'מעצב חדש');
  assert.equal((await request('/api/auth/profile', { method: 'POST', headers: { cookie, origin: 'https://untrusted.example' }, body: '{}' })).status, 403);
  assert.equal((await request('/api/health', { headers: { cookie, 'x-dekel-user-id': 'another-user' } })).status, 409);
  const boundKey = encryptConfig({ userId: 'google-test-google-id', keyConfig: config }, secret);
  const otherKey = encryptConfig({ userId: 'google-another-user', keyConfig: config }, secret);
  assert.equal((await (await request('/api/health', { headers: { cookie: cookie + '; __Host-dekel-config=' + boundKey } })).json()).hasApiKey, true);
  assert.equal((await (await request('/api/health', { headers: { cookie: cookie + '; __Host-dekel-config=' + otherKey } })).json()).hasApiKey, false);
  const logout = await request('/api/auth/logout', { method: 'POST', headers: { cookie, origin: base } });
  assert.equal(logout.status, 200);
  assert.equal(logout.headers.getSetCookie().filter(item => item.includes('Max-Age=0')).length, 2);
  console.log('PASS: branded entry, Google PKCE flow (mocked), verified identity, profile, API auth, key isolation, account switch and logout');
} finally { await new Promise(resolve => server.close(resolve)); }
const ownerServer = createRenderServer({ password, secret, hosted: false, clientId: '', clientSecret: '' });
await new Promise(resolve => ownerServer.listen(0, '127.0.0.1', resolve));
const ownerBase = `http://127.0.0.1:${ownerServer.address().port}`;
try {
  const login = await fetch(ownerBase + '/api/auth/owner', { method: 'POST', headers: { origin: ownerBase }, body: JSON.stringify({ password }) });
  assert.equal(login.status, 200);
  const session = await (await fetch(ownerBase + '/api/auth/session', { headers: { cookie: getCookies(login) } })).json();
  assert.equal(session.user.provider, 'owner');
  assert.equal((await fetch(ownerBase + '/api/auth/owner', { method: 'POST', headers: { origin: ownerBase }, body: '{"password":"wrong"}' })).status, 401);
  console.log('PASS: owner can still sign in through the branded form until Google is configured');
} finally { await new Promise(resolve => ownerServer.close(resolve)); }
