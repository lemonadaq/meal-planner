// propozycje.js
// Plan paczki nowych dań: ile czego i w jakiej kuchni, oraz odsiewanie
// propozycji, które w bazie już są.
//
// Po co: w trybie `auto` Filip wpisuje w akcji JEDNĄ liczbę („dodaj 50 dań")
// i nic więcej. Reszta — rozkład na kuchnie i rodzaje, pilnowanie dubli —
// musi się policzyć sama i powtarzalnie.
//
// Logika jest tu czysta (bez sieci i bez bazy), żeby dała się przetestować:
// src/test/propozycjeDan.test.js.

import { znajdzKolizje, zbudujIndeks, kluczDokladny } from './podobienstwo.js'
import { RODZAJE, KUCHNIE } from './wspolne.js'

// Domyślny rozkład kuchni. Filip prosił o polską, włoską i francuską, a dalej
// „najpopularniejsze kierunki" — czyli to, co w polskim domu faktycznie się
// gotuje, a nie pełna lista KUCHNIE.
export const PLAN_KUCHNI = {
  polska: 30,
  wloska: 18,
  francuska: 14,
  grecka: 8,
  hiszpanska: 8,
  amerykanska: 7,
  meksykanska: 6,
  niemiecka: 5,
  wegierska: 4,
}

// Domyślny rozkład rodzajów. `przekaska` świadomie NIE ma — Filip prosił, żeby
// na razie ją zostawić. `zupa` też nie ma w domyślnym rozkładzie (nie było jej
// na liście), ale można ją dodać przez RODZAJE_PLAN.
export const PLAN_RODZAJOW = {
  obiad: 34,
  kolacja: 20,
  sniadanie: 16,
  deser: 16,
  surowka: 14,
}

// „polska:3, wloska:2" → { polska: 3, wloska: 2 }. Sama lista nazw
// („polska, wloska") znaczy równe udziały. Zwraca null, gdy tekst jest pusty.
export function parsujPlan(tekst, dozwolone) {
  if (!tekst?.trim()) return null
  const wagi = {}
  for (const czesc of tekst.split(/[,;]+/)) {
    const [nazwa, waga] = czesc.split(':').map(x => x?.trim())
    if (!nazwa) continue
    if (!dozwolone.includes(nazwa)) {
      throw new Error(`nieznana wartość "${nazwa}" (dozwolone: ${dozwolone.join(', ')})`)
    }
    const liczba = waga ? parseFloat(waga.replace(',', '.')) : 1
    if (!Number.isFinite(liczba) || liczba <= 0) throw new Error(`zła waga przy "${nazwa}"`)
    wagi[nazwa] = liczba
  }
  if (!Object.keys(wagi).length) return null
  return wagi
}

// Rozdziela `ile` na kubełki proporcjonalnie do wag — metodą największych
// reszt, żeby suma zgadzała się co do jednego dania.
export function rozdziel(ile, wagi) {
  const klucze = Object.keys(wagi)
  if (!klucze.length || ile <= 0) return {}
  const suma = klucze.reduce((s, k) => s + wagi[k], 0)

  const wynik = {}
  const reszty = []
  let rozdane = 0
  for (const k of klucze) {
    const dokladnie = (ile * wagi[k]) / suma
    const calosc = Math.floor(dokladnie)
    wynik[k] = calosc
    rozdane += calosc
    reszty.push({ k, reszta: dokladnie - calosc })
  }

  reszty.sort((a, b) => b.reszta - a.reszta || a.k.localeCompare(b.k))
  for (let i = 0; rozdane < ile; i++, rozdane++) wynik[reszty[i % reszty.length].k]++

  for (const k of klucze) if (!wynik[k]) delete wynik[k]
  return wynik
}

// Pełny plan: lista zadań per kuchnia, z rozbiciem na rodzaje.
// [{ kuchnia: 'polska', ile: 15, rodzaje: { obiad: 5, deser: 2, ... } }]
export function zbudujPlan(ile, { wagiKuchni = PLAN_KUCHNI, wagiRodzajow = PLAN_RODZAJOW } = {}) {
  const poKuchniach = rozdziel(ile, wagiKuchni)
  return Object.entries(poKuchniach)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([kuchnia, ileDan]) => ({
      kuchnia,
      ile: ileDan,
      rodzaje: rozdziel(ileDan, wagiRodzajow),
    }))
}

// Odsiewa propozycje: puste, z nieznanym rodzajem, duble w obrębie paczki
// i te, które w bazie już są (dokładnie albo pod podobną nazwą).
// `istniejace` to tablica nazw ALBO indeks z zbudujIndeks().
export function odfiltrujPropozycje(propozycje, istniejace, { prog = 0.6, rodzajeOk = RODZAJE } = {}) {
  const indeks = Array.isArray(istniejace) && typeof istniejace[0] === 'string'
    ? zbudujIndeks(istniejace)
    : (istniejace || [])
  const przyjete = []
  const odrzucone = []
  const wPaczce = []

  for (const p of propozycje || []) {
    const nazwa = (p?.nazwa || '').toString().trim().replace(/\s+/g, ' ')
    if (!nazwa) continue
    const rodzaj = (p?.rodzaj || '').toString().trim().toLowerCase()

    if (!rodzajeOk.includes(rodzaj)) {
      odrzucone.push({ nazwa, powod: `rodzaj "${rodzaj}" poza zakresem` })
      continue
    }
    const wBazie = znajdzKolizje(nazwa, indeks, prog)
    if (wBazie) {
      odrzucone.push({ nazwa, powod: `w bazie jest „${wBazie}"` })
      continue
    }
    const wTejPaczce = znajdzKolizje(nazwa, wPaczce, prog)
    if (wTejPaczce) {
      odrzucone.push({ nazwa, powod: `powtórka z „${wTejPaczce}" w tej paczce` })
      continue
    }

    const przyjeta = { nazwa, rodzaj, kuchnia: KUCHNIE.includes(p?.kuchnia) ? p.kuchnia : null }
    przyjete.push(przyjeta)
    wPaczce.push(...zbudujIndeks([nazwa]))
  }

  return { przyjete, odrzucone }
}

// Jedno zapytanie do modelu nie powinno obejmować 60 dań — przy długich
// listach model zaczyna się powtarzać, a odpowiedź rośnie do max_tokens.
// Dzielimy więc zadanie kuchni na paczki po maks. `maks` dań, zachowując
// rozbicie na rodzaje.
export function podzielZadanie(rodzaje, maks = 25) {
  const paczki = []
  let biezaca = {}
  let wBiezacej = 0

  for (const [rodzaj, ile] of Object.entries(rodzaje)) {
    let zostalo = ile
    while (zostalo > 0) {
      const miejsce = maks - wBiezacej
      const wezmy = Math.min(zostalo, miejsce)
      biezaca[rodzaj] = (biezaca[rodzaj] || 0) + wezmy
      wBiezacej += wezmy
      zostalo -= wezmy
      if (wBiezacej >= maks) {
        paczki.push(biezaca)
        biezaca = {}
        wBiezacej = 0
      }
    }
  }
  if (wBiezacej > 0) paczki.push(biezaca)
  return paczki
}

// Linijka do wklejenia w pole `dania` w akcji — tak samo jak w lista.mjs.
export const liniaDania = dania => dania.map(d => `${d.nazwa}|${d.rodzaj}`).join('; ')

// Nazwy do promptu — model ma ich NIE proponować. Sam zbiór nazw, bez rodzaju:
// chodzi o danie, nie o to, w której zakładce siedzi.
export const nazwyDoPromptu = nazwy => [...new Set(nazwy.map(n => n.trim()).filter(Boolean))]
  .sort((a, b) => kluczDokladny(a).localeCompare(kluczDokladny(b), 'pl'))
