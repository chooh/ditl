import { acquiredOn, fullName, LAND_CATEGORIES, type AcquisitionForm, type Dossier, type LandCategory, type Property } from '../dossier/schema'
import { formatArea, formatDate, formatIban, sectorNumber, splitSector } from '../pdf/format'
import { attachmentsOf, deedOf } from '../print/common'

/** «am dobândit/închiriat/concesionat/preluat în administrare/preluat în folosință un teren». */
const FORM: Record<Exclude<AcquisitionForm, 'other'>, string> = {
  ownership: 'dobândit',
  lease: 'închiriat',
  concession: 'concesionat',
  administration: 'preluat în administrare',
  use: 'preluat în folosință',
}

/** Категории площади — ключи шаблона. */
const CATEGORY: Record<LandCategory, string> = {
  builtUp: 'constructii',
  arable: 'arabil',
  pasture: 'pasune',
  hayfield: 'faneata',
  vineyardBearing: 'vieRod',
  vineyardYoung: 'vieNerod',
  orchardBearing: 'livadaRod',
  orchardYoung: 'livadaNerod',
  forestYoung: 'padurePana20',
  forestOld: 'padurePeste20',
  waterFishFarm: 'apeAmenajare',
  water: 'apeFaraAmenajare',
  roadsFree: 'drumuriLiber',
  roadsOccupied: 'drumuriOcup',
  unproductive: 'neproductive',
}

/** Адрес объекта одной строкой: «Șos. Mihai Bravu nr. 200, București». */
export const propertyAddressLine = (p: Pick<Property, 'address'>) => {
  const { street, number, locality } = p.address
  return [number ? `${street} nr. ${number}` : street, locality].filter(Boolean).join(', ')
}

/**
 * Данные для шаблона src/typst/itl004.typ — одна декларация на землю под всеми
 * объектами досье, по пункту и строке таблицы на объект; всё уже строками в печатном
 * виде. Форма данных — как в src/typst/samples/itl004.json.
 */
export function toPrintData(d: Dossier) {
  const { signatory: s, company: c } = d
  const domiciliu = splitSector(s.address.county)
  const sediu = splitSector(c.seat.county)
  const { street, number, block, entrance, floor, apartment, postalCode, locality } = s.address

  return {
    rolNominal: c.taxRoll,
    reprezentant: {
      nume: fullName(s),
      actTip: s.idDocument.type,
      serie: s.idDocument.series,
      numar: s.idDocument.number,
      cnp: s.personalId,
      tara: s.address.country,
      ...domiciliu,
      codPostal: postalCode,
      localitate: locality,
      strada: street,
      nr: number,
      bloc: block,
      scara: entrance,
      etaj: floor,
      apartament: apartment,
    },
    contribuabil: {
      denumire: c.name,
      cif: c.taxId,
      ...sediu,
      localitate: c.seat.locality,
      codPostal: c.seat.postalCode,
      strada: c.seat.street,
      nr: c.seat.number,
      bloc: c.seat.block,
      scara: c.seat.entrance,
      etaj: c.seat.floor,
      apartament: c.seat.apartment,
      telefon: c.phone,
      fax: c.fax,
      email: c.email,
      registruComertului: c.tradeRegister.office,
      nrRegistruComertului: c.tradeRegister.number,
      iban: formatIban(c.bank.iban),
      banca: c.bank.name,
    },
    // Все объекты, даже если их больше пяти пунктов бланка.
    terenuri: d.properties.map((p) => {
      const deed = deedOf(d, p)
      const { land } = p
      return {
        dataDobandirii: formatDate(acquiredOn(deed)),
        nrAct: deed.number,
        dataAct: formatDate(deed.date),
        forma: deed.form === 'other' ? deed.formOther : FORM[deed.form],
        localitate: p.address.locality,
        sector: sectorNumber(p.address.district) ?? p.address.district,
        strada: p.address.street,
        nr: p.address.number,
        registruPerioada: p.agriculturalRegister.period,
        registruTip: p.agriculturalRegister.type,
        registruVolum: p.agriculturalRegister.volume,
        registruPozitie: p.agriculturalRegister.position,
        cota: land.share,
        coproprietari: land.coOwners,
        parcela: land.parcel || propertyAddressLine(p),
        intravilan: land.zoning,
        suprafete: Object.fromEntries(LAND_CATEGORIES.map((k) => [CATEGORY[k], formatArea(land.areas[k])])),
        rang: land.rank,
        zona: land.zone,
      }
    }),
    scutire: { cota: d.exemption.share, calitate: d.exemption.capacity, documente: d.exemption.documents },
    comunicareEmail: c.emailOnly === 'yes',
    anexe: attachmentsOf(d.attachments, ...d.deeds.map((deed) => deed.attachments), ...d.properties.map((p) => p.attachments)),
    data: formatDate(d.declarationDate),
    // Директор по умолчанию — подписант.
    director: d.director || fullName(s),
    sefContabil: d.chiefAccountant,
  }
}
