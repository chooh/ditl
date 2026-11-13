import { describe, expect, it } from 'vitest'
import { sampleDossier } from './sample'
import { dossierSchema, emptyDossier, forSameCompany, forSameDeed } from './schema'

const issuePaths = (input: unknown) => {
  const result = dossierSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

const sample = sampleDossier()
const withSignatory = (patch: object) => ({ ...sample, signatory: { ...sample.signatory, ...patch } })
const withIdDocument = (patch: object) => withSignatory({ idDocument: { ...sample.signatory.idDocument, ...patch } })
const p = sample.property
const withBuilding = (patch: object) => ({ ...sample, property: { ...p, building: { ...p.building, ...patch } } })
const withLand = (patch: object) => ({ ...sample, property: { ...p, land: { ...p.land, ...patch } } })

describe('dossierSchema', () => {
  it('принимает тестовое досье и нормализует данные', () => {
    const d = dossierSchema.parse(sample)
    expect(d.company.taxId).toBe('RO18547290')
    expect(d.company.uniqueId).toBe('18547290')
    expect(d.company.bank.iban).toBe('RO49AAAA1B31007593840000')
    expect(d.property.building.purchaseValue).toBe(1250000)
    expect(d.property.building.values.b.residential.value).toBe(760500.5)
    expect(d.property.land.areas.builtUp).toBe(15.2)
    expect(d.property.land.areas.arable).toBeNull()
    expect(d.attachments).toHaveLength(7)
    expect(dossierSchema.parse({ ...sample, attachments: [{ name: 'ONRC' }, { name: '' }] }).attachments).toEqual(['ONRC'])
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
        'deed.number',
        'deed.date',
        'deed.form',
        'property.address.street',
        'property.address.locality',
        'property.building.type',
        'property.land.zoning',
        'property.land.areas',
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

  it('сектор в графе județ (как в старых черновиках) переносится в «satul/sectorul»', () => {
    const seat = { ...sample.company.seat, county: 'Sector 2', district: '' }
    expect(dossierSchema.parse({ ...sample, company: { ...sample.company, seat } }).company.seat).toMatchObject({
      county: 'București',
      locality: 'București',
      district: 'Sector 2',
    })
  })

  it('«alte modalități» требует уточнения', () => {
    expect(issuePaths({ ...sample, deed: { ...sample.deed, form: 'other' } })).toEqual(['deed.formOther'])
    expect(issuePaths({ ...sample, deed: { ...sample.deed, form: 'other', formOther: 'moștenire' } })).toEqual([])
  })

  it('стоимость здания: нужна хотя бы одна, у каждой — дата документа', () => {
    const only = (d: object) => ({ ...emptyDossier().property.building.values, d })
    const office = (d: object) => withBuilding({ type: 'nonResidential', values: only(d) })
    expect(issuePaths(office({ residential: { value: '', date: '' }, nonResidential: { value: '380.000', date: '' } }))).toEqual([
      'property.building.values.d.nonResidential.date',
    ])
    expect(issuePaths(office({ residential: { value: '', date: '' }, nonResidential: { value: '', date: '2024-01-01' } }))).toEqual([
      'property.building.values.d.nonResidential.value',
      'property.building.values',
    ])

    // Колонка rezidențial не относится к нерезидентному зданию и не считается.
    expect(issuePaths(office({ residential: { value: '100', date: '2024-01-01' }, nonResidential: { value: '', date: '' } }))).toEqual([
      'property.building.values',
    ])
  })

  it('у земли нужна площадь хотя бы одной категории', () => {
    const areas = { ...p.land.areas, builtUp: '' }
    expect(issuePaths(withLand({ areas }))).toEqual(['property.land.areas'])
    expect(issuePaths(withLand({ areas: { ...areas, arable: '1.200' } }))).toEqual([])
  })
})

describe('заготовки', () => {
  it('досье той же фирмы: реквизиты и подписант, без акта, объекта и приложений', () => {
    const next = forSameCompany(sample)
    expect(next.company).toEqual(sample.company)
    expect(next.signatory).toEqual(sample.signatory)
    expect(next.director).toBe(sample.director)
    expect(next.deed).toEqual(emptyDossier().deed)
    expect(next.property).toEqual(emptyDossier().property)
    expect(next.attachments).toEqual(emptyDossier().attachments)
  })

  it('досье той же фирмы и договора: ещё акт и адрес дома, но не квартира, стоимость и доля', () => {
    const next = forSameDeed(sample)
    expect(next.company).toEqual(sample.company)
    expect(next.deed).toEqual(sample.deed)
    expect(next.property.address).toMatchObject({ street: 'Șos. Mihai Bravu', number: '200', block: 'P1', floor: '', apartment: '', district: 'Sector 2' })
    expect(next.property.land).toMatchObject({ zoning: 'I', rank: '0', zone: 'A', share: '', parcel: '', coOwners: '' })
    expect(next.property.land.areas).toEqual(emptyDossier().property.land.areas)
    expect(next.property.building).toEqual(emptyDossier().property.building)
    expect(next.attachments).toEqual(emptyDossier().attachments)
  })
})
