import { emptyDossier, type DossierInput } from '../dossier/schema'
import { dossierTitle } from '../dossier/sections'
import { withDefaults } from '../form/withDefaults'

/**
 * Черновики досье в localStorage. Всё хранится под одним ключом и перечитывается
 * перед каждой записью: две вкладки, правящие разные черновики, не затирают друг друга.
 */
const KEY = 'ditl.dossiers.v1'
/** Черновики отдельных деклараций ITL 002 / ITL 004 до перехода на досье — не переносятся. */
const LEGACY_KEY = 'ditl.drafts.v1'

export type Draft = {
  id: string
  /** Время последнего сохранения, мс. */
  updatedAt: number
  /** Значения формы. */
  values: DossierInput
}

type Store = {
  /** Черновик, который открывается при загрузке страницы. */
  activeId?: string
  drafts: Draft[]
}

export const STORAGE_KEY = KEY

function read(): Store {
  try {
    localStorage.removeItem(LEGACY_KEY)
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Store> | null
    if (!raw || !Array.isArray(raw.drafts)) return { drafts: [] }
    const drafts = raw.drafts
      .filter((d): d is Draft => !!d && typeof d.id === 'string' && typeof d.updatedAt === 'number')
      .map((d) => ({ ...d, values: withDefaults(emptyDossier(), d.values) }))
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
export function saveDraft(id: string | undefined, values: DossierInput): Draft {
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
export function isBlank(values: DossierInput): boolean {
  const comparable = (v: DossierInput) => JSON.stringify({ ...v, declarationDate: '' })
  return comparable(values) === comparable(emptyDossier())
}

/** Название черновика: фирма и адреса объектов. */
export function draftTitle({ values }: Pick<Draft, 'values'>): string {
  return dossierTitle(values)
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
