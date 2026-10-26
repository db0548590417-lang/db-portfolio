import assert from 'node:assert/strict';
import worker from './dist/server/index.js';

const store = new Map();
const bucket = {
  async get(key) {
    const value = store.get(key);
    return value === undefined ? null : { json: async () => JSON.parse(value), text: async () => value };
  },
  async put(key, value) { store.set(key, value); },
};
const env = { BUCKET: bucket };
const origin = 'https://inspira.example';
const call = (path, options = {}, user = 'user-one') => worker.fetch(new Request(origin + path, {
  ...options, headers: { ...(user ? { 'oai-authenticated-user-id': user } : {}), ...options.headers },
}), env);

assert.equal((await call('/')).status, 200);
assert.equal((await call('/api/health', {}, '')).status, 401);
assert.equal((await (await call('/api/health')).json()).hasApiKey, false);
assert.deepEqual(await (await call('/api/settings/gemini')).json(), { configured: false, model: null });
assert.equal((await call('/api/settings/gemini', { method: 'POST', body: '{}' })).status, 403);
assert.equal((await call('/api/settings/gemini', { method: 'POST', headers: { origin }, body: '{' })).status, 400);
assert.equal((await call('/api/settings/gemini', { method: 'POST', headers: { origin }, body: JSON.stringify({ apiKey: '' }) })).status, 400);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
try {
  let forwarded='';
  globalThis.fetch=async(_url,options)=>{forwarded=options.headers['x-goog-api-key'];return Response.json({models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']}]});};
  const pasted=await call('/api/settings/gemini',{method:'POST',headers:{origin},body:JSON.stringify({apiKey:' “\u200ftest_key_\nvalue_for_local_test_only\u200b” '})});
  assert.equal(pasted.status,200);assert.equal(forwarded,'test_key_value_for_local_test_only');
  globalThis.fetch=async()=>Response.json({error:{details:[{reason:'API_KEY_INVALID'}]}},{status:400});
  const rejected=await call('/api/settings/gemini',{method:'POST',headers:{origin},body:JSON.stringify({apiKey:'bad'})});
  assert.equal((await rejected.json()).code,'INVALID_KEY');
  assert.equal((await (await call('/api/settings/gemini')).json()).configured,true);
  globalThis.fetch=async()=>Response.json({models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']}]});
  const saved = await call('/api/settings/gemini', { method: 'POST', headers: { origin }, body: JSON.stringify({ apiKey: 'test_key_value_for_local_test_only' }) });
  assert.equal(saved.status, 200);
  const status = await (await call('/api/settings/gemini')).json();
  assert.equal(status.configured, true);
  assert.equal(status.apiKey, undefined);
  assert.equal((await (await call('/api/health')).json()).hasApiKey, true);
  assert.equal((await (await call('/api/health', {}, 'user-two')).json()).hasApiKey, false);
  assert.equal((await (await call('/api/settings/gemini', {}, 'user-two')).json()).configured, false);
  const test=()=>call('/api/settings/gemini',{method:'POST',headers:{origin},body:JSON.stringify({test:true})});
  globalThis.fetch=async()=>Response.json({error:{status:'RESOURCE_EXHAUSTED'}},{status:429});
  const limited=await test();assert.equal(limited.status,429);assert.equal((await limited.json()).code,'QUOTA_EXCEEDED');
  assert.equal((await (await call('/api/settings/gemini')).json()).configured,true);
  globalThis.fetch=async()=>Response.json({error:{details:[{reason:'API_KEY_HTTP_REFERRER_BLOCKED'}]}},{status:403});
  assert.equal((await (await test()).json()).code,'ACCESS_DENIED');
  globalThis.fetch=async()=>Response.json({error:{details:[{reason:'API_KEY_INVALID'}]}},{status:400});
  assert.equal((await (await test()).json()).code,'INVALID_KEY');
  globalThis.fetch=async()=>Response.json({candidates:[{content:{parts:[{text:'OK'}]}}]});
  const connected=await test();assert.equal(connected.status,200);const body=await connected.json();assert.equal(body.working,true);assert(!JSON.stringify(body).includes('test_key_value'));
} finally { globalThis.fetch = originalFetch; }
assert.equal((await call('/api/unknown')).status, 404);
assert.equal((await call('/api/inspiration/hafsakat/visual-search', { method: 'POST', body: '{}' })).status >= 400, true);
console.log('PASS: static client, auth, key setup, CSRF, malformed input, health, user isolation, routing');
