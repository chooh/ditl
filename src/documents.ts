import { unitAddress, type Dossier } from './dossier/schema'
import { toPrintData as print002 } from './itl002/print'
import { toPrintData as print004 } from './itl004/print'
import type { TemplateId } from './typst/bundle'

/** Документ, который собирается из досье. */
export type DocumentSpec = {
  template: TemplateId
  /** Название бланка: «Declarație fiscală ITL 002». */
  title: string
  /** Какой это документ среди остальных: «ITL 002 — Șos. Mihai Bravu nr. 200, ap. 18». */
  label: string
  /** Имя файла без расширения. */
  filename: string
  /** Данные для шаблона, уже в печатном виде. */
  data: unknown
}

/** ITL 002 на каждый объект и одна ITL 004 на землю под всеми объектами. */
export function documentsFor(d: Dossier): DocumentSpec[] {
  const cui = d.company.uniqueId
  const buildings = d.properties.map(
    (p, i): DocumentSpec => ({
      template: 'itl002',
      title: 'Declarație fiscală ITL 002',
      label: `ITL 002 — ${unitAddress(p)}`,
      filename: d.properties.length === 1 ? `ITL002_${cui}` : `ITL002_${cui}_${i + 1}`,
      data: print002(d, i),
    }),
  )
  const n = d.properties.length
  const land: DocumentSpec = {
    template: 'itl004',
    title: 'Declarație fiscală ITL 004',
    label: `ITL 004 — teren, ${n === 1 ? '1 imobil' : `${n} imobile`}`,
    filename: `ITL004_${cui}`,
    data: print004(d),
  }
  return [...buildings, land]
}
