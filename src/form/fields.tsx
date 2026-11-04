import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { useFieldArray, useFormContext, type Path } from 'react-hook-form'
import type { DeclarationInput as Itl002Input } from '../itl002/schema'
import type { DeclarationInput as Itl004Input } from '../itl004/schema'
import { MAX_ANNEXES } from './common'

/** Путь к полю любой из деклараций: опечатка в имени поля — ошибка компиляции. */
export type FieldPath = Path<Itl002Input> | Path<Itl004Input>

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

export function Checkbox({ name, children }: { name: FieldPath; children: ReactNode }) {
  const { register } = useFormContext()
  return (
    <label className="checkbox">
      <input type="checkbox" {...register(name)} />
      {children}
    </label>
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
  prefix: 'contribuabil.sediu' | 'contribuabil.corespondenta' | 'imputernicit.adresa' | 'cladire.adresa' | 'reprezentant.domiciliu'
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

/** Список приложенных документов — одинаковый в обеих декларациях. */
export function AnnexesFields() {
  const { control } = useFormContext<{ anexe: { denumire: string }[] }>()
  const { fields, append, remove } = useFieldArray({ control, name: 'anexe' })
  return (
    <>
      <p className="hint">
        Copii ale documentelor, certificate de conformitate cu originalul (art. 64 alin. (5) din Legea nr. 207/2015).
      </p>
      {fields.map((field, i) => (
        <div key={field.id} className="annex">
          <TextField name={`anexe.${i}.denumire`} label={`${i + 1}.`} autoComplete="off" />
          {fields.length > 1 && (
            <button type="button" className="link" onClick={() => remove(i)} aria-label={`Șterge documentul ${i + 1}`}>
              Șterge
            </button>
          )}
        </div>
      ))}
      {fields.length < MAX_ANNEXES && (
        <button type="button" className="secondary" onClick={() => append({ denumire: '' })}>
          Adaugă document
        </button>
      )}
    </>
  )
}

/** Согласие на электронную переписку — поле реквизитов юрлица, общее для обеих деклараций. */
export function EmailConsent() {
  return (
    <RadioGroup
      name="contribuabil.comunicareEmail"
      legend="Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică"
      options={[
        ['da', 'DA'],
        ['nu', 'NU'],
      ]}
    />
  )
}

/** Документ подписанта; в ITL 004 — без «eliberat de» и даты выдачи. */
export function IdentityFields({ full = true }: { full?: boolean }) {
  return (
    <>
      <TextField name="actIdentitate.tip" label="Tipul actului de identitate" list="id-types" autoComplete="off" />
      <TextField name="actIdentitate.serie" label="Seria" autoComplete="off" />
      <TextField name="actIdentitate.numar" label="Numărul" autoComplete="off" />
      {full && (
        <>
          <TextField name="actIdentitate.data" label="La data de" type="date" autoComplete="off" />
          <TextField name="actIdentitate.eliberatDe" label="Eliberat de" wide autoComplete="off" />
        </>
      )}
      <datalist id="id-types">
        <option value="CI" />
        <option value="BI" />
        <option value="Pașaport" />
      </datalist>
    </>
  )
}
