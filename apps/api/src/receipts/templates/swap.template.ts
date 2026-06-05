import { baseReceiptHtml, formatReceiptDate, formatNaira } from './base.template';

interface SwapReceiptData {
  receiptNumber: string;
  receiptDate: Date;
  isVoided: boolean;
  swap: {
    dateOfSwap: Date;
    modeOfSwap: string;
    cashDifference?: string | number | null;
    cashDirection?: string | null;
    witnessName: string;
    notes?: string | null;
    outgoingVehicle: {
      name: string;
      chassisNumber: string;
      engineNumber: string;
      colour: string;
      plateNumber?: string | null;
    };
    incomingVehicle: {
      name: string;
      chassisNumber: string;
      engineNumber: string;
      colour: string;
      plateNumber?: string | null;
    };
    customer?: { name: string; phone: string } | null;
  };
}

export function generateSwapHtml(data: SwapReceiptData): string {
  const { swap } = data;
  const og = swap.outgoingVehicle;
  const ic = swap.incomingVehicle;

  const hasCash = swap.cashDifference && parseFloat(String(swap.cashDifference)) > 0;

  const body = `
    <div class="section">
      <div class="section-title">ZEXT Vehicle (Outgoing)</div>
      <div class="field"><span class="field-label">Make / Model:</span><span class="field-value">${og.name}</span></div>
      <div class="field"><span class="field-label">Chassis Number:</span><span class="field-value" style="font-family:monospace">${og.chassisNumber}</span></div>
      <div class="field"><span class="field-label">Engine Number:</span><span class="field-value" style="font-family:monospace">${og.engineNumber}</span></div>
      <div class="field"><span class="field-label">Colour:</span><span class="field-value">${og.colour}</span></div>
      <div class="field"><span class="field-label">Plate Number:</span><span class="field-value">${og.plateNumber ?? 'Not Registered'}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Customer Vehicle (Incoming)</div>
      <div class="field"><span class="field-label">Make / Model:</span><span class="field-value">${ic.name}</span></div>
      <div class="field"><span class="field-label">Chassis Number:</span><span class="field-value" style="font-family:monospace">${ic.chassisNumber}</span></div>
      <div class="field"><span class="field-label">Engine Number:</span><span class="field-value" style="font-family:monospace">${ic.engineNumber}</span></div>
      <div class="field"><span class="field-label">Colour:</span><span class="field-value">${ic.colour}</span></div>
      <div class="field"><span class="field-label">Plate Number:</span><span class="field-value">${ic.plateNumber ?? 'Not Registered'}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Swap Terms</div>
      <div class="field"><span class="field-label">Date of Swap:</span><span class="field-value">${formatReceiptDate(swap.dateOfSwap)}</span></div>
      <div class="field"><span class="field-label">Mode of Swap:</span><span class="field-value">${swap.modeOfSwap.replace(/_/g, ' ')}</span></div>
      ${swap.customer ? `<div class="field"><span class="field-label">Customer:</span><span class="field-value">${swap.customer.name} (${swap.customer.phone})</span></div>` : ''}
      <div class="field"><span class="field-label">Witness:</span><span class="field-value">${swap.witnessName}</span></div>
    </div>
    ${hasCash ? `
    <div class="amount-box">
      <span class="amount-label">Cash Top-Up (${swap.cashDirection === 'CUSTOMER_PAYS' ? 'Customer Pays ZEXT' : 'ZEXT Pays Customer'})</span>
      <span class="amount-value">${formatNaira(swap.cashDifference)}</span>
    </div>` : '<div style="text-align:center;padding:12px;color:#666;font-size:12px;">Direct Swap — No Cash Difference</div>'}
    ${swap.notes ? `<div style="font-size:11px;color:#666;margin-bottom:10px;"><strong>Notes:</strong> ${swap.notes}</div>` : ''}
  `;

  const clause = `Both parties confirm this vehicle exchange as described above. Title to each vehicle transfers
upon signing. ZEXT Joint Ventures Nigeria Limited guarantees clear title to the outgoing vehicle.
The customer acknowledges the condition of the incoming vehicle and accepts it in its current state.
This swap deal is final and binding upon execution.`;

  return baseReceiptHtml(
    data.receiptNumber,
    formatReceiptDate(data.receiptDate),
    data.isVoided,
    'Vehicle Swap Deal Receipt',
    body,
    clause,
  );
}
