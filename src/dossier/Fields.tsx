import { Accordion, AccordionItem, Button, RadioButton, RadioButtonGroup } from '@carbon/react'
import { Fragment, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { LocalityPicker } from '../address/LocalityPicker'
import { AddressFields, AttachmentsFields, DISTRICT_TIP, ErrorText, RadioGroup, TextField } from '../form/fields'
import { Section, SubStep, useSections } from '../form/sections'
import { allowedUses, fullName, VALUE_SOURCES, type DossierInput, type LandCategory, type Use, type ValueSource } from './schema'

/** Поля досье: фирма, подписант, акт, объект и то, что относится к обеим декларациям. */
export function Fields() {
  return (
    <>
      <Section id="company">
        <CompanySection />
      </Section>
      <Section id="signatory">
        <SignatorySection />
      </Section>
      <Section id="deed">
        <SubStep id="deed">
          <DeedFields />
        </SubStep>
      </Section>
      <Section id="property">
        <PropertySection />
      </Section>
      <Section id="exemption">
        <SubStep id="exemption">
          <ExemptionFields />
        </SubStep>
      </Section>
      <Section id="attachments">
        <SubStep id="attachments">
          <p className="hint">
            Copii ale documentelor, certificate de conformitate cu originalul (art. 64 alin. (5) din Legea nr. 207/2015), care se
            anexează la ambele declarații — de exemplu contractul, extrasul de carte funciară, certificatul ONRC sau împuternicirea.
          </p>
          <AttachmentsFields name="attachments" label="Anexe" />
        </SubStep>
      </Section>
      <Section id="signatures">
        <SubStep id="signatures">
          <SignaturesFields />
        </SubStep>
      </Section>
    </>
  )
}

function CompanySection() {
  return (
    <>
      <SubStep id="identity">
        <div className="grid">
          <TextField name="company.name" label="Denumire contribuabil" wide autoComplete="organization" />
          <TextField
            name="company.uniqueId"
            label="CUI"
            inputMode="numeric"
            placeholder="12345678"
            autoComplete="off"
            tip="Codul unic de identificare — numărul din certificatul de înregistrare ONRC (fără RO). Ultima cifră este cifra de control."
          />
          <TextField
            name="company.taxId"
            label="CIF"
            placeholder="RO12345678"
            autoComplete="off"
            tip="Codul de identificare fiscală — CUI-ul cu prefixul RO, dacă firma este plătitoare de TVA. Altfel, scrieți același număr ca la CUI."
          />
          <TextField
            name="company.tradeRegister.office"
            label="Registrul comerțului"
            placeholder="ONRC București"
            autoComplete="off"
          />
          <TextField
            name="company.tradeRegister.number"
            label="Nr. de ordine în registrul comerțului"
            placeholder="J2026123456002"
            autoComplete="off"
            tip="Exact ca în certificatul de înregistrare ONRC."
          />
        </div>
      </SubStep>

      <SubStep id="contact">
        <div className="grid">
          <TextField name="company.phone" label="Telefon" type="tel" autoComplete="section-seat tel" />
          <TextField name="company.fax" label="Fax" type="tel" autoComplete="off" />
          <TextField name="company.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-seat email" />
        </div>
        <RadioGroup
          name="company.emailOnly"
          legend="Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică"
          options={[
            ['yes', 'DA'],
            ['no', 'NU'],
          ]}
          tip="La DA, adresa de e-mail devine obligatorie."
        />
      </SubStep>

      <SubStep id="bank">
        <div className="grid">
          <TextField
            name="company.bank.iban"
            label="Cont IBAN"
            wide
            autoComplete="off"
            placeholder="RO49 AAAA 1B31 0075 9384 0000"
            tip="24 de caractere, începe cu RO. Spațiile sunt eliminate automat."
          />
          <TextField name="company.bank.name" label="Deschis la" placeholder="Banca" wide autoComplete="off" />
        </div>
      </SubStep>

      <SubStep id="seat">
        <AddressFields
          prefix="company.seat"
          section="seat"
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'county', 'locality', 'district', 'country']}
        />
      </SubStep>

      <SubStep id="other">
        <h4 className="subheading">Adresa de corespondență</h4>
        <p className="hint">ITL 002. Completați doar dacă diferă de sediu.</p>
        <AddressFields
          prefix="company.correspondence"
          section="correspondence"
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'county', 'locality', 'district']}
        />

        <h4 className="subheading">Adresa de rezidență în alt stat decât România</h4>
        <div className="grid">
          <TextField name="company.foreignResidence" label="Adresa (dacă este cazul)" wide autoComplete="off" />
        </div>
      </SubStep>
    </>
  )
}

function SignatorySection() {
  return (
    <>
      <SubStep id="person">
        <p className="hint">Persoana care semnează declarațiile în numele contribuabilului („Subsemnatul…”).</p>
        <RadioGroup
          name="signatory.role"
          legend="Semnează în calitate de"
          options={[
            ['representative', 'Reprezentant legal'],
            ['proxy', 'Împuternicit (secțiunea II din ITL 002)'],
          ]}
          tip="Împuternicitul semnează pe baza unei împuterniciri — adăugați-o la etapa „Anexe”."
        />
        <div className="grid">
          <TextField name="signatory.lastName" label="Numele" autoComplete="section-signatory family-name" />
          <TextField name="signatory.firstName" label="Prenumele" autoComplete="section-signatory given-name" />
          <TextField
            name="signatory.personalId"
            label="CNP"
            inputMode="numeric"
            autoComplete="off"
            tip="Codul numeric personal, 13 cifre. Obligatoriu pentru împuternicit; ultima cifră este cifra de control."
          />
          <TextField name="signatory.phone" label="Telefon" type="tel" autoComplete="section-signatory tel" />
          <TextField name="signatory.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-signatory email" />
        </div>
      </SubStep>

      <SubStep id="id">
        <div className="grid">
          <TextField
            name="signatory.idDocument.type"
            label="Tipul actului de identitate"
            list="id-types"
            autoComplete="off"
            tip="Alegeți din listă (CI, BI, Pașaport) sau scrieți tipul actului."
          />
          <TextField name="signatory.idDocument.series" label="Seria" autoComplete="off" />
          <TextField name="signatory.idDocument.number" label="Numărul" autoComplete="off" />
          <TextField name="signatory.idDocument.issuedBy" label="Eliberat de" wide autoComplete="off" />
          <TextField name="signatory.idDocument.issuedOn" label="La data de" type="date" autoComplete="off" />
          <TextField
            name="signatory.idDocument.validTill"
            label="Valabil până la"
            type="date"
            autoComplete="off"
            helperText="gol — valabil nelimitat"
            tip="Actul trebuie să fie valabil la data declarațiilor. Lăsați gol dacă este valabil nelimitat."
          />
          <datalist id="id-types">
            <option value="CI" />
            <option value="BI" />
            <option value="Pașaport" />
          </datalist>
        </div>
      </SubStep>

      <SubStep id="address">
        <AddressFields
          prefix="signatory.address"
          section="signatory"
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'county', 'locality', 'district', 'country']}
        />
      </SubStep>
    </>
  )
}

const ACQUISITION_OPTIONS = [
  ['ownership', 'Proprietate (dobândit)'],
  ['lease', 'Închiriere'],
  ['concession', 'Concesiune'],
  ['administration', 'Administrare'],
  ['use', 'Folosință'],
  ['other', 'Alte modalități'],
] as const

function DeedFields() {
  const form = useWatch<DossierInput, 'deed.form'>({ name: 'deed.form' })
  return (
    <>
      <p className="hint">Contractul de vânzare-cumpărare sau alt act prin care firma a dobândit imobilul.</p>
      <div className="grid">
        <TextField name="deed.number" label="Nr. act" autoComplete="off" tip="Numărul contractului sau al actului, de exemplu 1234/2023." />
        <TextField name="deed.date" label="Data actului" type="date" autoComplete="off" />
        <TextField
          name="deed.acquiredOn"
          label="Data dobândirii (dacă diferă)"
          type="date"
          autoComplete="off"
          tip="Doar dacă imobilul a fost dobândit la altă dată decât data actului. Necompletat — se folosește data actului."
        />
      </div>
      <RadioGroup name="deed.form" legend="Forma de dobândire" options={ACQUISITION_OPTIONS} />
      {form === 'other' && (
        <div className="grid">
          <TextField name="deed.formOther" label="Alte modalități — precizați" wide autoComplete="off" />
        </div>
      )}
    </>
  )
}

/** Четыре экрана объекта: адрес, здание, стоимость, земля. */
function PropertySection() {
  return (
    <>
      <SubStep id="address">
        <p className="hint">Din datele imobilului se generează o declarație ITL 002 (clădirea) și o declarație ITL 004 (terenul aferent).</p>
        <div className="grid">
          <TextField name="property.address.street" label="Strada" wide autoComplete="off" />
          <TextField name="property.address.number" label="Nr." autoComplete="off" />
          <TextField name="property.address.block" label="Bloc" autoComplete="off" />
          <TextField name="property.address.entrance" label="Scara" autoComplete="off" />
          <TextField name="property.address.floor" label="Etaj" autoComplete="off" />
          <TextField name="property.address.apartment" label="Ap." autoComplete="off" />
          <LocalityPicker prefix="property.address" withCounty={false} />
          <TextField name="property.address.locality" label="Municipiul / orașul / comuna" autoComplete="off" />
          <TextField name="property.address.district" label="Satul / sectorul" autoComplete="off" tip={DISTRICT_TIP} />
        </div>
      </SubStep>
      <SubStep id="building">
        <BuildingFields />
      </SubStep>
      <SubStep id="values">
        <ValueTable />
      </SubStep>
      <SubStep id="land">
        <LandFields />
      </SubStep>
    </>
  )
}

function BuildingFields() {
  const p = 'property.building'
  return (
    <>
      <RadioGroup
        name={`${p}.type`}
        legend="Tipul clădirii"
        options={[
          ['nonResidential', 'Nerezidențială'],
          ['residential', 'Rezidențială'],
          ['mixed', 'Mixtă'],
        ]}
        tip="Rezidențială — locuință; nerezidențială — birou, spațiu comercial, parcare; mixtă — ambele."
      />
      <div className="grid">
        <TextField
          name={`${p}.purchaseValue`}
          label="Valoare achiziție (lei)"
          inputMode="decimal"
          placeholder="125.000,00"
          autoComplete="off"
          tip="Prețul din contractul de dobândire, în lei."
        />
      </div>
    </>
  )
}

const VALUE_LABELS: Record<ValueSource, string> = {
  a: 'a) înregistrată în evidențele organului fiscal',
  b: 'b) rezultată dintr-un raport de evaluare',
  c: 'c) a lucrărilor de construcții, în cazul clădirilor nou construite',
  d: 'd) de achiziție',
  e: 'e) înscrisă în contabilitatea proprietarului clădirii și comunicată concesionarului, locatarului, titularului dreptului de administrare sau de folosință',
}
const USE_LABELS: Record<Use, string> = { residential: 'Rezidențial', nonResidential: 'Nerezidențial' }

/** Таблица «Indicator»: показываются только колонки, относящиеся к выбранному типу здания. */
function ValueTable() {
  const type = useWatch<DossierInput, 'property.building.type'>({ name: 'property.building.type' })
  const sections = useSections()
  const uses = allowedUses(type)
  if (uses.length === 0) {
    return (
      <div>
        <p className="hint">Alegeți mai întâi tipul clădirii — de el depind valorile care se declară.</p>
        <Button kind="tertiary" size="md" onClick={() => sections.goSub('building')}>
          Alege tipul clădirii
        </Button>
      </div>
    )
  }

  return (
    <>
      <p className="hint">Valoarea clădirii: completați valoarea și data documentului pentru indicatorii aplicabili.</p>
      {VALUE_SOURCES.map((col) => (
        <div key={col} className="indicator">
          <p className="indicator-label">{VALUE_LABELS[col]}</p>
          <div className="grid">
            {uses.map((use) => {
              const suffix = uses.length > 1 ? ` — ${USE_LABELS[use].toLowerCase()}` : ''
              const cell = `property.building.values.${col}.${use}` as const
              return (
                <Fragment key={use}>
                  <TextField name={`${cell}.value`} label={`Valoare (lei)${suffix}`} inputMode="decimal" autoComplete="off" />
                  <TextField name={`${cell}.date`} label={`Data documentului${suffix}`} type="date" autoComplete="off" />
                </Fragment>
              )
            })}
          </div>
        </div>
      ))}
      <ErrorText name="property.building.values" />
    </>
  )
}

/** Колонки таблицы площадей; первая — у квартир, офисов и парковок почти всегда единственная. */
const CATEGORY_LABELS: Record<LandCategory, string> = {
  builtUp: 'Terenuri cu construcții',
  arable: 'Arabil',
  pasture: 'Pășune',
  hayfield: 'Fânață',
  vineyardBearing: 'Vie — intrată pe rod',
  vineyardYoung: 'Vie — neintrată pe rod',
  orchardBearing: 'Livadă — intrată pe rod',
  orchardYoung: 'Livadă — neintrată pe rod',
  forestYoung: 'Pădure — până în 20 de ani / cu rol de protecție',
  forestOld: 'Pădure — peste 20 de ani',
  waterFishFarm: 'Terenuri cu ape — cu amenajare piscicolă',
  water: 'Terenuri cu ape — fără amenajare piscicolă',
  roadsFree: 'Drumuri și căi ferate — liber',
  roadsOccupied: 'Drumuri și căi ferate — ocupat',
  unproductive: 'Terenuri neproductive',
}
const OTHER_CATEGORIES = (Object.keys(CATEGORY_LABELS) as LandCategory[]).filter((k) => k !== 'builtUp')

function LandFields() {
  const p = 'property.land'
  const areas = useWatch<DossierInput, 'property.land.areas'>({ name: 'property.land.areas' })
  // Остальные категории свёрнуты, пока ни одна из них не заполнена.
  const otherFilled = OTHER_CATEGORIES.some((k) => areas?.[k]?.trim())

  return (
    <>
      <div className="grid">
        <TextField
          name={`${p}.share`}
          label="Cota de proprietate"
          placeholder="ex. 12,50/1000"
          autoComplete="off"
          tip="Cota-parte din teren care revine firmei, din contract sau din extrasul de carte funciară."
        />
        <TextField name={`${p}.coOwners`} label="Coproprietari" wide autoComplete="off" />
        <TextField name={`${p}.parcel`} label="Parcela / adresa (în tabel)" wide placeholder="Dacă lipsește, se tipărește adresa imobilului" autoComplete="off" />
      </div>
      <RadioGroup
        name={`${p}.zoning`}
        legend="Terenul este situat"
        options={[
          ['I', 'Intravilan'],
          ['E', 'Extravilan'],
        ]}
        tip="Intravilan — în interiorul localității. În București, de regulă, intravilan."
      />
      <div className="grid">
        <TextField
          name={`${p}.areas.builtUp`}
          label={`${CATEGORY_LABELS.builtUp} (m²)`}
          inputMode="decimal"
          autoComplete="off"
          tip="Suprafața de teren care revine firmei. Pentru apartamente și birouri, de regulă se completează doar această categorie."
        />
        <TextField name={`${p}.rank`} label="Rangul localității" placeholder="București: 0" autoComplete="off" tip="Pentru București rangul este 0." />
        <TextField name={`${p}.zone`} label="Zona" placeholder="A–D" autoComplete="off" tip="Zona stabilită de consiliul local (A–D). O puteți afla de la DGITL." />
      </div>
      <Accordion className="categories">
        <AccordionItem title="Alte categorii de folosință (m²)" open={otherFilled}>
          <div className="grid">
            {OTHER_CATEGORIES.map((k) => (
              <TextField key={k} name={`${p}.areas.${k}`} label={CATEGORY_LABELS[k]} inputMode="decimal" autoComplete="off" />
            ))}
          </div>
        </AccordionItem>
      </Accordion>
      <ErrorText name={`${p}.areas`} />
    </>
  )
}

const EXEMPTION_FIELDS = ['share', 'capacity', 'documents'] as const

/** Скидка бывает редко: сначала вопрос «да/нет», поля — только при «да». «Нет» очищает их. */
function ExemptionFields() {
  const { getValues, setValue } = useFormContext<DossierInput>()
  const [applies, setApplies] = useState(() => EXEMPTION_FIELDS.some((k) => getValues(`exemption.${k}`)))
  const answer = (yes: boolean) => {
    setApplies(yes)
    if (!yes) for (const k of EXEMPTION_FIELDS) setValue(`exemption.${k}`, '', { shouldDirty: true, shouldValidate: true })
  }
  return (
    <>
      <p className="hint">ITL 004: „Beneficiez de scutire/reducere de la plata impozitului pe teren…” — completați doar dacă este cazul.</p>
      <RadioButtonGroup
        className="radio-group"
        name="exemption-applies"
        legendText="Firma beneficiază de scutire sau reducere la impozitul pe teren?"
        valueSelected={applies ? 'yes' : 'no'}
        onChange={(value) => answer(value === 'yes')}
      >
        <RadioButton id="exemption-no" value="no" labelText="Nu" />
        <RadioButton id="exemption-yes" value="yes" labelText="Da" />
      </RadioButtonGroup>
      <div className="grid" hidden={!applies}>
        <TextField name="exemption.share" label="În cotă de" autoComplete="off" />
        <TextField name="exemption.capacity" label="În calitate de" autoComplete="off" />
        <TextField name="exemption.documents" label="Conform documentelor anexate" wide autoComplete="off" />
      </div>
    </>
  )
}

function SignaturesFields() {
  const signatory = useWatch<DossierInput, 'signatory'>({ name: 'signatory' })
  return (
    <>
      <div className="grid">
        <TextField
          name="declarationDate"
          label="Data declarațiilor"
          type="date"
          autoComplete="off"
          tip="De obicei, data la care depuneți declarațiile."
        />
        <TextField
          name="director"
          label="Director P.J."
          helperText="Prenumele și numele"
          placeholder={fullName(signatory) || 'Semnatarul'}
          autoComplete="off"
          tip="Dacă nu completați, în ITL 004 se tipărește semnatarul."
        />
        <TextField name="chiefAccountant" label="Șef compartiment contabil" helperText="Prenumele și numele" autoComplete="off" />
      </div>
      <p className="hint">
        ITL 004: dacă directorul nu este completat, se tipărește semnatarul. Numele se tipăresc deasupra semnăturilor; semnăturile și
        ștampila se aplică de mână.
      </p>
    </>
  )
}
