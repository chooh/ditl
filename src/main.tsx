import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/** Заставка из index.html видна хотя бы столько от начала загрузки — чтобы не мигала. */
const SPLASH_MIN_MS = 500

const splash = document.getElementById('splash')
if (splash) {
  setTimeout(
    () =>
      requestAnimationFrame(() => {
        splash.classList.add('splash--hidden')
        splash.addEventListener('transitionend', () => splash.remove(), { once: true })
        // transitionend не придёт, если анимации отключены.
        setTimeout(() => splash.remove(), 600)
      }),
    Math.max(0, SPLASH_MIN_MS - performance.now()),
  )
}
