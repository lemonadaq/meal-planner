// Liczenie kalorii dania ze składników: ilość × kcal_100g z tabeli skladniki_meta.
// Używane jako PODPOWIEDŹ przy dodawaniu/edycji dania — zapisana wartość
// (dania.kcal) zawsze wygrywa, bo user może ją ręcznie skorygować.
//
// Ten sam kod liczy kcal wszystkich dań w skrypcie czyszczenia bazy
// (skrypty/czyszczenie/faza3_kcal.mjs), więc podpowiedź w formularzu i wartość
// w bazie wychodzą z jednego wzoru.

import { dopasujMeta, kanonJednostka, naGramy, wagaSztukiZMeta, parsujIlosc } from './jednostki.js'

// ── Tłuszcz do smażenia ──
// W daniu zostaje tylko część tłuszczu z patelni. Przy płytkim smażeniu
// (składnik nazwany „do smażenia") ok. 35%, w głębokim tłuszczu — gdy porcja
// ma co najmniej ~50 ml tłuszczu (arancini: 200 ml) — ok. 10%.
const WCHLANIANIE_TLUSZCZU = 0.35
const WCHLANIANIE_GLEBOKI = 0.10
const GLEBOKI_TLUSZCZ_G = 45
const TLUSZCZ_RGX = /olej|oliwa|smalec|frytura|tłuszcz|tluszcz/i
const DO_SMAZENIA_RGX = /do smażenia|do smazenia|do frytury|do głębokiego|do glebokiego/i

// ── Gramy w łyżce (15 ml) ──
// Łyżka i łyżeczka w przepisie to objętość, a kcal_100g jest na wagę. Domyślnie
// 15 g (gęstość wody); dla produktów wyraźnie lżejszych albo cięższych —
// wartość z tabeli. Łyżeczka = 1/3 łyżki. Kolejność ma znaczenie: pierwsze
// dopasowanie wygrywa („masło orzechowe" przed „masło").
const LYZKA_DOMYSLNIE_G = 15
export const G_NA_LYZKE = [
  [/olej|oliwa|smalec|masło klarowane|maslo klarowane/i, 13.5],
  [/masło orzechowe|maslo orzechowe/i, 16],
  [/masło|maslo/i, 14],
  [/cukier puder/i, 8],
  [/cukier wanili/i, 12],
  [/cukier/i, 13],
  [/miód|miod|syrop|dżem|dzem|konfitur|marmolad/i, 20],
  [/mąka|maka|skrobia|kasza manna|polenta|budyń|budyn/i, 10],
  [/bułka tarta|bulka tarta|rodzynk|żurawin|zurawin/i, 9],
  [/orzech|orzesz|sezam|pestki|nasiona|migdał|migdal|siemię|siemie|słonecznik|slonecznik|pistacj/i, 9],
  [/kakao|panko|wiórki|wiorki|płatki owsiane|platki owsiane|musli|granola|parmezan|pecorino/i, 6],
  [/natka|koperek|szczypior|kolendr|bazyli.*świeża|bazylia swieza|mięta świeża|mieta swieza|szałwia świeża/i, 3],
  // Przyprawy suszone — łyżeczka ≈ 2,3 g
  [/papryka (słodka|slodka|ostra|wędzona|wedzona)|pieprz|cynamon|kumin|kminek|kurkuma|curry|oregano|majeranek|tymianek|garam|chili w proszku|gałka|galka|imbir mielony|czosnek granulowany|przyprawa|zioła|ziola|gochugaru|płatki chili|platki chili|bazylia suszona|rozmaryn suszony/i, 7],
]

export function gNaLyzke(nazwa = '') {
  const t = G_NA_LYZKE.find(([rgx]) => rgx.test(nazwa))
  return t ? t[1] : LYZKA_DOMYSLNIE_G
}

// Gęstość (g/ml) — tylko tam, gdzie odbiega od wody na tyle, żeby było widać w kcal.
function gestosc(nazwa) {
  if (/olej|oliwa|smalec/i.test(nazwa)) return 0.92
  if (/miód|miod|syrop/i.test(nazwa)) return 1.4
  return 1
}

// Rzeczy, które mają 0 kcal i nie mają trafiać do „braków".
const ZERO_RGX = /^(sól|sol|woda|lód|lod|kostki lodu|wykałaczki|wykalaczki)(\s|$)/i

// Ilość z przepisu. Jak parsujIlosc, plus zakres „2-3" → średnia 2,5.
export function iloscDoKcal(raw) {
  if (raw == null) return null
  const s = raw.toString().trim()
  const zakres = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/)
  if (zakres) return (parsujIlosc(zakres[1]) + parsujIlosc(zakres[2])) / 2
  return parsujIlosc(s)
}

// Gramy jednej pozycji (null = nie da się przeliczyć).
export function gramySkladnika(nazwa, ilosc, jednostka, meta) {
  const j = kanonJednostka(jednostka)
  if (j === 'lyzka') return ilosc * gNaLyzke(nazwa)
  if (j === 'lyzeczka') return ilosc * gNaLyzke(nazwa) / 3
  if (j === 'ml' || j === 'l') return naGramy(ilosc, j, null) * gestosc(nazwa)
  return naGramy(ilosc, j, wagaSztukiZMeta(meta))
}

// Policz kcal 1 porcji ze składników.
// skladniki: [{ nazwa, ilosc, jednostka }] — ilości NA 1 PORCJĘ (jak w tabeli dania)
// wszystkieMeta: wiersze skladniki_meta (z kolumną kcal_100g)
// Zwraca { kcal, policzone, braki, pozycje } — braki to składniki pominięte (bez
// meta, bez kcal_100g albo z nieprzeliczalną ilością); pozycje to [{nazwa, kcal}]
// policzonych składników (do raportu „co tu waży najwięcej"). kcal=null gdy nic
// nie policzono.
export function kcalZeSkladnikow(skladniki, wszystkieMeta) {
  let suma = 0
  let policzone = 0
  const braki = []
  const pozycje = []

  for (const sk of skladniki || []) {
    const nazwa = (sk.nazwa || '').trim()
    if (!nazwa) continue

    const ilosc = iloscDoKcal(sk.ilosc)
    // „- do smaku", pusta ilość — pomijamy bez liczenia jako brak (to głównie przyprawy)
    if (ilosc == null || ilosc <= 0) continue
    // Szczypta czegokolwiek to pomijalne kalorie; „2 do smaku" to też przyprawa
    const jk = kanonJednostka(sk.jednostka)
    if (jk === 'szczypta' || jk === 'do smaku') continue
    if (ZERO_RGX.test(nazwa)) continue

    const meta = dopasujMeta(nazwa, wszystkieMeta)
    const kcal100 = meta ? parseFloat(meta.kcal_100g) : NaN
    if (!Number.isFinite(kcal100) || kcal100 < 0) {
      braki.push(nazwa)
      continue
    }

    const gramy = gramySkladnika(nazwa, ilosc, sk.jednostka, meta)
    if (gramy == null) {
      braki.push(nazwa)
      continue
    }

    let kcal = gramy * kcal100 / 100
    if (TLUSZCZ_RGX.test(nazwa)) {
      if (gramy >= GLEBOKI_TLUSZCZ_G) kcal *= WCHLANIANIE_GLEBOKI
      else if (DO_SMAZENIA_RGX.test(nazwa)) kcal *= WCHLANIANIE_TLUSZCZU
    }

    suma += kcal
    policzone++
    pozycje.push({ nazwa, kcal })
  }

  if (policzone === 0) return { kcal: null, policzone: 0, braki, pozycje }
  return { kcal: Math.round(suma / 10) * 10, policzone, braki, pozycje }
}

// Etykieta podpowiedzi do UI, np. "≈ 540 kcal/porcję" + info o brakach.
export function etykietaKcal(wynik) {
  if (!wynik || wynik.kcal == null) return null
  let tekst = `≈ ${wynik.kcal} kcal/porcję`
  if (wynik.braki.length > 0) tekst += ` (bez: ${wynik.braki.slice(0, 3).join(', ')}${wynik.braki.length > 3 ? '…' : ''})`
  return tekst
}
