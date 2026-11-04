'use client';

import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { useInventory } from '@/lib/hooks/useInventory';

type InventoryContextValue = ReturnType<typeof useInventory> & {
  scrollPosition: RefObject<{ left: number; top: number } | null>;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const inventory = useInventory();
  const scrollPosition = useRef<{ left: number; top: number } | null>(null);

  return (
    <InventoryContext.Provider value={{ ...inventory, scrollPosition }}>
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
