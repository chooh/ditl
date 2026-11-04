import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const fonts = fileURLToPath(new URL('../assets/fonts', import.meta.url))

/**
 * Компилирует самодостаточный .typ в PDF так, как это сделал бы пользователь:
 * файл лежит один в пустом каталоге, системные шрифты не нужны.
 */
export function compileTypst(source: string): { pdf: Buffer; warnings: string[] } {
  const dir = mkdtempSync(join(tmpdir(), 'ditl-'))
  const main = join(dir, 'main.typ')
  writeFileSync(main, source)
  // Тот же движок (typst.ts 0.7 / Typst 0.14), что и в браузере, только нативный.
  const compiler = NodeCompiler.create({ workspace: dir, fontArgs: [{ fontPaths: [fonts] }] })
  const result = compiler.compile({ mainFilePath: main })
  const diagnostics = result.takeDiagnostics()
  const messages = diagnostics ? (compiler.fetchDiagnostics(diagnostics) as { severity: number; message: string }[]) : []
  if (!result.result) throw new Error(messages.map((m) => m.message).join('\n') || 'Typst: compilare eșuată')
  return { pdf: compiler.pdf(result.result), warnings: messages.map((m) => m.message) }
}
