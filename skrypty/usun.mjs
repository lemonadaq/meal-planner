// usun.mjs
// Kasuje dania z bazy po nazwie. NIEODWRACALNE — nie ma kosza w Supabase.
//
//   DANIA="Nazwa jedna; Nazwa druga" npm run usun
//
// Bezpieczniki:
//   - kasuje WYŁĄCZNIE nazwy podane wprost w DANIA, nigdy nic po wzorcu
//   - nazwa musi pasować dokładnie; niepasujące są zgłaszane, nie zgadywane
//   - przed skasowaniem wypisuje pełną zawartość wierszy do logu, więc
//     w razie pomyłki da się danie odtworzyć z logu przebiegu
//   - ostrzega, gdy kasowane danie jest oznaczone jako ulubione
//
// Po skasowaniu warto odświeżyć listę: tryb `lista` + `zapisz_liste`.

import { sprawdzKlucze, supabase, pobierzWszystkieWiersze } from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

const nazwy = (process.env.DANIA || '')
  .split(/[\r\n;]+/).map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  // pole `dania` w akcji bywa wypełniane w formacie "Nazwa|rodzaj" — bierzemy nazwę
  .map(l => l.split('|')[0].trim())

if (!nazwy.length) {
  console.error('Brak nazw do skasowania — ustaw DANIA="Nazwa jedna; Nazwa druga".')
  console.error('Skrypt nigdy nie kasuje niczego, czego nie podano wprost.')
  process.exit(1)
}

async function main() {
  const wiersze = await pobierzWszystkieWiersze(() =>
    supabase.from('dania').select('*').order('id'),
  )

  const poNazwie = new Map()
  for (const r of wiersze) {
    if (!r['Danie']) continue
    if (!poNazwie.has(r['Danie'])) poNazwie.set(r['Danie'], [])
    poNazwie.get(r['Danie']).push(r)
  }

  console.log(`Dań w bazie: ${poNazwie.size} | do skasowania podano: ${nazwy.length}\n`)

  let skasowane = 0, wierszyRazem = 0, nieznalezione = 0
  const straty = []

  for (const nazwa of nazwy) {
    const doKasacji = poNazwie.get(nazwa)
    if (!doKasacji) {
      console.log(`⊘ "${nazwa}" — nie ma takiego dania w bazie, pomijam`)
      nieznalezione++
      continue
    }

    const ulubione = doKasacji.some(r => r.ulubione)
    console.log(`\n━━━ ${nazwa} — ${doKasacji.length} wierszy${ulubione ? '  ⚠ OZNACZONE JAKO ULUBIONE' : ''}`)
    // Pełny zrzut przed skasowaniem — jedyna kopia, z której da się odtworzyć.
    console.log(JSON.stringify(doKasacji, null, 2))

    const { error } = await supabase.from('dania').delete().in('id', doKasacji.map(r => r.id))
    if (error) {
      console.log(`✗ ${nazwa}: ${error.message}`)
      continue
    }

    console.log(`✓ skasowane: ${nazwa}`)
    skasowane++
    wierszyRazem += doKasacji.length
    straty.push(nazwa)
  }

  console.log('\n──────── PODSUMOWANIE ────────')
  console.log(`Skasowane dania: ${skasowane} (${wierszyRazem} wierszy)`)
  console.log(`Nie znaleziono:  ${nieznalezione}`)
  if (straty.length) {
    console.log(`\nSkasowano: ${straty.join('; ')}`)
    console.log('Pełna zawartość jest wyżej w logu — stamtąd da się odtworzyć.')
    console.log('Odśwież listę: tryb `lista` z zaznaczonym `zapisz_liste`.')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
