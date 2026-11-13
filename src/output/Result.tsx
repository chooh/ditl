import {
  Accordion,
  AccordionItem,
  Button,
  Callout,
  CodeSnippet,
  ContainedList,
  ContainedListItem,
  InlineLoading,
  ListItem,
  OrderedList,
  Select,
  SelectItem,
  Stack,
} from '@carbon/react'
import { ArrowLeft, Download } from '@carbon/icons-react'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { useHelpTopic } from '../help/Help'
import { downloadBlob } from './download'

/** Предпросмотр тянет за собой компилятор — отдельный чанк, не нужный до генерации документов. */
const PdfView = lazy(() => import('./PdfView'))

export type TypstDocument = {
  /** Какой это документ: «ITL 002 — Șos. Mihai Bravu nr. 200, ap. 18». */
  label: string
  /** Самодостаточный .typ: данные + шаблон. */
  source: string
  /** Имя файла без расширения. */
  filename: string
  /** PDF, собранный при генерации; нет — не удалось, PdfView соберёт заново. */
  pdf?: Uint8Array
}

/**
 * Экран результата: что делать дальше, PDF — главное действие; файлы .typ — для тех,
 * кто собирает PDF сам, в свёрнутом разделе.
 */
export function Result({ docs, onBack }: { docs: TypstDocument[]; onBack: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [selected, setSelected] = useState(0)
  const selectId = useId()
  useHelpTopic('result')

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
          <Callout
            kind="success"
            lowContrast
            title={docs.length === 1 ? 'S-a pregătit 1 declarație.' : `S-au pregătit ${docs.length} declarații.`}
            subtitle="Descărcați PDF-urile, apoi tipăriți-le, semnați-le și depuneți-le."
          />
        </div>
        <div>
          <h3 className="subheading">Ce urmează</h3>
          <OrderedList>
            <ListItem>Descărcați PDF-ul fiecărei declarații.</ListItem>
            <ListItem>Tipăriți, semnați și ștampilați declarațiile.</ListItem>
            <ListItem>Atașați copiile documentelor enumerate la anexe.</ListItem>
            <ListItem>Depuneți dosarul la DGITL Sector 2.</ListItem>
          </OrderedList>
        </div>

        <h3 className="subheading">PDF-urile declarațiilor</h3>
        {docs.length > 1 && (
          <Select id={selectId} labelText="Documentul" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
            {docs.map((d, i) => (
              <SelectItem key={d.filename} value={i} text={d.label} />
            ))}
          </Select>
        )}
        <Suspense fallback={<InlineLoading status="active" description="Se pregătește previzualizarea…" />}>
          <PdfView key={doc.filename} source={doc.source} pdf={doc.pdf} filename={doc.filename} />
        </Suspense>
        <div>
          <Button kind="secondary" renderIcon={ArrowLeft} onClick={onBack}>
            Modifică datele
          </Button>
        </div>

        <Accordion className="advanced">
          <AccordionItem title="Pentru specialiști: fișierele Typst">
            <Stack gap={5}>
              <p>Fiecare fișier Typst conține datele și șablonul formularului. Îl puteți transforma în PDF pe calculator:</p>
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
                        hasIconOnly
                        renderIcon={Download}
                        iconDescription={`Descarcă ${d.filename}.typ`}
                        tooltipAlignment="end"
                        onClick={() => downloadBlob(d.source, `${d.filename}.typ`, 'text/plain;charset=utf-8')}
                      />
                    }
                  >
                    {d.label}
                    <span className="item-secondary">{d.filename}.typ</span>
                  </ContainedListItem>
                ))}
              </ContainedList>
            </Stack>
          </AccordionItem>
        </Accordion>
      </Stack>
    </section>
  )
}
