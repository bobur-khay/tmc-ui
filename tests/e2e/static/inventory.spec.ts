import { author, cards, exactly, expect, openInventory, summary, test } from './fixtures';

const DEFAULT_PAGE_SIZE = 20;

test.describe('inventory (client mode, static export)', () => {
  test('lists the bundled catalog', async ({ page, catalog }) => {
    await openInventory(page, catalog);

    await expect(cards(page)).toHaveCount(Math.min(catalog.length, DEFAULT_PAGE_SIZE));
    await expect(cards(page).first().getByRole('heading')).toHaveText(catalog[0]['schema:mpn']);
    await expect(page.getByRole('heading', { name: 'Enter API credentials' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'API Authentication' })).toHaveCount(0);
  });

  test('searches and clears the search', async ({ page, catalog }) => {
    const query = catalog[0]['schema:mpn'];
    await openInventory(page, catalog);

    await page.getByRole('textbox', { name: 'Search inventory' }).fill(query);

    await expect(summary(page)).toHaveText(
      new RegExp(`^Showing \\d+ matching TMs? from ${catalog.length}$`),
    );
    await expect(
      cards(page)
        .getByRole('heading', { name: exactly(query) })
        .first(),
    ).toBeVisible();
    await expect(page).toHaveURL(/[?&]search=/);

    await page.getByRole('button', { name: 'Clear search' }).click();

    await expect(summary(page)).toHaveText(`Showing all ${catalog.length} TMs`);
    await expect(page).not.toHaveURL(/search=/);
  });

  test('filters by author, keeps the filter on reload and resets it', async ({ page, catalog }) => {
    const name = author(catalog[0]);
    const matching = catalog.filter(
      (item) => author(item).toLowerCase() === name.toLowerCase(),
    ).length;
    const filtered = `Showing ${matching} matching TM${matching === 1 ? '' : 's'} from ${catalog.length}`;
    const option = page.getByLabel('author options').getByRole('checkbox', { name: exactly(name) });
    await openInventory(page, catalog);

    await option.check();

    await expect(summary(page)).toHaveText(filtered);
    await expect(cards(page)).toHaveCount(Math.min(matching, DEFAULT_PAGE_SIZE));
    await expect(page).toHaveURL(/[?&]author=/);

    await page.reload();

    await expect(summary(page)).toHaveText(filtered);
    await expect(option).toBeChecked();

    await page.getByRole('button', { name: 'Reset filters' }).click();

    await expect(summary(page)).toHaveText(`Showing all ${catalog.length} TMs`);
    await expect(option).not.toBeChecked();
    await expect(page).not.toHaveURL(/author=/);
  });

  test('reports when nothing matches', async ({ page, catalog }) => {
    await openInventory(page, catalog, '?search=no-thing-model-is-named-like-this');

    await expect(page.getByRole('heading', { name: 'Nothing found' })).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test('paginates and remembers the page size', async ({ page, catalog }) => {
    test.skip(catalog.length <= 10, 'needs a catalog with more than 10 Thing Models');
    await openInventory(page, catalog);

    await page.getByRole('button', { name: 'TMs per page' }).click();
    await page.getByRole('option', { name: '10', exact: true }).click();
    await expect(cards(page)).toHaveCount(10);

    await page.getByRole('button', { name: 'Next page' }).click();

    await expect(cards(page)).toHaveCount(Math.min(10, catalog.length - 10));
    await expect(cards(page).first().getByRole('heading')).toHaveText(catalog[10]['schema:mpn']);
    await expect(page).toHaveURL(/[?&]page=2/);

    await page.reload();

    await expect(page.getByRole('button', { name: 'TMs per page' })).toHaveText('10');
    await expect(page.getByRole('button', { name: '2', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(cards(page).first().getByRole('heading')).toHaveText(catalog[10]['schema:mpn']);
  });

  test('remembers the list view', async ({ page, catalog }) => {
    await openInventory(page, catalog);
    const listView = page.getByRole('button', { name: 'List view' });
    await expect(listView).toHaveAttribute('aria-pressed', 'false');

    await listView.click();
    await expect(listView).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(listView).toHaveAttribute('aria-pressed', 'true');
  });

  test('remembers the theme', async ({ page, catalog }) => {
    await openInventory(page, catalog);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('collapses the filters on narrow screens', async ({ page, catalog }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openInventory(page, catalog);
    const filters = page.getByRole('heading', { name: 'Filters' });

    await expect(filters).toBeHidden();
    await expect(page.getByRole('button', { name: 'List view' })).toBeHidden();

    await page.getByRole('button', { name: 'Show filters' }).click();

    await expect(filters).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide filters' })).toBeVisible();
  });

  test('loads every card image on the first attempt', async ({ page, catalog }) => {
    await openInventory(page, catalog);

    // Covers base path handling: a wrong prefix ends in retries (`_retry`) or a broken image
    await expect
      .poll(() =>
        cards(page)
          .getByRole('img')
          .evaluateAll((images) =>
            (images as HTMLImageElement[])
              .filter((image) => !image.complete || image.naturalWidth === 0)
              .map((image) => image.src),
          ),
      )
      .toEqual([]);
    const sources = await cards(page)
      .getByRole('img')
      .evaluateAll((images) => (images as HTMLImageElement[]).map((image) => image.src));
    expect(sources.filter((source) => source.includes('_retry='))).toEqual([]);
  });
});
