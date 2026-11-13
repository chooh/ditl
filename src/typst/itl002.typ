// ITL 002 (Model 2016, Anexa nr. 2) — декларация по налогу на здания юрлиц, DGITL Sector 2.
// Текст и порядок полей — по бланку ITL002-cladiri-reziden-nerez-mixt-PJ-2021.docx.
// Раскладка своя: сетка из 48 колонок, у каждой ячейки подпись сверху и значение под ней.
// Подписи адресных граф одинаковые во всех адресах (на бланке «Bloc»/«Blocul», «Nr»/«Număr» и т. п.).
// Согласие на e-mail — рядом с адресом почты; sediu social — отдельной строкой с подписью, как адрес для корреспонденции.
// Приложения печатаются только заполненные.

#import "common.typ": *

#let d = load-data("itl002")
#let c = d.contribuabil
#let imp = d.imputernicit
#let b = d.cladire

#set document(title: "Declarație fiscală ITL 002")
#set page(paper: "a4", flipped: true, footer: page-footer, margin: (x: 0.8cm, top: 0.6cm, bottom: 0.6cm))
#set text(font: SANS, size: 7.5pt, lang: "ro")
#set par(leading: 0.45em, spacing: 0.6em)

#let COLS = 48
#let LABEL = luma(70)
#let SHADE = luma(225)

/// Ячейка «подпись + значение». Пустое значение занимает строку, чтобы высота ячеек в ряду не прыгала.
#let field(label, value, span: 2) = table.cell(colspan: span)[
  #text(size: 6.5pt, fill: LABEL, label) \
  #text(size: 8.5pt, if value == "" { hide[–] } else { value })
]
/// Строка-заголовок раздела на всю ширину.
#let section(body) = table.cell(colspan: COLS, fill: SHADE, text(weight: "bold", body))
/// Ячейка с одним текстом, без значения.
#let note(body, span: 2, ..args) = table.cell(colspan: span, ..args, body)

#let form = table.with(columns: (1fr,) * COLS, stroke: 0.5pt, inset: (x: 3pt, y: 2pt))
#let empty-address = (strada: "", nr: "", codPostal: "", bloc: "", scara: "", etaj: "", apartament: "", localitate: "", judet: "", tara: "")
#let imp = if imp == none { (nume: "", prenume: "", cif: "", telefon: "", email: "", adresa: empty-address) } else { imp }

// ── Шапка ──
#grid(
  columns: (1fr, auto),
  align: (left + horizon, right + horizon),
  logo(height: 1.35cm),
  [
    #text(size: 9pt)[Anexa nr. 2] \
    #v(2pt)
    #text(size: 13pt, weight: "bold")[Model 2016 ITL - 002]
  ],
)
#v(4pt)

#form(
  field([Numărul de rol nominal unic], d.antet.rolNominal, span: 12),
  note(span: 6, align(horizon, strong[Registrul agricol])),
  field([Tipul], d.antet.registruTip, span: 8),
  field([Volumul], d.antet.registruVolum, span: 8),
  field([Poziția], d.antet.registruPozitie, span: 14),
  note(span: 12, align(horizon, text(size: 11pt, weight: "bold")[DECLARAȚIE FISCALĂ:])),
  note(span: 36, align(horizon, strong[
    PENTRU STABILIREA IMPOZITULUI/TAXEI PE CLĂDIRILE REZIDENȚIALE / NEREZIDENȚIALE / CU DESTINAȚIE MIXTĂ
    AFLATE ÎN PROPRIETATEA PERSOANELOR JURIDICE
  ])),

  // ── I. Contribuabil ──
  section[I. DATE DE IDENTIFICARE A CONTRIBUABILULUI],
  field([Denumire contribuabil], c.denumire, span: 24),
  field([Codul de identificare fiscală], c.cif, span: 12),
  field([Codul unic de identificare], c.cui, span: 12),
  field([Numărul tel./fax], c.telefon, span: 10),
  field([Adresa de poștă electronică], c.email, span: 14),
  note(span: 24)[
    Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică \
    #h(1fr) DA #check(c.comunicareEmail == "da") #h(1fr) NU #check(c.comunicareEmail == "nu") #h(1fr)
  ],
  // Колонки адресов совпадают до «Ap.», чтобы sediu и адрес для корреспонденции читались столбцами.
  // Подпись адреса — в две строки, место отдано коротким графам: Nr., Bloc, Scara, Etaj, Ap.
  note(span: 4, align(horizon)[Adresa sediului social]),
  field([Strada], c.sediu.strada, span: 9),
  field([Nr.], c.sediu.nr, span: 3),
  field([Cod poștal], c.sediu.codPostal, span: 4),
  field([Bloc], c.sediu.bloc, span: 3),
  field([Scara], c.sediu.scara, span: 3),
  field([Etaj], c.sediu.etaj, span: 3),
  field([Ap.], c.sediu.apartament, span: 3),
  field([Localitatea], c.sediu.localitate, span: 6),
  field([Județul/Sectorul], c.sediu.judet, span: 6),
  field([Țara], c.sediu.tara, span: 4),
  note(span: 4, align(horizon)[Adresa de corespondență]),
  field([Strada], c.corespondenta.strada, span: 9),
  field([Nr.], c.corespondenta.nr, span: 3),
  field([Cod poștal], c.corespondenta.codPostal, span: 4),
  field([Bloc], c.corespondenta.bloc, span: 3),
  field([Scara], c.corespondenta.scara, span: 3),
  field([Etaj], c.corespondenta.etaj, span: 3),
  field([Ap.], c.corespondenta.apartament, span: 3),
  field([Localitatea], c.corespondenta.localitate, span: 16),

  // ── II. Împuternicit ──
  section[
    II. DATE DE IDENTIFICARE A ÎMPUTERNICITULUI
    #text(weight: "regular")[(Împuternicirea nu este transmisibilă și încetează la data revocării de către contribuabil sau la data decesului acestuia.)]
  ],
  field([Numele], imp.nume, span: 16),
  field([Prenumele], imp.prenume, span: 16),
  field([Codul de identificare fiscală], imp.cif, span: 16),
  field([Numărul tel./fax], imp.telefon, span: 10),
  field([Adresa de poștă electronică], imp.email, span: 14),
  field([Strada], imp.adresa.strada, span: 24),
  field([Nr.], imp.adresa.nr, span: 4),
  field([Cod poștal], imp.adresa.codPostal, span: 6),
  field([Bloc], imp.adresa.bloc, span: 4),
  field([Scara], imp.adresa.scara, span: 4),
  field([Etaj], imp.adresa.etaj, span: 4),
  field([Ap.], imp.adresa.apartament, span: 4),
  field([Localitatea], imp.adresa.localitate, span: 8),
  field([Județul/Sectorul], imp.adresa.judet, span: 8),
  field([Țara], imp.adresa.tara, span: 6),

  // ── III. Adresa în alt stat ──
  note(span: 12, fill: SHADE, strong[III. Adresa de rezidență a contribuabilului în alt stat decât România]),
  note(span: 36, align(horizon, text(size: 8.5pt, d.adresaStrainatate))),

  // ── IV. Clădirea ──
  note(span: 24, fill: SHADE)[
    *IV. DATELE CLĂDIRII NECESARE STABILIRII IMPOZITULUI/TAXEI DATORAT/Ă PE CLĂDIRI* \
    #check(b.tip == "nerezidentiala") *NEREZIDENȚIALE* /
    #check(b.tip == "rezidentiala") *REZIDENȚIALE* /
    #check(b.tip == "mixta") *MIXTE*
  ],
  field([Nr. act dobândire], b.nrAct, span: 8),
  field([Data dobândirii], b.dataDobandirii, span: 8),
  field([Valoare achiziție (lei)], b.valoareAchizitie, span: 8),
  note(span: COLS)[
    #let forma(key, label) = [#check(b.formaDobandire == key) #label #h(1.2em)]
    Forma de dobândire: #h(1em)
    #forma("proprietate")[Proprietate]
    #forma("inchiriere")[Închiriere]
    #forma("concesiune")[Concesiune]
    #forma("administrare")[Administrare]
    #forma("folosinta")[Folosință]
    #check(b.formaDobandire == "alte") Alte modalități:
    #text(size: 8.5pt, if b.formaDobandire == "alte" { b.formaAlta })
  ],
  field([Strada], b.adresa.strada, span: 16),
  field([Nr.], b.adresa.nr, span: 4),
  field([Bloc], b.adresa.bloc, span: 4),
  field([Scara], b.adresa.scara, span: 4),
  field([Etaj], b.adresa.etaj, span: 4),
  field([Ap.], b.adresa.apartament, span: 4),
  field([Localitate/sector], b.adresa.localitate, span: 12),

  // Таблица «Indicator»: 4 колонки подписи + 5 индикаторов × (rezidențial, nerezidențial) по 2.
  note(span: 8, rowspan: 2, align(center + horizon)[Indicator]),
  note(span: 8)[a) înregistrată în evidențele organului fiscal],
  note(span: 8)[b) rezultată dintr-un raport de evaluare],
  note(span: 8)[c) lucrărilor de construcții, în cazul clădirilor nou construite],
  note(span: 8)[d) de achiziție],
  note(span: 8, text(size: 6.5pt)[
    e) înscrisă în contabilitatea proprietarului clădirii și comunicată concesionarului, locatarului,
    titularului dreptului de administrare sau de folosință, după caz
  ]),
  ..("a", "b", "c", "d", "e").map(_ => (
    note(span: 4, align(center, text(size: 6.5pt)[Rezidențial])),
    note(span: 4, align(center, text(size: 6.5pt)[Nerezidențial])),
  )).flatten(),
  ..(("valoare", [Valoare]), ("data", [Data documentului])).map(((key, label)) => (
    note(span: 8, label),
    ..("a", "b", "c", "d", "e").map(col => ("rez", "nerez").map(use => note(
      span: 4,
      align(center, text(size: 8.5pt, b.indicatori.at(col).at(use).at(key))),
    ))).flatten(),
  )).flatten(),
)

// ── Приложения ──
#v(3pt)
Anexez la prezenta declarație copii ale documentelor, certificate de conformitate cu originalul, conform art. 64 alin. (5)
din Legea nr. 207/2015 privind Codul de procedură fiscală, cu modificările și completările ulterioare, după cum urmează:
// Три колонки, нумерация сверху вниз, как на бланке. Без приложений — три пустые строки.
#let anexe = if d.anexe.len() > 0 { d.anexe } else { (dots(7cm),) * 3 }
#let per-column = calc.ceil(anexe.len() / 3)
#pad(left: 1.5em, grid(
  columns: (1fr,) * 3,
  column-gutter: 1em,
  ..range(3).map(i => {
    let start = calc.min(i * per-column, anexe.len())
    let end = calc.min(start + per-column, anexe.len())
    enum(start: start + 1, tight: true, ..anexe.slice(start, end).map(a => text(size: 8.5pt, a)))
  }),
))

// ── Декларация и подписи ──
#form(
  note(span: COLS, fill: SHADE, strong[
    Sub sancțiunile aplicate faptei de fals în acte publice, declar că: \
    // «1\.» — иначе Typst примет строку за нумерованный список.
    1\. datele înscrise în prezentul formular, precum și orice documente anexate depuse de mine sunt corecte și complete, conforme cu realitatea; \
    2\. în cazul în care intervin modificări privind situația juridică a contribuabilului ori a bunului impozabil/taxabil, mă oblig să depun
    o nouă declarație fiscală care să reflecte realitatea, în termen de 30 de zile de la apariția situației respective.
  ]),
  note(span: 8, align(horizon)[Posed actul de identitate]),
  field([TIPUL], d.actIdentitate.tip, span: 4),
  field([seria], d.actIdentitate.serie, span: 4),
  field([numărul], d.actIdentitate.numar, span: 6),
  field([eliberat de], d.actIdentitate.eliberatDe, span: 16),
  field([La data de], d.actIdentitate.data, span: 10),
  table.cell(colspan: 12)[
    #text(size: 6.5pt, fill: LABEL)[Data și semnătura împuternicitului] \
    #text(size: 8.5pt, d.dataDeclaratiei)
    #v(0.7cm)
  ],
  note(span: 36, align(center + horizon, strong[În acest tip de chenar completează contribuabilul sau împuternicitul acestuia.])),
  note(span: COLS, align(center)[
    În cazul în care contribuabilul nu poate citi sau scrie, declarația fiscală se completează de o persoană agreată de către acesta,
    care îi va citi integral conținutul declarației fiscale și va semna pentru conformitate.
  ]),
  table.cell(colspan: 12)[#text(size: 6.5pt, fill: LABEL)[Data și semnătura] #v(0.5cm)],
  note(span: 36, strong[Date de identificare ale acestei persoane:]),
  note(span: 8, align(horizon)[Posed actul de identitate]),
  field([TIPUL], "", span: 4),
  field([seria], "", span: 4),
  field([numărul], "", span: 6),
  field([eliberat de], "", span: 26),
)
