import { Bill } from '../types';
import { formatCurrency } from './formatCurrency';
import { formatDate } from './formatDate';
import toast from 'react-hot-toast';

export interface ReceiptLabels {
  storeName: string;
  receipt: string;
  date: string;
  item: string;
  qty: string;
  price: string;
  total: string;
  subTotal: string;
  gst: string;
  discount: string;
  grandTotal: string;
  thankYou: string;
  popupBlocked: string;
}

const defaultLabels: ReceiptLabels = {
  storeName: 'SRI MURUGAN STORE',
  receipt: 'Receipt',
  date: 'Date',
  item: 'Item',
  qty: 'Qty',
  price: 'Price',
  total: 'Total',
  subTotal: 'Subtotal',
  gst: 'GST',
  discount: 'Discount',
  grandTotal: 'Total',
  thankYou: 'Thank you! Visit Again',
  popupBlocked: 'Unable to open the print window. Please allow pop-ups for this site and try again.',
};

export const printReceipt = async (bill: Bill, labels: Partial<ReceiptLabels> = {}) => {
  const L = { ...defaultLabels, ...labels };

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    toast.error(L.popupBlocked);
    return;
  }

  const rawItems: any[] = (bill as any).items ?? [];

  // Normalise item fields: the bill returned from the API has snake_case
  // keys converted to camelCase (quantity, lineTotal) while store-built
  // BillItem objects use qty and total. Support both shapes.
  const items = rawItems.map((item: any) => ({
    name:      item.productNameEn ?? item.product_name_en ?? '',
    qty:       item.qty        ?? item.quantity  ?? 0,
    unitPrice: item.unitPrice  ?? item.unit_price ?? 0,
    lineTotal: item.total      ?? item.lineTotal  ?? item.line_total ?? 0,
  }));

  const html = `
    <html>
      <head>
        <title>${L.receipt} - ${bill.billNumber}</title>
        <style>
          body { font-family: monospace; width: 80mm; padding: 5mm; }
          .header { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 2mm 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 1mm 0; font-size: 11px; }
          .right { text-align: right; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${L.storeName}</h2>
          <p>${L.receipt}: ${bill.billNumber}</p>
          <p>${L.date}: ${formatDate(bill.createdAt)}</p>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th align="left">${L.item}</th>
              <th align="right">${L.qty}</th>
              <th align="right">${L.price}</th>
              <th align="right">${L.total}</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td align="right">${item.qty}</td>
                <td align="right">${formatCurrency(item.unitPrice)}</td>
                <td align="right">${formatCurrency(item.lineTotal)}</td>
              </tr>
            `).join('') : `<tr><td colspan="4" align="center">-</td></tr>`}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="right">
          <p>${L.subTotal}: ${formatCurrency(bill.subtotal)}</p>
          <p>${L.gst}: ${formatCurrency(bill.gstTotal)}</p>
          <p>${L.discount}: ${formatCurrency(bill.discountTotal)}</p>
          <p class="total">${L.grandTotal}: ${formatCurrency(bill.grandTotal)}</p>
        </div>
        <div class="divider"></div>
        <div class="header">
          <p>${L.thankYou}</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  let closed = false;
  const closeOnce = () => {
    if (closed) return;
    closed = true;
    try {
      if (!printWindow.closed) printWindow.close();
    } catch {
      // window may already be gone
    }
    try { window.focus(); } catch { /* ignore */ }
  };

  printWindow.onload = () => {
    // Give browser a tick to lay out the receipt before printing.
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        closeOnce();
        return;
      }

      // onafterprint fires whether the user prints or cancels in most browsers.
      // matchMedia('print') is a belt-and-suspenders fallback.
      try {
        printWindow.onafterprint = closeOnce;
        const mql = printWindow.matchMedia('print');
        mql.addEventListener?.('change', (e: MediaQueryListEvent) => {
          if (!e.matches) closeOnce();
        });
      } catch {
        // matchMedia/onafterprint unsupported — rely on the timeout below.
      }

      // Safety net: auto-close after 5 s if no browser event fires
      // (covers cases where the user cancels the dialog in non-standard environments).
      setTimeout(closeOnce, 5000);
    }, 250);
  };
};
