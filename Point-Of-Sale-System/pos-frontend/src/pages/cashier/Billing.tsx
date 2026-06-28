import React, { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useBillStore } from '../../store/billStore';
import { useAuthStore } from '../../store/authStore';
import { getCustomers } from '../../api/customers';
import { searchProducts, getProducts, createProduct } from '../../api/products';
import { createBill } from '../../api/bills';
import { getCategories } from '../../api/categories';
import { createRequestedProduct } from '../../api/requested_products';
import { OtherItemModal } from '../../components/OtherItemModal';
import { ManualProductEntryModal } from '../../components/ManualProductEntryModal';
import { Product, Category, BillItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';
import { printReceipt } from '../../utils/printReceipt';
import { LanguageToggle } from '../../components/ui/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageContext';

const Billing: React.FC = () => {
  const { items, addItem, updateQty, updatePrice, removeItem, clearBill, customer, setCustomer } = useBillStore();
  const { language, t } = useLanguage();
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [productTab, setProductTab] = useState<'browse' | 'search'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCustomerRequestModal, setShowCustomerRequestModal] = useState(false);
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState('1');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit' | ''>('');
  const [overrideCredit, setOverrideCredit] = useState(false);
  const [cashGiven, setCashGiven] = useState('');

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products', 'all'],
    queryFn: () => getProducts({ is_active: true }),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('productAdded' as any) || 'Product created successfully');
      setShowManualModal(false);
      addItem({
        productId: newProduct.id,
        productNameEn: newProduct.nameEn,
        productNameTa: newProduct.nameTa || '',
        qty: 1,
        unitPrice: newProduct.sellingPrice,
        gstRate: newProduct.gstRate || 0,
        total: newProduct.sellingPrice
      });
      setSearchQuery('');
    },
    onError: () => {
      toast.error(t('errorSaving' as any) || 'Error creating product');
    }
  });

  const requestProductMutation = useMutation({
    mutationFn: createRequestedProduct,
    onSuccess: () => {
      toast.success('Product request saved successfully!');
      setShowManualModal(false);
    },
    onError: () => toast.error('Failed to save request')
  });

  const { data: searchResults = [], isFetching: isSearching } = useQuery<Product[]>({
    queryKey: ['products', 'search', searchQuery],
    queryFn: () => searchProducts(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  });

  const browseProducts = selectedCategory
    ? allProducts.filter((product) => product.categoryId === selectedCategory)
    : allProducts;

  const displayProducts = productTab === 'search'
    ? (searchQuery.trim().length >= 2 ? searchResults : [])
    : browseProducts;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

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
        customer_id: customer?.id,
        customer_name: customer?.name,
        customer_phone: customer?.phone,
        payment_mode: mode,
        override_credit: overrideCredit,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.qty,
        })),
        discount_total: 0,
      };
      if (cashGiven !== '') {
        billData.cash_given = Number(cashGiven);
        billData.change_returned = change > 0 ? change : null;
      }

      const savedBill = await createBill(billData);
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });

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

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)]">
        <div className="w-full md:w-2/3 flex flex-col h-[50vh] md:h-full bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200">
          <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['browse', 'search'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setProductTab(tab)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: productTab === tab ? '#1a6b3c' : '#d1d5db',
                    background: productTab === tab ? '#1a6b3c' : '#fff',
                    color: productTab === tab ? '#fff' : '#374151',
                  }}
                >
                  {tab === 'browse' ? t('browseProducts') : t('search')}
                </button>
              ))}
            </div>

            {productTab === 'search' && (
              <input
                ref={searchInputRef}
                autoFocus
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearch}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none', marginLeft: '10px' }}
              />
            )}
            <LanguageToggle />
          </div>

          {productTab === 'browse' ? (
            <div className="p-4 bg-white rounded-lg shadow mb-4">
              <h3 className="font-semibold text-slate-700 mb-3">{t('categories')}</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {language === 'TA' ? cat.nameTa || cat.nameEn : cat.nameEn}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            productTab === 'search' && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="mt-4 p-4 border-2 border-dashed rounded text-center">
                <p className="text-gray-500 mb-2">No products found</p>
                <Button onClick={() => setShowManualModal(true)}>+ Add New Product</Button>
              </div>
            )
          )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto max-h-[60vh]">
              {displayProducts.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => handleAddToCart(prod, 1)}
                  disabled={prod.currentStock <= 0}
                  className="border border-gray-200 rounded-lg p-3 text-left flex flex-col gap-2 hover:border-green-600 transition-colors"
                >
                  <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[40px]">
                    {language === 'TA' ? prod.nameTa || prod.nameEn : prod.nameEn}
                  </h3>
                  <div className="flex justify-between items-end mt-auto">
                    <span className="text-blue-600 font-bold">{formatCurrency(prod.sellingPrice)}</span>
                    <Badge variant={prod.currentStock > 10 ? 'success' : 'danger'}>
                      {prod.currentStock} {prod.unitType}
                    </Badge>
                  </div>
                </button>
              ))}
              {displayProducts.length === 0 && (
                <div style={{ gridColumn: '1/-1', padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  {productTab === 'search' && searchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No products found'}
                </div>
              )}
            </div>
        </div>

        <div className="w-full md:w-1/3 flex flex-col h-[50vh] md:h-full bg-white relative">
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Current Bill</h2>
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
                        <td style={{ padding: '8px 10px' }}>
                          <div className="font-medium text-slate-800 text-sm">
                            {language === 'TA' ? item.productNameTa || item.productNameEn : item.productNameEn}
                          </div>
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

            <div className="border-t pt-4 space-y-2 bg-white p-4 sticky bottom-0 border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
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
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '5px' }}>
                  Cash given by customer (₹)
                </label>
                <input
                  type="number"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder="Optional - enter to see change"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', color: '#111827', background: '#fff', outline: 'none' }}
                />
                {cashGiven !== '' && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: isShort ? '#fef2f2' : '#f0fdf4', border: `1px solid ${isShort ? '#fecaca' : '#bbf7d0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: isShort ? '#b91c1c' : '#166534', fontWeight: 500 }}>
                      {isShort ? 'Short by' : 'Change'}
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: isShort ? '#b91c1c' : '#166534' }}>
                      ₹{Math.abs(change).toFixed(2)}
                    </span>
                  </div>
                )}
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
                <Button variant="outline" onClick={() => setShowQtyModal(null)}>{t('cancel')}</Button>
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
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                checked={customer?.isCredit || false}
                onChange={(e) => 
                  setCustomer({ ...customer!, isCredit: e.target.checked, name: customer?.name || '', phone: customer?.phone || '' })
                }
                className="w-5 h-5 text-green-600 rounded"
              />
              <span className="text-sm text-slate-600">Enable Credit Options</span>
            </div>
            
            {customer?.isCredit && (
              <div className="mt-4">
                <label>Select Existing Customer (Required for Credit)</label>
                <select 
                  className="w-full mt-1 border border-slate-300 rounded px-3 py-2"
                  onChange={(e) => {
                    const c = customers.find((x: any) => x.id === e.target.value);
                    if (c) {
                      setCustomer({ id: c.id, name: c.name, phone: c.phone, isCredit: true });
                    }
                  }}
                  value={customer?.id || ''}
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone}) - Available: ₹{Number(c.credit_limit) - Number(c.credit_used)}</option>
                  ))}
                </select>
                
                {user?.role === 'owner' && (
                  <div className="flex items-center gap-2 mt-3">
                    <input type="checkbox" checked={overrideCredit} onChange={(e) => setOverrideCredit(e.target.checked)} />
                    <span className="text-sm text-red-600 font-bold">Owner Override (Ignore Limits)</span>
                  </div>
                )}
              </div>
            )}
            
            <Button className="w-full" onClick={() => setShowCustomerModal(false)}>Save</Button>
          </div>
        </Modal>

        <Modal
          isOpen={showPaymentModal}
          onClose={() => { setShowPaymentModal(false); setPaymentMode(''); }}
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
                onClick={() => { setShowPaymentModal(false); setPaymentMode(''); }}
                style={{ flex: 1, padding: '11px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
              >{t('cancel')}</button>
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
          initialSearch={searchQuery}
          onSubmit={(data) => createProductMutation.mutate(data as any)}
          isPending={createProductMutation.isPending}
        />

        <CustomerRequestModal
          isOpen={showCustomerRequestModal}
          onClose={() => setShowCustomerRequestModal(false)}
          initialSearch={searchQuery}
          onSubmit={(data) => requestProductMutation.mutate(data)}
          isPending={requestProductMutation.isPending}
        />

        <OtherItemModal
          isOpen={showOtherModal}
          onClose={() => setShowOtherModal(false)}
          onSubmit={(data) => {
            addItem({
              productId: 'CUSTOM',
              productNameEn: data.name,
              productNameTa: data.name,
              qty: data.qty,
              unitPrice: data.price,
              gstRate: 0,
              total: data.qty * data.price
            });
            setShowOtherModal(false);
          }}
        />
    </>
  );
};

interface CustomerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearch: string;
  onSubmit: (data: { productName: string; productNameTa?: string; notes?: string }) => void;
  isPending: boolean;
}

const CustomerRequestModal: React.FC<CustomerRequestModalProps> = ({ isOpen, onClose, initialSearch, onSubmit, isPending }) => {
  const [formData, setFormData] = useState({
    productName: initialSearch,
    productNameTa: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, productName: initialSearch }));
    }
  }, [isOpen, initialSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customer Requested Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Product Name (English)" 
          required 
          value={formData.productName} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, productName: e.target.value })} 
        />
        <Input 
          label="Product Name (Tamil)" 
          value={formData.productNameTa} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, productNameTa: e.target.value })} 
        />
        <div>
          <label className="block text-sm font-medium mb-1">Notes / Description</label>
          <textarea
            className="w-full border rounded-md p-2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="e.g. 500g packet, specific brand"
          />
        </div>
        <Button type="submit" className="w-full" isLoading={isPending}>Save Request</Button>
      </form>
    </Modal>
  );
};

export default Billing;
