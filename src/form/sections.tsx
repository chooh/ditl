import { Tag } from '@carbon/react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { ZodType } from 'zod'

/**
 * Разделы формы-мастера: на экране один раздел, рядом — шаги со статусами (wizard.tsx),
 * последний шаг — проверка всего досье. Порядок заполнения не навязывается: на любой
 * шаг можно перейти, а уходя с раздела, пользователь видит его ошибки.
 */
export type SectionDef<V> = {
  id: string
  title: string
  /** Короткое имя шага в индикаторе: Carbon советует не больше 16 символов. */
  step: string
  /** Ключи верхнего уровня значений формы, которые относятся к разделу. */
  keys: readonly (keyof V & string)[]
  summary: (values: V) => string
}

export const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ')

/** Последний шаг мастера — проверка и генерация документов. */
export const REVIEW = 'review'

export type SectionState = {
  id: string
  title: string
  step: string
  /** Сколько проблем находит схема в этом разделе прямо сейчас. */
  issues: number
  /** Пользователь уже уходил с раздела — только тогда показываем количество ошибок. */
  visited: boolean
  summary: string
}

type SectionsApi = {
  list: SectionState[]
  get(id: string): SectionState
  /** Открытый шаг: id раздела или REVIEW. */
  current: string
  /** Соседние шаги открытого (undefined — края). */
  prev: string | undefined
  next: string | undefined
  /** Перейти к шагу. Покинутый раздел проверяется: его ошибки видны в полях и в индикаторе. */
  go(id: string): void
  /** Растёт при переходе по шагам — по нему заголовок шага получает фокус. */
  navigation: number
  /** Открыть первый раздел, к которому относятся ключи верхнего уровня (например, из ошибок формы). */
  openForKeys(keys: string[]): void
  /** Для только что загруженных значений: открыть первый незаконченный раздел или проверку. */
  resume(values: unknown): void
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
  const { control, getValues, trigger } = useFormContext()
  // Подписка на все поля: провайдер перерисовывается при каждом изменении,
  // а children — нет (это те же элементы, что пришли сверху).
  useWatch({ control })
  const values = getValues() as V

  const allIds = sections.map((s) => s.id)
  const steps = [...allIds, REVIEW]
  const sectionOfKey = new Map<string, string>(sections.flatMap((s) => s.keys.map((k) => [k, s.id] as const)))
  const [current, setCurrent] = useState(allIds[0]!)
  const [navigation, setNavigation] = useState(0)
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
  const get = (id: string): SectionState => {
    const s = section(id)
    return { id, title: s.title, step: s.step, issues: issues[id]!, visited: visited[id]!, summary: s.summary(values) }
  }
  const index = steps.indexOf(current)

  const api: SectionsApi = {
    list: allIds.map(get),
    get,
    current,
    prev: steps[index - 1],
    next: steps[index + 1],
    go: (id) => {
      if (id === current) return
      if (current !== REVIEW) {
        setVisited((m) => ({ ...m, [current]: true }))
        // Показать ошибки покинутого раздела в его полях — к ним вернутся по индикатору.
        void trigger([...section(current).keys])
      }
      setCurrent(id)
      setNavigation((n) => n + 1)
    },
    navigation,
    openForKeys: (keys) => {
      const ids = new Set(keys.map((k) => sectionOfKey.get(k)))
      const first = allIds.find((id) => ids.has(id))
      setVisited((m) => ({ ...m, ...byId([...ids].filter((id): id is string => !!id), true) }))
      if (first) setCurrent(first)
    },
    resume: (loaded) => {
      const loadedIssues = countIssues(loaded)
      setCurrent(allIds.find((id) => loadedIssues[id]! > 0) ?? REVIEW)
      setVisited(byId(allIds, false))
    },
    done: allIds.filter((id) => issues[id] === 0).length,
    total: allIds.length,
  }

  return <SectionsContext.Provider value={api}>{children}</SectionsContext.Provider>
}

export type Status = 'done' | 'error' | 'todo'

export const statusOf = ({ issues, visited }: SectionState): Status => (issues === 0 ? 'done' : visited ? 'error' : 'todo')

export const issuesText = (issues: number) => (issues === 1 ? '1 câmp de corectat' : `${issues} câmpuri de corectat`)

export function StatusTag({ section }: { section: SectionState }) {
  switch (statusOf(section)) {
    case 'done':
      return (
        <Tag type="green" size="sm">
          Gata
        </Tag>
      )
    case 'error':
      return (
        <Tag type="red" size="sm">
          {issuesText(section.issues)}
        </Tag>
      )
    case 'todo':
      return (
        <Tag type="gray" size="sm">
          De completat
        </Tag>
      )
  }
}

/**
 * Экран шага. Неоткрытые шаги скрыты атрибутом hidden, а не убраны из дерева:
 * поля остаются зарегистрированными, а при ошибке поле можно сразу сфокусировать.
 */
export function StepPanel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const { current, navigation } = useSections()
  const heading = useRef<HTMLHeadingElement>(null)
  const open = current === id

  // После перехода по шагам — фокус на заголовок: экранный диктор прочитает, куда попали.
  useEffect(() => {
    if (open && navigation > 0) heading.current?.focus()
  }, [navigation]) // только при переходе, не при открытии шага с ошибкой

  return (
    <section className="step" aria-labelledby={`step-${id}-title`} hidden={!open}>
      <h2 id={`step-${id}-title`} className="step-title" ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Section({ id, children }: { id: string; children: ReactNode }) {
  const { title } = useSections().get(id)
  return (
    <StepPanel id={id} title={title}>
      {children}
    </StepPanel>
  )
}
