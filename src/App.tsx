import { Button, Column, Grid, Header, HeaderGlobalBar, HeaderName, InlineNotification, Link, Loading, SkipToContent, Stack } from '@carbon/react'
import { DocumentExport } from '@carbon/icons-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { FormProvider, useForm, useFormContext, type FieldErrors } from 'react-hook-form'
import { loadLocalities } from './address/siruta'
import { documentsFor } from './documents'
import { Fields } from './dossier/Fields'
import { sampleDossier } from './dossier/sample'
import { dossierSchema, emptyDossier, type Dossier, type DossierInput } from './dossier/schema'
import { SECTIONS } from './dossier/sections'
import { DraftsPanel, useDrafts, type Session } from './drafts/Drafts'
import { listDrafts, loadActiveDraft } from './drafts/storage'
import { todayIso } from './form/common'
import { REVIEW, SectionsProvider, useSections } from './form/sections'
import { Review, StepButtons, StepIndicator } from './form/wizard'
import { HelpHeaderAction, HelpProvider, useHelpTopic } from './help/Help'
import { Result, type TypstDocument } from './output/Result'
import { formatDate } from './pdf/format'
import { isOnboarded, setOnboarded, Welcome } from './welcome/Welcome'

/** Инструменты разработчика: в `npm run dev` всегда, в сборке — только с `?debug`. */
const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

/** Сборка документов почти мгновенна — экран «Se pregătesc…» держится хотя бы столько, чтобы не мелькать. */
const MIN_GENERATING_MS = 700
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function App() {
  // Черновик, открытый в прошлый раз, восстанавливается сразу — без мелькания пустой формы.
  const [session, setSession] = useState<Session & { key: number }>(() => {
    const draft = loadActiveDraft()
    return { key: 0, draft }
  })
  // Приветствие — только совсем новому пользователю: без черновиков и не видевшему его раньше.
  const [welcome, setWelcome] = useState(() => !session.draft && !isOnboarded() && listDrafts().length === 0)
  // Другой черновик или новое досье — форма пересоздаётся с нуля (key).
  const switchTo = (next: Session) => setSession((s) => ({ ...next, key: s.key + 1 }))
  const start = (next?: Session) => {
    setOnboarded()
    setWelcome(false)
    if (next) switchTo(next)
    window.scrollTo(0, 0)
  }
  const showWelcome = () => {
    setWelcome(true)
    window.scrollTo(0, 0)
  }

  return (
    <HelpProvider>
      <AppHeader onHome={showWelcome} />
      <Grid as="main" id="main-content" className="page">
        <Column sm={4} md={8} lg={16}>
          {welcome && (
            // Пример — отдельным черновиком, все разделы подтверждены.
            <Welcome
              returning={isOnboarded()}
              onStart={() => start()}
              onSample={() => start({ initial: sampleDossier(), confirmed: SECTIONS.map((s) => s.id) })}
            />
          )}
          {/* Под приветствием форма скрыта, а не размонтирована — открытый раздел и ввод сохраняются. */}
          <Editor key={session.key} session={session} onSwitch={switchTo} onAbout={showWelcome} hidden={welcome} />
          <Footer />
        </Column>
      </Grid>
    </HelpProvider>
  )
}

/** Название в шапке открывает приветствие: что это за приложение и что подготовить. */
function AppHeader({ onHome }: { onHome: () => void }) {
  return (
    <Header aria-label="Declarații fiscale ITL">
      <SkipToContent />
      <HeaderName
        href="./"
        prefix="DITL"
        onClick={(e: MouseEvent) => {
          e.preventDefault()
          onHome()
        }}
      >
        Declarații fiscale
      </HeaderName>
      <HeaderGlobalBar>
        <HelpHeaderAction />
      </HeaderGlobalBar>
    </Header>
  )
}

/**
 * OFL 1.1 требует распространять шрифты вместе с текстом лицензии, а сборка
 * раздаёт их файлами: Liberation — для PDF (src/typst/compiler.ts), IBM Plex — интерфейс.
 * CC BY 4.0 справочника SIRUTA (src/address) — указать источник, лицензию и что данные изменены.
 */
function Footer() {
  return (
    <footer className="page-footer">
      Fonturi Liberation © 2012 Red Hat, Inc., sub licența{' '}
      <Link href="LICENSE-Liberation.txt" size="sm" inline>
        SIL Open Font License 1.1
      </Link>
      . Fonturi IBM Plex © 2017 IBM Corp., sub licența{' '}
      <Link href="LICENSE-IBM-Plex.txt" size="sm" inline>
        SIL Open Font License 1.1
      </Link>
      . Lista localităților: SIRUTA © Institutul Național de Statistică, sub licența{' '}
      <Link href="https://creativecommons.org/licenses/by/4.0/deed.ro" size="sm" inline>
        CC BY 4.0
      </Link>
      ; denumirile sunt adaptate pentru adrese.
    </footer>
  )
}

type EditorProps = { session: Session; onSwitch: (next: Session) => void }

function Editor({ session, onSwitch, onAbout, hidden }: EditorProps & { onAbout: () => void; hidden: boolean }) {
  const form = useForm<DossierInput, unknown, Dossier>({
    resolver: zodResolver(dossierSchema),
    defaultValues: session.draft?.values ?? session.initial ?? emptyDossier(),
    mode: 'onTouched',
  })
  const [error, setError] = useState<string>()
  /** Последняя отправка не прошла проверку — показать, где ошибки, пока они есть. */
  const [submitFailed, setSubmitFailed] = useState(false)
  const [docs, setDocs] = useState<TypstDocument[]>()

  const onValid = async (data: Dossier) => {
    setError(undefined)
    setSubmitFailed(false)
    try {
      // Шаблоны и логотип (~70 КБ) — отдельным чанком, только когда документы нужны;
      // справочник SIRUTA к этому времени обычно уже загружен полями адреса.
      const [{ bundleTypst }, localities] = await Promise.all([import('./typst/bundle'), loadLocalities(), wait(MIN_GENERATING_MS)])
      const date = formatDate(todayIso())
      const sources = documentsFor(data, localities).map(({ template, title, label, filename, data }) => ({
        label,
        filename,
        source: bundleTypst(template, data, { title, filename: `${filename}.typ`, date }),
      }))
      setDocs(await withPdfs(sources))
    } catch (e) {
      console.error(e)
      setError('Documentele nu au putut fi pregătite. Încercați din nou.')
    }
  }

  return (
    <Stack gap={7} hidden={hidden}>
      {!docs && (
        <div>
          <h1 className="page-title">Declarații fiscale ITL 002 și ITL 004</h1>
          <p className="lead editor-lead">
            Pentru stabilirea impozitului pe clădiri și pe teren al persoanelor juridice: pentru un imobil — o declarație ITL 002 pentru
            clădire și o declarație ITL 004 pentru terenul aferent.{' '}
            <Link href="./" inline onClick={(e: MouseEvent) => (e.preventDefault(), onAbout())}>
              Cum funcționează și ce trebuie pregătit
            </Link>
          </p>
        </div>
      )}
      <InlineNotification
        className="privacy-note"
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
          <DossierForm
            session={session}
            onSwitch={onSwitch}
            hidden={hidden || !!docs}
            onValid={onValid}
            onInvalid={() => setSubmitFailed(true)}
            error={error}
            submitFailed={submitFailed}
          />
        </SectionsProvider>
      </FormProvider>
    </Stack>
  )
}

/**
 * PDF сразу при генерации документов. Компилятор (≈ 11 МБ по сети) — отдельный чанк, обычно
 * уже загруженный на шаге проверки (см. DossierForm). Не загрузился или шаблон не собрался —
 * документы всё равно показываются: экран результата сообщит об ошибке и даст повторить.
 */
async function withPdfs(docs: TypstDocument[]): Promise<TypstDocument[]> {
  try {
    const { compilePdf } = await import('./typst/compiler')
    const result: TypstDocument[] = []
    // По очереди: у компилятора один исходник /main.typ.
    for (const doc of docs) result.push({ ...doc, pdf: await compilePdf(doc.source) })
    return result
  } catch (e) {
    console.error(e)
    return docs
  }
}

/** Пути полей с ошибками: «property.address.street», «property.land.areas» (ошибка всей группы). */
function errorPaths(errors: FieldErrors, prefix = ''): string[] {
  return Object.entries(errors).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (!value || typeof value !== 'object') return []
    const own = typeof value.message === 'string' || typeof value.root?.message === 'string' ? [path] : []
    const nested = Object.fromEntries(Object.entries(value).filter(([k]) => !['message', 'type', 'ref', 'types', 'root'].includes(k)))
    return [...own, ...errorPaths(nested as FieldErrors, path)]
  })
}

type DossierFormProps = EditorProps & {
  hidden: boolean
  onValid: (data: Dossier) => Promise<void>
  onInvalid: () => void
  error: string | undefined
  submitFailed: boolean
}

function DossierForm({ session, onSwitch, hidden, onValid, onInvalid: onFailed, error, submitFailed }: DossierFormProps) {
  const form = useFormContext<DossierInput, unknown, Dossier>()
  const sections = useSections()
  const drafts = useDrafts(session, onSwitch)
  useHelpTopic(hidden ? undefined : sections.helpTopic)
  // На проверке компилятор начинает грузиться заранее — к нажатию «Generează documentele» он обычно готов.
  const reviewing = sections.current === REVIEW
  useEffect(() => {
    if (reviewing) import('./typst/compiler').then((m) => m.loadCompiler()).catch(() => {})
  }, [reviewing])

  const onInvalid = (errors: FieldErrors) => {
    // Синхронно открыть раздел и подэтап с первой ошибкой — сразу после этого react-hook-form
    // ставит фокус на первое ошибочное поле, а в скрытый подэтап он не попадёт.
    flushSync(() => sections.openForPaths(errorPaths(errors)))
    onFailed()
  }
  // Сообщение следует за исправлениями: называет разделы, где ошибки остались, и исчезает с последней.
  const withErrors = sections.list.filter((s) => s.issues > 0).map((s) => s.step)

  return (
    <form onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate hidden={hidden}>
      {/* Поверх формы, пока собираются документы. */}
      {form.formState.isSubmitting && <Loading description="Se pregătesc documentele" />}
      <Stack gap={6}>
        {debugEnabled && (
          <div className="dev-tools">
            {/* Тестовые данные — отдельным черновиком, текущий не затирается; все разделы подтверждены. */}
            <Button kind="tertiary" size="sm" onClick={() => drafts.startNew(sampleDossier(), SECTIONS.map((s) => s.id))}>
              Completează cu date de test
            </Button>
          </div>
        )}

        <DraftsPanel drafts={drafts} />

        <div className="wizard">
          <StepIndicator />
          <div className="wizard-body">
            {/* Над разделами, а не на шаге проверки: после неудачной отправки открыт раздел с ошибкой. */}
            {error && <InlineNotification kind="error" role="alert" lowContrast hideCloseButton title={error} />}
            {submitFailed && withErrors.length > 0 && (
              <InlineNotification
                kind="error"
                role="alert"
                lowContrast
                hideCloseButton
                title="Formularul conține erori:"
                subtitle={`corectați câmpurile marcate în ${withErrors.length === 1 ? 'secțiunea' : 'secțiunile'} ${withErrors.join(', ')}.`}
              />
            )}
            <Fields />
            <Review />
            <StepButtons
              last={
                <Button type="submit" size="lg" renderIcon={DocumentExport} disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Se pregătesc…' : 'Generează documentele'}
                </Button>
              }
            />
          </div>
        </div>
      </Stack>
    </form>
  )
}
