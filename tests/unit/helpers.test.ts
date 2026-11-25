import { describe, expect, it, vi } from 'vitest';
import { normalizeAuthor } from '@/app/_components/sidebar/utils';
import { buildItemImageSrc } from '@/app/_components/inventory/InventoryResults';
import type { Attachment } from '@/app/_components/inventory/types';
import { isAuthenticationEnabled } from '@/lib/services/auth';
import { buildLocalCatalogPath } from '@/lib/services/localData';
import { debug } from '@/lib/utils/debug';

const attachment = (name: string, content?: string) =>
  ({ name, mediaType: 'image/*', ...(content ? { links: { content } } : {}) }) as Attachment;

describe('isAuthenticationEnabled', () => {
  it('requires both the server and the token URL', () => {
    expect(isAuthenticationEnabled('http://server', 'http://token')).toBe(true);
    expect(isAuthenticationEnabled('http://server', '')).toBe(false);
    expect(isAuthenticationEnabled(undefined, 'http://token')).toBe(false);
    expect(isAuthenticationEnabled(' ', ' ')).toBe(false);
  });
});

describe('normalizeAuthor', () => {
  it('capitalizes the first path segment', () => {
    expect(normalizeAuthor('omnicorp/omnicorp/lightall')).toBe('Omnicorp');
    expect(normalizeAuthor(' siemens ')).toBe('Siemens');
  });

  it('returns an empty string without a first segment', () => {
    expect(normalizeAuthor('')).toBe('');
    expect(normalizeAuthor('/lightall')).toBe('');
  });
});

describe('buildLocalCatalogPath', () => {
  it('builds a URI-encoded path below the catalog root', () => {
    expect(buildLocalCatalogPath('repo', '/author/my tm/.attachments/a b.png')).toBe(
      '/catalog-repos/repo/author/my%20tm/.attachments/a%20b.png',
    );
  });

  it('prefixes the base path', () => {
    vi.stubEnv('BASE_PATH', '/tmc-ui');
    expect(buildLocalCatalogPath('repo', 'a/b.tm.json')).toBe(
      '/tmc-ui/catalog-repos/repo/a/b.tm.json',
    );
  });
});

describe('buildItemImageSrc', () => {
  const DEFAULT = '/default-image.png';

  it('falls back to the default image without attachments', () => {
    expect(buildItemImageSrc('a/b/c', undefined, 'repo')).toBe(DEFAULT);
    expect(buildItemImageSrc('a/b/c', [attachment('manual.pdf')], 'repo')).toBe(DEFAULT);
  });

  it('prefers png over other image formats in client mode', () => {
    const src = buildItemImageSrc('a/b/c', [attachment('x.svg'), attachment('x.PNG')], 'repo');
    expect(src).toBe('/catalog-repos/repo/a/b/c/.attachments/x.PNG');
  });

  it('needs the TM name and repository in client mode', () => {
    expect(buildItemImageSrc(undefined, [attachment('x.png')], 'repo')).toBe(DEFAULT);
    expect(buildItemImageSrc('a/b/c', [attachment('x.png')])).toBe(DEFAULT);
  });

  it('resolves the attachment link against the API in server mode', () => {
    vi.stubEnv('TMC_SERVER_URL', 'http://localhost:8080');
    vi.stubEnv('API_BASE', 'http://localhost:8080');
    const attachments = [attachment('x.png', '../thing-models/a/b/c/.attachments/x.png')];
    expect(buildItemImageSrc('a/b/c', attachments)).toBe(
      'http://localhost:8080/thing-models/a/b/c/.attachments/x.png',
    );
  });

  it('falls back to the default image in server mode without an attachment link', () => {
    vi.stubEnv('TMC_SERVER_URL', 'http://localhost:8080');
    vi.stubEnv('API_BASE', 'http://localhost:8080');
    expect(buildItemImageSrc('a/b/c', [attachment('x.png')])).toBe(DEFAULT);
  });
});

describe('debug', () => {
  it('logs only when DEBUG is true', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    debug('hidden');
    expect(log).not.toHaveBeenCalled();

    vi.stubEnv('DEBUG', 'true');
    debug('shown', 1);
    expect(log).toHaveBeenCalledWith('shown', 1);
  });
});
