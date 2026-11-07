/**
 * SIRUTA (INS) → src/address/siruta.json — справочник населённых пунктов для адресных полей.
 *
 * Источник — открытые данные INS на data.gov.ro, CC-BY-4.0, набор «SIRUTA_s1 2026»:
 * https://data.gov.ro/dataset/siruta_s1-2026
 *
 *   node scripts/siruta.ts siruta_s1_2026.csv
 *
 * Иерархия SIRUTA: județ (NIV 1) → UAT — municipiu, oraș, comună (NIV 2) → localitate —
 * sector, localitate componentă, sat (NIV 3). В JSON — та же иерархия, имена в обычном
 * написании («Alba Iulia», «Valea lui Mihai») с ș/ț с запятой; коды TIP — как в SIRUTA.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [source] = process.argv.slice(2)
if (!source) {
  console.error('Использование: node scripts/siruta.ts siruta_s1_2026.csv')
  process.exit(1)
}

type Row = { code: string; name: string; parent: string; type: number; level: number }

const rows: Row[] = readFileSync(source, 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map((line) => {
    // SIRUTA;DENLOC;CODP;JUD;SIRSUP;TIP;NIV;MED;REGIUNE;FSJ;NUTS;LAU
    const [code, name, , , parent, type, level] = line.split(';')
    return { code: code!, name: name!.trim().replace(/\s+/g, ' '), parent: parent!, type: Number(type), level: Number(level) }
  })

/** Предлоги и союзы внутри названий пишутся строчными: «Curtea de Argeș», «Valea lui Mihai». */
const LOWERCASE = new Set(['de', 'din', 'la', 'lui', 'pe', 'sub', 'cu', 'după', 'peste'])

/** «VALEA LUI MIHAI» → «Valea lui Mihai»; «C.A.ROSETTI» → «C.A.Rosetti»; ş/ţ с седилью → ș/ț с запятой. */
function titleCase(upper: string): string {
  const s = upper.normalize('NFC').replace(/Ş/g, 'Ș').replace(/Ţ/g, 'Ț').toLocaleLowerCase('ro-RO')
  return s.replace(/[\p{L}\d]+/gu, (word, offset: number) =>
    offset > 0 && s[offset - 1] === ' ' && LOWERCASE.has(word) ? word : word[0]!.toLocaleUpperCase('ro-RO') + word.slice(1),
  )
}

const children = new Map<string, Row[]>()
for (const row of rows) {
  if (row.level === 1) continue
  const list = children.get(row.parent) ?? []
  list.push(row)
  children.set(row.parent, list)
}

const countyName = (r: Row) => titleCase(r.name.replace(/^(JUDEŢUL|JUDEȚUL|MUNICIPIUL) /, ''))
const uatName = (r: Row) => titleCase(r.name.replace(/^(MUNICIPIUL|ORAŞ|ORAȘ) /, ''))
const localityName = (r: Row) => (r.type === 6 ? `Sector ${/(\d)$/.exec(r.name)![1]}` : titleCase(r.name))

const counties = rows
  .filter((r) => r.level === 1)
  .map((county) => [
    countyName(county),
    (children.get(county.code) ?? []).map((uat) => [
      uatName(uat),
      uat.type,
      (children.get(uat.code) ?? []).map((loc) => [localityName(loc), loc.type]),
    ]),
  ])
  .sort(([a], [b]) => (a as string).localeCompare(b as string, 'ro'))

const localities = counties.flatMap(([, uats]) => (uats as unknown[][]).flatMap((u) => u[2] as unknown[])).length
const out = new URL('../src/address/siruta.json', import.meta.url)
writeFileSync(out, JSON.stringify({ source: 'SIRUTA s1 2026, INS, CC-BY-4.0', counties }) + '\n')
console.log(`${counties.length} județe, ${localities} localități → ${out.pathname}`)
