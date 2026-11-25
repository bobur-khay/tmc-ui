import { ACCESS_TOKEN } from '../../fixtures/tmcServer';
import { cards, CREDENTIALS, expect, fillCredentials, login, summary, test } from './fixtures';

test.describe('authentication (server mode)', () => {
  test('blocks the app until credentials are entered', async ({ page, tmc }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { name: 'Enter API credentials' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Search inventory' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'API Authentication' })).toHaveCount(0);
    expect(tmc.requests).toHaveLength(0);
  });

  test('rejects wrong credentials', async ({ page, tmc }) => {
    await page.goto('./');

    await fillCredentials(page, CREDENTIALS.clientId, 'wrong');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('invalid_client')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enter API credentials' })).toBeVisible();
    expect(tmc.requests).toHaveLength(0);
  });

  test('logs in and authorizes every request', async ({ page, tmc }) => {
    await login(page);

    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'API Authentication' })).toBeVisible();
    expect(tmc.requests.length).toBeGreaterThan(0);
    expect(tmc.requests.map(({ authorization }) => authorization)).toEqual(
      tmc.requests.map(() => `Bearer ${ACCESS_TOKEN}`),
    );
  });

  test('stays logged in when the tab is reloaded', async ({ page, tmc }) => {
    await login(page);

    await page.reload();

    await expect(summary(page)).toHaveText('Showing all 3 TMs');
    await expect(page.getByRole('heading', { name: 'Enter API credentials' })).toHaveCount(0);
    expect(tmc.tokenRequests).toHaveLength(2);
  });

  test('does not share the session with a new tab', async ({ page, context }) => {
    await login(page);

    const otherTab = await context.newPage();
    await otherTab.goto('./');

    await expect(otherTab.getByRole('heading', { name: 'Enter API credentials' })).toBeVisible();
  });

  test('reloads the form with typed credentials without hydration errors', async ({ page }) => {
    await page.goto('./');
    await fillCredentials(page);
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();

    await page.reload();

    // Firefox restores form state on reload; the pageErrors fixture fails on a hydration mismatch.
    await expect(page.getByRole('heading', { name: 'Enter API credentials' })).toBeVisible();
    await expect(page.getByLabel('Client ID')).toBeEditable();
  });
});

test.describe('settings (server mode)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'API Authentication' }).click();
    await expect(page.getByRole('heading', { name: 'Update API credentials' })).toBeVisible();
  });

  test('shows the current credentials without pending changes', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByLabel('Client ID')).toHaveValue(CREDENTIALS.clientId);
    await expect(page.getByRole('button', { name: 'Save credentials' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });

  test('rejects invalid credentials and discards the change', async ({ page }) => {
    await page.getByLabel('Client Secret').fill('wrong');
    await page.getByRole('button', { name: 'Save credentials' }).click();

    await expect(page.getByText('invalid_client')).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);

    await page.getByRole('button', { name: 'Discard' }).click();

    await expect(page.getByLabel('Client Secret')).toHaveValue(CREDENTIALS.clientSecret);
    await expect(page.getByText('invalid_client')).toHaveCount(0);
  });

  test('has nothing to save after an edit is reverted', async ({ page, tmc }) => {
    await page.getByLabel('Client ID').fill('other');
    await expect(page.getByRole('button', { name: 'Save credentials' })).toBeEnabled();

    await page.getByLabel('Client ID').fill(CREDENTIALS.clientId);
    await expect(page.getByRole('button', { name: 'Save credentials' })).toBeDisabled();

    await page.getByRole('link', { name: 'Dashboard' }).click();

    await expect(summary(page)).toHaveText('Showing all 3 TMs');
    expect(tmc.tokenRequests).toHaveLength(1);
  });
});
