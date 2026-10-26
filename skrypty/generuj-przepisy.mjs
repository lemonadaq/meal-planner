// generuj-przepisy.mjs
// Same przepisy, bez zdjęć — dla dań z listy, których nie ma jeszcze w bazie.
// Wiersze lądują w `dania` w formacie 1:1 z formularzem DodajDanie.jsx.
//
// Zdjęcia można dogenerować później: node skrypty/generuj-obrazy.mjs
//
// NADPISZ=1 (w akcji: pole `overwrite`) — przegeneruj przepis daniu, które JUŻ
// jest w bazie. Stare wiersze idą do kosza, wchodzą nowe, ale `ulubione`
// i `zdjecie` są przenoszone, żeby danie nie straciło gwiazdki ani obrazka.
// Kolejność: najpierw INSERT nowych, dopiero potem DELETE starych — gdyby coś
// padło w połowie, zostaną duplikaty do posprzątania, a nie puste miejsce.
// Przydaje się razem z WSKAZOWKI_PRZEPISU w skrypty/opisy-reczne.js.
//
// Lista dań: zmienna DANIA albo plik skrypty/nowe-dania.txt (patrz
// generuj-wszystko.mjs). LIMIT=n ogranicza liczbę dań w jednym przebiegu.

import { readFileSync, existsSync } from 'fs'
import {
  sprawdzKlucze, supabase, pauza, wczytajDania, zbudujWiersze,
  generujPrzepis, utworzStraznika, pobierzSlownikSkladnikow, MODEL_TEKST,
} from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY'])

const PLIK_DAN = 'skrypty/nowe-dania.txt'
const LIMIT = parseInt(process.env.LIMIT || '0', 10)
const NADPISZ = process.env.NADPISZ === '1' || process.env.NADPISZ === 'true' ||
                process.env.OVERWRITE === '1' || process.env.OVERWRITE === 'true'

function wczytajListe() {
  const lista = process.env.DANIA?.trim()
    ? wczytajDania(process.env.DANIA)
    : (existsSync(PLIK_DAN) ? wczytajDania(readFileSync(PLIK_DAN, 'utf-8')) : [])

  // Pusta lista to NIE jest przebieg na zero dań — to pomyłka w wejściu
  // i trzeba o niej powiedzieć, zamiast kończyć sukcesem bez efektu.
  if (!lista.length) {
    console.error('Lista dań jest PUSTA — nie ma czego generować.')
    console.error(`Wpisz dania w pole \`dania\` w akcji (albo w ${PLIK_DAN}):`)
    console.error('  Bigos|obiad; Żurek|zupa')
    console.error('Chcesz, żeby nazwy wymyśliły się same? Tryb `auto` (pole `ile`).')
    console.error('Chcesz gotowe przepisy bez kredytów na Anthropic? Tryb `import`.')
    process.exit(1)
  }
  return lista
}

async function main() {
  let dania = wczytajListe()
  if (LIMIT > 0 && dania.length > LIMIT) {
    console.log(`Lista ma ${dania.length} dań, LIMIT=${LIMIT} — biorę pierwsze ${LIMIT}.`)
    dania = dania.slice(0, LIMIT)
  }

  // Słownik składników z bazy — nowe przepisy mają nazywać produkty tak,
  // jak już są nazwane, a nie wnosić trzeciej pisowni tego samego.
  const { slownik, tekst: blokSystemowy } = await pobierzSlownikSkladnikow()

  console.log(
    `Dania: ${dania.length} | model: ${MODEL_TEKST} | słownik składników: ${slownik.size}` +
    (NADPISZ ? ' | NADPISYWANIE istniejących przepisów' : '') + '\n',
  )

  let ok = 0, nadpisane = 0, pominiete = 0, bledy = 0
  const straznik = utworzStraznika()

  for (const { nazwa, rodzaj } of dania) {
    try {
      const { data: istnieje, error } = await supabase
        .from('dania').select('id, ulubione, zdjecie').eq('Danie', nazwa)
      if (error) throw error

      if (istnieje?.length && !NADPISZ) {
        console.log(`⊘ ${nazwa} — już istnieje, pomijam`)
        pominiete++
        continue
      }

      const przepis = await generujPrzepis(nazwa, rodzaj, { blokSystemowy })
      const wiersze = zbudujWiersze(nazwa, rodzaj, przepis, slownik)

      // Przenosimy to, czego przepis nie odtworzy: gwiazdkę i zdjęcie.
      if (istnieje?.length) {
        const ulubione = istnieje.some(r => r.ulubione)
        const zdjecie = istnieje.find(r => r.zdjecie)?.zdjecie || null
        wiersze.forEach(w => { w.ulubione = ulubione; w.zdjecie = zdjecie })
      }

      const { error: bladInsert } = await supabase.from('dania').insert(wiersze)
      if (bladInsert) throw bladInsert

      if (istnieje?.length) {
        const { error: bladDelete } = await supabase
          .from('dania').delete().in('id', istnieje.map(r => r.id))
        if (bladDelete) throw bladDelete
        console.log(`↻ ${nazwa} — przepis nadpisany (${wiersze.length} skł., ${przepis.czas_minuty} min, ${przepis.kcal} kcal)`)
        nadpisane++
      } else {
        console.log(`✓ ${nazwa} (${wiersze.length} skł., ${przepis.czas_minuty} min, ${przepis.kcal} kcal)`)
        ok++
      }
      await pauza(500)
    } catch (e) {
      bledy++
      console.log(`✗ ${nazwa}: ${e.message}`)
      straznik(e.message)
    }
  }

  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Dodane: ${ok} | Nadpisane: ${nadpisane} | Pominięte: ${pominiete} | Błędy: ${bledy}`)
  if (ok > 0) console.log('\nZdjęcia: node skrypty/generuj-obrazy.mjs')
  if (nadpisane > 0) {
    console.log('\nPrzepis się zmienił — zdjęcie warto przegenerować:')
    console.log('tryb `obrazy` z zaznaczonym `overwrite`')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
