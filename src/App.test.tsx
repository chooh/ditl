// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
// Приветствие уже видели — сразу форма (приветствие проверяется отдельно).
beforeEach(() => localStorage.setItem('ditl.onboarded', '1'))
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
/** Заголовок открытого подэтапа (есть, когда подэтапов в разделе несколько). */
const currentSubStep = () => screen.getByRole('heading', { level: 3 }).textContent
/** Подэтап открытого раздела — по сегменту полоски подэтапов («6. Imobilul 2 — actul și adresa: de completat»). */
const goToSub = (user: User, title: string) =>
  user.click(screen.getByRole('button', { name: new RegExp(`^\\d+\\. ${title}:`) }))
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

  it('«Continuă» идёт по подэтапам и показывает ошибки покинутого подэтапа', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(currentSubStep()).toBe('Date de identificare')
    await user.type(screen.getByLabelText('Denumire contribuabil'), 'Exemplu SRL')
    await user.click(screen.getByRole('button', { name: 'Continuă: Contact și comunicare' }))

    expect(currentStep()).toBe('Contribuabilul (persoana juridică)')
    expect(currentSubStep()).toBe('Contact și comunicare')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 3 }))
    await waitFor(() => expect(input('Codul unic de identificare (CUI)').getAttribute('aria-invalid')).toBe('true'))
    // Раздел ещё не покинут — в индикаторе ошибок нет.
    expect(stepStatus('Contribuabil')).toBe('Contribuabil: de completat')
    expect(screen.getByRole('button', { name: /^1\. Date de identificare: conține erori$/ })).toBeTruthy()
  })

  it('с последнего подэтапа «Continuă» ведёт в следующий раздел и показывает ошибки покинутого', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goToSub(user, 'Alte adrese \\(dacă este cazul\\)')
    await user.click(screen.getByRole('button', { name: 'Continuă: Semnatar' }))

    expect(currentStep()).toBe('Semnatarul declarațiilor')
    expect(currentSubStep()).toBe('Calitatea și datele personale')
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
    expect(stepStatus('Contribuabil')).toMatch(/^Contribuabil: \d+ câmpuri de corectat$/)
  })

  it('на любой шаг можно перейти по индикатору, «Înapoi» ведёт к предыдущему', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Imobile')
    expect(currentStep()).toBe('Imobilele: clădire și teren')

    // Назад — на последний подэтап предыдущего раздела.
    await user.click(screen.getByRole('button', { name: 'Înapoi' }))
    expect(currentStep()).toBe('Actele de dobândire')
    expect(currentSubStep()).toBe('Lista actelor')
  })

  it('тестовые данные: все разделы готовы, открыта проверка со сводкой', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)

    expect(currentStep()).toBe('Verificarea dosarului')
    expect(screen.getByText(/Secțiuni gata: 7 din 7/)).toBeTruthy()
    expect(stepStatus('Contribuabil')).toBe('Contribuabil: gata')
    expect(screen.getByText('Exemplu Construcții Țărănești S.R.L. · CUI 18547290 · București')).toBeTruthy()
    expect(screen.getByText('2 acte · nr. 1234/2023 din 15.03.2023 · nr. 567/2024 din 02.09.2024')).toBeTruthy()
  })

  it('отправка с ошибками открывает раздел и ставит фокус на первое ошибочное поле', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    // Сломать одно поле в разделе объектов и вернуться к проверке.
    await user.click(screen.getByRole('button', { name: 'Modifică: Imobilele: clădire și teren' }))
    await goToSub(user, 'Imobilul 2 — actul și adresa')
    await user.clear(input('Comuna / orașul / municipiul', 1))
    await goTo(user, 'Verificare')
    expect(stepStatus('Imobile')).toBe('Imobile: 1 câmp de corectat')
    // Уйти с этого подэтапа — отправка всё равно откроет именно его.
    await user.click(screen.getByRole('button', { name: 'Modifică: Imobilele: clădire și teren' }))
    await goToSub(user, 'Lista imobilelor')
    await goTo(user, 'Verificare')

    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))

    expect(currentStep()).toBe('Imobilele: clădire și teren')
    expect(currentSubStep()).toBe('Imobilul 2 — actul și adresa')
    expect(document.activeElement).toBe(input('Comuna / orașul / municipiul', 1))
    // У каждого TextInput Carbon есть (пустой) role="alert" — ищем общее сообщение формы.
    expect(screen.getByText(/conține erori/).closest('[role="alert"]')).toBeTruthy()
  })

  it('сообщение об ошибках называет оставшиеся разделы и исчезает, когда ошибок нет', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await goTo(user, 'Acte')
    await user.clear(input('Nr. act'))
    await goTo(user, 'Imobile')
    await user.clear(input('Strada', 3))
    await goTo(user, 'Verificare')
    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))
    expect(screen.getByText(/corectați câmpurile marcate în secțiunile Acte, Imobile/)).toBeTruthy()

    await user.type(input('Nr. act'), '1/2023')
    expect(screen.getByText(/corectați câmpurile marcate în secțiunea Imobile\./)).toBeTruthy()

    await goTo(user, 'Imobile')
    await user.type(input('Strada', 3), 'Șos. Mihai Bravu')
    expect(screen.queryByText(/conține erori/)).toBeNull()
  })
})

describe('подэтапы и подсказки', () => {
  it('полоска подэтапов переводит между ними', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText('Subetapa 1 din 5')).toBeTruthy()
    await goToSub(user, 'Sediul')

    expect(currentSubStep()).toBe('Sediul')
    expect(screen.getByText('Subetapa 4 din 5')).toBeTruthy()
    // Покинутый подэтап с ошибками помечен.
    expect(screen.getByRole('button', { name: /^1\. Date de identificare: conține erori$/ })).toBeTruthy()
  })

  it('«Ajutor» в шапке открывает советы к открытому экрану', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Semnatar')
    await user.click(screen.getByRole('button', { name: 'Ajutor' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Cine semnează declarațiile')).toBeTruthy()
    expect(within(dialog).getByText(/CNP-ul are 13 cifre/)).toBeTruthy()
  })

  it('скидка: поля — только при «Da», «Nu» их очищает', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Scutiri')
    expect(input('În cotă de').closest('.grid')!.hasAttribute('hidden')).toBe(true)

    await user.click(screen.getByLabelText('Da'))
    await user.type(input('În cotă de'), '50%')
    await user.click(screen.getByLabelText('Nu'))
    expect(input('În cotă de').value).toBe('')
    expect(input('În cotă de').closest('.grid')!.hasAttribute('hidden')).toBe(true)
  })

  it('без типа здания стоимость не заполнить — кнопка ведёт к выбору типа', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTo(user, 'Imobile')
    await goToSub(user, 'Imobilul 1 — valoarea clădirii')
    await user.click(screen.getByRole('button', { name: 'Alege tipul clădirii' }))

    expect(currentSubStep()).toBe('Imobilul 1 — clădirea')
  })
})

describe('приветствие', () => {
  beforeEach(() => localStorage.removeItem('ditl.onboarded'))

  it('показывается при первом открытии, «Începe completarea» открывает форму и больше не показывается', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Declarațiile ITL 002 și ITL 004, pas cu pas' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Începe completarea' }))
    expect(currentStep()).toBe('Contribuabilul (persoana juridică)')
    cleanup()
    render(<App />)
    expect(currentStep()).toBe('Contribuabilul (persoana juridică)')
  })

  it('пример открывается заполненным, на проверке', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Vezi un exemplu completat' }))

    expect(currentStep()).toBe('Verificarea dosarului')
    expect(screen.getByText(/Secțiuni gata: 7 din 7/)).toBeTruthy()
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
    await goToSub(user, 'Lista imobilelor')
    await user.click(screen.getByRole('button', { name: 'Adaugă imobil' }))

    // Новый объект сразу открыт.
    expect(currentSubStep()).toBe('Imobilul 2 — actul și adresa')
    expect(screen.getByRole('group', { name: 'Imobilul 2' })).toBeTruthy()
    expect(input('Strada', 4).value).toBe('Șos. Mihai Bravu')
    expect((screen.getAllByLabelText('Dobândit prin')[1] as HTMLSelectElement).selectedOptions[0]!.textContent).toBe('Actul 1 nr. 1234/2023')
  })

  it('акт, по которому получен объект, удалить нельзя', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await goTo(user, 'Acte')
    await goToSub(user, 'Lista actelor')

    expect(screen.getByText('Folosit de imobilul 3 — nu poate fi șters.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Șterge actul 2' })).toBeNull()
  })

  it('новый акт можно выбрать у объекта — он попадает в декларации', async () => {
    const blobs = captureDownloads()
    const user = userEvent.setup()
    render(<App />)
    await fillSample(user)
    await goTo(user, 'Acte')
    await goToSub(user, 'Lista actelor')
    await user.click(screen.getByRole('button', { name: 'Adaugă act' }))
    expect(currentSubStep()).toBe('Actul 3')
    await user.type(input('Nr. act', 2), '89/2025')
    await user.type(input('Data actului', 2), '2025-02-03')
    await user.click(screen.getAllByLabelText('Închiriere')[2]!)

    await goTo(user, 'Imobile')
    await goToSub(user, 'Imobilul 3 — actul și adresa')
    await user.selectOptions(screen.getAllByLabelText('Dobândit prin')[2]!, 'Actul 3 nr. 89/2025 din 03.02.2025')
    // Теперь второй акт не используется — его можно удалить.
    await goTo(user, 'Acte')
    await goToSub(user, 'Lista actelor')
    await user.click(screen.getByRole('button', { name: 'Șterge actul 2' }))
    await goTo(user, 'Verificare')
    await user.click(screen.getByRole('button', { name: 'Generează documentele' }))
    await screen.findByRole('heading', { name: 'Documentele sunt gata' }, { timeout: 3000 })

    await user.click(screen.getByRole('button', { name: 'Pentru specialiști: fișierele Typst' }))
    const item = screen.getByText(/ITL 002 — Str\. Fabrica de Glucoză/).closest('li')!
    await user.click(within(item).getByRole('button', { name: /^Descarcă / }))
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
    await user.click(screen.getByRole('button', { name: /^Prima SRL/ }))
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
    expect(currentSubStep()).toBe('Actul 1')
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
    expect(screen.getByText('Se pregătesc documentele…')).toBeTruthy()

    await screen.findByRole('heading', { name: 'Documentele sunt gata' }, { timeout: 3000 })
    expect(screen.getByText(/S-au pregătit 4 declarații\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Generează PDF-urile' })).toBeTruthy()

    // Файлы .typ — в свёрнутом разделе для специалистов.
    await user.click(screen.getByRole('button', { name: 'Pentru specialiști: fișierele Typst' }))
    const files = within(screen.getByRole('list', { name: 'Fișiere Typst' }))
      .getAllByText(/^ITL\d+_.*\.typ$/)
      .map((f) => f.textContent)
    expect(files).toEqual(['ITL002_18547290_1.typ', 'ITL002_18547290_2.typ', 'ITL002_18547290_3.typ', 'ITL004_18547290.typ'])

    await user.click(screen.getByRole('button', { name: 'Descarcă ITL004_18547290.typ' }))
    const source = await blobs.at(-1)!.text()
    expect(source).toMatch(/^\/\/ Declarație fiscală ITL 004/)
    expect(source).toContain('denumire: "Exemplu Construcții Țărănești S.R.L."')
    expect(source.match(/nrAct: /g)).toHaveLength(3)
  })
})
