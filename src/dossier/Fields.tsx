import { Accordion, AccordionItem, Button, FormGroup, Select, SelectItem } from '@carbon/react'
import { Add, TrashCan } from '@carbon/icons-react'
import { Fragment } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AddressFields, AttachmentsFields, ErrorText, RadioGroup, TextField } from '../form/fields'
import { Section } from '../form/sections'
import { formatDate } from '../pdf/format'
import {
  allowedUses,
  emptyDeed,
  fullName,
  nextProperty,
  VALUE_SOURCES,
  type DossierInput,
  type LandCategory,
  type Use,
  type ValueSource,
} from './schema'

/** Поля досье: фирма, подписант, акты, объекты и то, что относится ко всем декларациям. */
export function Fields() {
  return (
    <Accordion size="lg">
      <Section id="company">
        <CompanySection />
      </Section>
      <Section id="signatory">
        <SignatorySection />
      </Section>
      <Section id="deeds">
        <DeedsSection />
      </Section>
      <Section id="properties">
        <PropertiesSection />
      </Section>
      <Section id="exemption">
        <p className="hint">ITL 004: „Beneficiez de scutire/reducere de la plata impozitului pe teren…” — completați doar dacă este cazul.</p>
        <div className="grid">
          <TextField name="exemption.share" label="În cotă de" autoComplete="off" />
          <TextField name="exemption.capacity" label="În calitate de" autoComplete="off" />
          <TextField name="exemption.documents" label="Conform documentelor anexate" wide autoComplete="off" />
        </div>
      </Section>
      <Section id="attachments">
        <p className="hint">
          Copii ale documentelor, certificate de conformitate cu originalul (art. 64 alin. (5) din Legea nr. 207/2015), care se
          anexează la fiecare declarație — de exemplu certificatul ONRC sau împuternicirea. Documentele unui act sau ale unui imobil
          se adaugă la actul, respectiv la imobilul respectiv.
        </p>
        <AttachmentsFields name="attachments" label="Anexe comune" />
      </Section>
      <Section id="signatures">
        <SignaturesSection />
      </Section>
    </Accordion>
  )
}

function CompanySection() {
  return (
    <>
      <div className="grid">
        <TextField name="company.name" label="Denumire contribuabil" wide autoComplete="organization" />
        <TextField name="company.taxId" label="Cod de identificare fiscală (CUI)" inputMode="numeric" placeholder="RO12345678" autoComplete="off" />
        <TextField name="company.taxRoll" label="Rol nominal unic (dacă îl cunoașteți)" autoComplete="off" />
        <TextField name="company.phone" label="Telefon" type="tel" autoComplete="section-seat tel" />
        <TextField name="company.fax" label="Fax" type="tel" autoComplete="off" />
        <TextField name="company.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-seat email" />
        <TextField name="company.tradeRegister.office" label="Înregistrat la registrul comerțului" placeholder="ONRC București" autoComplete="off" />
        <TextField name="company.tradeRegister.number" label="La nr." placeholder="J40/1234/2006" autoComplete="off" />
        <TextField name="company.bank.iban" label="Cont IBAN" wide autoComplete="off" />
        <TextField name="company.bank.name" label="Deschis la" placeholder="Banca" wide autoComplete="off" />
      </div>

      <h2 className="subheading">Sediul</h2>
      <AddressFields
        prefix="company.seat"
        section="seat"
        fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality', 'county', 'country']}
      />

      <h2 className="subheading">Adresa de corespondență</h2>
      <p className="hint">ITL 002. Completați doar dacă diferă de sediu.</p>
      <AddressFields
        prefix="company.correspondence"
        section="correspondence"
        fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality']}
      />

      <h2 className="subheading">Adresa de rezidență în alt stat decât România</h2>
      <div className="grid">
        <TextField name="company.foreignResidence" label="Adresa (dacă este cazul)" wide autoComplete="off" />
      </div>

      <RadioGroup
        name="company.emailOnly"
        legend="Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică"
        options={[
          ['yes', 'DA'],
          ['no', 'NU'],
        ]}
      />
    </>
  )
}

function SignatorySection() {
  return (
    <>
      <p className="hint">Persoana care semnează declarațiile în numele contribuabilului („Subsemnatul…”).</p>
      <RadioGroup
        name="signatory.role"
        legend="Semnează în calitate de"
        options={[
          ['representative', 'Reprezentant legal'],
          ['proxy', 'Împuternicit (secțiunea II din ITL 002)'],
        ]}
      />
      <div className="grid">
        <TextField name="signatory.lastName" label="Numele" autoComplete="section-signatory family-name" />
        <TextField name="signatory.firstName" label="Prenumele" autoComplete="section-signatory given-name" />
        <TextField name="signatory.personalId" label="Codul numeric personal" inputMode="numeric" autoComplete="off" />
        <TextField name="signatory.phone" label="Telefon" type="tel" autoComplete="section-signatory tel" />
        <TextField name="signatory.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-signatory email" />
      </div>

      <h2 className="subheading">Actul de identitate</h2>
      <div className="grid">
        <TextField name="signatory.idDocument.type" label="Tipul actului de identitate" list="id-types" autoComplete="off" />
        <TextField name="signatory.idDocument.series" label="Seria" autoComplete="off" />
        <TextField name="signatory.idDocument.number" label="Numărul" autoComplete="off" />
        <TextField name="signatory.idDocument.issuedBy" label="Eliberat de" wide autoComplete="off" />
        <TextField name="signatory.idDocument.issuedOn" label="La data de" type="date" autoComplete="off" />
        <TextField name="signatory.idDocument.validTill" label="Valabil până la (gol — nelimitat)" type="date" autoComplete="off" />
        <datalist id="id-types">
          <option value="CI" />
          <option value="BI" />
          <option value="Pașaport" />
        </datalist>
      </div>

      <h2 className="subheading">Domiciliul</h2>
      <AddressFields
        prefix="signatory.address"
        section="signatory"
        fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality', 'county', 'country']}
      />
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

/** Номер и дата акта — для списка актов у объекта. */
const deedLabel = (deed: DossierInput['deeds'][number], i: number) =>
  [`Actul ${i + 1}`, deed.number && `nr. ${deed.number}`, deed.date && `din ${formatDate(deed.date)}`].filter(Boolean).join(' ')

function DeedsSection() {
  const { control } = useFormContext<DossierInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'deeds' })
  const deeds = useWatch<DossierInput, 'deeds'>({ name: 'deeds' })
  const properties = useWatch<DossierInput, 'properties'>({ name: 'properties' })
  return (
    <>
      <p className="hint">
        Contractele de vânzare-cumpărare și alte acte prin care au fost dobândite imobilele. Un act poate cuprinde mai multe imobile.
      </p>
      {fields.map((field, i) => {
        // Акт, на который ссылаются объекты, удалить нельзя — сначала поменять акт у объектов.
        // field.id — ключ useFieldArray, а не id акта: тот берётся из значений.
        const used = properties.flatMap((p, j) => (p.deedId === deeds[i]?.id ? [j + 1] : []))
        return (
          <FormGroup key={field.id} className="parcel" legendText={`Actul ${i + 1}`}>
            <DeedFields index={i} />
            {fields.length > 1 &&
              (used.length > 0 ? (
                <p className="hint">Actul nu poate fi șters: este folosit de imobilul {used.join(', ')}.</p>
              ) : (
                <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => remove(i)}>
                  Șterge actul {i + 1}
                </Button>
              ))}
          </FormGroup>
        )
      })}
      <ErrorText name="deeds" />
      <Button kind="tertiary" renderIcon={Add} onClick={() => append(emptyDeed())}>
        Adaugă act
      </Button>
    </>
  )
}

function DeedFields({ index: i }: { index: number }) {
  const p = `deeds.${i}` as const
  const form = useWatch<DossierInput, `deeds.${number}.form`>({ name: `${p}.form` })
  return (
    <>
      <div className="grid">
        <TextField name={`${p}.number`} label="Nr. act" autoComplete="off" />
        <TextField name={`${p}.date`} label="Data actului" type="date" autoComplete="off" />
        <TextField name={`${p}.acquiredOn`} label="Data dobândirii (dacă diferă)" type="date" autoComplete="off" />
      </div>
      <RadioGroup name={`${p}.form`} legend="Forma de dobândire" options={ACQUISITION_OPTIONS} />
      {form === 'other' && (
        <div className="grid">
          <TextField name={`${p}.formOther`} label="Alte modalități — precizați" wide autoComplete="off" />
        </div>
      )}
      <h2 className="subheading">Documente anexate pentru acest act</h2>
      <AttachmentsFields name={`${p}.attachments`} label={`Actul ${i + 1}`} />
    </>
  )
}

function PropertiesSection() {
  const { control, getValues } = useFormContext<DossierInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'properties' })
  return (
    <>
      <p className="hint">
        Pentru fiecare imobil se generează o declarație ITL 002 (clădirea); terenul aferent tuturor imobilelor intră într-o singură
        declarație ITL 004.
      </p>
      {fields.map((field, i) => (
        <FormGroup key={field.id} className="parcel" legendText={`Imobilul ${i + 1}`}>
          <PropertyFields index={i} />
          {fields.length > 1 && (
            <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => remove(i)}>
              Șterge imobilul {i + 1}
            </Button>
          )}
        </FormGroup>
      ))}
      <ErrorText name="properties" />
      <p className="hint">Imobilul nou preia actul și adresa clădirii de la imobilul anterior.</p>
      <Button
        kind="tertiary"
        renderIcon={Add}
        onClick={() => {
          const { properties, deeds } = getValues()
          append(nextProperty(properties.at(-1), deeds.at(-1)?.id ?? ''))
        }}
      >
        Adaugă imobil
      </Button>
    </>
  )
}

function PropertyFields({ index: i }: { index: number }) {
  const p = `properties.${i}` as const
  return (
    <>
      <DeedSelect index={i} />

      <h2 className="subheading">Adresa</h2>
      <div className="grid">
        <TextField name={`${p}.address.street`} label="Strada" wide autoComplete="off" />
        <TextField name={`${p}.address.number`} label="Nr." autoComplete="off" />
        <TextField name={`${p}.address.block`} label="Bloc" autoComplete="off" />
        <TextField name={`${p}.address.entrance`} label="Scara" autoComplete="off" />
        <TextField name={`${p}.address.floor`} label="Etaj" autoComplete="off" />
        <TextField name={`${p}.address.apartment`} label="Ap." autoComplete="off" />
        <TextField name={`${p}.address.locality`} label="Comuna / orașul / municipiul" autoComplete="off" />
        <TextField name={`${p}.address.district`} label="Satul / sectorul" placeholder="ex. Sector 2" autoComplete="off" />
      </div>

      <h2 className="subheading">Clădirea (ITL 002)</h2>
      <BuildingFields index={i} />

      <h2 className="subheading">Terenul aferent (ITL 004)</h2>
      <LandFields index={i} />

      <h2 className="subheading">Registrul agricol (dacă este cazul)</h2>
      <div className="grid">
        <TextField name={`${p}.agriculturalRegister.period`} label="Perioada" placeholder="ex. 2020–2024" autoComplete="off" />
        <TextField name={`${p}.agriculturalRegister.type`} label="Tipul" autoComplete="off" />
        <TextField name={`${p}.agriculturalRegister.volume`} label="Volumul" autoComplete="off" />
        <TextField name={`${p}.agriculturalRegister.position`} label="Poziția nr." autoComplete="off" />
      </div>

      <h2 className="subheading">Documente anexate pentru acest imobil</h2>
      <AttachmentsFields name={`${p}.attachments`} label={`Imobilul ${i + 1}`} />
    </>
  )
}

/** Акт, по которому получен объект: номер, дата и форма приобретения берутся из него. */
function DeedSelect({ index: i }: { index: number }) {
  const { register, getFieldState, formState } = useFormContext<DossierInput>()
  const deeds = useWatch<DossierInput, 'deeds'>({ name: 'deeds' })
  const name = `properties.${i}.deedId` as const
  const error = getFieldState(name, formState).error?.message
  const id = `deed-select-${i}`
  return (
    <div className="grid">
      <Select id={id} className="wide" labelText="Dobândit prin" {...register(name)} invalid={!!error} invalidText={error}>
        {deeds.map((deed, j) => (
          <SelectItem key={deed.id} value={deed.id} text={deedLabel(deed, j)} />
        ))}
      </Select>
    </div>
  )
}

function BuildingFields({ index: i }: { index: number }) {
  const p = `properties.${i}.building` as const
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
      />
      <div className="grid">
        <TextField name={`${p}.purchaseValue`} label="Valoare achiziție (lei)" inputMode="decimal" placeholder="125.000,00" autoComplete="off" />
      </div>
      <ValueTable index={i} />
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
function ValueTable({ index: i }: { index: number }) {
  const type = useWatch<DossierInput, `properties.${number}.building.type`>({ name: `properties.${i}.building.type` })
  const uses = allowedUses(type)
  if (uses.length === 0) return <p className="hint">Alegeți mai întâi tipul clădirii.</p>

  return (
    <>
      <p className="hint">Valoarea clădirii: completați valoarea și data documentului pentru indicatorii aplicabili.</p>
      {VALUE_SOURCES.map((col) => (
        <div key={col} className="indicator">
          <p className="indicator-label">{VALUE_LABELS[col]}</p>
          <div className="grid">
            {uses.map((use) => {
              const suffix = uses.length > 1 ? ` — ${USE_LABELS[use].toLowerCase()}` : ''
              const cell = `properties.${i}.building.values.${col}.${use}` as const
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
      <ErrorText name={`properties.${i}.building.values`} />
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

function LandFields({ index: i }: { index: number }) {
  const p = `properties.${i}.land` as const
  const areas = useWatch<DossierInput, `properties.${number}.land.areas`>({ name: `${p}.areas` })
  // Остальные категории свёрнуты, пока ни одна из них не заполнена.
  const otherFilled = OTHER_CATEGORIES.some((k) => areas?.[k]?.trim())

  return (
    <>
      <div className="grid">
        <TextField name={`${p}.share`} label="Cota de proprietate" placeholder="ex. 12,50/1000" autoComplete="off" />
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
      />
      <div className="grid">
        <TextField name={`${p}.areas.builtUp`} label={`${CATEGORY_LABELS.builtUp} (m²)`} inputMode="decimal" autoComplete="off" />
        <TextField name={`${p}.rank`} label="Rangul localității" placeholder="București: 0" autoComplete="off" />
        <TextField name={`${p}.zone`} label="Zona" placeholder="A–D" autoComplete="off" />
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

function SignaturesSection() {
  const signatory = useWatch<DossierInput, 'signatory'>({ name: 'signatory' })
  return (
    <>
      <div className="grid">
        <TextField name="declarationDate" label="Data declarațiilor" type="date" autoComplete="off" />
        <TextField name="director" label="Director P.J. — prenumele și numele" placeholder={fullName(signatory) || 'Semnatarul'} autoComplete="off" />
        <TextField name="chiefAccountant" label="Șef compartiment contabil — prenumele și numele" autoComplete="off" />
      </div>
      <p className="hint">
        ITL 004: dacă directorul nu este completat, se tipărește semnatarul. Numele se tipăresc deasupra semnăturilor; semnăturile și
        ștampila se aplică de mână.
      </p>
    </>
  )
}
