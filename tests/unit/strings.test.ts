import { describe, expect, it, vi } from 'vitest';
import {
  capitalize,
  ensureTrailingSlash,
  formatRepositoryName,
  isNonEmptyString,
  normalizeRelativePathSegment,
  normalizeString,
} from '@/lib/utils/strings';

describe('capitalize', () => {
  it('uppercases the first character only', () => {
    expect(capitalize('author')).toBe('Author');
    expect(capitalize('changedSince')).toBe('ChangedSince');
  });

  it('returns an empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('formatRepositoryName', () => {
  it('strips the source hash suffix in client mode', () => {
    expect(formatRepositoryName('example-catalog-a32da3c49684')).toBe('example-catalog');
  });

  it('keeps names without a 12 character hex suffix', () => {
    expect(formatRepositoryName('example-catalog')).toBe('example-catalog');
    expect(formatRepositoryName('catalog-a32da3c4968')).toBe('catalog-a32da3c4968');
  });

  it('keeps the server repository name untouched in server mode', () => {
    vi.stubEnv('TMC_SERVER_URL', 'http://localhost:8080');
    expect(formatRepositoryName('example-catalog-a32da3c49684')).toBe(
      'example-catalog-a32da3c49684',
    );
  });
});

describe('normalizeString', () => {
  it('trims, lowercases and drops unsupported characters', () => {
    expect(normalizeString('  Omni Corp/Light_All-2.0! ')).toBe('omnicorplight_all-2.0');
  });
});

describe('normalizeRelativePathSegment', () => {
  it('removes leading slashes only', () => {
    expect(normalizeRelativePathSegment('//catalog-repos/.tmc/')).toBe('catalog-repos/.tmc/');
    expect(normalizeRelativePathSegment('catalog-repos')).toBe('catalog-repos');
  });
});

describe('ensureTrailingSlash', () => {
  it('appends a slash when missing', () => {
    expect(ensureTrailingSlash('folder')).toBe('folder/');
    expect(ensureTrailingSlash('folder/')).toBe('folder/');
  });
});

describe('isNonEmptyString', () => {
  it.each([
    ['value', true],
    ['  value ', true],
    ['', false],
    ['   ', false],
    [null, false],
    [undefined, false],
  ])('isNonEmptyString(%j) is %s', (value, expected) => {
    expect(isNonEmptyString(value)).toBe(expected);
  });
});
