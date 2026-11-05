import { Button, RadioButton, RadioButtonGroup, TextInput } from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { useId, type ComponentProps } from 'react'
import { Controller, useFieldArray, useFormContext, type Path } from 'react-hook-form'
import type { DossierInput } from '../dossier/schema'
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
} & Omit<ComponentProps<typeof TextInput>, 'id' | 'name' | 'labelText' | 'invalid' | 'invalidText'>

export function TextField({ name, label, wide, ...input }: TextFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const id = useId()
  return (
    <TextInput
      {...input}
      {...register(name)}
      id={id}
      className={wide ? 'wide' : undefined}
      labelText={label}
      invalid={!!error}
      invalidText={error}
    />
  )
}

export function RadioGroup({ name, legend, options }: { name: FieldPath; legend: string; options: readonly (readonly [string, string])[] }) {
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
  locality: ['Localitatea', 'address-level2'],
  county: ['Județul/Sectorul', 'address-level1'],
  country: ['Țara', 'country-name'],
} as const
export type AddressField = keyof typeof ADDRESS_FIELDS

/**
 * Поля почтового адреса. `section` — токен автозаполнения (section-*), чтобы браузер
 * не путал адрес фирмы, адрес для переписки и домициль подписанта.
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
  return (
    <div className="grid">
      {fields.map((key) => {
        const [label, token] = ADDRESS_FIELDS[key]
        return (
          <TextField
            key={key}
            name={`${prefix}.${key}`}
            label={label}
            wide={key === 'street'}
            autoComplete={token ? `section-${section} ${token}` : 'off'}
            inputMode={key === 'postalCode' ? 'numeric' : undefined}
          />
        )
      })}
    </div>
  )
}

export type AttachmentsPath = 'attachments' | `deeds.${number}.attachments` | `properties.${number}.attachments`

/** Список приложенных документов (anexe). */
export function AttachmentsFields({ name, label }: { name: AttachmentsPath; label: string }) {
  const { control } = useFormContext<DossierInput>()
  // Все три вида списков устроены одинаково; типы RHF не выводят это для объединения путей.
  const { fields, append, remove } = useFieldArray({ control, name: name as 'attachments' })
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
