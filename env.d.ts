declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_BASE?: string;
    readonly APP_REPO_URL?: string;
    readonly CATALOGS_URL?: string;
    readonly CATALOG_REPO_URL?: string;
    readonly CLIENT_ID?: string;
    readonly CLIENT_SECRET?: string;
    readonly CREDENTIALS_SETUP_MESSAGE?: string;
    readonly EDITDOR_URL?: string;
    readonly LOCAL?: 'true' | 'false';
    readonly PLAYGROUND_URL?: string;
    readonly TMC_SERVER_URL?: string;
    readonly TOKEN_URL?: string;
  }
}
