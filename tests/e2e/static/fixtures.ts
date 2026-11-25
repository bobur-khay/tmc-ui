import { test as base, expect, type Page } from '@playwright/test';
import type { InventoryItem } from '@/app/_components/inventory/types';

interface TestFixtures {
  pageErrors: Error[];
}

interface WorkerFixtures {
  /** The merged catalog index the app under test was built with. */
  catalog: InventoryItem[];
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  catalog: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      const response = await request.get('catalog-repos/.tmc/tm-catalog.toc.json');
      expect(response.ok(), 'the build must bundle a catalog (pnpm catalogs-for-ui)').toBe(true);
      const { data } = (await response.json()) as { data: InventoryItem[] };
      expect(data.length, 'the bundled catalog must not be empty').toBeGreaterThan(0);
      await use(data);
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  // Every test also fails on uncaught exceptions, which includes hydration errors.
  pageErrors: [
    async ({ page }, use) => {
      const errors: Error[] = [];
      page.on('pageerror', (error) => errors.push(error));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const cards = (page: Page) => page.locator('ul[role="list"] > li');

export const summary = (page: Page) => page.getByText(/^Showing /);

export const author = (item: InventoryItem) => item['schema:author']['schema:name'];

export const exactly = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

export async function openInventory(page: Page, catalog: InventoryItem[], query = '') {
  await page.goto(`./${query}`);
  if (!query) await expect(summary(page)).toHaveText(`Showing all ${catalog.length} TMs`);
}
