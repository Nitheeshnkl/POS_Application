import React, { useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ReportType, fetchAllExportData } from '../../api/export';
import { exportToCSV, exportToExcel, exportToPDF, handleMobileShare } from '../../utils/exportGenerators';
import toast from 'react-hot-toast';

export const ExportCenter: React.FC = () => {
  
  const [selectedReport, setSelectedReport] = useState<ReportType>('bills');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'bills', label: 'Daily Bills' },
    { value: 'cashout', label: 'Daily Cashout' },
    { value: 'investment', label: 'Investment Report' },
    { value: 'purchases', label: 'Purchase Report' },
    { value: 'expenses', label: 'Expense Report' },
    { value: 'profit-loss', label: 'Profit & Loss Report' },
    { value: 'stock', label: 'Stock Valuation Export' },
  ];

  const getDates = () => {
    const today = new Date();
    let start = '', end = '';

    if (dateFilter === 'today') {
      start = today.toISOString().split('T')[0];
      end = start;
    } else if (dateFilter === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      start = yest.toISOString().split('T')[0];
      end = start;
    } else if (dateFilter === 'week') {
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      start = week.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (dateFilter === 'month') {
      const month = new Date(today);
      month.setMonth(month.getMonth() - 1);
      start = month.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (dateFilter === 'custom') {
      start = customStart;
      end = customEnd;
    }
    
    // stock valuation usually doesn't strictly need dates, but we can pass them
    return { start, end };
  };

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    const { start, end } = getDates();

    try {
      const data = await fetchAllExportData(selectedReport, start, end, (count) => {
        setProgress(count);
      });

      if (!data || data.length === 0) {
        toast.error('No data found for the selected period.');
        setIsExporting(false);
        return;
      }

      // Try Mobile Share first if on mobile (rudimentary check or user action)
      // For this implementation, we will always download directly, but we added a share helper for CSVs
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      let shared = false;
      if (isMobile && exportFormat === 'csv') {
        shared = await handleMobileShare(data, selectedReport, exportFormat);
      }

      if (!shared) {
        if (exportFormat === 'csv') exportToCSV(data, selectedReport, start, end);
        if (exportFormat === 'excel') exportToExcel(data, selectedReport, start, end);
        if (exportFormat === 'pdf') exportToPDF(data, selectedReport, start, end);
      }
      
      toast.success('Export completed successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Export Center</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Report</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
            >
              {reportTypes.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Export Format</label>
            <div className="flex gap-4">
              {['csv', 'excel', 'pdf'].map(fmt => (
                <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={exportFormat === fmt} 
                    onChange={() => setExportFormat(fmt as any)}
                  />
                  <span className="uppercase text-sm">{fmt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {selectedReport !== 'stock' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {['today', 'yesterday', 'week', 'month', 'custom'].map(df => (
                <button
                  key={df}
                  className={`px-3 py-1.5 text-sm rounded ${dateFilter === df ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  onClick={() => setDateFilter(df as any)}
                >
                  {df.charAt(0).toUpperCase() + df.slice(1)}
                </button>
              ))}
            </div>

            {dateFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Start Date" value={customStart} onChange={(e: any) => setCustomStart(e.target.value)} />
                <Input type="date" label="End Date" value={customEnd} onChange={(e: any) => setCustomEnd(e.target.value)} />
              </div>
            )}
          </div>
        )}

        {isExporting && (
          <div className="mb-6 bg-blue-50 p-4 rounded-lg flex items-center gap-4 border border-blue-100">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Exporting data...</p>
              <p className="text-xs text-blue-600">Fetched {progress} rows so far.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button 
            size="lg" 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full md:w-auto"
          >
            {isExporting ? 'Processing...' : 'Download Export'}
          </Button>
        </div>
      </div>
    </div>
  );
};
