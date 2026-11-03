// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { App } from './App'

beforeAll(() => {
  // В jsdom нет scrollIntoView — разделы вызывают его после сворачивания.
  Element.prototype.scrollIntoView = () => {}
})
afterEach(cleanup)

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

    await user.click(screen.getByRole('button', { name: 'Previzualizare' }))

    expect(isOpen(/IV\. Datele clădirii/)).toBe(true)
    expect(document.activeElement).toBe(screen.getByLabelText('Localitate/sector'))
    expect(screen.getByRole('alert').textContent).toMatch(/conține erori/)
  })
})
