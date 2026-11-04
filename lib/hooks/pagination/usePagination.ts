import type { InventoryItem } from '@/app/_components/inventory/types';
import { useState, useMemo } from 'react';
import { type PaginationProps } from './paginationTypes';

export const DEFAULT_PAGE_SIZE = 20;

export function usePagination({
  totalFilteredInventoryCount,
  filteredInventoryPage,
}: PaginationProps) {
  const [pageNumber, setPageNumber] = useState<number>(1);
  // used for rendering the page size dropdown
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  // used for functions that need immediate change in value of the page size
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalFilteredInventoryCount / pageSize)),
    [totalFilteredInventoryCount, pageSize],
  );
  const paginatedItems = useMemo<InventoryItem[]>(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredInventoryPage.slice(start, start + pageSize);
  }, [filteredInventoryPage, pageNumber, pageSize]);

  return { pageNumber, setPageNumber, pageSize, setPageSize, totalPages, paginatedItems };
}
