import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import AuthenticationGuard from '@/app/_components/auth/AuthenticationGuard';
import { InventoryProvider } from '@/app/_components/inventory/InventoryProvider';
import type { InventoryItem } from '@/app/_components/inventory/types';
import InventoryPage from '@/app/page';
import { inventory, jsonResponse } from '../fixtures/inventory';
import { createFakeTmcServer, SERVER_URL, TOKEN_URL } from '../fixtures/tmcServer';

export { ACCESS_TOKEN, CREDENTIALS } from '../fixtures/tmcServer';

/** Renders a page inside the same providers as app/layout.tsx. */
export function renderApp(page: ReactNode = <InventoryPage />) {
  return render(
    <AuthenticationGuard serverUrl={process.env.TMC_SERVER_URL} tokenUrl={process.env.TOKEN_URL}>
      <InventoryProvider>{page}</InventoryProvider>
    </AuthenticationGuard>,
  );
}

/** Model IDs of the rendered inventory cards, in order. */
export function cardTitles(): string[] {
  return Array.from(document.querySelectorAll('ul[role="list"] > li h3')).map(
    (heading) => heading.textContent ?? '',
  );
}

/** Waits for a filter checkbox; needed because author and manufacturer can share values. */
export async function findFilterOption(group: string, name: string) {
  return within(await screen.findByLabelText(`${group} options`)).getByRole('checkbox', { name });
}

/** Waits for the "Showing ..." line above the results. */
export function findSummary(text: string) {
  return screen.findByText(
    (_content, element) => element?.tagName === 'P' && element.textContent === text,
    {},
    { timeout: 4000 },
  );
}

export function manyItems(count: number): InventoryItem[] {
  return Array.from({ length: count }, (_, i) => {
    const mpn = `device-${String(i + 1).padStart(3, '0')}`;
    return {
      ...inventory[0],
      id: `omnicorp/omnicorp/${mpn}`,
      name: `omnicorp/omnicorp/${mpn}`,
      'schema:mpn': mpn,
    };
  });
}

/** Client mode: serves the bundled catalog files. */
export function stubCatalog(
  items: InventoryItem[] = inventory,
  thingModel: unknown = { title: 'Lightall', properties: { status: {} }, actions: { toggle: {} } },
) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const { pathname } = new URL(String(input), window.location.origin);
    if (pathname.endsWith('/.tmc/tm-catalog.toc.json')) return jsonResponse({ data: items });
    if (pathname.endsWith('/.tmc/protocols.txt')) return new Response('https\nmodbus\n');
    if (pathname.endsWith('.tm.json')) return jsonResponse(thingModel);
    return new Response('Not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Server mode: a fake TMC server (and token endpoint) behind fetch. */
export function stubTmcServer(options: Parameters<typeof createFakeTmcServer>[0] = {}) {
  vi.stubEnv('TMC_SERVER_URL', SERVER_URL);
  vi.stubEnv('API_BASE', SERVER_URL);
  if (options.requireAuth) vi.stubEnv('TOKEN_URL', TOKEN_URL);

  const server = createFakeTmcServer(options);
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body } = server.handle({
      url: new URL(String(input)),
      authorization: new Headers(init?.headers).get('Authorization'),
    });
    return typeof body === 'string'
      ? new Response(body, { status })
      : jsonResponse(body, { status });
  });
  vi.stubGlobal('fetch', fetchMock);

  return { ...server, fetchMock };
}
