import { create } from 'zustand';
import { BillItem } from '../types';

interface BillState {
  items: BillItem[];
  customer: { name: string; phone: string; isCredit: boolean } | null;
  addItem: (item: BillItem) => void;
  updateQty: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  removeItem: (productId: string) => void;
  clearBill: () => void;
  setCustomer: (customer: { name: string; phone: string; isCredit: boolean } | null) => void;
}

export const useBillStore = create<BillState>((set) => ({
  items: [],
  customer: null,
  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find((i) => i.productId === newItem.productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === newItem.productId
              ? { ...i, qty: i.qty + newItem.qty, total: (i.qty + newItem.qty) * i.unitPrice }
              : i
          ),
        };
      }
      return { items: [...state.items, newItem] };
    }),
  updateQty: (productId, qty) =>
    set((state) => ({
      items: qty <= 0
        ? state.items.filter((i) => i.productId !== productId)
        : state.items.map((i) =>
            i.productId === productId ? { ...i, qty, total: qty * i.unitPrice } : i
          ),
    })),
  updatePrice: (productId, price) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, unitPrice: price, total: price * i.qty } : i
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  clearBill: () => set({ items: [], customer: null }),
  setCustomer: (customer) => set({ customer }),
}));
