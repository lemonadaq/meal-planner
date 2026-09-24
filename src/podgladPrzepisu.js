// Czysta logika podglądu przepisu — bez Reacta, żeby dała się przetestować
// i żeby komponent obok został samym rysowaniem.

import { KUCHNIA_LABEL, POZIOM_LABEL, RODZAJ_LABEL } from './etykiety'

// Chipy meta pod tytułem. Pole TYP („z dodatkiem" / „samodzielne") NIE jest
// tu pokazywane — to informacja techniczna dla logiki planowania dodatków,
// dokładnie jak w pełnym widoku przepisu.
export function chipyPodgladu(wiersz) {
  if (!wiersz) return []
  const chipy = []
  if (RODZAJ_LABEL[wiersz.rodzaj]) chipy.push(RODZAJ_LABEL[wiersz.rodzaj])
  if (KUCHNIA_LABEL[wiersz.kuchnia]) chipy.push(KUCHNIA_LABEL[wiersz.kuchnia])
  if (POZIOM_LABEL[wiersz.poziom]) chipy.push(POZIOM_LABEL[wiersz.poziom])
  if (wiersz.czas_minuty) chipy.push(`${wiersz.czas_minuty} min`)
  if (wiersz.kcal) chipy.push(`${wiersz.kcal} kcal`)
  return chipy
}

// Przepis leży w bazie jako jeden tekst z numeracją („1. Pokrój…").
// Numery rysujemy sami, więc te z tekstu zdejmujemy — inaczej wychodzi „1. 1.".
export function krokiPrzepisu(tekst) {
  if (!tekst) return []
  return tekst
    .split('\n')
    .map(k => k.replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean)
}

// Składniki grupowane po kategorii; z prefiksu „3_Nabiał" zostaje „Nabiał".
// Wiersze bez nazwy składnika lecą za burtę — `dania` trzyma metadane dania
// w każdym wierszu, więc zdarza się wiersz istniejący tylko dla przepisu.
export function grupujSkladniki(wiersze) {
  const grupy = new Map()
  for (const w of wiersze || []) {
    const nazwa = w?.['Składnik']
    if (!nazwa) continue
    const kat = (w['Kategoria'] || '8_Inne').replace(/^\d_/, '')
    if (!grupy.has(kat)) grupy.set(kat, [])
    grupy.get(kat).push(w)
  }
  return [...grupy.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pl'))
}

// „200 g", albo sama jednostka gdy ilości nie ma („do smaku").
export function iloscTekst(wiersz) {
  const ilosc = wiersz?.['Ilość na 1 porcję']
  const jednostka = wiersz?.['Jednostka'] || ''
  if (!ilosc || ilosc === '-') return jednostka
  return `${ilosc} ${jednostka}`.trim()
}
