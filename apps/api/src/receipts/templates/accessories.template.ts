import { baseReceiptHtml, formatReceiptDate, formatNaira } from './base.template';

interface AccessoriesReceiptData {
  receiptNumber: string;
  receiptDate: Date;
  isVoided: boolean;
  accessorySale: {
    dateSold: Date;
    buyerName: string;
    buyerPhone?: string | null;
    paymentMode: string;
    totalAmount: string | number;
    items: Array<{
      quantity: number;
      unitPrice: string | number;
      subtotal: string | number;
      accessoryItem: { name: string };
    }>;
    customer?: { name: string; phone: string } | null;
  };
}

export function generateAccessoriesHtml(data: AccessoriesReceiptData): string {
  const { accessorySale: sale } = data;

  const itemRows = sale.items.map((item) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;">${item.accessoryItem.name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;">${formatNaira(item.unitPrice)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;text-align:right;font-weight:600;">${formatNaira(item.subtotal)}</td>
    </tr>
  `).join('');

  const body = `
    <div class="section">
      <div class="section-title">Buyer</div>
      <div class="field"><span class="field-label">Name:</span><span class="field-value">${sale.buyerName}</span></div>
      ${sale.buyerPhone ? `<div class="field"><span class="field-label">Phone:</span><span class="field-value">${sale.buyerPhone}</span></div>` : ''}
      <div class="field"><span class="field-label">Date:</span><span class="field-value">${formatReceiptDate(sale.dateSold)}</span></div>
      <div class="field"><span class="field-label">Payment Mode:</span><span class="field-value">${sale.paymentMode}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Items Purchased</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:6px 8px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Item</th>
            <th style="padding:6px 8px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Qty</th>
            <th style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Unit Price</th>
            <th style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div class="amount-box">
      <span class="amount-label">Total Amount Paid</span>
      <span class="amount-value">${formatNaira(sale.totalAmount)}</span>
    </div>
  `;

  const clause = `This receipt confirms the purchase of the listed accessories/items from ZEXT Joint Ventures
Nigeria Limited. All sales are final. No refund on accessories once purchased. Please inspect items
before leaving the premises.`;

  return baseReceiptHtml(
    data.receiptNumber,
    formatReceiptDate(data.receiptDate),
    data.isVoided,
    'Accessories / Bike Sale Receipt',
    body,
    clause,
  );
}
