import type { Locality } from './address/siruta'
import { unitAddress, type Dossier } from './dossier/schema'
import { toPrintData as print002 } from './itl002/print'
import { toPrintData as print004 } from './itl004/print'
import type { TemplateId } from './typst/bundle'

/** Документ, который собирается из досье. */
export type DocumentSpec = {
  template: TemplateId
  /** Название бланка: «Declarație fiscală ITL 002». */
  title: string
  /** Какой это документ: «ITL 002 — clădirea, Șos. Mihai Bravu nr. 200, ap. 18». */
  label: string
  /** Имя файла без расширения. */
  filename: string
  /** Данные для шаблона, уже в печатном виде. */
  data: unknown
}

/** ITL 002 на здание и ITL 004 на землю под ним; `localities` — справочник SIRUTA. */
export function documentsFor(d: Dossier, localities: Locality[]): DocumentSpec[] {
  const cui = d.company.uniqueId
  return [
    {
      template: 'itl002',
      title: 'Declarație fiscală ITL 002',
      label: `ITL 002 — clădirea, ${unitAddress(d.property)}`,
      filename: `ITL002_${cui}`,
      data: print002(d),
    },
    {
      template: 'itl004',
      title: 'Declarație fiscală ITL 004',
      label: `ITL 004 — terenul, ${unitAddress(d.property)}`,
      filename: `ITL004_${cui}`,
      data: print004(d, localities),
    },
  ]
}
