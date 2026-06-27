import React, { useState, useEffect, useRef } from 'react';
import { useBillStore } from '../../store/billStore';

import { searchProducts, createProduct } from '../../api/products';
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
  const { items, addItem, updateQty, removeItem, clearBill, customer, setCustomer } = useBillStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState('1');
  
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
  const gst = 0; // Simplified for now
  const total = subtotal + gst;

  const handleSaveBill = async (paymentMode: 'cash' | 'upi' | 'card' | 'credit', print: boolean = true) => {
    try {
      const billData = {
        customerName: customer?.name,
        customerPhone: customer?.phone,
        paymentMode,
        items: items.map(item => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice
        })),
        discount: 0,
        gstAmount: gst,
        totalAmount: subtotal,
        payableAmount: total
      };

      const savedBill = await createBill(billData);
      
      if (print) {
        printReceipt(savedBill);
      }

      alert(`Bill #${savedBill.billNumber} saved successfully!`);
      clearBill();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Failed to save bill', error);
      alert('Failed to save bill');
    }
  };

  return (
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
            {searchResults.map((product) => (
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
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2">Item</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b">
                      <td className="py-2">
                        <div>{item.productNameEn}</div>
                        <div className="text-xs text-gray-400">{formatCurrency(item.unitPrice)}</div>
                      </td>
                      <td className="text-right py-2">
                        <input
                          type="number"
                          className="w-12 text-right border rounded"
                          value={item.qty}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQty(item.productId, parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="text-right py-2 font-medium">{formatCurrency(item.total)}</td>
                      <td className="text-right py-2">
                        <button onClick={() => removeItem(item.productId)} className="text-red-500">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
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
              <Button onClick={() => handleAddToCart(showQtyModal, parseFloat(qtyInput) || 0)}>Add to Cart</Button>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomer({ ...customer!, name: e.target.value, phone: customer?.phone || '', isCredit: customer?.isCredit || false })}
          />
          <Input 
            label="Phone" 
            value={customer?.phone || ''} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomer({ ...customer!, phone: e.target.value, name: customer?.name || '', isCredit: customer?.isCredit || false })}
          />
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={customer?.isCredit || false} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomer({ ...customer!, isCredit: e.target.checked, name: customer?.name || '', phone: customer?.phone || '' })}
            />
            <label>Credit Purchase</label>
          </div>
          <Button className="w-full" onClick={() => setShowCustomerModal(false)}>Save</Button>
        </div>
      </Modal>

      <Modal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        title="Finalize Payment"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-gray-500">Total Amount</div>
            <div className="text-4xl font-bold text-blue-600">{formatCurrency(total)}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => handleSaveBill('cash')}>Cash</Button>
            <Button variant="outline" onClick={() => handleSaveBill('upi')}>UPI</Button>
            <Button variant="outline" onClick={() => handleSaveBill('card')}>Card</Button>
            {customer?.isCredit && (
              <Button variant="outline" onClick={() => handleSaveBill('credit')}>Credit</Button>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
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
    initialStock: '0'
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
        initialStock: parseFloat(formData.initialStock)
      });
      onAdded(product);
    } catch (error) {
      alert('Failed to add product');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Product">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Name (English)" required value={formData.nameEn} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nameEn: e.target.value})} />
        <Input label="Name (Tamil)" required value={formData.nameTa} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, nameTa: e.target.value})} />
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select 
            className="w-full border rounded-md p-2"
            value={formData.categoryId}
            onChange={e => setFormData({...formData, categoryId: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Purchase Price" type="number" required value={formData.purchasePrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, purchasePrice: e.target.value})} />
          <Input label="Selling Price" type="number" required value={formData.sellingPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, sellingPrice: e.target.value})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <select 
              className="w-full border rounded-md p-2"
              value={formData.unitType}
              onChange={e => setFormData({...formData, unitType: e.target.value as Product['unitType']})}
            >
              <option value="pcs">Pcs</option>
              <option value="kg">Kg</option>
              <option value="g">G</option>
              <option value="packet">Packet</option>
              <option value="liter">Liter</option>
            </select>
          </div>
          <Input label="Initial Stock" type="number" value={formData.initialStock} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, initialStock: e.target.value})} />
        </div>
        <Button type="submit" className="w-full">Save & Add to Bill</Button>
      </form>
    </Modal>
  );
};

export default Billing;
