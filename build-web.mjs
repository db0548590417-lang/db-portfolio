import fs from 'node:fs';
import path from 'node:path';
import { build as viteBuild } from 'vite';
import { build as bundle } from 'rolldown';

await viteBuild({ configLoader: 'runner' });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };
const assets = {};
function collect(directory) {
  for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, file.name);
    if (file.isDirectory()) collect(fullPath);
    else assets['/' + path.relative('dist/client', fullPath).replaceAll('\\', '/')] = {
      type: mime[path.extname(file.name)] || 'application/octet-stream', data: fs.readFileSync(fullPath).toString('base64'),
    };
  }
}
collect('dist/client');
fs.writeFileSync('worker/assets.json', JSON.stringify(assets));
fs.mkdirSync('dist/server', { recursive: true });
await bundle({
  input: 'worker/index.ts', platform: 'browser',
  output: { file: 'dist/server/index.js', format: 'esm', minify: true, codeSplitting: false },
  external: (name) => name.startsWith('node:'),
});
fs.mkdirSync('dist/.openai', { recursive: true });
fs.copyFileSync('.openai/hosting.json', 'dist/.openai/hosting.json');
fs.writeFileSync('dist/server/wrangler.json', JSON.stringify({
  name: 'inspira-studio', main: 'index.js', compatibility_date: '2026-10-01',
  compatibility_flags: ['nodejs_compat'], r2_buckets: [{ binding: 'BUCKET', bucket_name: 'site-creator-r2' }],
}));
console.log('Built INSPIRA web client and Worker server');
