import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../../api/settings';
import { Settings as SettingsType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const [formData, setFormData] = useState<Partial<SettingsType>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('Settings updated successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update settings');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Store Settings</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Store Name"
            name="storeName"
            value={formData.storeName || ''}
            onChange={handleChange}
            required
          />
          <Input
            label="Store Phone"
            name="storePhone"
            value={formData.storePhone || ''}
            onChange={handleChange}
            required
          />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
            <textarea
              name="storeAddress"
              value={formData.storeAddress || ''}
              onChange={handleChange}
              className="w-full border rounded-md p-2"
              rows={3}
              required
            />
          </div>
          <Input
            label="GSTIN"
            name="storeGstin"
            value={formData.storeGstin || ''}
            onChange={handleChange}
          />
          <Input
            label="Bill Prefix"
            name="billPrefix"
            value={formData.billPrefix || ''}
            onChange={handleChange}
          />
          <Input
            label="Low Stock Alert Threshold"
            name="lowStockAlert"
            type="number"
            value={formData.lowStockAlert || 0}
            onChange={handleChange}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gstEnabled"
              name="gstEnabled"
              checked={formData.gstEnabled || false}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="gstEnabled" className="text-sm font-medium text-gray-700">
              Enable GST
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Footer</label>
            <textarea
              name="receiptFooter"
              value={formData.receiptFooter || ''}
              onChange={handleChange}
              className="w-full border rounded-md p-2"
              rows={2}
            />
          </div>
        </div>
        <div className="mt-6">
          <Button type="submit" isLoading={mutation.isPending}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
