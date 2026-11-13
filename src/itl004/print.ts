import { acquiredOn, fullName, LAND_CATEGORIES, type AcquisitionForm, type Dossier, type LandCategory, type Property } from '../dossier/schema'
import { formatArea, formatDate, formatIban } from '../pdf/format'
import type { Locality } from '../address/siruta'
import { addressText } from '../print/common'

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
 * Данные для шаблона src/typst/itl004.typ — декларация на землю под объектом досье;
 * всё уже строками в печатном виде. Форма данных — как в src/typst/samples/itl004.json.
 */
export function toPrintData(d: Dossier, localities: Locality[]) {
  const { signatory: s, company: c, deed, property: p } = d
  const { land } = p
  const { street, number, locality, district } = p.address

  return {
    // Rol nominal unic присваивает налоговый орган — графа на бланке остаётся пустой.
    rolNominal: '',
    reprezentant: {
      // Как в документах: сначала фамилия, всё прописными — «POPESCU ION-MIHĂIȚĂ».
      nume: `${s.lastName} ${s.firstName}`.trim().toLocaleUpperCase('ro-RO'),
      actTip: s.idDocument.type,
      serie: s.idDocument.series,
      numar: s.idDocument.number,
      cnp: s.personalId,
      // Адреса — строкой: подписи бланка «municipiul/orașul/comuna», «satul/sectorul» заменяет тип пункта.
      domiciliu: addressText(s.address, localities),
    },
    contribuabil: {
      denumire: c.name,
      cif: c.taxId,
      sediu: addressText(c.seat, localities),
      telefon: c.phone,
      fax: c.fax,
      email: c.email,
      registruComertului: c.tradeRegister.office,
      nrRegistruComertului: c.tradeRegister.number,
      iban: formatIban(c.bank.iban),
      banca: c.bank.name,
    },
    // Шаблон печатает пункт «1. începând cu data de…» и строку таблицы на каждый участок — здесь он один.
    terenuri: [
      {
        dataDobandirii: formatDate(acquiredOn(deed)),
        nrAct: deed.number,
        dataAct: formatDate(deed.date),
        forma: deed.form === 'other' ? deed.formOther : FORM[deed.form],
        // Участок — без квартиры и подъезда; графы «comuna/orașul/municipiul», «satul/sectorul» — как в шапке.
        adresa: addressText({ street, number, locality, district }, localities),
        // Registrul agricol заполняет налоговый орган — графы остаются пустыми.
        registruPerioada: '',
        registruTip: '',
        registruVolum: '',
        registruPozitie: '',
        cota: land.share,
        coproprietari: land.coOwners,
        parcela: land.parcel || propertyAddressLine(p),
        intravilan: land.zoning,
        suprafete: Object.fromEntries(LAND_CATEGORIES.map((k) => [CATEGORY[k], formatArea(land.areas[k])])),
        rang: land.rank,
        zona: land.zone,
      },
    ],
    scutire: { cota: d.exemption.share, calitate: d.exemption.capacity, documente: d.exemption.documents },
    comunicareEmail: c.emailOnly === 'yes',
    anexe: d.attachments,
    data: formatDate(d.declarationDate),
    // Директор по умолчанию — подписант.
    director: d.director || fullName(s),
    sefContabil: d.chiefAccountant,
  }
}
