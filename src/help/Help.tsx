import { Button, InlineNotification, Modal, Toggletip, ToggletipButton, ToggletipContent } from '@carbon/react'
import { Idea, Information, SidePanelClose, SidePanelOpen } from '@carbon/icons-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { HELP, type Help, type HelpTopic } from './content'

/**
 * Подсказки к открытому экрану. Экран сообщает свою тему (useHelpTopic); по ней
 * боковая панель на широком экране и окно «Ajutor» из шапки показывают советы.
 */
type HelpApi = {
  topic: HelpTopic | undefined
  setTopic(topic: HelpTopic): void
  /** Окно «Ajutor»: по умолчанию — советы к открытому экрану. */
  open(topic?: HelpTopic): void
}

const HelpContext = createContext<HelpApi | null>(null)

export const useHelp = () => useContext(HelpContext)

/** Тема экрана, пока он открыт. */
export function useHelpTopic(topic: HelpTopic | undefined) {
  const help = useHelp()
  useEffect(() => {
    if (topic) help?.setTopic(topic)
  }, [topic])
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState<HelpTopic>()
  const [modal, setModal] = useState<HelpTopic>()
  const help = modal && HELP[modal]
  return (
    <HelpContext.Provider value={{ topic, setTopic, open: (t) => setModal(t ?? topic ?? 'welcome') }}>
      {children}
      {help && (
        <Modal
          open
          passiveModal
          size="sm"
          modalLabel="Ajutor"
          modalHeading={help.title}
          closeButtonLabel="Închide"
          onRequestClose={() => setModal(undefined)}
        >
          <HelpBody help={help} />
        </Modal>
      )}
    </HelpContext.Provider>
  )
}

function HelpBody({ help }: { help: Help }) {
  return (
    <div className="help-body">
      <p className="help-lead">{help.intro ?? help.short}</p>
      {help.warning && <InlineNotification kind="warning" lowContrast hideCloseButton title={help.warning} />}
      {help.where && (
        <>
          <p className="help-subtitle">Unde găsiți datele</p>
          <ul className="help-list">
            {help.where.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </>
      )}
      {help.tips && (
        <>
          <p className="help-subtitle">Sfaturi</p>
          <ul className="help-list">
            {help.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** Панель свёрнута или открыта — запоминается в этом браузере. */
const PANEL_KEY = 'ditl.help.panel'

function panelOpen(): boolean {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'closed'
  } catch {
    return true
  }
}

/** Советы к открытому экрану — колонка справа от мастера, только на широком экране (см. styles.scss). */
export function HelpAside() {
  const topic = useHelp()?.topic
  const [open, setOpen] = useState(panelOpen)
  if (!topic) return null
  const help: Help = HELP[topic]
  const toggle = () => {
    setOpen(!open)
    try {
      localStorage.setItem(PANEL_KEY, open ? 'closed' : 'open')
    } catch {
      // Не запомнится — не страшно.
    }
  }
  return (
    <aside className={`help-aside${open ? '' : ' help-aside--collapsed'}`} aria-label="Sfaturi pentru acest ecran">
      <div className="help-aside-header">
        <Idea size={20} aria-hidden />
        {open && <p className="help-aside-title">{help.title}</p>}
        <Button
          kind="ghost"
          size="sm"
          hasIconOnly
          renderIcon={open ? SidePanelClose : SidePanelOpen}
          iconDescription={open ? 'Ascunde sfaturile' : 'Arată sfaturile'}
          tooltipAlignment="end"
          onClick={toggle}
        />
      </div>
      {open && <HelpBody help={help} />}
    </aside>
  )
}

/** Короткая подсказка над полями — там, где боковой панели нет (узкий экран). */
export function InlineTip({ topic }: { topic: HelpTopic }) {
  const ctx = useHelp()
  const help: Help = HELP[topic]
  const more = !!(help.tips || help.where || help.intro || help.warning)
  return (
    <div className="inline-tip">
      <Idea size={16} aria-hidden className="inline-tip-icon" />
      <p className="inline-tip-text">
        {help.short}
        {more && ctx && (
          <>
            {' '}
            <button type="button" className="inline-tip-more" onClick={() => ctx.open(topic)}>
              Mai multe sfaturi
            </button>
          </>
        )}
      </p>
    </div>
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
