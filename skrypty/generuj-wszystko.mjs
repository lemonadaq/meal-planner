// generuj-wszystko.mjs
// Dla każdego dania z listy: przepis od Claude'a → INSERT do `dania` →
// zdjęcie z Replicate w rotowanym stylu → upload do Storage → UPDATE `zdjecie`.
// Sam potok siedzi w potok.js — tu jest tylko wczytanie listy i bezpieczniki.
//
// Skrypt jest wznawialny — można go odpalać wielokrotnie po błędach:
//   - danie z przepisem I zdjęciem  → pomijane
//   - danie z przepisem bez zdjęcia → dogenerowywane jest samo zdjęcie
//                                     (prompt ze składników już w bazie)
//   - danie nieznane                → przepis + zdjęcie
//
// Składniki są ujednolicane ze stanem bazy (skrypty/slownik.js): nazwa, która
// w bazie już jest, wchodzi w tej samej pisowni i jednostce.
//
// LISTA DAŃ — jedno z dwóch, w tej kolejności:
//   1. zmienna DANIA (wielolinijkowa) — tak podaje ją workflow GitHuba
//   2. plik skrypty/nowe-dania.txt
// Format linii: Nazwa dania|rodzaj   (rodzaj: sniadanie, obiad, kolacja,
// zupa, przekaska, deser, dodatek, surowka)
//
// Nie wiesz, co dopisać? Tryb `auto` (generuj-auto.mjs) wymyśla nazwy sam.
//
// LOKALNIE:
//   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//          ANTHROPIC_KEY=... REPLICATE_KEY=...
//   node skrypty/generuj-wszystko.mjs
//
// NA GITHUBIE: Actions → "Generuj dania" → Run workflow
//
// LIMIT=n — bezpiecznik na koszty, przetwarza maksymalnie n dań z listy.

import { readFileSync, existsSync } from 'fs'
import {
  sprawdzKlucze, wczytajDania, pobierzSlownikSkladnikow, MODEL_TEKST, MODEL_OBRAZ,
} from './wspolne.js'
import { przetworzDania, wypiszPodsumowanie } from './potok.js'

sprawdzKlucze([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY', 'REPLICATE_KEY',
])

const PLIK_DAN = 'skrypty/nowe-dania.txt'
const LIMIT = parseInt(process.env.LIMIT || '0', 10)

function wczytajListe() {
  if (process.env.DANIA?.trim()) return wczytajDania(process.env.DANIA)
  if (existsSync(PLIK_DAN)) return wczytajDania(readFileSync(PLIK_DAN, 'utf-8'))
  console.error(`Brak listy dań — ustaw DANIA albo utwórz ${PLIK_DAN}`)
  process.exit(1)
}

async function main() {
  let dania = wczytajListe()
  if (LIMIT > 0 && dania.length > LIMIT) {
    console.log(`Lista ma ${dania.length} dań, LIMIT=${LIMIT} — biorę pierwsze ${LIMIT}.`)
    dania = dania.slice(0, LIMIT)
  }

  const { slownik, tekst } = await pobierzSlownikSkladnikow()
  console.log(
    `Dania: ${dania.length} | tekst: ${MODEL_TEKST} | obraz: ${MODEL_OBRAZ} | ` +
    `słownik składników: ${slownik.size}\n`,
  )

  const stat = await przetworzDania(dania, { slownik, blokSystemowy: tekst })
  wypiszPodsumowanie(stat)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
