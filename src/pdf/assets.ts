import fontUrl from '../assets/fonts/LiberationSans-Regular.ttf?url'
import templateUrl from '../assets/templates/itl002.pdf?url'
import type { PdfAssets } from './generate'

let cached: Promise<PdfAssets> | undefined

/** Шаблон и шрифт лежат рядом со сборкой (тот же origin) и загружаются один раз. */
export function loadPdfAssets(): Promise<PdfAssets> {
  cached ??= Promise.all([fetchBytes(templateUrl), fetchBytes(fontUrl)])
    .then(([template, font]) => ({ template, font }))
    .catch((e: unknown) => {
      cached = undefined
      throw e
    })
  return cached
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nu s-a putut încărca ${url}: ${res.status}`)
  return res.arrayBuffer()
}
