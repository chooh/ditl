import { Button, Callout, ListItem, Tile, UnorderedList } from '@carbon/react'
import { ArrowRight, Notebook } from '@carbon/icons-react'
import { useEffect, useRef } from 'react'
import { useHelpTopic } from '../help/Help'

/** Приветствие видели — при следующих открытиях сразу форма. */
const ONBOARDED_KEY = 'ditl.onboarded'

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1'
  } catch {
    return true
  }
}

export function setOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    // Не запомнится — приветствие покажется ещё раз.
  }
}

const STEPS = [
  { title: 'Completați', text: '7 etape scurte, împărțite în subetape, cu sfaturi la fiecare ecran.' },
  { title: 'Verificați', text: 'Aplicația verifică CUI-ul, CNP-ul, IBAN-ul, datele și câmpurile obligatorii.' },
  { title: 'Descărcați', text: 'Declarația ITL 002 pentru clădire și ITL 004 pentru teren — în PDF.' },
]

const CHECKLIST = [
  'Certificatul de înregistrare ONRC al firmei (CUI, nr. de înregistrare)',
  'Actul de identitate al persoanei care semnează',
  'Contractul de dobândire a imobilului',
  'Documentul cu valoarea clădirii: raport de evaluare, contract sau evidența contabilă',
  'Datele terenului: cota-parte și suprafața (din contract sau extrasul de carte funciară)',
]

type WelcomeProps = {
  /** Открыто из формы (название в шапке): кнопка возвращает к ней. */
  returning: boolean
  onStart: () => void
  onSample: () => void
}

/** Что умеет приложение и что подготовить: первый экран нового пользователя, потом — по названию в шапке. */
export function Welcome({ returning, onStart, onSample }: WelcomeProps) {
  useHelpTopic('welcome')
  const title = useRef<HTMLHeadingElement>(null)
  // Открыто из формы — фокус на заголовок, как при смене раздела.
  useEffect(() => {
    if (returning) title.current?.focus()
  }, [])
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-hero">
        <p className="welcome-eyebrow">Pentru persoanele juridice din Sectorul 2, București</p>
        <h1 id="welcome-title" className="welcome-title" ref={title} tabIndex={-1}>
          Declarațiile ITL 002 și ITL 004, pas cu pas
        </h1>
        <p className="lead">
          Introduceți datele firmei și ale imobilului — aplicația pregătește declarațiile pentru clădire și teren, gata de tipărit și
          semnat. Pentru următorul imobil al firmei, datele firmei se preiau automat.
        </p>
        <div className="welcome-actions">
          <Button size="lg" renderIcon={ArrowRight} onClick={onStart}>
            {returning ? 'Continuă completarea' : 'Începe completarea'}
          </Button>
          <Button kind="ghost" size="lg" renderIcon={Notebook} onClick={onSample}>
            Vezi un exemplu completat
          </Button>
        </div>
        <p className="hint">Durează 15–20 de minute. Progresul se salvează automat.</p>
      </div>

      <Callout kind="warning" lowContrast title="Declarațiile se depun în termen de 30 de zile de la data dobândirii." />

      <div className="welcome-tiles">
        {STEPS.map((s, i) => (
          <Tile key={s.title}>
            <h2 className="welcome-tile-title">
              {i + 1}. {s.title}
            </h2>
            <p className="hint">{s.text}</p>
          </Tile>
        ))}
      </div>

      <div className="welcome-tiles">
        <Tile>
          <h2 className="welcome-tile-title">Pregătiți</h2>
          <UnorderedList>
            {CHECKLIST.map((item) => (
              <ListItem key={item}>{item}</ListItem>
            ))}
          </UnorderedList>
        </Tile>
        <Tile>
          <h2 className="welcome-tile-title">Datele rămân la dumneavoastră</h2>
          <p>Nimic nu este trimis pe internet: documentele se generează direct în acest browser, iar ciornele se păstrează doar aici.</p>
        </Tile>
      </div>
    </section>
  )
}
