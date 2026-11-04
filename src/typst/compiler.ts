import { CompileFormatEnum, createTypstCompiler, type TypstCompiler } from '@myriaddreamin/typst.ts/compiler'
import type { BeforeBuildFn } from '@myriaddreamin/typst.ts/options.init'
import wasmUrl from '@myriaddreamin/typst-ts-web-compiler/wasm?url'
import sansBoldUrl from '../assets/fonts/LiberationSans-Bold.ttf?url'
import sansUrl from '../assets/fonts/LiberationSans-Regular.ttf?url'
import serifBoldUrl from '../assets/fonts/LiberationSerif-Bold.ttf?url'
import serifUrl from '../assets/fonts/LiberationSerif-Regular.ttf?url'

/**
 * Компилятор Typst в браузере (typst.ts, WASM ≈ 28 МБ, по сети ≈ 11 МБ). Этот модуль —
 * отдельный чанк: он и WASM загружаются только когда пользователь попросил PDF.
 * Всё берётся с того же origin; шрифты — только наши, без CDN по умолчанию.
 */

export class TypstError extends Error {}

let compiler: Promise<TypstCompiler> | undefined

export function loadCompiler(): Promise<TypstCompiler> {
  compiler ??= init().catch((e: unknown) => {
    compiler = undefined
    throw e
  })
  return compiler
}

async function init(): Promise<TypstCompiler> {
  const [wasm, ...fonts] = await Promise.all([wasmUrl, sansUrl, sansBoldUrl, serifUrl, serifBoldUrl].map(fetchBytes))
  const c = createTypstCompiler()
  // Объект { module_or_path } — новый формат init у wasm-bindgen; голые байты работают, но с предупреждением в консоли.
  await c.init({ getModule: () => ({ module_or_path: wasm! }) as unknown as BufferSource, beforeBuild: [rawFonts(fonts)] })
  return c
}

/**
 * Загрузчик шрифтов из байтов. Штатный loadFonts из typst.ts создаёт `new Function`
 * даже в браузере, а CSP страницы запрещает eval. Метки `_kind` и
 * `_preloadRemoteFontOptions` — то, по чему typst.ts 0.7 опознаёт загрузчик шрифтов
 * и понимает, что шрифты по умолчанию с CDN грузить не нужно (версия закреплена точно).
 */
function rawFonts(fonts: Uint8Array[]): BeforeBuildFn {
  const load = async (_: unknown, { builder }: { builder: { add_raw_font(font: Uint8Array): Promise<void> } }) => {
    for (const font of fonts) await builder.add_raw_font(font)
  }
  return Object.assign(load, { _kind: 'fontLoader', _preloadRemoteFontOptions: { assets: false } }) as unknown as BeforeBuildFn
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nu s-a putut încărca ${url}: ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

/** Самодостаточный .typ → PDF. */
export async function compilePdf(source: string): Promise<Uint8Array> {
  const c = await loadCompiler()
  c.addSource('/main.typ', source)
  const { result, diagnostics } = await c.compile({ mainFilePath: '/main.typ', format: CompileFormatEnum.pdf, diagnostics: 'full' })
  if (!result) {
    const messages = (diagnostics ?? []).map((d) => (typeof d === 'string' ? d : d.message))
    throw new TypstError(messages.join('\n') || 'Typst: compilare eșuată')
  }
  return result
}
