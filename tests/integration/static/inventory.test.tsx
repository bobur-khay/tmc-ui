import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { INVENTORY_PAGE_SIZE_KEY, INVENTORY_VIEW_KEY } from '@/lib/utils/constants';
import { inventory, jsonResponse } from '../../fixtures/inventory';
import {
  cardTitles,
  findFilterOption,
  findSummary,
  manyItems,
  renderApp,
  stubCatalog,
} from '../harness';

describe('inventory page in client mode', () => {
  it('loads the bundled catalog without authentication', async () => {
    const fetchMock = stubCatalog();
    renderApp();

    await findSummary('Showing all 3 TMs');

    expect(cardTitles()).toEqual(['lightall', 'lightall-mk2', 'senseall']);
    expect(screen.queryByRole('heading', { name: 'Enter API credentials' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'API Authentication' })).toBeNull();
    expect(fetchMock.mock.calls.every(([url]) => String(url).includes('/catalog-repos/'))).toBe(
      true,
    );
  });

  it('builds the filter options from the catalog', async () => {
    stubCatalog();
    renderApp();

    expect(await screen.findByRole('checkbox', { name: 'omniuser' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'modbus' })).toBeInTheDocument();
    expect(screen.getByLabelText('author options')).toBeInTheDocument();
    // A single repository offers nothing to filter by
    expect(screen.queryByLabelText('repository options')).toBeNull();
  });

  it('filters by author and mirrors the filter in the URL', async () => {
    const user = userEvent.setup();
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await screen.findByRole('checkbox', { name: 'omniuser' }));

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['senseall']);
    expect(screen.getByRole('checkbox', { name: 'omniuser' })).toBeChecked();
    expect(window.location.search).toBe('?author=omniuser');
  });

  it('combines filters of different groups', async () => {
    const user = userEvent.setup();
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await findFilterOption('author', 'omnicorp'));
    await findSummary('Showing 2 matching TMs from 3');
    await user.click(screen.getByRole('checkbox', { name: 'https' }));

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['lightall']);
  });

  it('searches after the debounce and mirrors the query in the URL', async () => {
    const user = userEvent.setup();
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.type(screen.getByRole('textbox', { name: 'Search inventory' }), 'multi sensor');

    await findSummary('Showing 1 matching TM from 3');
    expect(cardTitles()).toEqual(['senseall']);
    expect(window.location.search).toBe('?search=multi+sensor');
  });

  it('reports when nothing matches and recovers with a filter reset', async () => {
    const user = userEvent.setup();
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(await screen.findByRole('checkbox', { name: 'omniuser' }));
    await user.click(screen.getByRole('checkbox', { name: 'modbus' }));

    expect(await screen.findByRole('heading', { name: 'Nothing found' })).toBeInTheDocument();
    expect(screen.getByText('No items match these filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    await findSummary('Showing all 3 TMs');
    expect(screen.getByRole('checkbox', { name: 'omniuser' })).not.toBeChecked();
    expect(window.location.search).toBe('');
  });

  it('restores search and filters from the URL', async () => {
    window.history.replaceState(null, '', '/?search=light&author=omnicorp');
    stubCatalog();
    renderApp();

    await findSummary('Showing 2 matching TMs from 3');

    expect(cardTitles()).toEqual(['lightall', 'lightall-mk2']);
    expect(screen.getByRole('textbox', { name: 'Search inventory' })).toHaveValue('light');
    await waitFor(async () => expect(await findFilterOption('author', 'omnicorp')).toBeChecked());
    expect(await findFilterOption('manufacturer', 'omnicorp')).not.toBeChecked();
  });

  it('paginates client-side', async () => {
    const user = userEvent.setup();
    stubCatalog(manyItems(45));
    renderApp();
    await findSummary('Showing all 45 TMs');
    expect(cardTitles()).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(cardTitles()[0]).toBe('device-021'));
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(window.location.search).toBe('?page=2');

    await user.click(screen.getByRole('button', { name: 'Go to last page' }));
    await waitFor(() => expect(cardTitles()).toHaveLength(5));
  });

  it('changes and remembers the page size', async () => {
    const user = userEvent.setup();
    stubCatalog(manyItems(45));
    renderApp();
    await findSummary('Showing all 45 TMs');

    await user.click(screen.getByRole('button', { name: 'TMs per page' }));
    await user.click(screen.getByRole('button', { name: '10' }));

    await waitFor(() => expect(cardTitles()).toHaveLength(10));
    expect(localStorage.getItem(INVENTORY_PAGE_SIZE_KEY)).toBe('10');
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
  });

  it('restores the stored page size and view', async () => {
    localStorage.setItem(INVENTORY_PAGE_SIZE_KEY, '10');
    localStorage.setItem(INVENTORY_VIEW_KEY, 'list');
    stubCatalog(manyItems(45));
    renderApp();

    await findSummary('Showing all 45 TMs');

    expect(cardTitles()).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('switches between grid and list view', async () => {
    const user = userEvent.setup();
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(localStorage.getItem(INVENTORY_VIEW_KEY)).toBe('list');
  });

  it('links every card to the details of its latest version', async () => {
    stubCatalog();
    renderApp();
    await findSummary('Showing all 3 TMs');

    const link = document.querySelector('ul[role="list"] > li a');

    expect(link).toHaveAttribute(
      'href',
      '/details/example-catalog-a32da3c49684~omnicorp~omnicorp~lightall~v2.0.1-20241008124326-8c75753996b3.tm.json',
    );
  });

  it('shows an error when the catalog cannot be loaded and retries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    let isCatalogAvailable = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        isCatalogAvailable
          ? jsonResponse({ data: inventory })
          : new Response('unavailable', { status: 503 }),
      ),
    );
    renderApp();

    expect(
      await screen.findByRole('heading', { name: "Couldn't load inventory" }),
    ).toBeInTheDocument();
    expect(screen.getByText("That didn't work. Please try again.")).toBeInTheDocument();

    isCatalogAvailable = true;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await findSummary('Showing all 3 TMs');
  });
});
