/**
 * Подсказки к экранам: боковая панель «Sfaturi», короткая подсказка над полями
 * на узком экране и окно «Ajutor» из шапки. Ключ — тема экрана (подэтап мастера,
 * приветствие, проверка, результат).
 */
export type Help = {
  title: string
  /** Одна фраза: что делать на экране. */
  short: string
  /** Подробнее, чем short, — для панели и окна; без него показывается short. */
  intro?: string
  /** Где взять данные. */
  where?: readonly string[]
  tips?: readonly string[]
}

export const HELP = {
  welcome: {
    title: 'Cum funcționează',
    short: 'Completați dosarul pas cu pas, apoi descărcați declarațiile gata de semnat.',
    intro:
      'Aplicația vă conduce prin 7 etape scurte. Din datele introduse o singură dată se generează o declarație ITL 002 pentru fiecare imobil și o declarație ITL 004 pentru terenul aferent tuturor imobilelor.',
    tips: [
      'Butonul „Ajutor” din colțul de sus deschide oricând sfaturile pentru ecranul pe care vă aflați.',
      'Lângă câmpurile mai dificile există un „i” — apăsați-l pentru o explicație scurtă.',
      'Progresul se salvează automat în acest browser; puteți închide pagina și reveni oricând.',
      'Etapele pot fi completate în orice ordine — indicatorul arată ce mai este de completat.',
    ],
  },
  'company.identity': {
    title: 'Datele de identificare ale firmei',
    short: 'Copiați datele exact cum apar în certificatul de înregistrare ONRC.',
    intro: 'Firma care deține sau folosește imobilele — contribuabilul care depune declarațiile.',
    where: ['Certificatul de înregistrare eliberat de Registrul Comerțului (ONRC)', 'Căutarea după CUI pe site-ul ANAF sau pe portalul ONRC'],
    tips: [
      'CUI-ul are între 2 și 10 cifre; ultima este cifra de control — aplicația o verifică.',
      'CIF-ul este CUI-ul cu prefixul RO dacă firma este plătitoare de TVA; altfel este identic cu CUI-ul.',
      'Numărul de ordine în Registrul Comerțului se copiază exact din certificat. Din 2024 are forma J2026123456002: litera registrului (J pentru persoane juridice), anul înmatriculării, numărul de ordine din 6 cifre, codul județului și cifra de control. Certificatele mai vechi au forma J40/1234/2006.',
    ],
  },
  'company.contact': {
    title: 'Contact și comunicare',
    short: 'Telefonul și e-mailul la care DGITL vă poate contacta.',
    tips: [
      'Dacă alegeți DA la comunicarea exclusiv prin e-mail, actele administrative fiscale vă vor fi trimise numai pe e-mail — atunci adresa de e-mail devine obligatorie.',
      'În ITL 002, telefonul și faxul apar în aceeași rubrică.',
      'Faxul este opțional.',
    ],
  },
  'company.bank': {
    title: 'Contul bancar',
    short: 'Opțional. IBAN-ul îl găsiți în extrasul de cont sau în internet banking.',
    where: ['Extrasul de cont', 'Aplicația de internet banking', 'Contractul cu banca'],
    tips: [
      'IBAN-ul românesc are 24 de caractere și începe cu RO; aplicația verifică cifrele de control.',
      'Puteți lipi IBAN-ul cu spații — acestea sunt eliminate automat.',
    ],
  },
  'company.seat': {
    title: 'Sediul social',
    short: 'Adresa sediului, așa cum apare în certificatul ONRC.',
    tips: [
      'Pentru România, codul poștal are 6 cifre.',
      'Căutați localitatea în lista SIRUTA — județul, municipiul/orașul/comuna și satul/sectorul se completează singure. În București: județul și municipiul București, sectorul — de exemplu „Sector 2”.',
    ],
  },
  'company.other': {
    title: 'Alte adrese',
    short: 'Completați doar dacă este cazul — altfel treceți mai departe.',
    tips: [
      'Adresa de corespondență — doar dacă diferă de sediu (apare în ITL 002).',
      'Adresa de rezidență în alt stat — doar pentru contribuabilii cu rezidența în afara României.',
    ],
  },
  'signatory.person': {
    title: 'Cine semnează declarațiile',
    short: 'Persoana care semnează în numele firmei: reprezentantul legal sau un împuternicit.',
    tips: [
      'Reprezentantul legal este administratorul sau directorul, conform actelor firmei.',
      'Împuternicitul semnează pe baza unei împuterniciri sau procuri — adăugați-o la etapa „Anexe”. Pentru împuternicit, CNP-ul este obligatoriu și se completează secțiunea II din ITL 002.',
      'CNP-ul are 13 cifre; aplicația verifică cifra de control.',
    ],
  },
  'signatory.id': {
    title: 'Actul de identitate',
    short: 'Datele din cartea de identitate sau din pașaportul semnatarului.',
    where: ['Cartea de identitate (CI) sau pașaportul semnatarului'],
    tips: [
      'Tipuri uzuale: CI (carte de identitate), BI, Pașaport — alegeți din listă sau scrieți.',
      'Lăsați „Valabil până la” necompletat dacă actul este valabil nelimitat.',
      'Actul trebuie să fie valabil la data declarațiilor — aplicația verifică acest lucru.',
    ],
  },
  'signatory.address': {
    title: 'Domiciliul semnatarului',
    short: 'Adresa de domiciliu, ca în actul de identitate.',
  },
  deed: {
    title: 'Actul de dobândire',
    short: 'Contractul prin care firma a dobândit imobilele — numărul și data se copiază din act.',
    intro:
      'Contractul de vânzare-cumpărare, de închiriere, de concesiune sau alt act prin care firma a obținut imobilele. Un singur act poate cuprinde mai multe imobile — de exemplu, un apartament și un loc de parcare.',
    where: ['Contractul autentificat de notar', 'Extrasul de carte funciară', 'Contractul de închiriere, concesiune sau administrare'],
    tips: [
      'Completați „Data dobândirii” doar dacă diferă de data actului (de exemplu, la o predare-primire ulterioară).',
      'La documentele anexate scrieți copiile pe care le atașați pentru acest act, de exemplu „Contract de vânzare-cumpărare nr. 1234/2023”.',
    ],
  },
  'deeds.list': {
    title: 'Lista actelor',
    short: 'Verificați actele. Dacă imobilele au fost dobândite prin mai multe acte, adăugați-le pe toate.',
    tips: [
      'La fiecare imobil veți alege actul prin care a fost dobândit.',
      'Un act folosit de un imobil nu poate fi șters — mai întâi schimbați actul la imobil.',
    ],
  },
  'property.address': {
    title: 'Actul și adresa imobilului',
    short: 'Alegeți actul de dobândire și introduceți adresa clădirii.',
    tips: [
      'Pentru fiecare imobil se generează o declarație ITL 002 separată.',
      'Apartamentul și locul de parcare din același bloc sunt imobile separate — adăugați-le pe rând.',
      'Căutați localitatea în lista SIRUTA: pentru București alegeți sectorul, de exemplu „București, Sector 2” — aplicația îl tipărește corect în ambele declarații.',
    ],
  },
  'property.building': {
    title: 'Tipul clădirii',
    short: 'Tipul clădirii stabilește ce valori trebuie declarate la pasul următor.',
    tips: [
      'Rezidențială — locuință: apartament, casă.',
      'Nerezidențială — birou, spațiu comercial, depozit, loc de parcare.',
      'Mixtă — o parte este locuință, o parte are altă destinație; valorile se declară separat pentru fiecare parte.',
      'Valoarea de achiziție se ia din contract, în lei.',
    ],
  },
  'property.values': {
    title: 'Valoarea clădirii',
    short: 'Completați cel puțin un indicator: valoarea în lei și data documentului din care provine.',
    where: [
      'b) raportul de evaluare întocmit de un evaluator autorizat',
      'c) procesul-verbal de recepție, pentru clădirile nou construite',
      'd) contractul de vânzare-cumpărare',
      'e) evidența contabilă a proprietarului, pentru chiriași și concesionari',
    ],
    tips: [
      'Sumele se pot scrie 1.250.000,50 sau 1250000.50 — se tipăresc automat în format românesc.',
      'La fiecare valoare completată este obligatorie data documentului.',
      'Dacă nu știți ce indicator se aplică, întrebați contabilul firmei.',
    ],
  },
  'property.land': {
    title: 'Terenul aferent',
    short: 'Terenul de sub clădire intră în declarația ITL 004, comună pentru toate imobilele.',
    where: ['Contractul de dobândire (cota-parte din teren)', 'Extrasul de carte funciară (suprafața)'],
    tips: [
      'La un apartament, birou sau loc de parcare, firma deține de obicei o cotă-parte din teren — de exemplu 12,50/1000.',
      'Intravilan înseamnă în interiorul localității; în București terenul este aproape întotdeauna intravilan.',
      'Rangul localității pentru București este 0.',
      'Zona (A–D) este stabilită de consiliul local; o puteți afla de la DGITL sau din documentele fiscale anterioare.',
      'Pentru apartamente și birouri se completează de regulă doar „Terenuri cu construcții”.',
    ],
  },
  'property.annex': {
    title: 'Documentele imobilului',
    short: 'Documentele care privesc doar acest imobil — de exemplu, raportul de evaluare.',
    tips: [
      'Documentele comune tuturor declarațiilor (certificatul ONRC, împuternicirea) se adaugă la etapa „Anexe”.',
      'Puteți lăsa lista goală.',
    ],
  },
  'properties.list': {
    title: 'Lista imobilelor',
    short: 'Adăugați câte un imobil pentru fiecare clădire sau unitate: apartament, birou, loc de parcare.',
    tips: [
      'Imobilul nou preia actul și adresa de la imobilul anterior — modificați doar ce diferă.',
      'Pentru fiecare imobil se va genera o declarație ITL 002.',
    ],
  },
  exemption: {
    title: 'Scutiri la impozitul pe teren',
    short: 'Majoritatea firmelor nu beneficiază de scutiri — în acest caz răspundeți „Nu”.',
    intro:
      'Completați doar dacă firma beneficiază de scutire sau reducere la impozitul pe teren, pe baza unor documente pe care le anexați.',
  },
  attachments: {
    title: 'Documente comune',
    short: 'Documentele anexate la fiecare declarație — de exemplu, certificatul ONRC sau împuternicirea.',
    tips: [
      'Copiile se certifică „conform cu originalul” (art. 64 alin. (5) din Legea nr. 207/2015).',
      'Documentele unui act sau ale unui imobil se adaugă la actul, respectiv la imobilul respectiv.',
    ],
  },
  signatures: {
    title: 'Data și semnături',
    short: 'Data declarațiilor și numele care se tipăresc deasupra semnăturilor.',
    tips: [
      'De obicei, data declarațiilor este data depunerii.',
      'Dacă nu completați directorul, în ITL 004 se tipărește semnatarul.',
      'Semnăturile și ștampila se aplică de mână, după tipărire.',
    ],
  },
  review: {
    title: 'Verificarea dosarului',
    short: 'Verificați fiecare secțiune, apoi generați documentele.',
    tips: [
      'Secțiunile marcate cu roșu au câmpuri de corectat — apăsați creionul pentru a le modifica.',
      'Veți primi câte o declarație ITL 002 pentru fiecare imobil și o declarație ITL 004 pentru teren.',
    ],
  },
  result: {
    title: 'Ce urmează',
    short: 'Descărcați PDF-urile, semnați-le și depuneți-le la DGITL Sector 2.',
    tips: [
      '1. Generați și descărcați PDF-ul fiecărei declarații.',
      '2. Tipăriți, semnați și ștampilați declarațiile.',
      '3. Atașați copiile documentelor enumerate la „Anexe”.',
      '4. Depuneți dosarul la DGITL Sector 2 — la ghișeu sau prin canalele online ale instituției.',
      'La prima generare, browserul descarcă o singură dată motorul de tipărire (aproximativ 11 MB); apoi îl ia din cache.',
    ],
  },
} as const satisfies Record<string, Help>

export type HelpTopic = keyof typeof HELP
