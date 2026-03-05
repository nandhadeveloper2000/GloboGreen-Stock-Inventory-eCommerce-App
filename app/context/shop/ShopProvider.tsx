// app/context/shop/ShopProvider.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

type ShopContextType = {
  currentShopId: string | null;
  setCurrentShopId: (id: string | null) => Promise<void>;
};

const ShopContext = createContext<ShopContextType | null>(null);

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [currentShopId, setShopId] = useState<string | null>(null);

  const setCurrentShopId = async (id: string | null) => {
    setShopId(id);
  };

  const value = useMemo(
    () => ({ currentShopId, setCurrentShopId }),
    [currentShopId]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used inside ShopProvider");
  return ctx;
}