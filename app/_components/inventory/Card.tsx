import { useImageLoader } from '@/lib/hooks/useImageLoader';
import React from 'react';

interface CardProps {
  modelId: string | undefined;
  author: string;
  manufacturer: string;
  imageSrc: string;
  imageAlt: string;
  imageFallbackSrc: string;
  children?: React.ReactNode;
}

export function Card({
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

  return (
    <div className="text-text-primary flex h-full w-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
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
        <div className="bg-media relative size-24 shrink-0 rounded-lg p-3 shadow-sm">
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
            className={`size-full object-contain transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
