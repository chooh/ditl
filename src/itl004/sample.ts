import { todayIso } from '../form/common'
import { emptyParcel, type DeclarationInput } from './schema'

/**
 * Вымышленные данные: место на подземной парковке и доля земли под зданием.
 * CUI, CNP и IBAN проходят проверку контрольных цифр; в реальных декларациях не использовать.
 */
export function sampleDeclaration(): DeclarationInput {
  const parcel = emptyParcel()
  return {
    antet: { rolNominal: '' },
    reprezentant: {
      nume: 'Ion-Mihăiță Popescu',
      cnp: '1800101221144',
      domiciliu: {
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
    actIdentitate: { tip: 'CI', serie: 'RX', numar: '123456' },
    contribuabil: {
      denumire: 'Exemplu Construcții Țărănești S.R.L.',
      cui: 'RO18547290',
      telefon: '021 123 45 67',
      fax: '',
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
      comunicareEmail: 'da',
      registruComertului: 'ONRC București',
      nrRegistruComertului: 'J40/1234/2006',
      iban: 'RO49 AAAA 1B31 0075 9384 0000',
      banca: 'Banca Exemplu S.A.',
    },
    terenuri: [
      {
        ...parcel,
        dataDobandirii: '2023-03-15',
        nrAct: '1234/2023',
        dataAct: '2023-03-15',
        forma: 'dobandit',
        localitate: 'București',
        satSector: '2',
        strada: 'Șos. Mihai Bravu',
        nr: '200',
        cota: '12,50/1000',
        coproprietari: 'ceilalți proprietari ai imobilului din Șos. Mihai Bravu nr. 200',
        parcela: 'Șos. Mihai Bravu nr. 200, Sector 2, CF nr. 212345',
        intravilan: 'I',
        suprafete: { ...parcel.suprafete, constructii: '15,20' },
        rang: '0',
        zona: 'A',
      },
    ],
    scutire: { cota: '', calitate: '', documente: '' },
    anexe: ['Contract de vânzare-cumpărare nr. 1234/2023', 'Extras de carte funciară', 'Certificat de înregistrare ONRC'].map((denumire) => ({ denumire })),
    semnatari: { director: 'Ion-Mihăiță Popescu', sefContabil: 'Maria Ionescu' },
    dataDeclaratiei: todayIso(),
  }
}
