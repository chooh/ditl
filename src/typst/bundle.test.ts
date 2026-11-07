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
/** Данные для печати из тестового досье (ITL 002 — по первому объекту); дата — как в samples/*.json. */
const printed = (id: TemplateId) => {
  const d = parse({ ...sampleDossier(), declarationDate: '2026-11-04' })
  return id === 'itl002' ? print002(d, 0) : print004(d, localities)
}

describe('данные для шаблонов', () => {
  // samples/*.json нужны для правки шаблонов через `typst compile` — они не должны отставать от кода.
  it.each(['itl002', 'itl004'] as const)('%s: samples/*.json совпадает с тем, что печатает приложение', (id) => {
    expect(printed(id)).toEqual(sampleJson(id))
  })

  it('ITL 002: номер и форма акта — из акта объекта, документ подписанта — из досье', () => {
    const d = parse(sampleDossier())
    const office = print002(d, 2)
    expect(office.cladire).toMatchObject({ nrAct: '567/2024', dataDobandirii: '10.09.2024', formaDobandire: 'proprietate', tip: 'nerezidentiala' })
    expect(office.cladire.adresa.localitate).toBe('București, Sector 2')
    expect(office.actIdentitate).toEqual({ tip: 'CI', serie: 'RX', numar: '123456', eliberatDe: 'SPCEP Sector 2', data: '10.05.2020' })
    expect(office.anexe).toEqual([
      'Certificat de înregistrare ONRC',
      'Împuternicire notarială',
      'Copie act de identitate împuternicit',
      'Contract de vânzare-cumpărare nr. 567/2024',
    ])
  })

  it('ITL 002: законный представитель — раздел II пустой', () => {
    const d = parse({ ...sampleDossier(), signatory: { ...sampleDossier().signatory, role: 'representative' } })
    expect(print002(d, 0).imputernicit).toBeNull()
  })

  it('ITL 004: по пункту на каждый объект, приложения без повторов, директор по умолчанию — подписант', () => {
    const d = parse({ ...sampleDossier(), director: '' })
    const data = print004(d, localities)
    expect(data.terenuri.map((t) => [t.nrAct, t.dataDobandirii, t.cota])).toEqual([
      ['1234/2023', '15.03.2023', '12,50/1000'],
      ['1234/2023', '15.03.2023', '1,20/1000'],
      ['567/2024', '10.09.2024', '3,80/1000'],
    ])
    expect(data.terenuri[2]!.parcela).toBe('Str. Fabrica de Glucoză nr. 11, București')
    expect(data.terenuri[0]!.adresa).toBe('municipiul București, sectorul 2, Șos. Mihai Bravu nr. 200')
    expect(data.terenuri[2]!.adresa).toBe('municipiul București, sectorul 2, Str. Fabrica de Glucoză nr. 11')
    expect(new Set(data.anexe).size).toBe(data.anexe.length)
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
    const itl002 = print002(d, 0)
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
    const land = (address: Partial<DossierInput['properties'][number]['address']>) =>
      print004(parse({ ...sample, properties: sample.properties.map((p) => ({ ...p, address: { ...p.address, ...address } })) }), localities).terenuri[0]!.adresa
    expect(land({ locality: 'Ciugud', district: 'Drâmbar', street: 'Principală' })).toBe('satul Drâmbar, comuna Ciugud, județul Alba, str. Principală nr. 200')
    expect(land({ locality: 'Albești', district: 'Albești', street: 'Principală' })).toBe('Albești, Albești, str. Principală nr. 200')
  })
})

describe('documentsFor', () => {
  it('ITL 002 на каждый объект и одна ITL 004', () => {
    const docs = documentsFor(parse(sampleDossier()), localities)
    expect(docs.map((d) => [d.template, d.filename, d.label])).toEqual([
      ['itl002', 'ITL002_18547290_1', 'ITL 002 — Șos. Mihai Bravu nr. 200, bl. P1, sc. B, et. 5, ap. 18'],
      ['itl002', 'ITL002_18547290_2', 'ITL 002 — Șos. Mihai Bravu nr. 200, bl. P1, sc. B, et. -2, ap. P14'],
      ['itl002', 'ITL002_18547290_3', 'ITL 002 — Str. Fabrica de Glucoză nr. 11, bl. C, et. 3, ap. 7'],
      ['itl004', 'ITL004_18547290', 'ITL 004 — teren, 3 imobile'],
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

  it('ITL 004: с одним объектом — одна страница, с тремя и девятью приложениями — две', () => {
    const sample = sampleDossier()
    const single = print004(parse({ ...sample, properties: [sample.properties[0]!], deeds: [sample.deeds[0]!] }), localities)
    const one = compileTypst(bundleTypst('itl004', single, meta))
    expect(one.warnings).toEqual([])
    expect(pages(one.pdf)).toBe(1)

    const three = compileTypst(bundleTypst('itl004', printed('itl004'), meta))
    expect(three.warnings).toEqual([])
    expect(pages(three.pdf)).toBe(2)
  })

  it('ITL 004: больше пяти объектов с длинными адресами и пустые необязательные поля', () => {
    const sample = sampleDossier()
    const p = sample.properties[0]!
    const long = { ...p, land: { ...p.land, parcel: 'T12 P45, '.repeat(12), coOwners: 'Ionescu Maria, '.repeat(10) } }
    const plain = { ...p, land: { ...p.land, parcel: '' } }
    const input = { ...sample, properties: [long, ...Array(7).fill(plain)], attachments: [{ name: '' }] }
    const data = print004(parse(input), localities)
    expect(data.terenuri).toHaveLength(8)
    expect(compileTypst(bundleTypst('itl004', data, meta)).warnings).toEqual([])
  })

  it('ITL 002 без împuternicit и приложений', () => {
    const sample = sampleDossier()
    const input = {
      ...sample,
      signatory: { ...sample.signatory, role: 'representative' },
      attachments: [{ name: '' }],
      deeds: sample.deeds.map((d) => ({ ...d, attachments: [{ name: '' }] })),
      properties: sample.properties.map((p) => ({ ...p, attachments: [{ name: '' }] })),
    }
    const data = print002(parse(input), 0)
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
