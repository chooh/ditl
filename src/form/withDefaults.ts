/**
 * Привести сохранённые значения к текущей форме: после обновления схемы новые поля
 * получают значения по умолчанию, исчезнувшие и неверного типа — отбрасываются.
 */
export function withDefaults<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults)) {
    return (Array.isArray(stored) ? stored.map((item) => withDefaults(defaults[0], item)) : defaults) as T
  }
  if (defaults !== null && typeof defaults === 'object') {
    if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return defaults
    const source = stored as Record<string, unknown>
    return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, withDefaults(v, source[k])])) as T
  }
  return typeof stored === typeof defaults ? (stored as T) : defaults
}
