import { join, type SectionDef, type SubStepDef } from '../form/sections'
import type { HelpTopic } from '../help/content'
import { formatDate } from '../pdf/format'
import { fullName, unitAddress, type DossierInput } from './schema'

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

const attachmentCount = (list: { name: string }[]) => list.filter((a) => a.name.trim()).length

const ROLE = { representative: 'reprezentant legal', proxy: 'împuternicit' } as Record<string, string>

/** Подэтап акта. */
export const deedStep = (i: number) => `deed-${i}`

/** Части объекта — по подэтапу на каждую. */
const PROPERTY_PARTS = [
  { part: 'address', title: 'actul și adresa', step: 'Act și adresă', fields: ['deedId', 'address'], help: 'property.address' },
  { part: 'building', title: 'clădirea', step: 'Clădirea', fields: ['building.type', 'building.purchaseValue'], help: 'property.building' },
  { part: 'values', title: 'valoarea clădirii', step: 'Valoarea', fields: ['building.values'], help: 'property.values' },
  { part: 'land', title: 'terenul', step: 'Terenul', fields: ['land'], help: 'property.land' },
  { part: 'annex', title: 'documente anexate', step: 'Anexe', fields: ['attachments'], help: 'property.annex' },
] as const satisfies readonly { part: string; title: string; step: string; fields: readonly string[]; help: HelpTopic }[]

export type PropertyPart = (typeof PROPERTY_PARTS)[number]['part']

/** Подэтап части объекта. */
export const propertyStep = (i: number, part: PropertyPart) => `property-${i}-${part}`

/** Раздел из одного подэтапа. */
const single = (id: string, title: string, fields: readonly string[], help: HelpTopic): (() => SubStepDef[]) => () => [{ id, title, fields, help }]

export const SECTIONS: readonly SectionDef<DossierInput>[] = [
  {
    id: 'company',
    title: 'Contribuabilul (persoana juridică)',
    step: 'Contribuabil',
    keys: ['company'],
    summary: ({ company: c }) => join(c.name, c.uniqueId && `CUI ${c.uniqueId}`, c.seat.locality),
    subSteps: () => [
      {
        id: 'identity',
        title: 'Date de identificare',
        step: 'Identificare',
        fields: ['company.name', 'company.taxId', 'company.uniqueId', 'company.tradeRegister'],
        help: 'company.identity',
      },
      {
        id: 'contact',
        title: 'Contact și comunicare',
        step: 'Contact',
        fields: ['company.phone', 'company.fax', 'company.email', 'company.emailOnly'],
        help: 'company.contact',
      },
      { id: 'bank', title: 'Contul bancar', step: 'Cont bancar', fields: ['company.bank'], help: 'company.bank' },
      { id: 'seat', title: 'Sediul', fields: ['company.seat'], help: 'company.seat' },
      { id: 'other', title: 'Alte adrese (dacă este cazul)', step: 'Alte adrese', fields: ['company.correspondence', 'company.foreignResidence'], help: 'company.other' },
    ],
  },
  {
    id: 'signatory',
    title: 'Semnatarul declarațiilor',
    step: 'Semnatar',
    keys: ['signatory'],
    summary: ({ signatory: s }) => join(fullName(s), ROLE[s.role], `${s.idDocument.type} ${s.idDocument.series} ${s.idDocument.number}`.trim()),
    subSteps: () => [
      {
        id: 'person',
        title: 'Calitatea și datele personale',
        step: 'Date personale',
        fields: ['signatory.role', 'signatory.lastName', 'signatory.firstName', 'signatory.personalId', 'signatory.phone', 'signatory.email'],
        help: 'signatory.person',
      },
      { id: 'id', title: 'Actul de identitate', step: 'Act de identitate', fields: ['signatory.idDocument'], help: 'signatory.id' },
      { id: 'address', title: 'Domiciliul', fields: ['signatory.address'], help: 'signatory.address' },
    ],
  },
  {
    id: 'deeds',
    title: 'Actele de dobândire',
    step: 'Acte',
    keys: ['deeds'],
    summary: ({ deeds }) => join(count(deeds.length, 'act', 'acte'), ...deeds.map((d) => d.number && `nr. ${d.number}${d.date ? ` din ${formatDate(d.date)}` : ''}`)),
    // По подэтапу на акт и список актов; ошибка «нет ни одного акта» — у списка.
    subSteps: ({ deeds }) => [
      ...deeds.map((_, i) => ({ id: deedStep(i), title: `Actul ${i + 1}`, fields: [`deeds.${i}`], help: 'deed' as const })),
      { id: 'deeds-list', title: 'Lista actelor', step: 'Lista', fields: [], exact: ['deeds'], help: 'deeds.list' },
    ],
  },
  {
    id: 'properties',
    title: 'Imobilele: clădire și teren',
    step: 'Imobile',
    keys: ['properties'],
    summary: ({ properties }) => join(count(properties.length, 'imobil', 'imobile'), ...properties.map(unitAddress)),
    subSteps: ({ properties }) => [
      ...properties.flatMap((_, i) =>
        PROPERTY_PARTS.map(({ part, title, step, fields, help }) => ({
          id: propertyStep(i, part),
          title: `Imobilul ${i + 1} — ${title}`,
          step,
          // В индикаторе — части одного объекта и список.
          group: `property-${i}`,
          fields: fields.map((f) => `properties.${i}.${f}`),
          help,
        })),
      ),
      { id: 'properties-list', title: 'Lista imobilelor', step: 'Lista', fields: [], exact: ['properties'], help: 'properties.list' },
    ],
  },
  {
    id: 'exemption',
    title: 'Scutiri la impozitul pe teren (dacă este cazul)',
    step: 'Scutiri',
    keys: ['exemption'],
    summary: ({ exemption: e }) => (e.share || e.capacity ? join(e.share && `în cotă de ${e.share}`, e.capacity) : 'Nu este cazul'),
    subSteps: single('exemption', 'Scutiri', ['exemption'], 'exemption'),
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
    subSteps: single('attachments', 'Anexe comune', ['attachments'], 'attachments'),
  },
  {
    id: 'signatures',
    title: 'Data și semnături',
    step: 'Semnături',
    keys: ['declarationDate', 'director', 'chiefAccountant'],
    summary: (v) => join(formatDate(v.declarationDate), v.director || fullName(v.signatory), v.chiefAccountant),
    subSteps: single('signatures', 'Data și semnături', ['declarationDate', 'director', 'chiefAccountant'], 'signatures'),
  },
]

/** Название черновика: фирма и объекты. */
export function dossierTitle({ company, properties }: DossierInput): string {
  const addresses = [...new Set(properties.map((p) => [`${p.address.street} ${p.address.number}`.trim(), p.address.locality].filter(Boolean).join(', ')))]
  return [company.name.trim() || 'Contribuabil necompletat', ...addresses.filter(Boolean)].join(' · ')
}
