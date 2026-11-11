import { type InventoryItem } from '@/app/_components/inventory/types';
import { useState, useRef } from 'react';
import { useInventoryView } from './useInventoryView';
import { useDataControls } from './dataControls/useDataControls';
import { debug } from '../utils/debug';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function useInventory() {
  /* Grid/List view */
  const { inventoryView, setInventoryView } = useInventoryView();

  /* Inventory */
  // Client Mode: All inventory items fetched during load
  // Server Mode: The first page of the inventory
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  // Inventory count of all the items
  const [totalInventoryCount, setTotalInventoryCount] = useState(0);

  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const isInitialInventoryLoad = useRef(true);

  // Inventory count of all the items
  // Filtered items for the current page
  const [filteredInventoryPage, setFilteredInventoryPage] = useState<InventoryItem[]>([]);
  // Total number of items matching the current filters
  const [totalFilteredInventoryCount, setTotalFilteredInventoryCount] = useState(0);

  const {
    /* Data Controls */
    resetDataControls,
    applyDataControls,

    /* Filters */
    filters,
    changedSince,
    toggleFilter,
    checkedFilterOptions,

    /* Search */
    searchQuery,
    setSearchQuery,
    searchProgress,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
  } = useDataControls({
    baseInventory,
    setBaseInventory,
    isInitialInventoryLoad,
    setIsInventoryLoading,
    setInventoryError,
    filteredInventoryPage,
    setFilteredInventoryPage,
    setTotalInventoryCount,
    totalFilteredInventoryCount,
    setTotalFilteredInventoryCount,
    setInventoryView,
  });

  debug({
    isInitialLoad: isInitialInventoryLoad.current,
    isInventoryLoading,
    checkedFilterOptions,
    baseInventory,
    filteredInventoryPage,
    filters,
    totalFilteredInventoryCount,
    searchProgress,
    pageNumber,
    pageSize,
  });

  return {
    /* Inventory */
    totalInventoryCount,
    filteredInventoryPage,
    totalFilteredInventoryCount,
    inventoryError,
    isInventoryLoading,
    inventoryView,
    setInventoryView,

    /* Filters */
    filters,
    changedSince,
    toggleFilter,
    resetDataControls,
    checkedFilterOptions,
    applyDataControls,

    /* Search */
    searchQuery,
    setSearchQuery,
    searchProgress,

    /* Pagination */
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    totalPages,
    paginatedItems,
  };
}
