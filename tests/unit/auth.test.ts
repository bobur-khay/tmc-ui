import { describe, expect, it, vi } from 'vitest';
import { requestClientCredentialsToken } from '@/lib/services/auth';
import { jsonResponse } from '../fixtures/inventory';

const options = { tokenUrl: 'http://auth/token', clientId: 'id', clientSecret: 'secret' };

describe('requestClientCredentialsToken', () => {
  it('posts a client_credentials grant with HTTP Basic authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: 'abc' }));
    vi.stubGlobal('fetch', fetchMock);

    await requestClientCredentialsToken(options);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://auth/token');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('grant_type=client_credentials');
    expect(init.headers.Authorization).toBe(`Basic ${btoa('id:secret')}`);
    expect(init.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('returns the token with an expiry reduced by the safety skew', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ access_token: 'abc', expires_in: 300 })),
    );

    const result = await requestClientCredentialsToken(options);

    expect(result).toEqual({ accessToken: 'abc', expiresAt: Date.now() + 270_000 });
    vi.useRealTimers();
  });

  it('never returns an expiry in the past', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ access_token: 'abc', expires_in: 10 })),
    );

    expect((await requestClientCredentialsToken(options)).expiresAt).toBe(Date.now());
    vi.useRealTimers();
  });

  it('returns a null expiry when the endpoint does not report one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ access_token: 'abc' })));
    expect((await requestClientCredentialsToken(options)).expiresAt).toBeNull();
  });

  it('throws the response body when the request is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('invalid_client', { status: 401 })),
    );
    await expect(requestClientCredentialsToken(options)).rejects.toThrow('invalid_client');
  });

  it('throws when the response has no access token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ token_type: 'Bearer' })));
    await expect(requestClientCredentialsToken(options)).rejects.toThrow(
      'Token endpoint did not return an access_token',
    );
  });
});
