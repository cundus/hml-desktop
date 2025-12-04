/**
 * Format currency as Indonesian Rupiah without decimals
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "Rp 50.000")
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

/**
 * Format currency as Indonesian Rupiah without decimals (alias for consistency)
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "Rp 50.000")
 */
export const formatIDR = formatCurrency

/**
 * Parse a formatted currency string back to number
 * @param formatted - The formatted currency string (e.g., "Rp 50.000")
 * @returns The numeric value
 */
export function parseCurrency(formatted: string): number {
  // Remove currency symbol, dots, and convert to number
  const cleaned = formatted
    .replace(/[^\d,-]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
  return parseFloat(cleaned) || 0
}
