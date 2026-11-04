import { useState } from 'react';
import { INVENTORY_VIEW_KEY } from '../utils/constants';
import { setLocalStorage } from '../utils/storage';

export function useInventoryView() {
  const [inventoryView, setInventoryView] = useState<'grid' | 'list'>('grid');
  const handleViewChange = (nextView: 'grid' | 'list') => {
    setInventoryView(nextView);
    try {
      setLocalStorage(INVENTORY_VIEW_KEY, nextView);
    } catch (error) {
      console.warn('Could not save the results view preference', error);
    }
  };
  return { inventoryView, setInventoryView: handleViewChange };
}
