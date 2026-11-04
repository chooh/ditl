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
      <h2 id="result-heading" ref={heading} tabIndex={-1}>
        Documentele sunt gata
      </h2>
      <p>
        Fiecare fișier Typst conține datele și șablonul formularului. Îl puteți transforma în PDF pe calculatorul dumneavoastră:{' '}
        <code>typst compile {docs[0]!.filename}.typ</code>
      </p>
      <ul className="documents">
        {docs.map((d) => (
          <li key={d.filename}>
            <span className="document-label">{d.label}</span>
            <button
              type="button"
              className="link"
              aria-label={`Descarcă .typ: ${d.label}`}
              onClick={() => downloadBlob(d.source, `${d.filename}.typ`, 'text/plain;charset=utf-8')}
            >
              {d.filename}.typ
            </button>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button type="button" className="secondary" onClick={onBack}>
          Modifică datele
        </button>
      </div>

      <h3>PDF în browser</h3>
      {pdf ? (
        <>
          {docs.length > 1 && (
            <div className="field">
              <label htmlFor={selectId}>Documentul</label>
              <select id={selectId} value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
                {docs.map((d, i) => (
                  <option key={d.filename} value={i}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Suspense
            fallback={
              <p className="pdf-status" role="status">
                <progress aria-label="Se încarcă compilatorul" /> Se încarcă compilatorul…
              </p>
            }
          >
            <PdfView key={doc.filename} source={doc.source} filename={doc.filename} />
          </Suspense>
        </>
      ) : (
        <>
          <p className="note">
            Pentru previzualizare și PDF, browserul descarcă o singură dată compilatorul Typst — aproximativ 11 MB; apoi
            îl ia din cache. Datele rămân în browser.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              compilerAccepted = true
              setPdf(true)
            }}
          >
            Încarcă compilatorul și generează PDF-urile
          </button>
        </>
      )}
    </section>
  )
}
