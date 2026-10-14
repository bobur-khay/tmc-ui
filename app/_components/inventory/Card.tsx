import { useImageLoader } from '@/lib/hooks/useImageLoader';
import React from 'react';

interface CardProps {
  view?: 'grid' | 'list';
  modelId: string | undefined;
  author: string;
  manufacturer: string;
  imageSrc: string;
  imageAlt: string;
  imageFallbackSrc: string;
  children?: React.ReactNode;
}

export function Card({
  view = 'grid',
  modelId,
  author,
  manufacturer,
  imageSrc,
  imageAlt,
  imageFallbackSrc,
  children,
}: CardProps) {
  const { currentSrc, isLoading, handleLoad, handleError } = useImageLoader({
    src: imageSrc,
    fallbackSrc: imageFallbackSrc,
  });

  const image = (
    <div
      className={
        view === 'list'
          ? 'bg-media relative col-start-1 row-span-2 row-start-1 min-h-28 overflow-hidden rounded-l-[3px] md:row-span-1'
          : 'bg-media relative size-24 shrink-0 rounded-lg p-3 shadow-sm'
      }
    >
      {isLoading && (
        <div
          className="bg-surface-panel absolute inset-3 animate-pulse rounded-md"
          aria-label="Loading image"
        />
      )}
      <img
        decoding="async"
        alt={imageAlt}
        src={currentSrc}
        onLoad={handleLoad}
        onError={handleError}
        className={`${view === 'list' ? 'absolute inset-0 size-full object-contain p-3' : 'size-full object-contain'} transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );

  const identity = (
    <div className="min-w-0 flex-1">
      <h3 className="text-lg leading-6 font-semibold wrap-anywhere">{modelId ?? '—'}</h3>
      <dl className="mt-2 space-y-1 text-sm leading-5">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-text-secondary shrink-0 font-semibold">Author:</dt>
          <dd className="min-w-0 font-medium wrap-anywhere">{author}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="text-text-secondary shrink-0 font-semibold">Manufacturer:</dt>
          <dd className="min-w-0 font-medium wrap-anywhere">{manufacturer}</dd>
        </div>
      </dl>
    </div>
  );

  if (view === 'list') {
    return (
      <div className="text-text-primary grid h-full w-full min-w-0 grid-cols-[5rem_minmax(0,1fr)] md:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
        {image}
        <div className="col-start-2 row-start-1 min-w-0 px-4 pt-4 md:p-5">{identity}</div>
        <div className="col-start-2 row-start-2 flex min-w-0 flex-col px-4 pb-4 md:col-start-3 md:row-start-1 md:p-5 md:pl-0">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="text-text-primary flex h-full w-full flex-col p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        {identity}
        {image}
      </div>
      {children}
    </div>
  );
}
