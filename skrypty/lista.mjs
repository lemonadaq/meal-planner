// lista.mjs
// Tylko do CZYTANIA — wypisuje dania z bazy, nic nie zmienia i nic nie kosztuje
// (żadnego Claude'a ani Replicate, sam Supabase).
//
// Po co: z apki nie da się wygodnie wyciągnąć „pokaż mi wszystkie ulubione
// śniadania" ani „które dania nie mają zdjęcia". Tu wychodzi to jedną komendą,
// a na końcu dostajesz gotową linijkę do wklejenia w pole `dania` w akcji.
//
// FILTRY (zmienne środowiskowe, wszystkie opcjonalne, łączą się przez ORAZ):
//   RODZAJ=sniadanie    — tylko ten rodzaj
//   ULUBIONE=1          — tylko oznaczone jako ulubione
//   BEZ_ZDJECIA=1       — tylko te, którym brakuje zdjęcia
//
// LOKALNIE:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     RODZAJ=sniadanie ULUBIONE=1 node skrypty/lista.mjs

import { appendFileSync } from 'fs'
import { sprawdzKlucze, supabase, pobierzWszystkieWiersze, RODZAJE } from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

const RODZAJ = process.env.RODZAJ?.trim().toLowerCase() || ''
const ULUBIONE = process.env.ULUBIONE === '1' || process.env.ULUBIONE === 'true'
const BEZ_ZDJECIA = process.env.BEZ_ZDJECIA === '1' || process.env.BEZ_ZDJECIA === 'true'

if (RODZAJ && !RODZAJE.includes(RODZAJ)) {
  console.error(`Nieznany rodzaj "${RODZAJ}". Dozwolone: ${RODZAJE.join(', ')}`)
  process.exit(1)
}

// Dopisuje do podsumowania joba na GitHubie, żeby wynik był widoczny
// w interfejsie Actions, a nie tylko w logu.
function doPodsumowania(tekst) {
  const plik = process.env.GITHUB_STEP_SUMMARY
  if (plik) appendFileSync(plik, tekst + '\n')
}

async function main() {
  // Paginowany odczyt — `dania` to wiersz na składnik, PostgREST tnie do 1000.
  const wiersze = await pobierzWszystkieWiersze(() =>
    supabase
      .from('dania')
      .select('id, "Danie", rodzaj, kcal, czas_minuty, ulubione, zdjecie')
      .order('id'),
  )

  // Grupowanie po nazwie — jedno danie to wiele wierszy (po jednym na składnik)
  const dania = new Map()
  for (const r of wiersze) {
    const nazwa = r['Danie']
    if (!nazwa) continue
    if (!dania.has(nazwa)) {
      dania.set(nazwa, {
        nazwa, rodzaj: r.rodzaj || '', kcal: r.kcal ?? null,
        czas: r.czas_minuty ?? null, ulubione: false, maZdjecie: true,
      })
    }
    const d = dania.get(nazwa)
    // ulubione/zdjęcie mogą być ustawione tylko na części wierszy dania
    if (r.ulubione) d.ulubione = true
    if (!r.zdjecie) d.maZdjecie = false
    if (r.rodzaj) d.rodzaj = r.rodzaj
    if (d.kcal == null && r.kcal != null) d.kcal = r.kcal
    if (d.czas == null && r.czas_minuty != null) d.czas = r.czas_minuty
  }

  const wszystkie = [...dania.values()].sort((a, b) => a.nazwa.localeCompare(b.nazwa, 'pl'))
  const wynik = wszystkie.filter(d =>
    (!RODZAJ || d.rodzaj === RODZAJ) &&
    (!ULUBIONE || d.ulubione) &&
    (!BEZ_ZDJECIA || !d.maZdjecie),
  )

  const filtry = [
    RODZAJ && `rodzaj=${RODZAJ}`,
    ULUBIONE && 'tylko ulubione',
    BEZ_ZDJECIA && 'tylko bez zdjęcia',
  ].filter(Boolean).join(', ') || 'brak (wszystko)'

  console.log(`Dań w bazie: ${wszystkie.length} | filtry: ${filtry} | pasuje: ${wynik.length}\n`)
  doPodsumowania(`## Lista dań\n`)
  doPodsumowania(`Dań w bazie: **${wszystkie.length}** · filtry: _${filtry}_ · pasuje: **${wynik.length}**\n`)

  if (!wynik.length) {
    console.log('Nic nie pasuje do filtrów.')
    doPodsumowania('_Nic nie pasuje do filtrów._')
    return
  }

  const szer = Math.max(...wynik.map(d => d.nazwa.length))
  console.log('nazwa'.padEnd(szer) + '  rodzaj      kcal  czas  ulub.  zdjęcie')
  console.log('─'.repeat(szer + 40))
  doPodsumowania('| Danie | Rodzaj | kcal | czas | Ulubione | Zdjęcie |')
  doPodsumowania('| --- | --- | ---: | ---: | :---: | :---: |')

  for (const d of wynik) {
    console.log(
      d.nazwa.padEnd(szer) + '  ' +
      (d.rodzaj || '?').padEnd(10) + '  ' +
      String(d.kcal ?? '-').padStart(4) + '  ' +
      String(d.czas ?? '-').padStart(4) + '  ' +
      (d.ulubione ? '  ★  ' : '     ') + '  ' +
      (d.maZdjecie ? 'jest' : 'BRAK'),
    )
    doPodsumowania(
      `| ${d.nazwa} | ${d.rodzaj || '?'} | ${d.kcal ?? '–'} | ${d.czas ?? '–'} | ` +
      `${d.ulubione ? '★' : ''} | ${d.maZdjecie ? '✓' : '**brak**'} |`,
    )
  }

  // Gotowiec do wklejenia w pole `dania` w akcji (tryb obrazy).
  const doWklejenia = wynik.map(d => d.nazwa).join('; ')
  console.log('\n──────── DO WKLEJENIA W POLE „dania" ────────')
  console.log(doWklejenia)
  doPodsumowania('\n### Do wklejenia w pole „dania"\n')
  doPodsumowania('```\n' + doWklejenia + '\n```')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
