import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
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
/** Данные для печати из тестового досье (ITL 002 — по первому объекту); дата — как в samples/*.json. */
const printed = (id: TemplateId) => {
  const d = parse({ ...sampleDossier(), declarationDate: '2026-11-04' })
  return id === 'itl002' ? print002(d, 0) : print004(d)
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
    const data = print004(d)
    expect(data.terenuri.map((t) => [t.nrAct, t.dataDobandirii, t.cota])).toEqual([
      ['1234/2023', '15.03.2023', '12,50/1000'],
      ['1234/2023', '15.03.2023', '1,20/1000'],
      ['567/2024', '10.09.2024', '3,80/1000'],
    ])
    expect(data.terenuri[2]!.parcela).toBe('Str. Fabrica de Glucoză nr. 11, București')
    expect(data.terenuri[0]!.sector).toBe('2')
    expect(new Set(data.anexe).size).toBe(data.anexe.length)
    expect(data.director).toBe('Ion-Mihăiță Popescu')
  })
})

describe('documentsFor', () => {
  it('ITL 002 на каждый объект и одна ITL 004', () => {
    const docs = documentsFor(parse(sampleDossier()))
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
    const single = print004(parse({ ...sample, properties: [sample.properties[0]!], deeds: [sample.deeds[0]!] }))
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
    const data = print004(parse(input))
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
    expect(() => compileTypst(bundleTypst('itl004', print004(parse(input)), meta))).not.toThrow()
  })
})

describe('toTypst', () => {
  it('словари, массивы из одного элемента, none и экранирование', () => {
    expect(toTypst({ a: [1], b: null, c: 'x"\\\ny', none: true, 'with space': {} })).toBe(
      ['(', '  a: (', '    1,', '  ),', '  b: none,', '  c: "x\\"\\\\\\ny",', '  "none": true,', '  "with space": (:),', ')'].join('\n'),
    )
  })
})
