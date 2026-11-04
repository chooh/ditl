import { FORMS, type FormId } from '../forms'
import { withDefaults } from '../form/withDefaults'

/**
 * Черновики в localStorage. Одна декларация — одно здание (ITL 002) или участки
 * (ITL 004), поэтому у фирмы черновиков обычно несколько. Всё хранится под одним
 * ключом и перечитывается перед каждой записью: две вкладки, правящие разные
 * черновики, не затирают друг друга.
 */
const KEY = 'ditl.drafts.v1'

export type Draft = {
  id: string
  /** Тип декларации; у черновиков, сохранённых до ITL 004, его нет — это ITL 002. */
  form: FormId
  /** Время последнего сохранения, мс. */
  updatedAt: number
  /** Значения формы этого типа. */
  values: Record<string, unknown>
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
      .map((d) => {
        const form: FormId = d.form in FORMS ? d.form : 'itl002'
        return { ...d, form, values: withDefaults(FORMS[form].empty(), d.values) }
      })
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
export function saveDraft(id: string | undefined, form: FormId, values: Record<string, unknown>): Draft {
  const store = read()
  const draft: Draft = { id: id ?? newId(), form, updatedAt: Date.now(), values }
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
export function isBlank(form: FormId, values: Record<string, unknown>): boolean {
  const comparable = (v: Record<string, unknown>) => JSON.stringify({ ...v, dataDeclaratiei: '' })
  return comparable(values) === comparable(FORMS[form].empty())
}

/** Название черновика: контрибуабил и объект декларации (здание, участки). */
export function draftTitle({ form, values }: Pick<Draft, 'form' | 'values'>): string {
  return FORMS[form].draftTitle(values)
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
