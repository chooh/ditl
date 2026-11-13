import { join, type SectionDef, type SubStepDef } from '../form/sections'
import type { HelpTopic } from '../help/content'
import { formatDate } from '../pdf/format'
import { fullName, unitAddress, type DossierInput } from './schema'

const count = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

const attachmentCount = (list: { name: string }[]) => list.filter((a) => a.name.trim()).length

const ROLE = { representative: 'reprezentant legal', proxy: 'împuternicit' } as Record<string, string>

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
    id: 'deed',
    title: 'Actul de dobândire',
    step: 'Act',
    keys: ['deed'],
    summary: ({ deed: d }) => (d.number ? `nr. ${d.number}${d.date ? ` din ${formatDate(d.date)}` : ''}` : ''),
    subSteps: single('deed', 'Actul de dobândire', ['deed'], 'deed'),
  },
  {
    id: 'property',
    title: 'Imobilul: clădire și teren',
    step: 'Imobil',
    keys: ['property'],
    summary: ({ property: p }) => join(unitAddress(p), p.address.locality),
    subSteps: () => [
      { id: 'address', title: 'Adresa', fields: ['property.address'], help: 'property.address' },
      { id: 'building', title: 'Clădirea', fields: ['property.building.type', 'property.building.purchaseValue'], help: 'property.building' },
      { id: 'values', title: 'Valoarea clădirii', step: 'Valoarea', fields: ['property.building.values'], help: 'property.values' },
      { id: 'land', title: 'Terenul', fields: ['property.land'], help: 'property.land' },
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
    title: 'Documente anexate',
    step: 'Anexe',
    keys: ['attachments'],
    summary: ({ attachments }) => {
      const n = attachmentCount(attachments)
      return n === 0 ? 'Niciun document' : count(n, 'document', 'documente')
    },
    subSteps: single('attachments', 'Anexe', ['attachments'], 'attachments'),
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

/** Название черновика: фирма и объект — до квартиры, чтобы различать объекты одного дома. */
export function dossierTitle({ company, property }: DossierInput): string {
  return [company.name.trim() || 'Contribuabil necompletat', unitAddress(property)].filter(Boolean).join(' · ')
}
