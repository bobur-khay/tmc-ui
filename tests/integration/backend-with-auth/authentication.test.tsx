import { screen, waitFor } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Settings from '@/app/settings/page';
import { CLIENT_ID_SESSION_KEY, CLIENT_SECRET_SESSION_KEY } from '@/lib/utils/constants';
import { router } from '../../mocks/navigation';
import {
  ACCESS_TOKEN,
  cardTitles,
  CREDENTIALS,
  findSummary,
  renderApp,
  stubTmcServer,
} from '../harness';

async function fillCredentials(user: UserEvent, clientId: string, clientSecret: string) {
  const clientIdInput = await screen.findByLabelText('Client ID');
  // The inputs are read-only for a moment to block browser autofill
  await waitFor(() => expect(clientIdInput).not.toHaveAttribute('readonly'));
  await user.clear(clientIdInput);
  await user.type(clientIdInput, clientId);
  await user.clear(screen.getByLabelText('Client Secret'));
  await user.type(screen.getByLabelText('Client Secret'), clientSecret);
}

function storeCredentials(clientSecret = CREDENTIALS.clientSecret) {
  sessionStorage.setItem(CLIENT_ID_SESSION_KEY, CREDENTIALS.clientId);
  sessionStorage.setItem(CLIENT_SECRET_SESSION_KEY, clientSecret);
}

describe('server mode with authentication', () => {
  it('blocks the app with the credentials form', async () => {
    const server = stubTmcServer({ requireAuth: true });
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Enter API credentials' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    expect(screen.queryByRole('textbox', { name: 'Search inventory' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'API Authentication' })).toBeNull();
    expect(server.requests).toHaveLength(0);
  });

  it('rejects wrong credentials', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer({ requireAuth: true });
    renderApp();

    await fillCredentials(user, CREDENTIALS.clientId, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('invalid_client')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enter API credentials' })).toBeInTheDocument();
    expect(sessionStorage.getItem(CLIENT_SECRET_SESSION_KEY)).toBeNull();
    expect(server.requests).toHaveLength(0);
  });

  it('logs in and sends the bearer token with every request', async () => {
    const user = userEvent.setup();
    const server = stubTmcServer({ requireAuth: true });
    renderApp();

    await fillCredentials(user, CREDENTIALS.clientId, CREDENTIALS.clientSecret);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await findSummary('Showing all 3 TMs');
    expect(cardTitles()).toEqual(['lightall', 'lightall-mk2', 'senseall']);
    expect(await screen.findByRole('checkbox', { name: 'omniuser' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API Authentication' })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(server.requests.length).toBeGreaterThan(0);
    expect(
      server.requests.every(({ authorization }) => authorization === `Bearer ${ACCESS_TOKEN}`),
    ).toBe(true);
    expect(sessionStorage.getItem(CLIENT_ID_SESSION_KEY)).toBe(CREDENTIALS.clientId);
    expect(sessionStorage.getItem(CLIENT_SECRET_SESSION_KEY)).toBe(CREDENTIALS.clientSecret);
  });

  it('logs in automatically with the credentials stored for the tab', async () => {
    storeCredentials();
    const server = stubTmcServer({ requireAuth: true });
    renderApp();

    await findSummary('Showing all 3 TMs');

    expect(screen.queryByRole('heading', { name: 'Enter API credentials' })).toBeNull();
    expect(server.tokenRequests).toHaveLength(1);
  });

  it('asks again when the stored credentials are no longer valid', async () => {
    storeCredentials('revoked');
    const server = stubTmcServer({ requireAuth: true });
    renderApp();

    expect(await screen.findByText('invalid_client', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Enter API credentials' })).toBeInTheDocument();
    expect(sessionStorage.getItem(CLIENT_ID_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(CLIENT_SECRET_SESSION_KEY)).toBeNull();
    expect(server.requests).toHaveLength(0);
  });
});

describe('settings page with authentication', () => {
  async function openSettings() {
    storeCredentials();
    const server = stubTmcServer({ requireAuth: true });
    renderApp(<Settings />);
    await screen.findByRole('heading', { name: 'Update API credentials' }, { timeout: 4000 });
    return server;
  }

  it('keeps the actions disabled until the credentials change', async () => {
    await openSettings();

    expect(screen.getByRole('button', { name: 'Save credentials' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('keeps the current credentials when the new ones are rejected', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    await openSettings();

    await fillCredentials(user, CREDENTIALS.clientId, 'wrong');
    await user.click(screen.getByRole('button', { name: 'Save credentials' }));

    expect(await screen.findByText('invalid_client')).toBeInTheDocument();
    expect(sessionStorage.getItem(CLIENT_SECRET_SESSION_KEY)).toBe(CREDENTIALS.clientSecret);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('discards unsaved changes', async () => {
    const user = userEvent.setup();
    await openSettings();

    await fillCredentials(user, 'other', 'other');
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByLabelText('Client ID')).toHaveValue(CREDENTIALS.clientId);
    expect(screen.getByRole('button', { name: 'Save credentials' })).toBeDisabled();
  });
});
