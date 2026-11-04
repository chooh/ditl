import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { FORM_IDS, FORMS, forSameTaxpayer, type FormId } from '../forms'
import { useSections } from '../form/sections'
import { deleteDraft, draftTitle, isBlank, listDrafts, loadDraft, saveDraft, setActiveDraft, STORAGE_KEY, type Draft } from './storage'

/** Пауза в наборе, после которой черновик записывается. */
const SAVE_DELAY = 500

type Status = { savedAt?: number; failed?: boolean }

/**
 * Что открыть в форме. Любая смена — другой черновик, новая декларация, другой тип —
 * пересоздаёт форму с этими значениями (см. App).
 */
export type Session = {
  form: FormId
  /** Открытый черновик. */
  draft?: Draft
  /** Значения новой декларации без черновика (например, данные той же фирмы); сразу сохраняются. */
  initial?: Record<string, unknown>
}

export type DraftsApi = ReturnType<typeof useDrafts>

/**
 * Автосохранение формы в активный черновик. Черновик создаётся при первом вводе,
 * а не при открытии пустой формы; несохранённые изменения дописываются при
 * переключении черновика, уходе со страницы и размонтировании.
 */
export function useDrafts(session: Session, onSwitch: (next: Session) => void) {
  const { form } = session
  const { getValues, watch, formState } = useFormContext<Record<string, unknown>>()
  const sections = useSections()
  const [list, setList] = useState(listDrafts)
  const [activeId, setActiveId] = useState(session.draft?.id)
  const [status, setStatus] = useState<Status>({ savedAt: session.draft?.updatedAt })
  const active = useRef(session.draft?.id)
  const lastSaved = useRef(session.draft && JSON.stringify(session.draft.values))
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** Открытый черновик удалён: форма вот-вот пересоздастся, сохранять больше нечего. */
  const detached = useRef(false)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    const values = getValues()
    const json = JSON.stringify(values)
    if (detached.current || json === lastSaved.current || (!active.current && isBlank(form, values))) return
    try {
      const draft = saveDraft(active.current, form, values)
      lastSaved.current = json
      active.current = draft.id
      setActiveId(draft.id)
      setStatus({ savedAt: draft.updatedAt })
    } catch (e) {
      console.error(e)
      setStatus({ failed: true })
    }
    setList(listDrafts())
  }, [getValues, form])

  useEffect(() => {
    const subscription = watch(() => {
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DELAY)
    })
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    // Другая вкладка изменила черновики — обновить список.
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setList(listDrafts())
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('storage', onStorage)
    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('storage', onStorage)
      flush()
    }
  }, [watch, flush])

  // Открытый черновик или перенесённые данные: готовые разделы свёрнуты, новые данные сразу сохранены.
  useLayoutEffect(() => {
    const loaded = session.draft?.values ?? session.initial
    if (loaded && !isBlank(form, loaded)) sections.collapseCompleted(loaded)
    if (session.initial) flush()
  }, []) // только при монтировании

  const open = (id: string) => {
    flush()
    const draft = loadDraft(id)
    if (!draft) return setList(listDrafts())
    setActiveDraft(id)
    onSwitch({ form: draft.form, draft })
  }

  /** Новая декларация типа `to`; `initial` — значения, с которых она начинается. */
  const startNew = (to: FormId, initial?: Record<string, unknown>) => {
    flush()
    setActiveDraft(undefined)
    onSwitch({ form: to, initial })
  }

  /** Следующая декларация той же фирмы: реквизиты и подписант переносятся, объект декларации — нет. */
  const startForSameTaxpayer = (to: FormId) => startNew(to, forSameTaxpayer(form, structuredClone(getValues()), to) as Record<string, unknown>)

  const remove = (id: string) => {
    const draft = list.find((d) => d.id === id)
    if (!draft || !window.confirm(`Ștergeți ciorna „${draftTitle(draft)}”? Acțiunea nu poate fi anulată.`)) return
    try {
      deleteDraft(id)
    } catch (e) {
      console.error(e)
    }
    // Удалили открытый черновик — пустая форма того же типа; без detached
    // размонтирование сохранило бы удалённое заново.
    if (id === active.current) {
      detached.current = true
      onSwitch({ form })
    } else setList(listDrafts())
  }

  return {
    form,
    list,
    activeId,
    status,
    /** В форме есть что сохранять — не ждём, пока сработает отложенная запись. */
    hasContent: !!activeId || formState.isDirty,
    open,
    startNew,
    startForSameTaxpayer,
    remove,
  }
}

const dateTime = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'short', timeStyle: 'short' })
const timeOnly = new Intl.DateTimeFormat('ro-RO', { timeStyle: 'short' })

function formatSavedAt(ms: number): string {
  const today = new Date().toDateString() === new Date(ms).toDateString()
  return (today ? timeOnly : dateTime).format(ms)
}

/** Чем отличается тип декларации — в подписи кнопки. */
const OBJECT = { itl002: 'clădire', itl004: 'teren' } satisfies Record<FormId, string>

export function DraftsPanel({ drafts }: { drafts: DraftsApi }) {
  const { form, list, activeId, status, hasContent } = drafts
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  // Кнопки видны всегда (неактивные — пока нечего сохранять), чтобы форма не прыгала при первом сохранении.
  return (
    <div className="drafts">
      {status.failed ? (
        <p className="error" role="alert">
          Ciorna nu a putut fi salvată: spațiul de stocare al browserului este plin sau blocat.
        </p>
      ) : (
        <p className="hint">
          {status.savedAt
            ? `Ciornă salvată automat în acest browser la ${formatSavedAt(status.savedAt)}.`
            : 'Ciorna se salvează automat în acest browser, de îndată ce începeți completarea.'}{' '}
          Pe un calculator public, ștergeți-o la final.
        </p>
      )}

      <div className="actions">
        <span className="actions-label">Declarație nouă:</span>
        {FORM_IDS.map((id) => (
          // Новая пустая декларация того же типа имеет смысл, только если текущая не пуста.
          <NewButton key={id} prefix="Declarație nouă" label={`${FORMS[id].code} — ${OBJECT[id]}`} disabled={id === form && !hasContent} onClick={() => drafts.startNew(id)} />
        ))}
      </div>
      <div className="actions">
        <span className="actions-label">Același contribuabil:</span>
        {FORM_IDS.map((id) => (
          <NewButton
            key={id}
            prefix="Același contribuabil"
            label={`${FORMS[id].code} — ${id === form && id === 'itl002' ? 'altă clădire' : OBJECT[id]}`}
            disabled={!hasContent}
            onClick={() => drafts.startForSameTaxpayer(id)}
          />
        ))}
        <button
          type="button"
          className="link"
          disabled={list.length === 0}
          aria-expanded={expanded && list.length > 0}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          Ciornele mele ({list.length})
        </button>
      </div>

      <ul id={listId} className="drafts-list" hidden={!expanded || list.length === 0}>
        {list.map((d) => {
          const title = draftTitle(d)
          return (
            <li key={d.id}>
              <span className="draft-title">
                <span className="draft-form">{FORMS[d.form].code}</span> {title}
              </span>
              <span className="draft-time">{formatSavedAt(d.updatedAt)}</span>
              {d.id === activeId ? (
                <span className="draft-current">deschisă</span>
              ) : (
                <button type="button" className="link" onClick={() => drafts.open(d.id)} aria-label={`Deschide ciorna ${title}`}>
                  Deschide
                </button>
              )}
              <button type="button" className="link" onClick={() => drafts.remove(d.id)} aria-label={`Șterge ciorna ${title}`}>
                Șterge
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Подписи в двух рядах повторяются — в доступное имя входит и заголовок ряда. */
function NewButton({ prefix, label, disabled, onClick }: { prefix: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="secondary" aria-label={`${prefix}: ${label}`} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}
