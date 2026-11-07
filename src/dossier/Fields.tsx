import { Accordion, AccordionItem, Button, ContainedList, ContainedListItem, FormGroup, RadioButton, RadioButtonGroup, Select, SelectItem, Tag } from '@carbon/react'
import { Add, Edit, TrashCan } from '@carbon/icons-react'
import { Fragment, useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AddressFields, AttachmentsFields, ErrorText, RadioGroup, TextField } from '../form/fields'
import { issuesText, Section, SubStep, useSections } from '../form/sections'
import { formatDate } from '../pdf/format'
import {
  allowedUses,
  emptyDeed,
  fullName,
  nextProperty,
  unitAddress,
  VALUE_SOURCES,
  type DossierInput,
  type LandCategory,
  type Use,
  type ValueSource,
} from './schema'
import { deedStep, propertyStep } from './sections'

/** Поля досье: фирма, подписант, акты, объекты и то, что относится ко всем декларациям. */
export function Fields() {
  return (
    <>
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
        <SubStep id="exemption">
          <ExemptionFields />
        </SubStep>
      </Section>
      <Section id="attachments">
        <SubStep id="attachments">
          <p className="hint">
            Copii ale documentelor, certificate de conformitate cu originalul (art. 64 alin. (5) din Legea nr. 207/2015), care se
            anexează la fiecare declarație — de exemplu certificatul ONRC sau împuternicirea. Documentele unui act sau ale unui imobil
            se adaugă la actul, respectiv la imobilul respectiv.
          </p>
          <AttachmentsFields name="attachments" label="Anexe comune" />
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
            name="company.taxId"
            label="Codul de identificare fiscală (CIF)"
            placeholder="RO12345678"
            autoComplete="off"
            tip="CUI-ul cu prefixul RO, dacă firma este plătitoare de TVA. Altfel, scrieți același număr ca la CUI."
          />
          <TextField
            name="company.uniqueId"
            label="Codul unic de identificare (CUI)"
            inputMode="numeric"
            placeholder="12345678"
            autoComplete="off"
            tip="Numărul din certificatul de înregistrare ONRC, fără RO. Ultima cifră este cifra de control."
          />
          <TextField name="company.tradeRegister.office" label="Înregistrat la registrul comerțului" placeholder="ONRC București" autoComplete="off" />
          <TextField
            name="company.tradeRegister.number"
            label="La nr."
            placeholder="J40/1234/2006"
            autoComplete="off"
            tip="Numărul de ordine în Registrul Comerțului, exact ca în certificatul ONRC."
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
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality', 'county', 'country']}
        />
      </SubStep>

      <SubStep id="other">
        <h4 className="subheading">Adresa de corespondență</h4>
        <p className="hint">ITL 002. Completați doar dacă diferă de sediu.</p>
        <AddressFields
          prefix="company.correspondence"
          section="correspondence"
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality']}
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
            label="Codul numeric personal"
            inputMode="numeric"
            autoComplete="off"
            tip="13 cifre. Obligatoriu pentru împuternicit; ultima cifră este cifra de control."
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
            label="Valabil până la (gol — nelimitat)"
            type="date"
            autoComplete="off"
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
          fields={['street', 'number', 'postalCode', 'block', 'entrance', 'floor', 'apartment', 'locality', 'county', 'country']}
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

/** Номер и дата акта — для списка актов у объекта. */
const deedLabel = (deed: DossierInput['deeds'][number], i: number) =>
  [`Actul ${i + 1}`, deed.number && `nr. ${deed.number}`, deed.date && `din ${formatDate(deed.date)}`].filter(Boolean).join(' ')

/** По экрану на акт и список актов, где их добавляют и удаляют. */
function DeedsSection() {
  const { control } = useFormContext<DossierInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'deeds' })
  const deeds = useWatch<DossierInput, 'deeds'>({ name: 'deeds' })
  const properties = useWatch<DossierInput, 'properties'>({ name: 'properties' })
  const sections = useSections()
  const subs = sections.subSteps('deeds')
  return (
    <>
      {fields.map((field, i) => (
        <SubStep key={field.id} id={deedStep(i)}>
          <p className="hint">
            Contractele de vânzare-cumpărare și alte acte prin care au fost dobândite imobilele. Un act poate cuprinde mai multe imobile.
          </p>
          <FormGroup className="parcel" legendText={`Actul ${i + 1}`}>
            <DeedFields index={i} />
          </FormGroup>
        </SubStep>
      ))}

      <SubStep id="deeds-list">
        <ContainedList label={`Acte adăugate: ${fields.length}`} kind="on-page" className="items">
          {fields.map((field, i) => {
            // Акт, на который ссылаются объекты, удалить нельзя — сначала поменять акт у объектов.
            // field.id — ключ useFieldArray, а не id акта: тот берётся из значений.
            const deed = deeds[i]
            const used = properties.flatMap((p, j) => (p.deedId === deed?.id ? [j + 1] : []))
            const issues = subs.find((s) => s.id === deedStep(i))?.issues ?? 0
            return (
              <ContainedListItem
                key={field.id}
                action={
                  <div className="item-actions">
                    <Button
                      kind="ghost"
                      hasIconOnly
                      renderIcon={Edit}
                      iconDescription={`Modifică actul ${i + 1}`}
                      tooltipAlignment="end"
                      onClick={() => sections.goSub(deedStep(i))}
                    />
                    {fields.length > 1 && used.length === 0 && (
                      <Button
                        kind="ghost"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription={`Șterge actul ${i + 1}`}
                        tooltipAlignment="end"
                        onClick={() => remove(i)}
                      />
                    )}
                  </div>
                }
              >
                <span className="review-heading">
                  <span className="review-title">{deed ? deedLabel(deed, i) : `Actul ${i + 1}`}</span>
                  {issues > 0 && (
                    <Tag type="red" size="sm">
                      {issuesText(issues)}
                    </Tag>
                  )}
                </span>
                <span className="item-secondary">
                  {used.length > 0
                    ? `Folosit de imobilul ${used.join(', ')}${fields.length > 1 ? ' — nu poate fi șters' : ''}.`
                    : 'Nu este folosit încă de niciun imobil.'}
                </span>
              </ContainedListItem>
            )
          })}
        </ContainedList>
        <ErrorText name="deeds" />
        <p className="hint">Imobilele au fost dobândite prin mai multe acte? Adăugați fiecare act.</p>
        <Button
          kind="tertiary"
          renderIcon={Add}
          onClick={() => {
            append(emptyDeed())
            sections.goSub(deedStep(fields.length))
          }}
        >
          Adaugă act
        </Button>
      </SubStep>
    </>
  )
}

function DeedFields({ index: i }: { index: number }) {
  const p = `deeds.${i}` as const
  const form = useWatch<DossierInput, `deeds.${number}.form`>({ name: `${p}.form` })
  return (
    <>
      <div className="grid">
        <TextField name={`${p}.number`} label="Nr. act" autoComplete="off" tip="Numărul contractului sau al actului, de exemplu 1234/2023." />
        <TextField name={`${p}.date`} label="Data actului" type="date" autoComplete="off" />
        <TextField
          name={`${p}.acquiredOn`}
          label="Data dobândirii (dacă diferă)"
          type="date"
          autoComplete="off"
          tip="Doar dacă imobilul a fost dobândit la altă dată decât data actului. Necompletat — se folosește data actului."
        />
      </div>
      <RadioGroup name={`${p}.form`} legend="Forma de dobândire" options={ACQUISITION_OPTIONS} />
      {form === 'other' && (
        <div className="grid">
          <TextField name={`${p}.formOther`} label="Alte modalități — precizați" wide autoComplete="off" />
        </div>
      )}
      <h4 className="subheading">Documente anexate pentru acest act</h4>
      <AttachmentsFields name={`${p}.attachments`} label={`Actul ${i + 1}`} />
    </>
  )
}

/** По пять экранов на объект (акт и адрес, здание, стоимость, земля, приложения) и список объектов. */
function PropertiesSection() {
  const { control, getValues } = useFormContext<DossierInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'properties' })
  const properties = useWatch<DossierInput, 'properties'>({ name: 'properties' })
  const sections = useSections()
  const subs = sections.subSteps('properties')
  return (
    <>
      {fields.map((field, i) => {
        const p = `properties.${i}` as const
        const legend = `Imobilul ${i + 1}`
        return (
          <Fragment key={field.id}>
            <SubStep id={propertyStep(i, 'address')}>
              <p className="hint">
                Pentru fiecare imobil se generează o declarație ITL 002 (clădirea); terenul aferent tuturor imobilelor intră într-o singură
                declarație ITL 004.
              </p>
              <FormGroup className="parcel" legendText={legend}>
                <DeedSelect index={i} />
                <h4 className="subheading">Adresa</h4>
                <div className="grid">
                  <TextField name={`${p}.address.street`} label="Strada" wide autoComplete="off" />
                  <TextField name={`${p}.address.number`} label="Nr." autoComplete="off" />
                  <TextField name={`${p}.address.block`} label="Bloc" autoComplete="off" />
                  <TextField name={`${p}.address.entrance`} label="Scara" autoComplete="off" />
                  <TextField name={`${p}.address.floor`} label="Etaj" autoComplete="off" />
                  <TextField name={`${p}.address.apartment`} label="Ap." autoComplete="off" />
                  <TextField name={`${p}.address.locality`} label="Comuna / orașul / municipiul" autoComplete="off" />
                  <TextField
                    name={`${p}.address.district`}
                    label="Satul / sectorul"
                    placeholder="ex. Sector 2"
                    autoComplete="off"
                    tip="În București scrieți sectorul, de exemplu „Sector 2”."
                  />
                </div>
              </FormGroup>
            </SubStep>
            <SubStep id={propertyStep(i, 'building')}>
              <FormGroup className="parcel" legendText={`${legend} — clădirea (ITL 002)`}>
                <BuildingFields index={i} />
              </FormGroup>
            </SubStep>
            <SubStep id={propertyStep(i, 'values')}>
              <FormGroup className="parcel" legendText={`${legend} — valoarea clădirii`}>
                <ValueTable index={i} />
              </FormGroup>
            </SubStep>
            <SubStep id={propertyStep(i, 'land')}>
              <FormGroup className="parcel" legendText={`${legend} — terenul aferent (ITL 004)`}>
                <LandFields index={i} />
              </FormGroup>
            </SubStep>
            <SubStep id={propertyStep(i, 'annex')}>
              <FormGroup className="parcel" legendText={`${legend} — documente anexate`}>
                <AttachmentsFields name={`${p}.attachments`} label={legend} />
              </FormGroup>
            </SubStep>
          </Fragment>
        )
      })}

      <SubStep id="properties-list">
        <ContainedList label={`Imobile adăugate: ${fields.length}`} kind="on-page" className="items">
          {fields.map((field, i) => {
            const property = properties[i]
            const issues = subs.filter((s) => s.id.startsWith(`property-${i}-`)).reduce((n, s) => n + s.issues, 0)
            const address = property ? [unitAddress(property), property.address.locality].filter(Boolean).join(', ') : ''
            return (
              <ContainedListItem
                key={field.id}
                action={
                  <div className="item-actions">
                    <Button
                      kind="ghost"
                      hasIconOnly
                      renderIcon={Edit}
                      iconDescription={`Modifică imobilul ${i + 1}`}
                      tooltipAlignment="end"
                      onClick={() => sections.goSub(propertyStep(i, 'address'))}
                    />
                    {fields.length > 1 && (
                      <Button
                        kind="ghost"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription={`Șterge imobilul ${i + 1}`}
                        tooltipAlignment="end"
                        onClick={() => remove(i)}
                      />
                    )}
                  </div>
                }
              >
                <span className="review-heading">
                  <span className="review-title">Imobilul {i + 1}</span>
                  {issues > 0 && (
                    <Tag type="red" size="sm">
                      {issuesText(issues)}
                    </Tag>
                  )}
                </span>
                <span className="item-secondary">{address || 'Adresa nu este completată'}</span>
              </ContainedListItem>
            )
          })}
        </ContainedList>
        <ErrorText name="properties" />
        <p className="hint">Imobilul nou preia actul și adresa clădirii de la imobilul anterior.</p>
        <Button
          kind="tertiary"
          renderIcon={Add}
          onClick={() => {
            const { properties, deeds } = getValues()
            append(nextProperty(properties.at(-1), deeds.at(-1)?.id ?? ''))
            sections.goSub(propertyStep(fields.length, 'address'))
          }}
        >
          Adaugă imobil
        </Button>
      </SubStep>
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
      <Select
        id={id}
        className="wide"
        labelText="Dobândit prin"
        helperText="Actul de la etapa „Acte”, prin care firma a dobândit acest imobil."
        {...register(name)}
        invalid={!!error}
        invalidText={error}
      >
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
function ValueTable({ index: i }: { index: number }) {
  const type = useWatch<DossierInput, `properties.${number}.building.type`>({ name: `properties.${i}.building.type` })
  const sections = useSections()
  const uses = allowedUses(type)
  if (uses.length === 0) {
    return (
      <div>
        <p className="hint">Alegeți mai întâi tipul clădirii — de el depind valorile care se declară.</p>
        <Button kind="tertiary" size="md" onClick={() => sections.goSub(propertyStep(i, 'building'))}>
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
