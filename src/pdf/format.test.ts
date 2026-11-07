import { describe, expect, it } from 'vitest'
import { formatDate, formatIban, formatMoney, sectorNumber } from './format'

describe('форматирование для печати', () => {
  it('дата', () => {
    expect(formatDate('2024-01-31')).toBe('31.01.2024')
    expect(formatDate('')).toBe('')
    expect(formatDate(new Date(2024, 0, 31))).toBe('31.01.2024')
    expect(formatDate(null)).toBe('')
  })

  it('сумма', () => {
    expect(formatMoney(1234567.8)).toBe('1.234.567,80')
    expect(formatMoney(null)).toBe('')
  })

  it('IBAN группами по 4', () => expect(formatIban('RO49AAAA1B31007593840000')).toBe('RO49 AAAA 1B31 0075 9384 0000'))

  it('номер сектора из «satul/sectorul»', () => {
    expect(sectorNumber('Sector 2')).toBe('2')
    expect(sectorNumber('2')).toBe('2')
    expect(sectorNumber('Corbeanca')).toBeUndefined()
  })
})
