import { describe, expect, it } from 'vitest'
import { sampleDossier } from './sample'
import { dossierSchema, emptyDeed, emptyDossier, forSameCompany, nextProperty } from './schema'

const issuePaths = (input: unknown) => {
  const result = dossierSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

const sample = sampleDossier()
const withSignatory = (patch: object) => ({ ...sample, signatory: { ...sample.signatory, ...patch } })
const withIdDocument = (patch: object) => withSignatory({ idDocument: { ...sample.signatory.idDocument, ...patch } })

describe('dossierSchema', () => {
  it('принимает тестовое досье и нормализует данные', () => {
    const d = dossierSchema.parse(sample)
    expect(d.company.taxId).toBe('RO18547290')
    expect(d.company.uniqueId).toBe('18547290')
    expect(d.company.bank.iban).toBe('RO49AAAA1B31007593840000')
    expect(d.properties[0]!.building.purchaseValue).toBe(1250000)
    expect(d.properties[0]!.building.values.b.residential.value).toBe(760500.5)
    expect(d.properties[0]!.land.areas.builtUp).toBe(15.2)
    expect(d.properties[0]!.land.areas.arable).toBeNull()
    expect(d.deeds[0]!.attachments).toEqual(['Contract de vânzare-cumpărare nr. 1234/2023', 'Încheiere de intabulare'])
  })

  it('даты документа подписанта — Date; пустой срок действия — null', () => {
    const { idDocument } = dossierSchema.parse(sample).signatory
    expect(idDocument.issuedOn).toEqual(new Date(2020, 4, 10))
    expect(idDocument.validTill).toEqual(new Date(2030, 4, 10))
    expect(dossierSchema.parse(withIdDocument({ validTill: '' })).signatory.idDocument.validTill).toBeNull()
  })

  it('пустое досье — ошибки по обязательным полям', () => {
    expect(issuePaths(emptyDossier())).toEqual(
      expect.arrayContaining([
        'company.name',
        'company.taxId',
        'company.uniqueId',
        'signatory.role',
        'signatory.lastName',
        'signatory.idDocument.number',
        'signatory.idDocument.issuedOn',
        'deeds.0.number',
        'deeds.0.date',
        'deeds.0.form',
        'properties.0.address.street',
        'properties.0.building.type',
        'properties.0.land.zoning',
        'properties.0.land.areas',
      ]),
    )
  })

  it('проверяет контрольные цифры CIF, CUI, CNP и IBAN', () => {
    expect(issuePaths({ ...sample, company: { ...sample.company, taxId: 'RO18547291' } })).toEqual(['company.taxId'])
    expect(issuePaths({ ...sample, company: { ...sample.company, uniqueId: '18547291' } })).toEqual(['company.uniqueId'])
    expect(issuePaths(withSignatory({ personalId: '1800101221145' }))).toEqual(['signatory.personalId'])
    expect(issuePaths({ ...sample, company: { ...sample.company, bank: { ...sample.company.bank, iban: 'RO48AAAA1B31007593840000' } } })).toEqual([
      'company.bank.iban',
    ])
  })

  it('номер в registrul comerțului — в формате ONRC, новом или старом', () => {
    const withNumber = (number: string) => ({ ...sample, company: { ...sample.company, tradeRegister: { ...sample.company.tradeRegister, number } } })
    expect(dossierSchema.parse(withNumber(' j2026 123456 002 ')).company.tradeRegister.number).toBe('J2026123456002')
    expect(issuePaths(withNumber('J40/1234/2006'))).toEqual([])
    expect(issuePaths(withNumber(''))).toEqual([])
    expect(issuePaths(withNumber('J202612345600'))).toEqual(['company.tradeRegister.number'])
    expect(issuePaths(withNumber('40/1234/2006'))).toEqual(['company.tradeRegister.number'])
  })

  it('CNP обязателен для împuternicit, для законного представителя — нет', () => {
    expect(issuePaths(withSignatory({ personalId: '' }))).toEqual(['signatory.personalId'])
    expect(issuePaths(withSignatory({ role: 'representative', personalId: '' }))).toEqual([])
  })

  it('документ подписанта: выдан не в будущем, действителен на дату декларации', () => {
    expect(issuePaths(withIdDocument({ issuedOn: '2999-01-01', validTill: '' }))).toEqual(['signatory.idDocument.issuedOn'])
    expect(issuePaths(withIdDocument({ validTill: '2019-01-01' }))).toEqual(['signatory.idDocument.validTill'])
    expect(issuePaths({ ...withIdDocument({ validTill: '2026-01-01' }), declarationDate: '2026-01-02' })).toEqual(['signatory.idDocument.validTill'])
    expect(issuePaths({ ...withIdDocument({ validTill: '2026-01-02' }), declarationDate: '2026-01-02' })).toEqual([])
  })

  it('DA для e-mail требует адрес почты', () => {
    expect(issuePaths({ ...sample, company: { ...sample.company, email: '' } })).toEqual(['company.email'])
  })

  it('код почтовый для Румынии — 6 цифр', () => {
    const seat = { ...sample.company.seat, postalCode: '1234' }
    expect(issuePaths({ ...sample, company: { ...sample.company, seat } })).toEqual(['company.seat.postalCode'])
  })

  it('«alte modalități» требует уточнения', () => {
    const deeds = [{ ...sample.deeds[0]!, form: 'other' }, sample.deeds[1]!]
    expect(issuePaths({ ...sample, deeds })).toEqual(['deeds.0.formOther'])
  })

  it('объект ссылается на существующий акт', () => {
    const properties = [{ ...sample.properties[0]!, deedId: 'deed-x' }, ...sample.properties.slice(1)]
    expect(issuePaths({ ...sample, properties })).toEqual(['properties.0.deedId'])
  })

  it('стоимость здания: нужна хотя бы одна, у каждой — дата документа', () => {
    const p = sample.properties[2]!
    const values = { ...p.building.values, d: { residential: { value: '', date: '' }, nonResidential: { value: '380.000', date: '' } } }
    const properties = [...sample.properties.slice(0, 2), { ...p, building: { ...p.building, values } }]
    expect(issuePaths({ ...sample, properties })).toEqual(['properties.2.building.values.d.nonResidential.date'])

    // Колонка rezidențial не относится к нерезидентному зданию и не считается.
    const residentialOnly = { ...p.building.values, d: { residential: { value: '100', date: '2024-01-01' }, nonResidential: { value: '', date: '' } } }
    const other = [...sample.properties.slice(0, 2), { ...p, building: { ...p.building, values: residentialOnly } }]
    expect(issuePaths({ ...sample, properties: other })).toEqual(['properties.2.building.values'])
  })

  it('у земли нужна площадь хотя бы одной категории', () => {
    const p = sample.properties[0]!
    const areas = { ...p.land.areas, builtUp: '' }
    const withAreas = (a: typeof areas) => ({ ...sample, properties: [{ ...p, land: { ...p.land, areas: a } }, ...sample.properties.slice(1)] })
    expect(issuePaths(withAreas(areas))).toEqual(['properties.0.land.areas'])
    expect(issuePaths(withAreas({ ...areas, arable: '1.200' }))).toEqual([])
  })

  it('объектов может быть больше пяти — все попадают в одну ITL 004', () => {
    const properties = Array.from({ length: 7 }, () => sample.properties[0]!)
    expect(issuePaths({ ...sample, properties })).toEqual([])
  })
})

describe('заготовки', () => {
  it('новый объект берёт акт и адрес дома у предыдущего, но не квартиру и не стоимость', () => {
    const prev = sample.properties[0]!
    const next = nextProperty(prev, 'deed-2')
    expect(next.deedId).toBe('deed-1')
    expect(next.address).toMatchObject({ street: 'Șos. Mihai Bravu', number: '200', block: 'P1', floor: '', apartment: '' })
    expect(next.land).toMatchObject({ zoning: 'I', rank: '0', zone: 'A', share: '', parcel: '' })
    expect(next.building.type).toBe('')
    expect(nextProperty(undefined, 'deed-2').deedId).toBe('deed-2')
  })

  it('у новых актов разные id', () => {
    expect(emptyDeed().id).not.toBe(emptyDeed().id)
  })

  it('досье той же фирмы: реквизиты и подписант, без актов и объектов', () => {
    const next = forSameCompany(sample)
    expect(next.company).toEqual(sample.company)
    expect(next.signatory).toEqual(sample.signatory)
    expect(next.director).toBe(sample.director)
    expect(next.deeds).toEqual(emptyDossier().deeds)
    expect(next.properties).toEqual(emptyDossier().properties)
    expect(next.attachments).toEqual(emptyDossier().attachments)
  })
})
