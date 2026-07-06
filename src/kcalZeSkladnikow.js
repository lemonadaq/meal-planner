// Liczenie kalorii dania ze składników: ilość × kcal_100g z tabeli skladniki_meta.
// Używane jako PODPOWIEDŹ przy dodawaniu/edycji dania — zapisana wartość
// (dania.kcal) zawsze wygrywa, bo user może ją ręcznie skorygować.

import { dopasujMeta, kanonJednostka, naGramy, wagaSztukiZMeta, parsujIlosc } from './jednostki'

// Ile z tłuszczu do smażenia realnie zostaje w daniu (reszta w patelni/fryturze).
const WCHLANIANIE_TLUSZCZU = 0.35
const TLUSZCZ_RGX = /olej|oliwa|smalec|frytura|tłuszcz|tluszcz/i
const DO_SMAZENIA_RGX = /do smażenia|do smazenia|do frytury|do głębokiego|do glebokiego/i

// Policz kcal 1 porcji ze składników.
// skladniki: [{ nazwa, ilosc, jednostka }] — ilości NA 1 PORCJĘ (jak w tabeli dania)
// wszystkieMeta: wiersze skladniki_meta (z kolumną kcal_100g)
// Zwraca { kcal, policzone, braki } — braki to składniki pominięte (bez meta,
// bez kcal_100g albo z nieprzeliczalną ilością). kcal=null gdy nic nie policzono.
export function kcalZeSkladnikow(skladniki, wszystkieMeta) {
  let suma = 0
  let policzone = 0
  const braki = []

  for (const sk of skladniki || []) {
    const nazwa = (sk.nazwa || '').trim()
    if (!nazwa) continue

    const ilosc = parsujIlosc(sk.ilosc)
    // „- do smaku", pusta ilość — pomijamy bez liczenia jako brak (to głównie przyprawy)
    if (ilosc == null || ilosc <= 0) continue

    const meta = dopasujMeta(nazwa, wszystkieMeta)
    const kcal100 = meta ? parseFloat(meta.kcal_100g) : NaN
    if (!Number.isFinite(kcal100) || kcal100 < 0) {
      braki.push(nazwa)
      continue
    }

    const gramy = naGramy(ilosc, kanonJednostka(sk.jednostka), wagaSztukiZMeta(meta))
    if (gramy == null) {
      braki.push(nazwa)
      continue
    }

    let kcal = gramy * kcal100 / 100
    // Tłuszcz do smażenia: danie wchłania tylko część
    if (TLUSZCZ_RGX.test(nazwa) && DO_SMAZENIA_RGX.test(nazwa)) kcal *= WCHLANIANIE_TLUSZCZU

    suma += kcal
    policzone++
  }

  if (policzone === 0) return { kcal: null, policzone: 0, braki }
  return { kcal: Math.round(suma / 10) * 10, policzone, braki }
}

// Etykieta podpowiedzi do UI, np. "≈ 540 kcal/porcję" + info o brakach.
export function etykietaKcal(wynik) {
  if (!wynik || wynik.kcal == null) return null
  let tekst = `≈ ${wynik.kcal} kcal/porcję`
  if (wynik.braki.length > 0) tekst += ` (bez: ${wynik.braki.slice(0, 3).join(', ')}${wynik.braki.length > 3 ? '…' : ''})`
  return tekst
}
