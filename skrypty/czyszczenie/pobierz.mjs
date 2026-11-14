// Faza 0 — rozpoznanie i zrzut danych do skrypty/czyszczenie/dane/.
// TYLKO CZYTA. Nic nie zapisuje do bazy.
//
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE=... node skrypty/czyszczenie/pobierz.mjs
//
// Klucz: SUPABASE_SERVICE (albo SUPABASE_SERVICE_ROLE_KEY, jak w skrypty/).
// Bez zależności — czyste fetch do PostgREST, więc nie trzeba npm install.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL_BAZY = (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const KLUCZ = process.env.SUPABASE_SERVICE || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_BAZY || !KLUCZ) {
  console.error('Brak SUPABASE_URL albo SUPABASE_SERVICE w zmiennych środowiskowych.')
  process.exit(1)
}

const KATALOG = join(dirname(fileURLToPath(import.meta.url)), 'dane')
mkdirSync(KATALOG, { recursive: true })

// Authorization tylko dla klucza w formacie JWT (stary service_role).
// Nowe klucze sb_secret_… (i placeholder pod proxy) idą samym nagłówkiem apikey.
const NAGLOWKI = KLUCZ.startsWith('eyJ')
  ? { apikey: KLUCZ, Authorization: `Bearer ${KLUCZ}` }
  : { apikey: KLUCZ }

async function pobierzJson(sciezka, extra = {}) {
  const r = await fetch(`${URL_BAZY}/rest/v1/${sciezka}`, { headers: { ...NAGLOWKI, ...extra } })
  if (!r.ok) throw new Error(`${sciezka}: HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

// PostgREST tnie odpowiedź do 1000 wierszy — dociągamy stronami.
async function pobierzTabele(tabela, kolumny = '*', order = '') {
  const STRONA = 1000
  let od = 0
  const wiersze = []
  for (;;) {
    const q = `${tabela}?select=${encodeURIComponent(kolumny)}${order ? `&order=${order}` : ''}`
    const strona = await pobierzJson(q, { Range: `${od}-${od + STRONA - 1}`, 'Range-Unit': 'items' })
    wiersze.push(...strona)
    if (strona.length < STRONA) break
    od += STRONA
  }
  return wiersze
}

function zapisz(nazwa, dane) {
  writeFileSync(join(KATALOG, nazwa), JSON.stringify(dane, null, 2))
  console.log(`  → dane/${nazwa} (${Array.isArray(dane) ? dane.length + ' wierszy' : 'obiekt'})`)
}

// ── 1. Schemat public z OpenAPI PostgREST ──
console.log('Schemat public…')
const openapi = await pobierzJson('')
const schemat = {}
for (const [tabela, def] of Object.entries(openapi.definitions || {})) {
  schemat[tabela] = Object.fromEntries(
    Object.entries(def.properties || {}).map(([k, v]) => [k, v.format || v.type])
  )
}
zapisz('schemat.json', schemat)

// Kolumny, które MOGĄ trzymać nazwę dania albo składnika jako tekst.
const PODEJRZANE = /danie|dodat|surowk|podmian|skladnik|składnik|nazwa|klucz|alias|przepis|produkt/i
console.log('\nKolumny tekstowe/jsonb, które mogą trzymać nazwy:')
for (const [tabela, kol] of Object.entries(schemat)) {
  const trafienia = Object.entries(kol)
    .filter(([k, typ]) => PODEJRZANE.test(k) && /text|char|json|array/i.test(String(typ)))
    .map(([k, typ]) => `${k} (${typ})`)
  if (trafienia.length) console.log(`  ${tabela}: ${trafienia.join(', ')}`)
}

// ── 2. Pełne dania ──
console.log('\nDania…')
const dania = await pobierzTabele('dania', '*', 'id')
zapisz('dania.json', dania)

// ── 3. skladniki_meta ──
console.log('skladniki_meta…')
zapisz('skladniki_meta.json', await pobierzTabele('skladniki_meta', '*'))

// ── 4. Tabele zależne od nazw — zrzut całości, żeby Faza 4 policzyła wpływ ──
const ZALEZNE = ['kalendarz', 'plan_tygodnia', 'preferencje_sygnaly', 'korekty_zakupow',
  'zakupy_historia', 'zakupy_cykliczne', 'produkty_w_domu', 'wpisy']
const liczby = {}
for (const t of ZALEZNE) {
  if (!schemat[t]) { console.log(`${t}: brak w schemacie, pomijam`); continue }
  try {
    const w = await pobierzTabele(t, '*')
    liczby[t] = w.length
    zapisz(`${t}.json`, w)
  } catch (e) {
    console.log(`${t}: ${e.message}`)
  }
}

// ── 5. Raport ──
const nazwyDan = new Set(dania.map(d => d.Danie))
const skl = dania.map(d => (d['Składnik'] || '').trim()).filter(Boolean)
console.log('\n══ RAPORT ══')
console.log(`dania: ${nazwyDan.size} dań, ${dania.length} wierszy`)
console.log(`składniki: ${new Set(skl).size} nazw (${new Set(skl.map(s => s.toLowerCase())).size} bez wielkości liter)`)
console.log(`jednostki: ${[...new Set(dania.map(d => d.Jednostka ?? ''))].sort().join(' | ')}`)
for (const [t, n] of Object.entries(liczby)) console.log(`${t}: ${n} wierszy`)
const dzis = new Date().toISOString().slice(0, 10)
if (schemat.kalendarz) {
  const kal = JSON.parse(JSON.stringify(await pobierzTabele('kalendarz', 'danie,data')))
  const sieroty = kal.filter(k => k.danie && !nazwyDan.has(k.danie))
  console.log(`kalendarz: ${sieroty.length} wierszy z daniem spoza dania (sieroty już dziś), od ${dzis}: ${sieroty.filter(k => k.data >= dzis).length}`)
}
