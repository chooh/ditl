import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { emptyDeclaration, type DeclarationInput } from '../form/schema'
import { useSections } from '../form/sections'
import {
  deleteDraft,
  draftTitle,
  isBlank,
  listDrafts,
  loadDraft,
  saveDraft,
  setActiveDraft,
  STORAGE_KEY,
  type Draft,
} from './storage'

/** Пауза в наборе, после которой черновик записывается. */
const SAVE_DELAY = 500

type Status = { savedAt?: number; failed?: boolean }

export type DraftsApi = ReturnType<typeof useDrafts>

/**
 * Автосохранение формы в активный черновик. Черновик создаётся при первом вводе,
 * а не при открытии пустой формы; несохранённые изменения дописываются при
 * переключении черновика, уходе со страницы и размонтировании.
 */
export function useDrafts(restored: Draft | undefined, onLoad: () => void) {
  const { getValues, reset, watch, formState } = useFormContext<DeclarationInput>()
  const sections = useSections()
  const [list, setList] = useState(listDrafts)
  const [activeId, setActiveId] = useState(restored?.id)
  const [status, setStatus] = useState<Status>({ savedAt: restored?.updatedAt })
  const active = useRef(restored?.id)
  const lastSaved = useRef(restored && JSON.stringify(restored.values))
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const activate = useCallback((id: string | undefined) => {
    active.current = id
    setActiveId(id)
  }, [])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    const values = getValues()
    const json = JSON.stringify(values)
    if (json === lastSaved.current || (!active.current && isBlank(values))) return
    try {
      const draft = saveDraft(active.current, values)
      lastSaved.current = json
      activate(draft.id)
      setStatus({ savedAt: draft.updatedAt })
    } catch (e) {
      console.error(e)
      setStatus({ failed: true })
    }
    setList(listDrafts())
  }, [getValues, activate])

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

  // Восстановленный черновик показываем так же, как открытый из списка.
  useLayoutEffect(() => {
    if (restored) sections.collapseCompleted(restored.values)
  }, []) // только при монтировании

  /** Показать в форме значения; `draft` — черновик, из которого они взяты. */
  const load = (values: DeclarationInput, draft?: Draft) => {
    reset(values)
    clearTimeout(timer.current)
    activate(draft?.id)
    lastSaved.current = draft && JSON.stringify(values)
    setStatus({ savedAt: draft?.updatedAt })
    if (isBlank(values)) sections.setAll(true, { forget: true })
    else sections.collapseCompleted(values)
    onLoad()
  }

  const open = (id: string) => {
    flush()
    const draft = loadDraft(id)
    if (!draft) return setList(listDrafts())
    setActiveDraft(id)
    load(draft.values, draft)
  }

  /** Новая декларация; непустые `values` (тестовые данные, «та же фирма») сразу становятся черновиком. */
  const startNew = (values = emptyDeclaration()) => {
    flush()
    setActiveDraft(undefined)
    load(values)
    flush()
  }

  /** Следующая декларация той же фирмы: всё, кроме данных о здании и приложений. */
  const startForAnotherBuilding = () => {
    const { contribuabil, imputernicit, adresaStrainatate, actIdentitate } = structuredClone(getValues())
    startNew({ ...emptyDeclaration(), contribuabil, imputernicit, adresaStrainatate, actIdentitate })
  }

  const remove = (id: string) => {
    const draft = list.find((d) => d.id === id)
    if (!draft || !window.confirm(`Ștergeți ciorna „${draftTitle(draft.values)}”? Acțiunea nu poate fi anulată.`)) return
    try {
      deleteDraft(id)
    } catch (e) {
      console.error(e)
    }
    // Удалили открытый черновик — форма очищается, иначе автосохранение создало бы его заново.
    if (id === active.current) load(emptyDeclaration())
    setList(listDrafts())
  }

  return {
    list,
    activeId,
    status,
    /** В форме есть что сохранять — не ждём, пока сработает отложенная запись. */
    hasContent: !!activeId || formState.isDirty,
    open,
    startNew,
    startForAnotherBuilding,
    remove,
  }
}

const dateTime = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'short', timeStyle: 'short' })
const timeOnly = new Intl.DateTimeFormat('ro-RO', { timeStyle: 'short' })

function formatSavedAt(ms: number): string {
  const today = new Date().toDateString() === new Date(ms).toDateString()
  return (today ? timeOnly : dateTime).format(ms)
}

export function DraftsPanel({ drafts }: { drafts: DraftsApi }) {
  const { list, activeId, status, hasContent } = drafts
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
        <button type="button" className="secondary" disabled={!hasContent} onClick={() => drafts.startNew()}>
          Declarație nouă
        </button>
        <button type="button" className="secondary" disabled={!hasContent} onClick={() => drafts.startForAnotherBuilding()}>
          Altă clădire, același contribuabil
        </button>
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
          const title = draftTitle(d.values)
          return (
            <li key={d.id}>
              <span className="draft-title">{title}</span>
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
