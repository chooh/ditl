import { emptyDeclaration, type DeclarationInput } from '../itl002/schema'

const base = emptyDeclaration()

export const validInput: DeclarationInput = {
  ...base,
  contribuabil: {
    denumire: 'Exemplu Construcții Țărănești S.R.L.',
    cui: 'RO 18547290',
    telefon: '021 123 45 67',
    email: 'contabilitate@exemplu.ro',
    sediu: {
      strada: 'Bd. Ștefan cel Mare',
      nr: '14',
      codPostal: '020121',
      bloc: 'A2',
      scara: '1',
      etaj: '3',
      apartament: '12',
      localitate: 'București',
      judet: 'Sector 2',
      tara: 'România',
    },
    corespondenta: { ...base.contribuabil.corespondenta },
    comunicareEmail: 'da',
  },
  cladire: {
    ...base.cladire,
    tip: 'mixta',
    nrAct: '1234/2023',
    dataDobandirii: '2023-03-15',
    valoareAchizitie: '1.250.000,00',
    formaDobandire: 'proprietate',
    adresa: { ...base.cladire.adresa, strada: 'Șos. Mihai Bravu', nr: '200', localitate: 'Sector 2' },
    indicatori: {
      ...base.cladire.indicatori,
      d: { rez: { valoare: '750.000', data: '2023-03-15' }, nerez: { valoare: '500000,50', data: '2023-03-15' } },
    },
  },
  anexe: [{ denumire: 'Contract de vânzare-cumpărare nr. 1234/2023' }, { denumire: 'Certificat de înregistrare' }],
  actIdentitate: { tip: 'CI', serie: 'RX', numar: '123456', eliberatDe: 'SPCEP Sector 2', data: '2020-05-10' },
  dataDeclaratiei: '2026-10-30',
}
