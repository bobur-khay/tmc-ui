import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { navigation } from './mocks/navigation';

vi.mock('next/navigation', () => import('./mocks/navigation'));

// Tests start in client mode; individual tests opt into other modes with vi.stubEnv().
for (const key of ['TMC_SERVER_URL', 'TOKEN_URL', 'API_BASE', 'BASE_PATH', 'DEBUG']) {
  delete process.env[key];
}

// Not implemented by jsdom
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList;
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  navigation.pathname = '/';
  navigation.params = {};
});
