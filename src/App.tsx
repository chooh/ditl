import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch, type FieldErrors } from 'react-hook-form'
import { AddressFields, Checkbox, ErrorText, RadioGroup, TextField } from './form/fields'
import {
  allowedUses,
  declarationSchema,
  emptyDeclaration,
  INDICATORS,
  MAX_ANNEXES,
  type Declaration,
  type DeclarationInput,
} from './form/schema'
import { sampleDeclaration } from './form/sample'
import { Section, SectionsProvider, useSections } from './form/sections'
import { PdfPreview, type GeneratedPdf } from './PdfPreview'
import { DraftsPanel, useDrafts } from './drafts/Drafts'
import { loadActiveDraft, type Draft } from './drafts/storage'
import { downloadUrl } from './pdf/download'

/** Инструменты разработчика: в `npm run dev` всегда, в сборке — только с `?debug`. */
const debugEnabled = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')

export function App() {
  // Черновик, открытый в прошлый раз, восстанавливается сразу — без мелькания пустой формы.
  const [restored] = useState(loadActiveDraft)
  const form = useForm<DeclarationInput, unknown, Declaration>({
    resolver: zodResolver(declarationSchema),
    defaultValues: restored?.values ?? emptyDeclaration(),
    mode: 'onTouched',
  })
  const [debug, setDebug] = useState(false)
  const [error, setError] = useState<string>()
  const [pdf, setPdf] = useState<GeneratedPdf>()

  useEffect(() => {
    if (!pdf) return
    return () => URL.revokeObjectURL(pdf.url)
  }, [pdf])

  const onSubmit = async (data: Declaration) => {
    setError(undefined)
    // pdf-lib и fontkit тяжёлые — грузятся отдельным чанком только при генерации.
    const [{ fillTemplate, LayoutOverflowError }, { loadPdfAssets }] = await Promise.all([
      import('./pdf/generate'),
      import('./pdf/assets'),
    ])
    try {
      const bytes = await fillTemplate(data, await loadPdfAssets(), { debug })
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
      setPdf({ url, filename: `ITL002_${data.contribuabil.cui}.pdf` })
    } catch (e) {
      console.error(e)
      setError(e instanceof LayoutOverflowError ? e.message : 'PDF-ul nu a putut fi generat. Încercați din nou.')
    }
  }

  return (
    <main className={pdf ? 'wide' : undefined}>
      <h1>Declarație fiscală ITL 002</h1>
      <p className="lead">
        Pentru stabilirea impozitului/taxei pe clădirile rezidențiale / nerezidențiale / cu destinație mixtă aflate în
        proprietatea persoanelor juridice.
      </p>
      <p className="note">
        Datele nu sunt trimise nicăieri: PDF-ul este generat și descărcat direct în browserul dumneavoastră.
      </p>

      {pdf && <PdfPreview pdf={pdf} onDownload={() => downloadUrl(pdf.url, pdf.filename)} onBack={() => setPdf(undefined)} />}

      <FormProvider {...form}>
        <SectionsProvider>
          {/* Форма скрывается, а не размонтируется — введённые значения сохраняются. */}
          <DeclarationForm restored={restored} hidden={!!pdf} onValid={onSubmit} error={error} setError={setError} debug={debug} setDebug={setDebug} />
        </SectionsProvider>
      </FormProvider>
    </main>
  )
}

type DeclarationFormProps = {
  restored: Draft | undefined
  hidden: boolean
  onValid: (data: Declaration) => Promise<void>
  error: string | undefined
  setError: (error: string | undefined) => void
  debug: boolean
  setDebug: (debug: boolean) => void
}

function DeclarationForm({ restored, hidden, onValid, error, setError, debug, setDebug }: DeclarationFormProps) {
  const form = useFormContext<DeclarationInput, unknown, Declaration>()
  const sections = useSections()
  const drafts = useDrafts(restored, () => setError(undefined))

  const onInvalid = (errors: FieldErrors<DeclarationInput>) => {
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
          <button type="button" className="secondary" onClick={() => drafts.startNew(sampleDeclaration())}>
            Completează cu date de test
          </button>
        </div>
      )}

      <DraftsPanel drafts={drafts} />

      <p className="progress" aria-live="polite">
        Secțiuni gata: {sections.done} din {sections.total}
      </p>

      <Section id="contribuabil">
        <TaxpayerSection />
      </Section>
      <Section id="imputernicit">
        <RepresentativeSection />
      </Section>
      <Section id="strainatate">
        <div className="grid">
          <TextField name="adresaStrainatate" label="Adresa (dacă este cazul)" wide autoComplete="off" />
        </div>
      </Section>
      <Section id="cladire">
        <BuildingSection />
      </Section>
      <Section id="anexe">
        <AnnexesSection />
      </Section>
      <Section id="declaratie">
        <DeclarationSection />
      </Section>
      <Section id="antet">
        <p className="hint">Completați doar dacă le cunoașteți.</p>
        <div className="grid">
          <TextField name="antet.rolNominal" label="Numărul de rol nominal unic" autoComplete="off" />
          <TextField name="antet.registruTip" label="Registrul agricol: tipul" autoComplete="off" />
          <TextField name="antet.registruVolum" label="Volumul" autoComplete="off" />
          <TextField name="antet.registruPozitie" label="Poziția" autoComplete="off" />
        </div>
      </Section>

      {debugEnabled && (
        <label className="checkbox debug">
          <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
          Suprapune grila și chenarele câmpurilor (pentru ajustarea src/pdf/layout.ts)
        </label>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Se generează…' : 'Previzualizare'}
      </button>
    </form>
  )
}

function TaxpayerSection() {
  return (
    <>
      <div className="grid">
        <TextField name="contribuabil.denumire" label="Denumire contribuabil" wide autoComplete="organization" />
        <TextField name="contribuabil.cui" label="Cod unic de identificare (CUI)" inputMode="numeric" placeholder="RO12345678" autoComplete="off" />
        <TextField name="contribuabil.telefon" label="Numărul tel./fax" type="tel" autoComplete="section-sediu tel" />
        <TextField name="contribuabil.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-sediu email" />
      </div>

      <h3>Sediul</h3>
      <AddressFields
        prefix="contribuabil.sediu"
        section="sediu"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet', 'tara']}
      />

      <h3>Adresa de corespondență</h3>
      <p className="hint">Completați doar dacă diferă de sediu.</p>
      <AddressFields
        prefix="contribuabil.corespondenta"
        section="corespondenta"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate']}
      />

      <RadioGroup
        name="contribuabil.comunicareEmail"
        legend="Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică"
        options={[
          ['da', 'DA'],
          ['nu', 'NU'],
        ]}
      />
    </>
  )
}

function RepresentativeSection() {
  const exists = useWatch<DeclarationInput, 'imputernicit.exista'>({ name: 'imputernicit.exista' })
  return (
    <>
      <Checkbox name="imputernicit.exista">Declarația este depusă prin împuternicit</Checkbox>
      {exists && (
        <>
          <div className="grid">
            <TextField name="imputernicit.nume" label="Numele" autoComplete="section-imputernicit family-name" />
            <TextField name="imputernicit.prenume" label="Prenumele" autoComplete="section-imputernicit given-name" />
            <TextField name="imputernicit.cif" label="Cod de identificare fiscală (CNP sau CUI)" inputMode="numeric" autoComplete="off" />
            <TextField name="imputernicit.telefon" label="Numărul tel./fax" type="tel" autoComplete="section-imputernicit tel" />
            <TextField name="imputernicit.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-imputernicit email" />
          </div>
          <AddressFields
            prefix="imputernicit.adresa"
            section="imputernicit"
            fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet', 'tara']}
            labels={{ nr: 'Număr' }}
          />
        </>
      )}
    </>
  )
}

function BuildingSection() {
  const forma = useWatch<DeclarationInput, 'cladire.formaDobandire'>({ name: 'cladire.formaDobandire' })
  return (
    <>
      <RadioGroup
        name="cladire.tip"
        legend="Tipul clădirii"
        options={[
          ['nerezidentiala', 'Nerezidențială'],
          ['rezidentiala', 'Rezidențială'],
          ['mixta', 'Mixtă'],
        ]}
      />
      <div className="grid">
        <TextField name="cladire.nrAct" label="Nr. act dobândire" autoComplete="off" />
        <TextField name="cladire.dataDobandirii" label="Data dobândirii" type="date" autoComplete="off" />
        <TextField name="cladire.valoareAchizitie" label="Valoare achiziție (lei)" inputMode="decimal" placeholder="125.000,00" autoComplete="off" />
      </div>
      <RadioGroup
        name="cladire.formaDobandire"
        legend="Forma de dobândire"
        options={[
          ['proprietate', 'Proprietate'],
          ['inchiriere', 'Închiriere'],
          ['concesiune', 'Concesiune'],
          ['administrare', 'Administrare'],
          ['folosinta', 'Folosință'],
          ['alte', 'Alte modalități'],
        ]}
      />
      {forma === 'alte' && (
        <div className="grid">
          <TextField name="cladire.formaAlta" label="Alte modalități — precizați" wide autoComplete="off" />
        </div>
      )}

      <h3>Adresa clădirii</h3>
      <AddressFields
        prefix="cladire.adresa"
        section="cladire"
        fields={['strada', 'nr', 'bloc', 'scara', 'etaj', 'apartament', 'localitate']}
        labels={{ apartament: 'Ap.', localitate: 'Localitate/sector' }}
      />

      <h3>Valoarea clădirii</h3>
      <IndicatorTable />
    </>
  )
}

const INDICATOR_LABELS: Record<(typeof INDICATORS)[number], string> = {
  a: 'a) înregistrată în evidențele organului fiscal',
  b: 'b) rezultată dintr-un raport de evaluare',
  c: 'c) a lucrărilor de construcții, în cazul clădirilor nou construite',
  d: 'd) de achiziție',
  e: 'e) înscrisă în contabilitatea proprietarului clădirii și comunicată concesionarului, locatarului, titularului dreptului de administrare sau de folosință',
}
const USE_LABELS = { rez: 'Rezidențial', nerez: 'Nerezidențial' } as const

/** Таблица «Indicator»: показываются только колонки, относящиеся к выбранному типу здания. */
function IndicatorTable() {
  const tip = useWatch<DeclarationInput, 'cladire.tip'>({ name: 'cladire.tip' })
  const uses = allowedUses(tip)
  if (uses.length === 0) return <p className="hint">Alegeți mai întâi tipul clădirii.</p>

  return (
    <>
      <p className="hint">Completați valoarea și data documentului pentru indicatorii aplicabili.</p>
      {INDICATORS.map((col) => (
        <div key={col} className="indicator">
          <p className="indicator-label">{INDICATOR_LABELS[col]}</p>
          <div className="grid">
            {uses.map((use) => (
              <IndicatorCell key={use} col={col} use={use} showUse={uses.length > 1} />
            ))}
          </div>
        </div>
      ))}
      <ErrorText name="cladire.indicatori" />
    </>
  )
}

function IndicatorCell({ col, use, showUse }: { col: (typeof INDICATORS)[number]; use: 'rez' | 'nerez'; showUse: boolean }) {
  const suffix = showUse ? ` — ${USE_LABELS[use].toLowerCase()}` : ''
  return (
    <>
      <TextField name={`cladire.indicatori.${col}.${use}.valoare`} label={`Valoare (lei)${suffix}`} inputMode="decimal" autoComplete="off" />
      <TextField name={`cladire.indicatori.${col}.${use}.data`} label={`Data documentului${suffix}`} type="date" autoComplete="off" />
    </>
  )
}

function AnnexesSection() {
  const { control } = useFormContext<DeclarationInput>()
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

function DeclarationSection() {
  return (
    <>
      <p className="hint">
        Sub sancțiunile aplicate faptei de fals în acte publice, declar că datele înscrise sunt corecte și complete și că
        voi depune o nouă declarație în termen de 30 de zile dacă intervin modificări.
      </p>
      <h3>Actul de identitate al semnatarului</h3>
      <div className="grid">
        <TextField name="actIdentitate.tip" label="Tipul" list="id-types" autoComplete="off" />
        <TextField name="actIdentitate.serie" label="Seria" autoComplete="off" />
        <TextField name="actIdentitate.numar" label="Numărul" autoComplete="off" />
        <TextField name="actIdentitate.data" label="La data de" type="date" autoComplete="off" />
        <TextField name="actIdentitate.eliberatDe" label="Eliberat de" wide autoComplete="off" />
        <TextField name="dataDeclaratiei" label="Data declarației" type="date" autoComplete="off" />
      </div>
      <datalist id="id-types">
        <option value="CI" />
        <option value="BI" />
        <option value="Pașaport" />
      </datalist>
      <p className="hint">Semnătura se aplică de mână pe documentul tipărit.</p>
    </>
  )
}
