// podobienstwo.js
// Porównywanie NAZW dań — czy dwie nazwy to pewnie to samo danie.
// Wydzielone z duble.mjs, bo tej samej miary potrzebuje tryb `auto`:
// model proponuje nowe dania, a my musimy odsiać te, które w bazie już są
// pod trochę inną nazwą („Schabowy z kapustą" kontra „Kotlet schabowy
// z kapustą zasmażaną").
//
// JAK TO DZIAŁA: nazwa → zbiór znaczących słów (bez „z", „i", „na"...),
// każde skrócone do 5 znaków bez ogonków, żeby „serem" i „ser" albo
// „naleśniki" i „naleśnik" wpadły w to samo. Potem dwa testy:
//   1. zawieranie — wszystkie słowa krótszej nazwy są w dłuższej
//   2. podobieństwo Jaccarda — ile słów wspólnych do wszystkich
//
// OGRANICZENIE: porównywane są NAZWY, nie składniki. Dwa dania o zupełnie
// różnych nazwach i identycznym przepisie tu nie wyjdą.

export const STOP = new Set([
  'z', 'ze', 'i', 'w', 'we', 'na', 'do', 'po', 'od', 'a', 'o', 'bez', 'pod', 'nad', 'jak',
])

export const rdzen = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ł/g, 'l').replace(/[^a-z0-9]/g, '').slice(0, 5)

export const tokeny = nazwa => new Set(
  nazwa.toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter(w => w && !STOP.has(w)).map(rdzen).filter(Boolean))

export const podzbior = (a, b) => [...a].every(x => b.has(x))

export function jaccard(a, b) {
  let wspolne = 0
  for (const x of a) if (b.has(x)) wspolne++
  return wspolne / (a.size + b.size - wspolne)
}

// Klucz do porównania nazw „na pewno ta sama nazwa" — wielkość liter,
// ogonki i interpunkcja nie mają znaczenia.
export const kluczDokladny = nazwa => nazwa.toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
  .replace(/[^a-z0-9]+/g, ' ').trim()

// Czy `nazwa` to prawdopodobnie któreś z dań, które już są?
// `istniejace` to tablica nazw ALBO gotowych wpisów { nazwa, t } z indeksu.
// Zwraca nazwę kolidującego dania albo null.
export function znajdzKolizje(nazwa, istniejace, prog = 0.6) {
  const t = tokeny(nazwa)
  const klucz = kluczDokladny(nazwa)
  for (const wpis of istniejace) {
    const inna = typeof wpis === 'string' ? wpis : wpis.nazwa
    if (!inna) continue
    if (kluczDokladny(inna) === klucz) return inna
    const ti = typeof wpis === 'string' ? tokeny(inna) : (wpis.t || tokeny(inna))

    // Krótsza nazwa musi mieć min. 2 znaczące słowa — inaczej jednowyrazowe
    // dania („Pieczarkowa") są podzbiorem wszystkiego, co ma ten składnik.
    const krotsza = t.size < ti.size ? t : ti
    const dluzsza = t.size < ti.size ? ti : t
    if (krotsza.size >= 2 && krotsza.size < dluzsza.size && podzbior(krotsza, dluzsza)) return inna
    if (jaccard(t, ti) >= prog) return inna
  }
  return null
}

// Indeks do wielokrotnego porównywania — tokeny liczone raz.
export const zbudujIndeks = nazwy => nazwy.filter(Boolean).map(nazwa => ({ nazwa, t: tokeny(nazwa) }))
