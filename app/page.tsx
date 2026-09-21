'use client';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import { fetchLocalDataInventory } from '@/lib/services/localData';
import { isNonEmptyString } from '@/lib/utils/strings';
import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;
const isDevelopment = process.env.NODE_ENV === 'development';

export default function Inventory() {
  // Authentication data and state
  const authData = useAuth();
  // Inventory data and state
  const [inventory, setInventory] = useState<Item[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0); // TODO: make sure can't be derived from inventory.length

  const isServerAvailable = isNonEmptyString(process.env.SERVER_URL);

  if (isDevelopment) {
    console.warn('Authentication data:', authData);
  }

  const loadInventoryServer = useCallback(
    async (page: number, pageSize: number, abortSignal?: AbortSignal) => {
      const { data, meta } = await fetchApiDataInventory(
        process.env.API_BASE,
        {
          signal: abortSignal,
          authorizationHeader: authData.authorizationHeader,
        },
        page,
        pageSize,
      );

      setInventory(data as Item[]);
      setTotalItems(meta.page.totalElements);
    },
    [authData.authorizationHeader],
  );

  const loadInventoryClient = useCallback(async () => {
    const response = await fetchLocalDataInventory();
    const nexInventoryFiltered = response.filter((item) => item['schema:mpn'] !== '');
    setInventory(nexInventoryFiltered);
    setTotalItems(nexInventoryFiltered.length);
  }, []);

  const loadInventory = useCallback(
    async (abortSignal?: AbortSignal) => {
      setIsInventoryLoading(true);
      setInventoryError(null);

      try {
        if (isServerAvailable) {
          await loadInventoryServer(1, DEFAULT_PAGE_SIZE, abortSignal);
        } else {
          await loadInventoryClient();
        }
      } catch (err: unknown) {
        if (abortSignal?.aborted) {
          return;
        }
        if (err instanceof Response) {
          setInventoryError(err.statusText || 'Failed to find inventory');
          return;
        }
        setInventoryError(err instanceof Error ? err.message : 'Failed to find local inventory');
      } finally {
        setIsInventoryLoading(false);
      }
    },
    [isServerAvailable, loadInventoryClient, loadInventoryServer],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadInventory(controller.signal);
    return () => controller.abort();
  }, [loadInventory]);

  return (
    <FilterProvider>
      <Layout
        loadedItems={inventory}
        inventoryError={inventoryError}
        inventoryLoading={isInventoryLoading}
        totalItems={totalItems}
      />
    </FilterProvider>
  );
}
