import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { downloadBlob } from './download'

/** Компилятор — отдельный чанк; модуль не грузится, пока пользователь не попросил PDF. */
const PdfView = lazy(() => import('./PdfView'))

/** Пользователь уже согласился загрузить компилятор — дальше PDF собирается сразу. */
let compilerAccepted = false

export type TypstDocument = {
  /** Самодостаточный .typ: данные + шаблон. */
  source: string
  /** Имя файла без расширения. */
  filename: string
}

export function Result({ doc, onBack }: { doc: TypstDocument; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [pdf, setPdf] = useState(compilerAccepted)

  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus()
  }, [])

  const typFile = `${doc.filename}.typ`
  return (
    <section className="preview" aria-labelledby="result-heading">
      <h2 id="result-heading" ref={heading} tabIndex={-1}>
        Documentul este gata
      </h2>
      <p>
        Fișierul Typst conține datele și șablonul formularului. Îl puteți transforma în PDF pe calculatorul dumneavoastră:{' '}
        <code>typst compile {typFile}</code>
      </p>
      <div className="actions">
        <button type="button" onClick={() => downloadBlob(doc.source, typFile, 'text/plain;charset=utf-8')}>
          Descarcă .typ
        </button>
        <button type="button" className="secondary" onClick={onBack}>
          Modifică datele
        </button>
      </div>

      <h3>PDF în browser</h3>
      {pdf ? (
        <Suspense
          fallback={
            <p className="pdf-status" role="status">
              <progress aria-label="Se încarcă compilatorul" /> Se încarcă compilatorul…
            </p>
          }
        >
          <PdfView source={doc.source} filename={doc.filename} />
        </Suspense>
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
            Încarcă compilatorul și generează PDF-ul
          </button>
        </>
      )}
    </section>
  )
}
