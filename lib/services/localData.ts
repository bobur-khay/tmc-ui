import { ensureTrailingSlash, normalizeRelativePathSegment } from '../utils/strings';
import {
  CATALOG_ROOT_FOLDER,
  REPOSITORY_CATALOG_DEFAULT_FOLDER,
  INVENTORY_FILENAME,
} from '../utils/constants';
import type { DetailedInventoryItem, InventoryItem } from '@/app/_components/inventory/types';

const isDevelopment = process.env.NODE_ENV === 'development';

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

export async function fetchDataFromTxT(baseUrl: string, textFilename: string): Promise<string[]> {
  const folder = ensureTrailingSlash(
    normalizeRelativePathSegment(REPOSITORY_CATALOG_DEFAULT_FOLDER),
  );
  const filename = normalizeRelativePathSegment(textFilename);

  const basePath = `${process.env.BASE_PATH || ''}/`;
  const url = new URL(`${basePath}${folder}${filename}`, baseUrl);

  const res = await fetch(url.toString());
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

// TODO: Enhance fetchLocalThingModel to also extract imgSrc and tmName from the fetched JSON.
export async function fetchLocalThingModel(fullpath: string): Promise<DetailedInventoryItem> {
  isDevelopment && console.warn('Fetching local Thing Model from path:', fullpath);

  const basePath = `${process.env.BASE_PATH || ''}/`;
  const urlBase = `${basePath}${CATALOG_ROOT_FOLDER}/${normalizeRelativePathSegment(fullpath)}`;
  isDevelopment && console.warn('Computed URL base for Thing Model:', urlBase);
  const url = new URL(`${urlBase}`, window.location.origin);

  isDevelopment && console.warn('Fetching local Thing Model from URL:', url.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Response('Failed to fetch local Thing Model', {
      status: res.status,
    });
  }

  const json: unknown = await res.json();
  isDevelopment && console.warn('Fetched local Thing Model JSON:', json);

  return json as DetailedInventoryItem;
}
