// lista.mjs
// Tylko do CZYTANIA — wypisuje dania z bazy, nic nie zmienia i nic nie kosztuje
// (żadnego Claude'a ani Replicate, sam Supabase).
//
// Po co: z apki nie da się wygodnie wyciągnąć „pokaż mi wszystkie ulubione
// śniadania" ani „które dania nie mają zdjęcia". Tu wychodzi to jedną komendą,
// a na końcu dostajesz gotową linijkę do wklejenia w pole `dania` w akcji.
//
// ZAPISZ_LISTE=1 — dodatkowo przepisuje LISTA_DAN.md pełnym, aktualnym stanem
// bazy (filtry tego nie dotyczą — plik zawsze opisuje całość). Na GitHubie
// workflow commituje zmieniony plik z powrotem do repo.
//
// FILTRY (zmienne środowiskowe, wszystkie opcjonalne, łączą się przez ORAZ):
//   RODZAJ=sniadanie    — tylko ten rodzaj
//   ULUBIONE=1          — tylko oznaczone jako ulubione
//   BEZ_ZDJECIA=1       — tylko te, którym brakuje zdjęcia
//
// LOKALNIE:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     RODZAJ=sniadanie ULUBIONE=1 node skrypty/lista.mjs

import { appendFileSync, writeFileSync } from 'fs'
import { sprawdzKlucze, supabase, pobierzWszystkieWiersze, RODZAJE } from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

const RODZAJ = process.env.RODZAJ?.trim().toLowerCase() || ''
const ULUBIONE = process.env.ULUBIONE === '1' || process.env.ULUBIONE === 'true'
const BEZ_ZDJECIA = process.env.BEZ_ZDJECIA === '1' || process.env.BEZ_ZDJECIA === 'true'
const ZAPISZ_LISTE = process.env.ZAPISZ_LISTE === '1' || process.env.ZAPISZ_LISTE === 'true'
const PLIK_LISTY = 'LISTA_DAN.md'

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

// Przepisuje LISTA_DAN.md — ten sam układ kolumn co dotąd, żeby plik dało się
// dalej czytać i porównywać. Bierze CAŁĄ bazę, nie przefiltrowany wynik.
function zapiszListeDan(wszystkie) {
  const dzis = new Date().toISOString().slice(0, 10)
  const szerNazwa = Math.max(5, ...wszystkie.map(d => d.nazwa.length))
  const szerRodzaj = Math.max(6, ...wszystkie.map(d => (d.rodzaj || '').length))

  const wiersz = (a, b, c, d) =>
    `| ${String(a).padEnd(szerNazwa)} | ${String(b).padEnd(szerRodzaj)} | ${String(c).padEnd(8)} | ${String(d).padEnd(4)} |`

  const perRodzaj = {}
  wszystkie.forEach(d => { perRodzaj[d.rodzaj || '?'] = (perRodzaj[d.rodzaj || '?'] || 0) + 1 })
  const rozklad = Object.entries(perRodzaj).sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r} ${n}`).join(', ')

  const tresc = [
    '# Lista dań — Menu Planer',
    '',
    `Stan bazy \`dania\` na ${dzis} (${wszystkie.length} dań) — nazwa, rodzaj, czas`,
    'przyrządzania, kcal na 1 porcję. Do przeglądu przy wymyślaniu nowych dań',
    '(unikanie dubli) i jako punkt odniesienia.',
    '',
    `Rozkład: ${rozklad}.`,
    '',
    'Odświeżenie listy: **Actions → „Generuj dania" → tryb `lista`, zaznacz',
    '`zapisz_liste`**. Workflow przepisze ten plik i zacommituje zmianę.',
    'Lokalnie: `ZAPISZ_LISTE=1 npm run lista`.',
    '',
    'Ręcznie (Supabase SQL Editor):',
    '',
    '```sql',
    'select "Danie" as danie, max(rodzaj) as rodzaj, max(czas_minuty) as czas_min, max(kcal) as kcal',
    'from dania',
    'group by "Danie"',
    'order by "Danie";',
    '```',
    '',
    wiersz('danie', 'rodzaj', 'czas_min', 'kcal'),
    `| ${'-'.repeat(szerNazwa)} | ${'-'.repeat(szerRodzaj)} | -------- | ---- |`,
    ...wszystkie.map(d => wiersz(d.nazwa, d.rodzaj || '?', d.czas ?? '-', d.kcal ?? '-')),
    '',
  ].join('\n')

  writeFileSync(PLIK_LISTY, tresc)
  console.log(`\nZapisano ${PLIK_LISTY} — ${wszystkie.length} dań.`)
  doPodsumowania(`\n_Zapisano \`${PLIK_LISTY}\` — ${wszystkie.length} dań._`)
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

  if (ZAPISZ_LISTE) zapiszListeDan(wszystkie)

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
