// generuj-wszystko.mjs
// Dla każdego dania z listy: przepis od Claude'a → INSERT do `dania` →
// zdjęcie z Replicate w rotowanym stylu → upload do Storage → UPDATE `zdjecie`.
//
// Skrypt jest wznawialny — można go odpalać wielokrotnie po błędach:
//   - danie z przepisem I zdjęciem  → pomijane
//   - danie z przepisem bez zdjęcia → dogenerowywane jest samo zdjęcie
//                                     (prompt ze składników już w bazie)
//   - danie nieznane                → przepis + zdjęcie
//
// LISTA DAŃ — jedno z dwóch, w tej kolejności:
//   1. zmienna DANIA (wielolinijkowa) — tak podaje ją workflow GitHuba
//   2. plik skrypty/nowe-dania.txt
// Format linii: Nazwa dania|rodzaj   (rodzaj: sniadanie, obiad, kolacja,
// zupa, przekaska, deser, dodatek, surowka)
//
// LOKALNIE:
//   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//          ANTHROPIC_API_KEY=... REPLICATE_API_TOKEN=...
//   node skrypty/generuj-wszystko.mjs
//
// NA GITHUBIE: Actions → "Generuj dania" → Run workflow
//
// LIMIT=n — bezpiecznik na koszty, przetwarza maksymalnie n dań z listy.

import { readFileSync, existsSync } from 'fs'
import {
  sprawdzKlucze, supabase, pauza, wczytajDania, zbudujWiersze,
  generujPrzepis, generujOpisWizualny, wgrajZdjecie, MODEL_TEKST, MODEL_OBRAZ,
} from './wspolne.js'
import { zbudujPromptObrazu, wybierzStyl } from './style-zdjec.js'

sprawdzKlucze([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'REPLICATE_API_TOKEN',
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

  console.log(`Dania: ${dania.length} | tekst: ${MODEL_TEKST} | obraz: ${MODEL_OBRAZ}\n`)

  let nowe = 0, tylkoZdjecie = 0, pominiete = 0, bledy = 0

  for (const { nazwa, rodzaj } of dania) {
    try {
      // select('*') — kolumny są mixed-case i ze spacjami, bezpieczniej wziąć wszystko
      const { data: istnieje, error } = await supabase.from('dania').select('*').eq('Danie', nazwa)
      if (error) throw error

      const maPrzepis = istnieje?.length > 0
      const maZdjecie = maPrzepis && istnieje.every(r => r.zdjecie)

      if (maPrzepis && maZdjecie) {
        console.log(`⊘ ${nazwa} — kompletne, pomijam`)
        pominiete++
        continue
      }

      const styl = wybierzStyl(nazwa)

      // ── A: przepis jest, brakuje zdjęcia ──
      if (maPrzepis) {
        process.stdout.write(`📷 ${nazwa} [${styl.id}] — opis... `)
        const skladniki = istnieje
          .filter(r => r['Składnik'])
          .map(r => ({
            nazwa: r['Składnik'],
            ilosc: r['Ilość na 1 porcję'] || '-',
            jednostka: r['Jednostka'] || '',
          }))
        const przepisTekst = istnieje.find(r => r['Przepis']?.trim())?.['Przepis'] || ''
        const opis = await generujOpisWizualny(nazwa, skladniki, przepisTekst)

        process.stdout.write('obraz... ')
        await wgrajZdjecie(nazwa, zbudujPromptObrazu(nazwa, rodzaj, opis), istnieje.map(r => r.id))
        console.log('✓')
        tylkoZdjecie++
        await pauza(500)
        continue
      }

      // ── B: nowe danie — przepis + zdjęcie ──
      process.stdout.write(`⏳ ${nazwa} [${styl.id}] — przepis... `)
      const przepis = await generujPrzepis(nazwa, rodzaj)
      const wiersze = zbudujWiersze(nazwa, rodzaj, przepis)

      const { data: wstawione, error: bladInsert } = await supabase
        .from('dania').insert(wiersze).select('id')
      if (bladInsert) throw bladInsert
      process.stdout.write(`✓ (${wiersze.length} skł., ${przepis.kcal} kcal), obraz... `)

      // Jeśli obraz padnie, przepis został — ponowne odpalenie wejdzie w ścieżkę A.
      await wgrajZdjecie(
        nazwa,
        zbudujPromptObrazu(nazwa, rodzaj, przepis.opis_wizualny),
        wstawione.map(r => r.id),
      )
      console.log('✓')
      nowe++
      await pauza(500)
    } catch (e) {
      bledy++
      console.log(`\n✗ ${nazwa}: ${e.message}`)
    }
  }

  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Nowe (przepis+zdjęcie): ${nowe}`)
  console.log(`Dogenerowane zdjęcia:   ${tylkoZdjecie}`)
  console.log(`Pominięte (kompletne):  ${pominiete}`)
  console.log(`Błędy:                  ${bledy}`)
  if (bledy > 0) console.log('\nOdpal ponownie — skrypt dokończy tylko to, czego brakuje.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
