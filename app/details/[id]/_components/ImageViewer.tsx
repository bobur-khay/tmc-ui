'use client';

import Button from '@/app/_components/base/Button';
import { buildItemImageSrc } from '@/app/_components/inventory/InventoryResults';
import type { DetailedInventoryItem } from '@/app/_components/inventory/types';
import { CATALOG_ROOT_FOLDER } from '@/lib/utils/constants';
import { ArrowDownTrayIcon, ShareIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';
import ShareModal from './ShareModal';

export default function ImageViewer({
  TM,
  id,
  onClose,
}: {
  TM: DetailedInventoryItem;
  id: string;
  onClose: () => void;
}) {
  const [isDownloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const imagePath = buildItemImageSrc(TM.tmName, TM.attachments);
  const imageSrc =
    !process.env.TMC_SERVER_URL && !imagePath.startsWith('/')
      ? `${process.env.BASE_PATH || ''}/${CATALOG_ROOT_FOLDER}/${imagePath}`
      : imagePath;
  const imageTitle = TM.title || TM.name || TM.tmName || 'Product image';

  const downloadImage = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch(imageSrc);
      if (!response.ok) throw new Error('Image download failed');
      const imageBlob = await response.blob();
      const objectUrl = URL.createObjectURL(imageBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download =
        new URL(imageSrc, window.location.href).pathname.split('/').pop() || 'product-image.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setDownloadError('Could not download the image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-surface-modal flex h-full w-full flex-col">
      <div className="border-border-subtle flex shrink-0 items-center gap-2 border-b p-3 sm:px-5">
        <h1 className="text-text-primary mr-auto min-w-0 truncate text-sm font-semibold">
          {imageTitle}
        </h1>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() =>
            setShareUrl(
              new URL(
                `${process.env.BASE_PATH || ''}/details/${encodeURIComponent(id)}/image`,
                window.location.origin,
              ).href,
            )
          }
          aria-label="Share image"
          title="Share image"
        >
          <ShareIcon aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">Share</span>
        </Button>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => void downloadImage()}
          disabled={isDownloading}
          aria-label={isDownloading ? 'Downloading image' : 'Download image'}
          title={isDownloading ? 'Downloading image' : 'Download image'}
        >
          <ArrowDownTrayIcon aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
        </Button>
        <Button
          type="button"
          variant="plain"
          size="sm"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close image"
          title="Close image"
        >
          <XMarkIcon aria-hidden="true" className="size-5" />
        </Button>
      </div>
      {downloadError && (
        <p role="alert" className="text-status-error-strong shrink-0 px-4 py-2 text-sm">
          {downloadError}
        </p>
      )}
      <div className="bg-media flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        <img
          src={imageSrc}
          alt={`Product image of ${imageTitle}`}
          className="h-full w-full object-contain"
        />
      </div>
      {shareUrl !== null && (
        <ShareModal
          url={shareUrl}
          title="Share image"
          description={`Image of ${imageTitle}`}
          onClose={() => setShareUrl(null)}
        />
      )}
    </div>
  );
}
