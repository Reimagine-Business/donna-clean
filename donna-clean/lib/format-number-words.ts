/**
 * Converts numbers to Indian numbering system words (Lakhs and Thousands)
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertTwoDigits(num: number): string {
  if (num === 0) return '';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];

  const tenDigit = Math.floor(num / 10);
  const oneDigit = num % 10;

  return tens[tenDigit] + (oneDigit > 0 ? '-' + ones[oneDigit] : '');
}

/**
 * Formats an amount into words using Indian numbering system
 * Examples:
 *   2914500 → "Twenty-Nine Lakhs"
 *   75000 → "Seventy-Five Thousand"
 *   500 → "Five Hundred"
 */
export function formatAmountInWords(amount: number): string {
  const absAmount = Math.abs(Math.floor(amount));

  if (absAmount === 0) return 'Zero';

  // Indian numbering: Crores (10,000,000) → Lakhs (100,000) → Thousands (1,000) → Hundreds (100)
  const crores = Math.floor(absAmount / 10000000);
  const lakhs = Math.floor((absAmount % 10000000) / 100000);
  const thousands = Math.floor((absAmount % 100000) / 1000);
  const hundreds = Math.floor((absAmount % 1000) / 100);
  const remainder = absAmount % 100;

  const parts: string[] = [];

  if (crores > 0) {
    parts.push(convertTwoDigits(crores) + ' Crore' + (crores > 1 ? 's' : ''));
  }

  if (lakhs > 0) {
    parts.push(convertTwoDigits(lakhs) + ' Lakh' + (lakhs > 1 ? 's' : ''));
  }

  if (thousands > 0) {
    parts.push(convertTwoDigits(thousands) + ' Thousand');
  }

  if (hundreds > 0) {
    parts.push(ones[hundreds] + ' Hundred');
  }

  if (remainder > 0) {
    parts.push(convertTwoDigits(remainder));
  }

  return parts.join(' ');
}

/**
 * Formats currency with INR symbol and returns both formatted currency and words
 * Examples:
 *   2914500 → { formatted: "₹29,14,500", words: "Twenty-Nine Lakhs" }
 *   75000 → { formatted: "₹75,000", words: "Seventy-Five Thousand" }
 */
export function formatCurrencyWithWords(amount: number): { formatted: string; words: string } {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);

  const words = formatAmountInWords(amount);

  return { formatted, words };
}

/**
 * Shorter version: only shows the main unit (Lakhs or Thousands)
 * Examples:
 *   2914500 → "29 Lakhs"
 *   75000 → "75 Thousand"
 *   500 → "500"
 */
export function formatAmountInWordsShort(amount: number): string {
  const absAmount = Math.abs(Math.floor(amount));

  if (absAmount === 0) return 'Zero';

  // Crores
  if (absAmount >= 10000000) {
    const crores = (absAmount / 10000000).toFixed(1);
    return crores.endsWith('.0') ? crores.slice(0, -2) + ' Crores' : crores + ' Crores';
  }

  // Lakhs
  if (absAmount >= 100000) {
    const lakhs = (absAmount / 100000).toFixed(1);
    return lakhs.endsWith('.0') ? lakhs.slice(0, -2) + ' Lakhs' : lakhs + ' Lakhs';
  }

  // Thousands
  if (absAmount >= 1000) {
    const thousands = (absAmount / 1000).toFixed(1);
    return thousands.endsWith('.0') ? thousands.slice(0, -2) + ' Thousand' : thousands + ' Thousand';
  }

  // Below 1000
  return absAmount.toString();
}
