import { Button, CodeSnippet, ContainedList, ContainedListItem, InlineLoading, Select, SelectItem, Stack } from '@carbon/react'
import { ArrowLeft, DocumentPdf, Download } from '@carbon/icons-react'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { downloadBlob } from './download'

/** Компилятор — отдельный чанк; модуль не грузится, пока пользователь не попросил PDF. */
const PdfView = lazy(() => import('./PdfView'))

/** Пользователь уже согласился загрузить компилятор — дальше PDF собирается сразу. */
let compilerAccepted = false

export type TypstDocument = {
  /** Какой это документ: «ITL 002 — Șos. Mihai Bravu nr. 200, ap. 18». */
  label: string
  /** Самодостаточный .typ: данные + шаблон. */
  source: string
  /** Имя файла без расширения. */
  filename: string
}

export function Result({ docs, onBack }: { docs: TypstDocument[]; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [pdf, setPdf] = useState(compilerAccepted)
  const [selected, setSelected] = useState(0)
  const selectId = useId()

  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus()
  }, [])

  const doc = docs[selected]!
  return (
    <section className="preview" aria-labelledby="result-heading">
      <Stack gap={6}>
        <div>
          <h2 id="result-heading" className="preview-heading" ref={heading} tabIndex={-1}>
            Documentele sunt gata
          </h2>
          <p>Fiecare fișier Typst conține datele și șablonul formularului. Îl puteți transforma în PDF pe calculatorul dumneavoastră:</p>
        </div>
        <CodeSnippet type="single" feedback="Copiat" aria-label="Comanda Typst" copyButtonDescription="Copiază comanda">
          {`typst compile ${docs[0]!.filename}.typ`}
        </CodeSnippet>
        <ContainedList label="Fișiere Typst" kind="on-page">
          {docs.map((d) => (
            <ContainedListItem
              key={d.filename}
              action={
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Download}
                  aria-label={`Descarcă .typ: ${d.label}`}
                  onClick={() => downloadBlob(d.source, `${d.filename}.typ`, 'text/plain;charset=utf-8')}
                >
                  {d.filename}.typ
                </Button>
              }
            >
              {d.label}
            </ContainedListItem>
          ))}
        </ContainedList>
        <div>
          <Button kind="secondary" renderIcon={ArrowLeft} onClick={onBack}>
            Modifică datele
          </Button>
        </div>

        <h3 className="subheading">PDF în browser</h3>
        {pdf ? (
          <>
            {docs.length > 1 && (
              <Select id={selectId} labelText="Documentul" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                {docs.map((d, i) => (
                  <SelectItem key={d.filename} value={i} text={d.label} />
                ))}
              </Select>
            )}
            <Suspense fallback={<InlineLoading status="active" description="Se încarcă compilatorul…" />}>
              <PdfView key={doc.filename} source={doc.source} filename={doc.filename} />
            </Suspense>
          </>
        ) : (
          <>
            <p className="note">
              Pentru previzualizare și PDF, browserul descarcă o singură dată compilatorul Typst — aproximativ 11 MB; apoi îl ia din
              cache. Datele rămân în browser.
            </p>
            <div>
              <Button
                kind="tertiary"
                renderIcon={DocumentPdf}
                onClick={() => {
                  compilerAccepted = true
                  setPdf(true)
                }}
              >
                Încarcă compilatorul și generează PDF-urile
              </Button>
            </div>
          </>
        )}
      </Stack>
    </section>
  )
}
