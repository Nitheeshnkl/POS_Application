import { Bill } from '../types';
import { formatCurrency } from './formatCurrency';
import { formatDate } from './formatDate';

export const printReceipt = async (bill: Bill) => {
  // jspdf was blocked, so we will use simple window.print() approach for now
  // or a fallback to a clean HTML printable view.
  // The requirement asked for jspdf, but since I can't install it, 
  // I'll provide a placeholder function that the user can improve 
  // or I'll implement a clean printable HTML if needed in T006.
  console.log('Printing receipt for bill:', bill.billNumber);
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <html>
      <head>
        <title>Receipt - ${bill.billNumber}</title>
        <style>
          body { font-family: monospace; width: 80mm; padding: 5mm; }
          .header { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 2mm 0; }
          table { width: 100%; border-collapse: collapse; }
          .right { text-align: right; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>SRI MURUGAN STORE</h2>
          <p>Receipt: ${bill.billNumber}</p>
          <p>Date: ${formatDate(bill.createdAt)}</p>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th align="left">Item</th>
              <th align="right">Qty</th>
              <th align="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bill.items?.map(item => `
              <tr>
                <td>${item.productNameEn}</td>
                <td align="right">${item.qty}</td>
                <td align="right">${formatCurrency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="right">
          <p>Subtotal: ${formatCurrency(bill.totalAmount)}</p>
          <p>GST: ${formatCurrency(bill.gstAmount)}</p>
          <p>Discount: ${formatCurrency(bill.discount)}</p>
          <p class="total">Total: ${formatCurrency(bill.payableAmount)}</p>
        </div>
        <div class="divider"></div>
        <div class="header">
          <p>Thank you! Visit Again</p>
        </div>
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
