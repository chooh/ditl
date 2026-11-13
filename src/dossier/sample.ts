import { todayIso } from '../form/common'
import { emptyDossier, type DossierInput } from './schema'

const names = (...list: string[]) => list.map((name) => ({ name }))
const cell = (value: string, date: string) => ({ value, date })
const none = () => cell('', '')

/**
 * Вымышленное досье, заполняющее все поля бланков: квартира со смешанным назначением,
 * купленная по договору купли-продажи. CUI, CNP и IBAN проходят проверку контрольных
 * цифр; в реальных декларациях не использовать.
 */
export function sampleDossier(): DossierInput {
  const base = emptyDossier()

  return {
    company: {
      name: 'Exemplu Construcții Țărănești S.R.L.',
      taxId: 'RO18547290',
      uniqueId: '18547290',
      phone: '021 123 45 67',
      fax: '021 123 45 68',
      email: 'contabilitate@exemplu.ro',
      emailOnly: 'yes',
      seat: {
        street: 'Bd. Ștefan cel Mare',
        number: '14',
        postalCode: '020121',
        block: 'A2',
        entrance: '1',
        floor: '3',
        apartment: '12',
        county: 'București',
        locality: 'București',
        district: 'Sector 2',
        country: 'România',
      },
      correspondence: {
        ...base.company.correspondence,
        street: 'Str. Viitorului',
        number: '7',
        postalCode: '020613',
        block: 'B',
        entrance: '2',
        floor: '4',
        apartment: '41',
        county: 'București',
        locality: 'București',
        district: 'Sector 2',
      },
      foreignResidence: 'Rue de la Paix 12, 75002 Paris, Franța',
      tradeRegister: { office: 'ONRC București', number: 'J2006001234400' },
      bank: { iban: 'RO49 AAAA 1B31 0075 9384 0000', name: 'Banca Exemplu S.A.' },
    },
    signatory: {
      role: 'proxy',
      firstName: 'Ion-Mihăiță',
      lastName: 'Popescu',
      personalId: '1800101221144',
      phone: '0722 123 456',
      email: 'ion.popescu@exemplu.ro',
      address: {
        street: 'Str. Lizeanu',
        number: '21',
        postalCode: '020232',
        block: 'C3',
        entrance: 'A',
        floor: '2',
        apartment: '9',
        county: 'București',
        locality: 'București',
        district: 'Sector 2',
        country: 'România',
      },
      idDocument: { type: 'CI', series: 'RX', number: '123456', issuedBy: 'SPCEP Sector 2', issuedOn: '2020-05-10', validTill: '2030-05-10' },
    },
    director: 'Ion-Mihăiță Popescu',
    chiefAccountant: 'Maria Ionescu',
    deed: { number: '1234/2023', date: '2023-03-15', acquiredOn: '', form: 'ownership', formOther: '' },
    property: {
      address: { street: 'Șos. Mihai Bravu', number: '200', block: 'P1', entrance: 'B', floor: '5', apartment: '18', locality: 'București', district: 'Sector 2' },
      building: {
        type: 'mixed',
        purchaseValue: '1.250.000,00',
        values: {
          a: { residential: cell('700.000', '2024-01-15'), nonResidential: cell('480.000', '2024-01-15') },
          b: { residential: cell('760.500,50', '2025-06-30'), nonResidential: cell('520.000', '2025-06-30') },
          c: { residential: none(), nonResidential: none() },
          d: { residential: cell('750.000', '2023-03-15'), nonResidential: cell('500.000', '2023-03-15') },
          e: { residential: cell('745.210,35', '2025-12-31'), nonResidential: cell('498.300', '2025-12-31') },
        },
      },
      land: {
        share: '12,50/1000',
        coOwners: 'ceilalți proprietari ai imobilului din Șos. Mihai Bravu nr. 200',
        parcel: 'Șos. Mihai Bravu nr. 200, Sector 2, CF nr. 212345-C1-U18',
        zoning: 'I',
        areas: { ...base.property.land.areas, builtUp: '15,20' },
        rank: '0',
        zone: 'A',
      },
    },
    exemption: { share: '', capacity: '', documents: '' },
    attachments: names(
      'Certificat de înregistrare ONRC',
      'Împuternicire notarială',
      'Copie act de identitate împuternicit',
      'Contract de vânzare-cumpărare nr. 1234/2023',
      'Încheiere de intabulare',
      'Extras de carte funciară nr. 212345-C1-U18',
      'Raport de evaluare nr. 56/2025',
    ),
    declarationDate: todayIso(),
  }
}
