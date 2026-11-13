import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadLocalities, type Locality } from '../address/siruta'
import { documentsFor } from '../documents'
import { sampleDossier } from '../dossier/sample'
import { dossierSchema, type DossierInput } from '../dossier/schema'
import { toPrintData as print002 } from '../itl002/print'
import { toPrintData as print004 } from '../itl004/print'
import { compileTypst } from '../test/typst'
import { bundleTypst, type TemplateId } from './bundle'
import { toTypst } from './literal'

const meta = { title: 'Declarație fiscală', filename: 'x.typ', date: '04.11.2026' }
const sampleJson = (id: TemplateId) => JSON.parse(readFileSync(new URL(`./samples/${id}.json`, import.meta.url), 'utf8'))
const parse = (input: DossierInput) => dossierSchema.parse(input)
let localities: Locality[]
beforeAll(async () => {
  localities = await loadLocalities()
})
/** Данные для печати из тестового досье; дата — как в samples/*.json. */
const printed = (id: TemplateId) => {
  const d = parse({ ...sampleDossier(), declarationDate: '2026-11-04' })
  return id === 'itl002' ? print002(d) : print004(d, localities)
}

describe('данные для шаблонов', () => {
  // samples/*.json нужны для правки шаблонов через `typst compile` — они не должны отставать от кода.
  it.each(['itl002', 'itl004'] as const)('%s: samples/*.json совпадает с тем, что печатает приложение', (id) => {
    expect(printed(id)).toEqual(sampleJson(id))
  })

  it('ITL 002: номер, дата и форма — из акта, адрес — в одной графе с сектором', () => {
    const sample = sampleDossier()
    const d = parse({ ...sample, deed: { ...sample.deed, acquiredOn: '2023-03-20', form: 'lease' } })
    const data = print002(d)
    expect(data.cladire).toMatchObject({ nrAct: '1234/2023', dataDobandirii: '20.03.2023', formaDobandire: 'inchiriere', tip: 'mixta' })
    expect(data.cladire.adresa.localitate).toBe('București, Sector 2')
    expect(data.actIdentitate).toEqual({ tip: 'CI', serie: 'RX', numar: '123456', eliberatDe: 'SPCEP Sector 2', data: '10.05.2020' })
    expect(data.anexe).toHaveLength(7)
  })

  it('ITL 002: законный представитель — раздел II пустой', () => {
    const d = parse({ ...sampleDossier(), signatory: { ...sampleDossier().signatory, role: 'representative' } })
    expect(print002(d).imputernicit).toBeNull()
  })

  it('ITL 004: один участок по акту, участок без parcela — адрес объекта, директор по умолчанию — подписант', () => {
    const sample = sampleDossier()
    const d = parse({ ...sample, director: '', property: { ...sample.property, land: { ...sample.property.land, parcel: '' } } })
    const data = print004(d, localities)
    expect(data.terenuri.map((t) => [t.nrAct, t.dataAct, t.dataDobandirii, t.forma, t.cota])).toEqual([
      ['1234/2023', '15.03.2023', '15.03.2023', 'dobândit', '12,50/1000'],
    ])
    expect(data.terenuri[0]!.adresa).toBe('municipiul București, sectorul 2, Șos. Mihai Bravu nr. 200')
    expect(data.terenuri[0]!.parcela).toBe('Șos. Mihai Bravu nr. 200, București')
    expect(data.director).toBe('Ion-Mihăiță Popescu')
  })

  it('адрес в селе: comuna и sat в своих графах, в одной графе — вместе с уездом', () => {
    const sample = sampleDossier()
    const village = { county: 'Alba', locality: 'Ciugud', district: 'Drâmbar' }
    const d = parse({
      ...sample,
      company: { ...sample.company, seat: { ...sample.company.seat, ...village }, correspondence: { ...sample.company.correspondence, ...village } },
      signatory: { ...sample.signatory, address: { ...sample.signatory.address, ...village } },
    })
    const itl002 = print002(d)
    expect(itl002.contribuabil.sediu).toMatchObject({ localitate: 'Drâmbar, Ciugud', judet: 'Alba' })
    expect(itl002.contribuabil.corespondenta.localitate).toBe('Drâmbar, Ciugud, jud. Alba')
    const itl004 = print004(d, localities)
    expect(itl004.reprezentant.domiciliu).toBe('satul Drâmbar, comuna Ciugud, județul Alba, Str. Lizeanu nr. 21, bl. C3, sc. A, et. 2, ap. 9, cod poștal 020232')
    expect(itl004.contribuabil.sediu).toMatch(/^satul Drâmbar, comuna Ciugud, județul Alba, Bd\. Ștefan cel Mare nr\. 14, /)
  })

  it('ITL 004: адрес в шапке — с типом пункта из SIRUTA, без «România» и без «str.» перед типом улицы', () => {
    const sample = sampleDossier()
    const at = (address: Partial<DossierInput['signatory']['address']>) =>
      print004(parse({ ...sample, signatory: { ...sample.signatory, address: { ...sample.signatory.address, ...address } } }), localities).reprezentant.domiciliu
    const brasov = { county: 'Brașov', locality: 'Brașov', district: '', street: 'Lungă', number: '5', block: '', entrance: '', floor: '', apartment: '', postalCode: '' }
    expect(at(brasov)).toBe('municipiul Brașov, județul Brașov, str. Lungă nr. 5')
    expect(at({ ...brasov, county: 'Alba', locality: 'Abrud' })).toBe('orașul Abrud, județul Alba, str. Lungă nr. 5')
    expect(at({ ...brasov, county: 'Alba', locality: 'Alba Iulia', district: 'Bărăbanț' })).toMatch(/^localitatea Bărăbanț, municipiul Alba Iulia, județul Alba,/)
    expect(at({ ...brasov, street: 'Șos. Mihai Bravu' })).toBe('municipiul Brașov, județul Brașov, Șos. Mihai Bravu nr. 5')
    // Нет в SIRUTA или за границей — только названия.
    expect(at({ ...brasov, locality: 'Brasovv' })).toBe('Brasovv, județul Brașov, str. Lungă nr. 5')
    expect(at({ ...brasov, county: '', locality: 'Paris', street: 'Rue de la Paix', number: '12', country: 'Franța' })).toBe('Paris, Franța, Rue de la Paix nr. 12')
  })

  it('ITL 004: адрес участка — как в шапке, без квартиры; без județ одноимённые пункты — только названия', () => {
    const sample = sampleDossier()
    const land = (address: Partial<DossierInput['property']['address']>) =>
      print004(parse({ ...sample, property: { ...sample.property, address: { ...sample.property.address, ...address } } }), localities).terenuri[0]!.adresa
    expect(land({ locality: 'Ciugud', district: 'Drâmbar', street: 'Principală' })).toBe('satul Drâmbar, comuna Ciugud, județul Alba, str. Principală nr. 200')
    expect(land({ locality: 'Albești', district: 'Albești', street: 'Principală' })).toBe('Albești, Albești, str. Principală nr. 200')
  })
})

describe('documentsFor', () => {
  it('ITL 002 на здание и ITL 004 на землю', () => {
    const docs = documentsFor(parse(sampleDossier()), localities)
    expect(docs.map((d) => [d.template, d.filename, d.label])).toEqual([
      ['itl002', 'ITL002_18547290', 'ITL 002 — clădirea, Șos. Mihai Bravu nr. 200, bl. P1, sc. B, et. 5, ap. 18'],
      ['itl004', 'ITL004_18547290', 'ITL 004 — terenul, Șos. Mihai Bravu nr. 200, bl. P1, sc. B, et. 5, ap. 18'],
    ])
  })
})

const pages = (pdf: Buffer) => pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length

describe('bundleTypst', () => {
  it('ITL 002: один файл компилируется на одной странице без предупреждений', () => {
    const { pdf, warnings } = compileTypst(bundleTypst('itl002', printed('itl002'), meta))
    expect(warnings).toEqual([])
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pages(pdf)).toBe(1)
  })

  it('ITL 004: одна страница без предупреждений, и с длинными адресами и пустыми необязательными полями', () => {
    const one = compileTypst(bundleTypst('itl004', printed('itl004'), meta))
    expect(one.warnings).toEqual([])
    expect(pages(one.pdf)).toBe(1)

    const sample = sampleDossier()
    const land = { ...sample.property.land, parcel: 'T12 P45, '.repeat(12), coOwners: 'Ionescu Maria, '.repeat(10) }
    const input = { ...sample, property: { ...sample.property, land }, attachments: [{ name: '' }] }
    expect(compileTypst(bundleTypst('itl004', print004(parse(input), localities), meta)).warnings).toEqual([])
  })

  it('ITL 002 без împuternicit и приложений', () => {
    const sample = sampleDossier()
    const input = {
      ...sample,
      signatory: { ...sample.signatory, role: 'representative' },
      attachments: [{ name: '' }],
    }
    const data = print002(parse(input))
    expect(data.imputernicit).toBeNull()
    expect(data.anexe).toEqual([])
    expect(compileTypst(bundleTypst('itl002', data, meta)).warnings).toEqual([])
  })

  it('кавычки, обратные слэши и переводы строк в данных не ломают файл', () => {
    const sample = sampleDossier()
    const input = { ...sample, company: { ...sample.company, name: 'S.C. „Test" \\ #1 $x$ *b* SRL' } }
    expect(() => compileTypst(bundleTypst('itl004', print004(parse(input), localities), meta))).not.toThrow()
  })
})

describe('toTypst', () => {
  it('словари, массивы из одного элемента, none и экранирование', () => {
    expect(toTypst({ a: [1], b: null, c: 'x"\\\ny', none: true, 'with space': {} })).toBe(
      ['(', '  a: (', '    1,', '  ),', '  b: none,', '  c: "x\\"\\\\\\ny",', '  "none": true,', '  "with space": (:),', ')'].join('\n'),
    )
  })
})
