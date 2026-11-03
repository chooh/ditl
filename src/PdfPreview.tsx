import { useEffect, useRef } from 'react'

export type GeneratedPdf = {
  /** blob: URL — живёт только в этой вкладке, освобождается при закрытии предпросмотра. */
  url: string
  filename: string
}

type Props = {
  pdf: GeneratedPdf
  onDownload: () => void
  onBack: () => void
}

export function PdfPreview({ pdf, onDownload, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus()
  }, [])

  return (
    <section className="preview" aria-labelledby="preview-heading">
      <h2 id="preview-heading" ref={heading} tabIndex={-1}>
        Verificați documentul
      </h2>
      <iframe src={pdf.url} title="Previzualizare PDF" />
      <p className="note">
        Nu se afișează (de exemplu, pe telefon)?{' '}
        <a href={pdf.url} target="_blank" rel="noopener">
          Deschide într-o filă nouă
        </a>
      </p>
      <div className="actions">
        <button type="button" onClick={onDownload}>
          Descarcă PDF
        </button>
        <button type="button" className="secondary" onClick={onBack}>
          Modifică datele
        </button>
      </div>
    </section>
  )
}
