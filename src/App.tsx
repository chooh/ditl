import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { FormProvider, useForm, useFormContext, type FieldErrors } from 'react-hook-form'
import { documentsFor } from './documents'
import { Fields } from './dossier/Fields'
import { sampleDossier } from './dossier/sample'
import { dossierSchema, emptyDossier, type Dossier, type DossierInput } from './dossier/schema'
import { SECTIONS } from './dossier/sections'
import { DraftsPanel, useDrafts, type Session } from './drafts/Drafts'
import { loadActiveDraft } from './drafts/storage'
import { todayIso } from './form/common'
import { SectionsProvider, useSections } from './form/sections'
import { Result, type TypstDocument } from './output/Result'
import { formatDate } from './pdf/format'

/** Инструменты разработчика: в `npm run dev` всегда, в сборке — только с `?debug`. */
const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

export function App() {
  // Черновик, открытый в прошлый раз, восстанавливается сразу — без мелькания пустой формы.
  const [session, setSession] = useState<Session & { key: number }>(() => {
    const draft = loadActiveDraft()
    return { key: 0, draft }
  })
  // Другой черновик или новое досье — форма пересоздаётся с нуля (key).
  const switchTo = (next: Session) => setSession((s) => ({ ...next, key: s.key + 1 }))
  return <Editor key={session.key} session={session} onSwitch={switchTo} />
}

type EditorProps = { session: Session; onSwitch: (next: Session) => void }

function Editor({ session, onSwitch }: EditorProps) {
  const form = useForm<DossierInput, unknown, Dossier>({
    resolver: zodResolver(dossierSchema),
    defaultValues: session.draft?.values ?? session.initial ?? emptyDossier(),
    mode: 'onTouched',
  })
  const [error, setError] = useState<string>()
  const [docs, setDocs] = useState<TypstDocument[]>()

  const onValid = async (data: Dossier) => {
    setError(undefined)
    try {
      // Шаблоны и логотип (~70 КБ) — отдельным чанком, только когда документы нужны.
      const { bundleTypst } = await import('./typst/bundle')
      const date = formatDate(todayIso())
      setDocs(
        documentsFor(data).map(({ template, title, label, filename, data }) => ({
          label,
          filename,
          source: bundleTypst(template, data, { title, filename: `${filename}.typ`, date }),
        })),
      )
    } catch (e) {
      console.error(e)
      setError('Documentele nu au putut fi pregătite. Încercați din nou.')
    }
  }

  return (
    <main className={docs ? 'wide' : undefined}>
      <h1>Declarații fiscale ITL 002 și ITL 004</h1>
      <p className="lead">
        Pentru stabilirea impozitului pe clădirile și pe terenul persoanelor juridice: o declarație ITL 002 pentru fiecare imobil și o
        declarație ITL 004 pentru terenul aferent tuturor imobilelor.
      </p>
      <p className="note">Datele nu sunt trimise nicăieri: documentele sunt generate direct în browserul dumneavoastră.</p>

      {docs && <Result docs={docs} onBack={() => setDocs(undefined)} />}

      <FormProvider {...form}>
        <SectionsProvider sections={SECTIONS} schema={dossierSchema}>
          {/* Форма скрывается, а не размонтируется — введённые значения сохраняются. */}
          <DossierForm session={session} onSwitch={onSwitch} hidden={!!docs} onValid={onValid} error={error} setError={setError} />
        </SectionsProvider>
      </FormProvider>

      {/* OFL 1.1 требует распространять шрифты вместе с текстом лицензии,
          а сборка раздаёт их файлами (src/typst/compiler.ts). */}
      <footer className="note">
        Fonturi Liberation © 2012 Red Hat, Inc., sub licența{' '}
        <a href="LICENSE-Liberation.txt">SIL Open Font License 1.1</a>.
      </footer>
    </main>
  )
}

type DossierFormProps = EditorProps & {
  hidden: boolean
  onValid: (data: Dossier) => Promise<void>
  error: string | undefined
  setError: (error: string | undefined) => void
}

function DossierForm({ session, onSwitch, hidden, onValid, error, setError }: DossierFormProps) {
  const form = useFormContext<DossierInput, unknown, Dossier>()
  const sections = useSections()
  const drafts = useDrafts(session, onSwitch)

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
          <button type="button" className="secondary" onClick={() => drafts.startNew(sampleDossier())}>
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
        {form.formState.isSubmitting ? 'Se pregătesc…' : 'Generează documentele'}
      </button>
    </form>
  )
}
