import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney } from './format'

describe('format', () => {
  it('formatDate', () => {
    expect(formatDate('2024-01-31')).toBe('31.01.2024')
    expect(formatDate('')).toBe('')
  })
  it('formatMoney — румынский формат', () => {
    expect(formatMoney(1234567.8)).toBe('1.234.567,80')
    expect(formatMoney(null)).toBe('')
  })
})
