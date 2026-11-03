import { emptyDeclaration, todayIso, type DeclarationInput } from './schema'

/**
 * Вымышленные данные, заполняющие все поля бланка, — чтобы посмотреть, как выглядит
 * готовый PDF. CUI и CNP подобраны так, чтобы проходить проверку контрольной цифры;
 * принадлежат ли они кому-то, не проверялось — в реальных декларациях не использовать.
 */
export function sampleDeclaration(): DeclarationInput {
  const base = emptyDeclaration()
  return {
    antet: { rolNominal: '123456789', registruTip: 'II', registruVolum: '12', registruPozitie: '345' },
    contribuabil: {
      denumire: 'Exemplu Construcții Țărănești S.R.L.',
      cui: 'RO18547290',
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
      corespondenta: {
        ...base.contribuabil.corespondenta,
        strada: 'Str. Viitorului',
        nr: '7',
        codPostal: '020613',
        bloc: 'B',
        scara: '2',
        etaj: '4',
        apartament: '41',
        localitate: 'București',
      },
      comunicareEmail: 'da',
    },
    imputernicit: {
      exista: true,
      nume: 'Popescu',
      prenume: 'Ion-Mihăiță',
      cif: '1800101221144',
      telefon: '0722 123 456',
      email: 'ion.popescu@exemplu.ro',
      adresa: {
        strada: 'Str. Lizeanu',
        nr: '21',
        codPostal: '020232',
        bloc: 'C3',
        scara: 'A',
        etaj: '2',
        apartament: '9',
        localitate: 'București',
        judet: 'Sector 2',
        tara: 'România',
      },
    },
    adresaStrainatate: 'Rue de la Paix 12, 75002 Paris, Franța',
    cladire: {
      tip: 'mixta',
      nrAct: '1234/2023',
      dataDobandirii: '2023-03-15',
      valoareAchizitie: '1.250.000,00',
      formaDobandire: 'proprietate',
      formaAlta: '',
      adresa: { ...base.cladire.adresa, strada: 'Șos. Mihai Bravu', nr: '200', bloc: 'P1', scara: 'B', etaj: '5', apartament: '18', localitate: 'Sector 2' },
      indicatori: {
        a: { rez: { valoare: '700.000', data: '2024-01-15' }, nerez: { valoare: '480.000', data: '2024-01-15' } },
        b: { rez: { valoare: '760.500,50', data: '2025-06-30' }, nerez: { valoare: '520.000', data: '2025-06-30' } },
        c: { rez: { valoare: '', data: '' }, nerez: { valoare: '', data: '' } },
        d: { rez: { valoare: '750.000', data: '2023-03-15' }, nerez: { valoare: '500.000', data: '2023-03-15' } },
        e: { rez: { valoare: '745.210,35', data: '2025-12-31' }, nerez: { valoare: '498.300', data: '2025-12-31' } },
      },
    },
    anexe: [
      'Contract de vânzare-cumpărare nr. 1234/2023',
      'Încheiere de intabulare',
      'Extras de carte funciară',
      'Raport de evaluare nr. 56/2025',
      'Certificat de înregistrare ONRC',
      'Proces-verbal de recepție',
      'Balanța de verificare la 31.12.2025',
      'Împuternicire notarială',
      'Copie act de identitate împuternicit',
    ].map((denumire) => ({ denumire })),
    actIdentitate: { tip: 'CI', serie: 'RX', numar: '123456', eliberatDe: 'SPCEP Sector 2', data: '2020-05-10' },
    dataDeclaratiei: todayIso(),
  }
}
