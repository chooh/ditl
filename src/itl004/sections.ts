import { join, type SectionDef } from '../form/sections'
import { annexSummary } from '../itl002/sections'
import { formatDate } from '../pdf/format'
import type { DeclarationInput, ParcelInput } from './schema'

export const parcelAddress = (t: ParcelInput) => [`${t.strada} ${t.nr}`.trim(), t.localitate].filter(Boolean).join(', ')

export const SECTIONS: readonly SectionDef<DeclarationInput>[] = [
  {
    id: 'contribuabil',
    title: 'Contribuabilul (persoana juridică)',
    keys: ['contribuabil'],
    summary: ({ contribuabil: c }) => join(c.denumire, c.cui && `CUI ${c.cui}`, c.sediu.localitate),
  },
  {
    id: 'reprezentant',
    title: 'Reprezentantul (subsemnatul)',
    keys: ['reprezentant', 'actIdentitate'],
    summary: ({ reprezentant: r, actIdentitate: a }) => join(r.nume, `${a.tip} ${a.serie} ${a.numar}`.trim()),
  },
  {
    id: 'terenuri',
    title: 'Terenurile',
    keys: ['terenuri'],
    summary: ({ terenuri }) => join(terenuri.length === 1 ? '1 teren' : `${terenuri.length} terenuri`, ...terenuri.map(parcelAddress)),
  },
  {
    id: 'scutire',
    title: 'Scutiri sau reduceri (dacă este cazul)',
    keys: ['scutire'],
    summary: ({ scutire: s }) => (s.cota || s.calitate ? join(s.cota && `în cotă de ${s.cota}`, s.calitate) : 'Nu este cazul'),
  },
  {
    id: 'anexe',
    title: 'Documente anexate',
    keys: ['anexe'],
    summary: (v) => annexSummary(v.anexe),
  },
  {
    id: 'semnatari',
    title: 'Data și semnături',
    keys: ['semnatari', 'dataDeclaratiei'],
    summary: ({ semnatari: s, dataDeclaratiei }) => join(formatDate(dataDeclaratiei), s.director, s.sefContabil),
  },
  {
    id: 'antet',
    title: 'Date administrative (opțional)',
    keys: ['antet'],
    summary: (v) => (v.antet.rolNominal ? `Rol nominal ${v.antet.rolNominal}` : 'Necompletat'),
  },
]
