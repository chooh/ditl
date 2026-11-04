import { createContext, useContext, useState, type ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { ZodType } from 'zod'

/**
 * Разделы сплошной формы. Раздел без ошибок сворачивается, когда фокус переходит
 * за его пределы, и показывает краткую сводку; кликом по заголовку его можно
 * открыть снова. Порядок заполнения не навязывается.
 */
export type SectionDef<V> = {
  id: string
  title: string
  /** Ключи верхнего уровня значений формы, которые относятся к разделу. */
  keys: readonly (keyof V & string)[]
  summary: (values: V) => string
}

export const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ')

type SectionState = {
  title: string
  /** Сколько проблем находит схема в этом разделе прямо сейчас. */
  issues: number
  /** Пользователь уже заходил в раздел — только тогда показываем количество ошибок. */
  visited: boolean
  open: boolean
  summary: string
}

type SectionsApi = {
  get(id: string): SectionState
  setOpen(id: string, open: boolean): void
  markVisited(id: string): void
  /** Раскрыть разделы, к которым относятся ключи верхнего уровня (например, из ошибок формы). */
  openForKeys(keys: string[]): void
  /** Для только что загруженных значений: свернуть готовые разделы, раскрыть остальные. */
  collapseCompleted(values: unknown): void
  done: number
  total: number
}

const SectionsContext = createContext<SectionsApi | null>(null)

export function useSections(): SectionsApi {
  const ctx = useContext(SectionsContext)
  if (!ctx) throw new Error('useSections вне SectionsProvider')
  return ctx
}

const byId = <T,>(ids: readonly string[], value: T): Record<string, T> => Object.fromEntries(ids.map((id) => [id, value]))

type Props<V> = {
  sections: readonly SectionDef<V>[]
  schema: ZodType
  children: ReactNode
}

export function SectionsProvider<V>({ sections, schema, children }: Props<V>) {
  const { control, getValues } = useFormContext()
  // Подписка на все поля: провайдер перерисовывается при каждом изменении,
  // а children — нет (это те же элементы, что пришли сверху).
  useWatch({ control })
  const values = getValues() as V

  const allIds = sections.map((s) => s.id)
  const sectionOfKey = new Map<string, string>(sections.flatMap((s) => s.keys.map((k) => [k, s.id] as const)))
  const [open, setOpenMap] = useState(() => byId(allIds, true))
  const [visited, setVisited] = useState(() => byId(allIds, false))

  const countIssues = (v: unknown) => {
    const issues = byId(allIds, 0)
    const result = schema.safeParse(v)
    for (const issue of result.success ? [] : result.error.issues) {
      const id = sectionOfKey.get(String(issue.path[0]))
      if (id) issues[id]!++
    }
    return issues
  }
  // Полная проверка схемой на каждое изменение — доли миллисекунды для сотни полей.
  const issues = countIssues(values)
  const section = (id: string) => sections.find((s) => s.id === id)!

  const api: SectionsApi = {
    get: (id) => ({
      title: section(id).title,
      issues: issues[id]!,
      visited: visited[id]!,
      open: open[id]!,
      summary: section(id).summary(values),
    }),
    setOpen: (id, value) => setOpenMap((m) => ({ ...m, [id]: value })),
    markVisited: (id) => setVisited((m) => (m[id] ? m : { ...m, [id]: true })),
    openForKeys: (keys) => {
      const ids = keys.map((k) => sectionOfKey.get(k)).filter((id): id is string => !!id)
      setOpenMap((m) => ({ ...m, ...byId(ids, true) }))
      setVisited((m) => ({ ...m, ...byId(ids, true) }))
    },
    collapseCompleted: (loaded) => {
      const loadedIssues = countIssues(loaded)
      setOpenMap(Object.fromEntries(allIds.map((id) => [id, loadedIssues[id]! > 0])))
      setVisited(byId(allIds, false))
    },
    done: allIds.filter((id) => issues[id] === 0).length,
    total: allIds.length,
  }

  return <SectionsContext.Provider value={api}>{children}</SectionsContext.Provider>
}

export function Section({ id, children }: { id: string; children: ReactNode }) {
  const sections = useSections()
  const { title, issues, visited, open, summary } = sections.get(id)
  const bodyId = `section-${id}`

  const status =
    issues === 0
      ? { className: 'done', text: '✓ Gata' }
      : visited
        ? { className: 'error', text: issues === 1 ? '1 câmp de corectat' : `${issues} câmpuri de corectat` }
        : { className: 'todo', text: 'De completat' }

  return (
    <section
      className={open ? 'section' : 'section collapsed'}
      aria-labelledby={`${bodyId}-title`}
      onFocus={() => sections.markVisited(id)}
      onBlur={(e) => {
        // Сворачиваем только при переходе фокуса на элемент ВНЕ раздела: если фокус
        // просто пропал (клик по пустому месту, удалённая кнопка) — ничего не делаем.
        const next = e.relatedTarget
        if (!(next instanceof HTMLElement) || e.currentTarget.contains(next) || issues > 0) return
        sections.setOpen(id, false)
        // Раздел выше схлопнулся — вернуть в поле зрения элемент, куда ушёл фокус.
        requestAnimationFrame(() => next.scrollIntoView({ block: 'nearest' }))
      }}
    >
      <h2 className="section-title">
        <button type="button" id={`${bodyId}-title`} aria-expanded={open} aria-controls={bodyId} onClick={() => sections.setOpen(id, !open)}>
          <span className="section-name">{title}</span>
          <span className={`badge ${status.className}`}>{status.text}</span>
          {!open && summary && <span className="section-summary">{summary}</span>}
        </button>
      </h2>
      {/* hidden, а не условный рендер: поля остаются зарегистрированными в форме. */}
      <div id={bodyId} className="section-body" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
