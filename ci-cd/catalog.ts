import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogsDirectory = join(root, 'catalog-repos');

function parseSource(source: string) {
  const url = new URL(source);
  let s3Source: string | undefined;

  if (url.protocol === 's3:') {
    s3Source = source;
  } else if (url.protocol === 'https:') {
    const bucketHost = url.hostname.match(/^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/);
    const serviceHost = /^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;
    if (bucketHost) {
      s3Source = `s3://${bucketHost[1]}${url.pathname}`;
    } else if (serviceHost.test(url.hostname)) {
      s3Source = `s3:/${url.pathname}`;
    }
  }

  if (!s3Source && !['https:', 'http:', 'ssh:', 'git:'].includes(url.protocol)) {
    throw new Error('Use an HTTPS/SSH Git repository URL or an s3:// bucket URL.');
  }
  if (s3Source && (url.search || url.hash)) {
    throw new Error('S3 sources must be bucket/prefix URLs, not presigned object URLs.');
  }

  const normalizedSource = s3Source ?? source;
  const name = decodeURIComponent(url.pathname).replace(/\/$/, '').split('/').pop() || url.hostname;
  const slug =
    name
      .replace(/\.git$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 60) || 'catalog';
  const hash = createHash('sha256').update(normalizedSource).digest('hex').slice(0, 12);

  return { source: normalizedSource, s3: Boolean(s3Source), directory: `${slug}-${hash}` };
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolveCommand, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', shell: false });
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        error.code === 'ENOENT'
          ? new Error(`Missing dependency: ${command}. Install it and make it available on PATH.`)
          : error,
      );
    });
    child.once('close', (code) => {
      if (code === 0) resolveCommand();
      else reject(new Error(`${command} failed with exit code ${code}.`));
    });
  });
}

async function main() {
  const envPath = join(root, '.env');
  if (existsSync(envPath)) loadEnvFile(envPath);

  const input = process.env.CATALOG_REPO_URLS;
  const urls = [
    ...new Set(
      input
        ?.split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  if (!urls.length) {
    throw new Error('Set CATALOG_REPO_URLS to a comma-separated list of catalog URLs.');
  }

  const sources = urls.map(parseSource);
  await mkdir(catalogsDirectory, { recursive: true });

  for (const catalog of sources) {
    const destination = join(catalogsDirectory, catalog.directory);
    if (existsSync(destination)) {
      if (catalog.s3) {
        process.stdout.write(`Syncing catalog: catalog-repos/${catalog.directory}\n`);
        await run('aws', ['s3', 'sync', catalog.source, destination]);
      } else {
        if (!existsSync(join(destination, '.git'))) {
          throw new Error(
            `Catalog catalog-repos/${catalog.directory} has no Git metadata. Move it outside catalog-repos and rerun to clone the repository.`,
          );
        }
        process.stdout.write(`Pulling catalog: catalog-repos/${catalog.directory}\n`);
        await run('git', ['-C', destination, 'pull', '--ff-only']);
      }
      continue;
    }

    const temporaryDirectory = await mkdtemp(join(catalogsDirectory, '.download-'));
    const downloadDirectory = join(temporaryDirectory, 'catalog');
    try {
      process.stdout.write(`Downloading catalog: catalog-repos/${catalog.directory}\n`);
      if (catalog.s3) {
        await mkdir(downloadDirectory);
        await run('aws', ['s3', 'sync', catalog.source, downloadDirectory]);
      } else {
        await run('git', ['clone', '--depth', '1', '--', catalog.source, downloadDirectory]);
      }
      await rename(downloadDirectory, destination);
      process.stdout.write(`Downloaded catalog: catalog-repos/${catalog.directory}\n`);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Catalog download failed.');
  process.exitCode = 1;
});
