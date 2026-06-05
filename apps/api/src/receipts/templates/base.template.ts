export function baseReceiptHtml(
  receiptNumber: string,
  receiptDate: string,
  isVoided: boolean,
  title: string,
  bodyContent: string,
  clause: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding:32px 40px; color:#111; background:#fff; font-size:13px; }
  .void-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-30deg);
    font-size:110px; font-weight:900; color:rgba(220,38,38,0.10); pointer-events:none; letter-spacing:0.15em; z-index:0; }
  .header { text-align:center; border-bottom:2px solid #111; padding-bottom:14px; margin-bottom:20px; }
  .wordmark { font-size:26px; font-weight:900; letter-spacing:-0.04em; color:#111; }
  .wordmark span { color:#ef4444; }
  .company-info { font-size:11px; color:#555; margin-top:3px; line-height:1.5; }
  .receipt-title { font-size:14px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; margin-top:8px; }
  .meta-row { display:flex; justify-content:space-between; margin-bottom:18px; font-size:12px; }
  .meta-item { color:#555; } .meta-item strong { color:#111; }
  .section { margin-bottom:14px; }
  .section-title { font-weight:700; font-size:10px; text-transform:uppercase; letter-spacing:0.09em;
    color:#888; border-bottom:1px solid #ddd; padding-bottom:3px; margin-bottom:8px; }
  .field { display:flex; margin-bottom:5px; }
  .field-label { color:#666; min-width:150px; font-size:12px; }
  .field-value { font-weight:600; color:#111; font-size:12px; }
  .amount-box { background:#f5f5f5; border:1px solid #ddd; border-radius:4px; padding:10px 14px;
    display:flex; justify-content:space-between; align-items:center; margin:16px 0; }
  .amount-label { font-size:12px; color:#555; font-weight:600; }
  .amount-value { font-size:20px; font-weight:900; color:#111; }
  .clause { font-size:10px; color:#777; border-top:1px solid #eee; padding-top:10px; margin-top:16px; line-height:1.5; }
  .signatures { display:flex; justify-content:space-between; margin-top:36px; }
  .sig-block { text-align:center; }
  .sig-line { border-top:1px solid #111; width:180px; padding-top:5px; font-size:11px; color:#555; }
</style>
</head>
<body>
  ${isVoided ? '<div class="void-watermark">VOID</div>' : ''}
  <div class="header">
    <div class="wordmark">ZE<span>X</span>T</div>
    <div class="company-info">
      ZEXT Joint Ventures Nigeria Limited<br>
      Abuja, Federal Capital Territory, Nigeria<br>
      info@zextjv.com | +234 800 000 0000
    </div>
    <div class="receipt-title">${title}</div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><strong>Receipt No:</strong> ${receiptNumber}</div>
    <div class="meta-item"><strong>Date:</strong> ${receiptDate}</div>
    ${isVoided ? '<div style="color:#dc2626;font-weight:700;font-size:12px;">⚠ VOIDED</div>' : ''}
  </div>
  ${bodyContent}
  <div class="clause">${clause}</div>
  <div class="signatures">
    <div class="sig-block"><div class="sig-line">ZEXT Joint Ventures (Seller)</div></div>
    <div class="sig-block"><div class="sig-line">Buyer Signature &amp; Date</div></div>
    <div class="sig-block"><div class="sig-line">Witness</div></div>
  </div>
</body>
</html>`;
}

export function formatReceiptDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatNaira(amount: string | number | null | undefined): string {
  if (amount == null) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦ ${num.toLocaleString('en-NG')}`;
}
