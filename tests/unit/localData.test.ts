import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDataFromTxT,
  fetchLocalDataInventory,
  fetchLocalThingModel,
} from '@/lib/services/localData';
import { inventory, jsonResponse, lightall, REPO } from '../fixtures/inventory';

const TOC_PATH = '/catalog-repos/.tmc/tm-catalog.toc.json';

function stubCatalog(thingModel: unknown = { title: 'Lightall' }) {
  const fetchMock = vi.fn().mockImplementation(async (input: string) => {
    const { pathname } = new URL(input, window.location.origin);
    if (pathname.endsWith(TOC_PATH)) return jsonResponse({ data: inventory });
    if (pathname.endsWith('.tm.json')) return jsonResponse(thingModel);
    return new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchLocalDataInventory', () => {
  it('loads the merged index from the catalog folder', async () => {
    const fetchMock = stubCatalog();

    await expect(fetchLocalDataInventory()).resolves.toEqual(inventory);
    expect(fetchMock.mock.calls[0][0]).toBe(`${window.location.origin}${TOC_PATH}`);
  });

  it('respects the base path', async () => {
    vi.stubEnv('BASE_PATH', '/tmc-ui');
    const fetchMock = stubCatalog();

    await fetchLocalDataInventory();

    expect(fetchMock.mock.calls[0][0]).toBe(`${window.location.origin}/tmc-ui${TOC_PATH}`);
  });

  it('returns an empty list for an unexpected payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));
    await expect(fetchLocalDataInventory()).resolves.toEqual([]);
  });

  it('throws a response with the failing status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));

    const error = await fetchLocalDataInventory().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(404);
  });
});

describe('fetchDataFromTxT', () => {
  it('returns trimmed, de-duplicated, non-empty lines', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('https\r\n modbus \n\nhttps\n'));
    vi.stubGlobal('fetch', fetchMock);

    const lines = await fetchDataFromTxT('http://localhost:3000', 'protocols.txt');

    expect(lines).toEqual(['https', 'modbus']);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:3000/catalog-repos/.tmc/protocols.txt',
    );
  });

  it('throws when the file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(fetchDataFromTxT('http://localhost:3000', 'protocols.txt')).rejects.toThrow(
      'Failed to fetch data from protocols.txt (404)',
    );
  });
});

describe('fetchLocalThingModel', () => {
  const latest = lightall.versions![0];
  const archived = lightall.versions![1];

  beforeEach(() => {
    stubCatalog();
  });

  it('resolves a repository-qualified ID and merges the TM content', async () => {
    const fetchMock = stubCatalog({ title: 'Lightall', properties: { status: {} } });

    const tm = await fetchLocalThingModel(`${REPO}/${latest.tmID}`);

    expect(fetchMock.mock.calls[1][0]).toBe(`/catalog-repos/${REPO}/${latest.links.content}`);
    expect(tm).toMatchObject({
      title: 'Lightall',
      repo: REPO,
      tmName: 'omnicorp/omnicorp/lightall',
      versions: lightall.versions,
      attachments: lightall.attachments,
    });
  });

  it('also resolves a bare TM ID', async () => {
    await expect(fetchLocalThingModel(latest.tmID)).resolves.toMatchObject({ title: 'Lightall' });
  });

  it('links archived version attachments to the version folder', async () => {
    const tm = await fetchLocalThingModel(`${REPO}/${archived.tmID}`);

    const path =
      'omnicorp/omnicorp/lightall/.attachments/v1.0.0-20241008124326-6e351cc95192/lightall-v1.png';
    expect(tm.attachments).toEqual([
      { name: 'lightall-v1.png', mediaType: 'image/png', links: { self: path, content: path } },
    ]);
  });

  it('throws for an unknown ID', async () => {
    await expect(fetchLocalThingModel('missing/v1.tm.json')).rejects.toThrow(
      'Thing Model not found.',
    );
  });

  it('throws a response when the TM file cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (input: string) =>
          input.endsWith(TOC_PATH)
            ? jsonResponse({ data: inventory })
            : new Response('', { status: 404 }),
        ),
    );

    const error = await fetchLocalThingModel(latest.tmID).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(404);
  });
});
