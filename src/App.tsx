import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ComponentType } from 'react'
import { flushSync } from 'react-dom'
import { FormProvider, useForm, useFormContext, type FieldErrors, type FieldValues, type Resolver } from 'react-hook-form'
import { DraftsPanel, useDrafts, type Session } from './drafts/Drafts'
import { loadActiveDraft } from './drafts/storage'
import { todayIso } from './form/common'
import { SectionsProvider, useSections } from './form/sections'
import { FORMS, type FormId } from './forms'
import { Fields as Itl002Fields } from './itl002/Fields'
import { Fields as Itl004Fields } from './itl004/Fields'
import { Result, type TypstDocument } from './output/Result'
import { formatDate } from './pdf/format'

/** Поля формы каждого типа декларации; всё остальное о типе — в FORMS. */
const FIELDS: Record<FormId, ComponentType> = { itl002: Itl002Fields, itl004: Itl004Fields }

/** Инструменты разработчика: в `npm run dev` всегда, в сборке — только с `?debug`. */
const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

export function App() {
  // Черновик, открытый в прошлый раз, восстанавливается сразу — без мелькания пустой формы.
  const [session, setSession] = useState<Session & { key: number }>(() => {
    const draft = loadActiveDraft()
    return { key: 0, form: draft?.form ?? 'itl002', draft }
  })
  // Другой черновик или тип декларации — форма пересоздаётся с нуля (key).
  const switchTo = (next: Session) => setSession((s) => ({ ...next, key: s.key + 1 }))
  return <Editor key={session.key} session={session} onSwitch={switchTo} />
}

type EditorProps = { session: Session; onSwitch: (next: Session) => void }

function Editor({ session, onSwitch }: EditorProps) {
  const def = FORMS[session.form]
  const form = useForm<FieldValues>({
    resolver: zodResolver(def.schema) as Resolver<FieldValues>,
    defaultValues: session.draft?.values ?? session.initial ?? def.empty(),
    mode: 'onTouched',
  })
  const [error, setError] = useState<string>()
  const [doc, setDoc] = useState<TypstDocument>()

  const onValid = async (data: FieldValues) => {
    setError(undefined)
    try {
      // Шаблоны и логотип (~70 КБ) — отдельным чанком, только когда документ нужен.
      const { bundleTypst } = await import('./typst/bundle')
      const filename = def.filename(data)
      const source = bundleTypst(def.template, def.print(data), { title: def.title, filename: `${filename}.typ`, date: formatDate(todayIso()) })
      setDoc({ source, filename })
    } catch (e) {
      console.error(e)
      setError('Documentul nu a putut fi pregătit. Încercați din nou.')
    }
  }

  return (
    <main className={doc ? 'wide' : undefined}>
      <h1>{def.title}</h1>
      <p className="lead">{def.lead}</p>
      <p className="note">Datele nu sunt trimise nicăieri: documentul este generat direct în browserul dumneavoastră.</p>

      {doc && <Result doc={doc} onBack={() => setDoc(undefined)} />}

      <FormProvider {...form}>
        <SectionsProvider sections={def.sections} schema={def.schema}>
          {/* Форма скрывается, а не размонтируется — введённые значения сохраняются. */}
          <DeclarationForm session={session} onSwitch={onSwitch} hidden={!!doc} onValid={onValid} error={error} setError={setError} />
        </SectionsProvider>
      </FormProvider>
    </main>
  )
}

type DeclarationFormProps = EditorProps & {
  hidden: boolean
  onValid: (data: FieldValues) => Promise<void>
  error: string | undefined
  setError: (error: string | undefined) => void
}

function DeclarationForm({ session, onSwitch, hidden, onValid, error, setError }: DeclarationFormProps) {
  const form = useFormContext()
  const sections = useSections()
  const drafts = useDrafts(session, onSwitch)
  const Fields = FIELDS[session.form]

  const onInvalid = (errors: FieldErrors) => {
    // Синхронно раскрыть разделы с ошибками — сразу после этого react-hook-form
    // ставит фокус на первое ошибочное поле, а в скрытый раздел он не попадёт.
    flushSync(() => sections.openForKeys(Object.keys(errors)))
    setError('Formularul conține erori — verificați câmpurile marcate.')
  }

  return (
    <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate hidden={hidden}>
      {debugEnabled && (
        <div className="dev-tools">
          {/* Тестовые данные — отдельным черновиком, текущий не затирается. */}
          <button type="button" className="secondary" onClick={() => drafts.startNew(session.form, FORMS[session.form].sample())}>
            Completează cu date de test
          </button>
        </div>
      )}

      <DraftsPanel drafts={drafts} />

      <p className="progress" aria-live="polite">
        Secțiuni gata: {sections.done} din {sections.total}
      </p>

      <Fields />

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Se pregătește…' : 'Generează documentul'}
      </button>
    </form>
  )
}
