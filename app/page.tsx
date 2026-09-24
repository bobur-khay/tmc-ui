'use client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Inventory } from '@/app/_components/inventory/Inventory';
import { fetchApiDataInventory } from '@/lib/services/apiData';
import { fetchLocalDataInventory } from '@/lib/services/localData';
import { isNonEmptyString } from '@/lib/utils/strings';
import { useCallback, useEffect, useState } from 'react';
import Loader from './_components/base/Loader';
import { AppErrorUI } from './_components/AppErrorUI';

const DEFAULT_PAGE_SIZE = 10;
const isDevelopment = process.env.NODE_ENV === 'development';

export default function InventoryLoad() {
  // Authentication data and state
  const authData = useAuth();
  // Inventory data and state
  const [inventory, setInventory] = useState<Item[]>([]);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);

  const isServerAvailable = isNonEmptyString(process.env.SERVER_URL);

  if (isDevelopment) {
    console.warn('Authentication data:', authData);
  }

  const loadInventoryServer = useCallback(
    async (page: number, pageSize: number, abortSignal?: AbortSignal) => {
      const { data } = await fetchApiDataInventory(
        process.env.API_BASE,
        {
          signal: abortSignal,
          authorizationHeader: authData.authorizationHeader,
        },
        page,
        pageSize,
      );

      if ((data as Item[]).length === 0) {
        throw new Error('The inventory is empty');
      }
      setInventory(data as Item[]);
    },
    [authData.authorizationHeader],
  );

  const loadInventoryClient = useCallback(async () => {
    const response = await fetchLocalDataInventory();
    const filteredInventory = response.filter((item) => item['schema:mpn'] !== '');
    if (filteredInventory.length === 0) {
      throw new Error('The inventory is empty');
    }
    setInventory(filteredInventory);
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

  if (isInventoryLoading) {
    return <Loader text="Loading inventory..." />;
  }

  if (inventoryError) {
    return <AppErrorUI title={"Couldn't load inventory"} description={inventoryError} />;
  }

  return <Inventory loadedItems={inventory} />;
}
