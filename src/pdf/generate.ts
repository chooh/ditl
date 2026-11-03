import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { Declaration } from '../form/schema'
import { DEFAULT_FONT_SIZE, layout, MIN_FONT_SIZE, type Box, type LayoutItem } from './layout'

export type PdfAssets = {
  /** Исходный (незаполняемый) бланк. */
  template: ArrayBuffer | Uint8Array
  /** TTF с румынской диакритикой: стандартные шрифты PDF не содержат ș и ț. */
  font: ArrayBuffer | Uint8Array
}

export class LayoutOverflowError extends Error {}

const INK = rgb(0, 0, 0)
/** Высота прописных букв Liberation Sans в долях кегля — для центрирования по вертикали. */
const CAP_HEIGHT = 0.69
const PADDING = 1.5

/** Печатает данные поверх бланка и возвращает байты готового PDF. */
export async function fillTemplate(
  data: Declaration,
  assets: PdfAssets,
  options: { debug?: boolean } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(assets.template)
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(assets.font, { subset: true })
  const page = doc.getPage(0)

  for (const item of layout) drawItem(page, font, item, data)
  if (options.debug) drawDebugOverlay(page, font)

  doc.setTitle('Declarație fiscală ITL 002')
  doc.setProducer('ditl (pdf-lib)')
  doc.setCreator('ditl')
  return doc.save()
}

function drawItem(page: PDFPage, font: PDFFont, item: LayoutItem, data: Declaration) {
  const pageHeight = page.getHeight()
  const toPdfY = (top: number) => pageHeight - top
  const baseline = (b: Box, size: number) => toPdfY(b.bottom) + (b.bottom - b.top - size * CAP_HEIGHT) / 2

  switch (item.kind) {
    case 'text': {
      const text = item.value(data)
      if (!text) return
      const width = item.box.x1 - item.box.x0 - 2 * PADDING
      let size = item.size ?? DEFAULT_FONT_SIZE
      while (size > MIN_FONT_SIZE && font.widthOfTextAtSize(text, size) > width) size -= 0.25
      const textWidth = font.widthOfTextAtSize(text, size)
      if (textWidth > width) throw overflow(item)
      const x = item.align === 'center' ? item.box.x0 + (item.box.x1 - item.box.x0 - textWidth) / 2 : item.box.x0 + PADDING
      page.drawText(text, { x, y: baseline(item.box, size), size, font, color: INK })
      return
    }
    case 'cells': {
      const chars = [...item.value(data)]
      if (chars.length > item.count) throw overflow(item)
      const size = DEFAULT_FONT_SIZE + 1
      chars.forEach((ch, i) => {
        const x = item.box.x0 + i * item.pitch + (item.pitch - font.widthOfTextAtSize(ch, size)) / 2
        page.drawText(ch, { x, y: baseline(item.box, size), size, font, color: INK })
      })
      return
    }
    case 'check': {
      if (!item.value(data)) return
      const inset = 1.2
      const [x0, x1] = [item.box.x0 + inset, item.box.x1 - inset]
      const [y0, y1] = [toPdfY(item.box.bottom) + inset, toPdfY(item.box.top) - inset]
      page.drawLine({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: 1, color: INK })
      page.drawLine({ start: { x: x0, y: y1 }, end: { x: x1, y: y0 }, thickness: 1, color: INK })
      return
    }
  }
}

const overflow = (item: LayoutItem) =>
  new LayoutOverflowError(`Câmpul „${item.label}” nu încape în formular — scurtați textul`)

/**
 * Сетка 10 pt (подписи каждые 50 pt) в координатах layout.ts — отсчёт от левого
 * верхнего угла — и рамки всех полей разметки.
 */
function drawDebugOverlay(page: PDFPage, font: PDFFont) {
  const { width, height } = page.getSize()
  const minor = rgb(0.8, 0.8, 1)
  const major = rgb(1, 0.4, 0.4)
  for (let x = 0; x <= width; x += 10) {
    const isMajor = x % 50 === 0
    page.drawLine({ start: { x, y: 0 }, end: { x, y: height }, thickness: isMajor ? 0.4 : 0.15, color: isMajor ? major : minor })
    if (isMajor) page.drawText(String(x), { x: x + 1, y: height - 6, size: 5, font, color: major })
  }
  for (let top = 0; top <= height; top += 10) {
    const isMajor = top % 50 === 0
    const y = height - top
    page.drawLine({ start: { x: 0, y }, end: { x: width, y }, thickness: isMajor ? 0.4 : 0.15, color: isMajor ? major : minor })
    if (isMajor) page.drawText(String(top), { x: 2, y: y - 6, size: 5, font, color: major })
  }

  const outline = rgb(0, 0.6, 0)
  for (const item of layout) {
    const b = item.kind === 'cells' ? { ...item.box, x1: item.box.x0 + item.pitch * item.count } : item.box
    page.drawRectangle({ x: b.x0, y: height - b.bottom, width: b.x1 - b.x0, height: b.bottom - b.top, borderColor: outline, borderWidth: 0.5 })
  }
}
