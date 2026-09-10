import React from 'react';
import { useImageLoader } from '../hooks/useImageLoader';

interface CardProps {
  title: string | undefined;
  author: string;
  manufacturer: string;
  imageSrc: string;
  imageAlt: string;
  imageFallbackSrc: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  title,
  author,
  manufacturer,
  imageSrc,
  imageAlt,
  imageFallbackSrc,
  children,
}) => {
  const { currentSrc, isLoading, handleLoad, handleError } = useImageLoader({
    src: imageSrc,
    fallbackSrc: imageFallbackSrc,
  });

  return (
    <div className="flex h-full w-full flex-col p-5 text-text-primary">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-6">{title ?? ''}</h3>
          <p className="mt-1 truncate text-sm text-text-secondary">{manufacturer}</p>
          <span className="mt-3 inline-flex max-w-full items-center truncate rounded-full bg-overlay-success-tint px-2.5 py-1 text-xs font-medium text-status-success">
            {author}
          </span>
        </div>
        <div className="relative size-24 shrink-0 rounded-lg bg-media p-3 shadow-sm">
          {isLoading && (
            <div
              className="absolute inset-3 animate-pulse rounded-md bg-surface-panel"
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
};

export default Card;
