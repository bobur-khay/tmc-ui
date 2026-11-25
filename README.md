# TMC UI

Web interface for browsing W3C Web of Things **Thing Models (TMs)** managed by a [Thing Model Catalog (TMC)](https://github.com/wot-oss/tmc). It can run against a live TMC server or entirely from catalog files bundled with the app.

## Features

- **Inventory** (`/`): grid or list view of the inventory with search and filters.
- **Details** (`/details/[id]`): overview of the TM content, version control and sharing.
- **API authentication** (`/settings`): OAuth2 client-credentials login when a token endpoint is configured.
- **Light/dark theme**; theme, view and page size are remembered in `localStorage`.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Headless UI, Heroicons, Prism.js. Requires Node.js >= 22.20.0 and pnpm 12.18.0.

## Deployment modes

Three independent switches, all set through environment variables, define how the app behaves:

| Switch           | Unset                                       | Set                                                |
| ---------------- | ------------------------------------------- | -------------------------------------------------- |
| `IS_STATIC`      | Next.js Node server (`next start`)          | Static export to `out/` (any static host)          |
| `TMC_SERVER_URL` | **Client mode**: data from bundled catalogs | **Server mode**: data from the TMC server REST API |
| `TOKEN_URL`      | No authentication                           | Authentication enabled (server mode only)          |

<a href="public/deployment-type.svg" target="_blank"><img src="public/deployment-type.svg" alt="Deployment type selection" width="200"></a>

_Click the diagram to open it full size._

### Client mode (no `TMC_SERVER_URL`)

- Catalogs are downloaded into `public/catalog-repos/` and served as static files.
- The browser loads the merged index `public/catalog-repos/.tmc/tm-catalog.toc.json` once. Search, filters and pagination run client-side on top of it.
- Filter options come from the `.txt` lists in `.tmc/` (e.g. `tmnames.txt`, `manufacturers.txt`).
- Authentication is never active in this mode.

### Server mode (`TMC_SERVER_URL` set)

- Search, filters and pagination are delegated to the TMC server. When search and filters are combined, both results are fetched and intersected in the browser.
- Endpoints used: `GET /inventory` (`page`, `pageSize`, `search`, `repo`, `filter.author`, `filter.manufacturer`, `filter.protocol`, `filter.changedSince`), `/inventory/.tmName/{tmName}`, `/thing-models/{id}`, `/authors`, `/manufacturers`, `/repos`.
- In development, requests go through a same-origin proxy (`/__tmc_api__`). In production the browser calls `TMC_SERVER_URL` directly, so the server must allow CORS for the UI origin.

### Authentication (`TMC_SERVER_URL` and `TOKEN_URL` set)

- `AuthenticationGuard` blocks the app with a credentials form until a token is obtained.
- Client ID and secret are exchanged at `TOKEN_URL` using the OAuth2 `client_credentials` grant (HTTP Basic). The token is sent as `Authorization: Bearer ...` and refreshed on expiry.
- Credentials are kept in `sessionStorage` (per browser tab) and can be changed under **API Authentication** (`/settings`).
- The token endpoint is called from the browser and must allow CORS.

### Static export (`IS_STATIC=true`)

- `next build` writes a fully static site to `out/` (trailing slashes, unoptimized images).
- Detail pages are pre-generated for every TM version known at build time: from the local merged index in client mode, or from the TMC server in server mode. New TMs need a rebuild to get a detail page.
- With authentication enabled, the build needs `CLIENT_ID` and `CLIENT_SECRET` to read the inventory. They are used only at build time; users still log in through the form at runtime.
- Detail IDs in URLs are base64url-encoded (URI-encoded in non-static builds).

## Environment variables

Read from `.env` (see `.env.example`) at **build time** and inlined into the bundle: changing them requires a rebuild. Everything except `CLIENT_ID`/`CLIENT_SECRET` is public. Do not put secrets in the other variables.

| Variable                     | Description                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `TMC_SERVER_URL`             | Base URL of the TMC server. Enables server mode; client mode when unset.                            |
| `TOKEN_URL`                  | OAuth2 token endpoint. Enables authentication in server mode.                                       |
| `IS_STATIC`                  | `true` builds a static export.                                                                      |
| `BASE_PATH`                  | Sub-path the app is served from (e.g. `/tmc-ui`).                                                   |
| `CATALOG_REPO_URLS`          | Comma-separated catalog sources for `pnpm catalogs:download` (Git or S3 URLs).                      |
| `CLIENT_ID`, `CLIENT_SECRET` | Build-time credentials for static export with authentication.                                       |
| `CREDENTIALS_SETUP_MESSAGE`  | Help text shown on the credentials form. Defaults to a generic message.                             |
| `EDITDOR_URL`                | EdiTDor instance for "Open with". Default: `https://eclipse-editdor.github.io/editdor/`.            |
| `PLAYGROUND_URL`             | TD Playground instance for "Open with". Default: `https://playground.thingweb.io/`.                 |
| `DEBUG`                      | `true` enables verbose console logging.                                                             |
| `API_BASE`                   | Derived, not set manually: `/__tmc_api__` in development with a server, otherwise `TMC_SERVER_URL`. |

Legacy names are still accepted: `VITE_SERVER_URL`, `VITE_TOKEN_URL`, `VITE_EDITDOR_URL`, `VITE_PLAYGROUND_URL`, `VITE_SETUP_CREDENTIALS_MESSAGE`, `CATALOG_REPO_URL`.

## Getting started

```sh
pnpm install
cp .env.example .env   # then adjust, see below
```

| Goal                  | `.env`                                                             | Commands                                  |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Client mode           | `CATALOG_REPO_URLS=https://github.com/wot-oss/example-catalog.git` | `pnpm catalogs:download` then `pnpm dev`  |
| Server mode           | `TMC_SERVER_URL=http://localhost:8080`                             | `pnpm dev`                                |
| Server mode with auth | additionally `TOKEN_URL=...`                                       | `pnpm dev`                                |
| Production (Node)     | any of the above                                                   | `pnpm build` then `pnpm start`            |
| Production (static)   | additionally `IS_STATIC=true`                                      | `pnpm build`, then host the `out/` folder |

The dev server runs on <http://localhost:5173>, `pnpm start` on <http://localhost:3000>.

### Downloading catalogs

`pnpm catalogs:download` (`ci-cd/catalog-for-ui.ts`) synchronizes `public/catalog-repos/` with `CATALOG_REPO_URLS`:

1. Removes catalog folders that are no longer configured.
2. Clones missing catalogs (`git clone --depth 1`) or updates existing ones (`git pull --ff-only`); S3 sources (`s3://bucket/prefix` or S3 HTTPS URLs) use `aws s3 sync`.
3. Merges every catalog's `.tmc/` metadata into `public/catalog-repos/.tmc/`, tagging each TM with its repository so it can be filtered.

Each catalog lands in `<name>-<hash>/` and must contain `.tmc/tm-catalog.toc.json`. A token for private repositories can be passed with `pnpm catalogs:download --token <token>` or `CI_JOB_TOKEN`.

### Building the UI from a catalog

`ci-cd/ui-for-catalog.ts` is the reverse of the downloader: it is run from the root of a catalog repository and builds a UI for that catalog. It only uses Node.js built-ins, so the single file can be copied or downloaded into the catalog. It requires Git, pnpm and Node.js >= 22.20.0.

```sh
node --experimental-strip-types ui-for-catalog.ts
```

1. Clones tmc-ui into `<catalog>/tmc-ui` (`git clone --depth 1`), or updates an existing clone (`git pull --ff-only`).
2. Replaces the content of `tmc-ui/public/catalog-repos/` with a copy of the catalog in `<catalog folder name>/`, skipping `tmc-ui`, `.git` and `node_modules`.
3. Builds the merged index in `tmc-ui/public/catalog-repos/.tmc/`.
4. Runs `pnpm install --frozen-lockfile` and `pnpm run build` in the clone.

The catalog must contain `.tmc/tm-catalog.toc.json`. Add `tmc-ui/` to the catalog's `.gitignore` so the clone is not committed.

| Variable          | Description                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| `TMC_UI_REPO_URL` | Git URL of the tmc-ui repository to clone. Default: `https://github.com/wot-oss/tmc-ui.git`. |
| `TMC_UI_REF`      | Branch or tag to clone. Default: the repository's default branch. Ignored when the clone already exists. |
| `IS_STATIC`       | Defaults to `true` in this script, so the build is a static export in `tmc-ui/out/`. Set to `false` for a Node server build. |

These are read from the shell environment, not from `.env`. The other [environment variables](#environment-variables), such as `BASE_PATH`, are passed through to the build; leave `TMC_SERVER_URL` unset so the UI runs in client mode.

## Scripts

| Script                              | Purpose                            |
| ----------------------------------- | ---------------------------------- |
| `pnpm dev`                          | Development server on port 5173    |
| `pnpm build` / `pnpm start`         | Production build / serve           |
| `pnpm catalogs:download`            | Download and merge catalogs        |
| `ci-cd/ui-for-catalog.ts`           | Build the UI from inside a catalog |
| `pnpm format` / `pnpm format:check` | Prettier write / check             |
| `pnpm test`, `pnpm test:coverage`   | Vitest                             |
| `pnpm clean`                        | Reinstall dependencies and rebuild |

## Project structure

```
app/                    Routes and UI (App Router)
  page.tsx              Inventory page
  details/[id]/         Details page of a TM
  settings/             API credentials page
  _components/          React.js components
lib/
  services/             apiData (TMC server), localData (bundled catalogs), auth (token)
  hooks/                Inventory state: data controls, filters, search, pagination
  utils/                Constants, storage, ID encoding, debug
ci-cd/                  Catalog downloader (catalog-for-ui) and UI builder for catalogs (ui-for-catalog)
public/catalog-repos/   Downloaded catalogs and merged .tmc index (client mode)
next.config.ts          Env mapping, static export, dev API proxy
```

State is provided by two contexts in `app/layout.tsx`: `AuthenticationGuard` (token, credentials) wrapping `InventoryProvider` (inventory, filters, search, pagination).

## CI/CD

GitHub Actions in `.github/workflows/`:

- `deploy-gh-pages.yml`: static build (`IS_STATIC=true`) deployed to GitHub Pages. Configured through repository variables `TMC_SERVER_URL`, `TOKEN_URL`, `CATALOG_REPO_URLS`; catalogs are downloaded when no server is set.
- `code-format.yml`: Prettier check on pull requests.
- `integration-tests.yml`: currently disabled.

## License

[Apache-2.0](LICENSE)
