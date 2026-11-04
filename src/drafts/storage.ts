import { emptyDeclaration, type DeclarationInput } from '../form/schema'

/**
 * Черновики в localStorage. Одна декларация ITL 002 — одно здание, поэтому у фирмы
 * с несколькими зданиями черновиков несколько. Всё хранится под одним ключом и
 * перечитывается перед каждой записью: две вкладки, правящие разные черновики,
 * не затирают друг друга.
 */
const KEY = 'ditl.drafts.v1'

export type Draft = {
  id: string
  /** Время последнего сохранения, мс. */
  updatedAt: number
  values: DeclarationInput
}

type Store = {
  /** Черновик, который открывается при загрузке страницы. */
  activeId?: string
  drafts: Draft[]
}

export const STORAGE_KEY = KEY

function read(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Store> | null
    if (!raw || !Array.isArray(raw.drafts)) return { drafts: [] }
    const drafts = raw.drafts
      .filter((d): d is Draft => !!d && typeof d.id === 'string' && typeof d.updatedAt === 'number')
      .map((d) => ({ ...d, values: withDefaults(emptyDeclaration(), d.values) }))
    return { activeId: typeof raw.activeId === 'string' ? raw.activeId : undefined, drafts }
  } catch {
    // Повреждённые данные или запрещённый доступ к хранилищу — начинаем с чистого листа.
    return { drafts: [] }
  }
}

/** Бросает исключение, если хранилище переполнено или недоступно. */
function write(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store))
}

/** Черновики, свежие сверху. */
export function listDrafts(): Draft[] {
  // Сохранённый последним лежит в конце массива: reverse + стабильная сортировка
  // ставят его первым и при совпадении времени до миллисекунды.
  return read().drafts.reverse().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function loadDraft(id: string): Draft | undefined {
  return read().drafts.find((d) => d.id === id)
}

/** Черновик, открытый в прошлый раз. */
export function loadActiveDraft(): Draft | undefined {
  const { activeId, drafts } = read()
  return drafts.find((d) => d.id === activeId)
}

export function setActiveDraft(id: string | undefined) {
  const store = read()
  if (store.activeId === id) return
  try {
    write({ ...store, activeId: id })
  } catch {
    // Не критично: при следующей загрузке просто откроется пустая форма.
  }
}

/** Сохранить значения формы; без `id` создаётся новый черновик. Черновик становится активным. */
export function saveDraft(id: string | undefined, values: DeclarationInput): Draft {
  const store = read()
  const draft: Draft = { id: id ?? newId(), updatedAt: Date.now(), values }
  write({ activeId: draft.id, drafts: [...store.drafts.filter((d) => d.id !== draft.id), draft] })
  return draft
}

export function deleteDraft(id: string) {
  const store = read()
  write({
    activeId: store.activeId === id ? undefined : store.activeId,
    drafts: store.drafts.filter((d) => d.id !== id),
  })
}

/** Пустая форма: ничего, кроме значений по умолчанию (дата декларации не в счёт). */
export function isBlank(values: DeclarationInput): boolean {
  const comparable = (v: DeclarationInput) => JSON.stringify({ ...v, dataDeclaratiei: '' })
  return comparable(values) === comparable(emptyDeclaration())
}

/** Название черновика: контрибуабил и адрес здания. */
export function draftTitle({ contribuabil: c, cladire: b }: DeclarationInput): string {
  const building = [`${b.adresa.strada} ${b.adresa.nr}`.trim(), b.adresa.localitate].filter(Boolean).join(', ')
  return [c.denumire.trim() || 'Contribuabil necompletat', building].filter(Boolean).join(' · ')
}

/**
 * Привести сохранённые значения к текущей форме: после обновления схемы новые поля
 * получают значения по умолчанию, исчезнувшие и неверного типа — отбрасываются.
 */
export function withDefaults<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults)) {
    return (Array.isArray(stored) ? stored.map((item) => withDefaults(defaults[0], item)) : defaults) as T
  }
  if (defaults !== null && typeof defaults === 'object') {
    if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return defaults
    const source = stored as Record<string, unknown>
    return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, withDefaults(v, source[k])])) as T
  }
  return typeof stored === typeof defaults ? (stored as T) : defaults
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
