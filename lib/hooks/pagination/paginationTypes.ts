import type { InventoryItem } from '@/app/_components/inventory/types';

export interface PaginationProps {
  totalFilteredInventoryCount: number;
  filteredInventoryPage: InventoryItem[];
}
