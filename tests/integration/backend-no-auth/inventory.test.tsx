import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PROTOCOLS } from '@/lib/utils/constants';
import {
  cardTitles,
  findFilterOption,
  findSummary,
  manyItems,
  renderApp,
  stubTmcServer,
} from '../harness';

const lastInventoryQuery = (server: ReturnType<typeof stubTmcServer>) =>
  Object.fromEntries(server.inventoryRequests().at(-1)!.url.searchParams);

describe('inventory page in server mode without authentication', () => {
  it('loads the first page from the TMC server without credentials', async () => {
    const server = stubTmcServer();
    renderApp();

    await findSummary('Showing all 3 TMs');

    expect(cardTitles()).toEqual(['lightall', 'lightall-mk2', 'senseall']);
    expect(screen.queryByRole('heading', { name: 'Enter API credentials' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'API Authentication' })).toBeNull();
    expect(lastInventoryQuery(server)).toEqual({ page: '1', pageSize: '20' });
    expect(server.tokenRequests).toHaveLength(0);
    expect(server.requests.every(({ authorization }) => authorization === null)).toBe(true);
  });

  it('loads the filter options from the server endpoints', async () => {
    const server = stubTmcServer();
    renderApp();

    expect(await screen.findByRole('checkbox', { name: 'omniuser' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'main' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'staging' })).toBeInTheDocument();
    for (const { value } of PROTOCOLS) {
      expect(screen.getByRole('checkbox', { name: value })).toBeInTheDocument();
    }
    expect(server.requests.map(({ url }) => url.pathname)).toEqual(
      expect.arrayContaining(['/authors', '/manufacturers', '/repos']),
    );
  });

  it('delegates filtering to the server', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await screen.findByRole('checkbox', { name: 'omniuser' }));

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['senseall']);
    expect(lastInventoryQuery(server)).toEqual({
      page: '1',
      pageSize: '20',
      'filter.author': 'omniuser',
    });
  });

  it('sends the repository filter', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await screen.findByRole('checkbox', { name: 'staging' }));
    await waitFor(() => expect(lastInventoryQuery(server).repo).toBe('staging'));
  });

  it('delegates searching to the server', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.type(screen.getByRole('textbox', { name: 'Search inventory' }), 'sense');

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['senseall']);
    expect(lastInventoryQuery(server)).toEqual({ page: '1', pageSize: '20', search: 'sense' });
  });

  it('intersects search and filter results in the browser', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await findFilterOption('author', 'omnicorp'));
    await findSummary('Showing 2 matching TMs from 3');
    await user.type(screen.getByRole('textbox', { name: 'Search inventory' }), 'mk2');

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['lightall-mk2']);
    const [filterQuery, searchQuery] = server
      .inventoryRequests()
      .slice(-2)
      .map(({ url }) => Object.fromEntries(url.searchParams));
    // Both result sets are fetched unpaginated so they can be intersected
    expect(filterQuery).toEqual({ 'filter.author': 'omnicorp' });
    expect(searchQuery).toEqual({ search: 'mk2' });
  });

  it('requests further pages from the server', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer({ items: manyItems(45) });
    renderApp();
    await findSummary('Showing all 45 TMs');
    expect(cardTitles()).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(cardTitles()[0]).toBe('device-021'));
    expect(lastInventoryQuery(server)).toEqual({ page: '2', pageSize: '20' });
    expect(window.location.search).toBe('?page=2');
  });

  it('shows an error when the server fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubTmcServer();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    );
    renderApp();

    expect(
      await screen.findByRole('heading', { name: "Couldn't load inventory" }),
    ).toBeInTheDocument();
  });
});
