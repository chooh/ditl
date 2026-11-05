import { Button, ContainedList, ContainedListItem, ProgressIndicator, ProgressStep, Select, SelectItem } from '@carbon/react'
import { ArrowLeft, ArrowRight, Edit } from '@carbon/icons-react'
import { useId, type ReactNode } from 'react'
import { issuesText, REVIEW, StatusTag, StepPanel, statusOf, useSections, type SectionState } from './sections'

const REVIEW_STEP = 'Verificare'

const STATUS_TEXT = { done: 'gata', todo: 'de completat' }

/** Озвучиваемые состояния шага — вместо английских по умолчанию у Carbon. */
const STEP_MESSAGES: Record<string, string> = {
  'carbon.progress-step.complete': 'Gata',
  'carbon.progress-step.incomplete': 'De completat',
  'carbon.progress-step.current': 'Pasul curent',
  'carbon.progress-step.invalid': 'Conține erori',
}
const translateStep = (id: string) => STEP_MESSAGES[id] ?? id

const statusText = (s: SectionState) => {
  const status = statusOf(s)
  return status === 'error' ? issuesText(s.issues) : STATUS_TEXT[status]
}

/**
 * Шаги мастера: на широком экране — вертикальный Carbon ProgressIndicator,
 * на узком — компактный выбор шага (восемь шагов столбиком заняли бы весь экран).
 */
export function StepIndicator() {
  const sections = useSections()
  const { list, current } = sections
  const steps = [...list.map((s) => s.id), REVIEW]
  const selectId = useId()

  return (
    <nav className="wizard-nav" aria-label="Pașii dosarului">
      {/* currentIndex={-1}: иначе Carbon сам помечает все шаги до текущего готовыми,
          а здесь шаги заполняются в любом порядке — статусы задаются явно. */}
      <div className="wizard-steps">
        <ProgressIndicator vertical currentIndex={-1} onChange={(i) => sections.go(steps[i]!)}>
          {list.map((s) => {
            const status = statusOf(s)
            // У ProgressStep в типах нет aria-*, но он передаёт их кнопке шага.
            const a11y = { 'aria-label': `${s.step}: ${statusText(s)}`, 'aria-current': s.id === current ? 'step' : undefined }
            return (
              <ProgressStep
                {...a11y}
                key={s.id}
                label={s.step}
                description={s.title}
                current={s.id === current}
                complete={status === 'done'}
                invalid={status === 'error'}
                secondaryLabel={status === 'error' ? issuesText(s.issues) : undefined}
                translateWithId={translateStep}
              />
            )
          })}
          <ProgressStep
            {...{ 'aria-label': REVIEW_STEP, 'aria-current': current === REVIEW ? 'step' : undefined }}
            label={REVIEW_STEP}
            description="Verificarea dosarului și generarea documentelor"
            current={current === REVIEW}
            translateWithId={translateStep}
          />
        </ProgressIndicator>
      </div>

      <Select
        id={selectId}
        className="wizard-select"
        labelText={`Pasul ${steps.indexOf(current) + 1} din ${steps.length}`}
        value={current}
        onChange={(e) => sections.go(e.target.value)}
      >
        {list.map((s, i) => (
          <SelectItem key={s.id} value={s.id} text={`${i + 1}. ${s.step} — ${statusText(s)}`} />
        ))}
        <SelectItem value={REVIEW} text={`${steps.length}. ${REVIEW_STEP}`} />
      </Select>
    </nav>
  )
}

const stepName = (id: string, list: SectionState[]) => (id === REVIEW ? REVIEW_STEP : list.find((s) => s.id === id)!.step)

/** «Înapoi» и «Continuă» под разделом; на последнем шаге вместо «Continuă» — `last` (отправка формы). */
export function StepButtons({ last }: { last: ReactNode }) {
  const { prev, next, list, go, advance } = useSections()
  return (
    <div className="wizard-buttons">
      {prev && (
        <Button kind="secondary" size="lg" renderIcon={ArrowLeft} onClick={() => go(prev)}>
          Înapoi
        </Button>
      )}
      {next ? (
        <Button kind="primary" size="lg" renderIcon={ArrowRight} onClick={advance}>
          Continuă: {stepName(next, list)}
        </Button>
      ) : (
        last
      )}
    </div>
  )
}

/** Последний шаг: сводка всех разделов со статусами и переходом к правке. */
export function Review() {
  const { list, go, done, total } = useSections()
  return (
    <StepPanel id={REVIEW} title="Verificarea dosarului">
      <p className="hint">
        Secțiuni gata: {done} din {total}. Verificați datele; documentele se generează din toate secțiunile.
      </p>
      <ContainedList label="Secțiunile dosarului" kind="on-page" className="review">
        {list.map((s) => (
          <ContainedListItem
            key={s.id}
            action={
              <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => go(s.id)} aria-label={`Modifică: ${s.title}`}>
                Modifică
              </Button>
            }
          >
            <span className="review-heading">
              <span className="review-title">{s.title}</span>
              <StatusTag section={s} />
            </span>
            {s.summary && <span className="review-summary">{s.summary}</span>}
          </ContainedListItem>
        ))}
      </ContainedList>
    </StepPanel>
  )
}
