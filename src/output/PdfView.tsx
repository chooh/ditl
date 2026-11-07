import { Button, InlineLoading, InlineNotification, Link } from '@carbon/react'
import { Download, Renew } from '@carbon/icons-react'
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
            : { step: 'error', message: 'Motorul de tipărire nu a putut fi încărcat. Verificați conexiunea și încercați din nou.' },
        )
      },
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [source, attempt])

  if (state.step === 'compiling') {
    return <InlineLoading status="active" description="Se pregătește motorul de tipărire și se generează PDF-ul…" />
  }

  if (state.step === 'error') {
    return (
      <div>
        <InlineNotification kind="error" role="alert" lowContrast hideCloseButton title={state.message} />
        {state.details && <pre className="diagnostics">{state.details}</pre>}
        <Button kind="tertiary" renderIcon={Renew} onClick={() => setAttempt((n) => n + 1)}>
          Încearcă din nou
        </Button>
      </div>
    )
  }

  return (
    <>
      <iframe src={state.url} title="Previzualizare PDF" />
      <p className="note">
        Nu se afișează (de exemplu, pe telefon)?{' '}
        <Link href={state.url} target="_blank" rel="noopener" size="sm" inline>
          Deschide într-o filă nouă
        </Link>
      </p>
      <div>
        <Button renderIcon={Download} onClick={() => downloadUrl(state.url, `${filename}.pdf`)}>
          Descarcă PDF
        </Button>
      </div>
    </>
  )
}
