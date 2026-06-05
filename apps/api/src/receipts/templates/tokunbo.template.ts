import { baseReceiptHtml, formatReceiptDate, formatNaira } from './base.template';

interface TokunboReceiptData {
  receiptNumber: string;
  receiptDate: Date;
  isVoided: boolean;
  sale: {
    dateSold: Date;
    buyerName: string;
    buyerPhone: string;
    buyerAddress: string;
    witnessName: string;
    sellingPrice: string | number;
    modeOfSale: string;
    notes?: string | null;
    vehicle: {
      name: string;
      chassisNumber: string;
      engineNumber: string;
      plateNumber?: string | null;
      colour: string;
      ownerName: string;
    };
  };
}

export function generateTokunboHtml(data: TokunboReceiptData): string {
  const { sale } = data;
  const v = sale.vehicle;

  const body = `
    <div class="section">
      <div class="section-title">Vehicle Details (Foreign-Used / Tokunbo)</div>
      <div class="field"><span class="field-label">Make / Model:</span><span class="field-value">${v.name}</span></div>
      <div class="field"><span class="field-label">Chassis Number:</span><span class="field-value" style="font-family:monospace">${v.chassisNumber}</span></div>
      <div class="field"><span class="field-label">Engine Number:</span><span class="field-value" style="font-family:monospace">${v.engineNumber}</span></div>
      <div class="field"><span class="field-label">Colour:</span><span class="field-value">${v.colour}</span></div>
      <div class="field"><span class="field-label">Plate Number:</span><span class="field-value">${v.plateNumber ?? 'Not Registered'}</span></div>
      <div class="field"><span class="field-label">Previous Owner:</span><span class="field-value">${v.ownerName}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Buyer Information</div>
      <div class="field"><span class="field-label">Buyer Name:</span><span class="field-value">${sale.buyerName}</span></div>
      <div class="field"><span class="field-label">Phone:</span><span class="field-value">${sale.buyerPhone}</span></div>
      <div class="field"><span class="field-label">Address:</span><span class="field-value">${sale.buyerAddress}</span></div>
      <div class="field"><span class="field-label">Date of Sale:</span><span class="field-value">${formatReceiptDate(sale.dateSold)}</span></div>
      <div class="field"><span class="field-label">Mode of Sale:</span><span class="field-value">${sale.modeOfSale.replace('_', ' ')}</span></div>
      <div class="field"><span class="field-label">Witness:</span><span class="field-value">${sale.witnessName}</span></div>
    </div>
    <div class="amount-box">
      <span class="amount-label">Total Amount Paid</span>
      <span class="amount-value">${formatNaira(sale.sellingPrice)}</span>
    </div>
    ${sale.notes ? `<div style="font-size:11px;color:#666;margin-bottom:10px;"><strong>Notes:</strong> ${sale.notes}</div>` : ''}
  `;

  const clause = `This vehicle is a foreign-used (Tokunbo) vehicle imported from abroad. The buyer confirms
having physically inspected the vehicle and accepts it in its current condition. ZEXT Joint Ventures Nigeria
Limited warrants clear title to this vehicle but makes no warranty regarding mechanical or electrical systems.
The buyer acknowledges full understanding of the import history and accepts all liabilities associated with
the vehicle after the date of sale. This receipt is valid proof of ownership transfer.`;

  return baseReceiptHtml(
    data.receiptNumber,
    formatReceiptDate(data.receiptDate),
    data.isVoided,
    'Foreign-Used (Tokunbo) Vehicle Sale Receipt',
    body,
    clause,
  );
}
