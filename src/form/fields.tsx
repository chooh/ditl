import { Button, RadioButton, RadioButtonGroup, TextInput } from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { Fragment, useId, type ComponentProps } from 'react'
import { Controller, useFieldArray, useFormContext, type Path } from 'react-hook-form'
import { LocalityPicker } from '../address/LocalityPicker'
import type { DossierInput } from '../dossier/schema'
import { FieldTip } from '../help/Help'
import { MAX_ATTACHMENTS } from './common'

/** Путь к полю досье: опечатка в имени поля — ошибка компиляции. */
export type FieldPath = Path<DossierInput>

function useFieldError(name: FieldPath) {
  const { getFieldState, formState } = useFormContext()
  return getFieldState(name, formState).error?.message
}

export function ErrorText({ name }: { name: FieldPath }) {
  const message = useFieldError(name)
  return message ? <p className="error">{message}</p> : null
}

type TextFieldProps = {
  name: FieldPath
  label: string
  /** Поле на всю ширину строки сетки. */
  wide?: boolean
  /** Пояснение под «i» у подписи. */
  tip?: string
} & Omit<ComponentProps<typeof TextInput>, 'id' | 'name' | 'labelText' | 'invalid' | 'invalidText'>

export function TextField({ name, label, wide, tip, ...input }: TextFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const id = useId()
  const field = (
    <TextInput
      {...input}
      {...register(name)}
      id={id}
      className={wide && !tip ? 'wide' : undefined}
      labelText={label}
      invalid={!!error}
      invalidText={error}
    />
  )
  // «i» ставится поверх правого края подписи — обёртка становится ячейкой сетки.
  return tip ? (
    <div className={`field-with-tip${wide ? ' wide' : ''}`}>
      {field}
      <FieldTip label={label} text={tip} />
    </div>
  ) : (
    field
  )
}

type RadioGroupProps = {
  name: FieldPath
  legend: string
  options: readonly (readonly [string, string])[]
  /** Пояснение под вариантами. */
  tip?: string
}

export function RadioGroup({ name, legend, options, tip }: RadioGroupProps) {
  const { control } = useFormContext()
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <RadioButtonGroup
          className="radio-group"
          name={field.name}
          legendText={legend}
          valueSelected={field.value as string}
          onChange={(value) => field.onChange(value)}
          onBlur={field.onBlur}
          invalid={!!fieldState.error}
          invalidText={fieldState.error?.message}
          helperText={tip}
        >
          {options.map(([value, label], i) => (
            // ref — на первую кнопку: на неё react-hook-form ставит фокус при ошибке.
            <RadioButton key={value} id={`${id}-${value}`} value={value} labelText={label} ref={i === 0 ? field.ref : undefined} />
          ))}
        </RadioButtonGroup>
      )}
    />
  )
}

const ADDRESS_FIELDS = {
  street: ['Strada', 'address-line1'],
  number: ['Nr.', ''],
  postalCode: ['Cod poștal', 'postal-code'],
  block: ['Bloc', ''],
  entrance: ['Scara', ''],
  floor: ['Etaj', ''],
  apartment: ['Apartament', ''],
  county: ['Județul', 'address-level1'],
  locality: ['Municipiul / orașul / comuna', 'address-level2'],
  district: ['Satul / sectorul', 'address-level3'],
  country: ['Țara', 'country-name'],
} as const

/** Пояснение к графе «Satul / sectorul» — у всех адресов одинаковое. */
export const DISTRICT_TIP = 'În București — sectorul, de exemplu „Sector 2”; la sat — numele satului; la oraș sau municipiu rămâne gol.'
/** Пояснение к графе «Etaj». */
export const FLOOR_TIP = 'Numărul etajului; la parter — „P”, la mansardă — „M”, la demisol — „D”, la subsol — „SS 1”, „SS 2” etc.'
export type AddressField = keyof typeof ADDRESS_FIELDS

/**
 * Поля почтового адреса. `section` — токен автозаполнения (section-*), чтобы браузер
 * не путал адрес фирмы, адрес для переписки и домициль подписанта. Перед графами
 * населённого пункта — поиск по SIRUTA, который их заполняет.
 */
export function AddressFields({
  prefix,
  fields,
  section,
}: {
  prefix: 'company.seat' | 'company.correspondence' | 'signatory.address'
  fields: readonly AddressField[]
  section: string
}) {
  const withCounty = fields.includes('county')
  const pickerBefore = withCounty ? 'county' : 'locality'
  return (
    <div className="grid">
      {fields.map((key) => {
        const [label, token] = ADDRESS_FIELDS[key]
        return (
          <Fragment key={key}>
            {key === pickerBefore && <LocalityPicker prefix={prefix} withCounty={withCounty} />}
            <TextField
              name={`${prefix}.${key}`}
              label={label}
              wide={key === 'street'}
              autoComplete={token ? `section-${section} ${token}` : 'off'}
              inputMode={key === 'postalCode' ? 'numeric' : undefined}
              tip={key === 'district' ? DISTRICT_TIP : key === 'floor' ? FLOOR_TIP : undefined}
            />
          </Fragment>
        )
      })}
    </div>
  )
}

/** Список приложенных документов (anexe). */
export function AttachmentsFields({ name, label }: { name: 'attachments'; label: string }) {
  const { control } = useFormContext<DossierInput>()
  const { fields, append, remove } = useFieldArray({ control, name })
  return (
    <>
      {fields.map((field, i) => (
        <div key={field.id} className="annex">
          <TextField name={`${name}.${i}.name`} label={`${i + 1}.`} aria-label={`${label}: documentul ${i + 1}`} autoComplete="off" />
          {fields.length > 1 && (
            <Button
              kind="danger--ghost"
              size="md"
              hasIconOnly
              renderIcon={TrashCan}
              iconDescription="Șterge"
              tooltipPosition="left"
              onClick={() => remove(i)}
              aria-label={`${label}: șterge documentul ${i + 1}`}
            />
          )}
        </div>
      ))}
      {fields.length < MAX_ATTACHMENTS && (
        <Button kind="tertiary" size="md" renderIcon={Add} onClick={() => append({ name: '' })} aria-label={`${label}: adaugă document`}>
          Adaugă document
        </Button>
      )}
    </>
  )
}
