import { describe, expect, it } from 'vitest'
import { validInput } from '../test/itl002'
import { declarationSchema, emptyDeclaration } from './schema'

const issuePaths = (input: unknown) => {
  const result = declarationSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'))
}

describe('declarationSchema', () => {
  it('принимает корректную декларацию и нормализует данные', () => {
    const d = declarationSchema.parse(validInput)
    expect(d.contribuabil.cui).toBe('18547290')
    expect(d.cladire.valoareAchizitie).toBe(1250000)
    expect(d.cladire.indicatori.d.nerez.valoare).toBe(500000.5)
    expect(d.anexe).toHaveLength(2)
  })

  it('пустая форма — ошибки по обязательным полям', () => {
    expect(issuePaths(emptyDeclaration())).toEqual(
      expect.arrayContaining(['contribuabil.denumire', 'contribuabil.cui', 'cladire.tip', 'actIdentitate.numar']),
    )
  })

  it('проверяет контрольную цифру CUI', () => {
    expect(issuePaths({ ...validInput, contribuabil: { ...validInput.contribuabil, cui: '18547291' } })).toContain('contribuabil.cui')
  })

  it('DA для e-mail требует адрес почты', () => {
    const input = { ...validInput, contribuabil: { ...validInput.contribuabil, email: '' } }
    expect(issuePaths(input)).toContain('contribuabil.email')
  })

  it('значение индикатора требует дату документа', () => {
    const indicatori = { ...validInput.cladire.indicatori, a: { rez: { valoare: '100', data: '' }, nerez: { valoare: '', data: '' } } }
    expect(issuePaths({ ...validInput, cladire: { ...validInput.cladire, indicatori } })).toContain('cladire.indicatori.a.rez.data')
  })

  it('колонки, не относящиеся к типу здания, не учитываются', () => {
    const indicatori = { ...emptyDeclaration().cladire.indicatori, a: { rez: { valoare: '', data: '' }, nerez: { valoare: '100', data: '2020-01-01' } } }
    const input = { ...validInput, cladire: { ...validInput.cladire, tip: 'rezidentiala', indicatori } }
    expect(issuePaths(input)).toContain('cladire.indicatori')
  })

  it('împuternicit: проверяет CNP или CUI', () => {
    const imputernicit = { ...validInput.imputernicit, exista: true, nume: 'Popescu', prenume: 'Ion' }
    expect(issuePaths({ ...validInput, imputernicit: { ...imputernicit, cif: '1800101221144' } })).toEqual([])
    expect(issuePaths({ ...validInput, imputernicit: { ...imputernicit, cif: '18547290' } })).toEqual([])
    expect(issuePaths({ ...validInput, imputernicit: { ...imputernicit, cif: '123' } })).toContain('imputernicit.cif')
  })

  it('код почтовый для Румынии — 6 цифр', () => {
    const sediu = { ...validInput.contribuabil.sediu, codPostal: '1234' }
    expect(issuePaths({ ...validInput, contribuabil: { ...validInput.contribuabil, sediu } })).toContain('contribuabil.sediu.codPostal')
  })
})
