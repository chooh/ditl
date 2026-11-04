import type { Deed, Dossier, Property } from '../dossier/schema'

/** Акт, по которому получен объект; схема гарантирует, что он есть. */
export function deedOf(d: Dossier, p: Property): Deed {
  return d.deeds.find((deed) => deed.id === p.deedId)!
}

/** Приложения из нескольких списков — по порядку, без повторов. */
export function attachmentsOf(...lists: string[][]): string[] {
  return [...new Set(lists.flat())]
}
