import { findLocalities, fold, placeWords, type Locality } from '../address/siruta'
import type { Address } from '../form/common'
import { looseEquals } from '../form/validators'
import { sectorNumber } from '../pdf/format'

type Place = Pick<Address, 'county' | 'locality' | 'district'>

/** Графа «Localitatea» без сектора: «București», «Alba Iulia», у села — «Drâmbar, Ciugud». */
export function localityLine({ locality, district }: Place): string {
  return sectorNumber(district) ? locality : [district, locality].filter(Boolean).join(', ')
}

/** Графа «Județul/Sectorul»: у Бухареста — «Sector 2», иначе județ. */
export function countyOrSector({ county, district }: Place): string {
  const sector = sectorNumber(district)
  return sector ? `Sector ${sector}` : county
}

/** Населённый пункт целиком для бланка, где на него одна графа: «București, Sector 2», «Drâmbar, Ciugud, jud. Alba». */
export function fullLocality(a: Place): string {
  const sector = sectorNumber(a.district)
  if (sector) return [a.locality, `Sector ${sector}`].filter(Boolean).join(', ')
  return [localityLine(a), a.county && !looseEquals(a.county, a.locality) && `jud. ${a.county}`].filter(Boolean).join(', ')
}

/** Улица уже с типом — «Str. Lizeanu», «Bd. Ștefan cel Mare», «Șos. Mihai Bravu»: «str.» перед ней не нужно. */
const STREET_TYPE = /^(str|strada|bd|bdul|b dul|bulevardul|sos|soseaua|calea|aleea|intr|intrarea|piata|pta|piateta|splaiul|spl|drumul|prel|prelungirea|pasajul|fundatura|ulita|stradela)( |$)/

/**
 * Адрес одной строкой для текста декларации — без подписей бланка, которые нечем заполнить:
 * «municipiul Brașov, județul Brașov, str. Lungă nr. 5, bl. A, ap. 3, cod poștal 500001».
 * Тип населённого пункта — из SIRUTA; не нашёлся (опечатка, адрес за границей) или без
 * județ подходит несколько одноимённых — только названия. Чего нет в `a`, то не печатается.
 */
export function addressText(a: Pick<Address, 'street' | 'number' | 'locality' | 'district'> & Partial<Address>, localities: Locality[]): string {
  const romania = !a.country || looseEquals(a.country, 'România')
  const matches = romania ? findLocalities(localities, a) : []
  const known = matches.length === 1 ? matches[0] : undefined
  const sector = sectorNumber(a.district)
  const place = known
    ? placeWords(known)
    : [
        ...(sector ? [a.locality, `sectorul ${sector}`] : [a.district, a.locality]),
        a.county && !looseEquals(a.county, a.locality) && (romania ? `județul ${a.county}` : a.county),
        !romania && a.country,
      ]
  // За границей улицы пишутся по-своему — «str.» только у румынских без типа.
  const street = romania && a.street && !STREET_TYPE.test(fold(a.street)) ? `str. ${a.street}` : a.street
  return [
    ...place,
    [street, a.number && `nr. ${a.number}`].filter(Boolean).join(' '),
    a.block && `bl. ${a.block}`,
    a.entrance && `sc. ${a.entrance}`,
    a.floor && `et. ${a.floor}`,
    a.apartment && `ap. ${a.apartment}`,
    a.postalCode && `cod poștal ${a.postalCode}`,
  ]
    .filter(Boolean)
    .join(', ')
}
