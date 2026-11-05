import { Button, ContainedList, ContainedListItem, InlineNotification } from '@carbon/react'
import { Add, ChevronDown, ChevronUp, Copy, TrashCan } from '@carbon/icons-react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { forSameCompany, type DossierInput } from '../dossier/schema'
import { useSections } from '../form/sections'
import { deleteDraft, draftTitle, isBlank, listDrafts, loadDraft, saveDraft, setActiveDraft, STORAGE_KEY, type Draft } from './storage'

/** Пауза в наборе, после которой черновик записывается. */
const SAVE_DELAY = 500

type Status = { savedAt?: number; failed?: boolean }

/**
 * Что открыть в форме. Любая смена — другой черновик или новое досье — пересоздаёт
 * форму с этими значениями (см. App).
 */
export type Session = {
  /** Открытый черновик. */
  draft?: Draft
  /** Значения нового досье без черновика (например, данные той же фирмы); сразу сохраняются. */
  initial?: DossierInput
}

export type DraftsApi = ReturnType<typeof useDrafts>

/**
 * Автосохранение формы в активный черновик. Черновик создаётся при первом вводе,
 * а не при открытии пустой формы; несохранённые изменения дописываются при
 * переключении черновика, уходе со страницы и размонтировании.
 */
export function useDrafts(session: Session, onSwitch: (next: Session) => void) {
  const { getValues, watch, formState } = useFormContext<DossierInput>()
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
    if (detached.current || json === lastSaved.current || (!active.current && isBlank(values))) return
    try {
      const draft = saveDraft(active.current, values)
      lastSaved.current = json
      active.current = draft.id
      setActiveId(draft.id)
      setStatus({ savedAt: draft.updatedAt })
    } catch (e) {
      console.error(e)
      setStatus({ failed: true })
    }
    setList(listDrafts())
  }, [getValues])

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

  // Открытый черновик или перенесённые данные: открыт первый незаконченный раздел
  // (или проверка, если готово всё), новые данные сразу сохранены.
  useLayoutEffect(() => {
    const loaded = session.draft?.values ?? session.initial
    if (loaded && !isBlank(loaded)) sections.resume(loaded)
    if (session.initial) flush()
  }, []) // только при монтировании

  const open = (id: string) => {
    flush()
    const draft = loadDraft(id)
    if (!draft) return setList(listDrafts())
    setActiveDraft(id)
    onSwitch({ draft })
  }

  /** Новое досье; `initial` — значения, с которых оно начинается. */
  const startNew = (initial?: DossierInput) => {
    flush()
    setActiveDraft(undefined)
    onSwitch({ initial })
  }

  /** Новое досье той же фирмы: реквизиты и подписант переносятся, акты и объекты — нет. */
  const startForSameCompany = () => startNew(forSameCompany(getValues()))

  const remove = (id: string) => {
    const draft = list.find((d) => d.id === id)
    if (!draft || !window.confirm(`Ștergeți ciorna „${draftTitle(draft)}”? Acțiunea nu poate fi anulată.`)) return
    try {
      deleteDraft(id)
    } catch (e) {
      console.error(e)
    }
    // Удалили открытый черновик — пустая форма; без detached
    // размонтирование сохранило бы удалённое заново.
    if (id === active.current) {
      detached.current = true
      onSwitch({})
    } else setList(listDrafts())
  }

  return {
    list,
    activeId,
    status,
    /** В форме есть что сохранять — не ждём, пока сработает отложенная запись. */
    hasContent: !!activeId || formState.isDirty,
    open,
    startNew,
    startForSameCompany,
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
  const open = expanded && list.length > 0
  return (
    <div className="drafts">
      {status.failed ? (
        <InlineNotification
          kind="error"
          role="alert"
          lowContrast
          hideCloseButton
          title="Ciorna nu a putut fi salvată:"
          subtitle="spațiul de stocare al browserului este plin sau blocat."
        />
      ) : (
        <p className="hint">
          {status.savedAt
            ? `Ciornă salvată automat în acest browser la ${formatSavedAt(status.savedAt)}.`
            : 'Ciorna se salvează automat în acest browser, de îndată ce începeți completarea.'}{' '}
          Pe un calculator public, ștergeți-o la final.
        </p>
      )}

      <div className="actions">
        <Button kind="tertiary" size="md" renderIcon={Add} disabled={!hasContent} onClick={() => drafts.startNew()}>
          Dosar nou
        </Button>
        <Button kind="tertiary" size="md" renderIcon={Copy} disabled={!hasContent} onClick={() => drafts.startForSameCompany()}>
          Dosar nou pentru aceeași firmă
        </Button>
        <Button
          kind="ghost"
          size="md"
          renderIcon={open ? ChevronUp : ChevronDown}
          disabled={list.length === 0}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setExpanded(!expanded)}
        >
          Ciornele mele ({list.length})
        </Button>
      </div>

      <div id={listId} hidden={!open}>
        <ContainedList label="Ciornele mele" kind="on-page" size="md">
          {list.map((d) => {
            const title = draftTitle(d)
            return (
              <ContainedListItem
                key={d.id}
                action={
                  <div className="actions">
                    {d.id === activeId ? (
                      <span className="draft-time">deschisă</span>
                    ) : (
                      <Button kind="ghost" size="sm" onClick={() => drafts.open(d.id)} aria-label={`Deschide ciorna ${title}`}>
                        Deschide
                      </Button>
                    )}
                    <Button
                      kind="danger--ghost"
                      size="sm"
                      renderIcon={TrashCan}
                      onClick={() => drafts.remove(d.id)}
                      aria-label={`Șterge ciorna ${title}`}
                    >
                      Șterge
                    </Button>
                  </div>
                }
              >
                {title}
                <span className="draft-time">{formatSavedAt(d.updatedAt)}</span>
              </ContainedListItem>
            )
          })}
        </ContainedList>
      </div>
    </div>
  )
}
