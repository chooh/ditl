import { join, type SectionDef } from '../form/sections'
import { formatDate } from '../pdf/format'
import type { DeclarationInput } from './schema'

const BUILDING_TYPE_LABELS: Record<string, string> = {
  nerezidentiala: 'Nerezidențială',
  rezidentiala: 'Rezidențială',
  mixta: 'Mixtă',
}

export const annexSummary = (anexe: { denumire: string }[]) => {
  const n = anexe.filter((a) => a.denumire.trim()).length
  return n === 0 ? 'Niciun document' : n === 1 ? '1 document' : `${n} documente`
}

export const SECTIONS: readonly SectionDef<DeclarationInput>[] = [
  {
    id: 'contribuabil',
    title: 'I. Date de identificare a contribuabilului',
    keys: ['contribuabil'],
    summary: ({ contribuabil: c }) => join(c.denumire, c.cui && `CUI ${c.cui}`, c.sediu.localitate),
  },
  {
    id: 'imputernicit',
    title: 'II. Date de identificare a împuternicitului',
    keys: ['imputernicit'],
    summary: ({ imputernicit: i }) => (i.exista ? join(`${i.nume} ${i.prenume}`.trim(), i.cif) : 'Fără împuternicit'),
  },
  {
    id: 'strainatate',
    title: 'III. Adresa de rezidență în alt stat decât România',
    keys: ['adresaStrainatate'],
    summary: (v) => v.adresaStrainatate || 'Nu este cazul',
  },
  {
    id: 'cladire',
    title: 'IV. Datele clădirii',
    keys: ['cladire'],
    summary: ({ cladire: c }) => join(BUILDING_TYPE_LABELS[c.tip], `${c.adresa.strada} ${c.adresa.nr}`.trim(), c.adresa.localitate),
  },
  {
    id: 'anexe',
    title: 'Documente anexate',
    keys: ['anexe'],
    summary: (v) => annexSummary(v.anexe),
  },
  {
    id: 'declaratie',
    title: 'Declarație',
    keys: ['actIdentitate', 'dataDeclaratiei'],
    summary: ({ actIdentitate: a, dataDeclaratiei }) => join(`${a.tip} ${a.serie} ${a.numar}`.trim(), formatDate(dataDeclaratiei)),
  },
  {
    id: 'antet',
    title: 'Date administrative (opțional)',
    keys: ['antet'],
    summary: (v) => (v.antet.rolNominal ? `Rol nominal ${v.antet.rolNominal}` : 'Necompletat'),
  },
]
