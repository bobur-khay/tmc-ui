'use client';

import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { useInventory } from '@/lib/hooks/useInventory';

type InventoryContextValue = ReturnType<typeof useInventory> & {
  lastOpenedTM: RefObject<string | null>;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const inventory = useInventory();
  const lastOpenedTM = useRef<string | null>(null);

  return (
    <InventoryContext.Provider value={{ ...inventory, lastOpenedTM }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext() {
  const inventory = useContext(InventoryContext);

  if (!inventory) {
    throw new Error('useInventoryContext must be used within InventoryProvider');
  }

  return inventory;
}
