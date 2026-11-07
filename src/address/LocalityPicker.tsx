import { ComboBox } from '@carbon/react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { FieldPath } from '../form/fields'
import { looseEquals } from '../form/validators'
import { BUCHAREST, findLocalities, loadLocalities, searchLocalities, type Locality } from './siruta'

export type AddressPrefix = 'company.seat' | 'company.correspondence' | 'signatory.address' | `properties.${number}.address`

function useLocalities(): Locality[] | undefined {
  const [all, setAll] = useState<Locality[]>()
  useEffect(() => {
    let live = true
    loadLocalities().then((list) => live && setAll(list))
    return () => {
      live = false
    }
  }, [])
  return all
}

/**
 * Поиск населённого пункта по SIRUTA: выбор заполняет графы «Județul» (если она есть),
 * «Municipiul / orașul / comuna» и «Satul / sectorul». Графы остаются редактируемыми —
 * для адреса за границей; под поиском — что это за пункт или что его нет в SIRUTA.
 */
export function LocalityPicker({ prefix, withCounty }: { prefix: AddressPrefix; withCounty: boolean }) {
  const { control, setValue } = useFormContext()
  const path = (key: string) => `${prefix}.${key}` as FieldPath
  const [locality = '', district = '', county = '', country = ''] = useWatch({
    control,
    name: [path('locality'), path('district'), ...(withCounty ? [path('county'), path('country')] : [])],
  }) as (string | undefined)[]
  const all = useLocalities()
  const [query, setQuery] = useState('')
  const id = useId()

  const selected = useMemo(
    () => (all ? (findLocalities(all, { locality, district, county: withCounty ? county : undefined })[0] ?? null) : null),
    [all, locality, district, county, withCounty],
  )
  // Без запроса — сектора Бухареста: декларации подаются в DGITL Sector 2.
  const items = useMemo(
    () => (all ? (query.trim() ? searchLocalities(all, query) : all.filter((l) => l.county === BUCHAREST)) : []),
    [all, query],
  )

  const choose = (l: Locality | null) => {
    const set = (key: string, value: string) => setValue(path(key), value, { shouldDirty: true, shouldValidate: true })
    set('locality', l?.uat ?? '')
    set('district', l?.district ?? '')
    if (withCounty) set('county', l?.county ?? '')
  }

  const abroad = withCounty && country.trim() !== '' && !looseEquals(country, 'România')
  const unknown = !!all && !selected && !abroad && locality.trim() !== ''

  return (
    <ComboBox<Locality>
      id={id}
      className="wide"
      titleText="Caută localitatea"
      placeholder={all ? 'ex. Sector 2, Alba Iulia, Ciugud' : 'Se încarcă lista localităților…'}
      items={items}
      itemToString={(l) => l?.label ?? ''}
      selectedItem={selected}
      onInputChange={setQuery}
      // ComboBox сообщает и о смене selectedItem извне — когда графу правят вручную и пункт
      // перестаёт находиться. Это не выбор пользователя: графы не трогаем.
      onChange={({ selectedItem }) => (selectedItem ?? null) !== selected && choose(selectedItem ?? null)}
      helperText={selected ? selected.description : 'Alegeți din lista SIRUTA — județul, localitatea și satul/sectorul se completează automat.'}
      warn={unknown}
      warnText="Nu figurează în SIRUTA. Verificați denumirea sau alegeți localitatea din listă."
    />
  )
}
