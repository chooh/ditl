// ITL 002 (Model 2016, Anexa nr. 2) — декларация по налогу на здания юрлиц, DGITL Sector 2.
// Текст и порядок полей — по бланку ITL002-cladiri-reziden-nerez-mixt-PJ-2021.docx.
// Раскладка своя: сетка из 24 колонок, у каждой ячейки подпись сверху и значение под ней.
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

#let COLS = 24
#let LABEL = luma(70)
#let SHADE = luma(225)

/// Ячейка «подпись + значение». Пустое значение занимает строку, чтобы высота ячеек в ряду не прыгала.
#let field(label, value, span: 1) = table.cell(colspan: span)[
  #text(size: 6.5pt, fill: LABEL, label) \
  #text(size: 8.5pt, if value == "" { hide[–] } else { value })
]
/// Строка-заголовок раздела на всю ширину.
#let section(body) = table.cell(colspan: COLS, fill: SHADE, text(weight: "bold", body))
/// Ячейка с одним текстом, без значения.
#let note(body, span: 1, ..args) = table.cell(colspan: span, ..args, body)

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
  field([Numărul de rol nominal unic], d.antet.rolNominal, span: 6),
  note(span: 3, align(horizon, strong[Registrul agricol])),
  field([Tipul], d.antet.registruTip, span: 4),
  field([Volumul], d.antet.registruVolum, span: 4),
  field([Poziția], d.antet.registruPozitie, span: 7),
  note(span: 6, align(horizon, text(size: 11pt, weight: "bold")[DECLARAȚIE FISCALĂ:])),
  note(span: 18, align(horizon, strong[
    PENTRU STABILIREA IMPOZITULUI/TAXEI PE CLĂDIRILE REZIDENȚIALE / NEREZIDENȚIALE / CU DESTINAȚIE MIXTĂ
    AFLATE ÎN PROPRIETATEA PERSOANELOR JURIDICE
  ])),

  // ── I. Contribuabil ──
  section[I. DATE DE IDENTIFICARE A CONTRIBUABILULUI],
  field([Denumire contribuabil], c.denumire, span: 12),
  field([Codul de identificare fiscală], c.cif, span: 6),
  field([Codul unic de identificare], c.cui, span: 6),
  field([Numărul tel./fax], c.telefon, span: 5),
  field([Adresa de poștă electronică], c.email, span: 7),
  note(span: 12)[
    Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică \
    #h(1fr) DA #check(c.comunicareEmail == "da") #h(1fr) NU #check(c.comunicareEmail == "nu") #h(1fr)
  ],
  // Колонки адресов совпадают до «Ap.», чтобы sediu и адрес для корреспонденции читались столбцами.
  note(span: 3, align(horizon)[Adresa sediului social]),
  field([Strada], c.sediu.strada, span: 5),
  field([Nr.], c.sediu.nr, span: 1),
  field([Cod poștal], c.sediu.codPostal, span: 2),
  field([Bloc], c.sediu.bloc, span: 1),
  field([Scara], c.sediu.scara, span: 1),
  field([Etaj], c.sediu.etaj, span: 1),
  field([Ap.], c.sediu.apartament, span: 2),
  field([Localitatea], c.sediu.localitate, span: 3),
  field([Județul/Sectorul], c.sediu.judet, span: 3),
  field([Țara], c.sediu.tara, span: 2),
  note(span: 3, align(horizon)[Adresa de corespondență]),
  field([Strada], c.corespondenta.strada, span: 5),
  field([Nr.], c.corespondenta.nr, span: 1),
  field([Cod poștal], c.corespondenta.codPostal, span: 2),
  field([Bloc], c.corespondenta.bloc, span: 1),
  field([Scara], c.corespondenta.scara, span: 1),
  field([Etaj], c.corespondenta.etaj, span: 1),
  field([Ap.], c.corespondenta.apartament, span: 2),
  field([Localitatea], c.corespondenta.localitate, span: 8),

  // ── II. Împuternicit ──
  section[
    II. DATE DE IDENTIFICARE A ÎMPUTERNICITULUI
    #text(weight: "regular")[(Împuternicirea nu este transmisibilă și încetează la data revocării de către contribuabil sau la data decesului acestuia.)]
  ],
  field([Numele], imp.nume, span: 8),
  field([Prenumele], imp.prenume, span: 8),
  field([Codul de identificare fiscală], imp.cif, span: 8),
  field([Numărul tel./fax], imp.telefon, span: 5),
  field([Adresa de poștă electronică], imp.email, span: 7),
  field([Strada], imp.adresa.strada, span: 12),
  field([Nr.], imp.adresa.nr, span: 2),
  field([Cod poștal], imp.adresa.codPostal, span: 3),
  field([Bloc], imp.adresa.bloc, span: 2),
  field([Scara], imp.adresa.scara, span: 2),
  field([Etaj], imp.adresa.etaj, span: 2),
  field([Ap.], imp.adresa.apartament, span: 2),
  field([Localitatea], imp.adresa.localitate, span: 4),
  field([Județul/Sectorul], imp.adresa.judet, span: 4),
  field([Țara], imp.adresa.tara, span: 3),

  // ── III. Adresa în alt stat ──
  note(span: 6, fill: SHADE, strong[III. Adresa de rezidență a contribuabilului în alt stat decât România]),
  note(span: 18, align(horizon, text(size: 8.5pt, d.adresaStrainatate))),

  // ── IV. Clădirea ──
  note(span: 12, fill: SHADE)[
    *IV. DATELE CLĂDIRII NECESARE STABILIRII IMPOZITULUI/TAXEI DATORAT/Ă PE CLĂDIRI* \
    #check(b.tip == "nerezidentiala") *NEREZIDENȚIALE* /
    #check(b.tip == "rezidentiala") *REZIDENȚIALE* /
    #check(b.tip == "mixta") *MIXTE*
  ],
  field([Nr. act dobândire], b.nrAct, span: 4),
  field([Data dobândirii], b.dataDobandirii, span: 4),
  field([Valoare achiziție (lei)], b.valoareAchizitie, span: 4),
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
  field([Strada], b.adresa.strada, span: 8),
  field([Nr.], b.adresa.nr, span: 2),
  field([Bloc], b.adresa.bloc, span: 2),
  field([Scara], b.adresa.scara, span: 2),
  field([Etaj], b.adresa.etaj, span: 2),
  field([Ap.], b.adresa.apartament, span: 2),
  field([Localitate/sector], b.adresa.localitate, span: 6),

  // Таблица «Indicator»: 4 колонки подписи + 5 индикаторов × (rezidențial, nerezidențial) по 2.
  note(span: 4, rowspan: 2, align(center + horizon)[Indicator]),
  note(span: 4)[a) înregistrată în evidențele organului fiscal],
  note(span: 4)[b) rezultată dintr-un raport de evaluare],
  note(span: 4)[c) lucrărilor de construcții, în cazul clădirilor nou construite],
  note(span: 4)[d) de achiziție],
  note(span: 4, text(size: 6.5pt)[
    e) înscrisă în contabilitatea proprietarului clădirii și comunicată concesionarului, locatarului,
    titularului dreptului de administrare sau de folosință, după caz
  ]),
  ..("a", "b", "c", "d", "e").map(_ => (
    note(span: 2, align(center, text(size: 6.5pt)[Rezidențial])),
    note(span: 2, align(center, text(size: 6.5pt)[Nerezidențial])),
  )).flatten(),
  ..(("valoare", [Valoare]), ("data", [Data documentului])).map(((key, label)) => (
    note(span: 4, label),
    ..("a", "b", "c", "d", "e").map(col => ("rez", "nerez").map(use => note(
      span: 2,
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
  note(span: 4, align(horizon)[Posed actul de identitate]),
  field([TIPUL], d.actIdentitate.tip, span: 2),
  field([seria], d.actIdentitate.serie, span: 2),
  field([numărul], d.actIdentitate.numar, span: 3),
  field([eliberat de], d.actIdentitate.eliberatDe, span: 8),
  field([La data de], d.actIdentitate.data, span: 5),
  table.cell(colspan: 6)[
    #text(size: 6.5pt, fill: LABEL)[Data și semnătura împuternicitului] \
    #text(size: 8.5pt, d.dataDeclaratiei)
    #v(0.7cm)
  ],
  note(span: 18, align(center + horizon, strong[În acest tip de chenar completează contribuabilul sau împuternicitul acestuia.])),
  note(span: COLS, align(center)[
    În cazul în care contribuabilul nu poate citi sau scrie, declarația fiscală se completează de o persoană agreată de către acesta,
    care îi va citi integral conținutul declarației fiscale și va semna pentru conformitate.
  ]),
  table.cell(colspan: 6)[#text(size: 6.5pt, fill: LABEL)[Data și semnătura] #v(0.5cm)],
  note(span: 18, strong[Date de identificare ale acestei persoane:]),
  note(span: 4, align(horizon)[Posed actul de identitate]),
  field([TIPUL], "", span: 2),
  field([seria], "", span: 2),
  field([numărul], "", span: 3),
  field([eliberat de], "", span: 13),
)
