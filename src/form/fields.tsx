import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useFormContext, type Path } from 'react-hook-form'
import type { DeclarationInput } from './schema'

export type FieldPath = Path<DeclarationInput>

function useFieldError(name: FieldPath) {
  const { getFieldState, formState } = useFormContext<DeclarationInput>()
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
  const { register } = useFormContext<DeclarationInput>()
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

export function Checkbox({ name, children }: { name: FieldPath; children: ReactNode }) {
  const { register } = useFormContext<DeclarationInput>()
  return (
    <label className="checkbox">
      <input type="checkbox" {...register(name)} />
      {children}
    </label>
  )
}

export function RadioGroup({ name, legend, options }: { name: FieldPath; legend: string; options: readonly (readonly [string, string])[] }) {
  const { register } = useFormContext<DeclarationInput>()
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
  strada: ['Strada', 'address-line1'],
  nr: ['Nr.', ''],
  codPostal: ['Cod poștal', 'postal-code'],
  bloc: ['Bloc', ''],
  scara: ['Scara', ''],
  etaj: ['Etaj', ''],
  apartament: ['Apartament', ''],
  localitate: ['Localitatea', 'address-level2'],
  judet: ['Județul/Sectorul', 'address-level1'],
  tara: ['Țara', 'country-name'],
} as const
export type AddressField = keyof typeof ADDRESS_FIELDS

/**
 * Поля адреса. `section` — токен автозаполнения (section-*), чтобы браузер не путал
 * адрес фирмы, адрес для переписки и адрес представителя.
 */
export function AddressFields({
  prefix,
  fields,
  section,
  labels = {},
}: {
  prefix: 'contribuabil.sediu' | 'contribuabil.corespondenta' | 'imputernicit.adresa' | 'cladire.adresa'
  fields: readonly AddressField[]
  section: string
  labels?: Partial<Record<AddressField, string>>
}) {
  return (
    <div className="grid">
      {fields.map((key) => {
        const [label, token] = ADDRESS_FIELDS[key]
        return (
          <TextField
            key={key}
            name={`${prefix}.${key}`}
            label={labels[key] ?? label}
            wide={key === 'strada'}
            autoComplete={token ? `section-${section} ${token}` : 'off'}
            inputMode={key === 'codPostal' ? 'numeric' : undefined}
          />
        )
      })}
    </div>
  )
}
