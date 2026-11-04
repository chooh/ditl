// ITL 004 (Model 2016, Anexa nr. 4) — декларация по налогу на землю для юрлиц.
// Текст — по бланку ITL004-Teren-PJ.docx. Отличия от бланка:
// - пункты «1. începând cu data de…» и строки таблицы печатаются только для заявленных участков;
// - из «dobândit/închiriat/concesionat/…» остаётся только выбранный вариант.

#import "common.typ": *

#let d = load-data("itl004")
#let r = d.reprezentant
#let c = d.contribuabil

#set document(title: "Declarație fiscală ITL 004")
#set page(paper: "a4", flipped: true, footer: page-footer, margin: (x: 1.2cm, y: 0.8cm))
#set text(font: SERIF, size: 10pt, lang: "ro")
#set par(justify: true, leading: 0.6em, spacing: 0.75em)
#set table(stroke: 0.6pt, inset: 4pt)

// ── Шапка ──
#grid(
  columns: (9cm, 1fr),
  table(
    columns: (1fr, 1fr),
    table.cell(colspan: 2)[
      Înregistrată sub nr. #dots(1cm) din #dots(0.6cm) / #dots(0.6cm) / 20#dots(0.6cm) \
      La organul fiscal local din raza administrativ-teritorială unde se află situate terenurile.
    ],
    [Funcționarul Public], [#dots(3cm) \ S.S.],
    table.cell(colspan: 2)[Rol Nominal Unic nr. #blank(d.rolNominal, width: 3cm)],
  ),
  align(right, text(size: 12pt, weight: "bold")[Anexa nr. 4 \ Model 2016 ITL – 004]),
)

#v(0.2cm)
#align(center, text(size: 12pt, weight: "bold")[
  DECLARAȚIE FISCALĂ \
  pentru stabilirea impozitului/taxei pe teren în cazul persoanelor juridice
])
#v(0.3cm)

// ── Представитель и юрлицо ──
#let domiciliu = if r.tara == "" or r.tara == "România" [ROMÂNIA] else [ROMÂNIA / #blank(r.tara)]

#h(1.5em)Subsemnatul #blank(r.nume, width: 6cm), identificat prin actul de identitate #blank(r.actTip),
seria #blank(r.serie, width: 1cm), nr. #blank(r.numar) și codul numeric personal #blank(r.cnp, width: 4cm),
domiciliat în #domiciliu, județul #blank(r.judet), codul poștal #blank(r.codPostal),
municipiul/orașul/comuna #blank(r.localitate, width: 3cm), satul/sectorul #blank(r.sector), str. #blank(r.strada, width: 4cm),
nr. #blank(r.nr, width: 1cm), bl. #blank(r.bloc, width: 1cm), sc. #blank(r.scara, width: 0.8cm), et. #blank(r.etaj, width: 0.8cm),
ap. #blank(r.apartament, width: 0.8cm), în calitate de reprezentant al #blank(c.denumire, width: 5cm),
Codul de identificare fiscală #blank(c.cif, width: 3cm), județ #blank(c.judet), loc. #blank(c.localitate, width: 3cm),
cod poștal #blank(c.codPostal), sector #blank(c.sector, width: 0.8cm), str. #blank(c.strada, width: 4cm),
nr. #blank(c.nr, width: 1cm), bloc #blank(c.bloc, width: 1cm), scara #blank(c.scara, width: 0.8cm), etaj #blank(c.etaj, width: 0.8cm),
ap. #blank(c.apartament, width: 0.8cm), tel. #blank(c.telefon, width: 3cm), fax #blank(c.fax, width: 3cm),
adresă de e-mail #blank(c.email, width: 4cm), înregistrat la registrul comerțului #blank(c.registruComertului, width: 3cm)
la nr. #blank(c.nrRegistruComertului, width: 3cm), cont IBAN #blank(c.iban, width: 5cm), deschis la #blank(c.banca, width: 4cm),
declar că:

// ── Участки: только заявленные ──
#for (i, t) in d.terenuri.enumerate() [
  #h(1.5em)#(i + 1). începând cu data de #blank(t.dataDobandirii) prin actul nr. #blank(t.nrAct)
  din #blank(t.dataAct), am #t.forma un teren situat în comuna/orașul/municipiul #blank(t.localitate, width: 4cm)
  satul/sectorul #blank(t.sector), str. #blank(t.strada, width: 4cm), nr. #blank(t.nr, width: 1cm),
  înregistrat în REGISTRUL AGRICOL #blank(t.registruPerioada, width: 2cm), TIPUL #blank(t.registruTip, width: 1cm),
  VOL #blank(t.registruVolum, width: 1cm), POZIȚIA NR. #blank(t.registruPozitie, width: 1.5cm),
  cota de proprietate #blank(t.cota), coproprietari: #blank(t.coproprietari, width: 8cm).

]

// ── Таблица участков ──
#let categories = (
  "constructii", "arabil", "pasune", "faneata",
  "vieRod", "vieNerod", "livadaRod", "livadaNerod",
  "padurePana20", "padurePeste20", "apeAmenajare", "apeFaraAmenajare",
  "drumuriLiber", "drumuriOcup", "neproductive",
)

#{
  set text(size: 7.5pt)
  set par(justify: false)
  let hc(body) = align(center + horizon, body)
  table(
    columns: (0.8cm, 1fr, 1.1cm) + (1.15cm,) * categories.len() + (1cm, 0.9cm),
    align: center + horizon,
    table.header(
      table.cell(rowspan: 3, hc[Nr. crt.]),
      table.cell(rowspan: 3, hc[Parcela / adresa unde este situat terenul]),
      table.cell(rowspan: 3, hc[Intravilan (I) / extravilan (E)]),
      table.cell(colspan: categories.len(), hc[Suprafața terenului, pe categorii de folosință, în m#super[2]]),
      table.cell(rowspan: 3, hc[Rang localit.]),
      table.cell(rowspan: 3, hc[Zona]),
      table.cell(rowspan: 2, hc[Terenuri cu construcții]),
      table.cell(rowspan: 2, hc[Arabil]),
      table.cell(rowspan: 2, hc[Pășune]),
      table.cell(rowspan: 2, hc[Fânață]),
      table.cell(colspan: 2, hc[Vie]),
      table.cell(colspan: 2, hc[Livadă]),
      table.cell(colspan: 2, hc[Pădure]),
      table.cell(colspan: 2, hc[Terenuri cu ape]),
      table.cell(colspan: 2, hc[Drumuri și căi ferate]),
      table.cell(rowspan: 2, hc[Terenuri neproduct.]),
      [Intrată pe rod], [Neintrată pe rod],
      [Intrată pe rod], [Neintrată pe rod],
      [Până în 20 de ani / cu rol de protecție], [Peste 20 de ani],
      [Cu amenajare piscicolă], [Fără amenajare piscicolă],
      [Liber], [Ocup],
    ),
    ..d.terenuri.enumerate().map(((i, t)) => (
      [#(i + 1)],
      align(left, t.parcela),
      t.intravilan,
      ..categories.map(k => t.suprafete.at(k, default: "")),
      t.rang,
      t.zona,
    )).flatten(),
  )
}

// ── Льготы, согласие, приложения ──
// Точки не переносятся, и при выключке по ширине строка с ними растягивается — здесь без неё.
#par(justify: false)[
  Beneficiez de scutire/reducere de la plata impozitului pe teren în cotă de #blank(d.scutire.cota, width: 1.5cm),
  în calitate de #blank(d.scutire.calitate, width: 4cm) conform documentelor anexate #blank(d.scutire.documente, width: 6cm).
]

#check(d.comunicareEmail) Sunt de acord ca actele administrative fiscale să-mi fie comunicate exclusiv la adresa de poștă electronică.

Anexez la prezenta declarație copii ale documentelor, certificate de conformitate cu originalul, conform art. 64 alin. (5)
din Legea nr. 207/2015 privind Codul de procedură fiscală, cu modificările și completările ulterioare, după cum urmează:
// Без приложений — три пустые строки, как на бланке.
#let anexe = if d.anexe.len() > 0 { d.anexe } else { (dots(8cm),) * 3 }
#pad(left: 1.5em, enum(tight: true, ..anexe))

Prin semnarea prezentei am luat la cunoștință că declararea necorespunzătoare a adevărului se pedepsește conform legii penale,
cele declarate fiind corecte și complete.

// ── Подписи ──
#v(0.2cm)
#let signature(role, name, stamp: false) = align(center, stack(
  spacing: 4pt,
  role,
  if name != "" { name } else { dots(5cm) },
  v(0.6cm),
  grid(
    columns: (auto, 6cm),
    column-gutter: 0.5em,
    align: bottom,
    // L.S. без печати — невидимый, чтобы линии подписей были на одной высоте.
    if stamp [L.S.] else { hide[L.S.] },
    line(length: 100%, stroke: 0.5pt),
  ),
  text(size: 8pt)[(prenumele, numele și semnătura)],
))
// Подписи не разрываются между страницами.
#block(breakable: false, grid(
  columns: (1fr, 1fr, 1fr),
  [Data #blank(d.data, width: 2.5cm)],
  signature("Director P.J.,", d.director, stamp: true),
  signature("Șef compartiment contabil,", d.sefContabil),
))
