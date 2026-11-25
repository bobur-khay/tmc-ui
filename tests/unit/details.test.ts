import { describe, expect, it, vi } from 'vitest';
import {
  buildDetailsId,
  buildDetailsPath,
  decodeDetailsId,
  encodeDetailsId,
} from '@/lib/utils/details';

const TM_ID = 'omnicorp/omnicorp/lightall/v1.0.0-20241008124326-6e351cc95192.tm.json';
const REPO = 'example-catalog-a32da3c49684';

describe('buildDetailsId', () => {
  it('qualifies the ID with the repository in client mode', () => {
    expect(buildDetailsId(TM_ID, REPO)).toBe(`${REPO}/${TM_ID}`);
  });

  it('returns the bare ID without a repository', () => {
    expect(buildDetailsId(TM_ID)).toBe(TM_ID);
  });

  it('returns the bare ID in server mode', () => {
    vi.stubEnv('TMC_SERVER_URL', 'http://localhost:8080');
    expect(buildDetailsId(TM_ID, REPO)).toBe(TM_ID);
  });
});

describe('encodeDetailsId / decodeDetailsId', () => {
  it('encodes the ID into a single path segment', () => {
    const encoded = encodeDetailsId(TM_ID);
    expect(encoded).not.toContain('/');
    expect(encoded).toBe('omnicorp~omnicorp~lightall~v1.0.0-20241008124326-6e351cc95192.tm.json');
  });

  it('round-trips IDs, including characters that need URI encoding', () => {
    for (const id of [TM_ID, `${REPO}/${TM_ID}`, 'author/a b/üñí+c/v1.tm.json']) {
      expect(decodeDetailsId(encodeDetailsId(id))).toBe(id);
    }
  });
});

describe('buildDetailsPath', () => {
  it('builds the details route', () => {
    expect(buildDetailsPath(TM_ID)).toBe(`/details/${encodeDetailsId(TM_ID)}`);
  });

  it('builds the image route', () => {
    expect(buildDetailsPath(TM_ID, true)).toBe(`/details/${encodeDetailsId(TM_ID)}/image`);
  });

  it('includes the repository in client mode', () => {
    expect(buildDetailsPath(TM_ID, false, REPO)).toBe(
      `/details/${encodeDetailsId(`${REPO}/${TM_ID}`)}`,
    );
  });
});
