import type { InventoryItem, Version } from '@/app/_components/inventory/types';

export const REPO = 'example-catalog-a32da3c49684';

function version(tmName: string, model: string, digest: string, extra?: Partial<Version>): Version {
  const tmID = `${tmName}/v${model}-20241008124326-${digest}.tm.json`;
  return {
    description: '',
    version: { model },
    links: { self: tmID, content: tmID },
    tmID,
    digest,
    timestamp: '20241008124326',
    externalID: '',
    repo: REPO,
    ...extra,
  };
}

function item(
  author: string,
  manufacturer: string,
  mpn: string,
  versions: Version[],
  extra?: Partial<InventoryItem>,
): InventoryItem {
  const name = `${author}/${manufacturer}/${mpn}`;
  return {
    id: name,
    name,
    links: { self: name },
    repo: REPO,
    protocols: [],
    'schema:author': { 'schema:name': author },
    'schema:manufacturer': { 'schema:name': manufacturer },
    'schema:mpn': mpn,
    'schema:description': '',
    versions,
    version: { model: versions[0].version.model },
    ...extra,
  };
}

export const lightall = item(
  'omnicorp',
  'omnicorp',
  'lightall',
  [
    version('omnicorp/omnicorp/lightall', '2.0.1', '8c75753996b3'),
    version('omnicorp/omnicorp/lightall', '1.0.0', '6e351cc95192', {
      // The catalog index lists attachments without links
      attachments: [{ name: 'lightall-v1.png', mediaType: 'image/png' }] as Version['attachments'],
    }),
  ],
  {
    protocols: ['https'],
    attachments: [
      { name: 'lightall-v2.svg', mediaType: 'image/svg+xml' },
      { name: 'lightall-v2.png', mediaType: 'image/png' },
    ] as InventoryItem['attachments'],
  },
);

export const lightallMk2 = item(
  'omnicorp',
  'omnicorp',
  'lightall-mk2',
  [version('omnicorp/omnicorp/lightall-mk2', '2.0.0', '78224e4a2056')],
  { protocols: ['modbus'] },
);

export const senseall = item(
  'omniuser',
  'omnicorp',
  'senseall',
  [version('omniuser/omnicorp/senseall', '1.0.0', 'a49ec0cb9c4f')],
  { 'schema:description': 'A multi sensor', protocols: ['https'] },
);

export const inventory: InventoryItem[] = [lightall, lightallMk2, senseall];

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}
