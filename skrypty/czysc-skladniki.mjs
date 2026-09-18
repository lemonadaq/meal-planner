// czysc-skladniki.mjs
// Sprowadza nazwy składników w istniejącej bazie do nazw produktów ze sklepu.
//
// Sanitizer `uproscNazweSkladnika` działa przy ZAPISIE, więc dania wygenerowane
// przed jego wprowadzeniem mają w bazie rzeczy w stylu „ryż ugotowany (najlepiej
// z dnia poprzedniego)". Ten skrypt stosuje te same reguły do tego, co już leży
// w tabeli — bez pytania Claude'a, więc bez kosztów.
//
//   npm run czysc:skladniki           # SUCHY BIEG: tylko pokazuje, co by zmienił
//   ZAPISZ=1 npm run czysc:skladniki  # faktycznie zapisuje
//
// Bezpieczniki:
//   - domyślnie NIC nie zapisuje; zapis wymaga jawnego ZAPISZ=1
//   - zmienia wyłącznie kolumnę `Składnik`, niczego nie kasuje i nie dodaje
//   - pomija zmiany, które dałyby pustą nazwę
//   - wypisuje każdą zmianę do logu, więc z przebiegu da się odtworzyć stan przed
//
// Zasady, które stoją za cięciem: skrypty/README.md → „Zasady nazw składników".

import { sprawdzKlucze, supabase, pobierzWszystkieWiersze, uproscNazweSkladnika } from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

const ZAPISZ = process.env.ZAPISZ === '1'
const PACZKA = 100

async function main() {
  // `select('*')`, a nie lista kolumn: „Składnik" ma polski znak i wielką literę,
  // więc w liście kolumn PostgREST wymagałby cudzysłowów. Reszta skryptów robi
  // tu dokładnie to samo i to jest sprawdzone.
  const wiersze = await pobierzWszystkieWiersze(() =>
    supabase.from('dania').select('*').order('id'),
  )

  const dania = new Set(wiersze.map(r => r['Danie']).filter(Boolean))
  console.log(`Wierszy w bazie: ${wiersze.length} | dań: ${dania.size}`)
  console.log(ZAPISZ ? 'TRYB: ZAPIS\n' : 'TRYB: suchy bieg (ZAPISZ=1 żeby zapisać)\n')

  const doZmiany = []
  const pominiete = []

  for (const r of wiersze) {
    const stara = r['Składnik']
    if (!stara) continue

    const nowa = uproscNazweSkladnika(stara)
    if (nowa === stara) continue

    // Nie zapisujemy pustki ani samej interpunkcji — lepiej brzydka nazwa
    // niż pusty wiersz na liście zakupów.
    if (!nowa.trim()) {
      pominiete.push({ danie: r['Danie'], stara })
      continue
    }

    doZmiany.push({ id: r.id, danie: r['Danie'], stara, nowa })
  }

  if (!doZmiany.length && !pominiete.length) {
    console.log('Nic do poprawy — wszystkie nazwy są już nazwami produktów.')
    return
  }

  // Grupujemy po parze stara→nowa: ta sama poprawka wraca w wielu daniach
  // i log czytelniejszy, gdy widać ją raz z licznikiem.
  const wgZmiany = new Map()
  for (const z of doZmiany) {
    const klucz = `${z.stara}${z.nowa}`
    if (!wgZmiany.has(klucz)) wgZmiany.set(klucz, { stara: z.stara, nowa: z.nowa, ile: 0 })
    wgZmiany.get(klucz).ile++
  }

  const posortowane = [...wgZmiany.values()].sort((a, b) => b.ile - a.ile)

  console.log(`Do poprawy: ${doZmiany.length} wierszy, ${posortowane.length} różnych zmian\n`)
  for (const z of posortowane) {
    console.log(`  ${String(z.ile).padStart(3)}×  ${z.stara}`)
    console.log(`       └─ ${z.nowa}`)
  }

  if (pominiete.length) {
    console.log(`\nPominięte (czyszczenie dałoby pustą nazwę): ${pominiete.length}`)
    for (const p of pominiete.slice(0, 20)) console.log(`  ${p.danie}: ${p.stara}`)
  }

  if (!ZAPISZ) {
    console.log('\nSuchy bieg — nic nie zapisano. Powtórz z ZAPISZ=1, jeśli to wygląda dobrze.')
    return
  }

  console.log(`\nZapisuję ${doZmiany.length} wierszy...`)
  let zapisane = 0

  for (let i = 0; i < doZmiany.length; i += PACZKA) {
    const paczka = doZmiany.slice(i, i + PACZKA)

    // Aktualizacja po id, pojedynczo — `upsert` wymagałby kompletnego wiersza,
    // a my świadomie ruszamy jedną kolumnę.
    for (const z of paczka) {
      const { error } = await supabase
        .from('dania')
        .update({ 'Składnik': z.nowa })
        .eq('id', z.id)

      if (error) {
        console.error(`  ✗ ${z.danie} / ${z.stara}: ${error.message}`)
        continue
      }
      zapisane++
    }

    console.log(`  ${Math.min(i + PACZKA, doZmiany.length)}/${doZmiany.length}`)
  }

  console.log(`\nGotowe. Poprawionych wierszy: ${zapisane}/${doZmiany.length}`)
  if (zapisane < doZmiany.length) {
    console.log('Część się nie zapisała — patrz błędy wyżej. Skrypt można odpalić ponownie.')
  }
}

main().catch(e => {
  console.error(`\nBłąd: ${e.message}`)
  process.exit(1)
})
