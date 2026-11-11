import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReactNode } from 'react';
import type { InventoryItem } from '@/app/_components/inventory/types';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import { requestClientCredentialsToken } from '@/lib/services/auth';
import { INVENTORY_FILENAME, REPOSITORY_CATALOG_DEFAULT_FOLDER } from '@/lib/utils/constants';
import { buildDetailsId, encodeDetailsId } from '@/lib/utils/details';
import { DEFAULT_PAGE_SIZE } from '@/lib/hooks/pagination/paginationTypes';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  if (process.env.IS_STATIC !== 'true') return [];

  let inventory: InventoryItem[];

  if (process.env.TMC_SERVER_URL) {
    let authorizationHeader: string | undefined;

    if (process.env.TOKEN_URL) {
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          'CLIENT_ID and CLIENT_SECRET are required for authenticated static generation',
        );
      }

      const token = await requestClientCredentialsToken({
        tokenUrl: process.env.TOKEN_URL,
        clientId,
        clientSecret,
      });
      authorizationHeader = `Bearer ${token.accessToken}`;
    }

    const response = await fetchApiDataInventory(process.env.TMC_SERVER_URL, {
      authorizationHeader,
    });
    inventory = response.data as InventoryItem[];
  } else {
    const catalogPath = path.join(
      process.cwd(),
      'public',
      REPOSITORY_CATALOG_DEFAULT_FOLDER,
      INVENTORY_FILENAME,
    );
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
      data: InventoryItem[];
    };
    inventory = catalog.data;
  }

  const ids = new Set<string>();

  for (let offset = 0; offset < inventory.length; offset += DEFAULT_PAGE_SIZE) {
    const page = inventory.slice(offset, offset + DEFAULT_PAGE_SIZE);
    for (const item of page) {
      for (const version of item.versions ?? []) {
        ids.add(buildDetailsId(version.tmID, version.repo || item.repo));
      }
    }
  }

  return Array.from(ids).map((id) => ({ id: encodeDetailsId(id) }));
}

export default function DetailsLayout({ children }: { children: ReactNode }) {
  return children;
}
