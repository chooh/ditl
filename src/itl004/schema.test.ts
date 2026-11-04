import { describe, expect, it } from 'vitest'
import { declarationSchema, emptyDeclaration } from './schema'
import { sampleDeclaration } from './sample'

const issuePaths = (input: unknown) => {
  const result = declarationSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

const sample = sampleDeclaration()
const withParcel = (patch: object) => ({ ...sample, terenuri: [{ ...sample.terenuri[0]!, ...patch }] })

describe('ITL 004: declarationSchema', () => {
  it('принимает тестовые данные и нормализует их', () => {
    const d = declarationSchema.parse(sample)
    expect(d.contribuabil.cui).toBe('18547290')
    expect(d.contribuabil.iban).toBe('RO49AAAA1B31007593840000')
    expect(d.terenuri[0]!.suprafete.constructii).toBe(15.2)
    expect(d.terenuri[0]!.suprafete.arabil).toBeNull()
  })

  it('пустая форма — ошибки по обязательным полям', () => {
    expect(issuePaths(emptyDeclaration())).toEqual(
      expect.arrayContaining([
        'contribuabil.denumire',
        'contribuabil.cui',
        'reprezentant.nume',
        'actIdentitate.numar',
        'terenuri.0.dataDobandirii',
        'terenuri.0.forma',
        'terenuri.0.intravilan',
        'terenuri.0.suprafete',
      ]),
    )
  })

  it('у участка нужна площадь хотя бы одной категории', () => {
    const suprafete = { ...sample.terenuri[0]!.suprafete, constructii: '' }
    expect(issuePaths(withParcel({ suprafete }))).toEqual(['terenuri.0.suprafete'])
    expect(issuePaths(withParcel({ suprafete: { ...suprafete, arabil: '1.200' } }))).toEqual([])
  })

  it('проверяет CNP и IBAN, если они указаны', () => {
    expect(issuePaths({ ...sample, reprezentant: { ...sample.reprezentant, cnp: '1800101221145' } })).toEqual(['reprezentant.cnp'])
    expect(issuePaths({ ...sample, reprezentant: { ...sample.reprezentant, cnp: '' } })).toEqual([])
    expect(issuePaths({ ...sample, contribuabil: { ...sample.contribuabil, iban: 'RO48AAAA1B31007593840000' } })).toEqual(['contribuabil.iban'])
  })

  it('не больше пяти участков, как на бланке', () => {
    expect(issuePaths({ ...sample, terenuri: Array(6).fill(sample.terenuri[0]) })).toEqual(['terenuri'])
  })
})
