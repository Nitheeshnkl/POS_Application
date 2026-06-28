import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatTitle = (type: string, startDate?: string, endDate?: string) => {
  let title = `${type.toUpperCase()} REPORT`;
  if (startDate && endDate) {
    title += ` (${startDate} to ${endDate})`;
  } else if (startDate) {
    title += ` (From ${startDate})`;
  } else if (endDate) {
    title += ` (Until ${endDate})`;
  }
  return title;
};

// CSV Export
export const exportToCSV = (data: any[], type: string, _startDate?: string, _endDate?: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Excel Export
export const exportToExcel = (data: any[], type: string, _startDate?: string, _endDate?: string) => {
  if (data.length === 0) return;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");
  
  const fileName = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// PDF Export
export const exportToPDF = (data: any[], type: string, startDate?: string, endDate?: string) => {
  if (data.length === 0) return;
  
  const doc = new jsPDF('landscape');
  const title = formatTitle(type, startDate, endDate);
  
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => {
    let val = row[h];
    // try formatting dates or numbers if needed
    if (val !== null && val !== undefined) {
      if (typeof val === 'number') {
        // format numbers vaguely nicely, maybe preserve decimals
        val = val.toString(); 
      } else {
        val = String(val);
      }
    } else {
      val = '-';
    }
    return val;
  }));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 25,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save(`${type}_export_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const handleMobileShare = async (data: any[], type: string, format: 'csv' | 'excel' | 'pdf') => {
  if (!navigator.share || !navigator.canShare) {
    return false;
  }

  try {
    let file: File | null = null;
    let fileName = '';

    if (format === 'csv') {
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      for (const row of data) {
        csvRows.push(headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','));
      }
      fileName = `${type}.csv`;
      file = new File([csvRows.join('\n')], fileName, { type: 'text/csv' });
    }

    if (file && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${type} Export`,
        files: [file]
      });
      return true;
    }
  } catch (error) {
    console.error('Share failed', error);
  }
  return false;
};
