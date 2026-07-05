import { create } from 'zustand';
import { BillItem } from '../types';

const getItemKey = (item: BillItem) => item.productId ?? item.id;
const calculateItemTotal = (item: Pick<BillItem, 'qty' | 'unitPrice' | 'discount'>) =>
  Math.max(0, item.qty * item.unitPrice - (item.discount || 0));

interface BillState {
  items: BillItem[];
  customer: { id?: string; name: string; phone: string; isCredit: boolean } | null;
  addItem: (item: BillItem) => void;
  updateQty: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  removeItem: (productId: string) => void;
  clearBill: () => void;
  setCustomer: (customer: { id?: string; name: string; phone: string; isCredit: boolean } | null) => void;
}

export const useBillStore = create<BillState>((set) => ({
  items: [],
  customer: null,
  addItem: (newItem) =>
    set((state) => {
      const newItemKey = getItemKey(newItem);
      const existing = newItemKey
        ? state.items.find((i) => getItemKey(i) === newItemKey)
        : undefined;
      if (existing) {
        return {
          items: state.items.map((i) =>
            getItemKey(i) === newItemKey
              ? { ...i, qty: i.qty + newItem.qty, total: calculateItemTotal({ ...i, qty: i.qty + newItem.qty }) }
              : i
          ),
        };
      }
      return { items: [...state.items, newItem] };
    }),
  updateQty: (productId, qty) =>
    set((state) => ({
      items: qty <= 0
        ? state.items.filter((i) => getItemKey(i) !== productId)
        : state.items.map((i) =>
            getItemKey(i) === productId ? { ...i, qty, total: calculateItemTotal({ ...i, qty }) } : i
          ),
    })),
  updatePrice: (productId, price) =>
    set((state) => ({
      items: state.items.map((i) =>
        getItemKey(i) === productId ? { ...i, unitPrice: price, total: calculateItemTotal({ ...i, unitPrice: price }) } : i
      ),
    })),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => getItemKey(i) !== productId),
    })),
  clearBill: () => set({ items: [], customer: null }),
  setCustomer: (customer) => set({ customer }),
}));
