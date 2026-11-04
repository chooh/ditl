import { useEffect, useState } from 'react'
import { compilePdf, TypstError } from '../typst/compiler'
import { downloadUrl } from './download'

/**
 * Загружает компилятор Typst (отдельный чанк + WASM) и собирает PDF из .typ.
 * Сам компонент тоже грузится лениво — см. Result.
 */
type State = { step: 'compiling' } | { step: 'done'; url: string } | { step: 'error'; message: string; details?: string }

export default function PdfView({ source, filename }: { source: string; filename: string }) {
  const [state, setState] = useState<State>({ step: 'compiling' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let url: string | undefined
    setState({ step: 'compiling' })
    compilePdf(source).then(
      (bytes) => {
        if (cancelled) return
        url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
        setState({ step: 'done', url })
      },
      (e: unknown) => {
        console.error(e)
        if (cancelled) return
        setState(
          e instanceof TypstError
            ? { step: 'error', message: 'Șablonul nu a putut fi compilat.', details: e.message }
            : { step: 'error', message: 'Compilatorul nu a putut fi încărcat. Verificați conexiunea și încercați din nou.' },
        )
      },
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [source, attempt])

  if (state.step === 'compiling') {
    return (
      <p className="pdf-status" role="status">
        <progress aria-label="Se generează PDF-ul" /> Se încarcă compilatorul și se generează PDF-ul…
      </p>
    )
  }

  if (state.step === 'error') {
    return (
      <div className="pdf-status">
        <p className="error" role="alert">
          {state.message}
        </p>
        {state.details && <pre className="diagnostics">{state.details}</pre>}
        <button type="button" className="secondary" onClick={() => setAttempt((n) => n + 1)}>
          Încearcă din nou
        </button>
      </div>
    )
  }

  return (
    <>
      <iframe src={state.url} title="Previzualizare PDF" />
      <p className="note">
        Nu se afișează (de exemplu, pe telefon)?{' '}
        <a href={state.url} target="_blank" rel="noopener">
          Deschide într-o filă nouă
        </a>
      </p>
      <div className="actions">
        <button type="button" onClick={() => downloadUrl(state.url, `${filename}.pdf`)}>
          Descarcă PDF
        </button>
      </div>
    </>
  )
}
