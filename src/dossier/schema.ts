import { z } from 'zod'
import {
  address,
  area,
  attachments,
  checks,
  choice,
  cnp,
  cif,
  cui,
  date,
  email,
  emptyAddress,
  emptyAttachments,
  iban,
  isoDate,
  money,
  optionalDate,
  pastDate,
  phone,
  requiredText,
  text,
  toDate,
  todayIso,
  tradeRegisterNumber,
} from '../form/common'

/**
 * Досье: одна фирма, один подписант, один акт приобретения и один объект — из него
 * собираются ITL 002 на здание и ITL 004 на землю под ним. Декларации подаются по
 * одному объекту, поэтому следующий объект — следующее досье (см. forSameCompany, forSameDeed).
 * Имена полей английские, в комментариях — как поле называется на бланках.
 */

/** Форма приобретения: proprietate/dobândit, închiriere, concesiune, administrare, folosință, alte modalități. */
export const ACQUISITION_FORMS = ['ownership', 'lease', 'concession', 'administration', 'use', 'other'] as const
export type AcquisitionForm = (typeof ACQUISITION_FORMS)[number]

/** Тип здания: nerezidențială / rezidențială / mixtă. */
export const BUILDING_TYPES = ['nonResidential', 'residential', 'mixed'] as const

/** Колонки a)–e) таблицы «Indicator» ITL 002. */
export const VALUE_SOURCES = ['a', 'b', 'c', 'd', 'e'] as const
export type ValueSource = (typeof VALUE_SOURCES)[number]
/** rezidențial / nerezidențial */
export const USES = ['residential', 'nonResidential'] as const
export type Use = (typeof USES)[number]

/** Колонки таблицы «Suprafața terenului, pe categorii de folosință» ITL 004, слева направо. */
export const LAND_CATEGORIES = [
  'builtUp', // terenuri cu construcții
  'arable', // arabil
  'pasture', // pășune
  'hayfield', // fânață
  'vineyardBearing', // vie — intrată pe rod
  'vineyardYoung', // vie — neintrată pe rod
  'orchardBearing', // livadă — intrată pe rod
  'orchardYoung', // livadă — neintrată pe rod
  'forestYoung', // pădure — până în 20 de ani / cu rol de protecție
  'forestOld', // pădure — peste 20 de ani
  'waterFishFarm', // terenuri cu ape — cu amenajare piscicolă
  'water', // terenuri cu ape — fără amenajare piscicolă
  'roadsFree', // drumuri și căi ferate — liber
  'roadsOccupied', // drumuri și căi ferate — ocupat
  'unproductive', // terenuri neproductive
] as const
export type LandCategory = (typeof LAND_CATEGORIES)[number]

const company = z.object({
  name: requiredText(150), // denumire contribuabil
  taxId: cif, // codul de identificare fiscală (CIF)
  uniqueId: cui, // codul unic de identificare (CUI)
  phone, // numărul tel.
  fax: phone, // fax
  email, // adresa de poștă electronică
  emailOnly: choice(['yes', 'no'] as const, 'Alegeți DA sau NU'), // acte comunicate exclusiv pe e-mail: DA / NU
  seat: address, // sediul
  correspondence: address, // adresa de corespondență
  foreignResidence: text(200), // adresa de rezidență în alt stat decât România
  tradeRegister: z.object({
    office: text(80), // înregistrat la registrul comerțului
    number: tradeRegisterNumber, // la nr.
  }),
  bank: z.object({
    iban, // cont IBAN
    name: text(80), // deschis la
  }),
})

const signatory = z.object({
  role: choice(['representative', 'proxy'] as const, 'Alegeți calitatea semnatarului'), // reprezentant legal / împuternicit
  firstName: requiredText(60), // prenumele
  lastName: requiredText(60), // numele
  personalId: cnp, // codul numeric personal
  phone, // numărul tel.
  email, // adresa de poștă electronică
  address, // domiciliul
  idDocument: z.object({
    type: requiredText(15), // tipul actului de identitate
    series: text(6), // seria
    number: requiredText(12), // numărul
    issuedBy: requiredText(80), // eliberat de
    issuedOn: pastDate.transform(toDate), // la data de
    validTill: optionalDate.transform((s) => (s ? toDate(s) : null)), // valabil până la; пусто — бессрочный
  }),
})

const deed = z.object({
  number: requiredText(25), // nr. act
  date, // din data de
  acquiredOn: optionalDate, // data dobândirii / „începând cu data de”; пусто — дата акта
  form: choice(ACQUISITION_FORMS, 'Alegeți forma de dobândire'), // forma de dobândire
  formOther: text(100), // alte modalități
})

const valueCell = z.object({
  value: money, // valoare (lei)
  date: optionalDate, // data documentului
})
const valueColumn = z.object({ residential: valueCell, nonResidential: valueCell })

/** Адрес объекта — строки «Adresa clădirii» ITL 002 и «teren situat în…» ITL 004. */
const propertyAddress = z.object({
  street: text(80), // strada
  number: text(10), // nr.
  block: text(10), // bloc
  entrance: text(10), // scara
  floor: text(5), // etaj
  apartment: text(10), // ap.
  locality: text(60), // comuna / orașul / municipiul
  district: text(40), // satul / sectorul
})

const property = z.object({
  address: propertyAddress,
  building: z.object({
    type: choice(BUILDING_TYPES, 'Alegeți tipul clădirii'), // nerezidențială / rezidențială / mixtă
    purchaseValue: money, // valoare achiziție (lei)
    values: z.object({ a: valueColumn, b: valueColumn, c: valueColumn, d: valueColumn, e: valueColumn }), // indicatori a)–e)
  }),
  land: z.object({
    share: text(30), // cota de proprietate
    coOwners: text(300), // coproprietari
    parcel: text(150), // parcela / adresa; пусто — печатается адрес объекта
    zoning: choice(['I', 'E'] as const, 'Alegeți intravilan sau extravilan'), // intravilan (I) / extravilan (E)
    areas: z.object(Object.fromEntries(LAND_CATEGORIES.map((k) => [k, area])) as Record<LandCategory, typeof area>), // m²
    rank: text(5), // rang localitate
    zone: text(5), // zona
  }),
})

export const dossierSchema = z
  .object({
    company, // contribuabil
    signatory, // subsemnatul / împuternicit
    director: text(100), // Director P.J.; пусто — подписант
    chiefAccountant: text(100), // Șef compartiment contabil
    deed, // actul de dobândire
    property, // imobilul: clădirea și terenul aferent
    exemption: z.object({
      share: text(20), // în cotă de
      capacity: text(100), // în calitate de
      documents: text(200), // conform documentelor anexate
    }),
    attachments, // anexe: copia actului, extras CF, certificat ONRC, împuternicire…
    declarationDate: date, // data declarației
  })
  .superRefine((d, ctx) => {
    const { require, checkPostalCode } = checks(ctx)

    const c = d.company
    require(c.seat.street, ['company', 'seat', 'street'])
    require(c.seat.number, ['company', 'seat', 'number'])
    require(c.seat.locality, ['company', 'seat', 'locality'])
    require(c.seat.county, ['company', 'seat', 'county'])
    checkPostalCode(c.seat, ['company', 'seat'])
    checkPostalCode(c.correspondence, ['company', 'correspondence'], '')
    if (c.emailOnly === 'yes' && !c.email) {
      ctx.addIssue({ code: 'custom', message: 'Necesară pentru comunicarea prin e-mail', path: ['company', 'email'] })
    }

    const s = d.signatory
    checkPostalCode(s.address, ['signatory', 'address'])
    // В разделе II ITL 002 у împuternicit обязателен код фискальной идентификации.
    if (s.role === 'proxy') require(s.personalId, ['signatory', 'personalId'])
    // superRefine работает и при ошибках в полях — тогда здесь сырые строки, а не Date.
    // Пустой validTill (null) — бессрочный документ.
    const { issuedOn, validTill } = s.idDocument
    const validTillPath = ['signatory', 'idDocument', 'validTill']
    if (validTill instanceof Date) {
      if (issuedOn instanceof Date && validTill.getTime() <= issuedOn.getTime()) {
        ctx.addIssue({ code: 'custom', message: 'Data expirării este înainte de data eliberării', path: validTillPath })
      } else if (isoDate(validTill) < d.declarationDate) {
        ctx.addIssue({ code: 'custom', message: 'Actul de identitate este expirat la data declarației', path: validTillPath })
      }
    }

    if (d.deed.form === 'other') require(d.deed.formOther, ['deed', 'formOther'])

    const p = d.property
    require(p.address.street, ['property', 'address', 'street'])
    require(p.address.locality, ['property', 'address', 'locality'])

    let filled = 0
    for (const col of VALUE_SOURCES) {
      for (const use of allowedUses(p.building.type)) {
        const cell = p.building.values[col][use]
        const cellPath = ['property', 'building', 'values', col, use]
        if (cell.value !== null) filled++
        if (cell.value !== null && !cell.date) ctx.addIssue({ code: 'custom', message: 'Introduceți data documentului', path: [...cellPath, 'date'] })
        if (cell.value === null && cell.date) ctx.addIssue({ code: 'custom', message: 'Introduceți valoarea', path: [...cellPath, 'value'] })
      }
    }
    if (p.building.type && filled === 0) {
      ctx.addIssue({ code: 'custom', message: 'Completați cel puțin o valoare a clădirii', path: ['property', 'building', 'values'] })
    }

    if (Object.values(p.land.areas).every((v) => v === null)) {
      ctx.addIssue({ code: 'custom', message: 'Completați suprafața cel puțin la o categorie de folosință', path: ['property', 'land', 'areas'] })
    }
  })

/** Какие колонки таблицы стоимости (rezidențial / nerezidențial) относятся к типу здания. */
export function allowedUses(type: string): readonly Use[] {
  if (type === 'residential') return ['residential']
  if (type === 'nonResidential') return ['nonResidential']
  if (type === 'mixed') return USES
  return []
}

/** Значения полей формы (то, что вводит пользователь и что хранится в черновике). */
export type DossierInput = z.input<typeof dossierSchema>
/** Провалидированные и нормализованные данные — только из них собираются документы. */
export type Dossier = z.output<typeof dossierSchema>
export type Deed = Dossier['deed']
export type Property = Dossier['property']
export type DeedInput = DossierInput['deed']
export type PropertyInput = DossierInput['property']

/** Дата приобретения: «începând cu data de», если указана отдельно, иначе дата акта. */
export const acquiredOn = (deed: Pick<Deed, 'date' | 'acquiredOn'>) => deed.acquiredOn || deed.date

export function emptyDeed(): DeedInput {
  return { number: '', date: '', acquiredOn: '', form: '', formOther: '' }
}

const emptyCell = () => ({ value: '', date: '' })
const emptyColumn = () => ({ residential: emptyCell(), nonResidential: emptyCell() })

export function emptyProperty(): PropertyInput {
  return {
    address: { street: '', number: '', block: '', entrance: '', floor: '', apartment: '', locality: '', district: '' },
    building: {
      type: '',
      purchaseValue: '',
      values: { a: emptyColumn(), b: emptyColumn(), c: emptyColumn(), d: emptyColumn(), e: emptyColumn() },
    },
    land: {
      share: '',
      coOwners: '',
      parcel: '',
      zoning: '',
      areas: Object.fromEntries(LAND_CATEGORIES.map((k) => [k, ''])) as Record<LandCategory, string>,
      rank: '',
      zone: '',
    },
  }
}

export function emptyCompany(): DossierInput['company'] {
  return {
    name: '',
    taxId: '',
    uniqueId: '',
    phone: '',
    fax: '',
    email: '',
    emailOnly: '',
    seat: emptyAddress('România'),
    correspondence: emptyAddress(),
    foreignResidence: '',
    tradeRegister: { office: '', number: '' },
    bank: { iban: '', name: '' },
  }
}

export function emptySignatory(): DossierInput['signatory'] {
  return {
    role: '',
    firstName: '',
    lastName: '',
    personalId: '',
    phone: '',
    email: '',
    address: emptyAddress('România'),
    idDocument: { type: 'CI', series: '', number: '', issuedBy: '', issuedOn: '', validTill: '' },
  }
}

export function emptyDossier(): DossierInput {
  return {
    company: emptyCompany(),
    signatory: emptySignatory(),
    director: '',
    chiefAccountant: '',
    deed: emptyDeed(),
    property: emptyProperty(),
    exemption: { share: '', capacity: '', documents: '' },
    attachments: emptyAttachments(),
    declarationDate: todayIso(),
  }
}

/** Новое досье той же фирмы: реквизиты, подписант и подписи переносятся, акт, объект и приложения — нет. */
export function forSameCompany(values: DossierInput): DossierInput {
  const { company, signatory, director, chiefAccountant } = structuredClone(values)
  return { ...emptyDossier(), company, signatory, director, chiefAccountant }
}

/**
 * Новое досье той же фирмы по тому же акту — следующий объект договора (квартира и парковка
 * в одном доме): переносится ещё акт, а у объекта — адрес дома, ранг, зона и intravilan.
 * Квартира, стоимость, доля и площадь — пустые.
 */
export function forSameDeed(values: DossierInput): DossierInput {
  const next = forSameCompany(values)
  const { deed, property: prev } = structuredClone(values)
  const { street, number, block, entrance, locality, district } = prev.address
  return {
    ...next,
    deed,
    property: {
      ...next.property,
      address: { ...next.property.address, street, number, block, entrance, locality, district },
      land: { ...next.property.land, zoning: prev.land.zoning, rank: prev.land.rank, zone: prev.land.zone },
    },
  }
}

/** ФИО подписанта: «Ion Popescu». */
export const fullName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`.trim()

/** Адрес до квартиры — чтобы различать объекты в одном доме: «Șos. Mihai Bravu nr. 200, bl. P1, et. -2, ap. P14». */
export function unitAddress({ address: a }: { address: Omit<PropertyInput['address'], 'locality' | 'district'> }): string {
  const unit = [a.block && `bl. ${a.block}`, a.entrance && `sc. ${a.entrance}`, a.floor && `et. ${a.floor}`, a.apartment && `ap. ${a.apartment}`]
  return [a.number ? `${a.street} nr. ${a.number}` : a.street, ...unit].filter(Boolean).join(', ')
}
