// import-dan.js
// Walidacja dań wpisanych RĘCZNIE do plików JSON (skrypty/dania/*.json).
//
// Po co tryb `import`: generowanie przepisów wymaga kredytów na Anthropic.
// Gdy ich nie ma, przepis może napisać człowiek albo Claude w rozmowie,
// a skrypt ma go tylko wstawić do bazy i dorobić zdjęcie na Replicate.
// Zdjęcia i baza chodzą na osobnych kluczach, więc działają niezależnie.
//
// Walidacja jest tu po to, żeby literówka w `rodzaj` albo brakująca kategoria
// zatrzymały przebieg PRZED zapisem, a nie wylądowały w bazie i zniknęły
// z filtrów w apce. Format pliku jest 1:1 z tym, co zwraca Claude w trybie
// `auto` (SCHEMAT_PRZEPISU w wspolne.js) — żeby jedno dało się podmienić
// drugim bez przepisywania czegokolwiek.

import { RODZAJE, KUCHNIE, POZIOMY, KATEGORIE } from './wspolne.js'

const JEDNOSTKI = ['g', 'ml', 'szt', 'łyżka', 'łyżeczka', 'szczypta']

// Zwraca listę błędów — pusta znaczy „danie w porządku".
export function sprawdzDanie(danie, gdzie = '') {
  const bledy = []
  const zle = powod => bledy.push(`${gdzie}${danie?.nazwa ? `„${danie.nazwa}"` : '(bez nazwy)'}: ${powod}`)

  if (!danie || typeof danie !== 'object') return [`${gdzie}wpis nie jest obiektem`]
  if (!danie.nazwa?.trim()) zle('brak nazwy')
  if (!RODZAJE.includes(danie.rodzaj)) zle(`rodzaj "${danie.rodzaj}" poza listą (${RODZAJE.join(', ')})`)
  if (danie.kuchnia && !KUCHNIE.includes(danie.kuchnia)) zle(`kuchnia "${danie.kuchnia}" poza listą`)
  if (danie.poziom && !POZIOMY.includes(danie.poziom)) zle(`poziom "${danie.poziom}" poza listą`)

  for (const pole of ['czas_minuty', 'kcal']) {
    const v = danie[pole]
    if (v != null && (!Number.isFinite(v) || v <= 0)) zle(`${pole} musi być liczbą dodatnią`)
  }

  if (!Array.isArray(danie.skladniki) || danie.skladniki.length < 2) {
    zle('potrzebne są co najmniej 2 składniki')
  } else {
    for (const s of danie.skladniki) {
      if (!s?.nazwa?.trim()) zle('składnik bez nazwy')
      // `ilosc` czyści potem slownik.js, więc tu wystarczy, że jest.
      if (s?.ilosc == null || s.ilosc === '') zle(`składnik „${s?.nazwa}" bez ilości`)
      if (!JEDNOSTKI.includes(s?.jednostka)) zle(`składnik „${s?.nazwa}": jednostka "${s?.jednostka}" poza listą`)
      if (!KATEGORIE.includes(s?.kategoria)) zle(`składnik „${s?.nazwa}": kategoria "${s?.kategoria}" poza listą`)
    }
  }

  if (!Array.isArray(danie.kroki) || danie.kroki.length < 2) zle('potrzebne są co najmniej 2 kroki')
  else if (danie.kroki.some(k => !k?.trim())) zle('pusty krok')

  // Bez opisu wyglądu zdjęcie powstałoby z samej nazwy — a po to jest ten
  // tryb, żeby nie dzwonić po opis do Claude'a.
  if (!danie.opis_wizualny?.trim()) zle('brak opis_wizualny (po angielsku, do promptu zdjęcia)')

  return bledy
}

// Plik → lista dań w formacie, który rozumie potok.js:
// { nazwa, rodzaj, przepis } — `przepis` jest tym, co w trybie `auto`
// zwraca Claude, więc dalsza droga jest identyczna.
export function wczytajPlik(tekst, nazwaPliku = '') {
  let dane
  try {
    dane = JSON.parse(tekst)
  } catch (e) {
    throw new Error(`${nazwaPliku}: zły JSON — ${e.message}`, { cause: e })
  }
  const lista = Array.isArray(dane) ? dane : dane?.dania
  if (!Array.isArray(lista)) {
    throw new Error(`${nazwaPliku}: plik ma być tablicą dań albo obiektem z polem "dania"`)
  }

  const bledy = lista.flatMap((d, i) => sprawdzDanie(d, `${nazwaPliku}[${i}] `))
  if (bledy.length) throw new Error(`${nazwaPliku}: ${bledy.length} błędów\n  ` + bledy.join('\n  '))

  return lista.map(d => ({
    nazwa: d.nazwa.trim(),
    rodzaj: d.rodzaj,
    przepis: {
      czas_minuty: d.czas_minuty ?? null,
      kcal: d.kcal ?? null,
      kuchnia: d.kuchnia ?? null,
      poziom: d.poziom ?? null,
      skladniki: d.skladniki,
      kroki: d.kroki,
      opis_wizualny: d.opis_wizualny,
    },
  }))
}
