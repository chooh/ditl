import { formatDate, formatMoney } from '../pdf/format'
import { allowedUses, INDICATORS, type Declaration } from './schema'

/**
 * Данные для шаблона src/typst/itl002.typ: всё уже строками в печатном виде.
 * Форма данных — как в src/typst/samples/itl002.json.
 */
export function toPrintData(d: Declaration) {
  const { exista, ...imputernicit } = d.imputernicit
  const uses = allowedUses(d.cladire.tip)
  // Колонки, не относящиеся к типу здания, печатаются пустыми.
  const cell = (col: (typeof INDICATORS)[number], use: 'rez' | 'nerez') => {
    const c = d.cladire.indicatori[col][use]
    return uses.includes(use) ? { valoare: formatMoney(c.valoare), data: formatDate(c.data) } : { valoare: '', data: '' }
  }

  return {
    antet: d.antet,
    contribuabil: d.contribuabil,
    imputernicit: exista ? imputernicit : null,
    adresaStrainatate: d.adresaStrainatate,
    cladire: {
      ...d.cladire,
      dataDobandirii: formatDate(d.cladire.dataDobandirii),
      valoareAchizitie: formatMoney(d.cladire.valoareAchizitie),
      formaAlta: d.cladire.formaDobandire === 'alte' ? d.cladire.formaAlta : '',
      indicatori: Object.fromEntries(INDICATORS.map((col) => [col, { rez: cell(col, 'rez'), nerez: cell(col, 'nerez') }])),
    },
    anexe: d.anexe,
    actIdentitate: { ...d.actIdentitate, data: formatDate(d.actIdentitate.data) },
    dataDeclaratiei: formatDate(d.dataDeclaratiei),
  }
}
