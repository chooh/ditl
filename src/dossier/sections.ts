import { join, type SectionDef } from '../form/sections'
import { formatDate } from '../pdf/format'
import { fullName, unitAddress, type DossierInput } from './schema'

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

const attachmentCount = (list: { name: string }[]) => list.filter((a) => a.name.trim()).length

const ROLE = { representative: 'reprezentant legal', proxy: 'împuternicit' } as Record<string, string>

export const SECTIONS: readonly SectionDef<DossierInput>[] = [
  {
    id: 'company',
    title: 'Contribuabilul (persoana juridică)',
    step: 'Contribuabil',
    keys: ['company'],
    summary: ({ company: c }) => join(c.name, c.taxId && `CUI ${c.taxId}`, c.seat.locality),
  },
  {
    id: 'signatory',
    title: 'Semnatarul declarațiilor',
    step: 'Semnatar',
    keys: ['signatory'],
    summary: ({ signatory: s }) => join(fullName(s), ROLE[s.role], `${s.idDocument.type} ${s.idDocument.series} ${s.idDocument.number}`.trim()),
  },
  {
    id: 'deeds',
    title: 'Actele de dobândire',
    step: 'Acte',
    keys: ['deeds'],
    summary: ({ deeds }) => join(count(deeds.length, 'act', 'acte'), ...deeds.map((d) => d.number && `nr. ${d.number}${d.date ? ` din ${formatDate(d.date)}` : ''}`)),
  },
  {
    id: 'properties',
    title: 'Imobilele: clădire și teren',
    step: 'Imobile',
    keys: ['properties'],
    summary: ({ properties }) => join(count(properties.length, 'imobil', 'imobile'), ...properties.map(unitAddress)),
  },
  {
    id: 'exemption',
    title: 'Scutiri la impozitul pe teren (dacă este cazul)',
    step: 'Scutiri',
    keys: ['exemption'],
    summary: ({ exemption: e }) => (e.share || e.capacity ? join(e.share && `în cotă de ${e.share}`, e.capacity) : 'Nu este cazul'),
  },
  {
    id: 'attachments',
    title: 'Documente anexate la toate declarațiile',
    step: 'Anexe',
    keys: ['attachments'],
    summary: ({ attachments }) => {
      const n = attachmentCount(attachments)
      return n === 0 ? 'Niciun document' : count(n, 'document', 'documente')
    },
  },
  {
    id: 'signatures',
    title: 'Data și semnături',
    step: 'Semnături',
    keys: ['declarationDate', 'director', 'chiefAccountant'],
    summary: (v) => join(formatDate(v.declarationDate), v.director || fullName(v.signatory), v.chiefAccountant),
  },
]

/** Название черновика: фирма и объекты. */
export function dossierTitle({ company, properties }: DossierInput): string {
  const addresses = [...new Set(properties.map((p) => [`${p.address.street} ${p.address.number}`.trim(), p.address.locality].filter(Boolean).join(', ')))]
  return [company.name.trim() || 'Contribuabil necompletat', ...addresses.filter(Boolean)].join(' · ')
}
