/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Жёсткая CSP только для production-сборки: страница не может отправлять данные
// никуда, кроме собственного origin. В dev её нет — HMR использует inline-скрипты.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  // Предпросмотр: сгенерированный PDF показывается во <iframe> по blob: URL.
  // blob:-документ наследует CSP страницы, а встроенный PDF-просмотрщик браузера
  // может проверяться по object-src — поэтому blob: разрешён и там.
  "frame-src blob:",
  "object-src blob:",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
    ],
  }
}

export default defineConfig({
  // Относительный base — сборка работает на GitHub Pages под любым именем репозитория.
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    // Шрифт и шаблон не инлайнить в JS как data: URL.
    assetsInlineLimit: 0,
    // Чанк с pdf-lib + fontkit (~1,1 МБ) грузится лениво, только при нажатии «Скачать PDF».
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
  },
})
