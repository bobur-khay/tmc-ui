import { vi } from 'vitest';

// Stand-in for next/navigation, which needs a mounted App Router.
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

export const navigation = {
  pathname: '/',
  params: {} as Record<string, string>,
};

export const useRouter = () => router;
export const usePathname = () => navigation.pathname;
export const useParams = () => navigation.params;
export const useSearchParams = () => new URLSearchParams(window.location.search);
