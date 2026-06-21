import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: Record<number, CartItem>;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: {},

      add: (item, qty = 1) =>
        set((state) => ({
          items: {
            ...state.items,
            [item.product_id]: {
              ...item,
              quantity: (state.items[item.product_id]?.quantity ?? 0) + qty,
            },
          },
        })),

      setQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            const { [productId]: _removed, ...rest } = state.items;
            return { items: rest };
          }
          return {
            items: {
              ...state.items,
              [productId]: { ...state.items[productId], quantity: qty },
            },
          };
        }),

      remove: (productId) =>
        set((state) => {
          const { [productId]: _removed, ...rest } = state.items;
          return { items: rest };
        }),

      clear: () => set({ items: {} }),
    }),
    { name: "smartdiet-cart" },
  ),
);
