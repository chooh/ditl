import { Callout, HeaderGlobalAction, HeaderPanel, ListItem, Toggletip, ToggletipButton, ToggletipContent, UnorderedList } from '@carbon/react'
import { Close, Help as HelpIcon, Information } from '@carbon/icons-react'
import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode, type Ref } from 'react'
import { HELP, type Help, type HelpTopic } from './content'

/**
 * Подсказки к открытому экрану. Экран сообщает свою тему (useHelpTopic); по ней
 * панель «Ajutor» в шапке (Carbon HeaderPanel) показывает советы.
 */
type HelpApi = {
  topic: HelpTopic | undefined
  /** Тема экрана — до вызова возвращённой функции. */
  register(topic: HelpTopic): () => void
  /** Тема открытой панели; undefined — панель закрыта. */
  shown: HelpTopic | undefined
  /** Открыть панель: по умолчанию — советы к открытому экрану. */
  open(topic?: HelpTopic): void
  toggle(): void
  close(): void
}

const HelpContext = createContext<HelpApi | null>(null)

export const useHelp = () => useContext(HelpContext)

/** Тема экрана, пока он открыт. */
export function useHelpTopic(topic: HelpTopic | undefined) {
  const help = useHelp()
  useEffect(() => (topic ? help?.register(topic) : undefined), [topic])
}

export function HelpProvider({ children }: { children: ReactNode }) {
  // Действует тема последнего открытого экрана; закрылся он (приветствие поверх
  // формы) — снова тема того, что под ним.
  const [topics, setTopics] = useState<{ topic: HelpTopic }[]>([])
  const topic = topics.at(-1)?.topic
  const [shown, setShown] = useState<HelpTopic>()
  const open = (t?: HelpTopic) => setShown(t ?? topic ?? 'welcome')
  const api: HelpApi = {
    topic,
    register: (topic) => {
      const entry = { topic }
      setTopics((list) => [...list, entry])
      return () => setTopics((list) => list.filter((e) => e !== entry))
    },
    shown,
    open,
    toggle: () => (shown ? setShown(undefined) : open()),
    close: () => setShown(undefined),
  }
  return <HelpContext.Provider value={api}>{children}</HelpContext.Provider>
}

/** Кнопка «Ajutor» и панель советов — внутри Carbon Header. */
export function HelpHeaderAction() {
  const help = useHelp()!
  const heading = useRef<HTMLHeadingElement>(null)
  const expanded = !!help.shown
  // У HeaderGlobalAction и HeaderPanel в типах нет этих свойств, но они передают их элементу.
  // Фокус остаётся в панели: иначе её закроет уход фокуса, а клик тут же откроет снова.
  const keepFocus = { onMouseDown: (e: MouseEvent) => e.preventDefault() }
  const panelId = { id: 'help-panel' }
  // Открытая панель получает фокус — экранный диктор прочитает советы; уход фокуса её закрывает.
  useEffect(() => {
    if (help.shown) heading.current?.focus()
  }, [help.shown])
  return (
    <>
      <HeaderGlobalAction
        aria-label={expanded ? 'Închide ajutorul' : 'Ajutor'}
        aria-expanded={expanded}
        aria-controls="help-panel"
        isActive={expanded}
        tooltipAlignment="end"
        {...keepFocus}
        onClick={help.toggle}
      >
        {expanded ? <Close size={20} /> : <HelpIcon size={20} />}
      </HeaderGlobalAction>
      <HeaderPanel {...panelId} aria-label="Ajutor" expanded={expanded} onHeaderPanelFocus={help.close}>
        {help.shown && <HelpBody help={HELP[help.shown]} heading={heading} />}
      </HeaderPanel>
    </>
  )
}

function HelpBody({ help, heading }: { help: Help; heading: Ref<HTMLHeadingElement> }) {
  return (
    <div className="help-body">
      <h2 className="help-title" ref={heading} tabIndex={-1}>
        {help.title}
      </h2>
      <p>{help.intro ?? help.short}</p>
      {help.where && (
        <>
          <h3 className="help-subtitle">Unde găsiți datele</h3>
          <UnorderedList>
            {help.where.map((w) => (
              <ListItem key={w}>{w}</ListItem>
            ))}
          </UnorderedList>
        </>
      )}
      {help.tips && (
        <>
          <h3 className="help-subtitle">Sfaturi</h3>
          <UnorderedList>
            {help.tips.map((t) => (
              <ListItem key={t}>{t}</ListItem>
            ))}
          </UnorderedList>
        </>
      )}
    </div>
  )
}

/** Короткая подсказка над полями; подробнее — в панели «Ajutor». */
export function InlineTip({ topic }: { topic: HelpTopic }) {
  const ctx = useHelp()
  const help: Help = HELP[topic]
  const more = !!ctx && !!(help.tips || help.where || help.intro)
  return (
    <Callout
      className="inline-tip"
      kind="info"
      lowContrast
      title={help.short}
      actionButtonLabel={more ? 'Mai multe sfaturi' : undefined}
      onActionButtonClick={() => ctx?.open(topic)}
    />
  )
}

/** «i» у подписи поля: короткое пояснение по нажатию. */
export function FieldTip({ label, text }: { label: string; text: string }) {
  return (
    <Toggletip className="field-tip" align="bottom-end" autoAlign>
      <ToggletipButton label={`Ajutor: ${label}`}>
        <Information />
      </ToggletipButton>
      <ToggletipContent>
        <p>{text}</p>
      </ToggletipContent>
    </Toggletip>
  )
}
