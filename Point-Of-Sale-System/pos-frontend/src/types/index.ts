export type Role = 'owner' | 'cashier';

export interface User {
  id: string;
  name: string;
  username: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameTa: string;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  nameEn: string;
  nameTa: string;
  barcode?: string;
  unitType: 'kg' | 'pcs' | 'packet' | 'liter' | 'g';
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockAlert: number;
  isActive: boolean;
  category?: Category;
}

export interface BillItem {
  id?: string;
  billId?: string;
  productId: string;
  productNameEn: string;
  productNameTa: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  cashierId: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  discount: number;
  gstAmount: number;
  payableAmount: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'credit';
  status: 'completed' | 'cancelled';
  createdAt: string;
  items?: BillItem[];
  cashier?: User;
}

export interface PurchaseItem {
  id?: string;
  purchaseId?: string;
  productId: string;
  productNameEn: string;
  qty: number;
  purchasePrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceNumber?: string;
  totalAmount: number;
  paymentMode: string;
  purchaseDate: string;
  items?: PurchaseItem[];
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paymentMode: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'sale' | 'purchase' | 'adjustment' | 'damaged' | 'initial';
  qty: number;
  unitPrice?: number;
  performedBy: string;
  createdAt: string;
  product?: Product;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  role: Role;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Settings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeGstin: string;
  gstEnabled: boolean;
  lowStockAlert: number;
  receiptFooter: string;
  billPrefix: string;
}
