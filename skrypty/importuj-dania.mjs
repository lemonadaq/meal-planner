// importuj-dania.mjs
// TRYB `import`: dania z gotowymi przepisami (pliki `skrypty/dania/*.json`)
// → INSERT do `dania` → zdjęcie z Replicate → Storage.
//
// Po co: generowanie przepisów chodzi na kluczu Anthropic, a ten potrzebuje
// kredytów. Baza (Supabase) i zdjęcia (Replicate) mają własne klucze i działają
// niezależnie. Gdy kredyty Anthropic są na zerze, przepis pisze człowiek albo
// Claude w rozmowie, zapisuje go do pliku JSON, a ten skrypt robi resztę —
// z tym samym sprzątaniem składników i tym samym potokiem zdjęć, co `auto`.
//
// Format pliku: tablica dań 1:1 z tym, co w `auto` zwraca Claude
// (nazwa, rodzaj, czas_minuty, kcal, kuchnia, poziom, skladniki[], kroki[],
// opis_wizualny). Walidacja: skrypty/import-dan.js — literówka w `rodzaj`
// zatrzymuje przebieg PRZED zapisem.
//
// ZMIENNE:
//   PLIKI="paczka-01.json, paczka-02.json"   które pliki (puste = wszystkie)
//   LIMIT=10                                 bezpiecznik na koszty zdjęć
//   BEZ_ZDJEC=1                              sam zapis, bez Replicate
//
// LOKALNIE: npm run import
// NA GITHUBIE: Actions → „Generuj dania" → tryb `import`
//   (pole `dania` = nazwy plików; puste = wszystkie)

import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { sprawdzKlucze, pobierzSlownikSkladnikow, MODEL_OBRAZ } from './wspolne.js'
import { przetworzDania, wypiszPodsumowanie } from './potok.js'
import { wczytajPlik } from './import-dan.js'

const KATALOG = 'skrypty/dania'
const LIMIT = parseInt(process.env.LIMIT || '0', 10)
const BEZ_ZDJEC = ['1', 'true'].includes((process.env.BEZ_ZDJEC || '').toLowerCase())

// Pole `dania` w akcji znaczy tu „które pliki" — w trybie `import` nie ma
// listy nazw dań, bo te siedzą w plikach.
const WYBRANE = (process.env.PLIKI || process.env.DANIA || '')
  .split(/[,;\n]+/).map(x => x.trim()).filter(Boolean)

sprawdzKlucze([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  ...(BEZ_ZDJEC ? [] : ['REPLICATE_KEY']),
])

function pliki() {
  if (!existsSync(KATALOG)) {
    console.error(`Brak katalogu ${KATALOG} — nie ma czego importować.`)
    process.exit(1)
  }
  const wszystkie = readdirSync(KATALOG).filter(f => f.endsWith('.json')).sort()
  if (!WYBRANE.length) return wszystkie

  const brakujace = WYBRANE.filter(w => !wszystkie.includes(w))
  if (brakujace.length) {
    console.error(`Nie ma takich plików w ${KATALOG}: ${brakujace.join(', ')}`)
    console.error(`Są: ${wszystkie.join(', ') || '(żadnego)'}`)
    process.exit(1)
  }
  return WYBRANE
}

async function main() {
  const lista = pliki()
  if (!lista.length) {
    console.error(`${KATALOG} nie ma żadnego pliku .json`)
    process.exit(1)
  }

  let dania = []
  for (const plik of lista) {
    // Błąd w pliku wywala przebieg ZANIM cokolwiek poleci do bazy — lepiej
    // stanąć na literówce niż wstawić połowę paczki.
    const zPliku = wczytajPlik(readFileSync(join(KATALOG, plik), 'utf-8'), plik)
    console.log(`${plik}: ${zPliku.length} dań`)
    dania = dania.concat(zPliku)
  }

  if (LIMIT > 0 && dania.length > LIMIT) {
    console.log(`Razem ${dania.length} dań, LIMIT=${LIMIT} — biorę pierwsze ${LIMIT}.`)
    dania = dania.slice(0, LIMIT)
  }

  const { slownik } = await pobierzSlownikSkladnikow()
  console.log(
    `\nDania: ${dania.length} | obraz: ${BEZ_ZDJEC ? 'POMINIĘTY' : MODEL_OBRAZ} | ` +
    `słownik składników: ${slownik.size} | Anthropic: NIEUŻYWANY\n`,
  )

  const stat = await przetworzDania(dania, { slownik, bezZdjec: BEZ_ZDJEC })
  wypiszPodsumowanie(stat, { bezZdjec: BEZ_ZDJEC })
  if (stat.nowe > 0) console.log('Odśwież LISTA_DAN.md: tryb `lista` + `zapisz_liste`')
}

main().catch(e => {
  console.error(e.message || e)
  process.exit(1)
})
