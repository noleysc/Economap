import { create } from 'zustand';
import { Product } from '@/types';

interface CartState {
  items: Product[];
  addItem: (item: Product) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getGas: boolean;
  toggleGetGas: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  getGas: false,
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter((i) => i.id !== id)
  })),
  clearCart: () => set({ items: [] }),
  toggleGetGas: () => set((state) => ({ getGas: !state.getGas })),
}));