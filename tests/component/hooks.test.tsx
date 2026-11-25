import { act, renderHook } from '@testing-library/react';
import type { SyntheticEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePagination } from '@/lib/hooks/pagination/usePagination';
import { useSearch } from '@/lib/hooks/search/useSearch';
import { useAuth } from '@/lib/hooks/useAuth';
import { useImageLoader } from '@/lib/hooks/useImageLoader';
import { useInventoryView } from '@/lib/hooks/useInventoryView';
import { INVENTORY_VIEW_KEY } from '@/lib/utils/constants';
import { inventory } from '../fixtures/inventory';

describe('usePagination', () => {
  const items = Array.from({ length: 45 }, (_, i) => ({ ...inventory[0], id: `tm-${i}` }));
  const props = { totalFilteredInventoryCount: items.length, filteredInventoryPage: items };

  it('starts on the first page with the default page size', () => {
    const { result } = renderHook(() => usePagination(props));

    expect(result.current.pageNumber).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedItems.map((item) => item.id)).toEqual(
      items.slice(0, 20).map((item) => item.id),
    );
  });

  it('slices the requested page', () => {
    const { result } = renderHook(() => usePagination(props));

    act(() => result.current.setPageNumber(3));

    expect(result.current.paginatedItems.map((item) => item.id)).toEqual([
      'tm-40',
      'tm-41',
      'tm-42',
      'tm-43',
      'tm-44',
    ]);
  });

  it('recomputes the page count for a new page size', () => {
    const { result } = renderHook(() => usePagination(props));

    act(() => result.current.setPageSize(10));

    expect(result.current.totalPages).toBe(5);
    expect(result.current.paginatedItems).toHaveLength(10);
  });

  it('always reports at least one page', () => {
    const { result } = renderHook(() =>
      usePagination({ totalFilteredInventoryCount: 0, filteredInventoryPage: [] }),
    );
    expect(result.current.totalPages).toBe(1);
  });
});

describe('useSearch', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('resets a completed progress bar after its animation', () => {
    const { result } = renderHook(() => useSearch());

    act(() => result.current.setSearchProgress(100));
    act(() => void vi.advanceTimersByTime(399));
    expect(result.current.searchProgress).toBe(100);

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.searchProgress).toBe(0);
  });

  it('keeps a running progress bar', () => {
    const { result } = renderHook(() => useSearch());

    act(() => result.current.setSearchProgress(80));
    act(() => void vi.advanceTimersByTime(10_000));

    expect(result.current.searchProgress).toBe(80);
  });
});

describe('useImageLoader', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  const errorEvent = () =>
    ({ currentTarget: document.createElement('img') }) as SyntheticEvent<HTMLImageElement>;

  it('stops loading once the image loaded', () => {
    const { result } = renderHook(() => useImageLoader({ src: '/a.png', fallbackSrc: '/f.png' }));
    expect(result.current).toMatchObject({ currentSrc: '/a.png', isLoading: true });

    act(() => result.current.handleLoad());

    expect(result.current).toMatchObject({ isLoading: false, hasError: false });
  });

  it('retries with exponential backoff and a cache-busting parameter', () => {
    const { result } = renderHook(() => useImageLoader({ src: '/a.png', fallbackSrc: '/f.png' }));

    act(() => result.current.handleError(errorEvent()));
    act(() => void vi.advanceTimersByTime(999));
    expect(result.current.currentSrc).toBe('/a.png');
    act(() => void vi.advanceTimersByTime(1));
    expect(result.current.currentSrc).toBe('/a.png?_retry=1');

    act(() => result.current.handleError(errorEvent()));
    act(() => void vi.advanceTimersByTime(2000));
    expect(result.current.currentSrc).toBe('/a.png?_retry=2');
  });

  it('appends the retry parameter to an existing query string', () => {
    const { result } = renderHook(() => useImageLoader({ src: '/a.png?v=1', fallbackSrc: '/f' }));

    act(() => result.current.handleError(errorEvent()));
    act(() => void vi.advanceTimersByTime(1000));

    expect(result.current.currentSrc).toBe('/a.png?v=1&_retry=1');
  });

  it('falls back after the retries are exhausted', () => {
    const { result } = renderHook(() => useImageLoader({ src: '/a.png', fallbackSrc: '/f.png' }));

    for (let attempt = 0; attempt < 3; attempt++) {
      act(() => result.current.handleError(errorEvent()));
      act(() => void vi.advanceTimersByTime(4000));
    }
    const event = errorEvent();
    act(() => result.current.handleError(event));

    expect(result.current).toMatchObject({
      currentSrc: '/f.png',
      hasError: true,
      isLoading: false,
    });
    expect(event.currentTarget.getAttribute('src')).toBe('/f.png');
  });
});

describe('useInventoryView', () => {
  it('defaults to the grid and persists changes', () => {
    const { result } = renderHook(() => useInventoryView());
    expect(result.current.inventoryView).toBe('grid');

    act(() => result.current.setInventoryView('list'));

    expect(result.current.inventoryView).toBe('list');
    expect(localStorage.getItem(INVENTORY_VIEW_KEY)).toBe('list');
  });
});

describe('useAuth', () => {
  it('throws outside of the authentication provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside AuthProvider');
  });
});
