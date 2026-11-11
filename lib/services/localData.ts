import { ensureTrailingSlash, normalizeRelativePathSegment } from '../utils/strings';
import {
  CATALOG_ROOT_FOLDER,
  REPOSITORY_CATALOG_DEFAULT_FOLDER,
  INVENTORY_FILENAME,
} from '../utils/constants';
import type { DetailedInventoryItem, InventoryItem } from '@/app/_components/inventory/types';
import { buildDetailsId } from '../utils/details';

const isDevelopment = process.env.NODE_ENV === 'development';

export function buildLocalCatalogPath(repository: string, fullpath: string): string {
  const path = [repository, normalizeRelativePathSegment(fullpath)]
    .join('/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${process.env.BASE_PATH || ''}/${CATALOG_ROOT_FOLDER}/${path}`;
}

export async function fetchLocalDataInventory(signal?: AbortSignal): Promise<InventoryItem[]> {
  const folder = ensureTrailingSlash(
    normalizeRelativePathSegment(REPOSITORY_CATALOG_DEFAULT_FOLDER),
  );
  const filename = normalizeRelativePathSegment(INVENTORY_FILENAME);

  const basePath = `${process.env.BASE_PATH || ''}/`;
  const url = new URL(`${basePath}${folder}${filename}`, window.location.origin);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Response('Failed to fetch local inventory', {
      status: res.status,
    });
  }

  const json: unknown = await res.json();

  isDevelopment && console.warn('Fetched local inventory JSON:', json);

  if (
    typeof json === 'object' &&
    json !== null &&
    'data' in json &&
    Array.isArray((json as { data?: InventoryItem[] }).data)
  ) {
    return (json as { data: InventoryItem[] }).data;
  }

  return [];
}

export async function fetchDataFromTxT(
  baseUrl: string,
  textFilename: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const folder = ensureTrailingSlash(
    normalizeRelativePathSegment(REPOSITORY_CATALOG_DEFAULT_FOLDER),
  );
  const filename = normalizeRelativePathSegment(textFilename);

  const basePath = `${process.env.BASE_PATH || ''}/`;
  const url = new URL(`${basePath}${folder}${filename}`, baseUrl);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    throw new Error(`Failed to fetch data from ${textFilename} (${res.status})`);
  }

  const text = await res.text();

  const data = Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );

  return data;
}

export async function fetchLocalThingModel(
  id: string,
  signal?: AbortSignal,
): Promise<DetailedInventoryItem> {
  const inventory = await fetchLocalDataInventory(signal);
  const item = inventory.find((entry) =>
    entry.versions?.some(
      (version) =>
        buildDetailsId(version.tmID, version.repo || entry.repo) === id || version.tmID === id,
    ),
  );
  const version = item?.versions?.find(
    (entry) => buildDetailsId(entry.tmID, entry.repo || item.repo) === id || entry.tmID === id,
  );
  if (!item || !version?.links.content) throw new Error('Thing Model not found.');

  const url = buildLocalCatalogPath(version.repo || item.repo, version.links.content);
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Response('Failed to fetch local Thing Model', {
      status: res.status,
    });
  }

  const json: unknown = await res.json();
  isDevelopment && console.warn('Fetched local Thing Model JSON:', json);

  const tmName = item.tmName || item.name;
  const versionDirectory = version.links.content
    .split('/')
    .pop()
    ?.replace(/\.tm\.json$/, '');
  const attachments =
    version.attachments?.map((attachment) => {
      const path = `${tmName}/.attachments/${versionDirectory}/${attachment.name}`;
      return {
        ...attachment,
        links: {
          ...attachment.links,
          self: attachment.links?.self ?? path,
          content: attachment.links?.content ?? path,
        },
      };
    }) ?? item.attachments;

  return {
    ...item,
    ...(json as DetailedInventoryItem),
    repo: version.repo || item.repo,
    tmName,
    versions: item.versions,
    attachments,
  };
}
