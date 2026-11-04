// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { sampleDossier } from '../dossier/sample'
import { emptyDossier } from '../dossier/schema'
import { withDefaults } from '../form/withDefaults'
import { deleteDraft, draftTitle, isBlank, listDrafts, loadActiveDraft, saveDraft, STORAGE_KEY } from './storage'

afterEach(() => localStorage.clear())

describe('хранилище черновиков', () => {
  it('сохраняет, обновляет и удаляет черновик; последний сохранённый — активный', () => {
    const first = saveDraft(undefined, sampleDossier())
    const second = saveDraft(undefined, emptyDossier())
    expect(loadActiveDraft()?.id).toBe(second.id)

    const sample = sampleDossier()
    saveDraft(first.id, { ...sample, company: { ...sample.company, foreignResidence: 'Paris' } })
    expect(listDrafts().map((d) => d.id)).toEqual([first.id, second.id])
    expect(loadActiveDraft()?.values.company.foreignResidence).toBe('Paris')

    deleteDraft(first.id)
    expect(listDrafts().map((d) => d.id)).toEqual([second.id])
    expect(loadActiveDraft()).toBeUndefined()
  })

  it('повреждённые данные не ломают страницу', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(listDrafts()).toEqual([])
    expect(loadActiveDraft()).toBeUndefined()
  })

  it('черновики отдельных деклараций ITL 002 / ITL 004 удаляются', () => {
    localStorage.setItem('ditl.drafts.v1', JSON.stringify({ activeId: 'a', drafts: [{ id: 'a', form: 'itl002', updatedAt: 1, values: {} }] }))
    expect(listDrafts()).toEqual([])
    expect(localStorage.getItem('ditl.drafts.v1')).toBeNull()
  })

  it('старый черновик дополняется новыми полями схемы, лишние и неверного типа отбрасываются', () => {
    const defaults = emptyDossier()
    const values = withDefaults(defaults, {
      company: { name: 'Exemplu SRL', seat: { street: 'Lalelelor' }, removed: 'x' },
      signatory: { role: 1 },
      attachments: [{ name: 'Contract' }, {}],
    })
    expect(values.company.name).toBe('Exemplu SRL')
    expect(values.company.seat).toEqual({ ...defaults.company.seat, street: 'Lalelelor' })
    expect(values.company).not.toHaveProperty('removed')
    expect(values.signatory.role).toBe('')
    expect(values.attachments).toEqual([{ name: 'Contract' }, { name: '' }])
    expect(values.properties).toEqual(defaults.properties)
  })

  it('пустая форма — пустая при любой дате декларации', () => {
    expect(isBlank({ ...emptyDossier(), declarationDate: '2020-01-01' })).toBe(true)
    expect(isBlank({ ...emptyDossier(), director: 'Ion Popescu' })).toBe(false)
  })

  it('название — фирма и адреса объектов без повторов', () => {
    expect(draftTitle({ values: sampleDossier() })).toBe(
      'Exemplu Construcții Țărănești S.R.L. · Șos. Mihai Bravu 200, București · Str. Fabrica de Glucoză 11, București',
    )
    expect(draftTitle({ values: emptyDossier() })).toBe('Contribuabil necompletat')
  })
})
