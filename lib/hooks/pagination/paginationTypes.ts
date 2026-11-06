import type { InventoryItem } from '@/app/_components/inventory/types';

export const DEFAULT_PAGE_SIZE = 20;

export interface PaginationProps {
  totalFilteredInventoryCount: number;
  filteredInventoryPage: InventoryItem[];
}
