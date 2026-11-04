// Общие элементы бланков.
//
// Данные приходят из JSON уже готовыми к печати: даты — «31.01.2024», суммы —
// «1.250.000,00», пустое поле — "". Форматирование и проверка — на стороне TS.

/// Шрифты: Liberation (лежат в приложении) или метрически совместимые с ними
/// Arial и Times New Roman — если .typ компилируют на компьютере без Liberation.
#let SANS = ("Liberation Sans", "Arial")
#let SERIF = ("Liberation Serif", "Times New Roman")

/// Логотип DGITL Sector 2 для шапки ITL 002.
#let logo(..args) = image("sector2.jpg", ..args)

/// Данные декларации. Путь к JSON передаётся через `--input data=…`;
/// без него — тестовые данные бланка `name`.
#let load-data(name) = json(sys.inputs.at("data", default: "samples/" + name + ".json"))

/// Строка из точек, как на бумажном бланке: место, которое заполняют от руки.
#let dots(width) = box(width: width, repeat[.])

/// Поле внутри текста: значение, подчёркнутое пунктиром, или точки, если пусто.
#let blank(value, width: 2cm) = {
  if value == none or value == "" {
    dots(width)
  } else {
    underline(stroke: (thickness: 0.4pt, dash: "dotted"), offset: 1.5pt, evade: false, value)
  }
}

/// Квадрат чекбокса; отмеченный — с крестиком.
#let check(on, size: 0.7em) = box(
  width: size,
  height: size,
  stroke: 0.5pt,
  baseline: 0.05em,
  if on {
    place(line(start: (0%, 0%), end: (100%, 100%), stroke: 0.7pt))
    place(line(start: (0%, 100%), end: (100%, 0%), stroke: 0.7pt))
  },
)

/// Нумерация страниц — только если документ не уместился на одну.
#let page-footer = context {
  let total = counter(page).final().first()
  if total > 1 { align(right, text(size: 7pt)[Pagina #counter(page).display() din #total]) }
}
