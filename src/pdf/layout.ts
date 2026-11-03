import { allowedUses, INDICATORS, type Address, type Declaration } from '../form/schema'
import { formatDate, formatMoney } from './format'

/**
 * Где на бланке ITL 002 печатать каждое значение.
 *
 * Координаты — в пунктах PDF (1 pt ≈ 0,353 мм), отсчёт от ЛЕВОГО ВЕРХНЕГО угла
 * страницы (как у pdfplumber и `pdftotext -bbox`): x — слева направо, top/bottom —
 * сверху вниз. Бланк — A4 альбомный, 841,92 × 595,32 pt.
 *
 * Значения — границы ячеек таблицы, снятые с бланка. Чтобы проверить разметку,
 * откройте приложение с `?debug` и включите наложение: сетка и рамки всех полей
 * появятся в предпросмотре.
 */
export type Box = { x0: number; x1: number; top: number; bottom: number }

export type LayoutItem = { label: string } & (
  /** Одна строка в ячейке, по центру по вертикали. Длинный текст уменьшается до MIN_FONT_SIZE. */
  | { kind: 'text'; box: Box; align?: 'left' | 'center'; size?: number; value: (d: Declaration) => string }
  /** По символу в клетку; клетки одинаковой ширины `pitch`, начиная с `box.x0`. */
  | { kind: 'cells'; box: Box; pitch: number; count: number; value: (d: Declaration) => string }
  /** Крестик в квадрате чекбокса. */
  | { kind: 'check'; box: Box; value: (d: Declaration) => boolean }
)

export const DEFAULT_FONT_SIZE = 7
export const MIN_FONT_SIZE = 4.5

const box = (x0: number, x1: number, top: number, bottom: number): Box => ({ x0, x1, top, bottom })

type Row = { top: number; bottom: number }
type AddressKey = keyof Address
/** Ячейки адреса в одной строке таблицы: поле адреса → [x0, x1]. */
function addressRow(
  label: string,
  row: Row,
  cells: Partial<Record<AddressKey, [number, number]>>,
  get: (d: Declaration) => Address | null,
): LayoutItem[] {
  return Object.entries(cells).map(([key, [x0, x1]]) => ({
    kind: 'text',
    label: `${label}: ${key}`,
    box: box(x0, x1, row.top, row.bottom),
    value: (d) => get(d)?.[key as AddressKey] ?? '',
  }))
}

const ROWS = {
  header: { top: 96, bottom: 113 },
  name1: { top: 134, bottom: 143 },
  name2: { top: 143, bottom: 151 },
  contact: { top: 151, bottom: 160 },
  address: { top: 160, bottom: 168 },
  correspondence: { top: 168, bottom: 194 },
  impName: { top: 204, bottom: 213 },
  impFirstName: { top: 213, bottom: 221 },
  impContact: { top: 221, bottom: 230 },
  impAddress: { top: 230, bottom: 238 },
  foreign: { top: 238, bottom: 255 },
  act: { top: 259, bottom: 276 },
  form: { top: 276, bottom: 288 },
  buildingAddress: { top: 288, bottom: 301 },
  indicatorValue: { top: 341, bottom: 354 },
  indicatorDate: { top: 354, bottom: 366 },
  identity: { top: 453, bottom: 463 },
  signature: { top: 463, bottom: 483 },
} satisfies Record<string, Row>

const rowBox = (row: Row, x0: number, x1: number) => box(x0, x1, row.top, row.bottom)
const imp = (d: Declaration) => (d.imputernicit.exista ? d.imputernicit : null)

/** Квадраты чекбоксов (7×7 pt). */
const checkbox = (x0: number, top: number) => box(x0, x0 + 7.1, top, top + 7.1)

/** Колонки таблицы «Indicator»: a)–e) × rezidențial / nerezidențial. */
const INDICATOR_COLUMNS: Record<(typeof INDICATORS)[number], { rez: [number, number]; nerez: [number, number] }> = {
  a: { rez: [145.4, 195.2], nerez: [195.2, 251.7] },
  b: { rez: [251.7, 295.1], nerez: [295.1, 343.9] },
  c: { rez: [343.9, 400.1], nerez: [400.1, 457.4] },
  d: { rez: [457.4, 499.9], nerez: [499.9, 549.5] },
  e: { rez: [549.5, 658.9], nerez: [658.9, 840.1] },
}

/** Строки «1……», «2……» списка приложений: три колонки по три строки, текст над точками. */
const ANNEX_SLOTS: Box[] = [53.5, 266, 478.5].flatMap((x0) =>
  [390.5, 400.8, 411.1].map((top) => box(x0, x0 + 200, top, top + 8)),
)

export const layout: LayoutItem[] = [
  // ── Шапка ──
  { kind: 'text', label: 'Numărul de rol nominal unic', box: rowBox(ROWS.header, 157.9, 228.8), align: 'center', value: (d) => d.antet.rolNominal },
  { kind: 'text', label: 'Registrul agricol: tipul', box: rowBox(ROWS.header, 323, 377.6), value: (d) => d.antet.registruTip },
  { kind: 'text', label: 'Registrul agricol: volumul', box: rowBox(ROWS.header, 413, 476.9), value: (d) => d.antet.registruVolum },
  { kind: 'text', label: 'Registrul agricol: poziția', box: rowBox(ROWS.header, 507.5, 838.5), value: (d) => d.antet.registruPozitie },

  // ── I. Contribuabil ──
  { kind: 'text', label: 'Denumire contribuabil', box: box(80.8, 365.6, ROWS.name1.top, ROWS.name2.bottom), size: 8, value: (d) => d.contribuabil.denumire },
  // Для юрлица код фискальной идентификации совпадает с CUI — печатается в обе строки.
  { kind: 'cells', label: 'Codul de identificare fiscală', box: rowBox(ROWS.name1, 464.1, 839.6), pitch: 31.29, count: 12, value: (d) => d.contribuabil.cui },
  { kind: 'cells', label: 'Codul unic de identificare', box: rowBox(ROWS.name2, 464.1, 839.6), pitch: 41.72, count: 9, value: (d) => d.contribuabil.cui },
  { kind: 'text', label: 'Numărul tel./fax', box: rowBox(ROWS.contact, 80.8, 236.7), value: (d) => d.contribuabil.telefon },
  { kind: 'text', label: 'Adresa de poștă electronică', box: rowBox(ROWS.contact, 328.9, 456.1), value: (d) => d.contribuabil.email },
  ...addressRow('Sediu', ROWS.contact, { strada: [484.4, 683.0], nr: [704.6, 749.0], codPostal: [787, 839.6] }, (d) => d.contribuabil.sediu),
  ...addressRow(
    'Sediu',
    ROWS.address,
    {
      bloc: [60.0, 80.8],
      scara: [108.7, 129.8],
      etaj: [158.1, 179.4],
      apartament: [221.9, 243.2],
      localitate: [285.1, 398.6],
      judet: [456.1, 661.6],
      tara: [683.0, 839.6],
    },
    (d) => d.contribuabil.sediu,
  ),
  ...addressRow(
    'Adresa de corespondență',
    ROWS.correspondence,
    {
      strada: [109.7, 265.6],
      nr: [279.8, 294.1],
      codPostal: [343.6, 378.6],
      bloc: [406.9, 421.1],
      scara: [449.4, 463.6],
      etaj: [484.9, 499.1],
      apartament: [520.4, 534.5],
      localitate: [570.0, 647.9],
    },
    (d) => d.contribuabil.corespondenta,
  ),
  { kind: 'check', label: 'Comunicare exclusiv e-mail: DA', box: checkbox(680.9, 185.7), value: (d) => d.contribuabil.comunicareEmail === 'da' },
  { kind: 'check', label: 'Comunicare exclusiv e-mail: NU', box: checkbox(747.0, 185.7), value: (d) => d.contribuabil.comunicareEmail === 'nu' },

  // ── II. Împuternicit ──
  { kind: 'text', label: 'Împuternicit: numele', box: rowBox(ROWS.impName, 101.5, 365.6), value: (d) => imp(d)?.nume ?? '' },
  { kind: 'text', label: 'Împuternicit: prenumele', box: rowBox(ROWS.impFirstName, 102.0, 366.3), value: (d) => imp(d)?.prenume ?? '' },
  // 11 клеток + широкая ячейка в конце: CNP (13 цифр) продолжается в ней с тем же шагом.
  { kind: 'cells', label: 'Împuternicit: codul de identificare fiscală', box: rowBox(ROWS.impFirstName, 366.3, 840.2), pitch: 33.9, count: 13, value: (d) => imp(d)?.cif ?? '' },
  { kind: 'text', label: 'Împuternicit: tel./fax', box: rowBox(ROWS.impContact, 102.0, 214.6), value: (d) => imp(d)?.telefon ?? '' },
  { kind: 'text', label: 'Împuternicit: e-mail', box: rowBox(ROWS.impContact, 306.8, 412.8), value: (d) => imp(d)?.email ?? '' },
  ...addressRow('Împuternicit', ROWS.impContact, { strada: [441.1, 840.2] }, (d) => imp(d)?.adresa ?? null),
  ...addressRow(
    'Împuternicit',
    ROWS.impAddress,
    {
      nr: [78.0, 102.8],
      codPostal: [145.4, 215.6],
      bloc: [243.8, 272.2],
      scara: [307.6, 336.1],
      etaj: [357.4, 371.6],
      apartament: [414.1, 442.6],
      localitate: [478.1, 598.6],
      judet: [655.5, 719.1],
      tara: [740.4, 840.2],
    },
    (d) => imp(d)?.adresa ?? null,
  ),

  // ── III. Adresa în alt stat ──
  { kind: 'text', label: 'Adresa de rezidență în alt stat', box: rowBox(ROWS.foreign, 174.2, 840.2), size: 8, value: (d) => d.adresaStrainatate },

  // ── IV. Clădirea ──
  { kind: 'check', label: 'Clădire nerezidențială', box: checkbox(31.6, 265.8), value: (d) => d.cladire.tip === 'nerezidentiala' },
  { kind: 'check', label: 'Clădire rezidențială', box: checkbox(104.9, 265.8), value: (d) => d.cladire.tip === 'rezidentiala' },
  { kind: 'check', label: 'Clădire mixtă', box: checkbox(171.6, 265.8), value: (d) => d.cladire.tip === 'mixta' },
  { kind: 'text', label: 'Nr. act dobândire', box: rowBox(ROWS.act, 442.9, 513.8), align: 'center', value: (d) => d.cladire.nrAct },
  { kind: 'text', label: 'Data dobândirii', box: rowBox(ROWS.act, 577.6, 670.0), align: 'center', value: (d) => formatDate(d.cladire.dataDobandirii) },
  { kind: 'text', label: 'Valoare achiziție', box: rowBox(ROWS.act, 748.0, 840.1), align: 'center', value: (d) => formatMoney(d.cladire.valoareAchizitie) },
  ...(
    [
      ['proprietate', 116.3],
      ['inchiriere', 168.2],
      ['concesiune', 215.8],
      ['administrare', 272.5],
      ['folosinta', 331.0],
      ['alte', 376.3],
    ] as const
  ).map(([forma, x0]): LayoutItem => ({
    kind: 'check',
    label: `Forma de dobândire: ${forma}`,
    box: checkbox(x0, 277.6),
    value: (d) => d.cladire.formaDobandire === forma,
  })),
  { kind: 'text', label: 'Alte modalități', box: rowBox(ROWS.form, 449.9, 840.1), value: (d) => (d.cladire.formaDobandire === 'alte' ? d.cladire.formaAlta : '') },
  ...addressRow(
    'Adresa clădirii',
    ROWS.buildingAddress,
    {
      strada: [60.2, 230.4],
      nr: [251.7, 308.4],
      bloc: [336.8, 365.1],
      scara: [400.6, 563.6],
      etaj: [592.0, 627.5],
      apartament: [648.9, 670.0],
      localitate: [741.0, 840.1],
    },
    (d) => d.cladire.adresa,
  ),
  ...INDICATORS.flatMap((col) =>
    (['rez', 'nerez'] as const).flatMap((use): LayoutItem[] => {
      const [x0, x1] = INDICATOR_COLUMNS[col][use]
      const cell = (d: Declaration) => (allowedUses(d.cladire.tip).includes(use) ? d.cladire.indicatori[col][use] : null)
      return [
        { kind: 'text', label: `Valoare ${col}) ${use}`, box: rowBox(ROWS.indicatorValue, x0, x1), align: 'center', value: (d) => formatMoney(cell(d)?.valoare ?? null) },
        { kind: 'text', label: `Data documentului ${col}) ${use}`, box: rowBox(ROWS.indicatorDate, x0, x1), align: 'center', value: (d) => formatDate(cell(d)?.data ?? '') },
      ]
    }),
  ),

  // ── Anexe ──
  ...ANNEX_SLOTS.map((slot, i): LayoutItem => ({ kind: 'text', label: `Anexa ${i + 1}`, box: slot, size: 8, value: (d) => d.anexe[i] ?? '' })),

  // ── Declarația: actul de identitate al semnatarului ──
  { kind: 'text', label: 'Act de identitate: tipul', box: rowBox(ROWS.identity, 163.3, 191.7), align: 'center', value: (d) => d.actIdentitate.tip },
  { kind: 'text', label: 'Act de identitate: seria', box: rowBox(ROWS.identity, 214.2, 245.1), align: 'center', value: (d) => d.actIdentitate.serie },
  { kind: 'text', label: 'Act de identitate: numărul', box: rowBox(ROWS.identity, 287.6, 356.9), value: (d) => d.actIdentitate.numar },
  { kind: 'text', label: 'Act de identitate: eliberat de', box: rowBox(ROWS.identity, 406.4, 668.2), value: (d) => d.actIdentitate.eliberatDe },
  { kind: 'text', label: 'Act de identitate: la data de', box: rowBox(ROWS.identity, 710.8, 833.0), value: (d) => formatDate(d.actIdentitate.data) },
  // Только дата в верхней половине ячейки — ниже остаётся место для подписи от руки.
  { kind: 'text', label: 'Data declarației', box: box(98, 219.5, ROWS.signature.top, ROWS.signature.top + 9), value: (d) => formatDate(d.dataDeclaratiei) },
]
