// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { emptyDeclaration } from '../form/schema'
import { sampleDeclaration } from '../form/sample'
import { deleteDraft, draftTitle, isBlank, listDrafts, loadActiveDraft, saveDraft, STORAGE_KEY, withDefaults } from './storage'

afterEach(() => localStorage.clear())

describe('хранилище черновиков', () => {
  it('сохраняет, обновляет и удаляет черновик; последний сохранённый — активный', () => {
    const first = saveDraft(undefined, sampleDeclaration())
    const second = saveDraft(undefined, emptyDeclaration())
    expect(loadActiveDraft()?.id).toBe(second.id)

    saveDraft(first.id, { ...sampleDeclaration(), adresaStrainatate: 'Paris' })
    expect(listDrafts().map((d) => d.id)).toEqual([first.id, second.id])
    expect(loadActiveDraft()?.values.adresaStrainatate).toBe('Paris')

    deleteDraft(first.id)
    expect(listDrafts().map((d) => d.id)).toEqual([second.id])
    expect(loadActiveDraft()).toBeUndefined()
  })

  it('повреждённые данные не ломают страницу', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(listDrafts()).toEqual([])
    expect(loadActiveDraft()).toBeUndefined()
  })

  it('старый черновик дополняется новыми полями схемы, лишние и неверного типа отбрасываются', () => {
    const defaults = emptyDeclaration()
    const values = withDefaults(defaults, {
      contribuabil: { denumire: 'Exemplu SRL', sediu: { strada: 'Lalelelor' }, removed: 'x' },
      imputernicit: { exista: 'yes' },
      anexe: [{ denumire: 'Contract' }, {}],
    })
    expect(values.contribuabil.denumire).toBe('Exemplu SRL')
    expect(values.contribuabil.sediu).toEqual({ ...defaults.contribuabil.sediu, strada: 'Lalelelor' })
    expect(values.contribuabil).not.toHaveProperty('removed')
    expect(values.imputernicit.exista).toBe(false)
    expect(values.anexe).toEqual([{ denumire: 'Contract' }, { denumire: '' }])
    expect(values.cladire).toEqual(defaults.cladire)
  })

  it('пустая форма — пустая при любой дате декларации', () => {
    expect(isBlank({ ...emptyDeclaration(), dataDeclaratiei: '2020-01-01' })).toBe(true)
    expect(isBlank({ ...emptyDeclaration(), adresaStrainatate: 'Paris' })).toBe(false)
  })

  it('название — контрибуабил и адрес здания', () => {
    expect(draftTitle(sampleDeclaration())).toMatch(/^Exemplu Construcții Țărănești S\.R\.L\. · .+/)
    expect(draftTitle(emptyDeclaration())).toBe('Contribuabil necompletat')
  })
})
