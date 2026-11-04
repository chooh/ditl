import { formatArea, formatDate, formatIban, splitSector } from '../pdf/format'
import { LAND_ACQUISITION_TEXT, LAND_CATEGORIES, type Declaration } from './schema'

/**
 * Данные для шаблона src/typst/itl004.typ: всё уже строками в печатном виде.
 * Форма данных — как в src/typst/samples/itl004.json.
 */
export function toPrintData(d: Declaration) {
  const { reprezentant: r, contribuabil: c } = d
  const domiciliu = splitSector(r.domiciliu.judet)
  const sediu = splitSector(c.sediu.judet)
  const { strada, nr, bloc, scara, etaj, apartament, codPostal, localitate } = r.domiciliu

  return {
    rolNominal: d.antet.rolNominal,
    reprezentant: {
      nume: r.nume,
      actTip: d.actIdentitate.tip,
      serie: d.actIdentitate.serie,
      numar: d.actIdentitate.numar,
      cnp: r.cnp,
      tara: r.domiciliu.tara,
      ...domiciliu,
      codPostal,
      localitate,
      strada,
      nr,
      bloc,
      scara,
      etaj,
      apartament,
    },
    contribuabil: {
      denumire: c.denumire,
      cif: c.cui,
      ...sediu,
      localitate: c.sediu.localitate,
      codPostal: c.sediu.codPostal,
      strada: c.sediu.strada,
      nr: c.sediu.nr,
      bloc: c.sediu.bloc,
      scara: c.sediu.scara,
      etaj: c.sediu.etaj,
      apartament: c.sediu.apartament,
      telefon: c.telefon,
      fax: c.fax,
      email: c.email,
      registruComertului: c.registruComertului,
      nrRegistruComertului: c.nrRegistruComertului,
      iban: formatIban(c.iban),
      banca: c.banca,
    },
    terenuri: d.terenuri.map((t) => ({
      dataDobandirii: formatDate(t.dataDobandirii),
      nrAct: t.nrAct,
      dataAct: formatDate(t.dataAct),
      forma: LAND_ACQUISITION_TEXT[t.forma],
      localitate: t.localitate,
      sector: t.satSector,
      strada: t.strada,
      nr: t.nr,
      registruPerioada: t.registru.perioada,
      registruTip: t.registru.tip,
      registruVolum: t.registru.volum,
      registruPozitie: t.registru.pozitie,
      cota: t.cota,
      coproprietari: t.coproprietari,
      parcela: t.parcela || [t.nr ? `${t.strada} nr. ${t.nr}` : t.strada, t.localitate].join(', '),
      intravilan: t.intravilan,
      suprafete: Object.fromEntries(LAND_CATEGORIES.map((k) => [k, formatArea(t.suprafete[k])])),
      rang: t.rang,
      zona: t.zona,
    })),
    scutire: d.scutire,
    comunicareEmail: c.comunicareEmail === 'da',
    anexe: d.anexe,
    data: formatDate(d.dataDeclaratiei),
    director: d.semnatari.director,
    sefContabil: d.semnatari.sefContabil,
  }
}
