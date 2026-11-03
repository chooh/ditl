import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { sampleDeclaration } from '../form/sample'
import { declarationSchema } from '../form/schema'
import { validInput } from '../test/fixtures'
import { fillTemplate, LayoutOverflowError } from './generate'

const assets = {
  template: await readFile(new URL('../assets/templates/itl002.pdf', import.meta.url)),
  font: await readFile(new URL('../assets/fonts/LiberationSans-Regular.ttf', import.meta.url)),
}

describe('fillTemplate', () => {
  it('создаёт PDF на основе бланка ITL 002', async () => {
    const bytes = await fillTemplate(declarationSchema.parse(validInput), assets)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe('Declarație fiscală ITL 002')
  })

  it('тестовые данные проходят валидацию и помещаются на бланк', async () => {
    const data = declarationSchema.parse(sampleDeclaration())
    await expect(fillTemplate(data, assets)).resolves.toBeInstanceOf(Uint8Array)
  })

  it('шрифт содержит румынские буквы', () => {
    const font = fontkit.create(assets.font)
    const missing = [...'ĂÂÎȘȚăâîșț„”'].filter((ch) => !font.hasGlyphForCodePoint(ch.codePointAt(0)!))
    expect(missing).toEqual([])
  })

  it('сообщает, если текст не помещается в ячейку', async () => {
    const sediu = { ...validInput.contribuabil.sediu, bloc: 'WWWWWWWWWW' }
    const data = declarationSchema.parse({ ...validInput, contribuabil: { ...validInput.contribuabil, sediu } })
    await expect(fillTemplate(data, assets)).rejects.toThrow(LayoutOverflowError)
  })
})
