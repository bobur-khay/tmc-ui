import { defineConfig } from '@playwright/test';
import { SERVER_URL, TOKEN_URL } from '../fixtures/tmcServer';
import { createE2eConfig } from './config';

const PORT = '4174';

// Server mode with authentication on the Next.js Node server; the TMC server is faked in the browser.
export default defineConfig(
  createE2eConfig('server', `http://127.0.0.1:${PORT}/`, {
    command: `pnpm run build && pnpm exec next start -p ${PORT}`,
    env: {
      IS_STATIC: 'false',
      BASE_PATH: '',
      TMC_SERVER_URL: SERVER_URL,
      TOKEN_URL,
      CREDENTIALS_SETUP_MESSAGE: '',
    },
  }),
);
