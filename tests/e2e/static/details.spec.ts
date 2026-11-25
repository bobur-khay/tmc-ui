import type { Page } from '@playwright/test';
import type { InventoryItem } from '@/app/_components/inventory/types';
import { encodeDetailsId } from '@/lib/utils/details';
import { cards, expect, openInventory, summary, test } from './fixtures';

const overviewValue = (page: Page, label: string) =>
  page.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd');

const detailsUrl = (item: InventoryItem, version = item.versions![0]) =>
  `details/${encodeDetailsId(`${version.repo || item.repo}/${version.tmID}`)}/`;

test.describe('details (client mode, static export)', () => {
  test('opens a Thing Model from the inventory and returns', async ({ page, catalog }) => {
    const item = catalog[0];
    await openInventory(page, catalog);

    await cards(page).first().getByRole('link').click();

    await expect(page).toHaveURL(/\/details\/[^/]+\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    await expect(overviewValue(page, 'Manufacturer')).toHaveText(
      item['schema:manufacturer']['schema:name'],
    );
    await expect(overviewValue(page, 'Author')).toHaveText(item['schema:author']['schema:name']);
    await expect(overviewValue(page, 'Manufacturer Part Number')).toHaveText(item['schema:mpn']);

    await page.getByRole('button', { name: 'Back to catalog' }).click();

    await expect(summary(page)).toHaveText(`Showing all ${catalog.length} TMs`);
    await expect(page).not.toHaveURL(/details/);
  });

  test('loads every pre-generated version through a direct link', async ({ page, catalog }) => {
    const item = catalog.find((entry) => (entry.versions?.length ?? 0) > 1) ?? catalog[0];

    for (const version of item.versions ?? []) {
      const response = await page.goto(detailsUrl(item, version));

      expect(response?.status(), version.tmID).toBe(200);
      await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
      await expect(overviewValue(page, 'Manufacturer Part Number')).toHaveText(item['schema:mpn']);
    }
  });

  test('switches between versions', async ({ page, catalog }) => {
    const item = catalog.find(
      (entry) => new Set(entry.versions?.map((version) => version.version.model)).size > 1,
    );
    test.skip(!item, 'needs a Thing Model with more than one version');
    const [current, other] = item!.versions!;
    await page.goto(detailsUrl(item!, current));

    await page.getByRole('button', { name: 'Current version' }).click();
    await page.getByRole('option', { name: other.version.model, exact: true }).click();

    // Client-side navigation does not append the trailing slash of the exported page
    const otherPath = detailsUrl(item!, other).replace(/\/$/, '');
    await expect(page).toHaveURL((url) => url.pathname.replace(/\/$/, '').endsWith(otherPath));
    await expect(page.getByRole('button', { name: 'Current version' })).toHaveText(
      other.version.model,
    );
  });

  test('shows the Thing Model JSON', async ({ page, catalog }) => {
    await page.goto(detailsUrl(catalog[0]));

    await page.getByRole('button', { name: 'Open TM JSON' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Full Thing Model')).toBeVisible();
    await expect(dialog.getByLabel('Thing Model JSON')).toContainText('"@context"');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('shares the link of the current version', async ({ page, catalog }) => {
    await page.goto(detailsUrl(catalog[0]));

    await page.getByRole('button', { name: 'Share' }).click();

    await expect(page.getByRole('dialog').locator('#share-link')).toHaveValue(page.url());
  });

  test('opens the image in fullscreen and closes it', async ({ page, catalog }) => {
    await page.goto(detailsUrl(catalog[0]));

    await page.getByRole('link', { name: /in fullscreen$/ }).click();

    await expect(page).toHaveURL(/\/image\/?$/);
    await expect(page.getByRole('img', { name: /^Product image of / })).toBeVisible();

    await page.getByRole('button', { name: 'Close image' }).click();

    await expect(page).not.toHaveURL(/\/image\/?$/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  });
});

test.describe('settings (client mode, static export)', () => {
  test('redirects to the inventory because authentication is disabled', async ({
    page,
    catalog,
    baseURL,
  }) => {
    await page.goto('settings/');

    await expect(page).toHaveURL(baseURL!);
    await expect(summary(page)).toHaveText(`Showing all ${catalog.length} TMs`);
  });
});
