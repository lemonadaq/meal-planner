// slownik.js
// SŁOWNIK SKŁADNIKÓW — żeby nowe dania nie wnosiły do bazy trzeciej pisowni
// tego samego produktu.
//
// Problem: model dostaje czystą kartkę przy każdym daniu, więc raz napisze
// „natka pietruszki", raz „garstka natki pietruszki", raz „pietruszka natka".
// Na liście zakupów to trzy osobne pozycje, a `skladniki_meta` (rozmiar
// opakowania, kcal) dopasuje się tylko do jednej z nich.
//
// Rozwiązanie jest dwustronne:
//   1. PRZED generowaniem — słownik tego, co już jest w bazie, wchodzi do
//      promptu: „jeśli używasz tego składnika, nazwij go tak i w tej jednostce".
//   2. PO generowaniu — `czyscSkladnik()` sprząta to, co model wymyślił mimo
//      prośby: nawiasy, alternatywy, ilość wklejoną w nazwę, słowo-ilość
//      („garstka") w polu `ilosc`, i podmienia nazwę na pisownię z bazy.
//
// GRANICA jest ta sama co w src/nazwySkladnikow.js: ujednolicamy PISOWNIĘ
// i JEDNOSTKĘ, nie podmieniamy towaru. „Natka pietruszki" nie staje się
// „pietruszką", „zielona cebulka" nie staje się „cebulą".
//
// Co tu NIE wchodzi: zamiana nazwy z przepisu na nazwę produktu ze sklepu —
// to dzieje się w locie przy budowaniu listy zakupów (src/nazwySkladnikow.js)
// i tabeli `dania` nie dotyka.

import {
  normalizujNazweMeta, kanonJednostka, parsujIlosc, naGramy,
  wagaSztukiZMeta, dopasujMeta,
} from '../src/jednostki.js'
import { uproscNazweSkladnika } from '../src/nazwySkladnikow.js'

// Jednostki dopuszczone przez schemat przepisu (enum w SCHEMAT_PRZEPISU).
export const JEDNOSTKI = ['g', 'ml', 'szt', 'łyżka', 'łyżeczka', 'szczypta']

// „Ludzkość" jednostki: im wyżej, tym bliżej temu, jak się o składniku mówi
// i jak się go kupuje. Przeliczamy TYLKO w górę tej skali — `150 g cebuli`
// wolno zamienić na `1 szt`, ale `1 szt` nigdy nie zamieniamy na gramy.
// Dzięki temu słownik zbudowany ze starych dań (pełnych gramów, bo długo nic
// nie mówiło modelowi, co wybrać) nie cofa poprawek, które robi już prompt.
const RANGA = { szczypta: 0, g: 1, ml: 1, łyżeczka: 2, łyżka: 2, szt: 3 }

// Słowa-ilości: model czasem wkłada je w pole `ilosc` albo na początek nazwy,
// mimo że schemat chce liczby. Mapa mówi, czym je zastąpić.
const SLOWA_ILOSCI = {
  'szczypta': { ilosc: 1, jednostka: 'szczypta' },
  'odrobina': { ilosc: 1, jednostka: 'szczypta' },
  'do smaku': { ilosc: 1, jednostka: 'szczypta' },
  'na oko': { ilosc: 1, jednostka: 'szczypta' },
  'garść': { ilosc: 1, jednostka: 'łyżka' },
  'garstka': { ilosc: 1, jednostka: 'łyżka' },
  'kilka': { ilosc: 2, jednostka: null },
  'parę': { ilosc: 2, jednostka: null },
  'kilka sztuk': { ilosc: 2, jednostka: 'szt' },
  'szklanka': { ilosc: 250, jednostka: 'ml' },
  'pęczek': { ilosc: 1, jednostka: 'szt' },
  'ząbek': { ilosc: 1, jednostka: 'szt' },
  'kromka': { ilosc: 1, jednostka: 'szt' },
  'plasterek': { ilosc: 1, jednostka: 'szt' },
}

// Te same słowa, gdy stoją NA POCZĄTKU NAZWY („garstka natki pietruszki").
// `puszka` i `słoik` celowo nie są tu wymienione — „pomidory z puszki" to
// produkt ze sklepu, nie ilość.
const PRZEDROSTKI_ILOSCI = [
  'szczypta', 'szczypty', 'odrobina', 'odrobinę', 'garść', 'garści', 'garstka',
  'kilka', 'parę', 'pare', 'troche', 'trochę', 'szklanka', 'szklanki',
  'łyżka', 'łyżki', 'łyżeczka', 'łyżeczki', 'pęczek', 'pęczka', 'ząbek', 'ząbki',
  'kromka', 'kromki', 'plasterek', 'plasterki', 'listek', 'listki',
]

const ALTERNATYWY = /\s+(?:lub|albo|ewentualnie|bądź|badz)\s+.*$/i

// ── Nazwa składnika: sprzątanie ───────────────────────────────────
export function czyscNazwe(surowa) {
  let n = (surowa || '').toString().trim()
  if (!n) return ''

  n = n.replace(/\([^)]*\)/g, ' ')          // „dymka (zielona cebulka)" → „dymka"
  n = n.replace(ALTERNATYWY, '')            // „boczek lub podgardle" → „boczek"
  n = n.replace(/\s*[-–—,:]\s*$/, '')       // ogon po wycięciu nawiasu
  n = n.replace(/\s+/g, ' ').trim()

  // Ilość i gramatura wklejone w nazwę — od tego są pola `ilosc`/`jednostka`.
  n = n.replace(/^\d+(?:[.,/]\d+)?\s*(?:g|kg|dag|ml|l|szt\.?|sztuki?|opak\.?)?\s+/i, '')
  n = n.replace(/\s+\d+(?:[.,/]\d+)?\s*(?:g|kg|dag|ml|l|szt\.?|łyżki?|łyżeczki?)\.?$/i, '')

  // Słowo-ilość na początku: „garstka natki pietruszki" → „natki pietruszki".
  // Dopasowanie do bazy (dopasujDoSlownika) doprowadzi potem odmianę
  // do pisowni, która w bazie już jest — „natka pietruszki".
  const pierwsze = n.split(' ')[0]?.toLowerCase()
  if (n.includes(' ') && PRZEDROSTKI_ILOSCI.includes(pierwsze)) {
    n = n.slice(pierwsze.length).trim()
  }

  return n.replace(/\s+/g, ' ').trim()
}

// ── Ilość: do liczby albo do sensownego zamiennika ────────────────
// Zwraca { ilosc: number, jednostka: string|null } — jednostka niepusta tylko
// wtedy, gdy słowo-ilość ją narzuca („szczypta" → szczypta).
export function normalizujIlosc(surowa, jednostka) {
  const tekst = (surowa ?? '').toString().trim()

  const liczba = parsujIlosc(tekst.replace(/\s*(?:g|kg|dag|ml|l|szt\.?)$/i, ''))
  if (liczba != null && liczba > 0) return { ilosc: liczba, jednostka: null }

  const slowo = tekst.toLowerCase().replace(/\s+/g, ' ')
  const trafione = SLOWA_ILOSCI[slowo]
  if (trafione) {
    return {
      ilosc: trafione.ilosc,
      jednostka: trafione.jednostka && trafione.jednostka !== jednostka ? trafione.jednostka : null,
    }
  }

  // Nic sensownego — 1 w jednostce, którą podał model. Lepsze niż „-”,
  // bo lista zakupów umie to zsumować.
  return { ilosc: 1, jednostka: null }
}

// ── Format ilości z powrotem na tekst ────────────────────────────
// Kolumna „Ilość na 1 porcję" jest tekstowa i trzyma ułamki („1/2"), bo tak
// zapisuje je formularz. parsujIlosc() w apce rozumie i ułamki, i kropkę.
export function formatujIlosc(n) {
  if (!Number.isFinite(n) || n <= 0) return '1'
  const zaokr = Math.round(n * 100) / 100
  if (Number.isInteger(zaokr)) return String(zaokr)

  const calosc = Math.floor(zaokr)
  const reszta = Math.round((zaokr - calosc) * 100) / 100
  const ULAMKI = { 0.25: '1/4', 0.33: '1/3', 0.5: '1/2', 0.67: '2/3', 0.75: '3/4' }
  const ulamek = ULAMKI[reszta]
  if (ulamek) return calosc ? `${calosc} ${ulamek}` : ulamek

  return String(zaokr)
}

// ── Słownik z bazy ────────────────────────────────────────────────
// wiersze: wiersze tabeli `dania` (kolumny „Składnik", „Jednostka")
// meta: wiersze `skladniki_meta` — tylko po wagę sztuki, do przeliczeń
export function budujSlownik(wiersze = [], meta = []) {
  const zebrane = new Map()

  for (const w of wiersze) {
    const surowa = w['Składnik'] ?? w.skladnik
    if (!surowa) continue
    const nazwa = czyscNazwe(surowa)
    const klucz = normalizujNazweMeta(nazwa)
    if (!klucz) continue

    if (!zebrane.has(klucz)) zebrane.set(klucz, { pisownie: new Map(), jednostki: new Map(), ile: 0 })
    const wpis = zebrane.get(klucz)
    wpis.ile++
    wpis.pisownie.set(nazwa, (wpis.pisownie.get(nazwa) || 0) + 1)
    const j = w['Jednostka'] ?? w.jednostka
    if (j && JEDNOSTKI.includes(j)) wpis.jednostki.set(j, (wpis.jednostki.get(j) || 0) + 1)
  }

  const najczestsze = mapa => [...mapa.entries()]
    // Remis rozstrzygamy alfabetycznie, żeby słownik był taki sam przy każdym
    // przebiegu — inaczej prompt zmieniałby się bez powodu i psuł cache.
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'))[0]

  const slownik = new Map()
  for (const [klucz, wpis] of zebrane) {
    const [nazwa] = najczestsze(wpis.pisownie) || []
    if (!nazwa) continue
    const [jednostka, ileTejJednostki] = najczestsze(wpis.jednostki) || []
    const metaWpis = dopasujMeta(nazwa, meta)
    slownik.set(klucz, {
      nazwa,
      jednostka: jednostka || null,
      // Udział dominującej jednostki — przy rozchwianych składnikach
      // (raz g, raz szt) nie przeliczamy nic.
      udzial: ileTejJednostki ? ileTejJednostki / wpis.ile : 0,
      ile: wpis.ile,
      wagaSztuki: wagaSztukiZMeta(metaWpis),
    })
  }
  return slownik
}

// ── Dopasowanie nazwy do słownika ─────────────────────────────────
// Trzy podejścia, od najpewniejszego:
//   1. dokładnie po znormalizowanej nazwie
//   2. po słowach z tolerancją na odmianę — „natki pietruszki" ma trafić na
//      wpis z bazy („natka pietruszki"), a „soli" na „sól"
//   3. po nazwie uproszczonej do produktu ze sklepu — „cebula pokrojona
//      w kostkę" i „cebula" to ten sam towar
//
// Pierwsze dwa są DOKŁADNE: nazwę można podmienić na pisownię ze słownika.
// Trzecie już nie — „sok z cytryny" i „cytryna" upraszczają się do tego
// samego, ale w przepisie to nie to samo. Stamtąd bierzemy więc tylko
// jednostkę, a nazwę zostawiamy taką, jaką napisał model.
const slowa = nazwa => normalizujNazweMeta(nazwa).split(' ').filter(Boolean)

// Dwa słowa znaczą to samo, gdy:
//   - różnią się tylko końcówką („natki" / „natka" → „natk")
//   - albo jedno jest początkiem drugiego, od 3 znaków („sol" w „soli")
// Ucinamy JEDEN znak i tylko przy słowach od 5 liter, żeby „masło" nie
// zrównało się z „maślanką" — to już byłby inny produkt.
const bezKoncowki = w => (w.length >= 5 ? w.slice(0, -1) : w)

function toSamoSlowo(a, b) {
  if (a === b) return true
  if (bezKoncowki(a) === bezKoncowki(b)) return true
  const [krotsze, dluzsze] = a.length <= b.length ? [a, b] : [b, a]
  return krotsze.length >= 3 && dluzsze.startsWith(krotsze)
}

function toSamaNazwa(a, b) {
  if (a.length !== b.length) return false
  return a.every(w => b.some(x => toSamoSlowo(w, x)))
}

function indeksy(slownik) {
  if (!slownik._indeksy) {
    const slowaWpisow = []
    const uproszczone = new Map()
    for (const wpis of slownik.values()) {
      slowaWpisow.push({ wpis, slowa: slowa(wpis.nazwa) })
      const k = normalizujNazweMeta(uproscNazweSkladnika(wpis.nazwa))
      // Przy kolizji wygrywa składnik częstszy w bazie.
      if (k && (!uproszczone.has(k) || uproszczone.get(k).ile < wpis.ile)) uproszczone.set(k, wpis)
    }
    Object.defineProperty(slownik, '_indeksy', { value: { slowaWpisow, uproszczone }, enumerable: false })
  }
  return slownik._indeksy
}

export function dopasujDoSlownika(nazwa, slownik) {
  if (!slownik?.size || !nazwa) return null
  const klucz = normalizujNazweMeta(nazwa)
  if (slownik.has(klucz)) return { wpis: slownik.get(klucz), dokladne: true }

  const { slowaWpisow, uproszczone } = indeksy(slownik)
  const moje = slowa(nazwa)
  let najlepszy = null
  for (const { wpis, slowa: ich } of slowaWpisow) {
    if (!toSamaNazwa(moje, ich)) continue
    if (!najlepszy || najlepszy.ile < wpis.ile) najlepszy = wpis
  }
  if (najlepszy) return { wpis: najlepszy, dokladne: true }

  const poUproszczeniu = uproszczone.get(normalizujNazweMeta(uproscNazweSkladnika(nazwa)))
  if (poUproszczeniu) return { wpis: poUproszczeniu, dokladne: false }

  return null
}

// ── Przeliczenie jednostki na tę ze słownika ──────────────────────
// Tylko „w górę" skali RANGA i tylko gdy przeliczenie da sensowną liczbę.
// Zwraca { ilosc, jednostka } albo null, gdy nie ma czego zmieniać.
export function przeliczNaJednostke(ilosc, zJednostki, naJednostke, wagaSztuki) {
  if (!ilosc || zJednostki === naJednostke) return null
  if (!JEDNOSTKI.includes(naJednostke)) return null
  if ((RANGA[naJednostke] ?? 0) <= (RANGA[zJednostki] ?? 0)) return null

  const zrodlo = naGramy(ilosc, kanonJednostka(zJednostki), wagaSztuki)
  const cel = naGramy(1, kanonJednostka(naJednostke), wagaSztuki)
  if (!zrodlo || !cel) return null

  const nowa = zrodlo / cel
  // Krańcowe wyniki znaczą, że to nie ten sam produkt albo nie ta waga sztuki —
  // wtedy lepiej zostawić to, co podał model.
  const gorny = naJednostke === 'szt' ? 20 : 12
  if (nowa < 0.25 || nowa > gorny) return null

  return { ilosc: Math.round(nowa * 2) / 2, jednostka: naJednostke }
}

// ── Jeden składnik: sprzątnięty i zgodny z bazą ───────────────────
// Zwraca { nazwa, ilosc, jednostka, kategoria } gotowe do zapisu.
export function czyscSkladnik(skladnik, slownik = null) {
  const nazwaCzysta = czyscNazwe(skladnik.nazwa) || (skladnik.nazwa || '').toString().trim()
  let jednostka = JEDNOSTKI.includes(skladnik.jednostka) ? skladnik.jednostka : 'g'

  const { ilosc: liczba, jednostka: zSlowa } = normalizujIlosc(skladnik.ilosc, jednostka)
  if (zSlowa) jednostka = zSlowa
  let ilosc = liczba

  let nazwa = nazwaCzysta
  const trafienie = dopasujDoSlownika(nazwaCzysta, slownik)
  if (trafienie) {
    const { wpis, dokladne } = trafienie
    // Pisownię podmieniamy tylko przy dokładnym trafieniu — patrz komentarz
    // przy dopasujDoSlownika.
    if (dokladne) nazwa = wpis.nazwa
    // Jednostkę ciągniemy ze słownika tylko wtedy, gdy baza jest w tej
    // sprawie zgodna — przy składniku zapisywanym na trzy sposoby nie ma
    // czego naśladować.
    if (wpis.jednostka && wpis.ile >= 3 && wpis.udzial >= 0.7) {
      const przeliczone = przeliczNaJednostke(ilosc, jednostka, wpis.jednostka, wpis.wagaSztuki)
      if (przeliczone) {
        ilosc = przeliczone.ilosc
        jednostka = przeliczone.jednostka
      }
    }
  }

  return {
    nazwa,
    ilosc: formatujIlosc(ilosc),
    jednostka,
    kategoria: skladnik.kategoria,
  }
}

// ── Scalanie powtórek ─────────────────────────────────────────────
// Po sprzątaniu dwa składniki mogą zejść się w jeden („natka pietruszki"
// i „garstka natki pietruszki"). Dwa wiersze o tej samej nazwie w jednym
// daniu wyglądają w apce jak błąd, więc sumujemy je, gdy jednostka ta sama.
export function scalPowtorki(skladniki) {
  const wynik = []
  for (const s of skladniki) {
    const bliznik = wynik.find(w =>
      normalizujNazweMeta(w.nazwa) === normalizujNazweMeta(s.nazwa) && w.jednostka === s.jednostka)
    if (!bliznik) { wynik.push({ ...s }); continue }
    const suma = (parsujIlosc(bliznik.ilosc) || 0) + (parsujIlosc(s.ilosc) || 0)
    bliznik.ilosc = formatujIlosc(suma)
  }
  return wynik
}

// ── Słownik jako blok do promptu ──────────────────────────────────
// Idzie do Claude'a jako blok systemowy z cache'em, więc przy 200 daniach
// płacimy za niego raz, nie 200 razy.
export function tekstSlownika(slownik, { maks = 400, minIle = 2 } = {}) {
  if (!slownik?.size) return ''
  const wpisy = [...slownik.values()]
    .filter(w => w.ile >= minIle && w.jednostka)
    .sort((a, b) => b.ile - a.ile || a.nazwa.localeCompare(b.nazwa, 'pl'))
    .slice(0, maks)
  if (!wpisy.length) return ''

  return 'SŁOWNIK SKŁADNIKÓW — tak te produkty są już nazwane w bazie przepisów.\n' +
    'Jeśli dany składnik jest na liście, użyj DOKŁADNIE tej nazwy i tej jednostki.\n' +
    'Nie dopisuj do niej odmian, zdrobnień ani stanu przygotowania. Składnika,\n' +
    'którego tu nie ma, nazwij po swojemu — zgodnie z zasadami nazw niżej.\n\n' +
    wpisy.map(w => `${w.nazwa} — ${w.jednostka}`).join('\n')
}
