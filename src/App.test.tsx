// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from './drafts/storage'
import { App } from './App'

beforeAll(() => {
  // В jsdom нет scrollIntoView — разделы вызывают его после сворачивания.
  Element.prototype.scrollIntoView = () => {}
})
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
})

const section = (title: RegExp) => screen.getByRole('button', { name: title }).closest('section')!
const isOpen = (title: RegExp) => screen.getByRole('button', { name: title }).getAttribute('aria-expanded') === 'true'

describe('сворачиваемые разделы', () => {
  it('сначала все раскрыты, обязательные помечены «De completat»', () => {
    render(<App />)
    expect(isOpen(/I\. Date de identificare a contribuabilului/)).toBe(true)
    expect(within(section(/IV\. Datele clădirii/)).getByText('De completat')).toBeTruthy()
    expect(within(section(/III\. Adresa de rezidență/)).getByText('✓ Gata')).toBeTruthy()
  })

  it('раздел без ошибок сворачивается, когда фокус уходит в другой раздел', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Adresa (dacă este cazul)'), 'Rue de la Paix 12, Paris')
    await user.click(screen.getByLabelText('Nr. act dobândire'))

    expect(isOpen(/III\. Adresa de rezidență/)).toBe(false)
    expect(within(section(/III\. Adresa de rezidență/)).getByText('Rue de la Paix 12, Paris')).toBeTruthy()
    expect(isOpen(/IV\. Datele clădirii/)).toBe(true)
  })

  it('раздел с ошибками не сворачивается и показывает их количество', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    await user.click(screen.getByLabelText('Nr. act dobândire'))

    expect(isOpen(/I\. Date de identificare a contribuabilului/)).toBe(true)
    expect(within(section(/^I\. Date de identificare/)).getByText(/câmpuri de corectat/)).toBeTruthy()
  })

  it('по клику заголовок разворачивает и сворачивает раздел', async () => {
    const user = userEvent.setup()
    render(<App />)
    const header = screen.getByRole('button', { name: /Documente anexate/ })
    await user.click(header)
    expect(isOpen(/Documente anexate/)).toBe(false)
    await user.click(header)
    expect(isOpen(/Documente anexate/)).toBe(true)
  })

  it('тестовые данные: все разделы готовы и свёрнуты со сводкой', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))

    expect(screen.getByText('Secțiuni gata: 7 din 7')).toBeTruthy()
    expect(isOpen(/I\. Date de identificare a contribuabilului/)).toBe(false)
    expect(screen.getByText('Exemplu Construcții Țărănești S.R.L. · CUI RO18547290 · București')).toBeTruthy()
  })

  it('отправка с ошибками раскрывает раздел и ставит фокус на первое ошибочное поле', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))
    // Сломать одно поле в свёрнутом разделе IV.
    await user.click(screen.getByRole('button', { name: /IV\. Datele clădirii/ }))
    await user.clear(screen.getByLabelText('Localitate/sector'))
    await user.click(screen.getByRole('button', { name: /IV\. Datele clădirii/ }))
    expect(isOpen(/IV\. Datele clădirii/)).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Generează documentul' }))

    expect(isOpen(/IV\. Datele clădirii/)).toBe(true)
    expect(document.activeElement).toBe(screen.getByLabelText('Localitate/sector'))
    expect(screen.getByRole('alert').textContent).toMatch(/conține erori/)
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

    expect((screen.getByLabelText('Denumire contribuabil') as HTMLInputElement).value).toBe('Exemplu SRL')
    expect(screen.getByText(/Ciornă salvată automat/)).toBeTruthy()
  })

  it('пустая форма черновик не создаёт', () => {
    render(<App />)
    reload()
    expect(screen.getByRole('button', { name: 'Ciornele mele (0)' })).toHaveProperty('disabled', true)
  })

  it('восстановленный черновик: готовые разделы свёрнуты', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))
    reload()

    expect(screen.getByText('Secțiuni gata: 7 din 7')).toBeTruthy()
    expect(isOpen(/I\. Date de identificare a contribuabilului/)).toBe(false)
  })

  it('новая декларация не затирает прежнюю, её можно открыть из списка', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Prima SRL')
    await user.click(screen.getByRole('button', { name: 'Declarație nouă: ITL 002 — clădire' }))
    expect((screen.getByLabelText('Denumire contribuabil') as HTMLInputElement).value).toBe('')

    await user.type(screen.getByLabelText('Denumire contribuabil'), 'A doua SRL')
    reload()
    expect((screen.getByLabelText('Denumire contribuabil') as HTMLInputElement).value).toBe('A doua SRL')

    await user.click(screen.getByRole('button', { name: 'Ciornele mele (2)' }))
    await user.click(screen.getByRole('button', { name: 'Deschide ciorna Prima SRL' }))
    expect((screen.getByLabelText('Denumire contribuabil') as HTMLInputElement).value).toBe('Prima SRL')
  })

  it('другое здание той же фирмы: данные контрибуабила копируются, здание — нет', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))
    await user.click(screen.getByRole('button', { name: 'Același contribuabil: ITL 002 — altă clădire' }))

    expect(screen.getByRole('button', { name: 'Ciornele mele (2)' })).toBeTruthy()
    expect(isOpen(/I\. Date de identificare a contribuabilului/)).toBe(false)
    expect(isOpen(/IV\. Datele clădirii/)).toBe(true)
    expect((screen.getByLabelText('Nr. act dobândire') as HTMLInputElement).value).toBe('')
  })

  it('удаление открытого черновика очищает форму', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    reload()

    await user.click(screen.getByRole('button', { name: 'Ciornele mele (1)' }))
    await user.click(screen.getByRole('button', { name: 'Șterge ciorna Exemplu SRL' }))
    expect((screen.getByLabelText('Denumire contribuabil') as HTMLInputElement).value).toBe('')
    reload()
    expect(screen.getByRole('button', { name: 'Ciornele mele (0)' })).toHaveProperty('disabled', true)
  })
})

describe('ITL 004', () => {
  const heading = () => screen.getByRole('heading', { level: 1 }).textContent

  it('та же фирма: реквизиты переносятся из ITL 002 в ITL 004, участков ещё нет', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))
    await user.click(screen.getByRole('button', { name: 'Același contribuabil: ITL 004 — teren' }))

    expect(heading()).toBe('Declarație fiscală ITL 004')
    expect(screen.getByRole('button', { name: 'Ciornele mele (2)' })).toBeTruthy()
    expect(isOpen(/Contribuabilul \(persoana juridică\)/)).toBe(false)
    expect(isOpen(/Terenurile/)).toBe(true)
    expect((screen.getByLabelText('Prin actul nr.') as HTMLInputElement).value).toBe('')

    // Черновик ITL 002 открывается из списка — форма переключается обратно.
    await user.click(screen.getByRole('button', { name: 'Ciornele mele (2)' }))
    await user.click(screen.getAllByRole('button', { name: /^Deschide ciorna/ })[0]!)
    expect(heading()).toBe('Declarație fiscală ITL 002')
  })

  it('пустая ITL 004 по кнопке; после перезагрузки открывается она же', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Declarație nouă: ITL 004 — teren' }))
    await user.type(screen.getByLabelText('Prenumele și numele'), 'Ion Popescu')
    cleanup()
    render(<App />)

    expect(heading()).toBe('Declarație fiscală ITL 004')
    expect((screen.getByLabelText('Prenumele și numele') as HTMLInputElement).value).toBe('Ion Popescu')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).drafts[0].form).toBe('itl004')
  })

  it('готовая декларация: .typ скачивается сразу, компилятор — только по кнопке', async () => {
    const blobs: Blob[] = []
    URL.createObjectURL = (b: Blob) => (blobs.push(b), 'blob:test')
    URL.revokeObjectURL = () => {}
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Declarație nouă: ITL 004 — teren' }))
    await user.click(screen.getByRole('button', { name: 'Completează cu date de test' }))
    await user.click(screen.getByRole('button', { name: 'Generează documentul' }))

    await screen.findByRole('heading', { name: 'Documentul este gata' })
    expect(screen.getByText('typst compile ITL004_18547290.typ')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Încarcă compilatorul și generează PDF-ul' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Descarcă .typ' }))
    const source = await blobs.at(-1)!.text()
    expect(source).toMatch(/^\/\/ Declarație fiscală ITL 004/)
    expect(source).toContain('denumire: "Exemplu Construcții Țărănești S.R.L."')
  })
})
