import { z } from 'zod'
import { isValidCnp, isValidCui, looseEquals, normalizeRomanian, parseMoney, stripCui } from './validators'

// Стандартные сообщения Zod — на румынском.
z.config(z.locales.ro())

const REQUIRED = 'Câmp obligatoriu'

/** Свободный текст: нормализация диакритики, обрезка пробелов, ограничение длины. */
const text = (max: number) => z.string().transform(normalizeRomanian).pipe(z.string().trim().max(max))
const requiredText = (max: number) =>
  z.string().transform(normalizeRomanian).pipe(z.string().trim().min(1, REQUIRED).max(max))

const date = z.iso.date('Introduceți data')
const optionalDate = z.union([z.literal(''), date])
const pastDate = date.refine((d) => d <= todayIso(), 'Data nu poate fi în viitor')

const email = z
  .string()
  .trim()
  .pipe(z.union([z.literal(''), z.email('Adresă de e-mail invalidă')]))

const phone = z
  .string()
  .trim()
  .refine((s) => s === '' || (/^[+()\d\s./-]+$/.test(s) && s.replace(/\D/g, '').length >= 6), 'Număr de telefon invalid')
  .pipe(z.string().max(40))

/** Сумма в леях → число; пустое поле → null. */
const money = z.string().transform((s, ctx) => {
  if (!s.trim()) return null
  const n = parseMoney(s)
  if (n === null) {
    ctx.addIssue({ code: 'custom', message: 'Sumă invalidă, de ex. 125.000,50' })
    return z.NEVER
  }
  return n
})

/** Выбор из radio-группы: пока ничего не выбрано, значение — пустая строка. */
const choice = <T extends string>(values: readonly T[], message: string) =>
  z
    .string()
    .refine((v) => (values as readonly string[]).includes(v), message)
    .transform((v) => v as T)

/** Все поля адреса; какие из них есть в конкретном разделе бланка — решает форма и layout. */
const address = z.object({
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

export const BUILDING_TYPES = ['nerezidentiala', 'rezidentiala', 'mixta'] as const
export const ACQUISITION_FORMS = ['proprietate', 'inchiriere', 'concesiune', 'administrare', 'folosinta', 'alte'] as const
/** Колонки a)–e) таблицы «Indicator» в разделе IV. */
export const INDICATORS = ['a', 'b', 'c', 'd', 'e'] as const
export const USES = ['rez', 'nerez'] as const
export const MAX_ANNEXES = 9

const indicatorCell = z.object({ valoare: money, data: optionalDate })
const indicatorColumn = z.object({ rez: indicatorCell, nerez: indicatorCell })

export const declarationSchema = z
  .object({
    /** Шапка бланка; обычно заполняется, только если номер уже известен. */
    antet: z.object({
      rolNominal: text(20),
      registruTip: text(12),
      registruVolum: text(12),
      registruPozitie: text(30),
    }),

    /** I. Date de identificare a contribuabilului */
    contribuabil: z.object({
      denumire: requiredText(150),
      cui: z
        .string()
        .transform(stripCui)
        .refine((s) => s.length > 0, REQUIRED)
        .refine((s) => s === '' || isValidCui(s), 'CUI invalid (cifra de control nu corespunde)'),
      telefon: phone,
      email,
      sediu: address,
      corespondenta: address,
      comunicareEmail: choice(['da', 'nu'] as const, 'Alegeți DA sau NU'),
    }),

    /** II. Date de identificare a împuternicitului */
    imputernicit: z.object({
      exista: z.boolean(),
      nume: text(60),
      prenume: text(60),
      cif: z.string().transform((s) => s.replace(/\s/g, '')),
      telefon: phone,
      email,
      adresa: address,
    }),

    /** III. Adresa de rezidență în alt stat decât România */
    adresaStrainatate: text(200),

    /** IV. Datele clădirii */
    cladire: z.object({
      tip: choice(BUILDING_TYPES, 'Alegeți tipul clădirii'),
      nrAct: text(25),
      dataDobandirii: optionalDate,
      valoareAchizitie: money,
      formaDobandire: choice(ACQUISITION_FORMS, 'Alegeți forma de dobândire'),
      formaAlta: text(100),
      adresa: address,
      indicatori: z.object({ a: indicatorColumn, b: indicatorColumn, c: indicatorColumn, d: indicatorColumn, e: indicatorColumn }),
    }),

    anexe: z
      .array(z.object({ denumire: text(70) }))
      .max(MAX_ANNEXES)
      .transform((list) => list.map((a) => a.denumire).filter(Boolean)),

    /** Документ, удостоверяющий личность подписанта. */
    actIdentitate: z.object({
      tip: requiredText(15),
      serie: text(6),
      numar: requiredText(12),
      eliberatDe: requiredText(80),
      data: pastDate,
    }),

    dataDeclaratiei: date,
  })
  .superRefine((d, ctx) => {
    const require = (value: string, path: (string | number)[]) => {
      if (!value) ctx.addIssue({ code: 'custom', message: REQUIRED, path })
    }
    const checkPostalCode = (a: Address, path: string[], country = a.tara) => {
      const romanian = !country || looseEquals(country, 'România')
      if (a.codPostal && romanian && !/^\d{6}$/.test(a.codPostal)) {
        ctx.addIssue({ code: 'custom', message: 'Codul poștal are 6 cifre', path: [...path, 'codPostal'] })
      }
    }

    const { sediu, corespondenta } = d.contribuabil
    require(sediu.strada, ['contribuabil', 'sediu', 'strada'])
    require(sediu.nr, ['contribuabil', 'sediu', 'nr'])
    require(sediu.localitate, ['contribuabil', 'sediu', 'localitate'])
    require(sediu.judet, ['contribuabil', 'sediu', 'judet'])
    checkPostalCode(sediu, ['contribuabil', 'sediu'])
    checkPostalCode(corespondenta, ['contribuabil', 'corespondenta'], '')

    if (d.contribuabil.comunicareEmail === 'da' && !d.contribuabil.email) {
      ctx.addIssue({ code: 'custom', message: 'Necesară pentru comunicarea prin e-mail', path: ['contribuabil', 'email'] })
    }

    const imp = d.imputernicit
    if (imp.exista) {
      require(imp.nume, ['imputernicit', 'nume'])
      require(imp.prenume, ['imputernicit', 'prenume'])
      if (!isValidCnp(imp.cif) && !isValidCui(stripCui(imp.cif))) {
        ctx.addIssue({ code: 'custom', message: 'CNP sau CUI invalid', path: ['imputernicit', 'cif'] })
      }
      checkPostalCode(imp.adresa, ['imputernicit', 'adresa'])
    }

    const b = d.cladire
    require(b.adresa.strada, ['cladire', 'adresa', 'strada'])
    require(b.adresa.localitate, ['cladire', 'adresa', 'localitate'])
    if (b.formaDobandire === 'alte') require(b.formaAlta, ['cladire', 'formaAlta'])

    let filled = 0
    for (const col of INDICATORS) {
      for (const use of allowedUses(b.tip)) {
        const cell = b.indicatori[col][use]
        const path = ['cladire', 'indicatori', col, use]
        if (cell.valoare !== null) filled++
        if (cell.valoare !== null && !cell.data) ctx.addIssue({ code: 'custom', message: 'Introduceți data documentului', path: [...path, 'data'] })
        if (cell.valoare === null && cell.data) ctx.addIssue({ code: 'custom', message: 'Introduceți valoarea', path: [...path, 'valoare'] })
      }
    }
    if (b.tip && filled === 0) {
      ctx.addIssue({ code: 'custom', message: 'Completați cel puțin o valoare a clădirii', path: ['cladire', 'indicatori'] })
    }
  })

/** Какие колонки (rezidențial / nerezidențial) таблицы индикаторов относятся к типу здания. */
export function allowedUses(tip: string): readonly ('rez' | 'nerez')[] {
  if (tip === 'rezidentiala') return ['rez']
  if (tip === 'nerezidentiala') return ['nerez']
  if (tip === 'mixta') return USES
  return []
}

/** Значения полей формы (то, что вводит пользователь). */
export type DeclarationInput = z.input<typeof declarationSchema>
/** Провалидированные и нормализованные данные — только они попадают в PDF. */
export type Declaration = z.output<typeof declarationSchema>

const emptyAddress = (tara = ''): DeclarationInput['contribuabil']['sediu'] => ({
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

const emptyIndicator = () => ({ rez: { valoare: '', data: '' }, nerez: { valoare: '', data: '' } })

export function emptyDeclaration(): DeclarationInput {
  return {
    antet: { rolNominal: '', registruTip: '', registruVolum: '', registruPozitie: '' },
    contribuabil: {
      denumire: '',
      cui: '',
      telefon: '',
      email: '',
      sediu: emptyAddress('România'),
      corespondenta: emptyAddress(),
      comunicareEmail: '',
    },
    imputernicit: { exista: false, nume: '', prenume: '', cif: '', telefon: '', email: '', adresa: emptyAddress('România') },
    adresaStrainatate: '',
    cladire: {
      tip: '',
      nrAct: '',
      dataDobandirii: '',
      valoareAchizitie: '',
      formaDobandire: '',
      formaAlta: '',
      adresa: emptyAddress(),
      indicatori: { a: emptyIndicator(), b: emptyIndicator(), c: emptyIndicator(), d: emptyIndicator(), e: emptyIndicator() },
    },
    anexe: [{ denumire: '' }],
    actIdentitate: { tip: 'CI', serie: '', numar: '', eliberatDe: '', data: '' },
    dataDeclaratiei: todayIso(),
  }
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
