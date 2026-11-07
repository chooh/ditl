import { ProgressBar, ProgressIndicator, ProgressStep, Tag } from '@carbon/react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { ZodType } from 'zod'
import { InlineTip } from '../help/Help'
import type { HelpTopic } from '../help/content'

/**
 * Разделы формы-мастера: на экране один раздел, рядом — шаги со статусами (wizard.tsx),
 * последний шаг — проверка всего досье. Раздел делится на подэтапы — короткие экраны
 * по несколько полей; «Continuă» и «Înapoi» идут по подэтапам, а индикатор шагов — по
 * разделам. Порядок заполнения не навязывается: на любой шаг можно перейти, а уходя
 * с раздела или подэтапа, пользователь видит его ошибки. Готовым раздел считается, только
 * когда в нём нет ошибок и пользователь прошёл его кнопкой «Continuă»: разделы без
 * обязательных полей (скидки, приложения) иначе были бы «готовы» сразу.
 */
export type SectionDef<V> = {
  id: string
  title: string
  /** Короткое имя шага в индикаторе: Carbon советует не больше 16 символов. */
  step: string
  /** Ключи верхнего уровня значений формы, которые относятся к разделу. */
  keys: readonly (keyof V & string)[]
  summary: (values: V) => string
  /** Подэтапы раздела; зависят от значений — например, по подэтапу на каждый акт. */
  subSteps: (values: V) => SubStepDef[]
}

export type SubStepDef = {
  id: string
  title: string
  /** Короткое имя в индикаторе подэтапов; по умолчанию — title. */
  step?: string
  /**
   * Подэтапы одной группы (части одного объекта) показываются в индикаторе вместе;
   * подэтапы без группы видны рядом с любой группой (например, список объектов).
   */
  group?: string
  /** Пути полей подэтапа: ему принадлежат и все вложенные. */
  fields: readonly string[]
  /** Пути, которые принадлежат подэтапу без вложенных (ошибка «нет ни одного акта» — у списка). */
  exact?: readonly string[]
  help: HelpTopic
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
  /** Пользователь прошёл раздел кнопкой «Continuă». */
  confirmed: boolean
  summary: string
}

export type SubStepState = {
  id: string
  title: string
  step: string
  group: string | undefined
  help: HelpTopic
  issues: number
  /** Пользователь уходил с подэтапа (или раздел уже пройден). */
  visited: boolean
  current: boolean
}

/** Куда ведут «Înapoi» и «Continuă». */
type Target = { section: string; sub: string | undefined; label: string }

type SectionsApi = {
  list: SectionState[]
  get(id: string): SectionState
  /** Открытый шаг: id раздела или REVIEW. */
  current: string
  /** Подэтапы раздела со статусами. */
  subSteps(section: string): SubStepState[]
  /** Открытый (или последний открытый) подэтап раздела. */
  subOf(section: string): string | undefined
  /** Соседние подэтапы открытого — возможно, в соседнем разделе (undefined — края). */
  prev: Target | undefined
  next: Target | undefined
  /** Перейти к шагу (и подэтапу). Покинутые раздел и подэтап проверяются: их ошибки видны в полях и в индикаторе. */
  go(id: string, sub?: string): void
  /** Перейти к подэтапу открытого раздела. */
  goSub(sub: string): void
  /** «Continuă»: к следующему подэтапу; покидая раздел, отметить его пройденным. */
  advance(): void
  /** «Înapoi»: к предыдущему подэтапу. */
  retreat(): void
  /** Подтверждённые разделы — сохраняются в черновике вместе со значениями. */
  confirmed: string[]
  /** Растёт при переходе по шагам — по нему заголовок шага или подэтапа получает фокус. */
  navigation: number
  /** Последний переход — внутри раздела: фокус на заголовок подэтапа, а не раздела. */
  withinSection: boolean
  /** Открыть раздел и подэтап с первым из путей (например, ошибочных полей формы). */
  openForPaths(paths: string[]): void
  /** Для только что загруженных значений: открыть первый неготовый раздел или проверку. */
  resume(values: unknown, confirmed: readonly string[]): void
  /** Тема подсказок открытого экрана. */
  helpTopic: HelpTopic
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

const owns = (sub: SubStepDef, path: string) =>
  !!sub.exact?.includes(path) || sub.fields.some((f) => path === f || path.startsWith(`${f}.`))

/** Ключ подэтапа среди всех разделов. */
const subKey = (section: string, sub: string) => `${section}/${sub}`

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
  /** Последний открытый подэтап каждого раздела. */
  const [openSub, setOpenSub] = useState<Record<string, string>>({})
  const [navigation, setNavigation] = useState(0)
  const [withinSection, setWithinSection] = useState(false)
  const [visited, setVisited] = useState(() => byId(allIds, false))
  const [confirmed, setConfirmed] = useState(() => byId(allIds, false))
  const [visitedSubs, setVisitedSubs] = useState<Record<string, boolean>>({})

  const section = (id: string) => sections.find((s) => s.id === id)!
  const subDefs = (id: string, v: V = values) => section(id).subSteps(v)
  /** Подэтап, которому принадлежит путь; чужие пути — первому подэтапу раздела. */
  const subForPath = (id: string, path: string, v: V = values) => {
    const subs = subDefs(id, v)
    return (subs.find((s) => owns(s, path)) ?? subs[0])?.id
  }

  const countIssues = (v: V) => {
    const bySection = byId(allIds, 0)
    const bySub: Record<string, number> = {}
    const result = schema.safeParse(v)
    for (const issue of result.success ? [] : result.error.issues) {
      const id = sectionOfKey.get(String(issue.path[0]))
      if (!id) continue
      bySection[id]!++
      const sub = subForPath(id, issue.path.join('.'), v)
      if (sub) bySub[subKey(id, sub)] = (bySub[subKey(id, sub)] ?? 0) + 1
    }
    return { bySection, bySub }
  }
  // Полная проверка схемой на каждое изменение — доли миллисекунды для сотни полей.
  const issues = countIssues(values)

  const get = (id: string): SectionState => {
    const s = section(id)
    return {
      id,
      title: s.title,
      step: s.step,
      issues: issues.bySection[id]!,
      visited: visited[id]!,
      confirmed: confirmed[id]!,
      summary: s.summary(values),
    }
  }
  const list = allIds.map(get)

  const subOf = (id: string) => {
    if (id === REVIEW) return undefined
    const subs = subDefs(id)
    // Запомненный подэтап мог исчезнуть — например, удалён акт.
    return subs.some((s) => s.id === openSub[id]) ? openSub[id] : subs[0]?.id
  }

  const subSteps = (id: string): SubStepState[] => {
    const open = subOf(id)
    return subDefs(id).map((s) => ({
      id: s.id,
      title: s.title,
      step: s.step ?? s.title,
      group: s.group,
      help: s.help,
      issues: issues.bySub[subKey(id, s.id)] ?? 0,
      visited: !!visitedSubs[subKey(id, s.id)] || confirmed[id]!,
      current: s.id === open,
    }))
  }

  /** Покинутый подэтап проверяется — ошибки видны в его полях. */
  const leaveSub = (id: string, sub: string | undefined) => {
    if (id === REVIEW || !sub) return
    const def = subDefs(id).find((s) => s.id === sub)
    setVisitedSubs((m) => ({ ...m, [subKey(id, sub)]: true }))
    if (def) void trigger([...def.fields, ...(def.exact ?? [])])
  }

  const go = (id: string, sub?: string) => {
    const from = subOf(current)
    const to = sub ?? subOf(id)
    if (id === current && (id === REVIEW || to === from)) return
    leaveSub(current, from)
    if (id !== current && current !== REVIEW) {
      setVisited((m) => ({ ...m, [current]: true }))
      // Показать ошибки покинутого раздела в его полях — к ним вернутся по индикатору.
      void trigger([...section(current).keys])
    }
    if (to && id !== REVIEW) setOpenSub((m) => ({ ...m, [id]: to }))
    setWithinSection(id === current)
    setCurrent(id)
    setNavigation((n) => n + 1)
  }

  const index = steps.indexOf(current)
  const subs = current === REVIEW ? [] : subDefs(current)
  const subIndex = subs.findIndex((s) => s.id === subOf(current))

  const prev = ((): Target | undefined => {
    if (subIndex > 0) return { section: current, sub: subs[subIndex - 1]!.id, label: subs[subIndex - 1]!.title }
    const id = steps[index - 1]
    return id ? { section: id, sub: subDefs(id).at(-1)?.id, label: section(id).step } : undefined
  })()
  const next = ((): Target | undefined => {
    if (subIndex >= 0 && subIndex < subs.length - 1) return { section: current, sub: subs[subIndex + 1]!.id, label: subs[subIndex + 1]!.title }
    const id = steps[index + 1]
    if (!id) return undefined
    return id === REVIEW ? { section: id, sub: undefined, label: 'Verificare' } : { section: id, sub: subDefs(id)[0]?.id, label: section(id).step }
  })()

  const api: SectionsApi = {
    list,
    get,
    current,
    subSteps,
    subOf,
    prev,
    next,
    go,
    goSub: (sub) => go(current, sub),
    advance: () => {
      if (!next) return
      if (next.section !== current && current !== REVIEW) setConfirmed((m) => ({ ...m, [current]: true }))
      go(next.section, next.sub)
    },
    retreat: () => prev && go(prev.section, prev.sub),
    confirmed: allIds.filter((id) => confirmed[id]),
    navigation,
    withinSection,
    openForPaths: (paths) => {
      const ids = new Set(paths.map((p) => sectionOfKey.get(p.split('.')[0]!)))
      const first = allIds.find((id) => ids.has(id))
      setVisited((m) => ({ ...m, ...byId([...ids].filter((id): id is string => !!id), true) }))
      const touched: Record<string, boolean> = {}
      for (const p of paths) {
        const id = sectionOfKey.get(p.split('.')[0]!)
        const sub = id && subForPath(id, p)
        if (sub) touched[subKey(id, sub)] = true
      }
      setVisitedSubs((m) => ({ ...m, ...touched }))
      if (!first) return
      const sub = subDefs(first).find((s) => paths.some((p) => owns(s, p))) ?? subDefs(first)[0]
      if (sub) setOpenSub((m) => ({ ...m, [first]: sub.id }))
      setWithinSection(false)
      setCurrent(first)
    },
    resume: (loaded, ids) => {
      const v = loaded as V
      const loadedIssues = countIssues(v)
      const restored = { ...byId(allIds, false), ...byId(ids.filter((id) => allIds.includes(id)), true) }
      const open = allIds.find((id) => loadedIssues.bySection[id]! > 0 || !restored[id]) ?? REVIEW
      if (open !== REVIEW) {
        // В пройденном разделе — сразу подэтап с ошибками, в остальных — первый.
        const subs = subDefs(open, v)
        const withIssues = restored[open] ? subs.find((s) => (loadedIssues.bySub[subKey(open, s.id)] ?? 0) > 0) : undefined
        const sub = withIssues ?? subs[0]
        if (sub) setOpenSub((m) => ({ ...m, [open]: sub.id }))
      }
      setCurrent(open)
      // Подтверждённый раздел пользователь уже покидал — его ошибки видны сразу.
      setVisited(restored)
      setConfirmed(restored)
    },
    helpTopic: current === REVIEW ? 'review' : (subs[subIndex]?.help ?? 'welcome'),
    done: list.filter((s) => statusOf(s) === 'done').length,
    total: allIds.length,
  }

  return <SectionsContext.Provider value={api}>{children}</SectionsContext.Provider>
}

export type Status = 'done' | 'error' | 'todo'

export const statusOf = ({ issues, visited, confirmed }: SectionState): Status =>
  issues > 0 ? (visited ? 'error' : 'todo') : confirmed ? 'done' : 'todo'

/** Подэтап готов, как только с него ушли без ошибок: подтверждать отдельно не нужно. */
const subStatusOf = ({ issues, visited }: SubStepState): Status => (issues > 0 ? (visited ? 'error' : 'todo') : visited ? 'done' : 'todo')

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
export function StepPanel({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  const { current, navigation, withinSection } = useSections()
  const heading = useRef<HTMLHeadingElement>(null)
  const open = current === id

  // После перехода по шагам — фокус на заголовок: экранный диктор прочитает, куда попали.
  // Внутри раздела фокус получает заголовок подэтапа (SubStep).
  useEffect(() => {
    if (open && navigation > 0 && !withinSection) heading.current?.focus()
  }, [navigation]) // только при переходе, не при открытии шага с ошибкой

  return (
    <section className="step" aria-labelledby={`step-${id}-title`} hidden={!open}>
      <h2 id={`step-${id}-title`} className="step-title" ref={heading} tabIndex={-1}>
        {title}
      </h2>
      {intro}
      {children}
    </section>
  )
}

/** Раздел, внутри которого лежит SubStep. */
const SectionIdContext = createContext('')

export function Section({ id, children }: { id: string; children: ReactNode }) {
  const { title } = useSections().get(id)
  return (
    <SectionIdContext.Provider value={id}>
      <StepPanel id={id} title={title} intro={<SubStepsBar section={id} />}>
        {children}
      </StepPanel>
    </SectionIdContext.Provider>
  )
}

/** Озвучиваемые состояния шага — вместо английских по умолчанию у Carbon. */
const STEP_MESSAGES: Record<string, string> = {
  'carbon.progress-step.complete': 'Gata',
  'carbon.progress-step.incomplete': 'De completat',
  'carbon.progress-step.current': 'Pasul curent',
  'carbon.progress-step.invalid': 'Conține erori',
}
export const translateStep = (id: string) => STEP_MESSAGES[id] ?? id

const SUB_STATUS_TEXT: Record<Status, string> = { done: 'gata', error: 'conține erori', todo: 'de completat' }

/**
 * Подэтапы раздела под его заголовком: на широком экране — горизонтальный Carbon
 * ProgressIndicator (по клику — переход), на узком — ProgressBar. Показываются подэтапы
 * группы открытого (частей одного объекта), иначе у трёх объектов было бы 16 шагов.
 */
function SubStepsBar({ section }: { section: string }) {
  const sections = useSections()
  const all = sections.subSteps(section)
  const open = all.find((s) => s.current)
  const subs = all.filter((s) => s.group === open?.group || (open?.group !== undefined && s.group === undefined))
  if (!open || subs.length < 2) return null
  const index = subs.indexOf(open)
  return (
    <nav className="substeps" aria-label="Subetapele secțiunii">
      <ProgressIndicator className="substeps-steps" spaceEqually currentIndex={-1} onChange={(i) => sections.goSub(subs[i]!.id)}>
        {subs.map((s) => {
          const status = subStatusOf(s)
          // Как в индикаторе шагов (wizard.tsx): aria-* ProgressStep передаёт кнопке.
          const a11y = { 'aria-label': `${s.step}: ${SUB_STATUS_TEXT[status]}`, 'aria-current': s.current ? 'step' : undefined }
          return (
            <ProgressStep
              {...a11y}
              key={s.id}
              label={s.step}
              description={s.title}
              current={s.current}
              complete={status === 'done'}
              invalid={status === 'error'}
              translateWithId={translateStep}
            />
          )
        })}
      </ProgressIndicator>
      <ProgressBar
        className="substeps-progress"
        size="small"
        label={`Subetapa ${index + 1} din ${subs.length}`}
        helperText={open.step}
        value={index + 1}
        max={subs.length}
      />
    </nav>
  )
}

/** Экран подэтапа внутри Section: заголовок (если подэтапов несколько), короткая подсказка, поля. */
export function SubStep({ id, children }: { id: string; children: ReactNode }) {
  const section = useContext(SectionIdContext)
  const sections = useSections()
  const heading = useRef<HTMLHeadingElement>(null)
  const subs = sections.subSteps(section)
  const sub = subs.find((s) => s.id === id)
  const open = sections.current === section && sections.subOf(section) === id

  useEffect(() => {
    if (open && sections.navigation > 0 && sections.withinSection) heading.current?.focus()
  }, [sections.navigation])

  return (
    <div className="substep" hidden={!open}>
      {subs.length > 1 && sub && (
        <h3 className="substep-title" ref={heading} tabIndex={-1}>
          {sub.title}
        </h3>
      )}
      {sub && <InlineTip topic={sub.help} />}
      {children}
    </div>
  )
}
