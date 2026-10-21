import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ReactNode } from 'react';
import type { InventoryItem } from '@/app/_components/inventory/types';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import { INVENTORY_FILENAME, REPOSITORY_CATALOG_DEFAULT_FOLDER } from '@/lib/utils/constants';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  if (process.env.IS_STATIC !== 'true') return [];

  let inventory: InventoryItem[];

  if (process.env.TMC_SERVER_URL) {
    inventory = [];
    let page = 0;

    while (true) {
      const response = await fetchApiDataInventory(process.env.TMC_SERVER_URL, {}, page, 100);
      const items = response.data as InventoryItem[];
      inventory.push(...items);
      if (items.length === 0 || inventory.length >= response.meta.page.totalElements) break;
      page += 1;
    }
  } else {
    const catalogPath = path.join(
      process.cwd(),
      REPOSITORY_CATALOG_DEFAULT_FOLDER,
      INVENTORY_FILENAME,
    );
    const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as {
      data: InventoryItem[];
    };
    inventory = catalog.data;
  }

  const ids = inventory.flatMap((item) => item.versions?.map((version) => version.tmID) ?? []);
  return Array.from(new Set(ids)).map((id) => ({ id }));
}

export default function DetailsLayout({ children }: { children: ReactNode }) {
  return children;
}
