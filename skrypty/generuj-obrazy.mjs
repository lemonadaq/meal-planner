// generuj-obrazy.mjs
// Dogenerowuje zdjęcia do dań, które JUŻ SĄ w bazie, ale nie mają `zdjecie`.
// Prompt budowany ze składników i przepisu z bazy, więc zdjęcie zgadza się
// z tym, co realnie jest w przepisie. Styl rotowany po nazwie dania.
//
// Domyślnie bierze WSZYSTKIE dania bez zdjęcia. Zawężenie:
//   DANIA="Bigos|obiad\nŻurek|zupa"  — tylko te (rodzaj z listy jest ignorowany,
//                                      bierzemy ten z bazy)
//   OVERWRITE=1                      — regeneruje też te, które mają już zdjęcie
//   LIMIT=n                          — bezpiecznik na koszty
//
// LOKALNIE:
//   export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//          ANTHROPIC_KEY=... REPLICATE_KEY=...
//   node skrypty/generuj-obrazy.mjs

import {
  sprawdzKlucze, supabase, pauza, pobierzWszystkieWiersze,
  generujOpisWizualny, wgrajZdjecie, utworzStraznika, MODEL_OBRAZ,
} from './wspolne.js'
import { zbudujPromptObrazu, wybierzStyl } from './style-zdjec.js'

sprawdzKlucze([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY', 'REPLICATE_KEY',
])

const OVERWRITE = process.env.OVERWRITE === '1' || process.env.OVERWRITE === 'true'
const LIMIT = parseInt(process.env.LIMIT || '0', 10)

// Opcjonalne zawężenie do konkretnych nazw (format linii jak w nowe-dania.txt,
// ale rodzaj bierzemy z bazy — tutaj liczy się tylko nazwa).
const filtrNazw = process.env.DANIA?.trim()
  ? new Set(
      process.env.DANIA.split(/[\r\n;]+/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split('|')[0].trim()),
    )
  : null

async function main() {
  // Paginowany odczyt — bez tego PostgREST oddaje pierwsze 1000 wierszy,
  // a `dania` to wiersz na składnik (~2500+) i część dań ginie po cichu.
  const wiersze = await pobierzWszystkieWiersze(() =>
    supabase
      .from('dania')
      .select('id, "Danie", rodzaj, zdjecie, "Składnik", "Ilość na 1 porcję", "Jednostka", "Przepis"')
      .order('id'),
  )
  console.log(`Wczytano ${wiersze.length} wierszy z bazy.`)

  // Grupowanie po nazwie dania
  const dania = new Map()
  for (const r of wiersze) {
    const nazwa = r['Danie']
    if (!nazwa) continue
    if (!dania.has(nazwa)) {
      dania.set(nazwa, { nazwa, rodzaj: r.rodzaj || 'obiad', ids: [], skladniki: [], przepis: '', maZdjecie: true })
    }
    const d = dania.get(nazwa)
    d.ids.push(r.id)
    if (!r.zdjecie) d.maZdjecie = false
    if (r.rodzaj) d.rodzaj = r.rodzaj
    if (r['Składnik']) {
      d.skladniki.push({
        nazwa: r['Składnik'],
        ilosc: r['Ilość na 1 porcję'] || '-',
        jednostka: r['Jednostka'] || '',
      })
    }
    if (!d.przepis && r['Przepis']?.trim()) d.przepis = r['Przepis']
  }

  let doZrobienia = [...dania.values()].filter(d => OVERWRITE || !d.maZdjecie)
  if (filtrNazw) {
    const nieznane = [...filtrNazw].filter(n => !dania.has(n))
    nieznane.forEach(n => console.log(`⊘ ${n} — nie ma w bazie`))
    doZrobienia = doZrobienia.filter(d => filtrNazw.has(d.nazwa))
  }

  console.log(`Dań w bazie: ${dania.size} | do wygenerowania: ${doZrobienia.length} | model: ${MODEL_OBRAZ}`)
  if (LIMIT > 0 && doZrobienia.length > LIMIT) {
    console.log(`LIMIT=${LIMIT} — biorę pierwsze ${LIMIT}.`)
    doZrobienia = doZrobienia.slice(0, LIMIT)
  }
  console.log('')

  let ok = 0, bledy = 0
  const straznik = utworzStraznika()

  for (const d of doZrobienia) {
    try {
      const styl = wybierzStyl(d.nazwa)
      process.stdout.write(`⏳ ${d.nazwa} [${styl.id}] — opis... `)
      const opis = await generujOpisWizualny(d.nazwa, d.skladniki, d.przepis)

      process.stdout.write('obraz... ')
      await wgrajZdjecie(d.nazwa, zbudujPromptObrazu(d.nazwa, d.rodzaj, opis), d.ids)
      console.log('✓')
      ok++
      await pauza(500)
    } catch (e) {
      bledy++
      console.log(`\n✗ ${d.nazwa}: ${e.message}`)
      straznik(e.message)
    }
  }

  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Wygenerowane: ${ok} | Błędy: ${bledy}`)
  if (bledy > 0) console.log('\nOdpal ponownie — pominie te, które już mają zdjęcie.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
