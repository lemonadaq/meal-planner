// promocjeMatch.js
// Dopasowanie promocji (tabela `promocje`) do pozycji listy zakupów. MVP w JS:
// exact match + token overlap; świadomie akceptujemy false-negatives (lepiej nie
// pokazać promocji niż pokazać błędną). Fuzzy pg_trgm przez RPC — później.

import { supabase } from './supabase'
import { dzisLocal } from './dataHelpers'

// Słowa pomijane przy tokenizacji — nie rozróżniają produktu.
const STOP_WORDS = new Set([
  'świeży', 'świeża', 'świeże', 'świeżą',
  'ekstra', 'extra', 'premium', 'klasyczny', 'klasyczna', 'klasyczne',
  'naturalny', 'naturalna', 'naturalne',
  'polski', 'polska', 'polskie',
  'luz', 'luzem', 'ok', 'około', 'typu',
])

// Token „gramaturowy" — liczby, jednostki, procenty: `200`, `g`, `0,5l`, `82%`, `x4`
const GRAMATURA_RGX = /^(\d+([,.]\d+)?(g|kg|ml|l|szt|%)?|g|kg|ml|l|szt|sztuk|opak|x\d+)$/

// lower + trim + pojedyncze spacje; polskie znaki ZOSTAJĄ (spójne z nazwa_norm w bazie)
export function normalizujNazwePromo(nazwa = '') {
  return nazwa.toString().toLowerCase().replace(/\s+/g, ' ').trim()
}

// Myślnik też rozdziela: Blix pisze „marchew-banan-jabłko" jednym ciągiem,
// a bez rozbicia to jeden nierozpoznawalny token.
export function tokenizuj(nazwa) {
  return normalizujNazwePromo(nazwa)
    .split(/[\s,()/-]+/)
    .filter(tok => tok.length > 1 && !STOP_WORDS.has(tok) && !GRAMATURA_RGX.test(tok))
}

// Końcówki od najdłuższych — inaczej „owa" zjadłoby się jako „a".
// „ce" i „cy" są tu po to, żeby „puszce" dawało ten sam rdzeń co „puszki";
// bez nich wychodziło „puszc" kontra „pusz" i słowo nie zgadzało się samo ze sobą.
const KONCOWKI = [
  'iego', 'ego', 'iej', 'ich', 'ymi', 'imi', 'ami', 'ach', 'owe', 'owa', 'owy',
  'ce', 'cy', 'ka', 'ki', 'ek', 'em', 'om', 'ow', 'ie', 'ia', 'iu',
  'y', 'a', 'e', 'i', 'u', 'ą', 'ę', 'o',
]

// Słowa opisujące formę, a nie produkt. Blix ich w nazwach nie używa („Pomidory
// krojone", nie „Pomidory w puszce"), więc wymaganie ich zabijało dopasowanie:
// „pomidory" jest w 30 ofertach, „puszce" w 8, ale nigdy razem.
//
// Nie są USUWANE, tylko przestają być obowiązkowe: produkt, który je ma,
// nadal wypada lepiej w punktacji celności. Dzięki temu „fasola z puszki"
// woli fasolę konserwową od świeżej, jeśli obie są w ofercie.
const SLOWA_OPCJONALNE = new Set([
  'puszka', 'puszce', 'puszki', 'puszkach', 'puszkę',
  'słoik', 'słoiku', 'słoika', 'słoiki',
  'opakowanie', 'opakowaniu', 'butelce', 'butelka',
])

// Zgrubny rdzeń polskiego słowa: bez ogonków i bez końcówki fleksyjnej.
// Nie jest to poprawny lematyzator i nie musi być — ma tylko skleić „pierś"
// z „piersi", „koper" z „koperek" i „marchewka" z „marchew". Rdzeń nigdy nie
// schodzi poniżej 4 znaków, żeby krótkie słowa nie zlewały się w kaszę.
export function rdzen(token) {
  const bezOgonkow = String(token ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')

  if (bezOgonkow.length <= 4) return bezOgonkow

  for (const koncowka of KONCOWKI) {
    const k = koncowka.normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (bezOgonkow.length - k.length >= 4 && bezOgonkow.endsWith(k)) {
      return bezOgonkow.slice(0, bezOgonkow.length - k.length)
    }
  }

  return bezOgonkow
}

// Trafienie w słowo opisujące formę jest mocną przesłanką, że to ten produkt,
// więc waży więcej niż jedno nadmiarowe słowo w nazwie. Bez tego „Pomidory"
// (zero nadmiaru) biłyby „Pomidory w puszce Pudliszki" (nadmiar 1) i opcjonalne
// słowa nie dawałyby nic poza zdjęciem wymogu.
const PREMIA_ZA_FORME = 2

// Punktacja dopasowania — NIŻSZA znaczy celniejsze. Liczy słowa nazwy produktu
// bez odpowiednika w składniku i odejmuje premię za trafione słowa formy.
// „Cebula żółta" dostaje 1, „Chipsy ziemniaczane cebulka Wiejska" — 3.
// To ta liczba decyduje o wyborze oferty, nie cena: wybieranie najtańszej
// podstawiało chipsy zamiast masła.
export function punktacjaDopasowania(tokenyProduktu, tokenySkladnika) {
  const rdzenieSkladnika = new Set(tokenySkladnika.map(rdzen))
  const rdzenieProduktu = new Set(tokenyProduktu.map(rdzen))

  const nadmiar = tokenyProduktu.filter(t => !rdzenieSkladnika.has(rdzen(t))).length
  const trafioneFormy = tokenySkladnika
    .filter(t => SLOWA_OPCJONALNE.has(t) && rdzenieProduktu.has(rdzen(t)))
    .length

  return nadmiar - PREMIA_ZA_FORME * trafioneFormy
}

// Słowa-transformacje: jeśli promo je zawiera a składnik nie → inny produkt.
// Marka/jakość (Mlekowita, UHT, Extra) NIE wyklucza — zmienia tylko wariant.
const TRANSFORM_WORDS = new Set([
  'prażona', 'prażony', 'prażone',
  'smażona', 'smażony', 'smażone',
  'konserwowa', 'konserwowy', 'konserwowe', 'konserwowany', 'konserwowana',
  'marynowana', 'marynowany', 'marynowane',
  'suszona', 'suszony', 'suszone',
  'kiszona', 'kiszony', 'kiszone',
  'mielona', 'mielony', 'mielone',
  'wędzona', 'wędzony', 'wędzone',
  'pieczona', 'pieczony', 'pieczone',
  'duszona', 'duszony', 'duszone',
  'liofilizowana', 'liofilizowany', 'liofilizowane',
])

// Promo zawiera słowo-transformację, którego nie ma w tokenacha składnika →
// to inny produkt, nawet jeśli bazowe słowo się zgadza (cebula ≠ cebula prażona).
function maZakazanaTransformacje(p, zbiorTokenowItemu) {
  return p.tokeny.some(t => TRANSFORM_WORDS.has(t) && !zbiorTokenowItemu.has(t))
}

// Czy wszystkie tokeny `a` występują w tokenach `b`? Porównanie po rdzeniach,
// więc „pierś z kurczaka" trafia w „Filet z piersi kurczaka". Słowa opisujące
// formę (`w puszce`) są pomijane przy sprawdzaniu — punktuje je dopiero
// `punktacjaDopasowania`.
export function zawieraWszystkie(a, b) {
  const wymagane = a.filter(tok => !SLOWA_OPCJONALNE.has(tok))
  if (!wymagane.length) return false
  const zbiorB = new Set(b.map(rdzen))
  return wymagane.every(tok => zbiorB.has(rdzen(tok)))
}

// Human-readable „do kiedy": dziś! / do jutra / do niedzieli / do DD.MM
export function etykietaWazneDo(wazneDo) {
  const dzis = dzisLocal()
  if (wazneDo === dzis) return 'dziś!'

  const d = new Date(wazneDo + 'T12:00:00')
  const dzisD = new Date(dzis + 'T12:00:00')
  const diffDni = Math.round((d - dzisD) / (24 * 60 * 60 * 1000))
  if (diffDni === 1) return 'do jutra'

  // „do niedzieli" gdy promocja kończy się w najbliższą niedzielę (w tym tygodniu)
  if (d.getDay() === 0 && diffDni > 0 && diffDni <= 6) return 'do niedzieli'

  return `do ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Zamień rekord z tabeli `promocje` na obiekt item.promo (format z Promocje.jsx)
function promoZRekordu(p) {
  const old = p.cena_stara != null ? +p.cena_stara : null
  const now = +p.cena_nowa
  let off = p.rabat_label
  if (!off && old != null && old > now) {
    off = `-${Math.round((1 - now / old) * 100)}%`
  }
  return {
    store: p.sklep,
    old,
    now,
    off: off || '',
    until: etykietaWazneDo(p.wazne_do),
  }
}

// Główna funkcja: itemy listy + rekordy promocje → itemy z dopisanym item.promo|null.
// Matching:
//   1. exact: nazwa_norm === znormalizowany skladnik
//   2. token overlap: tokeny składnika ⊆ tokeny promo LUB odwrotnie
//   3. kilka dopasowań → najtańsza cena_nowa
export function dopasujPromocje(items, promocje) {
  if (!promocje?.length) return items

  const przygotowane = promocje
    .filter(p => p.cena_nowa != null)
    .map(p => ({
      rekord: p,
      norm: normalizujNazwePromo(p.nazwa_norm || p.nazwa),
      tokeny: tokenizuj(p.nazwa_norm || p.nazwa),
    }))

  return items.map(item => {
    const norm = normalizujNazwePromo(item.skladnik)
    if (!norm) return { ...item, promo: null, promos: [] }
    const tokenyItemu = tokenizuj(item.skladnik)

    const zbiorTokenowItemu = new Set(tokenyItemu)
    const pasujace = przygotowane.filter(p => {
      // Promo z "prażona", "wędzona" itp. kiedy składnik jej nie ma → inny produkt
      if (maZakazanaTransformacje(p, zbiorTokenowItemu)) return false
      return (
        p.norm === norm ||
        zawieraWszystkie(tokenyItemu, p.tokeny) ||  // składnik ⊆ promo (promo bardziej szczegółowa)
        zawieraWszystkie(p.tokeny, tokenyItemu)      // promo ⊆ składnik (promo ogólniejsza)
      )
    })
    if (!pasujace.length) return { ...item, promo: null, promos: [] }

    // Najlepiej pasująca oferta per sklep — decyduje celność nazwy, dopiero
    // przy remisie cena. Reguła „najtańsza wygrywa" podstawiała chipsy
    // o smaku cebulki zamiast cebuli, bo śmieć bywa tańszy od produktu.
    const perSklep = new Map()
    for (const p of pasujace) {
      const sklep = p.rekord.sklep
      const stary = perSklep.get(sklep)
      const punkty = punktacjaDopasowania(p.tokeny, tokenyItemu)

      if (!stary ||
          punkty < stary.punkty ||
          (punkty === stary.punkty && +p.rekord.cena_nowa < +stary.rekord.cena_nowa)) {
        perSklep.set(sklep, { ...p, punkty })
      }
    }

    const promos = [...perSklep.values()]
      .map(p => promoZRekordu(p.rekord))
      .sort((a, b) => a.now - b.now)

    return { ...item, promo: promos[0], promos }
  })
}

// ── Cache promocji w localStorage ─────────────────────────────────
// Scraper (`promo-daily`) odświeża tabelę raz na dobę, więc trzymanie wyniku
// przez kilka godzin niczego nie psuje, a drugie wejście w listę jest
// natychmiastowe. Cache leci do kosza razem ze zmianą dnia — inaczej
// etykiety „do kiedy" pokazywałyby wczorajsze „dziś!".
const CACHE_KLUCZ = 'promocje_cache'
const CACHE_WAZNOSC_MS = 6 * 60 * 60 * 1000

function zCache() {
  try {
    const surowe = localStorage.getItem(CACHE_KLUCZ)
    if (!surowe) return null
    const { zapisano, dzien, promocje } = JSON.parse(surowe)
    if (dzien !== dzisLocal()) return null
    if (!zapisano || Date.now() - zapisano > CACHE_WAZNOSC_MS) return null
    return Array.isArray(promocje) ? promocje : null
  } catch {
    return null
  }
}

function doCache(promocje) {
  try {
    localStorage.setItem(CACHE_KLUCZ, JSON.stringify({
      zapisano: Date.now(),
      dzien: dzisLocal(),
      promocje,
    }))
  } catch {
    // pełny localStorage nie ma prawa wywalić listy zakupów
  }
}

const STRONA_PROMO = 1000
const KOLUMNY_PROMO = 'product_name, price, old_price, store_name, offer_end_at'

function stronaPromocji(teraz, numer) {
  return supabase
    .from('promo_offers')
    .select(KOLUMNY_PROMO)
    .gte('offer_end_at', teraz)
    .range(numer * STRONA_PROMO, numer * STRONA_PROMO + STRONA_PROMO - 1)
}

// Ile jest wierszy — tylko po to, żeby wiedzieć ile stron pobrać naraz.
// Zwraca null, gdy licznik nie zadziałał; wtedy wołający schodzi na pętlę.
async function policzPromocje(teraz) {
  const { count, error } = await supabase
    .from('promo_offers')
    .select('product_name', { count: 'exact', head: true })
    .gte('offer_end_at', teraz)

  return error || typeof count !== 'number' ? null : count
}

// Pętla strona po stronie — wolniejsza, ale nie zależy od licznika.
async function promocjeSekwencyjnie(teraz) {
  const wszystkie = []

  for (let i = 0; ; i++) {
    const { data, error } = await stronaPromocji(teraz, i)
    if (error || !data?.length) return { wiersze: wszystkie, pelne: !error }
    wszystkie.push(...data)
    if (data.length < STRONA_PROMO) return { wiersze: wszystkie, pelne: true }
  }
}

// Wszystkie strony naraz — jedna runda zamiast N, gdy znamy liczbę wierszy.
async function promocjeRownolegle(teraz, count) {
  const wyniki = await Promise.all(
    Array.from({ length: Math.ceil(count / STRONA_PROMO) }, (_, i) => stronaPromocji(teraz, i))
  )

  let pelne = true
  const wiersze = []
  for (const { data, error } of wyniki) {
    if (error) { pelne = false; continue }
    wiersze.push(...(data || []))
  }

  return { wiersze, pelne }
}

// Fetch aktualnych promocji (wazne_do >= dziś). Zwraca [] przy błędzie —
// promocje to wzmocnienie, nigdy blokada listy (np. tabela jeszcze nie istnieje).
//
// Licznik jest WYŁĄCZNIE podpowiedzią, ile stron pobrać równolegle. Gdy nie
// odda liczby — HEAD nie zawsze niesie Content-Range przez proxy i cache — lecimy
// pętlą. Wcześniej brak licznika kończył się pustą listą, czyli znikały wszystkie
// promocje mimo danych w bazie. Wolne promocje biją brak promocji.
export async function pobierzAktualnePromocje() {
  const zapisane = zCache()
  if (zapisane?.length) return zapisane

  try {
    const teraz = new Date().toISOString()
    const count = await policzPromocje(teraz)

    const { wiersze, pelne } = count
      ? await promocjeRownolegle(teraz, count)
      : await promocjeSekwencyjnie(teraz)

    const promocje = wiersze.map(p => ({
      nazwa_norm: p.product_name,
      nazwa: p.product_name,
      cena_nowa: p.price,
      cena_stara: p.old_price,
      sklep: p.store_name,
      wazne_do: p.offer_end_at ? p.offer_end_at.substring(0, 10) : null,
      rabat_label: null,
    }))

    // Pustki nie cache'ujemy — inaczej jedna nieudana runda gasi promocje
    // na kolejne 6 godzin, a to dokładnie ten błąd, który tu naprawiamy.
    if (pelne && promocje.length) doCache(promocje)
    return promocje
  } catch {
    return []
  }
}
