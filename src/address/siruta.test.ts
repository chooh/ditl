import { beforeAll, describe, expect, it } from 'vitest'
import { findLocalities, loadLocalities, searchLocalities, type Locality } from './siruta'

let all: Locality[]
beforeAll(async () => {
  all = await loadLocalities()
})

const pick = (l: Locality) => ({ county: l.county, locality: l.uat, district: l.district })
const first = (query: string) => searchLocalities(all, query)[0]!

describe('справочник SIRUTA', () => {
  it('все уезды и сектора Бухареста', () => {
    expect(new Set(all.map((l) => l.county)).size).toBe(42)
    expect(all.filter((l) => l.county === 'București').map((l) => l.label)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `București, Sector ${n}`))
  })

  it('сектор: județ и municipiu București, sector — в «satul/sectorul»', () => {
    const l = first('sector 2')
    expect(pick(l)).toEqual({ county: 'București', locality: 'București', district: 'Sector 2' })
    expect(l.description).toBe('Sector al municipiului București')
  })

  it('город: «satul/sectorul» пустая', () => {
    const l = first('alba iulia')
    expect(pick(l)).toEqual({ county: 'Alba', locality: 'Alba Iulia', district: '' })
    expect(l.label).toBe('mun. Alba Iulia, jud. Alba')
    expect(l.description).toBe('Municipiu, județul Alba')
  })

  it('село: comuna — в «municipiul/orașul/comuna», село — в «satul/sectorul»', () => {
    const l = first('drambar')
    expect(pick(l)).toEqual({ county: 'Alba', locality: 'Ciugud', district: 'Drâmbar' })
    expect(l.label).toBe('Drâmbar, com. Ciugud, jud. Alba')
    expect(l.description).toBe('Sat aparținând comunei Ciugud, județul Alba')
  })

  it('имена в обычном написании, ș/ț с запятой', () => {
    expect(first('curtea de arges').label).toBe('mun. Curtea de Argeș, jud. Argeș')
    expect(first('valea lui mihai').uat).toBe('Valea lui Mihai')
    expect(all.some((l) => /[şţŞŢ]/.test(l.name + l.uat + l.county))).toBe(false)
  })

  it('поиск без диакритики, по нескольким словам и по подписи в поле', () => {
    expect(first('bucuresti 2').label).toBe('București, Sector 2')
    expect(first('ciugud alba').label).toBe('Ciugud, com. Ciugud, jud. Alba')
    expect(first('Drâmbar, com. Ciugud, jud. Alba').name).toBe('Drâmbar')
    expect(searchLocalities(all, 'qwerty')).toEqual([])
    expect(searchLocalities(all, '')).toEqual([])
  })

  it('значения полей → населённый пункт', () => {
    expect(findLocalities(all, { county: 'București', locality: 'Bucuresti', district: 'sectorul 2' }).map((l) => l.label)).toEqual(['București, Sector 2'])
    expect(findLocalities(all, { locality: 'București', district: '2' })).toHaveLength(1)
    expect(findLocalities(all, { county: 'Alba', locality: 'Alba Iulia', district: '' })).toHaveLength(1)
    expect(findLocalities(all, { county: 'Ilfov', locality: 'Alba Iulia', district: '' })).toEqual([])
    expect(findLocalities(all, { county: 'București', locality: 'București', district: '' })).toEqual([])
    expect(findLocalities(all, { locality: '', district: '' })).toEqual([])
  })
})
