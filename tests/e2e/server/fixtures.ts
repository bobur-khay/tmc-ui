import { test as base, expect, type Page } from '@playwright/test';
import { createFakeTmcServer, CREDENTIALS, SERVER_URL, TOKEN_URL } from '../../fixtures/tmcServer';

type FakeTmcServer = ReturnType<typeof createFakeTmcServer>;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const test = base.extend<{ tmc: FakeTmcServer; pageErrors: Error[] }>({
  // The app talks to the TMC server from the browser, so the server is faked at the network layer.
  tmc: [
    async ({ context }, use) => {
      const server = createFakeTmcServer({ requireAuth: true });
      const origins = [SERVER_URL, new URL(TOKEN_URL).origin];

      await context.route(
        (url) => origins.includes(url.origin),
        async (route) => {
          const request = route.request();
          if (request.method() === 'OPTIONS') {
            await route.fulfill({ status: 204, headers: CORS_HEADERS });
            return;
          }
          const { status, body } = server.handle({
            url: new URL(request.url()),
            authorization: (await request.headerValue('authorization')) ?? null,
          });
          await route.fulfill({
            status,
            headers: CORS_HEADERS,
            contentType: typeof body === 'string' ? 'text/plain' : 'application/json',
            body: typeof body === 'string' ? body : JSON.stringify(body),
          });
        },
      );
      await use(server);
    },
    { auto: true },
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

export { expect, CREDENTIALS };

export const cards = (page: Page) => page.locator('ul[role="list"] > li');

export const summary = (page: Page) => page.getByText(/^Showing /);

export async function fillCredentials(
  page: Page,
  clientId = CREDENTIALS.clientId,
  clientSecret = CREDENTIALS.clientSecret,
) {
  await page.getByLabel('Client ID').fill(clientId);
  await page.getByLabel('Client Secret').fill(clientSecret);
}

export async function login(page: Page) {
  await page.goto('./');
  await fillCredentials(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(summary(page)).toHaveText('Showing all 3 TMs');
}
