// generatorPlanu.js
// Czysta logika generowania planu tygodnia. Bez zależności od React/Supabase —
// dzięki temu testowalna i łatwa do rozwijania.
//
// Model punktowy (warstwy, każda niezależna):
//   bazowy = 1
//   × filtr twardy   → 0 jeśli danie wykluczone (preferencje: "brak ryb")
//   × preferencja    → np. ×2 jeśli danie ma lubiany składnik/tag
//   × waga uczenia   → z historii podmian (na razie 1, dokładamy później)
//   × świeżość       → mniej punktów jeśli danie było ostatnio (anty-powtórki)
//
// Losowanie ważone: prawdopodobieństwo ∝ punkty. Danie z 0 pkt nie wypadnie.

// ── Losowanie ważone z listy { item, waga } ────────────────────────
function losujWazone(kandydaci) {
  const dostepni = kandydaci.filter(k => k.waga > 0)
  if (dostepni.length === 0) return null
  const suma = dostepni.reduce((s, k) => s + k.waga, 0)
  let r = Math.random() * suma
  for (const k of dostepni) {
    r -= k.waga
    if (r <= 0) return k.item
  }
  return dostepni[dostepni.length - 1].item
}

// ── Oblicz wagę pojedynczego dania ─────────────────────────────────
// danie: { Danie, rodzaj, TYP, ... , _skladniki?: [nazwy] }
// opcje: { preferencje, uczenie, uzytePrzedchwila: Set<nazwa> }
function wagaDania(danie, opcje = {}) {
  const {
    wykluczone = new Set(),      // nazwy dań lub tagów do wykluczenia (filtr twardy)
    lubiane = new Set(),         // tagi/składniki premiowane (preferencja miękka)
    uczenie = {},                // { [nazwaDania]: mnożnik } z historii podmian
    swiezosc = {},               // { [nazwaDania]: 0..1 } im mniej tym dawniej użyte
  } = opcje

  // Filtr twardy: jeśli danie jest na liście wykluczonych → 0
  if (wykluczone.has(danie.Danie)) return 0
  // (rozszerzenie: sprawdzanie składników/tagów dania względem wykluczone — później)

  let waga = 1

  // Preferencja miękka: danie z lubianym tagiem/typem dostaje boost
  if (danie.TYP && lubiane.has(danie.TYP)) waga *= 2
  if (danie.rodzaj && lubiane.has(danie.rodzaj)) waga *= 1.5

  // Uczenie z historii (na razie zwykle 1)
  const u = uczenie[danie.Danie]
  if (typeof u === 'number' && u > 0) waga *= u

  // Świeżość: jeśli danie użyte niedawno, mniejsza waga (anty-powtórki)
  const sw = swiezosc[danie.Danie]
  if (typeof sw === 'number') waga *= sw

  return waga
}

// ── Główna funkcja: ułóż plan tygodnia ─────────────────────────────
// Parametry:
//   dania       — tablica wszystkich dań [{ Danie, rodzaj, TYP, zdjecie, ... }]
//   dniSlotyMap — { [kluczDnia]: [{ id, nazwa, rodzajDopasowany }] }
//                 dla każdego dnia lista slotów + jaki rodzaj dania pasuje
//   opcje       — preferencje/uczenie (jak w wagaDania) + niePowtarzaj (bool)
//
// Zwraca: { [`${dataStr}_${slotId}`]: nazwaDania }
//
// Algorytm: dla każdego (dzień, slot) bierzemy pulę dań o pasującym rodzaju,
// liczymy wagi, losujemy. Jeśli niePowtarzaj=true, użyte dania w tym tygodniu
// dostają wagę 0 (nie wrócą), chyba że pula by się wyczerpała.
export function generujPlanTygodnia({ dni, dniSlotyMap, dania, opcje = {} }) {
  const { niePowtarzaj = true } = opcje
  const plan = {}
  const uzyte = new Set()

  // Pogrupuj dania po rodzaju dla szybkiego dostępu
  const wgRodzaju = {}
  for (const d of dania) {
    if (!d.Danie || !d.rodzaj) continue
    ;(wgRodzaju[d.rodzaj] ||= []).push(d)
  }

  for (const dzien of dni) {
    const dataStr = dzien.dataStr
    const sloty = dniSlotyMap[dzien.klucz] || []

    for (const slot of sloty) {
      const rodzaj = slot.rodzajDopasowany // 'sniadanie' | 'obiad' | 'kolacja'
      let pula = wgRodzaju[rodzaj] || []
      if (pula.length === 0) continue

      // Zbuduj kandydatów z wagami
      let kandydaci = pula.map(d => ({
        item: d,
        waga: wagaDania(d, opcje) * (niePowtarzaj && uzyte.has(d.Danie) ? 0 : 1),
      }))

      // Jeśli wszystko wyzerowane przez niePowtarzaj (mała pula) — zresetuj powtórki
      if (kandydaci.every(k => k.waga === 0)) {
        kandydaci = pula.map(d => ({ item: d, waga: wagaDania(d, opcje) }))
      }

      const wybrane = losujWazone(kandydaci)
      if (wybrane) {
        plan[`${dataStr}_${slot.id}`] = wybrane.Danie
        uzyte.add(wybrane.Danie)
      }
    }
  }

  return plan
}

// Eksport pomocniczych do testów/rozszerzeń
export { wagaDania, losujWazone }
