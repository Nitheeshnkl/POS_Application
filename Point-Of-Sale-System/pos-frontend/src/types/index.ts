export type Role = 'owner' | 'cashier';

export interface User {
  id: string;
  name: string;
  username: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  credit_limit?: number;
  credit_used?: number;
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
  gstRate: number;
  isActive: boolean;
  credit_limit?: number;
  credit_used?: number;
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
  gstRate: number;
  total: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  cashierId: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  gstTotal: number;
  discountTotal: number;
  grandTotal: number;
  totalAmount?: number;
  gstAmount?: number;
  discount?: number;
  payableAmount?: number;
  status?: string;
  cashGiven?: number;
  changeReturned?: number;
  paymentMode: 'cash' | 'upi' | 'card' | 'credit';
  paymentStatus: 'paid' | 'pending' | 'cancelled';
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
  supplier_id?: string;
  id: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceNumber?: string;
  totalAmount: number;
  paymentMode: string;
  purchaseDate: string;
  supplierId?: string;
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

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  notes?: string;
  balance?: number;
  credit_limit?: number;
  createdAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
  type: 'purchase' | 'payment' | 'adjustment';
  amount: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface Cashout {
  id: string;
  submittedBy: string;
  submittedByName: string;
  cashierName?: string;
  cashoutDate: string;
  expectedCash: number;
  expectedGpay: number;
  expectedUpi: number;
  expectedCard: number;
  expectedCredit: number;
  expectedTotal: number;
  actualCash?: number;
  actualGpay?: number;
  actualCard?: number;
  cashDifference?: number;
  notes?: string;
  status: 'open' | 'closed';
  closedAt?: string;
  createdAt: string;
}
