import { looseEquals } from '../form/validators'
import type siruta from './siruta.json'

/**
 * Справочник населённых пунктов SIRUTA (INS) для адресных полей. Данные — в siruta.json,
 * собираются scripts/siruta.ts; чанк грузится при первом показе адреса. Иерархия SIRUTA
 * совпадает с графами бланков: județ → municipiu/oraș/comună → sat/sector.
 */

type UatType = 'municipiu' | 'oraș' | 'comună'

export type Locality = {
  /** Как в SIRUTA: «Sector 2», «Alba Iulia», «Bărăbanț». */
  name: string
  /** Județul; у Бухареста — «București». */
  county: string
  /** Municipiul / orașul / comuna. */
  uat: string
  uatType: UatType
  /** Satul / sectorul; у самого города (реședința municipiului или orașului) — пусто. */
  district: string
  /** Что такое district: сектор, село или localitate componentă города; у самого города — null. */
  districtKind: 'sector' | 'sat' | 'localitate' | null
  /** Подпись в списке и в поле поиска: «București, Sector 2», «Drâmbar, com. Ciugud, jud. Alba». */
  label: string
  /** «Sat aparținând comunei Ciugud, județul Alba». */
  description: string
  /** Для поиска: имя и подпись без диакритики, строчными. */
  folded: { name: string; all: string }
  /** Порядок в выдаче: сектора и города раньше сёл. */
  rank: number
}

/** Коды TIP SIRUTA (legenda): UAT и населённые пункты. */
const UAT_TYPE: Record<number, UatType> = { 1: 'municipiu', 4: 'municipiu', 9: 'municipiu', 2: 'oraș', 5: 'oraș', 3: 'comună' }
const GENITIVE: Record<UatType, string> = { municipiu: 'municipiului', oraș: 'orașului', comună: 'comunei' }
const SHORT: Record<UatType, string> = { municipiu: 'mun.', oraș: 'oraș', comună: 'com.' }
const SECTOR = 6
export const BUCHAREST = 'București'
const SEAT = [9, 17] // reședința municipiului / orașului
const COMPONENT = [10, 18] // localitate componentă
const VILLAGE_SEAT = 22 // sat reședință de comună

export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\d]+/gu, ' ')
    .trim()

function describe(type: number, uat: string, uatType: UatType, county: string, district: string): string {
  const of = `${GENITIVE[uatType]} ${uat}`
  const inCounty = `județul ${county}`
  if (type === SECTOR) return `Sector al municipiului ${uat}`
  if (!district) return `${uatType[0]!.toUpperCase()}${uatType.slice(1)}, ${inCounty}`
  if (SEAT.includes(type)) return `Localitate componentă, reședința ${of}, ${inCounty}`
  if (COMPONENT.includes(type)) return `Localitate componentă a ${of}, ${inCounty}`
  if (type === VILLAGE_SEAT) return `Sat, reședința ${of}, ${inCounty}`
  return `Sat aparținând ${of}, ${inCounty}`
}

export function buildLocalities({ counties }: Pick<typeof siruta, 'counties'>): Locality[] {
  return counties.flatMap(([county, uats]) =>
    uats.flatMap(([uat, uatTip, localities]) =>
      localities.map(([name, type]): Locality => {
        const uatType = UAT_TYPE[uatTip] ?? 'comună'
        // Сам город — не «сат»: у реședința графа «satul/sectorul» пустая.
        const district = SEAT.includes(type) && looseEquals(name, uat) ? '' : name
        const label =
          county === BUCHAREST
            ? [uat, district].filter(Boolean).join(', ')
            : [district, `${SHORT[uatType]} ${uat}`, `jud. ${county}`].filter(Boolean).join(', ')
        return {
          name,
          county,
          uat,
          uatType,
          district,
          districtKind: type === SECTOR ? 'sector' : !district ? null : SEAT.includes(type) || COMPONENT.includes(type) ? 'localitate' : 'sat',
          label,
          description: describe(type, uat, uatType, county, district),
          // Подпись — чтобы поиск находил и текст, уже стоящий в поле после выбора.
          folded: { name: fold(name), all: fold(`${name} ${label}`) },
          rank: type === SECTOR || !district ? 0 : type === VILLAGE_SEAT ? 1 : 2,
        }
      }),
    ),
  )
}

let loading: Promise<Locality[]> | undefined

/** Справочник целиком; загружается один раз. */
export function loadLocalities(): Promise<Locality[]> {
  loading ??= import('./siruta.json').then((m) => buildLocalities(m.default))
  return loading
}

/**
 * Поиск по началу слов в имени, UAT и județ, без учёта диакритики: «drambar», «ciugud alba»,
 * «bucuresti 2». Сначала совпадения по имени, затем сектора и города, затем сёла.
 */
export function searchLocalities(all: Locality[], query: string, limit = 50): Locality[] {
  const q = fold(query)
  if (!q) return []
  const tokens = q.split(' ')
  const words = (s: string) => ` ${s}`
  const scored: [number, Locality][] = []
  for (const l of all) {
    const haystack = words(l.folded.all)
    if (!tokens.every((t) => haystack.includes(` ${t}`))) continue
    const byName = l.folded.name === q ? 0 : l.folded.name.startsWith(q) ? 1 : words(l.folded.name).includes(` ${tokens[0]}`) ? 2 : 3
    scored.push([byName * 10 + l.rank, l])
  }
  return scored
    .sort(([a, x], [b, y]) => a - b || x.name.localeCompare(y.name, 'ro') || x.county.localeCompare(y.county, 'ro'))
    .slice(0, limit)
    .map(([, l]) => l)
}

const SECTOR_NUMBER = /^(?:sector(?:ul)?\s*)?(\d)$/i

/** Совпадает ли «satul/sectorul» из формы с населённым пунктом: «2», «sectorul 2» — это «Sector 2». */
function sameDistrict(district: string, l: Locality): boolean {
  const n = SECTOR_NUMBER.exec(district.trim())?.[1]
  return n ? l.name === `Sector ${n}` : looseEquals(district, l.district)
}

/**
 * Населённые пункты, которым соответствуют значения полей адреса. Județ — если форма
 * его спрашивает; без него одноимённые пункты разных уездов дают несколько совпадений.
 */
export function findLocalities(all: Locality[], a: { county?: string; locality: string; district: string }): Locality[] {
  if (!a.locality.trim()) return []
  return all.filter(
    (l) => looseEquals(a.locality, l.uat) && sameDistrict(a.district, l) && (a.county === undefined || looseEquals(a.county, l.county)),
  )
}

const ARTICULATED = { municipiu: 'municipiul', oraș: 'orașul', comună: 'comuna', sector: 'sectorul', sat: 'satul', localitate: 'localitatea' }

/**
 * Населённый пункт словами, как в тексте декларации — от меньшего к большему:
 * «municipiul București, sectorul 2», «municipiul Brașov, județul Brașov»,
 * «satul Drâmbar, comuna Ciugud, județul Alba».
 */
export function placeWords(l: Locality): string[] {
  const uat = `${ARTICULATED[l.uatType]} ${l.uat}`
  if (l.districtKind === 'sector') return [uat, `sectorul ${l.name.replace(/^Sector /, '')}`]
  return [l.districtKind && `${ARTICULATED[l.districtKind]} ${l.district}`, uat, l.county !== BUCHAREST && `județul ${l.county}`].filter(
    (w): w is string => !!w,
  )
}
