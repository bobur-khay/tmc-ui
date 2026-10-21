import type { NextConfig } from 'next';

const TMC_SERVER_URL = process.env.TMC_SERVER_URL ?? process.env.VITE_SERVER_URL;
const BASE_PATH = process.env.BASE_PATH;
const useApiProxy =
  process.env.NODE_ENV === 'development' && !!TMC_SERVER_URL && process.env.IS_STATIC !== 'true';
const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  /*
  IMPORTANT:
  The env vars defined here become public and you should not define secrets here.

  Some vars have been renamed and backwards compatibility is provided
  */
  output: process.env.IS_STATIC === 'true' ? 'export' : undefined,
  env: {
    BASE_PATH,
    TMC_SERVER_URL,
    IS_STATIC: process.env.IS_STATIC,
    TOKEN_URL: process.env.TOKEN_URL ?? process.env.VITE_TOKEN_URL,
    EDITDOR_URL: process.env.EDITDOR_URL ?? process.env.VITE_EDITDOR_URL,
    PLAYGROUND_URL: process.env.PLAYGROUND_URL ?? process.env.VITE_PLAYGROUND_URL,
    CREDENTIALS_SETUP_MESSAGE:
      process.env.CREDENTIALS_SETUP_MESSAGE ?? process.env.VITE_SETUP_CREDENTIALS_MESSAGE,
    API_HOST: process.env.API_HOST ?? process.env.VITE_API_HOST,
    API_PORT: process.env.API_PORT ?? process.env.VITE_API_PORT,
    API_PROTOCOL: process.env.API_PROTOCOL ?? process.env.VITE_API_PROTOCOL,
    API_BASE: useApiProxy ? '/__tmc_api__' : TMC_SERVER_URL || '/',
  },

  async rewrites() {
    return useApiProxy
      ? [
          {
            source: '/__tmc_api__/:path*',
            destination: `${TMC_SERVER_URL.replace(/\/+$/, '')}/:path*`,
          },
        ]
      : [];
  },
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
