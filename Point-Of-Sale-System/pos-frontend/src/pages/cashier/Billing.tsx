import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useBillStore } from '../../store/billStore';

import { searchProducts, getProducts, createProduct } from '../../api/products';
import { createBill } from '../../api/bills';
import { getCategories } from '../../api/categories';
import { Product, Category, BillItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';
import { printReceipt } from '../../utils/printReceipt';

const Billing: React.FC = () => {
  const { items, addItem, updateQty, updatePrice, removeItem, clearBill, customer, setCustomer } = useBillStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState('1');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit' | ''>('');
  const [cashGiven, setCashGiven] = useState('');

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products-all'],
    queryFn: () => getProducts({ is_active: true }),
  });

  const displayProducts = searchQuery.trim().length >= 2 ? searchResults : allProducts;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      setIsSearching(true);
      try {
        const results = await searchProducts(q);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddToCart = (product: Product, qty: number) => {
    const billItem: BillItem = {
      productId: product.id,
      productNameEn: product.nameEn,
      productNameTa: product.nameTa,
      qty: qty,
      unitPrice: product.sellingPrice,
      gstRate: product.gstRate ?? 0,
      total: qty * product.sellingPrice,
    };
    addItem(billItem);
    setShowQtyModal(null);
    setQtyInput('1');
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const gst = items.reduce(
    (sum, i) => sum + (i.unitPrice * i.qty * (i.gstRate ?? 0)) / 100,
    0
  );
  const total = subtotal + gst;

  const grandTotal = subtotal + gst;
  const change = Number(cashGiven) - grandTotal;
  const isShort = cashGiven !== '' && change < 0;

  const handleSaveBill = async (mode: 'cash' | 'upi' | 'card' | 'credit', print: boolean = true) => {
    const toastId = toast.loading('Saving bill...');
    try {
      const billData: any = {
        customer_name: customer?.name,
        customer_phone: customer?.phone,
        payment_mode: mode,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.qty,
        })),
        discount_total: 0,
      };
      if (mode === 'cash' && cashGiven !== '') {
        billData.cash_given = Number(cashGiven);
        billData.change_returned = Math.max(0, change);
      }

      const savedBill = await createBill(billData);

      if (print) {
        printReceipt(savedBill);
      }

      toast.success(`Bill #${savedBill.billNumber} saved!`, { id: toastId });
      clearBill();
      setShowPaymentModal(false);
      setPaymentMode('');
      setCashGiven('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save bill';
      toast.error(msg, { id: toastId });
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row h-full gap-4 p-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <Input
              ref={searchInputRef}
              label="Search Products"
              placeholder="Type name or barcode..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            />
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="mt-4 p-4 border-2 border-dashed rounded text-center">
                <p className="text-gray-500 mb-2">No products found</p>
                <Button onClick={() => setShowManualModal(true)}>+ Add New Product</Button>
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[60vh]">
              {displayProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => setShowQtyModal(product)}
                >
                  <div className="font-bold">{product.nameEn}</div>
                  <div className="text-sm text-gray-500">{product.nameTa}</div>
                  <div className="flex justify-between mt-2">
                    <span className="text-blue-600 font-bold">{formatCurrency(product.sellingPrice)}</span>
                    <Badge variant={product.currentStock > 10 ? 'success' : 'danger'}>
                      Stock: {product.currentStock} {product.unitType}
                    </Badge>
                  </div>
                  {product.gstRate > 0 && (
                    <div className="text-xs text-gray-400 mt-1">GST: {product.gstRate}%</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-96 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-lg shadow flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Current Bill</h2>
              <Button variant="outline" size="sm" onClick={() => setShowCustomerModal(true)}>
                {customer ? customer.name : 'Add Customer'}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 min-h-[300px]">
              {items.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">Cart is empty</div>
              ) : (
                <table className="w-full text-sm">
                  <thead style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '12px', color: '#6b7280' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '12px', color: '#6b7280' }}>Qty</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '12px', color: '#6b7280' }}>Price</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: '12px', color: '#6b7280' }}>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.productId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', color: '#111827', fontSize: '14px' }}>
                          <div style={{ fontWeight: 500 }}>{item.productNameEn}</div>
                          {item.productNameTa && <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.productNameTa}</div>}
                          {item.gstRate > 0 && <div style={{ fontSize: '11px', color: '#2563eb' }}>GST {item.gstRate}%</div>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              onClick={() => updateQty(item.productId, item.qty - 1)}
                              style={{ width: '26px', height: '26px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151', lineHeight: 1 }}
                            >−</button>
                            <input
                              type="number" min="1"
                              value={item.qty}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQty(item.productId, Math.max(1, Number(e.target.value)))}
                              style={{ width: '44px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px', padding: '3px 4px', fontSize: '13px', color: '#111827', background: '#fff' }}
                            />
                            <button
                              onClick={() => updateQty(item.productId, item.qty + 1)}
                              style={{ width: '26px', height: '26px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151', lineHeight: 1 }}
                            >+</button>
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrice(item.productId, Number(e.target.value))}
                            style={{ width: '72px', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 6px', fontSize: '13px', color: '#111827', background: '#fff' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', color: '#111827', fontWeight: 500, fontSize: '14px' }}>
                          {formatCurrency(item.total)}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <button
                            onClick={() => removeItem(item.productId)}
                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '2px 6px' }}
                          >🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {gst > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>GST</span>
                  <span>{formatCurrency(gst)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button variant="danger" onClick={clearBill} disabled={items.length === 0}>
                  Clear
                </Button>
                <Button onClick={() => setShowPaymentModal(true)} disabled={items.length === 0}>
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showQtyModal && (
          <Modal
            isOpen={!!showQtyModal}
            onClose={() => setShowQtyModal(null)}
            title={`Enter Quantity for ${showQtyModal.nameEn}`}
          >
            <div className="space-y-4">
              <Input
                label={`Quantity (${showQtyModal.unitType})`}
                type="number"
                step={showQtyModal.unitType === 'kg' || showQtyModal.unitType === 'liter' ? '0.001' : '1'}
                value={qtyInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQtyInput(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowQtyModal(null)}>Cancel</Button>
                <Button onClick={() => handleAddToCart(showQtyModal, parseFloat(qtyInput) || 0)}>
                  Add to Cart
                </Button>
              </div>
            </div>
          </Modal>
        )}

        <Modal
          isOpen={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          title="Customer Details"
        >
          <div className="space-y-4">
            <Input
              label="Name"
              value={customer?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCustomer({ ...customer!, name: e.target.value, phone: customer?.phone || '', isCredit: customer?.isCredit || false })
              }
            />
            <Input
              label="Phone"
              value={customer?.phone || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCustomer({ ...customer!, phone: e.target.value, name: customer?.name || '', isCredit: customer?.isCredit || false })
              }
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={customer?.isCredit || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCustomer({ ...customer!, isCredit: e.target.checked, name: customer?.name || '', phone: customer?.phone || '' })
                }
              />
              <label>Credit Purchase</label>
            </div>
            <Button className="w-full" onClick={() => setShowCustomerModal(false)}>Save</Button>
          </div>
        </Modal>

        <Modal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setPaymentMode(''); setCashGiven(''); }}
          title="Finalize Payment"
        >
          <div style={{ padding: '4px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>Total Amount</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#1d4ed8' }}>{formatCurrency(grandTotal)}</div>
              {gst > 0 && (
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>incl. GST {formatCurrency(gst)}</div>
              )}
            </div>

            {/* Payment mode selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {(['cash', 'upi', 'card'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMode(m)}
                  style={{
                    padding: '12px', border: `2px solid ${paymentMode === m ? '#1a6b3c' : '#d1d5db'}`,
                    borderRadius: '8px', background: paymentMode === m ? '#f0fdf4' : '#fff',
                    color: paymentMode === m ? '#1a6b3c' : '#374151',
                    fontWeight: paymentMode === m ? 600 : 400,
                    fontSize: '14px', cursor: 'pointer'
                  }}
                >
                  {m === 'cash' ? '💵 Cash' : m === 'upi' ? '📱 UPI / GPay' : '💳 Card'}
                </button>
              ))}
              {customer?.isCredit && (
                <button
                  onClick={() => setPaymentMode('credit')}
                  style={{
                    padding: '12px', border: `2px solid ${paymentMode === 'credit' ? '#1a6b3c' : '#d1d5db'}`,
                    borderRadius: '8px', background: paymentMode === 'credit' ? '#f0fdf4' : '#fff',
                    color: paymentMode === 'credit' ? '#1a6b3c' : '#374151',
                    fontWeight: paymentMode === 'credit' ? 600 : 400,
                    fontSize: '14px', cursor: 'pointer'
                  }}
                >📒 Credit</button>
              )}
            </div>

            {/* Cash given section */}
            {paymentMode === 'cash' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
                  Cash given by customer (₹)
                </label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder={`Min ₹${grandTotal.toFixed(2)}`}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none' }}
                />
                {cashGiven !== '' && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '6px', background: isShort ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isShort ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: isShort ? '#b91c1c' : '#166534', fontWeight: 500 }}>
                      {isShort ? '⚠ Amount short' : '✓ Change to return'}
                    </span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: isShort ? '#b91c1c' : '#166534' }}>
                      ₹{Math.abs(change).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => { setShowPaymentModal(false); setPaymentMode(''); setCashGiven(''); }}
                style={{ flex: 1, padding: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => paymentMode && handleSaveBill(paymentMode)}
                disabled={!paymentMode || (paymentMode === 'cash' && cashGiven !== '' && isShort)}
                style={{
                  flex: 2, padding: '11px', border: 'none', borderRadius: '6px',
                  background: !paymentMode || (paymentMode === 'cash' && cashGiven !== '' && isShort) ? '#9ca3af' : '#1a6b3c',
                  color: '#fff', fontSize: '14px', fontWeight: 500,
                  cursor: !paymentMode || (paymentMode === 'cash' && cashGiven !== '' && isShort) ? 'not-allowed' : 'pointer'
                }}
              >
                {paymentMode ? `Confirm ${paymentMode === 'cash' ? '💵' : paymentMode === 'upi' ? '📱' : paymentMode === 'card' ? '💳' : '📒'} Payment` : 'Select payment mode'}
              </button>
            </div>
          </div>
        </Modal>

        <ManualProductEntryModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onAdded={(p) => {
            handleAddToCart(p, 1);
            setShowManualModal(false);
          }}
        />
      </div>
    </>
  );
};

interface ManualProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (product: Product) => void;
}

const ManualProductEntryModal: React.FC<ManualProductEntryModalProps> = ({ isOpen, onClose, onAdded }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameTa: '',
    categoryId: '',
    unitType: 'pcs' as Product['unitType'],
    purchasePrice: '',
    sellingPrice: '',
    initialStock: '0',
  });

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const product = await createProduct({
        nameEn: formData.nameEn,
        nameTa: formData.nameTa,
        categoryId: formData.categoryId,
        unitType: formData.unitType,
        purchasePrice: parseFloat(formData.purchasePrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        initialStock: parseFloat(formData.initialStock),
      });
      onAdded(product);
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name (English)" required value={formData.nameEn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nameEn: e.target.value })} />
        <Input label="Name (Tamil)" required value={formData.nameTa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nameTa: e.target.value })} />
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            className="w-full border rounded-md p-2"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            required
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nameEn}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Purchase Price" type="number" required value={formData.purchasePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, purchasePrice: e.target.value })} />
          <Input label="Selling Price" type="number" required value={formData.sellingPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, sellingPrice: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select
              className="w-full border rounded-md p-2"
              value={formData.unitType}
              onChange={(e) => setFormData({ ...formData, unitType: e.target.value as Product['unitType'] })}
            >
              <option value="pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="g">G</option>
              <option value="packet">Packet</option>
              <option value="liter">Liter</option>
            </select>
          </div>
          <Input label="Initial Stock" type="number" value={formData.initialStock} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, initialStock: e.target.value })} />
        </div>
        <Button type="submit" className="w-full">Save & Add to Bill</Button>
      </form>
    </Modal>
  );
};

export default Billing;
