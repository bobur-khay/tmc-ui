// Standalone: runs from the root of a catalog repository, so it must only import Node built-ins.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const catalogRoot = process.cwd();
const uiRepoUrl = process.env.TMC_UI_REPO_URL ?? 'https://github.com/wot-oss/tmc-ui.git';
const uiRef = process.env.TMC_UI_REF;
const uiFolder = 'tmc-ui';
const uiDirectory = join(catalogRoot, uiFolder);
const catalogsDirectory = join(uiDirectory, 'public', 'catalog-repos');
const excludedEntries = new Set([uiFolder, '.git', 'node_modules']);

function logProgress(message: string) {
  process.stdout.write(`[${new Date().toISOString()}] [ui] ${message}\n`);
}

function run(command: string, args: string[], cwd: string, shell = false): Promise<void> {
  return new Promise((resolveCommand, reject) => {
    const child = shell
      ? spawn([command, ...args].join(' '), { cwd, stdio: 'inherit', shell: true })
      : spawn(command, args, { cwd, stdio: 'inherit' });
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

// pnpm is a .cmd shim on Windows, which can only be spawned through a shell.
function pnpm(...args: string[]) {
  return run('pnpm', args, uiDirectory, true);
}

async function main() {
  if (!existsSync(join(catalogRoot, '.tmc', 'tm-catalog.toc.json'))) {
    throw new Error(`No catalog found in ${catalogRoot}. Run this script from a catalog root.`);
  }

  if (existsSync(join(uiDirectory, '.git'))) {
    logProgress(`[1/4] Updating ${uiFolder}`);
    await run('git', ['-C', uiDirectory, 'pull', '--ff-only'], catalogRoot);
  } else {
    logProgress(`[1/4] Cloning ${uiRepoUrl} into ${uiFolder}`);
    await run(
      'git',
      ['clone', '--depth', '1', ...(uiRef ? ['--branch', uiRef] : []), '--', uiRepoUrl, uiFolder],
      catalogRoot,
    );
  }

  const catalogName = basename(catalogRoot).replace(/[^a-zA-Z0-9_-]/g, '-') || 'catalog';
  const destination = join(catalogsDirectory, catalogName);
  logProgress(`[2/4] Copying catalog into ${uiFolder}/public/catalog-repos/${catalogName}`);
  await rm(catalogsDirectory, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  // Copied entry by entry because cp refuses to copy a directory into its own subdirectory.
  for (const entry of await readdir(catalogRoot)) {
    if (excludedEntries.has(entry)) continue;
    await cp(join(catalogRoot, entry), join(destination, entry), { recursive: true });
  }

  logProgress('[3/4] Building catalog index');
  const { mergeCatalogMetadata } = await import(
    pathToFileURL(join(uiDirectory, 'ci-cd', 'catalog-for-ui.ts')).href
  );
  await mergeCatalogMetadata([catalogName]);

  logProgress(`[4/4] Installing dependencies and building ${uiFolder}`);
  process.env.IS_STATIC ??= 'true';
  await pnpm('install', '--frozen-lockfile');
  await pnpm('run', 'build');
  logProgress(`Complete: ${uiFolder} built in ${uiDirectory}`);
}

main().catch((error: unknown) => {
  console.error(
    `[${new Date().toISOString()}] [ui] ERROR: ${error instanceof Error ? error.message : 'UI build failed.'}`,
  );
  process.exitCode = 1;
});
