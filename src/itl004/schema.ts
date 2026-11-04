import { z } from 'zod'
import {
  address,
  annexes,
  area,
  checks,
  choice,
  cnp,
  date,
  emptyAddress,
  emptyTaxpayer,
  iban,
  identityShape,
  optionalDate,
  phone,
  requiredText,
  taxpayerShape,
  text,
  todayIso,
} from '../form/common'

/** Как получен участок: «am dobândit/închiriat/concesionat/preluat în administrare/preluat în folosință». */
export const LAND_ACQUISITIONS = ['dobandit', 'inchiriat', 'concesionat', 'administrare', 'folosinta'] as const
export const LAND_ACQUISITION_TEXT: Record<(typeof LAND_ACQUISITIONS)[number], string> = {
  dobandit: 'dobândit',
  inchiriat: 'închiriat',
  concesionat: 'concesionat',
  administrare: 'preluat în administrare',
  folosinta: 'preluat în folosință',
}

/** Колонки таблицы «Suprafața terenului, pe categorii de folosință», слева направо. */
export const LAND_CATEGORIES = [
  'constructii',
  'arabil',
  'pasune',
  'faneata',
  'vieRod',
  'vieNerod',
  'livadaRod',
  'livadaNerod',
  'padurePana20',
  'padurePeste20',
  'apeAmenajare',
  'apeFaraAmenajare',
  'drumuriLiber',
  'drumuriOcup',
  'neproductive',
] as const
export type LandCategory = (typeof LAND_CATEGORIES)[number]

/** На бланке — пять пунктов «1. începând cu data de…». */
export const MAX_PARCELS = 5

const surfaces = z.object(Object.fromEntries(LAND_CATEGORIES.map((k) => [k, area])) as Record<LandCategory, typeof area>)

const parcel = z.object({
  /** «începând cu data de» */
  dataDobandirii: date,
  nrAct: requiredText(30),
  dataAct: optionalDate,
  forma: choice(LAND_ACQUISITIONS, 'Alegeți forma'),
  localitate: requiredText(60),
  satSector: text(40),
  strada: requiredText(80),
  nr: text(10),
  registru: z.object({ perioada: text(15), tip: text(10), volum: text(10), pozitie: text(20) }),
  cota: text(30),
  coproprietari: text(300),
  /** Колонка «Parcela / adresa» таблицы; пусто — печатается адрес участка. */
  parcela: text(150),
  intravilan: choice(['I', 'E'] as const, 'Alegeți intravilan sau extravilan'),
  suprafete: surfaces,
  rang: text(5),
  zona: text(5),
})

export const declarationSchema = z
  .object({
    antet: z.object({ rolNominal: text(20) }),

    /** «Subsemnatul…» — кто подаёт декларацию от имени юрлица. */
    reprezentant: z.object({
      nume: requiredText(100),
      cnp,
      domiciliu: address,
    }),
    actIdentitate: z.object(identityShape),

    contribuabil: z.object({
      ...taxpayerShape,
      fax: phone,
      registruComertului: text(80),
      nrRegistruComertului: text(30),
      iban,
      banca: text(80),
    }),

    terenuri: z.array(parcel).min(1, 'Adăugați cel puțin un teren').max(MAX_PARCELS),

    scutire: z.object({ cota: text(20), calitate: text(100), documente: text(200) }),

    anexe: annexes,

    semnatari: z.object({ director: text(100), sefContabil: text(100) }),

    dataDeclaratiei: date,
  })
  .superRefine((d, ctx) => {
    const { checkPostalCode, checkTaxpayer } = checks(ctx)
    checkTaxpayer(d.contribuabil)
    checkPostalCode(d.reprezentant.domiciliu, ['reprezentant', 'domiciliu'])

    d.terenuri.forEach((t, i) => {
      if (Object.values(t.suprafete).every((v) => v === null)) {
        ctx.addIssue({ code: 'custom', message: 'Completați suprafața cel puțin la o categorie de folosință', path: ['terenuri', i, 'suprafete'] })
      }
    })
  })

export type DeclarationInput = z.input<typeof declarationSchema>
export type Declaration = z.output<typeof declarationSchema>
export type ParcelInput = DeclarationInput['terenuri'][number]

export function emptyParcel(): ParcelInput {
  return {
    dataDobandirii: '',
    nrAct: '',
    dataAct: '',
    forma: '',
    localitate: '',
    satSector: '',
    strada: '',
    nr: '',
    registru: { perioada: '', tip: '', volum: '', pozitie: '' },
    cota: '',
    coproprietari: '',
    parcela: '',
    intravilan: '',
    suprafete: Object.fromEntries(LAND_CATEGORIES.map((k) => [k, ''])) as Record<LandCategory, string>,
    rang: '',
    zona: '',
  }
}

export function emptyDeclaration(): DeclarationInput {
  return {
    antet: { rolNominal: '' },
    reprezentant: { nume: '', cnp: '', domiciliu: emptyAddress('România') },
    actIdentitate: { tip: 'CI', serie: '', numar: '' },
    contribuabil: { ...emptyTaxpayer(), fax: '', registruComertului: '', nrRegistruComertului: '', iban: '', banca: '' },
    terenuri: [emptyParcel()],
    scutire: { cota: '', calitate: '', documente: '' },
    anexe: [{ denumire: '' }],
    semnatari: { director: '', sefContabil: '' },
    dataDeclaratiei: todayIso(),
  }
}
