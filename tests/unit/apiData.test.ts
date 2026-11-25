import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchApiDataInventory, fetchTmContentFromServer } from '@/lib/services/apiData';
import { jsonResponse, lightall } from '../fixtures/inventory';

const BASE = 'http://localhost:8080';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('fetchApiDataInventory', () => {
  it('builds the inventory URL from pagination, filters and search', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchApiDataInventory(
      `${BASE}//`,
      {
        filters: {
          author: ['a1', 'a2'],
          protocol: ['https'],
          manufacturer: ['m1'],
          repository: ['r1'],
          changedSince: '20240101',
        },
        search: 'light',
      },
      2,
      50,
    );

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(`${BASE}/inventory`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      pageSize: '50',
      'filter.author': 'a1,a2',
      'filter.protocol': 'https',
      'filter.manufacturer': 'm1',
      repo: 'r1',
      'filter.changedSince': '20240101',
      search: 'light',
    });
  });

  it('sends the authorization header only when provided', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchApiDataInventory(BASE, { authorizationHeader: 'Bearer abc' });
    await fetchApiDataInventory(BASE);

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    expect(fetchMock.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
  });

  it('returns the data with the server metadata', async () => {
    const meta = { lastUpdated: 'now', page: { pageNumber: 3, pageSize: 10, totalElements: 42 } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [lightall], meta })));

    await expect(fetchApiDataInventory(BASE)).resolves.toEqual({ data: [lightall], meta });
  });

  it('derives missing metadata from the request and the data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [lightall] })));

    const response = await fetchApiDataInventory(BASE, {}, 2, 20);

    expect(response.meta).toEqual({
      lastUpdated: '',
      page: { pageNumber: 2, pageSize: 20, totalElements: 1 },
    });
  });

  it('returns an empty inventory for an unexpected payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [] })));

    const response = await fetchApiDataInventory(BASE);

    expect(response.data).toEqual([]);
    expect(response.meta.page.totalElements).toBe(0);
  });

  it('throws a 400 response without a base URL', async () => {
    const error = await fetchApiDataInventory(undefined).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(400);
  });

  it('throws a response carrying the server status and message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 503 })));

    const error = (await fetchApiDataInventory(BASE).catch((err: unknown) => err)) as Response;

    expect(error.status).toBe(503);
    expect(await error.text()).toBe('boom');
  });

  it('throws a 504 response when the request times out', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );

    const pending = fetchApiDataInventory(BASE).catch((err: unknown) => err);
    await vi.runAllTimersAsync();
    const error = (await pending) as Response;

    expect(error).toBeInstanceOf(Response);
    expect(error.status).toBe(504);
    vi.useRealTimers();
  });

  it('rethrows the abort error when the caller aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          }),
      ),
    );
    const controller = new AbortController();

    const pending = fetchApiDataInventory(BASE, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('fetchTmContentFromServer', () => {
  const ID = 'omnicorp/omnicorp/lightall/v1.0.0-20241008124326-6e351cc95192.tm.json';

  beforeEach(() => {
    vi.stubEnv('API_BASE', BASE);
  });

  it('merges the TM content with its name, attachments and versions', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) =>
      url.includes('/inventory/.tmName/')
        ? jsonResponse({
            data: [
              {
                tmName: 'omnicorp/omnicorp/lightall',
                attachments: lightall.attachments,
                versions: lightall.versions,
              },
            ],
          })
        : jsonResponse({ title: 'Lightall', properties: { status: {} } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const tm = await fetchTmContentFromServer(ID, { authorizationHeader: 'Bearer abc' });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${BASE}/inventory/.tmName/omnicorp/omnicorp/lightall`,
      `${BASE}/thing-models/${ID}`,
    ]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
    expect(tm).toMatchObject({
      title: 'Lightall',
      tmName: 'omnicorp/omnicorp/lightall',
      attachments: lightall.attachments,
      versions: lightall.versions,
    });
  });

  it('returns the bare content when the inventory entry is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          url.includes('/inventory/') ? jsonResponse({ data: [] }) : jsonResponse({ title: 'TM' }),
        ),
    );

    await expect(fetchTmContentFromServer(ID)).resolves.toEqual({ title: 'TM' });
  });

  it('throws when a request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    await expect(fetchTmContentFromServer(ID)).rejects.toThrow("Coudn't fetch TM");
  });
});
