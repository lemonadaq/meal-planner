// generuj-przepisy.mjs
// Same przepisy, bez zdjęć — dla dań z listy, których nie ma jeszcze w bazie.
// Wiersze lądują w `dania` w formacie 1:1 z formularzem DodajDanie.jsx.
//
// Zdjęcia można dogenerować później: node skrypty/generuj-obrazy.mjs
//
// Lista dań: zmienna DANIA albo plik skrypty/nowe-dania.txt (patrz
// generuj-wszystko.mjs). LIMIT=n ogranicza liczbę dań w jednym przebiegu.

import { readFileSync, existsSync } from 'fs'
import {
  sprawdzKlucze, supabase, pauza, wczytajDania, zbudujWiersze,
  generujPrzepis, utworzStraznika, MODEL_TEKST,
} from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY'])

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

  console.log(`Dania: ${dania.length} | model: ${MODEL_TEKST}\n`)

  let ok = 0, pominiete = 0, bledy = 0
  const straznik = utworzStraznika()

  for (const { nazwa, rodzaj } of dania) {
    try {
      const { data: istnieje, error } = await supabase
        .from('dania').select('id').eq('Danie', nazwa).limit(1)
      if (error) throw error
      if (istnieje?.length) {
        console.log(`⊘ ${nazwa} — już istnieje, pomijam`)
        pominiete++
        continue
      }

      const przepis = await generujPrzepis(nazwa, rodzaj)
      const wiersze = zbudujWiersze(nazwa, rodzaj, przepis)

      const { error: bladInsert } = await supabase.from('dania').insert(wiersze)
      if (bladInsert) throw bladInsert

      console.log(`✓ ${nazwa} (${wiersze.length} skł., ${przepis.czas_minuty} min, ${przepis.kcal} kcal)`)
      ok++
      await pauza(500)
    } catch (e) {
      bledy++
      console.log(`✗ ${nazwa}: ${e.message}`)
      straznik(e.message)
    }
  }

  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Dodane: ${ok} | Pominięte: ${pominiete} | Błędy: ${bledy}`)
  if (ok > 0) console.log('\nZdjęcia: node skrypty/generuj-obrazy.mjs')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
