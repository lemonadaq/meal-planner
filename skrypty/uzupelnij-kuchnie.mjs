// uzupelnij-kuchnie.mjs
// Dopisuje `kuchnia` i `poziom` daniom, które są już w bazie.
// Migracja: migracja_kuchnia_poziom.sql
//
// Nowe dania dostają te pola od razu przy generowaniu (schemat w wspolne.js),
// ale 593 dania sprzed tej zmiany mają puste kolumny i wypadłyby z filtrów.
//
// Pytamy Claude'a PARTIAMI po ~40 dań w jednym zapytaniu — 593 osobne
// zapytania kosztowałyby kilkanaście razy więcej za dokładnie ten sam wynik.
//
//   npm run kuchnie            # SUCHY BIEG: pokazuje, co przypisze
//   ZAPISZ=1 npm run kuchnie   # zapisuje do bazy
//   LIMIT=40 npm run kuchnie   # tylko pierwsze N dań (bezpiecznik na koszty)
//
// Skrypt jest wznawialny: bierze wyłącznie dania z pustą kuchnią lub pustym
// poziomem, więc po błędzie wystarczy odpalić ponownie.

import {
  sprawdzKlucze, supabase, pobierzWszystkieWiersze,
  pytajClaudeSchematem, KUCHNIE, POZIOMY, utworzStraznika,
} from './wspolne.js'

sprawdzKlucze(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_KEY'])

const ZAPISZ = process.env.ZAPISZ === '1'
const LIMIT = Number(process.env.LIMIT || '0')
const PACZKA = 40

const SCHEMAT = {
  type: 'object',
  properties: {
    dania: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nazwa: { type: 'string', description: 'Nazwa dania DOKŁADNIE taka, jak podana na wejściu' },
          kuchnia: { type: 'string', enum: KUCHNIE },
          poziom: { type: 'string', enum: POZIOMY },
        },
        required: ['nazwa', 'kuchnia', 'poziom'],
        additionalProperties: false,
      },
    },
  },
  required: ['dania'],
  additionalProperties: false,
}

function zbudujPrompt(paczka) {
  const lista = paczka
    .map(d => `- ${d.nazwa}${d.czas ? ` (${d.czas} min)` : ''}`)
    .join('\n')

  return (
    'Przypisz każdemu daniu kuchnię pochodzenia i poziom trudności.\n\n' +
    'Zasady:\n' +
    '- `kuchnia` to kraj pochodzenia DANIA, nie pochodzenie składników. ' +
    'Schabowy to polska, tteokbokki to koreanska, carbonara to wloska. ' +
    'Danie bez wyraźnego rodowodu (omlet, kanapka, sałatka z tuńczykiem) → miedzynarodowa.\n' +
    '- `poziom` oceniaj z perspektywy kogoś, kto gotuje w domu po pracy: ' +
    '`latwe` to do pół godziny i bez technik, `srednie` to zwykły obiad z kilkoma krokami, ' +
    '`trudne` to długie wyrastanie, smażenie w głębokim tłuszczu, praca z ciastem ' +
    'albo kilka rzeczy naraz.\n' +
    '- Podany czas przygotowania jest wskazówką, ale nie przesądza: szarlotka ' +
    'piecze się długo i jest średnia, a rozbijanie majonezu jest szybkie i trudne.\n' +
    '- Nazwy przepisz DOKŁADNIE tak, jak je podano — po nich dopasowuję wiersze.\n\n' +
    `Dania (${paczka.length}):\n${lista}`
  )
}

async function main() {
  const wiersze = await pobierzWszystkieWiersze(() =>
    supabase.from('dania').select('*').order('id'),
  )

  // `dania` to wiersz na składnik — grupujemy do poziomu dania.
  const poNazwie = new Map()
  for (const r of wiersze) {
    const nazwa = r['Danie']
    if (!nazwa) continue
    if (!poNazwie.has(nazwa)) {
      poNazwie.set(nazwa, { nazwa, czas: r.czas_minuty, kuchnia: r.kuchnia, poziom: r.poziom })
    }
  }

  const wszystkie = [...poNazwie.values()]
  let doZrobienia = wszystkie.filter(d => !d.kuchnia || !d.poziom)
  if (LIMIT > 0) doZrobienia = doZrobienia.slice(0, LIMIT)

  console.log(`Dań w bazie: ${wszystkie.length}`)
  console.log(`Z wypełnioną kuchnią i poziomem: ${wszystkie.length - wszystkie.filter(d => !d.kuchnia || !d.poziom).length}`)
  console.log(`Do uzupełnienia: ${doZrobienia.length}`)
  console.log(ZAPISZ ? 'TRYB: ZAPIS\n' : 'TRYB: suchy bieg (ZAPISZ=1 żeby zapisać)\n')

  if (!doZrobienia.length) {
    console.log('Nie ma czego uzupełniać.')
    return
  }

  const zglos = utworzStraznika(3)
  const wyniki = []

  for (let i = 0; i < doZrobienia.length; i += PACZKA) {
    const paczka = doZrobienia.slice(i, i + PACZKA)
    const numer = Math.floor(i / PACZKA) + 1
    const ile = Math.ceil(doZrobienia.length / PACZKA)

    console.log(`Paczka ${numer}/${ile} (${paczka.length} dań)...`)

    try {
      const odpowiedz = await pytajClaudeSchematem(zbudujPrompt(paczka), SCHEMAT)
      const wgNazwy = new Map((odpowiedz.dania || []).map(d => [d.nazwa, d]))

      for (const danie of paczka) {
        const wynik = wgNazwy.get(danie.nazwa)
        if (!wynik) {
          console.warn(`  ⚠ brak odpowiedzi dla: ${danie.nazwa}`)
          continue
        }
        wyniki.push({ nazwa: danie.nazwa, kuchnia: wynik.kuchnia, poziom: wynik.poziom })
      }
    } catch (e) {
      console.error(`  ✗ paczka ${numer}: ${e.message}`)
      zglos(e.message)
    }
  }

  // Podsumowanie — po nim widać, czy podział ma sens, zanim cokolwiek zapiszemy.
  const wgKuchni = {}
  const wgPoziomu = {}
  for (const w of wyniki) {
    wgKuchni[w.kuchnia] = (wgKuchni[w.kuchnia] || 0) + 1
    wgPoziomu[w.poziom] = (wgPoziomu[w.poziom] || 0) + 1
  }

  console.log(`\nPrzypisano: ${wyniki.length}/${doZrobienia.length}`)
  console.log('\nWedług kuchni:')
  for (const [k, n] of Object.entries(wgKuchni).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${n}`)
  }
  console.log('\nWedług poziomu:')
  for (const [k, n] of Object.entries(wgPoziomu).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(18)} ${n}`)
  }

  console.log('\nPrzykłady:')
  for (const w of wyniki.slice(0, 15)) {
    console.log(`  ${w.nazwa.slice(0, 44).padEnd(46)} ${w.kuchnia.padEnd(16)} ${w.poziom}`)
  }

  if (!ZAPISZ) {
    console.log('\nSuchy bieg — nic nie zapisano. Powtórz z ZAPISZ=1, jeśli to wygląda dobrze.')
    return
  }

  console.log(`\nZapisuję ${wyniki.length} dań...`)
  let zapisane = 0

  for (const w of wyniki) {
    // Aktualizacja po nazwie — dotyka WSZYSTKICH wierszy dania, czyli każdego
    // jego składnika. Tak samo trzymane są tam `rodzaj` i `czas_minuty`.
    const { error } = await supabase
      .from('dania')
      .update({ kuchnia: w.kuchnia, poziom: w.poziom })
      .eq('"Danie"', w.nazwa)

    if (error) {
      console.error(`  ✗ ${w.nazwa}: ${error.message}`)
      continue
    }
    zapisane++
    if (zapisane % 50 === 0) console.log(`  ${zapisane}/${wyniki.length}`)
  }

  console.log(`\nGotowe. Zapisanych dań: ${zapisane}/${wyniki.length}`)
}

main().catch(e => {
  console.error(`\nBłąd: ${e.message}`)
  process.exit(1)
})
