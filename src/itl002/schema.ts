import { z } from 'zod'
import {
  address,
  annexes,
  checks,
  choice,
  date,
  email,
  emptyAddress,
  emptyTaxpayer,
  identityShape,
  money,
  optionalDate,
  pastDate,
  phone,
  requiredText,
  taxpayerShape,
  text,
  todayIso,
} from '../form/common'
import { isValidCnp, isValidCui, stripCui } from '../form/validators'

export const BUILDING_TYPES = ['nerezidentiala', 'rezidentiala', 'mixta'] as const
export const ACQUISITION_FORMS = ['proprietate', 'inchiriere', 'concesiune', 'administrare', 'folosinta', 'alte'] as const
/** Колонки a)–e) таблицы «Indicator» в разделе IV. */
export const INDICATORS = ['a', 'b', 'c', 'd', 'e'] as const
export const USES = ['rez', 'nerez'] as const

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
    contribuabil: z.object({ ...taxpayerShape, corespondenta: address }),

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

    anexe: annexes,

    /** Документ, удостоверяющий личность подписанта. */
    actIdentitate: z.object({
      ...identityShape,
      eliberatDe: requiredText(80),
      data: pastDate,
    }),

    dataDeclaratiei: date,
  })
  .superRefine((d, ctx) => {
    const { require, checkPostalCode, checkTaxpayer } = checks(ctx)
    checkTaxpayer(d.contribuabil)
    checkPostalCode(d.contribuabil.corespondenta, ['contribuabil', 'corespondenta'], '')

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

const emptyIndicator = () => ({ rez: { valoare: '', data: '' }, nerez: { valoare: '', data: '' } })

export function emptyDeclaration(): DeclarationInput {
  return {
    antet: { rolNominal: '', registruTip: '', registruVolum: '', registruPozitie: '' },
    contribuabil: { ...emptyTaxpayer(), corespondenta: emptyAddress() },
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
