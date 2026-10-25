// potok.js
// Jedno danie od nazwy do kompletnego wpisu: przepis od Claude'a → INSERT
// do `dania` → zdjęcie z Replicate → upload do Storage → UPDATE `zdjecie`.
//
// Wydzielone z generuj-wszystko.mjs, bo tej samej ścieżki potrzebuje tryb
// `auto` (generuj-auto.mjs), który nazwy dań wymyśla sam. Jedna kopia tej
// logiki, nie dwie — inaczej poprawka w jednym trybie omija drugi.
//
// Danie może przyjść z GOTOWYM przepisem (pole `przepis`) — tak działa tryb
// `import`, gdy przepis napisał człowiek albo Claude w rozmowie. Wtedy nie
// ma ani jednego zapytania do Anthropic, a zdjęcie i tak powstaje, bo
// Replicate chodzi na osobnym kluczu.
//
// Potok jest WZNAWIALNY:
//   - danie z przepisem I zdjęciem  → pomijane
//   - danie z przepisem bez zdjęcia → dogenerowywane samo zdjęcie
//                                     (prompt ze składników już w bazie)
//   - danie nieznane                → przepis + zdjęcie

import {
  supabase, pauza, zbudujWiersze, generujPrzepis, generujOpisWizualny,
  wgrajZdjecie, utworzStraznika,
} from './wspolne.js'
import { zbudujPromptObrazu, wybierzStyl } from './style-zdjec.js'

// dania: [{ nazwa, rodzaj }]
// slownik: z budujSlownik() — ujednolica składniki ze stanem bazy
// blokSystemowy: słownik składników jako prompt systemowy z cache'em
// bezZdjec: tylko przepisy (bez kosztów Replicate)
export async function przetworzDania(dania, { slownik = null, blokSystemowy = '', bezZdjec = false } = {}) {
  let nowe = 0, tylkoZdjecie = 0, pominiete = 0, bledy = 0
  const straznik = utworzStraznika()

  for (const { nazwa, rodzaj, przepis: gotowy } of dania) {
    try {
      // select('*') — kolumny są mixed-case i ze spacjami, bezpieczniej wziąć wszystko
      const { data: istnieje, error } = await supabase.from('dania').select('*').eq('Danie', nazwa)
      if (error) throw error

      const maPrzepis = istnieje?.length > 0
      const maZdjecie = maPrzepis && istnieje.every(r => r.zdjecie)

      if (maPrzepis && (maZdjecie || bezZdjec)) {
        console.log(`⊘ ${nazwa} — ${maZdjecie ? 'kompletne' : 'przepis już jest'}, pomijam`)
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
        // Gotowy opis z pliku oszczędza zapytanie — i jest jedynym wyjściem,
        // gdy na Anthropic nie ma kredytów.
        const opis = gotowy?.opis_wizualny
          || await generujOpisWizualny(nazwa, skladniki, przepisTekst)

        process.stdout.write('obraz... ')
        await wgrajZdjecie(nazwa, zbudujPromptObrazu(nazwa, rodzaj, opis), istnieje.map(r => r.id))
        console.log('✓')
        tylkoZdjecie++
        await pauza(500)
        continue
      }

      // ── B: nowe danie — przepis + zdjęcie ──
      process.stdout.write(`⏳ ${nazwa} [${styl.id}] — przepis... `)
      const przepis = gotowy || await generujPrzepis(nazwa, rodzaj, { blokSystemowy })
      const wiersze = zbudujWiersze(nazwa, rodzaj, przepis, slownik)

      const { data: wstawione, error: bladInsert } = await supabase
        .from('dania').insert(wiersze).select('id')
      if (bladInsert) throw bladInsert
      process.stdout.write(`✓ (${wiersze.length} skł., ${przepis.kcal} kcal)`)

      if (bezZdjec) {
        console.log('')
        nowe++
        await pauza(500)
        continue
      }

      // Jeśli obraz padnie, przepis został — ponowne odpalenie wejdzie w ścieżkę A.
      process.stdout.write(', obraz... ')
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
      straznik(e.message)
    }
  }

  return { nowe, tylkoZdjecie, pominiete, bledy }
}

export function wypiszPodsumowanie({ nowe, tylkoZdjecie, pominiete, bledy }, { bezZdjec = false } = {}) {
  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Nowe (${bezZdjec ? 'przepisy' : 'przepis+zdjęcie'}): ${nowe}`)
  if (!bezZdjec) console.log(`Dogenerowane zdjęcia:   ${tylkoZdjecie}`)
  console.log(`Pominięte (były już):   ${pominiete}`)
  console.log(`Błędy:                  ${bledy}`)
  if (bledy > 0) console.log('\nOdpal ponownie — skrypt dokończy tylko to, czego brakuje.')
}
