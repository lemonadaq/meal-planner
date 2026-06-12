import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import Toast from '../components/Toast'
import { formatDataLocal, dzisLocal } from '../dataHelpers'
import { PromoBanner, PromoChip, PromoDetail, StoreDot } from '../components/Promocje'
import { dopasujPromocje, pobierzAktualnePromocje } from '../promocjeMatch'

// ── Promocje: mock do testów UI (domyślnie wyłączony) ──
// Włącz MOCK_PROMO = true żeby zobaczyć chipy/banner bez danych w tabeli `promocje`.
const MOCK_PROMO = true
const MOCK_PROMO_DANE = [
  { store: 'Lidl',      old: 8.49,  now: 5.99, off: '-29%',     until: 'do niedzieli' },
  { store: 'Biedronka', old: null,  now: 3.50, off: '2 za 7 zł', until: 'do jutra' },
  { store: 'Kaufland',  old: 12.99, now: 9.49, off: '-27%',     until: 'dziś!' },
]

const KATEGORIE = [
  { id: '1_Warzywa i owoce',   label: 'Warzywa i owoce' },
  { id: '2_Mięso i ryby',      label: 'Mięso i ryby' },
  { id: '3_Nabiał',            label: 'Nabiał' },
  { id: '4_Pieczywo',          label: 'Pieczywo' },
  { id: '5_Produkty sypkie',   label: 'Produkty sypkie' },
  { id: '6_Konserwy i słoiki', label: 'Konserwy i słoiki' },
  { id: '7_Przyprawy',         label: 'Przyprawy' },
  { id: '8_Inne',              label: 'Inne (papier, chemia, itp.)' },
]

const JEDNOSTKI = ['', 'szt.', 'opak.', 'g', 'kg', 'ml', 'l', 'pęczek']

const DOMYSLNE_PRODUKTY_W_DOMU = [
  'Olej', 'Oliwa', 'Cukier', 'Mąka',
  'Papryka słodka', 'Oregano', 'Bazylia',
]

// Te składniki mogą zostać w przepisach, ale nie powinny wpadać na listę zakupów.
// Dotyczy tylko pozycji wygenerowanych z przepisów — ręcznie dopisany produkt zostaje na liście.
const ZAWSZE_UKRYTE_Z_PRZEPISOW = ['Sól', 'Pieprz']

function normalizujProduktDomowy(nazwa = '') {
  return nazwa
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[;,.:\s]+$/g, '')
    .trim()
}

function ladnaNazwaProduktuDomowego(nazwa = '') {
  const czyste = poprawNazwe(nazwa)
  if (!czyste) return ''
  return czyste.charAt(0).toUpperCase() + czyste.slice(1)
}

function unikalneProduktyWDomu(lista = []) {
  const mapa = new Map()
  lista.forEach(nazwa => {
    const ladna = ladnaNazwaProduktuDomowego(nazwa)
    const norm = normalizujProduktDomowy(ladna)
    if (norm && !mapa.has(norm)) mapa.set(norm, ladna)
  })
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pl'))
}

function kluczZakupu(skladnik, jednostka = '') {
  return `${poprawNazwe(skladnik)}||${jednostka || ''}`
}

function tekstIlosciZItemu(item) {
  if (!item) return ''
  if (item.iloscOryginalna != null && item.iloscOryginalna !== '') return item.iloscOryginalna.toString()
  if (item.ilosc != null) return `${item.ilosc}${item.jednostka ? ` ${item.jednostka}` : ''}`.trim()
  if (item.jednostka) return item.jednostka.toString()
  return ''
}

function zastosujKorekteZakupu(item, korekta) {
  if (!item) return null
  const bazaKlucz = item.bazaKlucz || item.klucz
  if (!korekta) return { ...item, bazaKlucz }
  if (korekta.usuniety) return null

  const nazwa = poprawNazwe(korekta.nazwa || item.skladnik)
  if (!nazwa) return null

  const iloscTekst = normalizujIloscTekst(korekta.ilosc)
  const kategoria = bezpiecznaKategoria(korekta.kategoria || item.kategoria)

  return {
    ...item,
    bazaKlucz,
    klucz: kluczZakupu(nazwa, ''),
    skladnik: nazwa,
    ilosc: null,
    iloscOryginalna: iloscTekst || '',
    jednostka: '',
    kategoria,
    edytowany: true,
    opakowania: null, // korekta nadpisuje — user wpisał własną ilość, nie zaokrąglamy
  }
}

function produktPasujeDoDomu(nazwa, produktyWDomuSet) {
  const n = normalizujProduktDomowy(nazwa)
  if (!n || !produktyWDomuSet?.size) return false
  if (produktyWDomuSet.has(n)) return true

  for (const baza of produktyWDomuSet) {
    if (!baza) continue
    if (n === baza || n.startsWith(`${baza} `) || n.includes(` ${baza} `)) return true
  }
  return false
}

function produktZawszeUkrytyZPrzepisow(nazwa) {
  const staleUkryte = new Set(ZAWSZE_UKRYTE_Z_PRZEPISOW.map(normalizujProduktDomowy).filter(Boolean))
  return produktPasujeDoDomu(nazwa, staleUkryte)
}

function normalizujJednostke(raw = '') {
  const x = raw.toString().trim().toLowerCase().replace(/\.+$/, '')
  if (!x) return ''
  if (['szt', 'sztuka', 'sztuki', 'sztuk'].includes(x)) return 'szt.'
  if (['op', 'opak', 'opakowanie', 'opakowania', 'paczka', 'paczki', 'paczkę'].includes(x)) return 'opak.'
  if (['gram', 'gramy'].includes(x)) return 'g'
  if (['kilogram', 'kilogramy'].includes(x)) return 'kg'
  if (['dekagram', 'dekagramy', 'dkg'].includes(x)) return 'dag'
  if (['mililitr', 'mililitry'].includes(x)) return 'ml'
  if (['litr', 'litry'].includes(x)) return 'l'
  if (['peczek', 'pęczek', 'peczki', 'pęczki'].includes(x)) return 'pęczek'
  if (['sloik', 'słoik', 'sloiki', 'słoiki'].includes(x)) return 'słoik'
  if (['butelka', 'butelki'].includes(x)) return 'but.'
  return raw.toString().trim()
}

function rozpoznajKategorie(nazwa = '') {
  const x = nazwa.toLowerCase()
  if (/chleb|buł|bul|bagiet|kajzer|pieczyw|tost|tortill/.test(x)) return '4_Pieczywo'
  if (/mleko|jogurt|kefir|maślank|maslank|ser|twar[oó]g|śmietan|smietan|masło|maslo|margaryn|jaj/.test(x)) return '3_Nabiał'
  if (/pomidor|og[oó]rek|ziemni|marchew|cebula|czosnek|papryk|sałat|salat|jabł|jabl|banan|cytryn|limonk|awokado|broku|kalafior|kapust|cukini|bakła|bakla|pietruszk|koper|szczyp/.test(x)) return '1_Warzywa i owoce'
  if (/kurczak|wołow|wolow|wieprz|schab|kark[oó]w|mi[eę]so|mielon|szynk|boczek|kiełbas|kielbas|ryb|łosoś|losos|dorsz|tuńczyk|tunczyk/.test(x)) return '2_Mięso i ryby'
  if (/makaron|ryż|ryz|kasz|mąk|maka|cukier|płatki|platki|owsian|soczewic|ciecierzyc|fasol|groch/.test(x)) return '5_Produkty sypkie'
  if (/konserw|puszk|słoik|sloik|passat|przecier|kukurydz|groszek|oliwk|musztard|majonez|ketchup|chrzan/.test(x)) return '6_Konserwy i słoiki'
  if (/s[oó]l|pieprz|papryka słodka|papryka ostra|oregano|bazyl|curry|przypraw|zioł|ziol|cynamon/.test(x)) return '7_Przyprawy'
  return '8_Inne'
}

function poprawNazwe(nazwa = '') {
  return nazwa
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[;,.\s]+$/, '')
    .trim()
}

function toIlosc(raw) {
  const n = parseFloat((raw || '').toString().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function bezpiecznaKategoria(kategoria) {
  return KATEGORIE.some(k => k.id === kategoria) ? kategoria : '8_Inne'
}

function brakKolumnyJednostka(error) {
  return error?.code === 'PGRST204' && /jednostka/i.test(error?.message || '')
}

function bezJednostkiKolumny(rekord) {
  const { jednostka, ...reszta } = rekord || {}
  return reszta
}

// Zwraca poniedziałek tygodnia na podstawie offsetu (0 = bieżący, 1 = następny, -1 = poprzedni)
function tydzienZakupowZOffsetem(offset = 0) {
  const d = new Date()
  const day = d.getDay() // 0=nd, 6=sob
  const cofniecie = day === 0 ? 6 : Math.max(0, day - 1)
  d.setDate(d.getDate() - cofniecie + offset * 7)
  d.setHours(0, 0, 0, 0)
  return formatDataLocal(d)
}

// Fallback bez argumentu — używany w miejscach gdzie nie mamy dostępu do propa
function aktualnyTydzienZakupow() {
  return tydzienZakupowZOffsetem(0)
}

function czyZakupyNaNastepnyTydzien(tydzienKalendarza = 0) {
  return tydzienKalendarza > 0
}

function etykietaTygodnia(offset) {
  if (offset === 0) return 'TEN TYDZIEŃ'
  if (offset === 1) return 'NASTĘPNY TYDZIEŃ'
  if (offset === -1) return 'POPRZEDNI TYDZIEŃ'
  const n = Math.abs(offset)
  const forma = (n % 100 >= 12 && n % 100 <= 14) ? 'TYGODNI'
    : (n % 10 >= 2 && n % 10 <= 4) ? 'TYGODNIE'
    : 'TYGODNI'
  if (offset > 1) return `ZA ${n} ${forma}`
  return `${n} ${forma} TEMU`
}

function tekstIlosciSzybkiej(dane) {
  if (!dane || dane.ilosc == null || !Number.isFinite(dane.ilosc)) return null
  const liczba = Number.isInteger(dane.ilosc) ? String(dane.ilosc) : String(dane.ilosc).replace('.', ',')
  const jednostka = dane.jednostka ? normalizujJednostke(dane.jednostka) : ''
  return `${liczba}${jednostka ? ` ${jednostka}` : ''}`.trim() || null
}

function normalizujIloscTekst(raw) {
  const tekst = raw == null ? '' : raw.toString().replace(/\s+/g, ' ').trim()
  return tekst || null
}

function rozbijSzybkieLinie(tekst = '') {
  // Obsługuje zarówno Enter, średnik, jak i szybkie wpisy po przecinku:
  // „Woda, Musztarda sarepska 1szt., Margaryna”.
  // Nie rozbija liczb dziesiętnych typu „1,5 kg”.
  return tekst
    .split(/\r?\n|;/)
    .flatMap(linia => linia.split(/,\s+(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/u))
    .map(x => x.trim())
    .filter(Boolean)
}

// ════════════════════════════════════════════════════════════
// SKLADNIKI_META — normalizacja, konwersja jednostek, opakowania
// ════════════════════════════════════════════════════════════

// Normalizacja MUSI być identyczna z SQL:
// trim(regexp_replace(lower(translate(nazwa, polskie→ascii)), '[^a-z0-9]+', ' ', 'g'))
function normalizujNazweMeta(nazwa = '') {
  return nazwa
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Konwersja między jednostkami zgodnymi (g↔kg, ml↔l).
// Zwraca: { ilosc, jednostka } w jednostce docelowej, albo null jeśli nie da się.
function przeliczDoBazowej(ilosc, jednostkaZ, jednostkaDo) {
  if (ilosc == null) return null
  const z = (jednostkaZ || '').toString().trim().toLowerCase().replace(/\.+$/, '')
  const d = (jednostkaDo || '').toString().trim().toLowerCase().replace(/\.+$/, '')

  // Te same → bez konwersji
  if (z === d) return { ilosc, jednostka: jednostkaDo }

  // Tabela przeliczników — wartość = ile jednostek docelowych w 1 jednostce źródłowej
  const PRZELICZNIKI = {
    // do gramów
    'kg→g': 1000,
    'dag→g': 10,
    'g→g': 1,
    // gramy do większych — głównie do display, ale tu nie używamy
    'g→kg': 0.001,
    // do mililitrów
    'l→ml': 1000,
    'ml→ml': 1,
    'ml→l': 0.001,
  }

  const klucz = `${z}→${d}`
  const mnoznik = PRZELICZNIKI[klucz]
  if (mnoznik == null) return null

  return { ilosc: ilosc * mnoznik, jednostka: jednostkaDo }
}

// ── Uniwersalne przeliczniki (stałe, te same dla wszystkich; trzymane w kodzie) ──
// Sprowadzamy każdą jednostkę do „rodziny": waga (g), objętość (ml), łyżki (ml),
// sztuki (szt). Łyżka/łyżeczka/szczypta to przybliżenia — wystarczające dla zakupów.
const LYZKI_ML = { lyzka: 15, lyzeczka: 5, szczypta: 0.5 }
const WAGA_DO_G = { g: 1, kg: 1000, dag: 10 }
const OBJ_DO_ML = { ml: 1, l: 1000 }
const INNE_DO_G = { peczek: 30, garsc: 30 }

// Kanoniczna postać jednostki do przeliczeń (ł→l, bez ogonków, bez końcowej kropki,
// liczba pojedyncza/mnoga sprowadzona do jednego klucza).
function kanonJednostka(raw = '') {
  const x = raw.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[łl]/g, 'l')
    .replace(/\.+$/, '').trim()
  if (!x) return ''
  if (['g', 'gram', 'gramy', 'gramow'].includes(x)) return 'g'
  if (['kg', 'kilogram', 'kilogramy'].includes(x)) return 'kg'
  if (['dag', 'dkg', 'dekagram', 'dekagramy'].includes(x)) return 'dag'
  if (['ml', 'mililitr', 'mililitry'].includes(x)) return 'ml'
  if (['l', 'litr', 'litry'].includes(x)) return 'l'
  if (['lyzka', 'lyzki', 'lyzke', 'lyzek'].includes(x)) return 'lyzka'
  if (['lyzeczka', 'lyzeczki', 'lyzeczke', 'lyzeczek'].includes(x)) return 'lyzeczka'
  if (['szczypta', 'szczypty', 'szczypte', 'szczypt'].includes(x)) return 'szczypta'
  // Ząbek (czosnku) i kromka (chleba) traktujemy jak sztukę — waga „sztuki" dla
  // tych produktów to ząbek/kromka (ustawiane w skladniki_meta.waga_sztuki_g),
  // więc „4 szt czosnku" = 4 ząbki, „2 szt chleba" = 2 kromki.
  if (['zabek', 'zabki', 'zabka', 'zabkow', 'zabkach', 'zabkami', 'zabeczek'].includes(x)) return 'szt'
  if (['kromka', 'kromki', 'kromke', 'kromek'].includes(x)) return 'szt'
  if (['szt', 'sztuka', 'sztuki', 'sztuk'].includes(x)) return 'szt'
  if (['peczek', 'peczki'].includes(x)) return 'peczek'
  if (['garsc', 'garsci'].includes(x)) return 'garsc'
  return x
}

// Ile gramów „waży" dana ilość w danej jednostce (gęstość ~1 dla płynów/łyżek).
// szt liczymy tylko jeśli znamy wagę sztuki. Zwraca null gdy się nie da.
function naGramy(ilosc, jKanon, wagaSztuki) {
  if (jKanon in WAGA_DO_G) return ilosc * WAGA_DO_G[jKanon]
  if (jKanon in OBJ_DO_ML) return ilosc * OBJ_DO_ML[jKanon]
  if (jKanon in LYZKI_ML) return ilosc * LYZKI_ML[jKanon]
  if (jKanon in INNE_DO_G) return ilosc * INNE_DO_G[jKanon]
  if (jKanon === 'szt' && wagaSztuki) return ilosc * wagaSztuki
  return null
}

// Przelicz dowolną ilość na jednostkę bazową składnika.
// Zwraca { ilosc, jedn } w jednostce `bazowa`, albo null gdy konwersja niemożliwa
// (np. „szt" bez znanej wagi sztuki).
function naBazowa(ilosc, jednostka, bazowa, wagaSztuki) {
  if (ilosc == null || !Number.isFinite(ilosc)) return null
  const j = kanonJednostka(jednostka)
  const b = kanonJednostka(bazowa)
  if (j === b) return { ilosc, jedn: bazowa }

  // Baza wagowa → policz gramy, potem przelicz na docelową (g/kg/dag)
  if (b in WAGA_DO_G) {
    const g = naGramy(ilosc, j, wagaSztuki)
    return g == null ? null : { ilosc: g / WAGA_DO_G[b], jedn: bazowa }
  }
  // Baza objętościowa → wszystko jak ml (gęstość ~1), potem na ml/l
  if (b in OBJ_DO_ML) {
    const ml = naGramy(ilosc, j, wagaSztuki) // ten sam mnożnik, bo ~1 g/ml
    return ml == null ? null : { ilosc: ml / OBJ_DO_ML[b], jedn: bazowa }
  }
  // Baza w sztukach → tylko jeśli znamy wagę sztuki (z gramów na sztuki)
  if (b === 'szt') {
    if (j === 'szt') return { ilosc, jedn: bazowa }
    if (!wagaSztuki) return null
    const g = naGramy(ilosc, j, null)
    return g == null ? null : { ilosc: g / wagaSztuki, jedn: bazowa }
  }
  // Baza w łyżkach → przez ml
  if (b in LYZKI_ML) {
    const ml = naGramy(ilosc, j, wagaSztuki)
    return ml == null ? null : { ilosc: ml / LYZKI_ML[b], jedn: bazowa }
  }
  return null
}

// Wybór jednostki bazowej dla składnika: najpierw z meta, w razie braku z rodziny jednostki.
// Łyżki/łyżeczki/szczypty NIE są jednostką wyświetlaną — sprowadzamy je do gramów.
function ustalJednostkeBazowa(meta, jednostka) {
  if (meta?.jednostka_bazowa) return meta.jednostka_bazowa
  const j = kanonJednostka(jednostka)
  if (j in WAGA_DO_G || j === 'peczek' || j === 'garsc' || j in LYZKI_ML) return 'g'
  if (j in OBJ_DO_ML) return 'ml'
  if (j === 'szt') return 'szt.'
  return jednostka || ''
}

// Waga jednej „sztuki" (g/ml). Dla produktu z bazą g/ml „1 szt" w przepisie =
// jedno opakowanie/sztuka = `rozmiar_opakowania` (cebula 150 g, puszka 400 g,
// karton 1000 ml…). Wyjątek: produkty sprzedawane na kg (opak.='kg'), gdzie
// rozmiar to wielkość paczki, a nie waga sztuki — wtedy bierzemy jawną
// `waga_sztuki_g` (np. pierś z kurczaka), inaczej nie zgadujemy.
function wagaSztukiZMeta(meta) {
  if (!meta) return null
  if (meta.waga_sztuki_g) {
    const w = parseFloat(meta.waga_sztuki_g)
    if (Number.isFinite(w) && w > 0) return w
  }
  const opak = kanonJednostka(meta.jednostka_opakowania)
  const baza = kanonJednostka(meta.jednostka_bazowa)
  if (opak !== 'kg' && (baza === 'g' || baza === 'ml')) {
    const r = parseFloat(meta.rozmiar_opakowania)
    if (Number.isFinite(r) && r > 0) return r
  }
  return null
}

// Składniki kupowane na WAGĘ (choć pojedyncze sztuki dałoby się policzyć) —
// pokazujemy w g/kg, nie w sztukach. Reszta warzyw/owoców idzie w szt.
const SKLADNIKI_WAGOWE = new Set([
  'ziemniaki', 'pieczarki', 'fasolka szparagowa', 'fasolka', 'bob',
  'groszek cukrowy', 'groszek zielony', 'szpinak', 'rukola',
])

// Czy pokazać ilość wagowo (g/kg) zamiast w sztukach/opakowaniach?
// Tak gdy: brak meta, wyłączone zaokrąglanie, produkt sprzedawany na kg,
// albo nazwa jest na liście „kupowane na wagę".
function pokazWage(item, meta) {
  if (!meta) return true
  if (!meta.zaokraglaj) return true
  if (kanonJednostka(meta.jednostka_opakowania) === 'kg') return true
  if (SKLADNIKI_WAGOWE.has(normalizujNazweMeta(item.skladnik || ''))) return true
  return false
}

// Sformatuj ilość wagowo/objętościowo: g→kg, ml→l, bez łyżek.
function formatujWage(ilosc, jednostka) {
  if (ilosc == null || !Number.isFinite(ilosc)) return ''
  const fmt = n => {
    const r = Math.round(n * 100) / 100
    return (Number.isInteger(r) ? String(r) : String(r).replace('.', ','))
  }
  const j = kanonJednostka(jednostka)
  if (j === 'g') return ilosc >= 1000 ? `${fmt(ilosc / 1000)} kg` : `${fmt(ilosc)} g`
  if (j === 'kg') return `${fmt(ilosc)} kg`
  if (j === 'ml') return ilosc >= 1000 ? `${fmt(ilosc / 1000)} l` : `${fmt(ilosc)} ml`
  if (j === 'l') return `${fmt(ilosc)} l`
  if (j === 'szt') return `${Math.ceil(ilosc)} szt.`
  return `${fmt(ilosc)}${jednostka ? ` ${jednostka}` : ''}`.trim()
}

// Produkty zakładane domyślnie „w domu" (nie trafiają na listę):
//  - wszystkie przyprawy (kategoria 7_Przyprawy) — oprócz wina, które się dokupuje,
//  - stałe spiżarni: olej, oliwa, ocet, cukier, woda (niezależnie od kategorii).
// W przyszłości „półka/spiżarnia" pozwoli to odznaczać z poziomu apki.
const ZAWSZE_W_DOMU = ['olej', 'oliwa', 'ocet', 'cukier', 'woda']

// Scalenia składników: klucz = normalizujNazweMeta(oryginalna nazwa) → wartość = nazwa kanoniczna.
// Pozwala łączyć warianty tej samej rzeczy bez zmian w bazie składniki_meta.
const SCAL_NAZWY = {
  'ser twarog':          'Twaróg',
  'twarog poltlusty':    'Twaróg',
  'twarog':              'Twaróg',
  'chleb pszenny':       'Chleb',
  'chleb pszenny kromki':'Chleb',
  'pieczywo do podania': 'Chleb',
  'marchewka':           'Marchew',
  'jogurt naturalny':    'Jogurt naturalny',
}

// Sufiksy, które nie rozróżniają produktu na liście zakupów.
// "Ogórek" i "Ogórek świeży" trafiają do tej samej pozycji.
const SUFIKS_RGX = /\s+(swiezy|swieza|swieze|surowy|surowa|surowe|mrozony|mrozona|mrozone)$/
function normalizujDlaScalania(normNazwa) {
  return normNazwa.replace(SUFIKS_RGX, '').trim()
}
function domyslnieWDomu(item) {
  if (!item) return false
  const n = normalizujNazweMeta(item.skladnik || '')
  if (ZAWSZE_W_DOMU.some(p => n === p || n.startsWith(p + ' '))) return true
  if (item.kategoria === '7_Przyprawy') return !n.startsWith('wino')
  return false
}

// Znajdź wpis skladniki_meta dla danej nazwy składnika.
// Strategia: normalizacja → exact match po nazwa_norm → match po aliasach.
function dopasujMeta(nazwaSkladnika, wszystkieMeta) {
  if (!nazwaSkladnika || !wszystkieMeta?.length) return null
  const norm = normalizujNazweMeta(nazwaSkladnika)
  if (!norm) return null

  // Najpierw exact match po nazwa_norm
  const byName = wszystkieMeta.find(m => m.nazwa_norm === norm)
  if (byName) return byName

  // Potem aliasy
  const byAlias = wszystkieMeta.find(m => Array.isArray(m.aliasy) && m.aliasy.includes(norm))
  return byAlias || null
}

// Policz ile opakowań kupić.
// Zwraca: { liczbaOpakowan, opisOpakowania, oryginalna: {ilosc, jednostka} }
// albo null jeśli nie da się policzyć (brak meta, niezgodne jednostki, ilość 0/null).
function policzOpakowania(item, meta) {
  if (!meta || !meta.zaokraglaj) return null // brak meta albo wyłączone zaokrąglanie
  if (item.ilosc == null || !Number.isFinite(item.ilosc) || item.ilosc <= 0) return null

  const rozmiar = parseFloat(meta.rozmiar_opakowania)
  if (!Number.isFinite(rozmiar) || rozmiar <= 0) return null

  // Spróbuj przekonwertować ilość z jednostki przepisu do jednostki bazowej meta
  const przelicz = przeliczDoBazowej(item.ilosc, item.jednostka || meta.jednostka_bazowa, meta.jednostka_bazowa)
  if (!przelicz) return null

  const liczba = Math.ceil(przelicz.ilosc / rozmiar)
  if (!Number.isFinite(liczba) || liczba <= 0) return null

  return {
    liczbaOpakowan: liczba,
    opisOpakowania: meta.jednostka_opakowania || '',
    oryginalna: {
      ilosc: item.ilosc,
      jednostka: item.jednostka || meta.jednostka_bazowa,
    },
  }
}

// Sformatuj „1 szt." albo „2 puszki 400g".
function formatujOpakowania(opak) {
  if (!opak) return ''
  const { liczbaOpakowan, opisOpakowania } = opak
  return `${liczbaOpakowan} ${opisOpakowania || 'szt.'}`
}

// Sformatuj „potrzeba 750 ml" — oryginalna ilość z przepisu jako podpowiedź.
function formatujOryginalnaIlosc(opak) {
  if (!opak?.oryginalna) return ''
  const { ilosc, jednostka } = opak.oryginalna
  if (ilosc == null) return ''
  const liczba = Number.isInteger(ilosc) ? String(ilosc) : String(Math.round(ilosc * 100) / 100).replace('.', ',')
  return `${liczba}${jednostka ? ` ${jednostka}` : ''}`.trim()
}

function parsujSzybkiProdukt(linia) {
  const tekst = poprawNazwe(linia)
  if (!tekst) return null

  const liczba = '(\\d+(?:[,.]\\d+)?)'
  const jednostka = '([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\\.?)?'

  let m = tekst.match(new RegExp(`^(.+?)\\s+${liczba}\\s*${jednostka}\\.?$`, 'i'))
  if (m) {
    const nazwa = poprawNazwe(m[1])
    const ilosc = toIlosc(m[2])
    const jedn = normalizujJednostke(m[3] || '')
    if (nazwa) return { nazwa, ilosc, jednostka: jedn || null, kategoria: bezpiecznaKategoria(rozpoznajKategorie(nazwa)) }
  }

  m = tekst.match(new RegExp(`^${liczba}\\s*${jednostka}\\s+(.+)$`, 'i'))
  if (m) {
    const nazwa = poprawNazwe(m[3])
    const ilosc = toIlosc(m[1])
    const jedn = normalizujJednostke(m[2] || '')
    if (nazwa) return { nazwa, ilosc, jednostka: jedn || null, kategoria: bezpiecznaKategoria(rozpoznajKategorie(nazwa)) }
  }

  return {
    nazwa: tekst,
    ilosc: null,
    jednostka: null,
    kategoria: bezpiecznaKategoria(rozpoznajKategorie(tekst)),
  }
}

export default function ListaZakupow({ user, householdId, onBack, domyslnePorcje = 1, sledz, tydzienKalendarza = 0 }) {
  const [lista, setLista] = useState([])
  const [wlasne, setWlasne] = useState([]) // z tabeli zakupy_wlasne
  const [cykliczne, setCykliczne] = useState([]) // z tabeli zakupy_cykliczne
  const [odznaczone, setOdznaczone] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [historiaIds, setHistoriaIds] = useState({})

  // Lokalny offset tygodnia (przyciski "‹ ›" w nagłówku) sumuje się z tydzienKalendarza
  const [offsetLokalny, setOffsetLokalny] = useState(0)

  const aktualnyPoniedzialek = useMemo(
    () => tydzienZakupowZOffsetem(tydzienKalendarza + offsetLokalny),
    [tydzienKalendarza, offsetLokalny]
  )
  const aktualnyPoniedzialekRef = useRef(aktualnyPoniedzialek)
  useEffect(() => { aktualnyPoniedzialekRef.current = aktualnyPoniedzialek }, [aktualnyPoniedzialek])

  const [pokazDodaj, setPokazDodaj] = useState(false)
  const [edycjaWlasnego, setEdycjaWlasnego] = useState(null)
  const [trybSklepu, setTrybSklepu] = useState(false)
  const [szybkiTekst, setSzybkiTekst] = useState('')
  const [pokazMamWDomu, setPokazMamWDomu] = useState(false)
  // Produkty „mam w domu” — z tabeli produkty_w_domu (per-household, realtime).
  // Trzymam pełne rekordy {id, nazwa, nazwa_norm}, żeby ogarniać delete po id.
  const [produktyWDomuRows, setProduktyWDomuRows] = useState([])
  // Korekty pozycji wygenerowanych z planu — z tabeli korekty_zakupow (per-household, realtime).
  // Mapa: baza_klucz -> {id, nazwa, ilosc, kategoria, usuniety}
  const [korektyZakupow, setKorektyZakupow] = useState({})

  // Promocje sklepowe — globalne (bez household_id), fetch raz na wejście w listę.
  const [promocje, setPromocje] = useState([])
  // Klucz itemu z rozwiniętym szczegółem promocji (jeden otwarty naraz)
  const [openPromoKlucz, setOpenPromoKlucz] = useState(null)

  const [toast, setToast] = useState(null)
  const blokujDodawanieDo = useRef(0)
  const generujRef = useRef(null)
  // Stan odznaczonych jest teraz w bazie (zakupy_historia, wspólne dla rodziny),
  // a nie w localStorage — funkcja zostaje jako no-op, żeby nie zmieniać call-site'ów.
  const storageKey = `lista_zakupow_${user.id}` // legacy, niezużywane

  function pokazToast(msg, onUndo) {
    setToast({ id: Date.now(), msg, onUndo })
  }

  // ── Produkty „mam w domu” — ładowanie z bazy ──
  useEffect(() => {
    if (!householdId) return
    let anulowane = false
    async function pobierz() {
      const { data } = await supabase.from('produkty_w_domu')
        .select('*')
        .eq('household_id', householdId)
        .eq('tydzien', aktualnyPoniedzialek)
        .order('nazwa')
      if (!anulowane) setProduktyWDomuRows(data || [])
    }
    pobierz()
    return () => { anulowane = true }
  }, [householdId, aktualnyPoniedzialek])

  // ── Korekty zakupów — ładowanie z bazy (filtrowane do bieżącego tygodnia) ──
  useEffect(() => {
    if (!householdId) return
    let anulowane = false
    async function pobierz() {
      const tydzien = aktualnyTydzienZakupow()
      const { data } = await supabase.from('korekty_zakupow')
        .select('*')
        .eq('household_id', householdId)
        .eq('tydzien', tydzien)
      if (!anulowane) {
        const mapa = {}
        ;(data || []).forEach(r => {
          mapa[r.baza_klucz] = {
            id: r.id,
            nazwa: r.nazwa,
            ilosc: r.ilosc,
            kategoria: r.kategoria,
            usuniety: !!r.usuniety,
          }
        })
        setKorektyZakupow(mapa)
      }
    }
    pobierz()
    return () => { anulowane = true }
  }, [householdId])

  // ── Promocje — ładowanie z bazy (globalne, raz na mount) ──
  useEffect(() => {
    let anulowane = false
    pobierzAktualnePromocje().then(data => {
      if (!anulowane) setPromocje(data)
    })
    return () => { anulowane = true }
  }, [])

  // Tablica nazw (do UI) wyprodukowana z rows, posortowana i zdedupowana.
  const produktyWDomu = useMemo(
    () => unikalneProduktyWDomu(produktyWDomuRows.map(r => r.nazwa)),
    [produktyWDomuRows]
  )

  const produktyWDomuSet = useMemo(
    () => new Set([
      ...produktyWDomuRows.map(r => r.nazwa_norm).filter(Boolean),
      ...ZAWSZE_UKRYTE_Z_PRZEPISOW.map(normalizujProduktDomowy).filter(Boolean),
    ]),
    [produktyWDomuRows]
  )

  // Dodaj jeden produkt do „mam w domu” (z karty produktu w liście).
  async function dodajDoMamWDomu(nazwa) {
    const ladna = ladnaNazwaProduktuDomowego(nazwa)
    if (!ladna) return
    const norm = normalizujProduktDomowy(ladna)
    if (!norm) return

    if (produktyWDomuSet.has(norm)) {
      pokazToast(`Już w domu: ${ladna}`)
      return
    }

    const rekord = {
      household_id: householdId,
      nazwa: ladna,
      nazwa_norm: norm,
      created_by: user.id,
      tydzien: aktualnyPoniedzialek,
    }

    const { data, error } = await supabase.from('produkty_w_domu')
      .insert(rekord)
      .select().single()

    if (error) {
      if (error.code === '23505') {
        pokazToast(`Już w domu: ${ladna}`)
        return
      }
      console.error('Błąd dodawania produktu w domu:', error, rekord)
      pokazToast('Nie udało się dodać do „Mam w domu”')
      return
    }

    if (data) {
      setProduktyWDomuRows(prev => prev.some(r => r.id === data.id) ? prev : [...prev, data])
      pokazToast(`Mam w domu: ${ladna}`, async () => {
        await supabase.from('produkty_w_domu').delete().eq('id', data.id)
        setProduktyWDomuRows(prev => prev.filter(r => r.id !== data.id))
        setToast(null)
      })
    }
  }

  // Zapis całej listy z modalu „Mam w domu” — robi diff i odpala insert/delete.
  async function zapiszProduktyWDomu(noweNazwy) {
    const czyste = unikalneProduktyWDomu(noweNazwy)
    const noweNormy = new Set(czyste.map(normalizujProduktDomowy).filter(Boolean))
    const stareNormy = new Set(produktyWDomuRows.map(r => r.nazwa_norm).filter(Boolean))

    const doDodania = czyste
      .filter(n => {
        const norm = normalizujProduktDomowy(n)
        return norm && !stareNormy.has(norm)
      })
      .map(nazwa => ({
        household_id: householdId,
        nazwa,
        nazwa_norm: normalizujProduktDomowy(nazwa),
        created_by: user.id,
        tydzien: aktualnyPoniedzialek,
      }))

    const doUsuniecia = produktyWDomuRows
      .filter(r => !noweNormy.has(r.nazwa_norm))
      .map(r => r.id)

    if (doUsuniecia.length > 0) {
      await supabase.from('produkty_w_domu').delete().in('id', doUsuniecia)
      setProduktyWDomuRows(prev => prev.filter(r => !doUsuniecia.includes(r.id)))
    }

    if (doDodania.length > 0) {
      const { data, error } = await supabase.from('produkty_w_domu')
        .insert(doDodania)
        .select()
      if (error) {
        if (error.code !== '23505') {
          console.error('Błąd zapisu produktów w domu:', error, doDodania)
          pokazToast('Część produktów się nie zapisała — odśwież')
        }
      } else if (data) {
        setProduktyWDomuRows(prev => {
          const ids = new Set(prev.map(r => r.id))
          return [...prev, ...data.filter(r => !ids.has(r.id))]
        })
      }
    }
  }

  // ── Zapis korekty pozycji z planu (upsert do bazy) ──
  // korekta: {nazwa, ilosc, kategoria, usuniety}
  async function zapiszKorekteZakupu(bazaKlucz, korekta) {
    if (!bazaKlucz) return
    const tydzien = aktualnyTydzienZakupow()
    const istniejaca = korektyZakupow[bazaKlucz]
    const rekord = {
      household_id: householdId,
      tydzien,
      baza_klucz: bazaKlucz,
      nazwa: korekta.nazwa || null,
      ilosc: korekta.ilosc || null,
      kategoria: korekta.kategoria || null,
      usuniety: !!korekta.usuniety,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    // Optymistycznie aktualizuję stan
    setKorektyZakupow(prev => ({
      ...prev,
      [bazaKlucz]: {
        id: istniejaca?.id,
        nazwa: rekord.nazwa,
        ilosc: rekord.ilosc,
        kategoria: rekord.kategoria,
        usuniety: rekord.usuniety,
      },
    }))

    if (istniejaca?.id) {
      const { data, error } = await supabase.from('korekty_zakupow')
        .update(rekord)
        .eq('id', istniejaca.id)
        .select().single()
      if (error) {
        console.error('Błąd update korekty:', error, rekord)
        pokazToast('Nie udało się zapisać zmiany')
      } else if (data) {
        setKorektyZakupow(prev => ({
          ...prev,
          [bazaKlucz]: {
            id: data.id, nazwa: data.nazwa, ilosc: data.ilosc,
            kategoria: data.kategoria, usuniety: !!data.usuniety,
          },
        }))
      }
    } else {
      const { data, error } = await supabase.from('korekty_zakupow')
        .insert(rekord)
        .select().single()
      if (error) {
        // Konflikt na unique (mogło wleźć przez realtime od żony) — odśwież.
        if (error.code === '23505') {
          const { data: refresh } = await supabase.from('korekty_zakupow')
            .select('*')
            .eq('household_id', householdId)
            .eq('tydzien', tydzien)
            .eq('baza_klucz', bazaKlucz)
            .single()
          if (refresh) {
            setKorektyZakupow(prev => ({
              ...prev,
              [bazaKlucz]: {
                id: refresh.id, nazwa: refresh.nazwa, ilosc: refresh.ilosc,
                kategoria: refresh.kategoria, usuniety: !!refresh.usuniety,
              },
            }))
          }
        } else {
          console.error('Błąd insert korekty:', error, rekord)
          pokazToast('Nie udało się zapisać zmiany')
        }
      } else if (data) {
        setKorektyZakupow(prev => ({
          ...prev,
          [bazaKlucz]: {
            id: data.id, nazwa: data.nazwa, ilosc: data.ilosc,
            kategoria: data.kategoria, usuniety: !!data.usuniety,
          },
        }))
      }
    }
  }

  // Usuwa korektę z bazy (powrót do oryginalnej pozycji z planu).
  async function usunKorekteZakupu(bazaKlucz) {
    if (!bazaKlucz) return
    const istniejaca = korektyZakupow[bazaKlucz]
    if (!istniejaca) return

    setKorektyZakupow(prev => {
      const n = { ...prev }
      delete n[bazaKlucz]
      return n
    })

    if (istniejaca.id) {
      await supabase.from('korekty_zakupow').delete().eq('id', istniejaca.id)
    }
  }

  // ── Generowanie listy z planu + ładowanie własnych + cyklicznych ──
  const generuj = useCallback(async () => {
    setLoading(true)

    // Tydzień z planera lub lokalny offset (z przycisków w nagłówku listy).
    const efektywnyOffset = tydzienKalendarza + offsetLokalny
    const poniedzialek = tydzienZakupowZOffsetem(efektywnyOffset)
    const niedziela = new Date(poniedzialek + 'T12:00:00')
    niedziela.setDate(niedziela.getDate() + 6)
    const niedzielaStr = formatDataLocal(niedziela)
    // W bieżącym tygodniu pomijamy dni które już minęły — nie ma sensu
    // kupować na poniedziałek w środę. Dla przyszłych/poprzednich tygodni — pełen zakres.
    const dzis = dzisLocal()
    const dataOd = efektywnyOffset === 0 && dzis > poniedzialek ? dzis : poniedzialek

    const [{ data: planData }, { data: wlasneData }, { data: historiaData }, { data: cykliczneData }, { data: metaData }] = await Promise.all([
      supabase.from('kalendarz').select('*')
        .eq('household_id', householdId)
        .gte('data', dataOd)
        .lte('data', niedzielaStr),
      supabase.from('zakupy_wlasne').select('*')
        .eq('household_id', householdId)
        .eq('tydzien', poniedzialek)
        .order('created_at'),
      // Historia ograniczona do bieżącego tygodnia — żeby cykliczne się resetowały co poniedziałek.
      supabase.from('zakupy_historia').select('*')
        .eq('household_id', householdId)
        .gte('data_kupienia', poniedzialek),
      supabase.from('zakupy_cykliczne').select('*')
        .eq('household_id', householdId)
        .order('created_at'),
      // skladniki_meta — globalna, do liczenia opakowań
      supabase.from('skladniki_meta').select('*'),
    ])

    setWlasne(wlasneData || [])
    setCykliczne(cykliczneData || [])
    const wszystkieMeta = metaData || []

    // Zbieram porcje
    const porcjeWszystkich = {}
    const globalnePodmiany = {}

    ;(planData || []).forEach(p => {
      const porcje = p.porcje != null ? +p.porcje : +domyslnePorcje
      if (p.danie) porcjeWszystkich[p.danie] = (porcjeWszystkich[p.danie] || 0) + porcje
      const dodatkiTab = Array.isArray(p.dodatki) ? p.dodatki : []
      dodatkiTab.forEach(slot => {
        if (slot?.nazwa) porcjeWszystkich[slot.nazwa] = (porcjeWszystkich[slot.nazwa] || 0) + porcje
      })
      const pod = p.podmiany || {}
      Object.entries(pod).forEach(([k, v]) => { if (v) globalnePodmiany[k] = v })
    })

    // Klucz mapy = sama nazwa kanoniczna (po meta), żeby warianty tej samej rzeczy
    // i różne jednostki trafiały do JEDNEJ pozycji. Jednostkę bazową ustalamy raz,
    // przy pierwszym wystąpieniu, i do niej sprowadzamy resztę.
    const skladnikiMap = {}
    function dodaj(skladnik, ilosc, jednostka, kategoria, mnoznik) {
      if (!skladnik) return
      const podmieniony = globalnePodmiany[skladnik] || skladnik
      const finalny = SCAL_NAZWY[normalizujNazweMeta(podmieniony)] || podmieniony
      const meta = dopasujMeta(finalny, wszystkieMeta)
      const kanon = meta?.nazwa || finalny
      const mapaKlucz = normalizujDlaScalania(normalizujNazweMeta(kanon))
      if (!mapaKlucz) return

      const iloscNum = parseFloat(ilosc?.toString().replace(',', '.'))
      let wpis = skladnikiMap[mapaKlucz]

      // Pierwsze wystąpienie tej nazwy — załóż pozycję
      if (!wpis) {
        wpis = skladnikiMap[mapaKlucz] = {
          skladnik: kanon,
          ilosc: null,
          iloscOryginalna: !Number.isFinite(iloscNum) ? ilosc : null,
          bazaJedn: ustalJednostkeBazowa(meta, jednostka),
          jednostka: '',
          wagaSztuki: wagaSztukiZMeta(meta),
          kategoria: kategoria || '8_Inne',
          podmieniono: !!globalnePodmiany[skladnik],
          zrodlo: 'plan',
          nieprzeliczone: [], // ilości, których nie dało się sprowadzić do bazy
        }
      } else if (kanon.length < wpis.skladnik.length) {
        // Prefer shorter/cleaner name when merging variants (e.g. "Ogórek" over "Ogórek świeży")
        wpis.skladnik = kanon
      }

      // Brak ilości („do smaku", „—") — nic do sumowania, pozycja już istnieje
      if (!Number.isFinite(iloscNum) || iloscNum === 0) return

      const realna = iloscNum * (mnoznik || 1)
      const p = naBazowa(realna, jednostka, wpis.bazaJedn, wpis.wagaSztuki)
      if (p) {
        wpis.ilosc = (wpis.ilosc || 0) + p.ilosc
        wpis.jednostka = wpis.bazaJedn
      } else {
        // Nie da się sprowadzić do bazy (np. szt bez znanej wagi) — trzymaj osobno.
        // Łyżki zamieniamy na gramy, żeby na liście nigdy nie było „łyżek".
        const jk = kanonJednostka(jednostka)
        let il = realna, jn = normalizujJednostke(jednostka || '')
        if (jk in LYZKI_ML) { il = realna * LYZKI_ML[jk]; jn = 'g' }
        const ex = wpis.nieprzeliczone.find(e => e.jedn === jn)
        if (ex) ex.ilosc += il
        else wpis.nieprzeliczone.push({ ilosc: il, jedn: jn })
      }
    }

    const wszystkieNazwy = Object.keys(porcjeWszystkich)
    if (wszystkieNazwy.length > 0) {
      const { data: daniaData } = await supabase.from('dania').select('*').in('"Danie"', wszystkieNazwy)
      // Dedup: ta sama nazwa dania może być w tabeli wiele razy (różni użytkownicy).
      // Bierzemy pierwszy wiersz dla każdej pary (danie, składnik).
      const daniaDedup = new Map()
      ;(daniaData || []).forEach(r => {
        const k = `${r['Danie']}||${r['Składnik']}`
        if (!daniaDedup.has(k)) daniaDedup.set(k, r)
      })
      daniaDedup.forEach(r => {
        const mnoznik = porcjeWszystkich[r['Danie']] || 1
        dodaj(r['Składnik'], r['Ilość na 1 porcję'], r['Jednostka'], r['Kategoria'], mnoznik)
      })
    }

    Object.values(skladnikiMap).forEach(item => {
      if (item.ilosc != null) item.ilosc = Math.round(item.ilosc * 100) / 100

      // Klucz widoku zostaje w starym formacie `nazwa||jednostka` — tak działa
      // dopasowywanie do zakupy_historia i korekty_zakupow. Po scaleniu każda
      // nazwa ma już jedną jednostkę, więc to jeden klucz na pozycję.
      item.jednostka = item.ilosc != null ? item.bazaJedn : ''
      item.klucz = `${item.skladnik}||${item.jednostka || ''}`

      // Opakowania/sztuki liczymy dla produktów policzalnych (szt., puszka,
      // karton, opak. …). Wagowe (mięso na kg, ziemniaki, pieczarki, brak meta)
      // pokazujemy w g/kg.
      const meta = dopasujMeta(item.skladnik, wszystkieMeta)
      if (meta) {
        item.metaJednostka = meta.jednostka_bazowa
        if (!pokazWage(item, meta)) item.opakowania = policzOpakowania(item, meta)
      }

      // Zostały kawałki w nieprzeliczalnych jednostkach (np. „3 szt" bez wagi)
      // — złóż czytelny tekst i wyłącz pojedynczą liczbę/opakowania.
      if (item.nieprzeliczone && item.nieprzeliczone.length) {
        const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace('.', ',')
        const czesci = []
        if (item.ilosc != null && item.ilosc > 0) czesci.push(formatujWage(item.ilosc, item.bazaJedn))
        item.nieprzeliczone.forEach(e => czesci.push(
          ['g', 'kg', 'ml', 'l'].includes(kanonJednostka(e.jedn))
            ? formatujWage(e.ilosc, e.jedn)
            : `${fmt(e.ilosc)}${e.jedn ? ` ${e.jedn}` : ''}`.trim()
        ))
        if (czesci.length) {
          item.iloscOryginalna = czesci.filter(Boolean).join(' + ')
          item.ilosc = null
          item.jednostka = ''
          item.opakowania = null
          item.klucz = `${item.skladnik}||`
        }
      }
    })

    const posortowane = Object.values(skladnikiMap).sort((a, b) =>
      a.kategoria.localeCompare(b.kategoria) || a.skladnik.localeCompare(b.skladnik)
    )

    // Odtwórz stan odznaczonych z bazy. Bierzemy pod uwagę także lokalnie edytowane pozycje z planu.
    const aktualneKlucze = new Set()
    posortowane.forEach(i => {
      aktualneKlucze.add(i.klucz)
      const poKorekcie = zastosujKorekteZakupu(i, korektyZakupow[i.klucz])
      if (poKorekcie?.klucz) aktualneKlucze.add(poKorekcie.klucz)
    })
    // Cykliczne — odhaczanie też idzie do zakupy_historia (klucz `${nazwa}||`).
    ;(cykliczneData || []).forEach(c => {
      aktualneKlucze.add(kluczZakupu(c.nazwa, ''))
    })

    const odtworzone = new Set()
    const mapaHistoriaId = {}
    ;(historiaData || []).forEach(h => {
      const klucz = `${h.skladnik}||${h.jednostka || ''}`
      if (aktualneKlucze.has(klucz)) {
        odtworzone.add(klucz)
        mapaHistoriaId[klucz] = h.id
      }
    })

    setLista(posortowane)
    setOdznaczone(odtworzone)
    setHistoriaIds(mapaHistoriaId)
    setLoading(false)
  }, [householdId, domyslnePorcje, korektyZakupow, tydzienKalendarza, offsetLokalny])

  useEffect(() => { generuj() }, [generuj])

  // Realtime: gdy partner odhaczy/doda coś, aktualizuj lokalnie bez pełnego reloadu.
  useEffect(() => { generujRef.current = generuj }, [generuj])

  // Pięć kanałów: zakupy_historia, zakupy_wlasne, zakupy_cykliczne, produkty_w_domu, korekty_zakupow, kalendarz.
  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`zakupy:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zakupy_historia', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (!row) return
          const klucz = `${row.skladnik}||${row.jednostka || ''}`
          if (payload.eventType === 'DELETE') {
            setOdznaczone(prev => {
              if (!prev.has(klucz)) return prev
              const n = new Set(prev); n.delete(klucz); return n
            })
            setHistoriaIds(prev => {
              if (!(klucz in prev)) return prev
              const n = { ...prev }; delete n[klucz]; return n
            })
          } else {
            setOdznaczone(prev => prev.has(klucz) ? prev : new Set(prev).add(klucz))
            setHistoriaIds(prev => prev[klucz] === row.id ? prev : { ...prev, [klucz]: row.id })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zakupy_wlasne', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.tydzien && row.tydzien !== aktualnyTydzienZakupow()) return

          if (payload.eventType === 'DELETE') {
            setWlasne(prev => prev.filter(w => w.id !== payload.old?.id))
          } else if (payload.eventType === 'INSERT') {
            setWlasne(prev => prev.some(w => w.id === payload.new.id) ? prev : [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setWlasne(prev => prev.map(w => w.id === payload.new.id ? payload.new : w))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zakupy_cykliczne', filter: `household_id=eq.${householdId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCykliczne(prev => prev.filter(c => c.id !== payload.old?.id))
          } else if (payload.eventType === 'INSERT') {
            setCykliczne(prev => prev.some(c => c.id === payload.new.id) ? prev : [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setCykliczne(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produkty_w_domu', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.tydzien && row.tydzien !== aktualnyPoniedzialekRef.current) return
          if (payload.eventType === 'DELETE') {
            setProduktyWDomuRows(prev => prev.filter(r => r.id !== payload.old?.id))
          } else if (payload.eventType === 'INSERT') {
            setProduktyWDomuRows(prev => prev.some(r => r.id === payload.new.id) ? prev : [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setProduktyWDomuRows(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'korekty_zakupow', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.tydzien && row.tydzien !== aktualnyTydzienZakupow()) return

          if (payload.eventType === 'DELETE') {
            const bazaKlucz = payload.old?.baza_klucz
            if (!bazaKlucz) return
            setKorektyZakupow(prev => {
              if (!(bazaKlucz in prev)) return prev
              const n = { ...prev }; delete n[bazaKlucz]; return n
            })
          } else {
            const r = payload.new
            setKorektyZakupow(prev => ({
              ...prev,
              [r.baza_klucz]: {
                id: r.id, nazwa: r.nazwa, ilosc: r.ilosc,
                kategoria: r.kategoria, usuniety: !!r.usuniety,
              },
            }))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kalendarz', filter: `household_id=eq.${householdId}` },
        () => { generujRef.current?.() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  function zapiszStanOdznaczenia(/* nowySet */) {
    // No-op — stan jest w bazie (zakupy_historia) i synchronizowany przez Realtime.
  }

  // ── Toggle zwykłego skladnika (z planu lub cyklicznego) — zapisuje w zakupy_historia ──
  async function toggle(item) {
    const klucz = item.klucz
    const byloOdznaczone = odznaczone.has(klucz)

    setOdznaczone(prev => {
      const n = new Set(prev)
      if (byloOdznaczone) n.delete(klucz)
      else n.add(klucz)
      zapiszStanOdznaczenia(n)
      return n
    })

    if (byloOdznaczone) {
      const histId = historiaIds[klucz]
      if (histId) {
        await supabase.from('zakupy_historia').delete().eq('id', histId)
        setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
      }
    } else {
      const { data } = await supabase.from('zakupy_historia').insert({
        household_id: householdId, user_id: user.id, skladnik: item.skladnik,
        ilosc: item.ilosc, jednostka: item.jednostka,
        kategoria: item.kategoria,
      }).select().single()
      if (data) {
        setHistoriaIds(prev => ({ ...prev, [klucz]: data.id }))
        sledz?.('kupione', { skladnik: item.skladnik })
      }
      pokazToast(`Kupione: ${item.skladnik}`, async () => {
        setOdznaczone(prev => {
          const n = new Set(prev); n.delete(klucz)
          zapiszStanOdznaczenia(n); return n
        })
        if (data?.id) {
          await supabase.from('zakupy_historia').delete().eq('id', data.id)
          setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
        }
        setToast(null)
      })
    }
  }

  // ── Toggle własnego produktu (bezpośrednio w zakupy_wlasne) ──
  async function toggleWlasny(item) {
    const noweOdznaczone = !item.odznaczone
    const { data, error } = await supabase.from('zakupy_wlasne')
      .update({ odznaczone: noweOdznaczone })
      .eq('id', item.id).select().single()

    if (error) {
      console.error('Błąd odznaczania własnego produktu:', error, item)
      pokazToast('Nie udało się zmienić statusu produktu')
      return
    }

    if (data) {
      setWlasne(prev => prev.map(w => w.id === item.id ? data : w))
      if (noweOdznaczone) {
        pokazToast(`Kupione: ${item.nazwa}`, async () => {
          await supabase.from('zakupy_wlasne').update({ odznaczone: false }).eq('id', item.id)
          setWlasne(prev => prev.map(w => w.id === item.id ? { ...w, odznaczone: false } : w))
          setToast(null)
        })
      }
    }
  }

  // ── Dodawanie / edycja produktu ──
  // Trzy ścieżki:
  // 1. Korekta pozycji z planu (zmiana 12 buraków → 4) → zapis do korekty_zakupow
  // 2. Edycja własnego produktu → update zakupy_wlasne (lub zakupy_cykliczne)
  // 3. Nowy produkt → insert do zakupy_wlasne / zakupy_cykliczne (w zależności od checkboxa)
  // Plus: zmiana flagi „cykliczny” przy edycji = przeniesienie między tabelami.
  async function zapiszWlasny(dane) {
    const daneDoZapisu = {
      nazwa: poprawNazwe(dane.nazwa),
      ilosc: normalizujIloscTekst(dane.ilosc),
      kategoria: bezpiecznaKategoria(dane.kategoria),
    }

    if (!daneDoZapisu.nazwa) return

    const chceCykliczny = !!dane.cykliczny

    // Ścieżka 1: korekta pozycji z planu
    if (edycjaWlasnego?.__zrodlo === 'plan') {
      const bazaKlucz = edycjaWlasnego.bazaKlucz || edycjaWlasnego.klucz
      if (!bazaKlucz) return

      await zapiszKorekteZakupu(bazaKlucz, {
        nazwa: daneDoZapisu.nazwa,
        ilosc: daneDoZapisu.ilosc,
        kategoria: daneDoZapisu.kategoria,
        usuniety: false,
      })
      pokazToast(`Zmieniono: ${daneDoZapisu.nazwa}`)
      setEdycjaWlasnego(null)
      setPokazDodaj(false)
      return
    }

    // Ścieżka 2: edycja istniejącego produktu
    if (edycjaWlasnego) {
      const bylCykliczny = edycjaWlasnego.__zrodlo === 'cykliczne'
      const id = edycjaWlasnego.id

      if (chceCykliczny === bylCykliczny) {
        // Edycja w obrębie tej samej tabeli
        const tabela = chceCykliczny ? 'zakupy_cykliczne' : 'zakupy_wlasne'
        const { data, error } = await supabase.from(tabela)
          .update(daneDoZapisu).eq('id', id).select().single()

        if (error) {
          console.error(`Błąd edycji produktu (${tabela}):`, error, daneDoZapisu)
          pokazToast('Nie udało się zapisać produktu')
          return
        }

        if (data) {
          if (chceCykliczny) setCykliczne(prev => prev.map(c => c.id === data.id ? data : c))
          else setWlasne(prev => prev.map(w => w.id === data.id ? data : w))
        }
        pokazToast(`Zmieniono: ${daneDoZapisu.nazwa}`)
      } else {
        // Zmiana flagi „powtarzaj co tydzień” = przenosimy do innej tabeli
        if (chceCykliczny) {
          // zakupy_wlasne → zakupy_cykliczne
          const rekord = {
            ...daneDoZapisu,
            household_id: householdId,
            created_by: user.id,
          }
          const { data, error } = await supabase.from('zakupy_cykliczne')
            .insert(rekord).select().single()
          if (error) {
            console.error('Błąd przenoszenia do cyklicznych:', error, rekord)
            pokazToast('Nie udało się zapisać produktu')
            return
          }
          await supabase.from('zakupy_wlasne').delete().eq('id', id)
          setWlasne(prev => prev.filter(w => w.id !== id))
          if (data) setCykliczne(prev => prev.some(c => c.id === data.id) ? prev : [...prev, data])
          pokazToast(`Powtarza się co tydzień: ${daneDoZapisu.nazwa}`)
        } else {
          // zakupy_cykliczne → zakupy_wlasne (na ten tydzień)
          const rekord = {
            ...daneDoZapisu,
            household_id: householdId,
            user_id: user.id,
            tydzien: aktualnyTydzienZakupow(),
            odznaczone: false,
          }
          const { data, error } = await supabase.from('zakupy_wlasne')
            .insert(rekord).select().single()
          if (error) {
            console.error('Błąd przenoszenia do jednorazowych:', error, rekord)
            pokazToast('Nie udało się zapisać produktu')
            return
          }
          await supabase.from('zakupy_cykliczne').delete().eq('id', id)
          setCykliczne(prev => prev.filter(c => c.id !== id))
          if (data) setWlasne(prev => prev.some(w => w.id === data.id) ? prev : [...prev, data])
          pokazToast(`Tylko ten tydzień: ${daneDoZapisu.nazwa}`)
        }
      }
    } else {
      // Ścieżka 3: nowy produkt
      if (chceCykliczny) {
        const rekord = {
          ...daneDoZapisu,
          household_id: householdId,
          created_by: user.id,
        }
        const { data, error } = await supabase.from('zakupy_cykliczne')
          .insert(rekord).select().single()

        if (error) {
          console.error('Błąd dodawania cyklicznego produktu:', error, rekord)
          pokazToast('Nie udało się dodać produktu')
          return
        }

        if (data) setCykliczne(prev => prev.some(c => c.id === data.id) ? prev : [...prev, data])
        pokazToast(`Dodano (co tydzień): ${daneDoZapisu.nazwa}`)
      } else {
        const rekord = {
          ...daneDoZapisu,
          household_id: householdId,
          user_id: user.id,
          tydzien: aktualnyTydzienZakupow(),
          odznaczone: false,
        }

        const { data, error } = await supabase.from('zakupy_wlasne')
          .insert(rekord).select().single()

        if (error) {
          console.error('Błąd dodawania własnego produktu:', error, rekord)
          pokazToast('Nie udało się dodać produktu')
          return
        }

        if (data) setWlasne(prev => [...prev, data])
        pokazToast(`Dodano: ${daneDoZapisu.nazwa}`)
      }
    }
    setEdycjaWlasnego(null)
    setPokazDodaj(false)
  }

  function rozpocznijEdycjeItemu(item) {
    if (!item) return
    if (item.zrodlo === 'wlasne') {
      setEdycjaWlasnego({ ...item.wlasnyData, __zrodlo: 'wlasne', cykliczny: false })
    } else if (item.zrodlo === 'cykliczne') {
      setEdycjaWlasnego({ ...item.cyklicneData, __zrodlo: 'cykliczne', cykliczny: true })
    } else {
      setEdycjaWlasnego({
        __zrodlo: 'plan',
        bazaKlucz: item.bazaKlucz || item.klucz,
        klucz: item.klucz,
        nazwa: item.skladnik,
        ilosc: tekstIlosciZItemu(item),
        kategoria: item.kategoria || '8_Inne',
        cykliczny: false,
      })
    }
    setPokazDodaj(true)
  }

  async function usunEdytowanyProdukt(item) {
    if (!item) return

    // Korekta z planu → oznacz jako usunięty (i schowaj z listy)
    if (item.__zrodlo === 'plan') {
      const bazaKlucz = item.bazaKlucz || item.klucz
      if (!bazaKlucz) return
      const poprzednia = korektyZakupow[bazaKlucz]
      const kluczWidoku = kluczZakupu(item.nazwa, '')
      const histId = historiaIds[kluczWidoku] || historiaIds[item.klucz]

      await zapiszKorekteZakupu(bazaKlucz, {
        nazwa: item.nazwa,
        ilosc: item.ilosc,
        kategoria: item.kategoria,
        usuniety: true,
      })
      setOdznaczone(prev => {
        const n = new Set(prev)
        n.delete(kluczWidoku)
        if (item.klucz) n.delete(item.klucz)
        return n
      })
      if (histId) {
        await supabase.from('zakupy_historia').delete().eq('id', histId)
        setHistoriaIds(prev => {
          const n = { ...prev }
          delete n[kluczWidoku]
          if (item.klucz) delete n[item.klucz]
          return n
        })
      }
      setEdycjaWlasnego(null)
      setPokazDodaj(false)
      pokazToast(`Usunięto: ${item.nazwa}`, async () => {
        if (poprzednia) {
          await zapiszKorekteZakupu(bazaKlucz, poprzednia)
        } else {
          await usunKorekteZakupu(bazaKlucz)
        }
        setToast(null)
      })
      return
    }

    await usunWlasny(item)
  }

  function przywrocUsunietyProdukt(item) {
    if (!item?.bazaKlucz) return
    const poprzednia = korektyZakupow[item.bazaKlucz]
    if (!poprzednia?.usuniety) return

    // Cofamy flagę „usuniety” — pozostaw nazwę/ilość/kategorię jeśli były edytowane
    zapiszKorekteZakupu(item.bazaKlucz, {
      nazwa: poprzednia.nazwa,
      ilosc: poprzednia.ilosc,
      kategoria: poprzednia.kategoria,
      usuniety: false,
    })

    pokazToast(`Przywrócono: ${item.nazwa}`, async () => {
      await zapiszKorekteZakupu(item.bazaKlucz, poprzednia)
      setToast(null)
    })
  }

  function przywrocWszystkieUsuniete() {
    const usuniete = Object.entries(korektyZakupow || {}).filter(([, korekta]) => korekta?.usuniety)
    if (usuniete.length === 0) return

    const poprzednie = { ...korektyZakupow }
    usuniete.forEach(([bazaKlucz, korekta]) => {
      zapiszKorekteZakupu(bazaKlucz, { ...korekta, usuniety: false })
    })

    pokazToast(`Przywrócono ${usuniete.length} produktów`, async () => {
      for (const [bazaKlucz, korekta] of Object.entries(poprzednie)) {
        if (korekta?.usuniety) await zapiszKorekteZakupu(bazaKlucz, korekta)
      }
      setToast(null)
    })
  }

  async function dodajSzybkieProdukty(tekst) {
    const linie = rozbijSzybkieLinie(tekst)

    if (linie.length === 0) return

    const rekordy = linie
      .map(parsujSzybkiProdukt)
      .filter(Boolean)
      .map(dane => ({
        nazwa: poprawNazwe(dane.nazwa),
        ilosc: tekstIlosciSzybkiej(dane),
        kategoria: bezpiecznaKategoria(dane.kategoria),
        household_id: householdId,
        user_id: user.id,
        tydzien: aktualnyTydzienZakupow(),
        odznaczone: false,
      }))
      .filter(rekord => rekord.nazwa)

    if (rekordy.length === 0) return

    const { data, error } = await supabase.from('zakupy_wlasne')
      .insert(rekordy)
      .select()

    if (error) {
      console.error('Błąd szybkiego dodawania produktów — bulk insert:', error, rekordy)

      const dodane = []
      const bledy = []

      for (const rekord of rekordy) {
        const { data: singleData, error: singleError } = await supabase.from('zakupy_wlasne')
          .insert(rekord)
          .select()
          .single()

        if (singleData) dodane.push(singleData)
        if (singleError) bledy.push({ rekord, error: singleError })
      }

      if (bledy.length > 0) {
        console.error('Błędy szybkiego dodawania produktów — pojedyncze inserty:', bledy)
      }

      if (dodane.length === 0) {
        pokazToast('Nie udało się dodać — sprawdź konsolę Supabase')
        return
      }

      setWlasne(prev => {
        const ids = new Set(prev.map(w => w.id))
        return [...prev, ...dodane.filter(w => !ids.has(w.id))]
      })
      pokazToast(dodane.length === 1 ? `Dodano: ${dodane[0].nazwa}` : `Dodano ${dodane.length} produktów`)
      return
    }

    if (data?.length) {
      setWlasne(prev => {
        const ids = new Set(prev.map(w => w.id))
        return [...prev, ...data.filter(w => !ids.has(w.id))]
      })
      sledz?.('dodaj_szybki_produkt', { ile: data.length })
    }

    pokazToast(data?.length === 1 ? `Dodano: ${data[0].nazwa}` : `Dodano ${data?.length || rekordy.length} produktów`)
  }

  async function usunWlasny(item) {
    const cykliczny = item.__zrodlo === 'cykliczne'
    const tabela = cykliczny ? 'zakupy_cykliczne' : 'zakupy_wlasne'

    await supabase.from(tabela).delete().eq('id', item.id)
    if (cykliczny) setCykliczne(prev => prev.filter(c => c.id !== item.id))
    else setWlasne(prev => prev.filter(w => w.id !== item.id))

    pokazToast(`Usunięto: ${item.nazwa}`, async () => {
      const { id, created_at, __zrodlo, cykliczny: _c, ...rest } = item
      const { data } = await supabase.from(tabela).insert(rest).select().single()
      if (data) {
        if (cykliczny) setCykliczne(prev => [...prev, data])
        else setWlasne(prev => [...prev, data])
      }
      setToast(null)
    })
    setEdycjaWlasnego(null)
    setPokazDodaj(false)
  }

  async function zacznijOdNowa() {
    const snapshot = { odznaczone: new Set(odznaczone), historiaIds: { ...historiaIds } }
    if (snapshot.odznaczone.size === 0) return

    setOdznaczone(new Set())
    const ids = Object.values(snapshot.historiaIds)
    if (ids.length > 0) await supabase.from('zakupy_historia').delete().in('id', ids)
    setHistoriaIds({})

    pokazToast(`Wyczyszczono ${snapshot.odznaczone.size} z koszyka`, async () => {
      setOdznaczone(snapshot.odznaczone)
      zapiszStanOdznaczenia(snapshot.odznaczone)
      const itemsDoOdtworzenia = listaPoProduktachDomowych.filter(i => snapshot.odznaczone.has(i.klucz))
      if (itemsDoOdtworzenia.length > 0) {
        const { data } = await supabase.from('zakupy_historia').insert(
          itemsDoOdtworzenia.map(i => ({
            household_id: householdId, user_id: user.id, skladnik: i.skladnik,
            ilosc: i.ilosc, jednostka: i.jednostka, kategoria: i.kategoria,
          }))
        ).select()
        const nowaMapa = {}
        ;(data || []).forEach((row, idx) => { nowaMapa[itemsDoOdtworzenia[idx].klucz] = row.id })
        setHistoriaIds(nowaMapa)
      }
      setToast(null)
    })
  }

  // ── Łączenie list (plan + własne + cykliczne) do widoku ──
  const wlasneJakoItems = useMemo(() => wlasne.map(w => ({
    klucz: `wlasny_${w.id}`,
    skladnik: w.nazwa,
    ilosc: null,
    iloscOryginalna: w.ilosc || '',
    jednostka: '',
    kategoria: w.kategoria || '8_Inne',
    podmieniono: false,
    zrodlo: 'wlasne',
    wlasnyData: w,
  })), [wlasne])

  // Cykliczne — wyświetlamy jak własne, ale z flagą do różnicowania.
  // Odhaczanie cyklicznych zapisujemy w zakupy_historia (jak składniki z planu),
  // dzięki czemu „Zacznij od nowa” je automatycznie resetuje.
  const cyklicneJakoItems = useMemo(() => cykliczne.map(c => ({
    klucz: kluczZakupu(c.nazwa, ''), // ten sam klucz co w zakupy_historia
    skladnik: c.nazwa,
    ilosc: null,
    iloscOryginalna: c.ilosc || '',
    jednostka: '',
    kategoria: c.kategoria || '8_Inne',
    podmieniono: false,
    zrodlo: 'cykliczne',
    cyklicneData: c,
  })), [cykliczne])

  const listaPoKorektach = useMemo(
    () => lista
      .map(item => zastosujKorekteZakupu(item, korektyZakupow[item.klucz]))
      .filter(Boolean),
    [lista, korektyZakupow]
  )

  const listaPoProduktachDomowych = useMemo(
    () => listaPoKorektach.filter(item =>
      !produktPasujeDoDomu(item.skladnik, produktyWDomuSet) &&
      !domyslnieWDomu(item)),
    [listaPoKorektach, produktyWDomuSet]
  )

  const ukrytePrzezMamWDomu = useMemo(
    () => listaPoKorektach.filter(item => produktPasujeDoDomu(item.skladnik, produktyWDomuSet)),
    [listaPoKorektach, produktyWDomuSet]
  )

  const usunieteProdukty = useMemo(() => {
    return Object.entries(korektyZakupow || {})
      .filter(([, korekta]) => korekta?.usuniety)
      .map(([bazaKlucz, korekta]) => {
        const oryginalny = lista.find(item => item.klucz === bazaKlucz)
        const nazwa = poprawNazwe(korekta.nazwa || oryginalny?.skladnik || bazaKlucz.split('||')[0])
        return {
          bazaKlucz,
          nazwa,
          ilosc: normalizujIloscTekst(korekta.ilosc || tekstIlosciZItemu(oryginalny)),
          kategoria: bezpiecznaKategoria(korekta.kategoria || oryginalny?.kategoria),
        }
      })
      .filter(item => item.bazaKlucz && item.nazwa)
      .sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
  }, [korektyZakupow, lista])

  // Wszystkie itemy razem: plan (po korektach, po Mam w domu) + własne + cykliczne.
  // Cykliczne i własne zostają nawet jeśli pasują do „Mam w domu” — to świadoma decyzja.
  const wszystkieItemyBezPromo = useMemo(() => {
    return [...listaPoProduktachDomowych, ...wlasneJakoItems, ...cyklicneJakoItems]
  }, [listaPoProduktachDomowych, wlasneJakoItems, cyklicneJakoItems])

  // Dopnij promocje do itemów (item.promo = {store, old, now, off, until} | null).
  const wszystkieItemy = useMemo(() => {
    if (MOCK_PROMO) {
      return wszystkieItemyBezPromo.map((it, i) =>
        i % 3 === 0 ? { ...it, promo: MOCK_PROMO_DANE[(i / 3) % MOCK_PROMO_DANE.length] } : { ...it, promo: null }
      )
    }
    if (!promocje.length) return wszystkieItemyBezPromo
    return dopasujPromocje(wszystkieItemyBezPromo, promocje)
  }, [wszystkieItemyBezPromo, promocje])

  // Czy item jest kupione?
  // - 'wlasne' → kolumna `odznaczone` w zakupy_wlasne
  // - 'plan' i 'cykliczne' → zakupy_historia (przez Set odznaczone po kluczu)
  const czyKupione = useCallback((item) => {
    if (item.zrodlo === 'wlasne') return !!item.wlasnyData.odznaczone
    return odznaczone.has(item.klucz)
  }, [odznaczone])

  const doKupienia = wszystkieItemy.filter(i => !czyKupione(i))
  const kupione = wszystkieItemy.filter(i => czyKupione(i))
  const procent = wszystkieItemy.length > 0 ? Math.round(kupione.length / wszystkieItemy.length * 100) : 0

  const kategorie = {}
  doKupienia.forEach(item => {
    const katId = item.kategoria
    const katLabel = (KATEGORIE.find(k => k.id === katId)?.label) || katId.replace(/^\d_/, '')
    if (!kategorie[katLabel]) kategorie[katLabel] = { id: katId, items: [] }
    kategorie[katLabel].items.push(item)
  })

  function toggleAny(item) {
    blokujDodawanieDo.current = Date.now() + 650
    if (item.zrodlo === 'wlasne') return toggleWlasny(item.wlasnyData)
    return toggle(item)
  }

  function otworzDodawanieWlasnego() {
    if (Date.now() < blokujDodawanieDo.current) return
    setEdycjaWlasnego(null)
    setPokazDodaj(true)
  }

    const s = makeS()
  if (loading) return <div style={s.loading}>Generuję listę zakupów…</div>

  if (trybSklepu) {
    return (
      <TrybSklepu
        wszystkieItemy={wszystkieItemy}
        czyKupione={czyKupione}
        onToggle={toggleAny}
        onClose={() => setTrybSklepu(false)}
      />
    )
  }



  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.headerCard}>
          <div style={s.headerTop}>
            <div>
              <div style={s.headerEyebrow}>{etykietaTygodnia(tydzienKalendarza + offsetLokalny)}</div>
              <h1 style={s.title}>Zakupy</h1>
            </div>
            <div style={s.progressRing}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#fff" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={`${(procent / 100) * 150.8} 200`}
                  transform="rotate(-90 28 28)" />
              </svg>
              <div style={s.progressTxt}>{procent}%</div>
            </div>
          </div>
          <div style={s.headerSub}>
            {kupione.length} z {wszystkieItemy.length} produktów w koszyku
          </div>
        </header>

        {/* Nawigacja tygodni — wyraźny pasek pod nagłówkiem */}
        <div style={s.tydzienPasek}>
          <button style={s.tydzienPasekBtn} onClick={() => setOffsetLokalny(o => o - 1)}>
            ← Poprzedni
          </button>
          <span style={s.tydzienPasekLabel}>
            {(() => {
              const pon = tydzienZakupowZOffsetem(tydzienKalendarza + offsetLokalny)
              const nd = new Date(pon + 'T12:00:00')
              nd.setDate(nd.getDate() + 6)
              const fmt = (dateStr) => new Date(dateStr + 'T12:00:00')
                .toLocaleDateString('pl', { day: 'numeric', month: 'short' })
              return `${fmt(pon)} – ${fmt(formatDataLocal(nd))}`
            })()}
          </span>
          <button style={s.tydzienPasekBtn} onClick={() => setOffsetLokalny(o => o + 1)}>
            Następny →
          </button>
        </div>

        <SzybkieDodawanie
          value={szybkiTekst}
          onChange={setSzybkiTekst}
          onDodaj={dodajSzybkieProdukty}
        />

        <MamWDomuShortcut
          ile={listaPoKorektach.length}
          ukryte={ukrytePrzezMamWDomu.length}
          onClick={() => setPokazMamWDomu(true)}
        />

        {wszystkieItemy.length > 0 && (
          <button style={s.btnSklep} onClick={() => setTrybSklepu(true)}>
            🛒 Idę do sklepu
          </button>
        )}

        {wszystkieItemy.length === 0 ? (
          <div style={s.empty}>
            <h3 style={s.emptyTytul}>Brak rzeczy do kupienia</h3>
            <p style={s.emptySub}>
              Wypełnij kalendarz albo dodaj własny produkt.
            </p>
            <button style={s.emptyBtn} onClick={otworzDodawanieWlasnego}>
              + Dodaj produkt
            </button>
          </div>
        ) : (
          <>
            <PromoBanner items={doKupienia} />

            {Object.entries(kategorie).map(([katLabel, { items }]) => (
              <section key={katLabel} style={s.katSekcja}>
                <h3 style={s.katHeader}>{katLabel}</h3>
                <div style={s.katLista}>
                  {items.map(item => (
                    <div key={item.klucz}>
                      <ItemRow
                        item={item}
                        kupione={false}
                        onToggle={() => toggleAny(item)}
                        onLongPress={() => rozpocznijEdycjeItemu(item)}
                        onEdit={() => rozpocznijEdycjeItemu(item)}
                        onHome={item.zrodlo === 'plan' ? () => dodajDoMamWDomu(item.skladnik) : null}
                        promoOpen={openPromoKlucz === item.klucz}
                        onPromoToggle={() => setOpenPromoKlucz(k => k === item.klucz ? null : item.klucz)}
                      />
                      {openPromoKlucz === item.klucz && item.promo && (
                        <PromoDetail promo={item.promo} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {usunieteProdukty.length > 0 && (
              <UsunieteProdukty
                items={usunieteProdukty}
                onRestore={przywrocUsunietyProdukt}
                onRestoreAll={przywrocWszystkieUsuniete}
              />
            )}

            {kupione.length > 0 && (
              <section style={{ ...s.katSekcja, marginTop: 24 }}>
                <h3 style={s.katHeaderDone}>W koszyku ({kupione.length})</h3>
                <div style={s.katLista}>
                  {kupione.map(item => (
                    <ItemRow
                      key={item.klucz}
                      item={item}
                      kupione={true}
                      onToggle={() => toggleAny(item)}
                      onEdit={() => rozpocznijEdycjeItemu(item)}
                      onHome={item.zrodlo === 'plan' ? () => dodajDoMamWDomu(item.skladnik) : null}
                    />
                  ))}
                </div>
              </section>
            )}

            <div style={s.btnRow}>
              <button style={s.btnGhost} onClick={zacznijOdNowa}>
                Zacznij od nowa
              </button>
              <button style={s.btnGhost} onClick={generuj}>
                Odśwież listę
              </button>
            </div>

            <button style={s.btnDodajWlasny} onClick={otworzDodawanieWlasnego}>
              + Dodaj własny produkt (papier, chemia, lek…)
            </button>
          </>
        )}
      </div>

      {pokazDodaj && (
        <DodajProduktModal
          edycja={edycjaWlasnego}
          onClose={() => { setPokazDodaj(false); setEdycjaWlasnego(null) }}
          onSave={zapiszWlasny}
          onDelete={edycjaWlasnego ? () => usunEdytowanyProdukt(edycjaWlasnego) : null}
        />
      )}

      {pokazMamWDomu && (
        <MamWDomuModal
          produkty={produktyWDomu}
          aktualneProdukty={listaPoKorektach}
          ukryteProdukty={ukrytePrzezMamWDomu}
          onClose={() => setPokazMamWDomu(false)}
          onSave={(nowe) => {
            zapiszProduktyWDomu(nowe)
            setPokazMamWDomu(false)
            pokazToast('Zaktualizowano produkty w domu')
          }}
        />
      )}

      <Toast
        toast={toast ? { id: toast.id, label: toast.msg } : null}
        duration={3500}
        onUndo={toast?.onUndo}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function MamWDomuShortcut({ ile, ukryte, onClick }) {
  const s = makeS()
  return (
    <button style={s.mamWDomuShortcut} onClick={onClick}>
      <div>
        <div style={s.mamWDomuEyebrow}>MAM W DOMU</div>
        <div style={s.mamWDomuTitle}>Odklikaj produkty z aktualnej listy</div>
        <div style={s.mamWDomuSub}>
          {ile} produktów z przepisów{ukryte > 0 ? ` · ukryto teraz: ${ukryte}` : ''}
        </div>
      </div>
      <span style={s.mamWDomuArrow}>›</span>
    </button>
  )
}

function UsunieteProdukty({ items, onRestore, onRestoreAll }) {
  const s = makeS()
  if (!items?.length) return null

  return (
    <section style={s.restoreCard}>
      <div style={s.restoreHeader}>
        <div>
          <div style={s.restoreEyebrow}>USUNIĘTE Z LISTY</div>
          <div style={s.restoreTitle}>Możesz przywrócić ukryte pozycje</div>
        </div>
        <button style={s.restoreAllBtn} onClick={onRestoreAll}>
          Przywróć wszystko
        </button>
      </div>
      <div style={s.restoreList}>
        {items.map(item => (
          <button
            key={item.bazaKlucz}
            style={s.restoreItem}
            onClick={() => onRestore(item)}
          >
            <span style={s.restoreItemName}>{item.nazwa}</span>
            {item.ilosc && <span style={s.restoreItemQty}>{item.ilosc}</span>}
            <span style={s.restoreItemAction}>Przywróć</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function MamWDomuModal({ produkty, aktualneProdukty, ukryteProdukty, onClose, onSave }) {
  const [lokalne, setLokalne] = useState(() => unikalneProduktyWDomu(produkty))

  const lokalneSet = useMemo(
    () => new Set(lokalne.map(normalizujProduktDomowy).filter(Boolean)),
    [lokalne]
  )

  const aktualneLista = useMemo(() => {
    const mapa = new Map()
    ;(aktualneProdukty || []).forEach(item => {
      if (produktZawszeUkrytyZPrzepisow(item.skladnik)) return
      const ladna = ladnaNazwaProduktuDomowego(item.skladnik)
      const norm = normalizujProduktDomowy(ladna)
      if (!norm || mapa.has(norm)) return
      mapa.set(norm, {
        norm,
        nazwa: ladna,
        kategoria: item.kategoria,
        ilosc: item.ilosc != null
          ? `${item.ilosc} ${item.jednostka || ''}`.trim()
          : (item.iloscOryginalna || item.jednostka || ''),
      })
    })
    return [...mapa.values()].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
  }, [aktualneProdukty])

  function toggle(nazwa) {
    const ladna = ladnaNazwaProduktuDomowego(nazwa)
    const norm = normalizujProduktDomowy(ladna)
    if (!norm) return
    setLokalne(prev => {
      const ma = prev.some(x => normalizujProduktDomowy(x) === norm)
      if (ma) return prev.filter(x => normalizujProduktDomowy(x) !== norm)
      return unikalneProduktyWDomu([...prev, ladna])
    })
  }

  function zapiszAktualne() {
    const zaznaczoneZAktualnejListy = aktualneLista
      .filter(item => lokalneSet.has(item.norm))
      .map(item => item.nazwa)
    onSave(zaznaczoneZAktualnejListy)
  }

  return (
    <div style={mod.overlay} onClick={onClose}>
      <div style={mod.modal} onClick={e => e.stopPropagation()}>
        <div style={mod.header}>
          <div>
            <div style={mod.eyebrow}>MAM W DOMU</div>
            <div style={mod.title}>Odklikaj z aktualnej listy</div>
          </div>
          <button style={mod.close} onClick={onClose}>✕</button>
        </div>

        <p style={mod.helpText}>
          Pokazuję tylko produkty wygenerowane z przepisów na ten tydzień. Produkty dopisane ręcznie zostają na zakupach, bo zakładamy, że skoro je dopisałeś, to ich brakuje.
        </p>

        {ukryteProdukty?.length > 0 && (
          <div style={mod.infoBox}>
            Teraz ukryto: {ukryteProdukty.slice(0, 5).map(i => i.skladnik).join(', ')}{ukryteProdukty.length > 5 ? ` +${ukryteProdukty.length - 5}` : ''}
          </div>
        )}

        <label style={mod.label}>Produkty z wygenerowanej listy ({aktualneLista.length})</label>

        {aktualneLista.length === 0 ? (
          <div style={mod.loading}>Brak produktów wygenerowanych z przepisów.</div>
        ) : (
          <div style={mod.choiceList}>
            {aktualneLista.map(item => {
              const checked = lokalneSet.has(item.norm)
              return (
                <button
                  key={item.norm}
                  style={{ ...mod.choiceRow, ...(checked ? mod.choiceRowOn : {}) }}
                  onClick={() => toggle(item.nazwa)}
                >
                  <span style={{ ...mod.choiceCheck, ...(checked ? mod.choiceCheckOn : {}) }}>
                    {checked ? '✓' : ''}
                  </span>
                  <span style={mod.choiceText}>
                    <span style={mod.choiceName}>{item.nazwa}</span>
                    {item.ilosc && <span style={mod.choiceQty}>{item.ilosc}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div style={mod.footerWrap}>
          <button style={mod.btnCancel} onClick={() => setLokalne([])}>
            Nic nie mam
          </button>
          <button
            style={mod.btnCancel}
            onClick={() => setLokalne(aktualneLista.map(item => item.nazwa))}
            disabled={aktualneLista.length === 0}
          >
            Mam wszystko
          </button>
          <button style={mod.btnSave} onClick={zapiszAktualne}>
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Szybkie dodawanie: Enter dodaje produkt i zostawia pole aktywne.
function SzybkieDodawanie({ value, onChange, onDodaj }) {
  const s = makeS()
  const textareaRef = useRef(null)

  async function dodajAktualne() {
    const tekst = value.trim()
    if (!tekst) return
    await onDodaj(tekst)
    onChange('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function handleChange(e) {
    const next = e.target.value

    if (/\r?\n/.test(next)) {
      const parts = next.split(/\r?\n/)
      const gotowe = parts.slice(0, -1).map(x => x.trim()).filter(Boolean)
      const reszta = parts[parts.length - 1] || ''

      onChange(reszta)
      if (gotowe.length > 0) await onDodaj(gotowe.join('\n'))
      requestAnimationFrame(() => textareaRef.current?.focus())
      return
    }

    onChange(next)
  }

  async function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await dodajAktualne()
    }
  }

  return (
    <section style={s.quickAddCard}>
      <div style={s.quickAddHeader}>
        <div>
          <div style={s.quickAddEyebrow}>SZYBKIE DODAWANIE</div>
          <div style={s.quickAddTitle}>Dopisz swoje produkty</div>
        </div>
        <button
          style={{ ...s.quickAddBtn, opacity: value.trim() ? 1 : 0.45 }}
          onClick={dodajAktualne}
          disabled={!value.trim()}
        >
          Dodaj
        </button>
      </div>
      <textarea
        ref={textareaRef}
        style={s.quickAddInput}
        value={value}
        rows={1}
        placeholder="np. Musztarda sarepska 1szt. albo Margaryna"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div style={s.quickAddHelp}>
        Enter dodaje produkt. Możesz wpisać też kilka po przecinku: „Woda, Musztarda sarepska 1szt., Margaryna”. Brak ilości też jest OK — produkt i tak trafi do „Inne”.
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════
// Pojedynczy wiersz listy — z long-pressem dla edycji.
// Odhaczanie „kupione" TYLKO checkboxem (decyzja Filipa, Zadanie-promocje.md A4).
// Tap w resztę wiersza: gdy item.promo → toggluje szczegół promocji; bez promo → nic.
function ItemRow({ item, kupione, onToggle, onLongPress, onEdit, onHome, promoOpen, onPromoToggle }) {
  const s = makeS()
  const longPressTimer = useRef(null)
  const startPos = useRef(null)
  const triggered = useRef(false)
  const moved = useRef(false)

  function down(e) {
    triggered.current = false
    moved.current = false
    startPos.current = { x: e.clientX, y: e.clientY }
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        triggered.current = true
        onLongPress()
        if (navigator.vibrate) navigator.vibrate(20)
      }, 500)
    }
  }
  function move(e) {
    if (!startPos.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx > 10 || dy > 10) {
      moved.current = true
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }
  }
  function up() {
    if (!startPos.current) return
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    // Tylko czysty tap (bez ruchu = nie scroll, bez long-pressa) rozwija promocję
    if (!triggered.current && !moved.current && !kupione && item.promo && onPromoToggle) {
      onPromoToggle()
    }
    startPos.current = null
  }
  function cancel() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    startPos.current = null
    triggered.current = false
    moved.current = false
  }

  const isWlasny = item.zrodlo === 'wlasne'
  const isCykliczny = item.zrodlo === 'cykliczne'

  return (
    <div
      style={{ ...s.item, ...(kupione ? s.itemDone : {}) }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <button
        style={s.checkboxHit}
        onPointerDown={e => e.stopPropagation()}
        onPointerUp={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onToggle() }}
        aria-label={kupione ? `Odznacz ${item.skladnik}` : `Kupione: ${item.skladnik}`}
      >
        <span style={{ ...s.checkbox, ...(kupione ? s.checkboxDone : {}) }}>
          {kupione && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          )}
        </span>
      </button>
      <div style={s.itemInfo}>
        <div style={{ ...s.itemNazwa, ...(kupione ? { textDecoration: 'line-through', color: t.muteLight } : {}) }}>
          {item.skladnik}
          {item.podmieniono && <span style={s.podmianaIcon} title="Składnik podmieniony">↻</span>}
          {item.edytowany && <span style={s.tagJednorazowo} title="Pozycja zmieniona na liście">edytowane</span>}
          {isWlasny && <span style={s.tagJednorazowo} title="Produkt dopisany ręcznie">własne</span>}
          {isCykliczny && <span style={s.tagPowtarzaj} title="Powtarza się co tydzień">↻ co tydzień</span>}
        </div>
        {item.opakowania ? (
          <>
            <div style={{ ...s.itemIlosc, ...(kupione ? { color: t.muteLight } : {}) }}>
              <strong style={{ color: kupione ? t.muteLight : t.text, fontWeight: 600 }}>
                {formatujOpakowania(item.opakowania)}
              </strong>
              <span style={s.itemIloscHint}>
                {' '}potrzeba {formatujOryginalnaIlosc(item.opakowania)}
              </span>
              {!kupione && item.promo && (
                <span style={s.itemPromoSklep}>
                  {' · '}<StoreDot store={item.promo.store} size={6} /> {item.promo.store}
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{ ...s.itemIlosc, ...(kupione ? { color: t.muteLight } : {}) }}>
            <strong style={{ color: kupione ? t.muteLight : t.text, fontWeight: 600 }}>
              {item.ilosc != null
                ? formatujWage(item.ilosc, item.jednostka)
                : (item.iloscOryginalna || '—')}
            </strong>
            {!kupione && item.promo && (
              <span style={s.itemPromoSklep}>
                {' · '}<StoreDot store={item.promo.store} size={6} /> {item.promo.store}
              </span>
            )}
          </div>
        )}
      </div>
      {!kupione && item.promo && (
        <PromoChip promo={item.promo} open={!!promoOpen} />
      )}
      {onHome && (
        <button
          style={s.itemHomeBtn}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onHome() }}
          aria-label={`Mam w domu ${item.skladnik}`}
          title="Mam w domu — ukryj z listy"
        >
          🏠
        </button>
      )}
      {onEdit && (
        <button
          style={s.itemEditBtn}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit() }}
          aria-label={`Edytuj ${item.skladnik}`}
          title="Edytuj nazwę / ilość / usuń"
        >
          ✎
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Modal: dodaj/edytuj produkt — z opcją „powtarzaj co tydzień”.
// Checkbox jest ukryty dla korekt z planu (te zawsze pozostają korektami).
function DodajProduktModal({ edycja, onClose, onSave, onDelete }) {
  const [nazwa, setNazwa] = useState(edycja?.nazwa || '')
  const [ilosc, setIlosc] = useState(edycja?.ilosc?.toString() || '')
  const [kategoria, setKategoria] = useState(edycja?.kategoria || '8_Inne')
  const [cykliczny, setCykliczny] = useState(!!edycja?.cykliczny)

  // Korekta pozycji z planu nie ma sensu jako „cykliczna” — to inny mechanizm
  const pokazCykliczny = edycja?.__zrodlo !== 'plan'

  function submit() {
    if (!nazwa.trim()) return
    onSave({
      nazwa: nazwa.trim(),
      ilosc: normalizujIloscTekst(ilosc),
      kategoria,
      cykliczny: pokazCykliczny ? cykliczny : false,
    })
  }

  return (
    <div style={mod.overlay} onClick={onClose}>
      <div style={mod.modal} onClick={e => e.stopPropagation()}>
        <div style={mod.header}>
          <div>
            <div style={mod.eyebrow}>{edycja ? 'EDYTUJ' : 'NOWY'}</div>
            <div style={mod.title}>{edycja ? 'Edytuj produkt' : 'Własny produkt'}</div>
          </div>
          <button style={mod.close} onClick={onClose}>✕</button>
        </div>

        <div style={mod.body}>
          <label style={mod.label}>Nazwa</label>
          <input
            style={mod.input}
            type="text"
            placeholder="np. Papier toaletowy"
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
          />

          <label style={mod.label}>Ilość / jednostka (opcjonalnie)</label>
          <input
            style={mod.input}
            type="text"
            placeholder="np. 1 szt., 2 l, opakowanie"
            value={ilosc}
            onChange={e => setIlosc(e.target.value)}
          />

          <label style={mod.label}>Kategoria</label>
          <select style={mod.input} value={kategoria} onChange={e => setKategoria(e.target.value)}>
            {KATEGORIE.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>

          {pokazCykliczny && (
            <label
              style={mod.checkRow}
              onClick={e => { e.preventDefault(); setCykliczny(v => !v) }}
            >
              <input
                type="checkbox"
                checked={cykliczny}
                onChange={e => setCykliczny(e.target.checked)}
                style={{ marginTop: 2, accentColor: t.accent, width: 18, height: 18, flexShrink: 0 }}
                onClick={e => e.stopPropagation()}
              />
              <div>
                <div style={mod.checkLabel}>Powtarzaj co tydzień</div>
                <div style={mod.checkHelp}>
                  Produkt automatycznie pojawi się na liście w każdym nowym tygodniu.
                  Po zakupie odhaczony, w poniedziałek wraca jako do kupienia.
                </div>
              </div>
            </label>
          )}
        </div>

        <div style={mod.footer}>
          {onDelete && (
            <button style={mod.btnDelete} onClick={onDelete}>Usuń</button>
          )}
          <button style={mod.btnCancel} onClick={onClose}>Anuluj</button>
          <button style={mod.btnSave} onClick={submit} disabled={!nazwa.trim()}>
            {edycja ? 'Zapisz' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Tryb sklepu — fullscreen, ciemne tło, swipe
function TrybSklepu({ wszystkieItemy, czyKupione, onToggle, onClose }) {
  const [wakeLockOn, setWakeLockOn] = useState(false)
  const wakeLockRef = useRef(null)

  // Wake Lock — ekran nie gaśnie
  useEffect(() => {
    let aktywne = true
    async function lock() {
      if (!('wakeLock' in navigator)) return
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        if (aktywne) setWakeLockOn(true)
        wakeLockRef.current.addEventListener('release', () => setWakeLockOn(false))
      } catch (e) {
        // Brak uprawnień / nieobsługiwane — to OK
      }
    }
    lock()
    function onVisible() {
      if (document.visibilityState === 'visible') lock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      aktywne = false
      document.removeEventListener('visibilitychange', onVisible)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [])

  const doKupienia = wszystkieItemy.filter(i => !czyKupione(i))
  const kupione = wszystkieItemy.filter(i => czyKupione(i))

  const kategorie = {}
  doKupienia.forEach(item => {
    const katId = item.kategoria
    const katLabel = (KATEGORIE.find(k => k.id === katId)?.label) || katId.replace(/^\d_/, '')
    if (!kategorie[katLabel]) kategorie[katLabel] = []
    kategorie[katLabel].push(item)
  })

  return (
    <div style={sklep.outer}>
      <header style={sklep.header}>
        <div>
          <div style={sklep.eyebrow}>TRYB SKLEPU{wakeLockOn ? ' · EKRAN AKTYWNY' : ''}</div>
          <div style={sklep.headerStats}>
            <strong style={sklep.headerStatsNum}>{doKupienia.length}</strong> do kupienia
            {kupione.length > 0 && <span style={sklep.headerStatsDone}>· {kupione.length} w koszyku</span>}
          </div>
        </div>
        <button style={sklep.close} onClick={onClose} aria-label="Wyjdź ze sklepu">✕</button>
      </header>

      <div style={sklep.scroll}>
        {doKupienia.length === 0 ? (
          <div style={sklep.gotowe}>
            <div style={sklep.gotoweEmoji}>🎉</div>
            <div style={sklep.gotoweTitle}>Wszystko w koszyku!</div>
            <div style={sklep.gotoweSub}>Możesz wracać do domu.</div>
          </div>
        ) : (
          Object.entries(kategorie).map(([katLabel, items]) => (
            <section key={katLabel} style={sklep.kat}>
              <h2 style={sklep.katTitle}>{katLabel}</h2>
              <div style={sklep.katItems}>
                {items.map(item => (
                  <SwipeItem
                    key={item.klucz}
                    item={item}
                    onSwipeRight={() => onToggle(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {kupione.length > 0 && (
          <section style={{ ...sklep.kat, marginTop: 32, opacity: 0.55 }}>
            <h2 style={{ ...sklep.katTitle, color: '#aaa' }}>W koszyku ({kupione.length})</h2>
            <div style={sklep.katItems}>
              {kupione.map(item => (
                <SwipeItem
                  key={item.klucz}
                  item={item}
                  kupione
                  onSwipeRight={() => onToggle(item)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div style={sklep.hint}>
        Przesuń produkt w prawo, żeby {doKupienia.length > 0 ? 'wrzucić do koszyka' : 'przywrócić'}
      </div>
    </div>
  )
}

// Pojedynczy swipe-able item w trybie sklepu
function SwipeItem({ item, kupione, onSwipeRight }) {
  const [translateX, setTranslateXState] = useState(0)
  const [animowanie, setAnimowanie] = useState(false)
  const itemRef = useRef(null)
  const swipe = useRef({ active: false, startX: 0, startY: 0, kierunek: null })
  const translateRef = useRef(0)
  const pointerIdRef = useRef(null)

  function setTranslateXSafe(value) {
    translateRef.current = value
    setTranslateXState(value)
  }

  function progZaliczenia() {
    const szerokosc = itemRef.current?.offsetWidth || window.innerWidth || 320
    return Math.min(240, Math.max(115, szerokosc * 0.45))
  }

  function resetRefs() {
    swipe.current = { active: false, startX: 0, startY: 0, kierunek: null }
    pointerIdRef.current = null
  }

  function start(clientX, clientY) {
    if (animowanie) return
    swipe.current = { active: true, startX: clientX, startY: clientY, kierunek: null }
    setTranslateXSafe(0)
  }

  function move(clientX, clientY, event) {
    if (!swipe.current.active || animowanie) return

    const dx = clientX - swipe.current.startX
    const dy = clientY - swipe.current.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    if (!swipe.current.kierunek) {
      if (absX < 8 && absY < 8) return
      swipe.current.kierunek = absX > absY + 4 ? 'x' : 'y'
    }

    if (swipe.current.kierunek === 'y') return

    if (event?.cancelable) event.preventDefault()

    const szerokosc = itemRef.current?.offsetWidth || window.innerWidth || 320
    const ograniczone = Math.max(0, Math.min(dx, szerokosc * 0.85))
    setTranslateXSafe(ograniczone)
  }

  function end() {
    if (!swipe.current.active) return

    const zaliczone = swipe.current.kierunek === 'x' && translateRef.current >= progZaliczenia()

    if (zaliczone) {
      setAnimowanie(true)
      setTranslateXSafe(window.innerWidth)
      setTimeout(() => {
        onSwipeRight()
        setTranslateXSafe(0)
        setAnimowanie(false)
      }, 180)
      navigator.vibrate?.(15)
    } else {
      setTranslateXSafe(0)
    }

    resetRefs()
  }

  function cancel() {
    setTranslateXSafe(0)
    resetRefs()
  }

  function pointerDown(e) {
    if (e.pointerType === 'touch') return
    if (e.button != null && e.button !== 0) return
    pointerIdRef.current = e.pointerId
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    start(e.clientX, e.clientY)
  }

  function pointerMove(e) {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
    move(e.clientX, e.clientY, e)
  }

  function pointerUp(e) {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
    end()
  }

  function touchStart(e) {
    const touch = e.touches?.[0]
    if (!touch) return
    start(touch.clientX, touch.clientY)
  }

  function touchMove(e) {
    const touch = e.touches?.[0]
    if (!touch) return
    move(touch.clientX, touch.clientY, e)
  }

  return (
    <div style={sklep.itemWrapper}>
      <div style={{
        ...sklep.itemBg,
        opacity: Math.min(1, translateX / progZaliczenia()),
      }}>
        <span style={sklep.itemBgIcon}>✓</span>
        <span style={sklep.itemBgTxt}>{kupione ? 'Przywróć' : 'Do koszyka'}</span>
      </div>

      <div
        ref={itemRef}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancel}
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={end}
        onTouchCancel={cancel}
        style={{
          ...sklep.item,
          ...(kupione ? sklep.itemKupione : {}),
          transform: `translateX(${translateX}px)`,
          transition: animowanie ? 'transform .18s ease-out' : (translateX === 0 ? 'transform .16s ease-out' : 'none'),
        }}
      >
        <div style={sklep.itemNazwa}>{item.skladnik}</div>
        {item.opakowania ? (
          <div style={sklep.itemIlosc}>
            <strong style={{ color: '#fff', fontWeight: 600 }}>
              {formatujOpakowania(item.opakowania)}
            </strong>
            <span style={{ opacity: 0.7, fontSize: 12, marginLeft: 6 }}>
              potrzeba {formatujOryginalnaIlosc(item.opakowania)}
            </span>
          </div>
        ) : (
          <div style={sklep.itemIlosc}>
            <strong style={{ color: '#fff', fontWeight: 600 }}>
              {item.ilosc != null
                ? formatujWage(item.ilosc, item.jednostka)
                : (item.iloscOryginalna || '')}
            </strong>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function makeS() {
  return {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans, position: 'relative' },
  container: { padding: '20px 20px 32px', maxWidth: 620, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  headerCard: {
    background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentDark} 100%)`,
    color: '#fff', borderRadius: 22, padding: '20px 20px 18px',
    marginBottom: 16, position: 'relative', overflow: 'hidden',
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 600,
    letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.75,
  },
  tydzienPasek: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 14,
    padding: '4px 4px', marginBottom: 16,
  },
  tydzienPasekBtn: {
    background: t.surfaceAlt, border: `0.5px solid ${t.border}`,
    borderRadius: 10, padding: '8px 14px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    color: t.accent, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  tydzienPasekLabel: {
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    color: t.text, textAlign: 'center', flex: 1,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 32, lineHeight: 1, color: '#fff',
    letterSpacing: -0.4, margin: 0, fontWeight: 400,
  },
  headerSub: { fontFamily: fonts.sans, fontSize: 13, opacity: 0.85, marginTop: 14 },
  progressRing: { position: 'relative', width: 56, height: 56 },
  progressTxt: {
    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
  },

  btnSklep: {
    ...ui.btnPrimary, width: '100%', marginBottom: 20,
  },

  quickAddCard: {
    ...ui.card,
    padding: 14,
    marginBottom: 14,
  },
  quickAddHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    marginBottom: 10,
  },
  quickAddEyebrow: {
    fontFamily: fonts.sans, fontSize: 9.5, fontWeight: 800,
    letterSpacing: 1.2, textTransform: 'uppercase', color: t.accent,
    marginBottom: 3,
  },
  quickAddTitle: {
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 700, color: t.text,
  },
  quickAddBtn: {
    border: 'none', borderRadius: 10,
    background: t.accent, color: '#fff',
    fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 700,
    padding: '9px 12px', cursor: 'pointer',
  },
  quickAddInput: {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${t.border}`, borderRadius: 12,
    background: t.surfaceAlt || t.bg,
    color: t.text,
    fontFamily: fonts.sans, fontSize: 15,
    lineHeight: 1.35,
    padding: '12px 13px',
    outline: 'none', resize: 'none', overflow: 'hidden',
  },
  quickAddHelp: {
    marginTop: 8,
    fontFamily: fonts.sans, fontSize: 11.5,
    lineHeight: 1.35,
    color: t.mute,
  },

  mamWDomuShortcut: {
    ...ui.card,
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px', marginBottom: 14,
    border: `1px solid ${t.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    textAlign: 'left', cursor: 'pointer', fontFamily: fonts.sans,
    background: t.surface,
  },
  mamWDomuEyebrow: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2,
    textTransform: 'uppercase', color: t.warm || t.accent,
    marginBottom: 3,
  },
  mamWDomuTitle: { fontSize: 13.5, fontWeight: 700, color: t.text },
  mamWDomuSub: { fontSize: 11.5, color: t.mute, marginTop: 3 },
  mamWDomuArrow: {
    fontFamily: fonts.serif, fontSize: 24, color: t.mute,
    lineHeight: 1, paddingRight: 2,
  },

  restoreCard: {
    ...ui.card,
    padding: 14,
    marginBottom: 14,
    border: `1px solid ${t.border}`,
  },
  restoreHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 10, marginBottom: 10,
  },
  restoreEyebrow: {
    fontFamily: fonts.sans, fontSize: 9.5, fontWeight: 800,
    letterSpacing: 1.2, textTransform: 'uppercase', color: t.warm || t.accent,
    marginBottom: 3,
  },
  restoreTitle: { fontSize: 13.5, fontWeight: 700, color: t.text, fontFamily: fonts.sans },
  restoreAllBtn: {
    border: `1px solid ${t.border}`, borderRadius: 999,
    background: t.surfaceAlt, color: t.text,
    fontFamily: fonts.sans, fontSize: 11.5, fontWeight: 700,
    padding: '7px 9px', cursor: 'pointer', flexShrink: 0,
  },
  restoreList: { display: 'flex', flexDirection: 'column', gap: 6 },
  restoreItem: {
    width: '100%', boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 10px', borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.surfaceAlt,
    textAlign: 'left', cursor: 'pointer', fontFamily: fonts.sans,
  },
  restoreItemName: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: t.text },
  restoreItemQty: { fontSize: 11.5, color: t.mute, whiteSpace: 'nowrap' },
  restoreItemAction: { fontSize: 11.5, color: t.accent, fontWeight: 800, whiteSpace: 'nowrap' },

  empty: { ...ui.card, padding: '30px 24px', textAlign: 'center' },
  emptyTytul: { ...ui.h3, marginBottom: 6 },
  emptySub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, margin: '0 0 18px', lineHeight: 1.5 },
  emptyBtn: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 18px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },

  katSekcja: { marginBottom: 18 },
  katHeader: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    margin: '0 0 8px', padding: '0 4px',
  },
  katHeaderDone: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.muteLight,
    margin: '0 0 8px', padding: '0 4px',
  },
  katLista: { ...ui.card, padding: 0, overflow: 'hidden' },

  item: {
    width: '100%', boxSizing: 'border-box', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 12px 12px 16px', background: 'transparent', border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    cursor: 'pointer', fontFamily: fonts.sans,
    userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  },
  itemDone: { opacity: 0.7 },
  // Hit-area checkboxa min 40×40 (dotykowo), wizualnie kółko 22px bez zmian.
  // Ujemne marginesy kompensują padding, żeby layout wiersza się nie rozjechał.
  checkboxHit: {
    background: 'none', border: 'none', padding: 9, margin: -9,
    minWidth: 40, minHeight: 40, flexShrink: 0,
    display: 'grid', placeItems: 'center', cursor: 'pointer',
    touchAction: 'manipulation',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: '50%',
    border: `1.5px solid ${t.borderStrong}`, flexShrink: 0,
    display: 'grid', placeItems: 'center',
    background: t.surface, transition: 'all .15s',
  },
  checkboxDone: { background: t.accent, borderColor: t.accent },
  itemPromoSklep: {
    color: t.textSoft, fontSize: 11.5,
    display: 'inline-flex', alignItems: 'center', gap: 4,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemNazwa: {
    fontSize: 14, fontWeight: 500, color: t.text, lineHeight: 1.2,
    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  itemIlosc: { fontSize: 12, color: t.mute, marginTop: 3, fontVariantNumeric: 'tabular-nums' },
  itemIloscHint: { fontSize: 11, color: t.muteLight || t.mute, fontWeight: 400 },
  itemHomeBtn: {
    width: 30, height: 30, borderRadius: 999,
    border: `1px solid ${t.border}`,
    background: t.surfaceAlt,
    color: t.mute,
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
    marginRight: 0,
  },
  itemEditBtn: {
    width: 30, height: 30, borderRadius: 999,
    border: `1px solid ${t.border}`,
    background: t.surfaceAlt,
    color: t.mute,
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
    marginRight: 0,
  },
  podmianaIcon: { fontSize: 11, color: t.warm, fontWeight: 700 },
  tagPowtarzaj: {
    fontSize: 9.5, color: t.accent, background: t.surfaceAlt,
    padding: '2px 6px', borderRadius: 4, fontWeight: 600,
    letterSpacing: 0.3,
  },
  tagJednorazowo: {
    fontSize: 9.5, color: t.mute, background: t.surfaceAlt,
    padding: '2px 6px', borderRadius: 4, fontWeight: 600,
    letterSpacing: 0.3,
  },

  btnDodajWlasny: {
    width: '100%', padding: '14px 16px', marginTop: 14,
    background: 'transparent', border: `1.5px dashed ${t.borderStrong}`,
    borderRadius: 14, color: t.mute, cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600,
  },

  btnRow: { display: 'flex', gap: 8, marginTop: 18 },
  btnGhost: { ...ui.btnGhost, flex: 1, padding: '12px 14px' },

  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },
  }
}

const mod = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(74,55,40,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 300, padding: 0,
  },
  modal: {
    background: t.surface, borderRadius: '20px 20px 0 0', width: '100%',
    maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
    padding: '20px 20px 24px', boxSizing: 'border-box',
    fontFamily: fonts.sans,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: {
    fontSize: 10.5, fontWeight: 600, letterSpacing: 1.4,
    textTransform: 'uppercase', color: t.mute, marginBottom: 4,
  },
  title: { fontFamily: fonts.serif, fontSize: 22, color: t.text, margin: 0 },
  close: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.text, cursor: 'pointer',
  },
  body: { display: 'flex', flexDirection: 'column' },
  helpText: {
    margin: '0 0 12px',
    fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.45,
    color: t.mute,
  },
  infoBox: {
    padding: '10px 12px', borderRadius: 10,
    background: t.surfaceAlt, color: t.text,
    fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.4,
    marginBottom: 12,
  },
  inlineAddRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  btnSmallSave: {
    padding: '0 13px', background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },
  chipCloud: {
    display: 'flex', flexWrap: 'wrap', gap: 7,
    marginTop: 2, marginBottom: 4,
  },
  chipGhost: {
    border: `1px solid ${t.border}`, background: t.surface,
    color: t.text, borderRadius: 999,
    padding: '7px 10px', fontFamily: fonts.sans,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  chipOn: {
    border: `1px solid ${t.accent}`, background: t.surfaceAlt,
    color: t.accent, borderRadius: 999,
    padding: '7px 10px', fontFamily: fonts.sans,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  loading: {
    padding: '20px 0', textAlign: 'center',
    fontFamily: fonts.sans, fontSize: 13, color: t.mute,
  },
  choiceList: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: '42vh', overflowY: 'auto', paddingRight: 2 },
  choiceRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 12px', borderRadius: 12, border: `1px solid ${t.border}`,
    background: t.surfaceAlt, color: t.text, textAlign: 'left', cursor: 'pointer',
    fontFamily: fonts.sans, boxSizing: 'border-box',
  },
  choiceRowOn: { background: t.warmSoft || t.surfaceAlt, borderColor: t.warm || t.accent },
  choiceCheck: {
    width: 22, height: 22, borderRadius: 999, flexShrink: 0,
    border: `1.5px solid ${t.borderStrong}`, background: t.surface,
    display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800,
    color: '#fff', boxSizing: 'border-box',
  },
  choiceCheckOn: { background: t.accent, borderColor: t.accent },
  choiceText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  choiceName: { fontSize: 13.5, fontWeight: 650, color: t.text, lineHeight: 1.2 },
  choiceQty: { fontSize: 11.5, color: t.mute, fontVariantNumeric: 'tabular-nums' },
  footerWrap: { display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' },
  label: {
    fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
    color: t.mute, marginBottom: 6, marginTop: 12,
  },
  input: {
    ...ui.input, marginBottom: 0, padding: '11px 12px', fontSize: 14,
  },
  rowSplit: { display: 'flex', gap: 12 },
  checkRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    marginTop: 16, padding: '12px', background: t.surfaceAlt,
    borderRadius: 10, cursor: 'pointer',
  },
  checkLabel: { fontSize: 13.5, fontWeight: 600, color: t.text },
  checkHelp: { fontSize: 12, color: t.mute, marginTop: 3, lineHeight: 1.4 },
  footer: { display: 'flex', gap: 8, marginTop: 20 },
  btnCancel: {
    flex: 1, padding: '12px', background: 'transparent',
    border: `1px solid ${t.border}`, borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600,
    color: t.mute, cursor: 'pointer',
  },
  btnSave: {
    flex: 1.5, padding: '12px', background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  btnDelete: {
    padding: '12px 14px', background: 'transparent',
    border: `1px solid ${t.border}`, borderRadius: 12, color: '#c44',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
}

// Tryb sklepu — ciemny motyw, większy tekst
const SKLEP_BG = '#1a1814'
const SKLEP_SURFACE = '#2a2520'
const SKLEP_TEXT = '#f4ede2'
const SKLEP_MUTE = '#a89a85'

const sklep = {
  outer: {
    position: 'fixed', inset: 0, background: SKLEP_BG,
    color: SKLEP_TEXT, fontFamily: fonts.sans, zIndex: 500,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '18px 20px 14px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottom: `0.5px solid #3a342d`,
  },
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', color: t.warm || '#d8c4a8', marginBottom: 4,
  },
  headerStats: { fontSize: 18, color: SKLEP_TEXT },
  headerStatsNum: { fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, marginRight: 6 },
  headerStatsDone: { color: SKLEP_MUTE, fontSize: 14, marginLeft: 6 },
  close: {
    background: SKLEP_SURFACE, border: 'none', borderRadius: 999,
    width: 36, height: 36, fontSize: 16, color: SKLEP_TEXT, cursor: 'pointer',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 16px 24px', WebkitOverflowScrolling: 'touch' },
  kat: { marginBottom: 24 },
  katTitle: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', color: t.warm || '#d8c4a8',
    margin: '0 0 10px', padding: '0 4px',
  },
  katItems: { display: 'flex', flexDirection: 'column', gap: 4 },

  itemWrapper: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 14, background: SKLEP_BG,
    touchAction: 'pan-y',
  },
  itemBg: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, #1a4d2e 0%, #2a7d4f 100%)',
    display: 'flex', alignItems: 'center', paddingLeft: 24,
    color: '#fff', gap: 12,
  },
  itemBgIcon: { fontSize: 24, fontWeight: 700 },
  itemBgTxt: { fontSize: 14, fontWeight: 600, letterSpacing: 0.5 },

  item: {
    position: 'relative', background: SKLEP_SURFACE,
    padding: '18px 20px', borderRadius: 14,
    cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'pan-y', WebkitTouchCallout: 'none',
  },
  itemKupione: { opacity: 0.55 },
  itemNazwa: {
    fontSize: 20, fontWeight: 500, color: SKLEP_TEXT,
    fontFamily: fonts.serif, lineHeight: 1.2, letterSpacing: -0.2,
  },
  itemIlosc: {
    fontSize: 14, color: SKLEP_MUTE, marginTop: 5,
    fontVariantNumeric: 'tabular-nums',
  },

  gotowe: { padding: '60px 24px', textAlign: 'center' },
  gotoweEmoji: { fontSize: 48, marginBottom: 12 },
  gotoweTitle: {
    fontFamily: fonts.serif, fontSize: 26, color: SKLEP_TEXT, marginBottom: 6,
  },
  gotoweSub: { fontSize: 14, color: SKLEP_MUTE },

  hint: {
    padding: '10px 20px 16px', textAlign: 'center',
    fontSize: 11.5, color: SKLEP_MUTE,
    borderTop: `0.5px solid #3a342d`,
  },
}
