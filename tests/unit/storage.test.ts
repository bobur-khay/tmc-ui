import { describe, expect, it } from 'vitest';
import {
  CLIENT_ID_SESSION_KEY,
  CLIENT_SECRET_SESSION_KEY,
  CREDENTIALS_SUBMITTED_SESSION_KEY,
} from '@/lib/utils/constants';
import {
  clearStoredCredentialsSession,
  getLocalStorage,
  getProcessedSessionStoreValue,
  getStoredCredentialsSubmitted,
  setLocalStorage,
  setStoredCredentialsSubmitted,
  setStoredSessionValue,
} from '@/lib/utils/storage';

describe('local storage helpers', () => {
  it('stores and reads a value', () => {
    setLocalStorage('key', 'value');
    expect(getLocalStorage('key')).toBe('value');
  });

  it('returns null for missing or blank values', () => {
    expect(getLocalStorage('missing')).toBeNull();
    localStorage.setItem('blank', '   ');
    expect(getLocalStorage('blank')).toBeNull();
  });

  it('removes the key when a blank value is set', () => {
    setLocalStorage('key', 'value');
    setLocalStorage('key', ' ');
    expect(localStorage.getItem('key')).toBeNull();
  });
});

describe('session storage helpers', () => {
  it('stores and reads a value', () => {
    setStoredSessionValue('key', 'value');
    expect(getProcessedSessionStoreValue('key')).toBe('value');
  });

  it('removes the key when a blank value is set', () => {
    setStoredSessionValue('key', 'value');
    setStoredSessionValue('key', '');
    expect(sessionStorage.getItem('key')).toBeNull();
    expect(getProcessedSessionStoreValue('key')).toBeNull();
  });
});

describe('stored credentials', () => {
  it('reports submitted only when the flag and both credentials exist', () => {
    setStoredCredentialsSubmitted(true);
    expect(getStoredCredentialsSubmitted()).toBe(false);

    setStoredSessionValue(CLIENT_ID_SESSION_KEY, 'id');
    expect(getStoredCredentialsSubmitted()).toBe(false);

    setStoredSessionValue(CLIENT_SECRET_SESSION_KEY, 'secret');
    expect(getStoredCredentialsSubmitted()).toBe(true);

    setStoredCredentialsSubmitted(false);
    expect(getStoredCredentialsSubmitted()).toBe(false);
  });

  it('clears every credential key', () => {
    setStoredSessionValue(CLIENT_ID_SESSION_KEY, 'id');
    setStoredSessionValue(CLIENT_SECRET_SESSION_KEY, 'secret');
    setStoredCredentialsSubmitted(true);

    clearStoredCredentialsSession();

    expect(sessionStorage.getItem(CLIENT_ID_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(CLIENT_SECRET_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(CREDENTIALS_SUBMITTED_SESSION_KEY)).toBeNull();
  });
});
