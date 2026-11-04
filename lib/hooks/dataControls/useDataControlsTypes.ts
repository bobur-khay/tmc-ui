import type { InventoryItem } from '@/app/_components/inventory/types';

export interface UseDataControlsProps {
  baseInventory: InventoryItem[];
  setBaseInventory: (inventory: InventoryItem[]) => void;
  setIsInventoryLoading: (isLoading: boolean) => void;
  setInventoryError: (error: string | null) => void;
  isInitialInventoryLoad: React.MutableRefObject<boolean>;
  filteredInventoryPage: InventoryItem[];
  setFilteredInventoryPage: (inventory: InventoryItem[]) => void;
  setTotalInventoryCount: (count: number) => void;
  totalFilteredInventoryCount: number;
  setTotalFilteredInventoryCount: (count: number) => void;
  setInventoryView: (view: 'grid' | 'list') => void;
}
