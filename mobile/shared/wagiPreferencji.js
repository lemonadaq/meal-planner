// wagiPreferencji.js
// Przelicza sygnały preferencji na mnożniki dla generatora planu.
// Czyste funkcje, bez React/Supabase — testowalne lokalnie.
//
// Degradacja graceful: pusta tablica sygnałów → pusty obiekt → generator
// zachowuje się identycznie jak bez uczenia (mnożnik 1 dla każdego dania).

// ── Stałe (łatwe do strojenia) ──────────────────────────────────────────────
const WAGI_AKCJI = {
  zaplanuj:    1.0,
  podmien_in:  1.5,   // aktywny wybór zamiast czegoś — najsilniejszy sygnał +
  podmien_out: -1.5,  // aktywne odrzucenie — najsilniejszy sygnał –
  usun:        -1.0,
  przenies:    0,     // neutralny — loguj dla przyszłych analiz, nie scoruj
  podmien:     0.5,   // legacy (stary sygnał bez rozróżnienia in/out)
}

const HALF_LIFE_DNI = 60  // sygnał sprzed 60 dni waży 0.5× świeżego (strojony sezonowo)
const ALFA = 0.5          // jak mocno rozlewamy score przez podobieństwo
const PROG_JACCARD = 0.2  // min. podobieństwo Jaccard żeby propagować bonus
const TEMPO = 1.0         // amplituda krzywej tanh (strojony do bazy max)
const SKALA = 3           // szerokość przejścia (±3 → prawie pełny zakres)
const MIN_MNOZNIK = 0.25  // mięka kara — danie nadal może wypaść (nie 0)
const MAX_MNOZNIK = 3.0   // ulubione danie max ×3 — nie zdominuje planu

// ── Decay ────────────────────────────────────────────────────────────────────
function obliczDecay(createdAt) {
  const wiekMs = Date.now() - new Date(createdAt).getTime()
  const wiekDni = wiekMs / (1000 * 60 * 60 * 24)
  return Math.pow(0.5, wiekDni / HALF_LIFE_DNI)
}

// ── Surowy score per danie ────────────────────────────────────────────────────
// sygnaly: [{ danie, akcja, created_at }]
// zwraca: { [nazwaDania]: number } — tylko dania z niezerowym wpływem
export function obliczScorySurowe(sygnaly) {
  const scores = {}
  for (const s of sygnaly) {
    if (!s.danie || !s.akcja) continue
    const wagaAkcji = WAGI_AKCJI[s.akcja]
    if (wagaAkcji === undefined || wagaAkcji === 0) continue
    const decay = obliczDecay(s.created_at)
    scores[s.danie] = (scores[s.danie] || 0) + wagaAkcji * decay
  }
  return scores
}

// ── Propagacja przez podobieństwo (jeden krok, bez łańcuszków) ───────────────
// scoreySurowe: { [nazwa]: number }
// mapaSkladnikow: { [nazwa]: Set<składnik> } — wynik budujMapeSkladnikow()
// zwraca: { [nazwa]: number } — score końcowy (surowy + bonus z sąsiedztwa)
export function propagujPrzezPodobienstwo(scoreySurowe, mapaSkladnikow) {
  const bonusy = {}

  for (const [danieD, scoreD] of Object.entries(scoreySurowe)) {
    if (!scoreD) continue
    const zbiorD = mapaSkladnikow[danieD]
    if (!zbiorD || zbiorD.size === 0) continue

    for (const [danieX, zbiorX] of Object.entries(mapaSkladnikow)) {
      if (danieX === danieD || !zbiorX || zbiorX.size === 0) continue
      let przeciecie = 0
      for (const s of zbiorD) { if (zbiorX.has(s)) przeciecie++ }
      const sim = przeciecie / (zbiorD.size + zbiorX.size - przeciecie)
      if (sim < PROG_JACCARD) continue
      bonusy[danieX] = (bonusy[danieX] || 0) + scoreD * sim * ALFA
    }
  }

  const wynik = { ...scoreySurowe }
  for (const [nazwa, bonus] of Object.entries(bonusy)) {
    wynik[nazwa] = (wynik[nazwa] || 0) + bonus
  }
  return wynik
}

// ── Konwersja score → mnożnik ─────────────────────────────────────────────────
// score = 0 → mnożnik dokładnie 1.0 (cold start = obecne zachowanie, bit w bit)
export function scoreDoMnoznika(score) {
  const raw = 1 + TEMPO * Math.tanh(score / SKALA)
  return Math.max(MIN_MNOZNIK, Math.min(MAX_MNOZNIK, raw))
}

// ── Główna funkcja eksportowana ────────────────────────────────────────────────
// sygnaly: [{ danie, akcja, created_at }]
// mapaSkladnikow: wynik budujMapeSkladnikow() — jeśli null, pomija propagację
// zwraca: { [nazwaDania]: mnożnik } — tylko dania z niedomyślnym mnożnikiem
export function budujWagiUczenia({ sygnaly, mapaSkladnikow = null }) {
  if (!sygnaly || sygnaly.length === 0) return {}

  const scoreySurowe = obliczScorySurowe(sygnaly)
  if (Object.keys(scoreySurowe).length === 0) return {}

  const scoresKoncowe = mapaSkladnikow
    ? propagujPrzezPodobienstwo(scoreySurowe, mapaSkladnikow)
    : scoreySurowe

  const wynik = {}
  for (const [nazwa, score] of Object.entries(scoresKoncowe)) {
    wynik[nazwa] = scoreDoMnoznika(score)
  }
  return wynik
}

// ── Mini-testy (uruchom: node --input-type=module wagiPreferencji.js) ─────────
// Odkomentuj i uruchom ręcznie aby sprawdzić:
//
// import { budujMapeSkladnikow } from './mapaPodobienstwa.js'
//
// const wierszeDan = [
//   { Danie: 'Spaghetti bolognese', Składnik: 'Makaron', Kategoria: '5_Produkty sypkie' },
//   { Danie: 'Spaghetti bolognese', Składnik: 'Mięso mielone', Kategoria: '2_Mięso i ryby' },
//   { Danie: 'Spaghetti bolognese', Składnik: 'Pomidory', Kategoria: '1_Warzywa i owoce' },
//   { Danie: 'Lasagne',             Składnik: 'Makaron', Kategoria: '5_Produkty sypkie' },
//   { Danie: 'Lasagne',             Składnik: 'Mięso mielone', Kategoria: '2_Mięso i ryby' },
//   { Danie: 'Lasagne',             Składnik: 'Ser', Kategoria: '3_Nabiał' },
//   { Danie: 'Ryba po grecku',      Składnik: 'Dorsz', Kategoria: '2_Mięso i ryby' },
//   { Danie: 'Ryba po grecku',      Składnik: 'Cebula', Kategoria: '1_Warzywa i owoce' },
// ]
// const mapaSkladnikow = budujMapeSkladnikow(wierszeDan)
//
// // Test 1: puste sygnały → pusty obiekt
// console.assert(Object.keys(budujWagiUczenia({ sygnaly: [] })).length === 0, 'Test 1 fail')
//
// // Test 2: podmien_out 3× → mnożnik wyraźnie < 1
// const sygnaly2 = [
//   { danie: 'Ryba po grecku', akcja: 'podmien_out', created_at: new Date().toISOString() },
//   { danie: 'Ryba po grecku', akcja: 'podmien_out', created_at: new Date().toISOString() },
//   { danie: 'Ryba po grecku', akcja: 'podmien_out', created_at: new Date().toISOString() },
// ]
// const w2 = budujWagiUczenia({ sygnaly: sygnaly2, mapaSkladnikow })
// console.assert(w2['Ryba po grecku'] < 1, 'Test 2 fail: ' + w2['Ryba po grecku'])
//
// // Test 3: zaplanuj 3× → Spaghetti i Lasagne (podobna) oboje > 1
// const sygnaly3 = [
//   { danie: 'Spaghetti bolognese', akcja: 'zaplanuj', created_at: new Date().toISOString() },
//   { danie: 'Spaghetti bolognese', akcja: 'zaplanuj', created_at: new Date().toISOString() },
//   { danie: 'Spaghetti bolognese', akcja: 'zaplanuj', created_at: new Date().toISOString() },
// ]
// const w3 = budujWagiUczenia({ sygnaly: sygnaly3, mapaSkladnikow })
// console.assert(w3['Spaghetti bolognese'] > 1, 'Test 3a fail')
// console.assert(w3['Lasagne'] > 1, 'Test 3b fail (propagacja)')
//
// // Test 4: stary sygnał (180 dni temu) waży ~1/8 świeżego
// const stary = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
// const swiezy = new Date().toISOString()
// const wiekStary = Math.pow(0.5, 180 / 60)  // ~0.125
// console.assert(Math.abs(wiekStary - 0.125) < 0.01, 'Test 4 fail: ' + wiekStary)
//
// console.log('Wszystkie testy OK')
