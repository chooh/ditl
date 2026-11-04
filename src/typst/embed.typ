// Встраивание двоичных файлов в один .typ: в Typst нет base64, декодируем сами.

#let BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/// Base64 → bytes. Пробелы и переводы строк пропускаются.
#let decode-base64(text) = {
  let index = (:)
  for (i, c) in BASE64.clusters().enumerate() { index.insert(c, i) }
  let digits = text.clusters().filter(c => c in index).map(c => index.at(c))
  let out = ()
  for i in range(0, digits.len(), step: 4) {
    let group = digits.slice(i, calc.min(i + 4, digits.len()))
    // 4 символа → 24 бита → 3 байта; неполная группа в конце даёт 1–2 байта.
    let v = group.enumerate().fold(0, (acc, (j, x)) => acc + x * calc.pow(64, 3 - j))
    // push, а не `out += …`: сложение массивов копирует весь накопленный массив.
    out.push(calc.quo(v, 65536))
    if group.len() > 2 { out.push(calc.rem(calc.quo(v, 256), 256)) }
    if group.len() > 3 { out.push(calc.rem(v, 256)) }
  }
  bytes(out)
}
