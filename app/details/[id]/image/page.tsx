'use client';

import Loader from '@/app/_components/base/Loader';
import { ErrorUI } from '@/app/_components/error/ErrorUI';
import type { DetailedInventoryItem } from '@/app/_components/inventory/types';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchTmContentFromServer } from '@/lib/services/apiData';
import { fetchLocalDataInventory, fetchLocalThingModel } from '@/lib/services/localData';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ImageViewer from '../_components/ImageViewer';

export default function ImagePage() {
  const { id: paramId } = useParams<{ id: string }>();
  const id = decodeURIComponent(paramId);
  const router = useRouter();
  const { authorizationHeader } = useAuth();
  const [model, setModel] = useState<DetailedInventoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detailsPath = `/details/${encodeURIComponent(id)}`;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      setModel(null);
      setError(null);
      try {
        let data: DetailedInventoryItem;
        if (process.env.TMC_SERVER_URL) {
          data = await fetchTmContentFromServer(id, {
            authorizationHeader,
            signal: controller.signal,
          });
        } else {
          const inventory = await fetchLocalDataInventory(controller.signal);
          const item = inventory.find((entry) =>
            entry.versions?.some((version) => version.tmID === id),
          );
          const version = item?.versions?.find((entry) => entry.tmID === id);
          if (!item || !version?.links.content) throw new Error('Thing Model not found.');
          const content = await fetchLocalThingModel(version.links.content);
          data = { ...item, ...content };
        }
        if (!controller.signal.aborted) setModel(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load image.');
        }
      }
    })();
    return () => controller.abort();
  }, [id, authorizationHeader]);

  return (
    <main className="bg-surface-canvas fixed inset-0 z-40 h-dvh w-full">
      {error ? (
        <div className="mx-auto w-full max-w-3xl p-6 sm:pt-16">
          <ErrorUI description={error} buttonOnclick={() => router.push(detailsPath)} />
        </div>
      ) : model ? (
        <ImageViewer TM={model} id={id} onClose={() => router.push(detailsPath)} />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Loader text="Loading image..." />
        </div>
      )}
    </main>
  );
}
