// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { withDefaults } from '../form/withDefaults'
import { emptyDeclaration } from '../itl002/schema'
import { sampleDeclaration } from '../itl002/sample'
import { sampleDeclaration as sample004 } from '../itl004/sample'
import { deleteDraft, draftTitle, isBlank, listDrafts, loadActiveDraft, saveDraft, STORAGE_KEY } from './storage'

afterEach(() => localStorage.clear())

describe('хранилище черновиков', () => {
  it('сохраняет, обновляет и удаляет черновик; последний сохранённый — активный', () => {
    const first = saveDraft(undefined, 'itl002', sampleDeclaration())
    const second = saveDraft(undefined, 'itl004', sample004())
    expect(loadActiveDraft()?.id).toBe(second.id)
    expect(loadActiveDraft()?.form).toBe('itl004')

    saveDraft(first.id, 'itl002', { ...sampleDeclaration(), adresaStrainatate: 'Paris' })
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

  it('черновик, сохранённый до появления ITL 004, открывается как ITL 002', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeId: 'a', drafts: [{ id: 'a', updatedAt: 1, values: { contribuabil: { denumire: 'Veche SRL' } } }] }))
    const draft = loadActiveDraft()
    expect(draft?.form).toBe('itl002')
    expect(draft?.values).toEqual({ ...emptyDeclaration(), contribuabil: { ...emptyDeclaration().contribuabil, denumire: 'Veche SRL' }, dataDeclaratiei: expect.any(String) })
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
    expect(isBlank('itl002', { ...emptyDeclaration(), dataDeclaratiei: '2020-01-01' })).toBe(true)
    expect(isBlank('itl002', { ...emptyDeclaration(), adresaStrainatate: 'Paris' })).toBe(false)
  })

  it('название — контрибуабил и объект декларации', () => {
    expect(draftTitle({ form: 'itl002', values: sampleDeclaration() })).toMatch(/^Exemplu Construcții Țărănești S\.R\.L\. · .+/)
    expect(draftTitle({ form: 'itl002', values: emptyDeclaration() })).toBe('Contribuabil necompletat')
    expect(draftTitle({ form: 'itl004', values: sample004() })).toBe('Exemplu Construcții Țărănești S.R.L. · Șos. Mihai Bravu 200, București')
  })
})
