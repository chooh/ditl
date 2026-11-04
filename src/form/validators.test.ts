import { describe, expect, it } from 'vitest'
import { isValidCnp, isValidCui, isValidIban, looseEquals, normalizeRomanian, parseMoney, stripCui } from './validators'

describe('isValidCui', () => {
  it('принимает корректные CUI', () => {
    expect(isValidCui('18547290')).toBe(true)
    expect(isValidCui('14399840')).toBe(true)
  })
  it('отклоняет неверную контрольную цифру', () => expect(isValidCui('18547291')).toBe(false))
  it('убирает префикс RO и пробелы', () => expect(stripCui(' RO 185 472 90')).toBe('18547290'))
})

describe('isValidCnp', () => {
  it('принимает корректный CNP', () => expect(isValidCnp('1800101221144')).toBe(true))
  it('отклоняет неверную контрольную цифру', () => expect(isValidCnp('1800101221145')).toBe(false))
})

describe('isValidIban', () => {
  it('принимает корректные IBAN', () => {
    expect(isValidIban('RO49AAAA1B31007593840000')).toBe(true)
    expect(isValidIban('DE89370400440532013000')).toBe(true)
  })
  it('отклоняет неверные контрольные цифры и длину', () => {
    expect(isValidIban('RO48AAAA1B31007593840000')).toBe(false)
    expect(isValidIban('RO49AAAA1B3100759384000')).toBe(false)
  })
})

describe('parseMoney', () => {
  it.each([
    ['1.234.567,89', 1234567.89],
    ['1 234 567,89', 1234567.89],
    ['1234567.89', 1234567.89],
    ['250.000', 250000],
    ['125000 lei', 125000],
    ['0,5', 0.5],
  ])('%s → %d', (input, expected) => expect(parseMoney(input)).toBe(expected))

  it.each(['', 'abc', '1,2,3', '12,345'])('%s → null', (input) => expect(parseMoney(input)).toBeNull())
})

describe('normalizeRomanian', () => {
  it('заменяет седиль на запятую снизу', () => expect(normalizeRomanian('Ştefan Ţurcanu')).toBe('Ștefan Țurcanu'))
  it('приводит к NFC', () => expect(normalizeRomanian('Răzvan')).toBe('Răzvan'))
})

describe('looseEquals', () => {
  it('игнорирует регистр и диакритику', () => expect(looseEquals('ROMÂNIA', 'romania')).toBe(true))
})
