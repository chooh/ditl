/** 2024-01-31 → 31.01.2024; пустая строка остаётся пустой. */
export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const money = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1234567.8 → 1.234.567,80 */
export function formatMoney(value: number | null): string {
  return value === null ? '' : money.format(value)
}
