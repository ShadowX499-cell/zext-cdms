/** Format a number as Nigerian Naira: ₦ 1,234,567 */
export function formatNaira(amount: number | string | null | undefined): string {
  if (amount == null) return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₦ ${num.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Format a date as DD/MM/YYYY (Nigerian convention) */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB');
}

/** Format a Nigerian phone number to +234 format */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  return phone;
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;
}

/** Pad a number to N digits (for receipt sequence display) */
export function padSeq(seq: number, digits = 4): string {
  return String(seq).padStart(digits, '0');
}
