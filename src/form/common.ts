import { z } from 'zod'
import { isValidCnp, isValidCui, isValidIban, looseEquals, normalizeRomanian, parseMoney, stripCui } from './validators'

// Стандартные сообщения Zod — на румынском.
z.config(z.locales.ro())

/** Общие кирпичики схемы досье. */

export const REQUIRED = 'Câmp obligatoriu'

/** Свободный текст: нормализация диакритики, обрезка пробелов, ограничение длины. */
export const text = (max: number) => z.string().transform(normalizeRomanian).pipe(z.string().trim().max(max))
export const requiredText = (max: number) =>
  z.string().transform(normalizeRomanian).pipe(z.string().trim().min(1, REQUIRED).max(max))

/** Дата как в <input type="date">: «2024-01-31». */
export const date = z.iso.date('Introduceți data')
export const optionalDate = z.union([z.literal(''), date])
export const pastDate = date.refine((d) => d <= todayIso(), 'Data nu poate fi în viitor')

/** «2024-01-31» → Date, локальная полночь (new Date(iso) дал бы полночь UTC). */
export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

/** Date → «2024-01-31» по местному времени. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const todayIso = () => isoDate(new Date())

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

/** CIF юрлица — CUI, у плательщика НДС с префиксом RO; префикс сохраняется, как введён. */
export const cif = z
  .string()
  .transform((s) => s.replace(/[\s.-]/g, '').toUpperCase())
  .refine((s) => s.length > 0, REQUIRED)
  .refine((s) => s === '' || isValidCui(stripCui(s)), 'CIF invalid (cifra de control nu corespunde)')

export const cnp = z
  .string()
  .transform((s) => s.replace(/\s/g, ''))
  .refine((s) => s === '' || isValidCnp(s), 'CNP invalid (cifra de control nu corespunde)')

export const iban = z
  .string()
  .transform((s) => s.replace(/\s/g, '').toUpperCase())
  .refine((s) => s === '' || isValidIban(s), 'IBAN invalid')

/** Почтовый адрес: все поля; какие из них показывать — решает форма. */
export const address = z.object({
  street: text(80), // strada
  number: text(10), // nr.
  postalCode: text(10), // cod poștal
  block: text(10), // bloc
  entrance: text(10), // scara
  floor: text(5), // etaj
  apartment: text(10), // apartament
  locality: text(60), // localitatea
  county: text(40), // județul / sectorul
  country: text(40), // țara
})
export type Address = z.output<typeof address>
export type AddressInput = z.input<typeof address>

export const emptyAddress = (country = ''): AddressInput => ({
  street: '',
  number: '',
  postalCode: '',
  block: '',
  entrance: '',
  floor: '',
  apartment: '',
  locality: '',
  county: '',
  country,
})

/** На бланке ITL 002 — девять строк приложений; столько же разрешаем в каждом списке. */
export const MAX_ATTACHMENTS = 9

/** Приложения (anexe): в форме — строки списка, в данных — только непустые названия. */
export const attachments = z
  .array(z.object({ name: text(70) }))
  .max(MAX_ATTACHMENTS)
  .transform((list) => list.map((a) => a.name).filter(Boolean))

export const emptyAttachments = () => [{ name: '' }]

type Path = (string | number)[]

/** Межполевые проверки. */
export function checks(ctx: z.RefinementCtx) {
  const require = (value: string, path: Path) => {
    if (!value) ctx.addIssue({ code: 'custom', message: REQUIRED, path })
  }
  const checkPostalCode = (a: Address, path: Path, country = a.country) => {
    const romanian = !country || looseEquals(country, 'România')
    if (a.postalCode && romanian && !/^\d{6}$/.test(a.postalCode)) {
      ctx.addIssue({ code: 'custom', message: 'Codul poștal are 6 cifre', path: [...path, 'postalCode'] })
    }
  }
  return { require, checkPostalCode }
}
