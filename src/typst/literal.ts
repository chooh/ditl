/**
 * JSON-значение → литерал Typst, отформатированный для чтения и правки руками:
 * словари — `(ключ: значение)`, массивы — `(a, b)`, null — `none`.
 */
export function toTypst(value: unknown, indent = ''): string {
  if (value === null || value === undefined) return 'none'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Число не представимо в Typst: ${value}`)
    return String(value)
  }
  if (typeof value === 'string') return typstString(value)

  const inner = indent + '  '
  if (Array.isArray(value)) {
    if (value.length === 0) return '()'
    const items = value.map((v) => `${inner}${toTypst(v, inner)},`)
    // Висячая запятая обязательна: «(x)» без неё — просто x в скобках, а не массив.
    return `(\n${items.join('\n')}\n${indent})`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return '(:)'
    const items = entries.map(([k, v]) => `${inner}${typstKey(k)}: ${toTypst(v, inner)},`)
    return `(\n${items.join('\n')}\n${indent})`
  }
  throw new Error(`Тип не представим в Typst: ${typeof value}`)
}

/** Строка в кавычках; управляющие символы — через \u{…}. */
export function typstString(s: string): string {
  const escaped = s.replace(/[\\"\n\r\t]|\p{Cc}/gu, (c) => {
    switch (c) {
      case '\\':
        return '\\\\'
      case '"':
        return '\\"'
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\t':
        return '\\t'
      default:
        return `\\u{${c.codePointAt(0)!.toString(16)}}`
    }
  })
  return `"${escaped}"`
}

const KEYWORDS = new Set(['none', 'auto', 'true', 'false', 'let', 'set', 'show', 'if', 'else', 'for', 'in', 'while', 'break', 'continue', 'return', 'import', 'include', 'and', 'or', 'not', 'context', 'as'])

/** Ключ словаря: идентификатор как есть, остальное (и ключевые слова) — строкой. */
function typstKey(k: string): string {
  return /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(k) && !KEYWORDS.has(k) ? k : typstString(k)
}
