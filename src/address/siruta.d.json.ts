/** Форма src/address/siruta.json (см. scripts/siruta.ts): județ → [UAT, TIP, [localitate, TIP]]. */
declare const siruta: {
  source: string
  counties: [string, [string, number, [string, number][]][]][]
}
export default siruta
