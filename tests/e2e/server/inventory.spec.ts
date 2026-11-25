import { ACCESS_TOKEN } from '../../fixtures/tmcServer';
import { cards, expect, login, summary, test } from './fixtures';

test.describe('inventory (server mode)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('requests the first page from the TMC server', async ({ page, tmc }) => {
    await expect(cards(page).getByRole('heading')).toHaveText([
      'lightall',
      'lightall-mk2',
      'senseall',
    ]);
    expect(Object.fromEntries(tmc.inventoryRequests()[0].url.searchParams)).toEqual({
      page: '1',
      pageSize: '20',
    });
  });

  test('loads the filter options from the TMC server', async ({ page }) => {
    await expect(page.getByLabel('repository options').getByRole('checkbox')).toHaveCount(2);
    await expect(page.getByLabel('author options').getByLabel('omniuser')).toBeVisible();
    await expect(page.getByLabel('protocol options').getByLabel('mqtt')).toBeVisible();
  });

  test('delegates filtering to the TMC server', async ({ page, tmc }) => {
    await page.getByLabel('author options').getByRole('checkbox', { name: 'omniuser' }).check();

    await expect(summary(page)).toHaveText('Showing 1 matching TM from 3');
    await expect(cards(page).getByRole('heading')).toHaveText(['senseall']);
    expect(tmc.inventoryRequests().at(-1)!.url.searchParams.get('filter.author')).toBe('omniuser');
  });

  test('delegates searching to the TMC server', async ({ page, tmc }) => {
    await page.getByRole('textbox', { name: 'Search inventory' }).fill('mk2');

    await expect(summary(page)).toHaveText('Showing 1 matching TM from 3');
    await expect(cards(page).getByRole('heading')).toHaveText(['lightall-mk2']);
    expect(tmc.inventoryRequests().at(-1)!.url.searchParams.get('search')).toBe('mk2');
  });

  test('opens a Thing Model from the TMC server and returns', async ({ page, tmc }) => {
    await cards(page).first().getByRole('link').click();

    await expect(page.getByRole('heading', { level: 1, name: 'Lightall' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Properties/ })).toBeVisible();
    const thingModelRequest = tmc.requests.find(({ url }) =>
      url.pathname.startsWith('/thing-models/'),
    );
    expect(thingModelRequest?.authorization).toBe(`Bearer ${ACCESS_TOKEN}`);

    await page.getByRole('button', { name: 'Back to catalog' }).click();

    await expect(summary(page)).toHaveText('Showing all 3 TMs');
  });
});
