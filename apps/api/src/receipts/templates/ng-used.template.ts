import { baseReceiptHtml, formatReceiptDate, formatNaira } from './base.template';

interface NgUsedReceiptData {
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
      category: string;
    };
  };
}

export function generateNgUsedHtml(data: NgUsedReceiptData): string {
  const { sale } = data;
  const v = sale.vehicle;

  const body = `
    <div class="section">
      <div class="section-title">Vehicle Details</div>
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

  const clause = `This vehicle is sold in its current condition as seen and inspected by the buyer.
This is a Nigerian-used vehicle. ZEXT Joint Ventures Nigeria Limited makes no warranty, express or implied,
regarding the mechanical condition of the vehicle. The buyer acknowledges having fully inspected the vehicle
and accepts responsibility for all mechanical issues discovered after the date of purchase.
This receipt serves as proof of ownership transfer.`;

  return baseReceiptHtml(
    data.receiptNumber,
    formatReceiptDate(data.receiptDate),
    data.isVoided,
    'Nigerian Used Vehicle Sale Receipt',
    body,
    clause,
  );
}
