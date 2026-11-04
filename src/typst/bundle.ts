import common from './common.typ?raw'
import embed from './embed.typ?raw'
import itl002 from './itl002.typ?raw'
import itl004 from './itl004.typ?raw'
import logoDataUrl from './sector2.jpg?inline'
import { toTypst } from './literal'

const TEMPLATES = { itl002, itl004 }
export type TemplateId = keyof typeof TEMPLATES

/**
 * Один самодостаточный .typ: данные декларации, общие функции, шаблон и логотип
 * (base64) в одном файле. Его же компилирует браузер, и его же можно скачать
 * и собрать локально командой `typst compile`.
 */
export function bundleTypst(id: TemplateId, data: unknown, { title, filename, date }: { title: string; filename: string; date: string }): string {
  const template = TEMPLATES[id]
  const usesLogo = template.includes('logo(')
  const parts = [
    header(title, filename, date),
    `#let DATA = ${toTypst(data)}`,
    '// ─────────────── Șablonul formularului ───────────────',
    usesLogo ? code(embed) : '',
    code(common),
    // Определения ниже перекрывают одноимённые из common.typ: данные и логотип — из этого файла.
    '#let load-data(name) = DATA',
    usesLogo ? `#let logo(..args) = image(decode-base64("${logoDataUrl.replace(/^data:[^,]*,/, '')}"), format: "jpg", ..args)` : '',
    code(template.replace(/^#import "common\.typ": \*\n/m, '')),
  ]
  return parts.filter(Boolean).join('\n\n') + '\n'
}

function header(title: string, filename: string, date: string) {
  return [
    `// ${title} — generată cu ditl la ${date}.`,
    '//',
    '// Compilare în PDF (Typst 0.14 sau mai nou, https://typst.app):',
    `//   typst compile ${filename}`,
    '// Fonturi: Liberation Sans/Serif; dacă lipsesc, se folosesc Arial și Times New Roman.',
    '//',
    '// Datele declarației sunt în DATA, imediat mai jos, și pot fi corectate aici.',
  ].join('\n')
}

/** Код шаблона без строк-комментариев (они для разработчиков) и лишних пустых строк. */
function code(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
