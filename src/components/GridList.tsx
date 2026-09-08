import React from 'react';
import defaultImage from '../assets/default-image.png';
import { Link } from 'react-router-dom';
import Loader from './base/Loader';
import Card from './Card';

const DEFAULT_IMAGE_SRC = defaultImage;

const buildItemKey = (itemTM: Item, i: number): string =>
  `${itemTM.repo}:${itemTM.repo}:${itemTM['schema:mpn']}:row-${i}`;

const buildItemImageSrc = (
  tmName: string | undefined,
  deploymentType: DeploymentType | string,
  attachments: Attachments[] | undefined,
): string => {
  if (!attachments) return DEFAULT_IMAGE_SRC;

  const pngImageSrc: Attachments | undefined = attachments.find((att) => att.name.endsWith('png'));

  if (deploymentType !== 'SERVER_AVAILABLE') {
    if (!tmName || !pngImageSrc) return DEFAULT_IMAGE_SRC;

    return `${tmName}/.attachments/${pngImageSrc?.name}`;
  }

  if (!pngImageSrc) return DEFAULT_IMAGE_SRC;

  const attachmentLink: string | undefined = pngImageSrc.links.content;

  if (!attachmentLink) return DEFAULT_IMAGE_SRC;

  if (!__API_BASE__) return DEFAULT_IMAGE_SRC;

  return `${__API_BASE__}/${attachmentLink}`;
};

const CARD_CLASS_NAME =
  "relative min-w-0 rounded-[4px] border border-border-default bg-surface-panel shadow-md before:pointer-events-none before:absolute before:bottom-[-3px] before:left-[-3px] before:right-[-3px] before:top-[-3px] before:rounded-[4px] before:border before:border-focus-ring before:opacity-0 before:content-[''] focus-within:rounded-[4px] focus-within:border focus-within:border-border-default focus-within:bg-surface-panel focus-within:outline-none focus-within:before:opacity-100 hover:bg-surface-panel-hover hover:shadow-sm hover:outline-interactive-support-hover";

const GridList: React.FC<{
  items: ItemExtended[];
  loading: boolean;
}> = ({ items, loading }) => {
  if (loading) return <Loader text="Loading catalog..." />;

  return (
    <div className="w-full">
      <ul
        role="list"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(18rem,100%),1fr))] gap-6"
      >
        {items.map((itemTM, i) => {
          const key = buildItemKey(itemTM, i);
          const title = itemTM.name ?? itemTM.tmName;
          const imageSrc = buildItemImageSrc(title, __DEPLOY_TYPE__, itemTM.attachments);
          const versionCount = itemTM.versions?.length ?? 0;

          return (
            <li key={key} className={CARD_CLASS_NAME}>
              <Link
                className="block h-full"
                to={`/details/${title}`}
                state={{
                  item: itemTM,
                  imageSrc: imageSrc,
                  deploymentType: __DEPLOY_TYPE__,
                }}
              >
                <Card
                  title={title}
                  author={itemTM['schema:author']['schema:name']}
                  manufacturer={itemTM['schema:manufacturer']['schema:name']}
                  imageSrc={imageSrc}
                  imageAlt={`Product image of ${title}`}
                  imageFallbackSrc={DEFAULT_IMAGE_SRC}
                >
                  <div className="mt-5 flex flex-1 flex-col border-t border-border-subtle pt-4">
                    {itemTM['schema:description'] && (
                      <p className="mb-4 line-clamp-2 text-sm leading-5 text-text-secondary">
                        {itemTM['schema:description']}
                      </p>
                    )}
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                      <dt className="font-medium text-text-tertiary">Repository</dt>
                      <dd className="truncate text-right text-text-primary">
                        {itemTM.repo ?? '—'}
                      </dd>
                      <dt className="font-medium text-text-tertiary">Model ID</dt>
                      <dd className="truncate text-right text-text-primary">
                        {itemTM['schema:mpn'] ?? '—'}
                      </dd>
                      {itemTM.links?.content && (
                        <>
                          <dt className="font-medium text-text-tertiary">Content</dt>
                          <dd className="truncate text-right text-text-primary">
                            {itemTM.links.content}
                          </dd>
                        </>
                      )}
                    </dl>
                    <p className="mt-auto pt-5 text-xs font-semibold uppercase text-interactive-support">
                      {versionCount} version{versionCount === 1 ? '' : 's'} available
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default React.memo(GridList);
