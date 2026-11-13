/**
 * Приводит румынский текст к стандартному виду: NFC (macOS может отдавать «ă» как
 * «a» + комбинирующий знак) и ș/ț с запятой снизу вместо устаревших ş/ţ с седилью,
 * которые до сих пор вводят многие раскладки.
 */
export function normalizeRomanian(s: string): string {
  return s.normalize('NFC').replace(/[şŞţŢ]/g, (c) => ({ ş: 'ș', Ş: 'Ș', ţ: 'ț', Ţ: 'Ț' })[c]!)
}

/**
 * Этаж: «parter» → «P», «mansardă» → «M», «demisol» → «D», «subsol 2», «ss2» → «SS 2»;
 * остальное — без пробелов по краям, заглавными.
 */
export function normalizeFloor(s: string): string {
  const t = s.normalize('NFC').trim().toUpperCase()
  const word = ({ PARTER: 'P', MANSARDĂ: 'M', MANSARDA: 'M', DEMISOL: 'D' } as Record<string, string>)[t]
  if (word) return word
  const basement = /^(?:SS|SUBSOL(?:UL)?)\s*(\d*)$/.exec(t)
  if (basement) return basement[1] ? `SS ${basement[1]}` : 'SS'
  return t
}

/** CUI/CIF юрлица: 2–10 цифр, последняя — контрольная (ключ 753217532). */
export function isValidCui(digits: string): boolean {
  if (!/^\d{2,10}$/.test(digits)) return false
  const body = digits.slice(0, -1).padStart(9, '0')
  const key = '753217532'
  const sum = [...body].reduce((acc, d, i) => acc + Number(d) * Number(key[i]), 0)
  const check = ((sum * 10) % 11) % 10
  return check === Number(digits.at(-1))
}

/** CNP физлица: 13 цифр, последняя — контрольная (ключ 279146358279). */
export function isValidCnp(digits: string): boolean {
  if (!/^[1-9]\d{12}$/.test(digits)) return false
  const key = '279146358279'
  const sum = [...digits.slice(0, 12)].reduce((acc, d, i) => acc + Number(d) * Number(key[i]), 0)
  const check = sum % 11 === 10 ? 1 : sum % 11
  return check === Number(digits[12])
}

/** IBAN без пробелов, заглавными: страна, контрольные цифры (mod 97), счёт; румынский — 24 знака. */
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  if (iban.startsWith('RO') && iban.length !== 24) return false
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55))
  // Остаток по частям: число слишком длинное для Number.
  return [...digits].reduce((rem, d) => (rem * 10 + Number(d)) % 97, 0) === 1
}

/** «RO 123 456 78» → «12345678». */
export function stripCui(s: string): string {
  return s.replace(/^\s*RO/i, '').replace(/[\s.-]/g, '')
}

/**
 * Сумма в леях, как её вводят в Румынии или «по-компьютерному»:
 * «1.234.567,89», «1 234 567,89», «1234567.89», «1234567». Возвращает null, если не число.
 */
export function parseMoney(input: string): number | null {
  let s = input.replace(/[\s ]/g, '').replace(/lei$/i, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) ?? []).length > 1 || /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Number(s)
}

/** Сравнение названий без учёта регистра и диакритики: «Romania» = «ROMÂNIA». */
export function looseEquals(a: string, b: string): boolean {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
  return norm(a) === norm(b)
}
