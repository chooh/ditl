import { isoDate } from '../form/common'

/** 2024-01-31 или Date → 31.01.2024; пустая строка и null — пустая строка. */
export function formatDate(value: string | Date | null): string {
  if (!value) return ''
  const [y, m, d] = (value instanceof Date ? isoDate(value) : value).split('-')
  return `${d}.${m}.${y}`
}

const decimal = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1234567.8 → 1.234.567,80 */
export function formatMoney(value: number | null): string {
  return value === null ? '' : decimal.format(value)
}

/** Площадь в м² — в том же виде, что и суммы. */
export const formatArea = formatMoney

/** RO49AAAA1B31007593840000 → RO49 AAAA 1B31 0075 9384 0000 */
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, '$1 ')
}

/**
 * «Satul/sectorul» объекта → номер сектора Бухареста, если это сектор:
 * «Sector 2», «sectorul 2», «2» → «2»; село — undefined.
 */
export function sectorNumber(district: string): string | undefined {
  return /^(?:sector(?:ul)?\s*)?(\d)$/i.exec(district.trim())?.[1]
}
