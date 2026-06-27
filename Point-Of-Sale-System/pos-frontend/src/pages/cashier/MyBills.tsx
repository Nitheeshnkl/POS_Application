import React, { useState, useEffect } from 'react';
import { getBills } from '../../api/bills';
import { Bill } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Modal } from '../../components/ui/Modal';
import { printReceipt } from '../../utils/printReceipt';

const MyBills: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await getBills({ start_date: dateFilter, end_date: dateFilter });
      setBills(data);
    } catch (error) {
      console.error('Failed to fetch bills', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [dateFilter]);

  const columns = [
    { header: 'Bill #', accessor: 'billNumber' as keyof Bill },
    { 
      header: 'Time', 
      accessor: (bill: Bill) => new Date(bill.createdAt).toLocaleTimeString() 
    },
    { header: 'Customer', accessor: 'customerName' as keyof Bill },
    { 
      header: 'Amount', 
      accessor: (bill: Bill) => formatCurrency(bill.payableAmount) 
    },
    { 
      header: 'Mode', 
      accessor: (bill: Bill) => (
        <Badge variant="info">{bill.paymentMode.toUpperCase()}</Badge>
      )
    },
    {
      header: 'Status',
      accessor: (bill: Bill) => (
        <Badge variant={bill.status === 'completed' ? 'success' : 'danger'}>
          {bill.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      accessor: (bill: Bill) => (
        <Button size="sm" variant="outline" onClick={() => setSelectedBill(bill)}>View</Button>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Bills</h1>
        <div className="w-48">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table 
          columns={columns} 
          data={bills} 
          isLoading={loading}
          keyExtractor={(bill) => bill.id}
        />
      </div>

      {selectedBill && (
        <Modal 
          isOpen={!!selectedBill} 
          onClose={() => setSelectedBill(null)}
          title={`Bill Details: ${selectedBill.billNumber}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Date</div>
                <div>{formatDate(selectedBill.createdAt)}</div>
              </div>
              <div>
                <div className="text-gray-500">Customer</div>
                <div>{selectedBill.customerName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-gray-500">Payment Mode</div>
                <div className="uppercase">{selectedBill.paymentMode}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="capitalize">{selectedBill.status}</div>
              </div>
            </div>

            <table className="w-full text-sm border-t border-b py-2">
              <thead>
                <tr className="text-left">
                  <th className="py-2">Item</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{item.productNameEn}</td>
                    <td className="text-right py-1">{item.qty}</td>
                    <td className="text-right py-1">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-right">
              <div className="flex justify-between">
                <span>Total Amount</span>
                <span>{formatCurrency(selectedBill.totalAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-1">
                <span>Payable</span>
                <span>{formatCurrency(selectedBill.payableAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => printReceipt(selectedBill)}>Reprint</Button>
              <Button onClick={() => setSelectedBill(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyBills;
