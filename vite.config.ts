/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Жёсткая CSP только для production-сборки: страница не может отправлять данные
// никуда, кроме собственного origin. В dev её нет — HMR использует inline-скрипты.
const CSP = [
  "default-src 'self'",
  // Компилятор Typst — WebAssembly; без этого браузер не даст его инстанцировать.
  "script-src 'self' 'wasm-unsafe-eval'",
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

/**
 * wasm-bindgen-обвязка компилятора Typst создаёт функции из строк (`new Function(…)`),
 * а CSP без 'unsafe-eval' это запрещает. Набор строк конечен и зашит в WASM: заглушки
 * файлового доступа и реестра пакетов («return 0», «return true», «return path»,
 * «throw new Error('Dummy …')» и т. п.) — подставляем готовые функции. Незнакомое тело
 * по-прежнему уйдёт в new Function и громко упадёт под CSP. Если обвязка в новой версии
 * изменится — сборка остановится.
 */
function typstWithoutEval(): Plugin {
  const calls: [string, string][] = [
    ['new Function(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3))', 'functionFromBody(getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg0, arg1))'],
    ['new Function(getStringFromWasm0(arg0, arg1))', 'functionFromBody(getStringFromWasm0(arg0, arg1))'],
  ]
  const helper = `
function functionFromBody(body, args) {
  switch (args === undefined ? body : args + ' => ' + body) {
    case '': return function () {};
    case 'return 0': return function () { return 0; };
    case 'return true': return function () { return true; };
    case 'return this': return function () { return globalThis; };
    case 'path => return path': return function (path) { return path; };
  }
  const thrown = /^throw new Error\\('([^']*)'\\)$/.exec(body);
  if (thrown) return function () { throw new Error(thrown[1]); };
  return args === undefined ? new Function(body) : new Function(args, body);
}
`
  return {
    name: 'typst-without-eval',
    transform(code, id) {
      if (!id.includes('typst_ts_web_compiler.mjs')) return
      for (const [from, to] of calls) {
        if (!code.includes(from)) this.error(`typst-ts-web-compiler: не найден «${from}» — проверьте обвязку`)
        code = code.replace(from, to)
      }
      return code + helper
    },
  }
}

export default defineConfig({
  // Относительный base — сборка работает на GitHub Pages под любым именем репозитория.
  base: './',
  plugins: [react(), contentSecurityPolicy(), typstWithoutEval()],
  build: {
    // Шрифты и WASM не инлайнить в JS как data: URL.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
  },
})
