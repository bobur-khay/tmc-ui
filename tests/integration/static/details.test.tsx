import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Details from '@/app/details/[id]/page';
import Settings from '@/app/settings/page';
import { buildDetailsPath, encodeDetailsId } from '@/lib/utils/details';
import { lightall, REPO } from '../../fixtures/inventory';
import { navigation, router } from '../../mocks/navigation';
import { renderApp, stubCatalog } from '../harness';

const [latest, archived] = lightall.versions!;
const latestId = `${REPO}/${latest.tmID}`;

function openDetails(id: string) {
  navigation.pathname = `/details/${encodeDetailsId(id)}`;
  navigation.params = { id: encodeDetailsId(id) };
  return renderApp(<Details />);
}

describe('details page in client mode', () => {
  it('shows the Thing Model overview and interactions', async () => {
    const fetchMock = stubCatalog();
    openDetails(latestId);

    expect(await screen.findByRole('heading', { level: 1, name: 'Lightall' })).toBeInTheDocument();
    const overview = screen.getByRole('heading', { name: 'Overview' }).parentElement!;
    const value = (label: string) =>
      within(overview).getByText(label).parentElement!.querySelector('dd')!.textContent;
    expect(value('Manufacturer')).toBe('omnicorp');
    expect(value('Author')).toBe('omnicorp');
    expect(value('Manufacturer Part Number')).toBe('lightall');
    expect(value('Latest version')).toBe('2.0.1');
    expect(value('Last changed')).toContain('2024');
    expect(screen.getByRole('button', { name: /Properties\s*1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Actions\s*1/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Events/ })).toBeNull();
    expect(
      fetchMock.mock.calls.some(([url]) => url === `/catalog-repos/${REPO}/${latest.tmID}`),
    ).toBe(true);
  });

  it('expands an interaction section', async () => {
    const user = userEvent.setup();
    stubCatalog();
    openDetails(latestId);

    await user.click(await screen.findByRole('button', { name: /Properties/ }));

    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('switches to another version', async () => {
    const user = userEvent.setup();
    stubCatalog();
    openDetails(latestId);

    await user.click(await screen.findByRole('button', { name: 'Current version' }));
    await user.click(screen.getByRole('button', { name: '1.0.0' }));

    expect(router.replace).toHaveBeenCalledWith(buildDetailsPath(`${REPO}/${archived.tmID}`));
  });

  it('navigates back to the catalog', async () => {
    const user = userEvent.setup();
    stubCatalog();
    openDetails(latestId);

    await user.click(await screen.findByRole('button', { name: 'Back to catalog' }));

    expect(router.push).toHaveBeenCalledWith('/', { scroll: false });
  });

  it('opens the Thing Model JSON', async () => {
    const user = userEvent.setup();
    stubCatalog();
    openDetails(latestId);

    await user.click(await screen.findByRole('button', { name: 'Open TM JSON' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Full Thing Model')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Thing Model JSON')).toHaveTextContent(
      '"title": "Lightall"',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Close full details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shares the current URL', async () => {
    const user = userEvent.setup();
    stubCatalog();
    openDetails(latestId);

    await user.click(await screen.findByRole('button', { name: 'Share' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByDisplayValue(window.location.href)).toBeInTheDocument();
  });

  it('reports an unknown Thing Model', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    stubCatalog();
    openDetails(`${REPO}/unknown/v1.0.0.tm.json`);

    expect(await screen.findByText('Thing Model not found.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(router.push).toHaveBeenCalledWith('/', { scroll: false });
  });
});

describe('settings page in client mode', () => {
  it('redirects to the inventory because authentication is disabled', async () => {
    stubCatalog();
    navigation.pathname = '/settings';
    renderApp(<Settings />);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
  });
});
