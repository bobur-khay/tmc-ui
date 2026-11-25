import type { InventoryItem } from '@/app/_components/inventory/types';
import { inventory } from './inventory';

export const SERVER_URL = 'http://tmc.test';
export const TOKEN_URL = 'http://auth.test/token';
export const CREDENTIALS = { clientId: 'tmc-ui', clientSecret: 's3cret' };
export const ACCESS_TOKEN = 'test-access-token';

interface FakeRequest {
  url: URL;
  authorization: string | null;
}

interface FakeResponse {
  status: number;
  /** Sent as JSON unless it is a string. */
  body: unknown;
}

/**
 * In-memory stand-in for a TMC server and its OAuth2 token endpoint.
 * Shared by the Vitest integration tests (behind `fetch`) and the Playwright tests (behind `page.route`).
 */
export function createFakeTmcServer({
  items = inventory,
  requireAuth = false,
  thingModel = { title: 'Lightall', properties: { status: {} }, actions: { toggle: {} } },
}: { items?: InventoryItem[]; requireAuth?: boolean; thingModel?: object } = {}) {
  const serverItems = items.map((item) => ({ ...item, tmName: item.name }));
  const requests: FakeRequest[] = [];
  const tokenRequests: (string | null)[] = [];
  const list = (param: string | null) => param?.split(',') ?? [];
  const distinct = (values: string[]) => [...new Set(values)];

  function handle({ url, authorization }: FakeRequest): FakeResponse {
    if (url.origin + url.pathname === TOKEN_URL) {
      tokenRequests.push(authorization);
      const expected = `Basic ${btoa(`${CREDENTIALS.clientId}:${CREDENTIALS.clientSecret}`)}`;
      return authorization === expected
        ? {
            status: 200,
            body: { access_token: ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600 },
          }
        : { status: 401, body: 'invalid_client' };
    }

    requests.push({ url, authorization });
    if (requireAuth && authorization !== `Bearer ${ACCESS_TOKEN}`) {
      return { status: 401, body: 'Unauthorized' };
    }

    const path = decodeURIComponent(url.pathname);
    if (path === '/authors') {
      return {
        status: 200,
        body: { data: distinct(items.map((item) => item['schema:author']['schema:name'])) },
      };
    }
    if (path === '/manufacturers') {
      return {
        status: 200,
        body: { data: distinct(items.map((item) => item['schema:manufacturer']['schema:name'])) },
      };
    }
    if (path === '/repos') {
      return { status: 200, body: { data: [{ name: 'main' }, { name: 'staging' }] } };
    }
    if (path === '/inventory') {
      const params = url.searchParams;
      const authors = list(params.get('filter.author'));
      const manufacturers = list(params.get('filter.manufacturer'));
      const protocols = list(params.get('filter.protocol'));
      const search = params.get('search')?.toLowerCase();
      const matches = serverItems.filter(
        (item) =>
          (!authors.length || authors.includes(item['schema:author']['schema:name'])) &&
          (!manufacturers.length ||
            manufacturers.includes(item['schema:manufacturer']['schema:name'])) &&
          (!protocols.length || protocols.some((protocol) => item.protocols?.includes(protocol))) &&
          (!search || item.tmName?.toLowerCase().includes(search)),
      );
      const pageSize = Number(params.get('pageSize')) || matches.length;
      const pageNumber = Number(params.get('page')) || 1;
      return {
        status: 200,
        body: {
          data: matches.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
          meta: { lastUpdated: '', page: { pageNumber, pageSize, totalElements: matches.length } },
        },
      };
    }
    if (path.startsWith('/inventory/.tmName/')) {
      const tmName = path.slice('/inventory/.tmName/'.length);
      return { status: 200, body: { data: serverItems.filter((item) => item.tmName === tmName) } };
    }
    if (path.startsWith('/thing-models/')) {
      const id = path.slice('/thing-models/'.length);
      const item = serverItems.find((entry) => entry.versions?.some((v) => v.tmID === id));
      return item
        ? { status: 200, body: { ...item, ...thingModel } }
        : { status: 404, body: 'Not found' };
    }
    return { status: 404, body: 'Not found' };
  }

  return {
    handle,
    requests,
    tokenRequests,
    inventoryRequests: () => requests.filter(({ url }) => url.pathname === '/inventory'),
  };
}
