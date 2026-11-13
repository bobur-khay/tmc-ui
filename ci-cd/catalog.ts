import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { CATALOG_ROOT_FOLDER } from '../lib/utils/constants.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const catalogsDirectory = join(root, 'public', CATALOG_ROOT_FOLDER);

function logProgress(message: string) {
  process.stdout.write(`[${new Date().toISOString()}] [catalogs] ${message}\n`);
}

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

async function mergeCatalogMetadata(directories: string[]) {
  const temporaryDirectory = await mkdtemp(join(catalogsDirectory, '.merge-'));
  const destination = join(catalogsDirectory, '.tmc');
  const textFiles = new Map<string, Set<string>>();
  const data: unknown[] = [];
  let metadata: Record<string, unknown> = {};

  try {
    for (const [index, directory] of directories.entries()) {
      logProgress(`[${index + 1}/${directories.length}] Merging metadata: ${directory}`);
      const previousModelCount = data.length;
      const source = join(catalogsDirectory, directory, '.tmc');
      const entries = await readdir(source, { withFileTypes: true });
      if (!entries.some((entry) => entry.isFile() && entry.name === 'tm-catalog.toc.json')) {
        throw new Error(`Missing catalog index: ${join(source, 'tm-catalog.toc.json')}.`);
      }
      for (const entry of entries) {
        const sourceFile = join(source, entry.name);
        if (entry.isFile() && entry.name === 'tm-catalog.toc.json') {
          const catalog = JSON.parse(await readFile(sourceFile, 'utf8'));
          if (!Array.isArray(catalog?.data)) {
            throw new Error(`Invalid catalog index: ${sourceFile}. Expected a data array.`);
          }
          metadata = { ...metadata, ...catalog.meta };
          for (const item of catalog.data) {
            data.push({
              ...item,
              repo: directory,
              ...(Array.isArray(item.versions)
                ? {
                    versions: item.versions.map((version: Record<string, unknown>) => ({
                      ...version,
                      repo: directory,
                    })),
                  }
                : {}),
            });
          }
        } else if (entry.isFile() && (entry.name.endsWith('.txt') || entry.name === '.tmcignore')) {
          const lines = textFiles.get(entry.name) ?? new Set<string>();
          for (const line of (await readFile(sourceFile, 'utf8')).split(/\r?\n/)) {
            if (line) lines.add(line);
          }
          textFiles.set(entry.name, lines);
        } else {
          await cp(sourceFile, join(temporaryDirectory, entry.name), { recursive: true });
        }
      }
      logProgress(
        `[${index + 1}/${directories.length}] Merged ${directory}: ${data.length - previousModelCount} models, ${entries.length} metadata files`,
      );
    }

    logProgress(`Writing merged index: ${data.length} models and ${textFiles.size} text lists`);
    for (const [name, lines] of textFiles) {
      await writeFile(
        join(temporaryDirectory, name),
        [...lines].join('\n') + (lines.size ? '\n' : ''),
      );
    }
    await writeFile(
      join(temporaryDirectory, 'tm-catalog.toc.json'),
      JSON.stringify({ meta: { ...metadata, created: new Date().toISOString() }, data }, null, 2) +
        '\n',
    );
    await rm(destination, { recursive: true, force: true });
    await rename(temporaryDirectory, destination);
    logProgress('Merged metadata saved to public/catalog-repos/.tmc');
    return data.length;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  const startedAt = Date.now();
  logProgress('Starting catalog synchronization');
  const envPath = join(root, '.env');
  if (existsSync(envPath)) loadEnvFile(envPath);

  const { values } = parseArgs({ options: { token: { type: 'string' } } });
  const token = values.token ?? process.env.CI_JOB_TOKEN;
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

  const sources = [
    ...new Map(urls.map(parseSource).map((catalog) => [catalog.directory, catalog])).values(),
  ];
  logProgress(`[1/4] Configuration validated: ${sources.length} catalog sources`);
  await mkdir(catalogsDirectory, { recursive: true });

  logProgress('[2/4] Removing unconfigured catalogs');
  let removedCount = 0;
  const configuredDirectories = new Set(sources.map((catalog) => catalog.directory));
  for (const entry of await readdir(catalogsDirectory, { withFileTypes: true })) {
    if (
      (entry.isDirectory() || entry.isSymbolicLink()) &&
      entry.name !== '.tmc' &&
      !configuredDirectories.has(entry.name)
    ) {
      logProgress(`Removing unconfigured catalog: public/catalog-repos/${entry.name}`);
      await rm(join(catalogsDirectory, entry.name), { recursive: true, force: true });
      removedCount++;
      logProgress(`Removed public/catalog-repos/${entry.name}`);
    }
  }
  logProgress(`Cleanup complete: ${removedCount} unconfigured folders removed`);

  logProgress('[3/4] Updating existing catalogs and downloading missing catalogs');
  let updatedCount = 0;
  let downloadedCount = 0;
  for (const [index, catalog] of sources.entries()) {
    const progress = `[${index + 1}/${sources.length}]`;
    const destination = join(catalogsDirectory, catalog.directory);
    let gitSource = catalog.source;
    if (!catalog.s3 && token) {
      const url = new URL(catalog.source);
      if (url.protocol === 'https:' && url.hostname === 'code.siemens.com') {
        url.username = 'gitlab-ci-token';
        url.password = token;
        gitSource = url.href;
      }
    }
    if (existsSync(destination)) {
      if (catalog.s3) {
        logProgress(`${progress} Syncing catalog: public/catalog-repos/${catalog.directory}`);
        await run('aws', ['s3', 'sync', catalog.source, destination, '--delete']);
      } else {
        if (!existsSync(join(destination, '.git'))) {
          throw new Error(
            `Catalog public/catalog-repos/${catalog.directory} has no Git metadata. Move it outside public/catalog-repos and rerun to clone the repository.`,
          );
        }
        logProgress(`${progress} Pulling catalog: public/catalog-repos/${catalog.directory}`);
        await run('git', [
          '-C',
          destination,
          'pull',
          '--ff-only',
          ...(gitSource !== catalog.source ? [gitSource] : []),
        ]);
      }
      updatedCount++;
      logProgress(`${progress} Updated catalog: ${catalog.directory}`);
      continue;
    }

    const temporaryDirectory = await mkdtemp(join(catalogsDirectory, '.download-'));
    const downloadDirectory = join(temporaryDirectory, 'catalog');
    try {
      logProgress(`${progress} Downloading catalog: public/catalog-repos/${catalog.directory}`);
      if (catalog.s3) {
        await mkdir(downloadDirectory);
        await run('aws', ['s3', 'sync', catalog.source, downloadDirectory]);
      } else {
        await run('git', ['clone', '--depth', '1', '--', gitSource, downloadDirectory]);
        if (gitSource !== catalog.source) {
          await run('git', [
            '-C',
            downloadDirectory,
            'remote',
            'set-url',
            'origin',
            catalog.source,
          ]);
        }
      }
      await rename(downloadDirectory, destination);
      downloadedCount++;
      logProgress(`${progress} Downloaded catalog: ${catalog.directory}`);
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  logProgress('[4/4] Building merged metadata with repository filter IDs');
  const modelCount = await mergeCatalogMetadata(sources.map((catalog) => catalog.directory));
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  logProgress(
    `Complete in ${elapsedSeconds}s: ${removedCount} removed, ${updatedCount} updated, ${downloadedCount} downloaded, ${modelCount} models merged`,
  );
}

main().catch((error: unknown) => {
  console.error(
    `[${new Date().toISOString()}] [catalogs] ERROR: ${error instanceof Error ? error.message : 'Catalog download failed.'}`,
  );
  process.exitCode = 1;
});
