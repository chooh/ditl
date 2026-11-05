import { acquiredOn, allowedUses, VALUE_SOURCES, type AcquisitionForm, type Dossier, type Use, type ValueSource } from '../dossier/schema'
import type { Address } from '../form/common'
import { formatDate, formatMoney, sectorNumber } from '../pdf/format'
import { attachmentsOf, deedOf } from '../print/common'

/** Варианты «Forma de dobândire» бланка — ключи шаблона. */
const FORM: Record<AcquisitionForm, string> = {
  ownership: 'proprietate',
  lease: 'inchiriere',
  concession: 'concesiune',
  administration: 'administrare',
  use: 'folosinta',
  other: 'alte',
}
const BUILDING_TYPE = { nonResidential: 'nerezidentiala', residential: 'rezidentiala', mixed: 'mixta' } as const

/** Адрес в ключах шаблона. */
export const roAddress = (a: Address) => ({
  strada: a.street,
  nr: a.number,
  codPostal: a.postalCode,
  bloc: a.block,
  scara: a.entrance,
  etaj: a.floor,
  apartament: a.apartment,
  localitate: a.locality,
  judet: a.county,
  tara: a.country,
})

/**
 * Данные для шаблона src/typst/itl002.typ — декларация на объект `index` досье;
 * всё уже строками в печатном виде. Форма данных — как в src/typst/samples/itl002.json.
 */
export function toPrintData(d: Dossier, index: number) {
  const p = d.properties[index]!
  const deed = deedOf(d, p)
  const { company: c, signatory: s } = d
  const b = p.building
  const uses = allowedUses(b.type)
  // Колонки, не относящиеся к типу здания, печатаются пустыми.
  const cell = (col: ValueSource, use: Use) => {
    const v = b.values[col][use]
    return uses.includes(use) ? { valoare: formatMoney(v.value), data: formatDate(v.date) } : { valoare: '', data: '' }
  }
  const sector = sectorNumber(p.address.district)

  return {
    antet: {
      // Rol nominal unic и позицию в registrul agricol вписывает налоговый орган —
      // графы на бланке остаются пустыми.
      rolNominal: '',
      registruTip: '',
      registruVolum: '',
      registruPozitie: '',
    },
    contribuabil: {
      denumire: c.name,
      cui: c.taxId,
      // На бланке одна графа «Numărul tel./fax».
      telefon: [c.phone, c.fax].filter(Boolean).join(' / '),
      email: c.email,
      sediu: roAddress(c.seat),
      corespondenta: roAddress(c.correspondence),
      comunicareEmail: c.emailOnly === 'yes' ? 'da' : 'nu',
    },
    // Раздел II — только если подписывает împuternicit, а не законный представитель.
    imputernicit:
      s.role === 'proxy'
        ? { nume: s.lastName, prenume: s.firstName, cif: s.personalId, telefon: s.phone, email: s.email, adresa: roAddress(s.address) }
        : null,
    adresaStrainatate: c.foreignResidence,
    cladire: {
      tip: BUILDING_TYPE[b.type],
      nrAct: deed.number,
      dataDobandirii: formatDate(acquiredOn(deed)),
      valoareAchizitie: formatMoney(b.purchaseValue),
      formaDobandire: FORM[deed.form],
      formaAlta: deed.form === 'other' ? deed.formOther : '',
      adresa: {
        strada: p.address.street,
        nr: p.address.number,
        bloc: p.address.block,
        scara: p.address.entrance,
        etaj: p.address.floor,
        apartament: p.address.apartment,
        // Одна графа «Localitate/sector».
        localitate: [p.address.locality, sector ? `Sector ${sector}` : p.address.district].filter(Boolean).join(', '),
      },
      indicatori: Object.fromEntries(VALUE_SOURCES.map((col) => [col, { rez: cell(col, 'residential'), nerez: cell(col, 'nonResidential') }])),
    },
    anexe: attachmentsOf(d.attachments, deed.attachments, p.attachments),
    actIdentitate: {
      tip: s.idDocument.type,
      serie: s.idDocument.series,
      numar: s.idDocument.number,
      eliberatDe: s.idDocument.issuedBy,
      data: formatDate(s.idDocument.issuedOn),
    },
    dataDeclaratiei: formatDate(d.declarationDate),
  }
}
