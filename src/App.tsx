import { Button, Column, Content, Grid, Header, HeaderName, InlineNotification, Link, ProgressBar, SkipToContent, Stack } from '@carbon/react'
import { DocumentExport } from '@carbon/icons-react'
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
    <>
      <Header aria-label="Declarații fiscale ITL">
        <SkipToContent />
        <HeaderName href="./" prefix="DITL">
          Declarații fiscale
        </HeaderName>
      </Header>
      <Content id="main-content" className="page">
        <Grid>
          {/* Форма — узкой колонкой, результат с предпросмотром PDF — во всю ширину. */}
          <Column sm={4} md={8} lg={docs ? 16 : { span: 10, offset: 3 }}>
            <Stack gap={7}>
            <div>
              <h1 className="page-title">Declarații fiscale ITL 002 și ITL 004</h1>
              <p className="lead">
                Pentru stabilirea impozitului pe clădirile și pe terenul persoanelor juridice: o declarație ITL 002 pentru fiecare imobil
                și o declarație ITL 004 pentru terenul aferent tuturor imobilelor.
              </p>
            </div>
            <InlineNotification
              kind="info"
              role="status"
              lowContrast
              hideCloseButton
              title="Datele nu sunt trimise nicăieri:"
              subtitle="documentele sunt generate direct în browserul dumneavoastră."
            />

            {docs && <Result docs={docs} onBack={() => setDocs(undefined)} />}

            <FormProvider {...form}>
              <SectionsProvider sections={SECTIONS} schema={dossierSchema}>
                {/* Форма скрывается, а не размонтируется — введённые значения сохраняются. */}
                <DossierForm session={session} onSwitch={onSwitch} hidden={!!docs} onValid={onValid} error={error} setError={setError} />
              </SectionsProvider>
            </FormProvider>

            {/* OFL 1.1 требует распространять шрифты вместе с текстом лицензии, а сборка
                раздаёт их файлами: Liberation — для PDF (src/typst/compiler.ts), IBM Plex — интерфейс. */}
            <footer className="page-footer">
              Fonturi Liberation © 2012 Red Hat, Inc., sub licența{' '}
              <Link href="LICENSE-Liberation.txt" size="sm" inline>
                SIL Open Font License 1.1
              </Link>
              . Fonturi IBM Plex © 2017 IBM Corp., sub licența{' '}
              <Link href="LICENSE-IBM-Plex.txt" size="sm" inline>
                SIL Open Font License 1.1
              </Link>
              .
            </footer>
            </Stack>
          </Column>
        </Grid>
      </Content>
    </>
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
      <Stack gap={6}>
        {debugEnabled && (
          <div className="dev-tools">
            {/* Тестовые данные — отдельным черновиком, текущий не затирается. */}
            <Button kind="tertiary" size="sm" onClick={() => drafts.startNew(sampleDossier())}>
              Completează cu date de test
            </Button>
          </div>
        )}

        <DraftsPanel drafts={drafts} />

        <ProgressBar
          label={`Secțiuni gata: ${sections.done} din ${sections.total}`}
          value={sections.done}
          max={sections.total}
          status={sections.done === sections.total ? 'finished' : 'active'}
          size="small"
        />

        <Fields />

        {error && <InlineNotification kind="error" role="alert" lowContrast hideCloseButton title={error} />}

        <div>
          <Button type="submit" renderIcon={DocumentExport} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Se pregătesc…' : 'Generează documentele'}
          </Button>
        </div>
      </Stack>
    </form>
  )
}
