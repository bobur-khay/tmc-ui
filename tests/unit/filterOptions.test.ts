import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAvailableFilterOptionsServer,
  getAvailableFilterOptionsClient,
  getAvailableFilterOptionsServer,
} from '@/app/_components/sidebar/utils';
import { PROTOCOLS } from '@/lib/utils/constants';
import { inventory, jsonResponse, REPO } from '../fixtures/inventory';

const unchecked = (...values: string[]) => values.map((value) => ({ value, checked: false }));
const FETCH_ERROR = { message: 'Could not fetch the filters. Refresh the page to try again.' };
const NO_DATA = { message: 'No filter data available' };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getAvailableFilterOptionsClient', () => {
  it('derives sorted, distinct options from the index and protocols.txt', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          url.endsWith('protocols.txt')
            ? new Response('modbus\nhttps\nHTTPS\n')
            : jsonResponse({ data: inventory }),
        ),
    );

    await expect(getAvailableFilterOptionsClient()).resolves.toEqual({
      author: unchecked('omnicorp', 'omniuser'),
      manufacturer: unchecked('omnicorp'),
      repository: unchecked(REPO),
      protocol: unchecked('HTTPS', 'modbus'),
    });
  });

  it('reports a fetch error per filter group', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));

    await expect(getAvailableFilterOptionsClient()).resolves.toEqual({
      author: FETCH_ERROR,
      manufacturer: FETCH_ERROR,
      repository: FETCH_ERROR,
      protocol: FETCH_ERROR,
    });
  });

  it('reports missing data for an empty catalog', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          url.endsWith('protocols.txt') ? new Response('') : jsonResponse({ data: [] }),
        ),
    );

    await expect(getAvailableFilterOptionsClient()).resolves.toEqual({
      author: NO_DATA,
      manufacturer: NO_DATA,
      repository: NO_DATA,
      protocol: NO_DATA,
    });
  });
});

describe('getAvailableFilterOptionsServer', () => {
  beforeEach(() => {
    vi.stubEnv('API_BASE', 'http://localhost:8080');
  });

  it('loads authors, manufacturers and repositories and uses the static protocols', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/authors')) return jsonResponse({ data: ['omnicorp', 'Omnicorp'] });
      if (url.endsWith('/manufacturers')) return jsonResponse({ data: [] });
      return jsonResponse({ data: [{ name: 'r1' }, { name: 'r2' }] });
    });
    vi.stubGlobal('fetch', fetchMock);

    const filters = await getAvailableFilterOptionsServer('Bearer abc');

    expect(filters).toEqual({
      author: unchecked('Omnicorp'),
      manufacturer: NO_DATA,
      repository: unchecked('r1', 'r2'),
      protocol: PROTOCOLS,
    });
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      'http://localhost:8080/authors',
      'http://localhost:8080/manufacturers',
      'http://localhost:8080/repos',
    ]);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer abc' });
  });

  it('reports a fetch error only for the failing group', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (url: string) =>
          url.endsWith('/authors')
            ? new Response('denied', { status: 403 })
            : jsonResponse({ data: [] }),
        ),
    );

    const filters = await getAvailableFilterOptionsServer('');

    expect(filters.author).toEqual(FETCH_ERROR);
    expect(filters.manufacturer).toEqual(NO_DATA);
  });
});

describe('fetchAvailableFilterOptionsServer', () => {
  it('returns an empty list when the request was aborted', async () => {
    vi.stubEnv('API_BASE', 'http://localhost:8080');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')));
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchAvailableFilterOptionsServer({ endpoint: 'authors', signal: controller.signal }),
    ).resolves.toEqual([]);
  });
});
