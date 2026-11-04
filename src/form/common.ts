import { z } from 'zod'
import { isValidCnp, isValidCui, isValidIban, looseEquals, normalizeRomanian, parseMoney, stripCui } from './validators'

// Стандартные сообщения Zod — на румынском.
z.config(z.locales.ro())

/** Общие кирпичики схем деклараций ITL 002 и ITL 004. */

export const REQUIRED = 'Câmp obligatoriu'

/** Свободный текст: нормализация диакритики, обрезка пробелов, ограничение длины. */
export const text = (max: number) => z.string().transform(normalizeRomanian).pipe(z.string().trim().max(max))
export const requiredText = (max: number) =>
  z.string().transform(normalizeRomanian).pipe(z.string().trim().min(1, REQUIRED).max(max))

export const date = z.iso.date('Introduceți data')
export const optionalDate = z.union([z.literal(''), date])
export const pastDate = date.refine((d) => d <= todayIso(), 'Data nu poate fi în viitor')

export const email = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), z.email('Adresă de e-mail invalidă')]))

export const phone = z
  .string()
  .trim()
  .refine((s) => s === '' || (/^[+()\d\s./-]+$/.test(s) && s.replace(/\D/g, '').length >= 6), 'Număr de telefon invalid')
  .pipe(z.string().max(40))

/** Число в румынской записи («1.250,50») → number; пустое поле → null. */
const decimal = (message: string) =>
  z.string().transform((s, ctx) => {
    if (!s.trim()) return null
    const n = parseMoney(s)
    if (n === null) {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
    return n
  })

/** Сумма в леях. */
export const money = decimal('Sumă invalidă, de ex. 125.000,50')
/** Площадь в м². */
export const area = decimal('Suprafață invalidă, de ex. 1.250,50')

/** Выбор из radio-группы: пока ничего не выбрано, значение — пустая строка. */
export const choice = <T extends string>(values: readonly T[], message: string) =>
  z
    .string()
    .refine((v) => (values as readonly string[]).includes(v), message)
    .transform((v) => v as T)

export const cui = z
  .string()
  .transform(stripCui)
  .refine((s) => s.length > 0, REQUIRED)
  .refine((s) => s === '' || isValidCui(s), 'CUI invalid (cifra de control nu corespunde)')

export const cnp = z
  .string()
  .transform((s) => s.replace(/\s/g, ''))
  .refine((s) => s === '' || isValidCnp(s), 'CNP invalid (cifra de control nu corespunde)')

export const iban = z
  .string()
  .transform((s) => s.replace(/\s/g, '').toUpperCase())
  .refine((s) => s === '' || isValidIban(s), 'IBAN invalid')

/** Все поля адреса; какие из них есть в конкретном разделе бланка — решает форма и шаблон. */
export const address = z.object({
  strada: text(80),
  nr: text(10),
  codPostal: text(10),
  bloc: text(10),
  scara: text(10),
  etaj: text(5),
  apartament: text(10),
  localitate: text(60),
  judet: text(40),
  tara: text(40),
})
export type Address = z.output<typeof address>
export type AddressInput = z.input<typeof address>

export const emptyAddress = (tara = ''): AddressInput => ({
  strada: '',
  nr: '',
  codPostal: '',
  bloc: '',
  scara: '',
  etaj: '',
  apartament: '',
  localitate: '',
  judet: '',
  tara,
})

/**
 * Реквизиты юрлица, одинаковые в ITL 002 и ITL 004: при «той же фирме» они
 * переносятся в новую декларацию любого типа.
 */
export const taxpayerShape = {
  denumire: requiredText(150),
  cui,
  telefon: phone,
  email,
  sediu: address,
  comunicareEmail: choice(['da', 'nu'] as const, 'Alegeți DA sau NU'),
}

export const emptyTaxpayer = () => ({
  denumire: '',
  cui: '',
  telefon: '',
  email: '',
  sediu: emptyAddress('România'),
  comunicareEmail: '',
})

/** Документ, удостоверяющий личность подписанта. */
export const identityShape = {
  tip: requiredText(15),
  serie: text(6),
  numar: requiredText(12),
}

export const MAX_ANNEXES = 9

export const annexes = z
  .array(z.object({ denumire: text(70) }))
  .max(MAX_ANNEXES)
  .transform((list) => list.map((a) => a.denumire).filter(Boolean))

type Path = (string | number)[]

/** Межполевые проверки, общие для деклараций. */
export function checks(ctx: z.RefinementCtx) {
  const require = (value: string, path: Path) => {
    if (!value) ctx.addIssue({ code: 'custom', message: REQUIRED, path })
  }
  const checkPostalCode = (a: Address, path: Path, country = a.tara) => {
    const romanian = !country || looseEquals(country, 'România')
    if (a.codPostal && romanian && !/^\d{6}$/.test(a.codPostal)) {
      ctx.addIssue({ code: 'custom', message: 'Codul poștal are 6 cifre', path: [...path, 'codPostal'] })
    }
  }
  /** Обязательные поля юрлица: адрес и e-mail при согласии на электронную переписку. */
  const checkTaxpayer = (c: { sediu: Address; email: string; comunicareEmail: string }) => {
    require(c.sediu.strada, ['contribuabil', 'sediu', 'strada'])
    require(c.sediu.nr, ['contribuabil', 'sediu', 'nr'])
    require(c.sediu.localitate, ['contribuabil', 'sediu', 'localitate'])
    require(c.sediu.judet, ['contribuabil', 'sediu', 'judet'])
    checkPostalCode(c.sediu, ['contribuabil', 'sediu'])
    if (c.comunicareEmail === 'da' && !c.email) {
      ctx.addIssue({ code: 'custom', message: 'Necesară pentru comunicarea prin e-mail', path: ['contribuabil', 'email'] })
    }
  }
  return { require, checkPostalCode, checkTaxpayer }
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
