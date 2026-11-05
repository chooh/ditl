import { todayIso } from '../form/common'
import { emptyDeed, emptyDossier, emptyProperty, type DossierInput, type PropertyInput } from './schema'

const names = (...list: string[]) => list.map((name) => ({ name }))

/** Объект досье: пустой объект с переопределёнными частями. */
type Land = PropertyInput['land']

function property(
  deedId: string,
  patch: {
    address: Partial<PropertyInput['address']>
    agriculturalRegister?: PropertyInput['agriculturalRegister']
    building: Partial<PropertyInput['building']>
    land: Partial<Omit<Land, 'areas'>> & { areas: Partial<Land['areas']> }
    attachments?: string[]
  },
): PropertyInput {
  const base = emptyProperty(deedId)
  return {
    ...base,
    address: { ...base.address, ...patch.address },
    agriculturalRegister: patch.agriculturalRegister ?? base.agriculturalRegister,
    building: { ...base.building, ...patch.building },
    land: { ...base.land, ...patch.land, areas: { ...base.land.areas, ...patch.land.areas } },
    attachments: patch.attachments ? names(...patch.attachments) : base.attachments,
  }
}

const cell = (value: string, date: string) => ({ value, date })
const none = () => cell('', '')

/**
 * Вымышленное досье, заполняющее все поля бланков: два договора купли-продажи,
 * по первому — квартира и парковочное место в одном доме, по второму — офис.
 * CUI, CNP и IBAN проходят проверку контрольных цифр; в реальных декларациях не использовать.
 */
export function sampleDossier(): DossierInput {
  const base = emptyDossier()
  const first = { ...emptyDeed('deed-1'), number: '1234/2023', date: '2023-03-15', form: 'ownership' }
  const second = { ...emptyDeed('deed-2'), number: '567/2024', date: '2024-09-02', acquiredOn: '2024-09-10', form: 'ownership' }
  const mihaiBravu = { street: 'Șos. Mihai Bravu', number: '200', block: 'P1', entrance: 'B', locality: 'București', district: 'Sector 2' }

  return {
    company: {
      name: 'Exemplu Construcții Țărănești S.R.L.',
      taxId: 'RO18547290',
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
        locality: 'București',
        county: 'Sector 2',
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
        locality: 'București',
      },
      foreignResidence: 'Rue de la Paix 12, 75002 Paris, Franța',
      tradeRegister: { office: 'ONRC București', number: 'J40/1234/2006' },
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
        locality: 'București',
        county: 'Sector 2',
        country: 'România',
      },
      idDocument: { type: 'CI', series: 'RX', number: '123456', issuedBy: 'SPCEP Sector 2', issuedOn: '2020-05-10', validTill: '2030-05-10' },
    },
    director: 'Ion-Mihăiță Popescu',
    chiefAccountant: 'Maria Ionescu',
    deeds: [
      { ...first, attachments: names('Contract de vânzare-cumpărare nr. 1234/2023', 'Încheiere de intabulare') },
      { ...second, attachments: names('Contract de vânzare-cumpărare nr. 567/2024') },
    ],
    properties: [
      property('deed-1', {
        address: { ...mihaiBravu, floor: '5', apartment: '18' },
        agriculturalRegister: { period: '2020–2024', type: 'II', volume: '12', position: '345' },
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
          areas: { builtUp: '15,20' },
          rank: '0',
          zone: 'A',
        },
        attachments: ['Extras de carte funciară nr. 212345-C1-U18', 'Raport de evaluare nr. 56/2025'],
      }),
      property('deed-1', {
        address: { ...mihaiBravu, floor: '-2', apartment: 'P14' },
        building: {
          type: 'nonResidential',
          purchaseValue: '45.000,00',
          values: { ...base.properties[0]!.building.values, d: { residential: none(), nonResidential: cell('45.000', '2023-03-15') } },
        },
        land: { share: '1,20/1000', parcel: 'Șos. Mihai Bravu nr. 200, Sector 2, CF nr. 212345-C1-U214', zoning: 'I', areas: { builtUp: '1,46' }, rank: '0', zone: 'A' },
        attachments: ['Extras de carte funciară nr. 212345-C1-U214'],
      }),
      property('deed-2', {
        address: { street: 'Str. Fabrica de Glucoză', number: '11', block: 'C', floor: '3', apartment: '7', locality: 'București', district: 'Sector 2' },
        building: {
          type: 'nonResidential',
          purchaseValue: '380.000,00',
          values: { ...base.properties[0]!.building.values, d: { residential: none(), nonResidential: cell('380.000', '2024-09-02') } },
        },
        land: { share: '3,80/1000', zoning: 'I', areas: { builtUp: '6,10' }, rank: '0', zone: 'B' },
      }),
    ],
    exemption: { share: '', capacity: '', documents: '' },
    attachments: names('Certificat de înregistrare ONRC', 'Împuternicire notarială', 'Copie act de identitate împuternicit'),
    declarationDate: todayIso(),
  }
}
