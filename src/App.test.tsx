// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { App } from './App'

beforeAll(() => {
  // В jsdom нет scrollIntoView, scrollTo и ResizeObserver — их вызывают разделы,
  // экран результата и CodeSnippet из Carbon.
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

type User = ReturnType<typeof userEvent.setup>

/** Кнопка шага в индикаторе; её имя — «Acte: de completat», «Imobile: 1 câmp de corectat»… */
const step = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}(:|$)`) })
const stepStatus = (name: string) => step(name).getAttribute('aria-label')
const goTo = (user: User, name: string) => user.click(step(name))
/** Заголовок открытого шага: заголовки скрытых шагов недоступны. */
const currentStep = () => screen.getByRole('heading', { level: 2 }).textContent
const input = (label: string, i = 0) => screen.getAllByLabelText(label)[i] as HTMLInputElement
const fillSample = (user: User) => user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))

/** Скачивания .typ: содержимое blob'ов по порядку. */
function captureDownloads() {
  const blobs: Blob[] = []
  URL.createObjectURL = (b: Blob) => (blobs.push(b), 'blob:test')
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return blobs
}

describe('мастер', () => {
  it('сначала открыт первый раздел; шаги показывают статус', () => {
    render(<App />)
    expect(currentStep()).toBe('Contribuabilul (persoana juridică)')
    expect(step('Contribuabil').getAttribute('aria-current')).toBe('step')
    expect(stepStatus('Imobile')).toBe('Imobile: de completat')
    // Без ошибок, но не подтверждён — ещё не готов.
    expect(stepStatus('Scutiri')).toBe('Scutiri: de completat')
    expect(stepStatus('Semnături')).toBe('Semnături: de completat')
  })

  it('раздел без ошибок готов только после «Continuă», переход по индикатору не в счёт', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Scutiri')
    await goTo(user, 'Anexe')
    expect(stepStatus('Scutiri')).toBe('Scutiri: de completat')

    await user.click(screen.getByRole('button', { name: 'Continuă: Semnături' }))
    expect(stepStatus('Anexe')).toBe('Anexe: gata')
    expect(stepStatus('Scutiri')).toBe('Scutiri: de completat')
  })

  it('«Continuă» открывает следующий шаг и показывает ошибки покинутого', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    await user.click(screen.getByRole('button', { name: 'Continuă: Semnatar' }))

    expect(currentStep()).toBe('Semnatarul declarațiilor')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
    expect(stepStatus('Contribuabil')).toMatch(/^Contribuabil: \d+ câmpuri de corectat$/)
    await waitFor(() => expect(input('Cod de identificare fiscală (CUI)').getAttribute('aria-invalid')).toBe('true'))
  })

  it('на любой шаг можно перейти по индикатору, «Înapoi» ведёт к предыдущему', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Imobile')
    expect(currentStep()).toBe('Imobilele: clădire și teren')

    await user.click(screen.getByRole('button', { name: 'Înapoi' }))
    expect(currentStep()).toBe('Actele de dobândire')
  })

  it('тестовые данные: все разделы готовы, открыта проверка со сводкой', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)

    expect(currentStep()).toBe('Verificarea dosarului')
    expect(screen.getByText(/Secțiuni gata: 7 din 7/)).toBeTruthy()
    expect(stepStatus('Contribuabil')).toBe('Contribuabil: gata')
    expect(screen.getByText('Exemplu Construcții Țărănești S.R.L. · CUI RO18547290 · București')).toBeTruthy()
    expect(screen.getByText('2 acte · nr. 1234/2023 din 15.03.2023 · nr. 567/2024 din 02.09.2024')).toBeTruthy()
  })

  it('отправка с ошибками открывает раздел и ставит фокус на первое ошибочное поле', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    // Сломать одно поле в разделе объектов и вернуться к проверке.
    await user.click(screen.getByRole('button', { name: 'Modifică: Imobilele: clădire și teren' }))
    await user.clear(input('Comuna / orașul / municipiul', 1))
    await goTo(user, 'Verificare')
    expect(stepStatus('Imobile')).toBe('Imobile: 1 câmp de corectat')

    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))

    expect(currentStep()).toBe('Imobilele: clădire și teren')
    expect(document.activeElement).toBe(input('Comuna / orașul / municipiul', 1))
    // У каждого TextInput Carbon есть (пустой) role="alert" — ищем общее сообщение формы.
    expect(screen.getByText(/conține erori/).closest('[role="alert"]')).toBeTruthy()
  })
})

describe('акты и объекты', () => {
  it('новый объект берёт акт и адрес дома у предыдущего', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Acte')
    await user.type(input('Nr. act'), '1234/2023')
    await goTo(user, 'Imobile')
    await user.type(input('Strada', 3), 'Șos. Mihai Bravu')
    await user.click(screen.getByRole('button', { name: 'Adaugă imobil' }))

    expect(screen.getByRole('group', { name: 'Imobilul 2' })).toBeTruthy()
    expect(input('Strada', 4).value).toBe('Șos. Mihai Bravu')
    expect((screen.getAllByLabelText('Dobândit prin')[1] as HTMLSelectElement).selectedOptions[0]!.textContent).toBe('Actul 1 nr. 1234/2023')
  })

  it('акт, по которому получен объект, удалить нельзя', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await goTo(user, 'Acte')

    expect(screen.getByText('Actul nu poate fi șters: este folosit de imobilul 3.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Șterge actul 2' })).toBeNull()
  })

  it('новый акт можно выбрать у объекта — он попадает в декларации', async () => {
    const blobs = captureDownloads()
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await goTo(user, 'Acte')
    await user.click(screen.getByRole('button', { name: 'Adaugă act' }))
    await user.type(input('Nr. act', 2), '89/2025')
    await user.type(input('Data actului', 2), '2025-02-03')
    await user.click(screen.getAllByLabelText('Închiriere')[2]!)

    await goTo(user, 'Imobile')
    await user.selectOptions(screen.getAllByLabelText('Dobândit prin')[2]!, 'Actul 3 nr. 89/2025 din 03.02.2025')
    // Теперь второй акт не используется — его можно удалить.
    await goTo(user, 'Acte')
    await user.click(screen.getByRole('button', { name: 'Șterge actul 2' }))
    await goTo(user, 'Verificare')
    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))
    await screen.findByRole('heading', { name: 'Documentele sunt gata' })

    await user.click(screen.getByRole('button', { name: /Descarcă \.typ: ITL 002 — Str\. Fabrica de Glucoză/ }))
    const source = await blobs.at(-1)!.text()
    expect(source).toContain('nrAct: "89/2025"')
    expect(source).toContain('formaDobandire: "inchiriere"')
  })
})

describe('черновики', () => {
  /** Перезагрузка страницы: размонтирование дописывает несохранённое, затем форма монтируется заново. */
  const reload = () => {
    cleanup()
    render(<App />)
  }

  it('введённые данные переживают перезагрузку', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    reload()

    expect(input('Denumire contribuabil').value).toBe('Exemplu SRL')
    expect(screen.getByText(/Ciornă salvată automat/)).toBeTruthy()
  })

  it('подтверждённые разделы переживают перезагрузку', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    await goTo(user, 'Scutiri')
    await user.click(screen.getByRole('button', { name: 'Continuă: Anexe' }))
    reload()

    expect(stepStatus('Scutiri')).toBe('Scutiri: gata')
    expect(stepStatus('Anexe')).toBe('Anexe: de completat')
    // Открыт первый неготовый раздел.
    expect(currentStep()).toBe('Contribuabilul (persoana juridică)')
  })

  it('пустая форма черновик не создаёт', () => {
    render(<App />)
    reload()
    expect(screen.getByRole('button', { name: 'Ciornele mele (0)' })).toHaveProperty('disabled', true)
  })

  it('восстановленный готовый черновик открывается на проверке', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    reload()

    expect(currentStep()).toBe('Verificarea dosarului')
    expect(screen.getByText(/Secțiuni gata: 7 din 7/)).toBeTruthy()
  })

  it('новое досье не затирает прежнее, его можно открыть из списка', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Prima SRL')
    await user.click(screen.getByRole('button', { name: 'Dosar nou' }))
    expect(input('Denumire contribuabil').value).toBe('')

    await user.type(screen.getByLabelText('Denumire contribuabil'), 'A doua SRL')
    reload()
    expect(input('Denumire contribuabil').value).toBe('A doua SRL')

    await user.click(screen.getByRole('button', { name: 'Ciornele mele (2)' }))
    await user.click(screen.getByRole('button', { name: 'Deschide ciorna Prima SRL' }))
    expect(input('Denumire contribuabil').value).toBe('Prima SRL')
  })

  it('досье той же фирмы: реквизиты и подписант копируются, акты и объекты — нет', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await user.click(screen.getByRole('button', { name: 'Dosar nou pentru aceeași firmă' }))

    expect(screen.getByRole('button', { name: 'Ciornele mele (2)' })).toBeTruthy()
    expect(stepStatus('Contribuabil')).toBe('Contribuabil: gata')
    expect(stepStatus('Semnatar')).toBe('Semnatar: gata')
    expect(currentStep()).toBe('Actele de dobândire')
    expect(screen.getAllByLabelText('Nr. act')).toHaveLength(1)
    expect(input('Nr. act').value).toBe('')
  })

  it('удаление открытого черновика очищает форму', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    reload()

    await user.click(screen.getByRole('button', { name: 'Ciornele mele (1)' }))
    await user.click(screen.getByRole('button', { name: 'Șterge ciorna Exemplu SRL' }))
    expect(input('Denumire contribuabil').value).toBe('')
    reload()
    expect(screen.getByRole('button', { name: 'Ciornele mele (0)' })).toHaveProperty('disabled', true)
  })
})

describe('документы', () => {
  it('ITL 002 на каждый объект и одна ITL 004; .typ скачиваются сразу, компилятор — только по кнопке', async () => {
    const blobs = captureDownloads()
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))

    await screen.findByRole('heading', { name: 'Documentele sunt gata' })
    const files = within(screen.getByRole('list')).getAllByRole('button').map((b) => b.textContent)
    expect(files).toEqual(['ITL002_18547290_1.typ', 'ITL002_18547290_2.typ', 'ITL002_18547290_3.typ', 'ITL004_18547290.typ'])
    expect(screen.getByRole('button', { name: 'Încarcă compilatorul și generează PDF-urile' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Descarcă .typ: ITL 004 — teren, 3 imobile' }))
    const source = await blobs.at(-1)!.text()
    expect(source).toMatch(/^\/\/ Declarație fiscală ITL 004/)
    expect(source).toContain('denumire: "Exemplu Construcții Țărănești S.R.L."')
    expect(source.match(/nrAct: /g)).toHaveLength(3)
  })
})
