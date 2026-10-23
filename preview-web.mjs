import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './dist/server/index.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const localData = path.join(root, '.local-data');
const bucket = {
  async get(key) {
    try {
      const contents = await fs.readFile(path.join(localData, key));
      return { body: contents, text: async () => contents.toString('utf8'), json: async () => JSON.parse(contents.toString('utf8')) };
    } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  },
  async put(key, value) {
    const destination = path.join(localData, key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, value);
  },
  async delete(key) { await fs.rm(path.join(localData, key), { force: true }); },
};

const server = http.createServer(async (incoming, outgoing) => {
  try {
    // This local adapter is never deployed. Hosted identity comes from Sites.
    if (incoming.headers.host !== '127.0.0.1:3001') { outgoing.writeHead(403).end(); return; }
    if (incoming.url === '/api/auth/session') {
      outgoing.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      outgoing.end(JSON.stringify({ user: { id: 'local-owner', username: 'תצוגה מקומית', provider: 'owner', email: '' }, googleEnabled: false, ownerLoginEnabled: false }));
      return;
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    headers.set('oai-authenticated-user-id', 'local-owner');
    const buffers = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 50 * 1024 * 1024) { outgoing.writeHead(413).end(); return; }
      buffers.push(chunk);
    }
    const request = new Request('http://127.0.0.1:3001' + incoming.url, {
      method: incoming.method, headers,
      body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(buffers),
    });
    const response = await worker.fetch(request, { BUCKET: bucket });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500).end('Local preview error'); }
});
server.listen(3001, '127.0.0.1', () => console.log('INSPIRA website preview: http://127.0.0.1:3001'));
