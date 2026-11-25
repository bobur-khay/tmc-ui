import { defineConfig } from '@playwright/test';
import { createE2eConfig } from './config';

const PORT = '4173';
// A sub-path like on GitHub/GitLab Pages, so base path handling is covered.
const BASE_PATH = '/tmc-ui';

// Client mode: static export of the catalogs in public/catalog-repos/.
export default defineConfig(
  createE2eConfig('static', `http://127.0.0.1:${PORT}${BASE_PATH}/`, {
    command: 'pnpm run build && node tests/e2e/static-server.mjs',
    env: {
      IS_STATIC: 'true',
      BASE_PATH,
      E2E_PORT: PORT,
      // Empty values win over .env, which keeps the build in client mode
      TMC_SERVER_URL: '',
      VITE_SERVER_URL: '',
      TOKEN_URL: '',
      VITE_TOKEN_URL: '',
    },
  }),
);
