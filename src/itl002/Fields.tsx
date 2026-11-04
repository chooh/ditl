import { useWatch } from 'react-hook-form'
import { AddressFields, AnnexesFields, Checkbox, EmailConsent, ErrorText, IdentityFields, RadioGroup, TextField } from '../form/fields'
import { Section } from '../form/sections'
import { allowedUses, INDICATORS, type DeclarationInput } from './schema'

/** Поля декларации ITL 002 по разделам бланка I–IV. */
export function Fields() {
  return (
    <>
      <Section id="contribuabil">
        <TaxpayerSection />
      </Section>
      <Section id="imputernicit">
        <RepresentativeSection />
      </Section>
      <Section id="strainatate">
        <div className="grid">
          <TextField name="adresaStrainatate" label="Adresa (dacă este cazul)" wide autoComplete="off" />
        </div>
      </Section>
      <Section id="cladire">
        <BuildingSection />
      </Section>
      <Section id="anexe">
        <AnnexesFields />
      </Section>
      <Section id="declaratie">
        <DeclarationSection />
      </Section>
      <Section id="antet">
        <p className="hint">Completați doar dacă le cunoașteți.</p>
        <div className="grid">
          <TextField name="antet.rolNominal" label="Numărul de rol nominal unic" autoComplete="off" />
          <TextField name="antet.registruTip" label="Registrul agricol: tipul" autoComplete="off" />
          <TextField name="antet.registruVolum" label="Volumul" autoComplete="off" />
          <TextField name="antet.registruPozitie" label="Poziția" autoComplete="off" />
        </div>
      </Section>
    </>
  )
}

function TaxpayerSection() {
  return (
    <>
      <div className="grid">
        <TextField name="contribuabil.denumire" label="Denumire contribuabil" wide autoComplete="organization" />
        <TextField name="contribuabil.cui" label="Cod unic de identificare (CUI)" inputMode="numeric" placeholder="RO12345678" autoComplete="off" />
        <TextField name="contribuabil.telefon" label="Numărul tel./fax" type="tel" autoComplete="section-sediu tel" />
        <TextField name="contribuabil.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-sediu email" />
      </div>

      <h3>Sediul</h3>
      <AddressFields
        prefix="contribuabil.sediu"
        section="sediu"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet', 'tara']}
      />

      <h3>Adresa de corespondență</h3>
      <p className="hint">Completați doar dacă diferă de sediu.</p>
      <AddressFields
        prefix="contribuabil.corespondenta"
        section="corespondenta"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate']}
      />

      <EmailConsent />
    </>
  )
}

function RepresentativeSection() {
  const exists = useWatch<DeclarationInput, 'imputernicit.exista'>({ name: 'imputernicit.exista' })
  return (
    <>
      <Checkbox name="imputernicit.exista">Declarația este depusă prin împuternicit</Checkbox>
      {exists && (
        <>
          <div className="grid">
            <TextField name="imputernicit.nume" label="Numele" autoComplete="section-imputernicit family-name" />
            <TextField name="imputernicit.prenume" label="Prenumele" autoComplete="section-imputernicit given-name" />
            <TextField name="imputernicit.cif" label="Cod de identificare fiscală (CNP sau CUI)" inputMode="numeric" autoComplete="off" />
            <TextField name="imputernicit.telefon" label="Numărul tel./fax" type="tel" autoComplete="section-imputernicit tel" />
            <TextField name="imputernicit.email" label="Adresa de poștă electronică" type="email" wide autoComplete="section-imputernicit email" />
          </div>
          <AddressFields
            prefix="imputernicit.adresa"
            section="imputernicit"
            fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet', 'tara']}
            labels={{ nr: 'Număr' }}
          />
        </>
      )}
    </>
  )
}

function BuildingSection() {
  const forma = useWatch<DeclarationInput, 'cladire.formaDobandire'>({ name: 'cladire.formaDobandire' })
  return (
    <>
      <RadioGroup
        name="cladire.tip"
        legend="Tipul clădirii"
        options={[
          ['nerezidentiala', 'Nerezidențială'],
          ['rezidentiala', 'Rezidențială'],
          ['mixta', 'Mixtă'],
        ]}
      />
      <div className="grid">
        <TextField name="cladire.nrAct" label="Nr. act dobândire" autoComplete="off" />
        <TextField name="cladire.dataDobandirii" label="Data dobândirii" type="date" autoComplete="off" />
        <TextField name="cladire.valoareAchizitie" label="Valoare achiziție (lei)" inputMode="decimal" placeholder="125.000,00" autoComplete="off" />
      </div>
      <RadioGroup
        name="cladire.formaDobandire"
        legend="Forma de dobândire"
        options={[
          ['proprietate', 'Proprietate'],
          ['inchiriere', 'Închiriere'],
          ['concesiune', 'Concesiune'],
          ['administrare', 'Administrare'],
          ['folosinta', 'Folosință'],
          ['alte', 'Alte modalități'],
        ]}
      />
      {forma === 'alte' && (
        <div className="grid">
          <TextField name="cladire.formaAlta" label="Alte modalități — precizați" wide autoComplete="off" />
        </div>
      )}

      <h3>Adresa clădirii</h3>
      <AddressFields
        prefix="cladire.adresa"
        section="cladire"
        fields={['strada', 'nr', 'bloc', 'scara', 'etaj', 'apartament', 'localitate']}
        labels={{ apartament: 'Ap.', localitate: 'Localitate/sector' }}
      />

      <h3>Valoarea clădirii</h3>
      <IndicatorTable />
    </>
  )
}

const INDICATOR_LABELS: Record<(typeof INDICATORS)[number], string> = {
  a: 'a) înregistrată în evidențele organului fiscal',
  b: 'b) rezultată dintr-un raport de evaluare',
  c: 'c) a lucrărilor de construcții, în cazul clădirilor nou construite',
  d: 'd) de achiziție',
  e: 'e) înscrisă în contabilitatea proprietarului clădirii și comunicată concesionarului, locatarului, titularului dreptului de administrare sau de folosință',
}
const USE_LABELS = { rez: 'Rezidențial', nerez: 'Nerezidențial' } as const

/** Таблица «Indicator»: показываются только колонки, относящиеся к выбранному типу здания. */
function IndicatorTable() {
  const tip = useWatch<DeclarationInput, 'cladire.tip'>({ name: 'cladire.tip' })
  const uses = allowedUses(tip)
  if (uses.length === 0) return <p className="hint">Alegeți mai întâi tipul clădirii.</p>

  return (
    <>
      <p className="hint">Completați valoarea și data documentului pentru indicatorii aplicabili.</p>
      {INDICATORS.map((col) => (
        <div key={col} className="indicator">
          <p className="indicator-label">{INDICATOR_LABELS[col]}</p>
          <div className="grid">
            {uses.map((use) => (
              <IndicatorCell key={use} col={col} use={use} showUse={uses.length > 1} />
            ))}
          </div>
        </div>
      ))}
      <ErrorText name="cladire.indicatori" />
    </>
  )
}

function IndicatorCell({ col, use, showUse }: { col: (typeof INDICATORS)[number]; use: 'rez' | 'nerez'; showUse: boolean }) {
  const suffix = showUse ? ` — ${USE_LABELS[use].toLowerCase()}` : ''
  return (
    <>
      <TextField name={`cladire.indicatori.${col}.${use}.valoare`} label={`Valoare (lei)${suffix}`} inputMode="decimal" autoComplete="off" />
      <TextField name={`cladire.indicatori.${col}.${use}.data`} label={`Data documentului${suffix}`} type="date" autoComplete="off" />
    </>
  )
}

function DeclarationSection() {
  return (
    <>
      <p className="hint">
        Sub sancțiunile aplicate faptei de fals în acte publice, declar că datele înscrise sunt corecte și complete și că
        voi depune o nouă declarație în termen de 30 de zile dacă intervin modificări.
      </p>
      <h3>Actul de identitate al semnatarului</h3>
      <div className="grid">
        <IdentityFields />
        <TextField name="dataDeclaratiei" label="Data declarației" type="date" autoComplete="off" />
      </div>
      <p className="hint">Semnătura se aplică de mână pe documentul tipărit.</p>
    </>
  )
}
