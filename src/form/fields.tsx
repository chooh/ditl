import { useId, type InputHTMLAttributes } from 'react'
import { useFieldArray, useFormContext, type Path } from 'react-hook-form'
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
  return message ? <span className="error">{message}</span> : null
}

type TextFieldProps = {
  name: FieldPath
  label: string
  /** Поле на всю ширину строки сетки. */
  wide?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>

export function TextField({ name, label, wide, ...input }: TextFieldProps) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  const id = useId()
  return (
    <div className={wide ? 'field wide' : 'field'}>
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        {...register(name)}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="error">
          {error}
        </span>
      )}
    </div>
  )
}

export function RadioGroup({ name, legend, options }: { name: FieldPath; legend: string; options: readonly (readonly [string, string])[] }) {
  const { register } = useFormContext()
  return (
    <div className="radio-group" role="radiogroup" aria-label={legend}>
      <span className="radio-legend">{legend}</span>
      <div className="radio-options">
        {options.map(([value, label]) => (
          <label key={value} className="checkbox">
            <input type="radio" value={value} {...register(name)} />
            {label}
          </label>
        ))}
      </div>
      <ErrorText name={name} />
    </div>
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
            <button type="button" className="link" onClick={() => remove(i)} aria-label={`${label}: șterge documentul ${i + 1}`}>
              Șterge
            </button>
          )}
        </div>
      ))}
      {fields.length < MAX_ATTACHMENTS && (
        <button type="button" className="secondary" onClick={() => append({ name: '' })} aria-label={`${label}: adaugă document`}>
          Adaugă document
        </button>
      )}
    </>
  )
}
