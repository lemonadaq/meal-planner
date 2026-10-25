// generuj-auto.mjs
// TRYB `auto`: podajesz LICZBĘ dań, resztę robi skrypt.
//
// Claude wymyśla nazwy (z rozbiciem na kuchnie i rodzaje), odsiewamy duble
// względem bazy, a potem każde danie idzie standardową ścieżką z potok.js:
// przepis → INSERT → zdjęcie → Storage. Czyli to samo, co tryb `wszystko`,
// tylko bez ręcznego wypisywania nazw w polu `dania`.
//
// Dwa bezpieczniki od dubli:
//   1. nazwy dań z bazy idą do promptu (blok systemowy z cache'em) — model ma
//      ich nie proponować
//   2. to, co i tak zaproponuje, przechodzi przez miarę podobieństwa nazw
//      (podobienstwo.js) — ta sama, którą liczy `npm run duble`
//
// Składniki są ujednolicane ze stanem bazy (slownik.js): nazwa i jednostka,
// które w bazie już są, wchodzą w tej samej postaci.
//
// ZMIENNE:
//   ILE=50                    ile dań dodać (wymagane)
//   TYLKO_PROPOZYCJE=1        tylko wypisz propozycje, nic nie generuj
//   BEZ_ZDJEC=1               same przepisy, bez kosztów Replicate
//   KUCHNIE_PLAN="polska:3, wloska:2"    własny rozkład kuchni
//   RODZAJE_PLAN="obiad:3, zupa:1"       własny rozkład rodzajów
//   PROG=0.6                  czułość odsiewania dubli (wyżej = mniej odsiewa)
//
// LOKALNIE:
//   ILE=10 npm run generuj:auto
// NA GITHUBIE: Actions → "Generuj dania" → tryb `auto`, pole `ile`

import {
  sprawdzKlucze, pobierzNazwyDan, pobierzSlownikSkladnikow, proponujDania,
  MODEL_TEKST, MODEL_OBRAZ, RODZAJE, KUCHNIE,
} from './wspolne.js'
import { przetworzDania, wypiszPodsumowanie } from './potok.js'
import { zbudujIndeks } from './podobienstwo.js'
import {
  PLAN_KUCHNI, PLAN_RODZAJOW, parsujPlan, zbudujPlan, podzielZadanie,
  odfiltrujPropozycje, liniaDania, nazwyDoPromptu,
} from './propozycje.js'

const ILE = parseInt(process.env.ILE || '0', 10)
const TYLKO_PROPOZYCJE = ['1', 'true'].includes((process.env.TYLKO_PROPOZYCJE || '').toLowerCase())
const BEZ_ZDJEC = ['1', 'true'].includes((process.env.BEZ_ZDJEC || '').toLowerCase())
const PROG = parseFloat(process.env.PROG || '0.6')
const PACZKA = parseInt(process.env.PACZKA || '25', 10)
const RUNDY = 3

if (!ILE || ILE < 1) {
  console.error('Podaj ILE — ile dań dodać. Np. ILE=50 npm run generuj:auto')
  process.exit(1)
}

sprawdzKlucze([
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY',
  ...(BEZ_ZDJEC || TYLKO_PROPOZYCJE ? [] : ['REPLICATE_KEY']),
])

let wagiKuchni, wagiRodzajow
try {
  wagiKuchni = parsujPlan(process.env.KUCHNIE_PLAN, KUCHNIE) || PLAN_KUCHNI
  wagiRodzajow = parsujPlan(process.env.RODZAJE_PLAN, RODZAJE) || PLAN_RODZAJOW
} catch (e) {
  console.error(`Zły plan: ${e.message}`)
  process.exit(1)
}

// ── Propozycje nazw ───────────────────────────────────────────────
async function wymyslDania(plan, nazwyWBazie) {
  // Indeks rośnie w trakcie: każde przyjęte danie zasila odsiewanie kolejnych,
  // żeby druga kuchnia nie dostała tego samego dania pod inną nazwą.
  const indeks = zbudujIndeks(nazwyWBazie)
  const wszystkie = []
  const blokSystemowy =
    'JUŻ W BAZIE — tych dań NIE proponuj, ani ich odmian pod inną nazwą:\n\n' +
    nazwyDoPromptu(nazwyWBazie).join('\n')

  for (const zadanie of plan) {
    const cel = zadanie.ile
    let wTejKuchni = 0

    for (const paczka of podzielZadanie(zadanie.rodzaje, PACZKA)) {
      let doZrobienia = { ...paczka }
      const odrzuconeNazwy = []

      for (let runda = 1; runda <= RUNDY; runda++) {
        const brakuje = Object.values(doZrobienia).reduce((s, n) => s + n, 0)
        if (brakuje <= 0) break

        const surowe = await proponujDania({
          kuchnia: zadanie.kuchnia,
          rodzaje: doZrobienia,
          blokSystemowy,
          unikaj: [...odrzuconeNazwy, ...wszystkie.map(d => d.nazwa)].slice(-300),
        })
        const { przyjete, odrzucone } = odfiltrujPropozycje(surowe, indeks, {
          prog: PROG,
          rodzajeOk: Object.keys(wagiRodzajow),
        })
        odrzuconeNazwy.push(...odrzucone.map(o => o.nazwa))

        // Bierzemy tylko tyle, ile w tej paczce jeszcze brakuje danego rodzaju —
        // model lubi dosypać ponad plan.
        for (const danie of przyjete) {
          if (!doZrobienia[danie.rodzaj]) continue
          doZrobienia[danie.rodzaj]--
          wszystkie.push(danie)
          indeks.push(...zbudujIndeks([danie.nazwa]))
          wTejKuchni++
        }

        const nadal = Object.values(doZrobienia).reduce((s, n) => s + n, 0)
        console.log(
          `  ${zadanie.kuchnia} runda ${runda}: +${przyjete.length} przyjęte, ` +
          `${odrzucone.length} odsiane${nadal ? `, brakuje ${nadal}` : ''}`,
        )
        for (const o of odrzucone) console.log(`     ⊘ ${o.nazwa} — ${o.powod}`)
      }
    }

    console.log(`${zadanie.kuchnia}: ${wTejKuchni}/${cel} dań\n`)
  }

  return wszystkie
}

async function main() {
  const wBazie = await pobierzNazwyDan()
  const plan = zbudujPlan(ILE, { wagiKuchni, wagiRodzajow })

  console.log(`Cel: ${ILE} nowych dań | w bazie: ${wBazie.length} | model: ${MODEL_TEKST}`)
  console.log('Plan: ' + plan.map(z => `${z.kuchnia} ${z.ile}`).join(', '))
  console.log('Rodzaje: ' + Object.entries(wagiRodzajow).map(([r, w]) => `${r} ${w}`).join(', ') + '\n')

  const dania = await wymyslDania(plan, wBazie.map(d => d.nazwa))

  console.log('──────── PROPOZYCJE ────────')
  for (const d of dania) console.log(`  ${d.nazwa}|${d.rodzaj}   (${d.kuchnia || '?'})`)
  console.log(`\nRazem: ${dania.length} z ${ILE} zaplanowanych`)
  console.log('\nDo wklejenia w pole `dania` (tryb `wszystko`):')
  console.log(liniaDania(dania))

  if (!dania.length) {
    console.log('\nNie ma czego generować — model nie wymyślił nic nowego.')
    console.log('Baza jest już gęsta: poluzuj PROG albo zawęź KUCHNIE_PLAN/RODZAJE_PLAN.')
    return
  }

  if (TYLKO_PROPOZYCJE) {
    console.log('\nTYLKO_PROPOZYCJE=1 — nic nie generuję. Przejrzyj listę i odpal tryb')
    console.log('`auto` bez tej opcji albo `wszystko` z wklejoną linijką wyżej.')
    return
  }

  const { slownik, tekst } = await pobierzSlownikSkladnikow()
  console.log(
    `\n──────── GENEROWANIE ────────\n` +
    `Obraz: ${BEZ_ZDJEC ? 'POMINIĘTY (BEZ_ZDJEC=1)' : MODEL_OBRAZ} | ` +
    `słownik składników: ${slownik.size}\n`,
  )

  const stat = await przetworzDania(dania, {
    slownik, blokSystemowy: tekst, bezZdjec: BEZ_ZDJEC,
  })
  wypiszPodsumowanie(stat, { bezZdjec: BEZ_ZDJEC })

  if (BEZ_ZDJEC && stat.nowe > 0) console.log('\nZdjęcia: tryb `obrazy` (puste pole `dania`)')
  if (stat.nowe > 0) console.log('Odśwież LISTA_DAN.md: tryb `lista` + `zapisz_liste`')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
