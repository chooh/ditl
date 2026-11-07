import { Button } from '@carbon/react'
import { ArrowRight, Checkmark, Locked, Notebook, Time } from '@carbon/icons-react'
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
  { title: 'Descărcați', text: 'O declarație ITL 002 pentru fiecare imobil și una ITL 004 pentru teren — în PDF.' },
]

const CHECKLIST = [
  'Certificatul de înregistrare ONRC al firmei (CUI, nr. de înregistrare)',
  'Actul de identitate al persoanei care semnează',
  'Contractele de dobândire a imobilelor',
  'Documentul cu valoarea clădirii: raport de evaluare, contract sau evidența contabilă',
  'Datele terenului: cota-parte și suprafața (din contract sau extrasul de carte funciară)',
]

/** Первый экран для нового пользователя: что умеет приложение и что подготовить. */
export function Welcome({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  useHelpTopic('welcome')
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-hero">
        <p className="welcome-eyebrow">Pentru persoanele juridice din Sectorul 2, București</p>
        <h1 id="welcome-title" className="welcome-title">
          Declarațiile ITL 002 și ITL 004, pas cu pas
        </h1>
        <p className="lead">
          Introduceți o singură dată datele firmei și ale imobilelor — aplicația pregătește declarațiile pentru clădiri și teren, gata
          de tipărit și semnat.
        </p>
        <div className="welcome-actions">
          <Button size="lg" renderIcon={ArrowRight} onClick={onStart}>
            Începe completarea
          </Button>
          <Button kind="ghost" size="lg" renderIcon={Notebook} onClick={onSample}>
            Vezi un exemplu completat
          </Button>
        </div>
        <p className="welcome-meta">
          <Time size={16} aria-hidden /> Durează 15–20 de minute. Progresul se salvează automat.
        </p>
      </div>

      <ol className="welcome-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className="welcome-step">
            <span className="welcome-step-number" aria-hidden>
              {i + 1}
            </span>
            <span>
              <span className="welcome-step-title">{s.title}</span>
              <span className="welcome-step-text">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="welcome-columns">
        <div className="welcome-card">
          <h2 className="welcome-card-title">Pregătiți</h2>
          <ul className="welcome-checklist">
            {CHECKLIST.map((item) => (
              <li key={item}>
                <Checkmark size={16} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="welcome-card">
          <h2 className="welcome-card-title">
            <Locked size={20} aria-hidden /> Datele rămân la dumneavoastră
          </h2>
          <p>Nimic nu este trimis pe internet: documentele se generează direct în acest browser, iar ciornele se păstrează doar aici.</p>
        </div>
      </div>
    </section>
  )
}
