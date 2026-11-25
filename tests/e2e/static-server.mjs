// Serves the static export (out/) below BASE_PATH, like GitHub/GitLab Pages do.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.env.E2E_STATIC_ROOT ?? 'out');
const port = Number(process.env.E2E_PORT ?? 4173);
const basePath = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function findFile(pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const target = resolve(join(root, relativePath));
  // Never serve anything outside of the export folder
  if (target !== root && !target.startsWith(root + sep)) return null;

  for (const candidate of [target, join(target, 'index.html'), `${target}.html`]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isFile()) return candidate;
  }
  return null;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const isBelowBasePath = pathname === basePath || pathname.startsWith(`${basePath}/`);
  const file = isBelowBasePath ? await findFile(pathname.slice(basePath.length)) : null;
  const served = file ?? (await findFile('/404.html'));

  if (!served) {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  response.writeHead(file ? 200 : 404, {
    'Content-Type': CONTENT_TYPES[extname(served).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(served).pipe(response);
}).listen(port, () => {
  process.stdout.write(`Serving ${root} on http://127.0.0.1:${port}${basePath}/\n`);
});
