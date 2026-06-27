import React, { useState, useEffect } from 'react';
import { getProducts } from '../../api/products';
import { Product } from '../../types';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';

const StockView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts({ q: searchQuery });
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const columns = [
    { header: 'Product Name', accessor: 'nameEn' as keyof Product },
    { header: 'Tamil Name', accessor: 'nameTa' as keyof Product },
    { header: 'Unit', accessor: 'unitType' as keyof Product },
    { 
      header: 'Price', 
      accessor: (p: Product) => formatCurrency(p.sellingPrice) 
    },
    { 
      header: 'Current Stock', 
      accessor: (p: Product) => (
        <Badge variant={p.currentStock <= p.minStockAlert ? 'danger' : 'success'}>
          {p.currentStock} {p.unitType}
        </Badge>
      )
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stock View</h1>
        <div className="w-64">
          <Input 
            placeholder="Search products..." 
            value={searchQuery} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table 
          columns={columns} 
          data={products} 
          isLoading={loading}
          keyExtractor={(product) => product.id}
        />
      </div>
    </div>
  );
};

export default StockView;
