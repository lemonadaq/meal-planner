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

// Reguły czyszczenia są listami słów, więc z definicji nie łapią wszystkiego.
// Żeby nic się nie chowało, suchy bieg zgłasza też nazwy, których NIE ruszył,
// a które wyglądają na instrukcję. To nie jest powód do zmiany — to lista do
// obejrzenia okiem, z której biorą się kolejne reguły.
// Cechy produktu, nie instrukcje — zgłaszanie ich tylko zaszumiłoby przegląd.
// „boczek wędzony" i „tuńczyk w oleju" to jest dokładnie to, co się kupuje.
const CECHY_PRODUKTU = /\b(?:wędzon\w*|wedzon\w*|mielon\w*|suszon\w*|kiszon\w*|konserwow\w*|marynowan\w*|solon\w*|kwaszon\w*|pieczon\w*|gotowan\w*|mrożon\w*|mrozon\w*|kokosow\w*|migdałow\w*|sojow\w*|ryżow\w*|pszenn\w*|żytni\w*|gryczan\w*|jaglan\w*|owsian\w*|kukurydzian\w*|ziemniaczan\w*)\b/i

// Miejscownik = w czym produkt jest, czyli część nazwy towaru.
const PRODUKT_W_ZALEWIE = /\s(?:w|we)\s+(?:oleju|occie|zalewie|syropie|sosie|proszku|puszce|słoiku|sloiku|plasterkach|galarecie|śmietanie|smietanie|marynacie|solance|cukrze)\b/i

const PODEJRZANE_WZORCE = [
  { nazwa: 'nawias', rgx: /[([{]/ },
  { nazwa: 'alternatywa', rgx: /\b(?:lub|albo|bądź|ewentualnie)\b/i },
  {
    nazwa: 'imiesłów',
    rgx: /\b\w+(?:ony|ona|one|any|ana|ane|ęty|ęta|ęte)\b/i,
    pomin: CECHY_PRODUKTU,
  },
  {
    nazwa: 'przyimek',
    rgx: /\s(?:w|na|do|ze?)\s/i,
    pomin: PRODUKT_W_ZALEWIE,
  },
  { nazwa: 'liczba', rgx: /\d/ },
  { nazwa: 'ukośnik', rgx: /[/•;]/ },
  { nazwa: 'długa nazwa', rgx: /^(?:\S+\s+){3,}\S+$/ },
]

function czemuPodejrzana(nazwa) {
  return PODEJRZANE_WZORCE
    .filter(w => w.rgx.test(nazwa) && !(w.pomin && w.pomin.test(nazwa)))
    .map(w => w.nazwa)
}

// Przegląd całej bazy: co zostanie PO czyszczeniu, a nadal pachnie instrukcją.
// Bez tego reguły łatają tylko to, co ktoś zauważył na liście zakupów.
function raportPodejrzanych(wiersze, doZmiany) {
  const poCzyszczeniu = new Map(doZmiany.map(z => [z.id, z.nowa]))
  const podejrzane = new Map()

  for (const r of wiersze) {
    const nazwa = poCzyszczeniu.get(r.id) ?? r['Składnik']
    if (!nazwa) continue

    const powody = czemuPodejrzana(nazwa)
    if (!powody.length) continue

    if (!podejrzane.has(nazwa)) {
      podejrzane.set(nazwa, { nazwa, powody, ile: 0, przyklad: r['Danie'] })
    }
    podejrzane.get(nazwa).ile++
  }

  const wszystkieNazwy = new Set(
    wiersze.map(r => poCzyszczeniu.get(r.id) ?? r['Składnik']).filter(Boolean),
  )

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`PRZEGLĄD: różnych nazw składników po czyszczeniu: ${wszystkieNazwy.size}`)
  console.log(`Nadal wyglądają na instrukcję: ${podejrzane.size}`)
  console.log('─'.repeat(70))

  if (!podejrzane.size) {
    console.log('Nic nie zostało — reguły pokryły całą bazę.')
    return
  }

  console.log('To NIE zostanie zmienione. Lista jest do obejrzenia — z niej biorą')
  console.log('się kolejne reguły w uproscNazweSkladnika().\n')

  for (const p of [...podejrzane.values()].sort((a, b) => b.ile - a.ile)) {
    console.log(`  ${String(p.ile).padStart(3)}×  ${p.nazwa}`)
    console.log(`       [${p.powody.join(', ')}]  np. ${p.przyklad}`)
  }
}

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
    console.log('Reguły nie mają nic do poprawy.')
    // Przegląd leci mimo to — brak zmian nie znaczy, że baza jest czysta,
    // tylko że reguły nic nie złapały. To dwie różne rzeczy.
    raportPodejrzanych(wiersze, [])
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

  raportPodejrzanych(wiersze, doZmiany)

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
