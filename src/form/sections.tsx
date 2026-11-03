import { createContext, useContext, useState, type ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { formatDate } from '../pdf/format'
import { declarationSchema, type DeclarationInput } from './schema'

/**
 * Разделы сплошной формы. Раздел без ошибок сворачивается, когда фокус переходит
 * за его пределы, и показывает краткую сводку; кликом по заголовку его можно
 * открыть снова. Порядок заполнения не навязывается.
 */
const SECTIONS = [
  {
    id: 'contribuabil',
    title: 'I. Date de identificare a contribuabilului',
    keys: ['contribuabil'],
    summary: ({ contribuabil: c }) => join(c.denumire, c.cui && `CUI ${c.cui}`, c.sediu.localitate),
  },
  {
    id: 'imputernicit',
    title: 'II. Date de identificare a împuternicitului',
    keys: ['imputernicit'],
    summary: ({ imputernicit: i }) => (i.exista ? join(`${i.nume} ${i.prenume}`.trim(), i.cif) : 'Fără împuternicit'),
  },
  {
    id: 'strainatate',
    title: 'III. Adresa de rezidență în alt stat decât România',
    keys: ['adresaStrainatate'],
    summary: (v) => v.adresaStrainatate || 'Nu este cazul',
  },
  {
    id: 'cladire',
    title: 'IV. Datele clădirii',
    keys: ['cladire'],
    summary: ({ cladire: c }) => join(BUILDING_TYPE_LABELS[c.tip], `${c.adresa.strada} ${c.adresa.nr}`.trim(), c.adresa.localitate),
  },
  {
    id: 'anexe',
    title: 'Documente anexate',
    keys: ['anexe'],
    summary: (v) => {
      const n = v.anexe.filter((a) => a.denumire.trim()).length
      return n === 0 ? 'Niciun document' : n === 1 ? '1 document' : `${n} documente`
    },
  },
  {
    id: 'declaratie',
    title: 'Declarație',
    keys: ['actIdentitate', 'dataDeclaratiei'],
    summary: ({ actIdentitate: a, dataDeclaratiei }) => join(`${a.tip} ${a.serie} ${a.numar}`.trim(), formatDate(dataDeclaratiei)),
  },
  {
    id: 'antet',
    title: 'Date administrative (opțional)',
    keys: ['antet'],
    summary: (v) => (v.antet.rolNominal ? `Rol nominal ${v.antet.rolNominal}` : 'Necompletat'),
  },
] as const satisfies readonly {
  id: string
  title: string
  keys: readonly (keyof DeclarationInput)[]
  summary: (v: DeclarationInput) => string
}[]

export type SectionId = (typeof SECTIONS)[number]['id']

const BUILDING_TYPE_LABELS: Record<string, string> = {
  nerezidentiala: 'Nerezidențială',
  rezidentiala: 'Rezidențială',
  mixta: 'Mixtă',
}

const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ')

const sectionOfKey = new Map<string, SectionId>(SECTIONS.flatMap((s) => s.keys.map((k) => [k, s.id] as const)))

type SectionState = {
  /** Сколько проблем находит схема в этом разделе прямо сейчас. */
  issues: number
  /** Пользователь уже заходил в раздел — только тогда показываем количество ошибок. */
  visited: boolean
  open: boolean
  summary: string
}

type SectionsApi = {
  get(id: SectionId): SectionState
  setOpen(id: SectionId, open: boolean): void
  markVisited(id: SectionId): void
  /** Раскрыть разделы, к которым относятся ключи верхнего уровня (например, из ошибок формы). */
  openForKeys(keys: string[]): void
  /** Свернуть или раскрыть всё; `forget` сбрасывает отметки о посещении. */
  setAll(open: boolean, options?: { forget?: boolean }): void
  done: number
  total: number
}

const SectionsContext = createContext<SectionsApi | null>(null)

export function useSections(): SectionsApi {
  const ctx = useContext(SectionsContext)
  if (!ctx) throw new Error('useSections вне SectionsProvider')
  return ctx
}

const allIds = SECTIONS.map((s) => s.id)
const byId = <T,>(ids: readonly SectionId[], value: T) => Object.fromEntries(ids.map((id) => [id, value])) as Record<SectionId, T>

export function SectionsProvider({ children }: { children: ReactNode }) {
  const { control, getValues } = useFormContext<DeclarationInput>()
  // Подписка на все поля: провайдер перерисовывается при каждом изменении,
  // а children — нет (это те же элементы, что пришли сверху).
  useWatch({ control })
  const values = getValues()

  const [open, setOpenMap] = useState(() => byId(allIds, true))
  const [visited, setVisited] = useState(() => byId(allIds, false))

  // Полная проверка схемой на каждое изменение — доли миллисекунды для ~60 полей.
  const issues = byId(allIds, 0)
  const result = declarationSchema.safeParse(values)
  for (const issue of result.success ? [] : result.error.issues) {
    const id = sectionOfKey.get(String(issue.path[0]))
    if (id) issues[id]++
  }

  const api: SectionsApi = {
    get: (id) => ({
      issues: issues[id],
      visited: visited[id],
      open: open[id],
      summary: SECTIONS.find((s) => s.id === id)!.summary(values),
    }),
    setOpen: (id, value) => setOpenMap((m) => ({ ...m, [id]: value })),
    markVisited: (id) => setVisited((m) => (m[id] ? m : { ...m, [id]: true })),
    openForKeys: (keys) => {
      const ids = keys.map((k) => sectionOfKey.get(k)).filter((id): id is SectionId => !!id)
      setOpenMap((m) => ({ ...m, ...byId(ids, true) }))
      setVisited((m) => ({ ...m, ...byId(ids, true) }))
    },
    setAll: (value, options) => {
      setOpenMap(byId(allIds, value))
      if (options?.forget) setVisited(byId(allIds, false))
    },
    done: allIds.filter((id) => issues[id] === 0).length,
    total: allIds.length,
  }

  return <SectionsContext.Provider value={api}>{children}</SectionsContext.Provider>
}

export function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const sections = useSections()
  const { issues, visited, open, summary } = sections.get(id)
  const title = SECTIONS.find((s) => s.id === id)!.title
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
