import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORMS, forSameTaxpayer, type FormId } from '../forms'
import { declarationSchema as schema004, emptyParcel } from '../itl004/schema'
import { compileTypst } from '../test/typst'
import { bundleTypst } from './bundle'
import { toTypst } from './literal'

const meta = { title: 'Declarație fiscală', filename: 'x.typ', date: '04.11.2026' }
const sampleJson = (id: FormId) => JSON.parse(readFileSync(new URL(`./samples/${id}.json`, import.meta.url), 'utf8'))
/** Данные для печати из тестовых данных формы; дата — как в samples/*.json. */
const printed = (id: FormId) => {
  const def = FORMS[id]
  const data = def.print(def.schema.parse(def.sample())) as Record<string, unknown>
  return id === 'itl002' ? { ...data, dataDeclaratiei: '04.11.2026' } : { ...data, data: '04.11.2026' }
}

describe('данные для шаблонов', () => {
  // samples/*.json нужны для правки шаблонов через `typst compile` — они не должны отставать от кода.
  it.each(['itl002', 'itl004'] as const)('%s: samples/*.json совпадает с тем, что печатает приложение', (id) => {
    expect(printed(id)).toEqual(sampleJson(id))
  })
})

describe('bundleTypst', () => {
  it.each(['itl002', 'itl004'] as const)('%s: один файл компилируется на одной странице без предупреждений', (id) => {
    const { pdf, warnings } = compileTypst(bundleTypst(id, printed(id), meta))
    expect(warnings).toEqual([])
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1)
  })

  it('ITL 004: пять участков с длинными адресами и пустые необязательные поля', () => {
    const sample = FORMS.itl004.sample()
    const long = { ...sample.terenuri[0], parcela: 'T12 P45, '.repeat(12), coproprietari: 'Ionescu Maria, '.repeat(10) }
    const input = { ...sample, terenuri: [long, ...Array(4).fill({ ...emptyParcel(), ...sample.terenuri[0], parcela: '' })], anexe: [{ denumire: '' }] }
    const data = FORMS.itl004.print(schema004.parse(input))
    expect(() => compileTypst(bundleTypst('itl004', data, meta))).not.toThrow()
  })

  it('ITL 002 без împuternicit и приложений', () => {
    const sample = FORMS.itl002.sample()
    const input = { ...sample, imputernicit: { ...sample.imputernicit, exista: false }, anexe: [{ denumire: '' }] }
    const data = FORMS.itl002.print(FORMS.itl002.schema.parse(input)) as { imputernicit: unknown }
    expect(data.imputernicit).toBeNull()
    expect(compileTypst(bundleTypst('itl002', data, meta)).warnings).toEqual([])
  })

  it('кавычки, обратные слэши и переводы строк в данных не ломают файл', () => {
    const sample = FORMS.itl004.sample()
    const input = { ...sample, contribuabil: { ...sample.contribuabil, denumire: 'S.C. „Test" \\ #1 $x$ *b* SRL' } }
    const data = FORMS.itl004.print(schema004.parse(input))
    expect(() => compileTypst(bundleTypst('itl004', data, meta))).not.toThrow()
  })
})

describe('toTypst', () => {
  it('словари, массивы из одного элемента, none и экранирование', () => {
    expect(toTypst({ a: [1], b: null, c: 'x"\\\ny', none: true, 'with space': {} })).toBe(
      ['(', '  a: (', '    1,', '  ),', '  b: none,', '  c: "x\\"\\\\\\ny",', '  "none": true,', '  "with space": (:),', ')'].join('\n'),
    )
  })
})

describe('та же фирма в декларации другого типа', () => {
  it('ITL 002 → ITL 004: реквизиты и документ подписанта, без полей, которых в ITL 004 нет', () => {
    const from = FORMS.itl002.sample()
    const to = forSameTaxpayer('itl002', from, 'itl004') as ReturnType<typeof FORMS.itl004.empty>
    expect(to.contribuabil.denumire).toBe(from.contribuabil.denumire)
    expect(to.contribuabil.sediu).toEqual(from.contribuabil.sediu)
    expect(to.contribuabil).not.toHaveProperty('corespondenta')
    expect(to.contribuabil.iban).toBe('')
    expect(to.actIdentitate).toEqual({ tip: 'CI', serie: 'RX', numar: '123456' })
    expect(to.terenuri).toEqual(FORMS.itl004.empty().terenuri)
  })
})
