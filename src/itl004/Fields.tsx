import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { AddressFields, AnnexesFields, EmailConsent, ErrorText, IdentityFields, RadioGroup, TextField } from '../form/fields'
import { Section } from '../form/sections'
import { emptyParcel, LAND_ACQUISITION_TEXT, LAND_ACQUISITIONS, MAX_PARCELS, type DeclarationInput, type LandCategory } from './schema'

/** Поля декларации ITL 004 по смыслу бланка: фирма, представитель, участки, льготы. */
export function Fields() {
  return (
    <>
      <Section id="contribuabil">
        <TaxpayerSection />
      </Section>
      <Section id="reprezentant">
        <RepresentativeSection />
      </Section>
      <Section id="terenuri">
        <ParcelsSection />
      </Section>
      <Section id="scutire">
        <p className="hint">„Beneficiez de scutire/reducere de la plata impozitului pe teren…” — completați doar dacă este cazul.</p>
        <div className="grid">
          <TextField name="scutire.cota" label="În cotă de" autoComplete="off" />
          <TextField name="scutire.calitate" label="În calitate de" autoComplete="off" />
          <TextField name="scutire.documente" label="Conform documentelor anexate" wide autoComplete="off" />
        </div>
      </Section>
      <Section id="anexe">
        <AnnexesFields />
      </Section>
      <Section id="semnatari">
        <div className="grid">
          <TextField name="dataDeclaratiei" label="Data declarației" type="date" autoComplete="off" />
          <TextField name="semnatari.director" label="Director P.J. — prenumele și numele" autoComplete="off" />
          <TextField name="semnatari.sefContabil" label="Șef compartiment contabil — prenumele și numele" autoComplete="off" />
        </div>
        <p className="hint">Numele se tipăresc deasupra semnăturilor; semnăturile și ștampila se aplică de mână.</p>
      </Section>
      <Section id="antet">
        <p className="hint">Completați doar dacă îl cunoașteți.</p>
        <div className="grid">
          <TextField name="antet.rolNominal" label="Rol nominal unic" autoComplete="off" />
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
        <TextField name="contribuabil.cui" label="Codul de identificare fiscală (CUI)" inputMode="numeric" placeholder="RO12345678" autoComplete="off" />
        <TextField name="contribuabil.telefon" label="Telefon" type="tel" autoComplete="section-sediu tel" />
        <TextField name="contribuabil.fax" label="Fax" type="tel" autoComplete="off" />
        <TextField name="contribuabil.email" label="Adresă de e-mail" type="email" wide autoComplete="section-sediu email" />
        <TextField name="contribuabil.registruComertului" label="Înregistrat la registrul comerțului" placeholder="ONRC București" autoComplete="off" />
        <TextField name="contribuabil.nrRegistruComertului" label="La nr." placeholder="J40/1234/2006" autoComplete="off" />
        <TextField name="contribuabil.iban" label="Cont IBAN" wide autoComplete="off" />
        <TextField name="contribuabil.banca" label="Deschis la" placeholder="Banca" wide autoComplete="off" />
      </div>

      <h3>Sediul</h3>
      <AddressFields
        prefix="contribuabil.sediu"
        section="sediu"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet']}
      />

      <EmailConsent />
    </>
  )
}

function RepresentativeSection() {
  return (
    <>
      <p className="hint">Persoana care semnează declarația în numele contribuabilului („Subsemnatul…”).</p>
      <div className="grid">
        <TextField name="reprezentant.nume" label="Prenumele și numele" wide autoComplete="section-reprezentant name" />
        <TextField name="reprezentant.cnp" label="Codul numeric personal" inputMode="numeric" autoComplete="off" />
        <IdentityFields full={false} />
      </div>
      <h3>Domiciliul</h3>
      <AddressFields
        prefix="reprezentant.domiciliu"
        section="reprezentant"
        fields={['strada', 'nr', 'codPostal', 'bloc', 'scara', 'etaj', 'apartament', 'localitate', 'judet', 'tara']}
      />
    </>
  )
}

function ParcelsSection() {
  const { control } = useFormContext<DeclarationInput>()
  const { fields, append, remove } = useFieldArray({ control, name: 'terenuri' })
  return (
    <>
      {fields.map((field, i) => (
        <fieldset key={field.id} className="parcel">
          <legend>Terenul {i + 1}</legend>
          <ParcelFields index={i} />
          {fields.length > 1 && (
            <button type="button" className="link" onClick={() => remove(i)}>
              Șterge terenul {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      <ErrorText name="terenuri" />
      {fields.length < MAX_PARCELS && (
        <button type="button" className="secondary" onClick={() => append(emptyParcel())}>
          Adaugă teren
        </button>
      )}
    </>
  )
}

const ACQUISITION_LABELS = LAND_ACQUISITIONS.map((k) => {
  const text = LAND_ACQUISITION_TEXT[k]
  return [k, text[0]!.toUpperCase() + text.slice(1)] as const
})

/** Колонки таблицы площадей; первая — у парковок и зданий почти всегда единственная. */
const CATEGORY_LABELS: Record<LandCategory, string> = {
  constructii: 'Terenuri cu construcții',
  arabil: 'Arabil',
  pasune: 'Pășune',
  faneata: 'Fânață',
  vieRod: 'Vie — intrată pe rod',
  vieNerod: 'Vie — neintrată pe rod',
  livadaRod: 'Livadă — intrată pe rod',
  livadaNerod: 'Livadă — neintrată pe rod',
  padurePana20: 'Pădure — până în 20 de ani / cu rol de protecție',
  padurePeste20: 'Pădure — peste 20 de ani',
  apeAmenajare: 'Terenuri cu ape — cu amenajare piscicolă',
  apeFaraAmenajare: 'Terenuri cu ape — fără amenajare piscicolă',
  drumuriLiber: 'Drumuri și căi ferate — liber',
  drumuriOcup: 'Drumuri și căi ferate — ocupat',
  neproductive: 'Terenuri neproductive',
}
const OTHER_CATEGORIES = (Object.keys(CATEGORY_LABELS) as LandCategory[]).filter((k) => k !== 'constructii')

function ParcelFields({ index: i }: { index: number }) {
  const p = `terenuri.${i}` as const
  const surfaces = useWatch<DeclarationInput, `terenuri.${number}.suprafete`>({ name: `${p}.suprafete` })
  // Остальные категории свёрнуты, пока ни одна из них не заполнена.
  const otherFilled = OTHER_CATEGORIES.some((k) => surfaces?.[k]?.trim())

  return (
    <>
      <div className="grid">
        <TextField name={`${p}.dataDobandirii`} label="Începând cu data de" type="date" autoComplete="off" />
        <TextField name={`${p}.nrAct`} label="Prin actul nr." autoComplete="off" />
        <TextField name={`${p}.dataAct`} label="Din data de" type="date" autoComplete="off" />
      </div>
      <RadioGroup name={`${p}.forma`} legend="Am … un teren" options={ACQUISITION_LABELS} />

      <h3>Adresa terenului</h3>
      <div className="grid">
        <TextField name={`${p}.strada`} label="Strada" wide autoComplete="off" />
        <TextField name={`${p}.nr`} label="Nr." autoComplete="off" />
        <TextField name={`${p}.localitate`} label="Comuna / orașul / municipiul" autoComplete="off" />
        <TextField name={`${p}.satSector`} label="Satul / sectorul" placeholder="ex. 2" autoComplete="off" />
      </div>

      <div className="grid">
        <TextField name={`${p}.cota`} label="Cota de proprietate" placeholder="ex. 12,50/1000" autoComplete="off" />
        <TextField name={`${p}.coproprietari`} label="Coproprietari" wide autoComplete="off" />
      </div>

      <h3>Registrul agricol (dacă este cazul)</h3>
      <div className="grid">
        <TextField name={`${p}.registru.perioada`} label="Perioada" placeholder="ex. 2020–2024" autoComplete="off" />
        <TextField name={`${p}.registru.tip`} label="Tipul" autoComplete="off" />
        <TextField name={`${p}.registru.volum`} label="Volumul" autoComplete="off" />
        <TextField name={`${p}.registru.pozitie`} label="Poziția nr." autoComplete="off" />
      </div>

      <h3>Suprafața terenului</h3>
      <div className="grid">
        <TextField name={`${p}.parcela`} label="Parcela / adresa (în tabel)" wide placeholder="Dacă lipsește, se tipărește adresa terenului" autoComplete="off" />
      </div>
      <RadioGroup
        name={`${p}.intravilan`}
        legend="Terenul este situat"
        options={[
          ['I', 'Intravilan'],
          ['E', 'Extravilan'],
        ]}
      />
      <div className="grid">
        <TextField name={`${p}.suprafete.constructii`} label={`${CATEGORY_LABELS.constructii} (m²)`} inputMode="decimal" autoComplete="off" />
        <TextField name={`${p}.rang`} label="Rangul localității" placeholder="București: 0" autoComplete="off" />
        <TextField name={`${p}.zona`} label="Zona" placeholder="A–D" autoComplete="off" />
      </div>
      <details className="categories" open={otherFilled || undefined}>
        <summary>Alte categorii de folosință (m²)</summary>
        <div className="grid">
          {OTHER_CATEGORIES.map((k) => (
            <TextField key={k} name={`${p}.suprafete.${k}`} label={CATEGORY_LABELS[k]} inputMode="decimal" autoComplete="off" />
          ))}
        </div>
      </details>
      <ErrorText name={`${p}.suprafete`} />
    </>
  )
}
