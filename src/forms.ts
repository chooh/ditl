import type { ZodType } from 'zod'
import type { SectionDef } from './form/sections'
import * as itl002 from './itl002/schema'
import { toPrintData as print002 } from './itl002/print'
import { sampleDeclaration as sample002 } from './itl002/sample'
import { SECTIONS as sections002 } from './itl002/sections'
import * as itl004 from './itl004/schema'
import { toPrintData as print004 } from './itl004/print'
import { sampleDeclaration as sample004 } from './itl004/sample'
import { parcelAddress, SECTIONS as sections004 } from './itl004/sections'
import type { TemplateId } from './typst/bundle'
import { withDefaults } from './form/withDefaults'

/**
 * Типы деклараций. Всё, что отличает одну от другой, — здесь: схема, разделы формы,
 * шаблон Typst и данные для него. Поля формы (React) — в FIELDS в App.tsx.
 */
export type FormDef<Input, Output> = {
  id: FormId
  /** «ITL 002» */
  code: string
  title: string
  lead: string
  schema: ZodType<Output, Input>
  empty: () => Input
  sample: () => Input
  sections: readonly SectionDef<Input>[]
  /**
   * Ключи, которые переносятся в новую декларацию того же контрибуабила. Между разными
   * типами переносятся только общие ключи (реквизиты фирмы и документ подписанта).
   */
  taxpayerKeys: readonly (keyof Input & string)[]
  draftTitle: (values: Input) => string
  template: TemplateId
  print: (data: Output) => unknown
  /** Имя файла без расширения. */
  filename: (data: Output) => string
}

export type FormId = 'itl002' | 'itl004'

const taxpayerName = (denumire: string) => denumire.trim() || 'Contribuabil necompletat'

const ITL002: FormDef<itl002.DeclarationInput, itl002.Declaration> = {
  id: 'itl002',
  code: 'ITL 002',
  title: 'Declarație fiscală ITL 002',
  lead: 'Pentru stabilirea impozitului/taxei pe clădirile rezidențiale / nerezidențiale / cu destinație mixtă aflate în proprietatea persoanelor juridice.',
  schema: itl002.declarationSchema,
  empty: itl002.emptyDeclaration,
  sample: sample002,
  sections: sections002,
  taxpayerKeys: ['contribuabil', 'imputernicit', 'adresaStrainatate', 'actIdentitate'],
  draftTitle: ({ contribuabil: c, cladire: b }) => {
    const building = [`${b.adresa.strada} ${b.adresa.nr}`.trim(), b.adresa.localitate].filter(Boolean).join(', ')
    return [taxpayerName(c.denumire), building].filter(Boolean).join(' · ')
  },
  template: 'itl002',
  print: print002,
  filename: (d) => `ITL002_${d.contribuabil.cui}`,
}

const ITL004: FormDef<itl004.DeclarationInput, itl004.Declaration> = {
  id: 'itl004',
  code: 'ITL 004',
  title: 'Declarație fiscală ITL 004',
  lead: 'Pentru stabilirea impozitului/taxei pe teren în cazul persoanelor juridice.',
  schema: itl004.declarationSchema,
  empty: itl004.emptyDeclaration,
  sample: sample004,
  sections: sections004,
  taxpayerKeys: ['contribuabil', 'reprezentant', 'actIdentitate', 'semnatari'],
  draftTitle: ({ contribuabil: c, terenuri }) =>
    [taxpayerName(c.denumire), ...terenuri.map(parcelAddress)].filter(Boolean).join(' · '),
  template: 'itl004',
  print: print004,
  filename: (d) => `ITL004_${d.contribuabil.cui}`,
}

/** Значения формы любого типа — для кода, общего для всех деклараций. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyForm = FormDef<any, any>

export const FORMS: Record<FormId, AnyForm> = { itl002: ITL002, itl004: ITL004 }
export const FORM_IDS = Object.keys(FORMS) as FormId[]

/** Значения для новой декларации типа `to` того же контрибуабила, что и `values` типа `from`. */
export function forSameTaxpayer(from: FormId, values: Record<string, unknown>, to: FormId): unknown {
  const target = FORMS[to]
  const keys = target.taxpayerKeys.filter((k) => FORMS[from].taxpayerKeys.includes(k))
  // withDefaults приводит перенесённое к форме нового типа: лишние поля отбрасываются, недостающие — пустые.
  return withDefaults(target.empty(), Object.fromEntries(keys.map((k) => [k, structuredClone(values[k])])))
}
