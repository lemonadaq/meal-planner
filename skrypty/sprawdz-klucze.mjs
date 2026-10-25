// sprawdz-klucze.mjs
// Sprawdza, czy wszystkie cztery klucze DZIAŁAJĄ — zanim puścisz przebieg na
// 200 dań i dowiesz się po godzinie, że Anthropic odbija każde zapytanie.
//
// Każdy test jest najtańszy, jaki da się zrobić:
//   Supabase  — policzenie wierszy w `dania` (bez pobierania danych)
//   Anthropic — jedno zapytanie z max_tokens=1 (grosze); TU wychodzą
//               skończone kredyty: „credit balance is too low"
//   Replicate — GET /v1/account, nic nie generuje i nic nie kosztuje
//
//   npm run sprawdz:klucze
//   Actions → „Generuj dania" → tryb `klucze`
//
// Kończy się błędem, gdy któryś klucz nie działa — żeby w Actions było
// czerwono, a nie „zielono, ale nic nie zrobiłem".

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { MODEL_TEKST, MODEL_OBRAZ } from './wspolne.js'

const KLUCZE = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE,
  ANTHROPIC_KEY: process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  REPLICATE_KEY: process.env.REPLICATE_KEY || process.env.REPLICATE_API_TOKEN,
}

const wyniki = []
const zglos = (nazwa, ok, szczegol) => {
  wyniki.push({ nazwa, ok })
  console.log(`${ok ? '✓' : '✗'} ${nazwa.padEnd(12)} ${szczegol}`)
}

async function sprawdzSupabase() {
  if (!KLUCZE.SUPABASE_URL || !KLUCZE.SUPABASE_SERVICE_ROLE_KEY) {
    return zglos('Supabase', false, 'brak SUPABASE_URL albo SUPABASE_SERVICE_ROLE_KEY')
  }
  try {
    const supabase = createClient(KLUCZE.SUPABASE_URL, KLUCZE.SUPABASE_SERVICE_ROLE_KEY)
    const { count, error } = await supabase.from('dania').select('*', { count: 'exact', head: true })
    if (error) throw error
    zglos('Supabase', true, `baza odpowiada, ${count} wierszy w \`dania\``)
  } catch (e) {
    zglos('Supabase', false, e.message)
  }
}

async function sprawdzAnthropic() {
  if (!KLUCZE.ANTHROPIC_KEY) return zglos('Anthropic', false, 'brak ANTHROPIC_KEY')
  try {
    const klient = new Anthropic({ apiKey: KLUCZE.ANTHROPIC_KEY })
    await klient.messages.create({
      model: MODEL_TEKST,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ok' }],
    })
    zglos('Anthropic', true, `klucz działa, model ${MODEL_TEKST} odpowiada`)
  } catch (e) {
    const tresc = e?.error?.error?.message || e?.message || String(e)
    zglos('Anthropic', false, `${e?.status || '?'} — ${tresc}`)
    if (/credit balance|insufficient|quota/i.test(tresc)) {
      console.log('   → to skończone kredyty, nie zły klucz. Doładuj konto albo wpisz')
      console.log('     inny klucz w Settings → Secrets and variables → Actions → ANTHROPIC_KEY')
    } else if (e?.status === 401) {
      console.log('   → klucz nieważny (skasowany albo przepisany z literówką).')
      console.log('     Nowy: console.anthropic.com → API keys, potem Settings → Secrets')
      console.log('     and variables → Actions → ANTHROPIC_KEY (Update secret)')
    } else if (e?.status === 404) {
      console.log(`   → konto nie ma dostępu do modelu ${MODEL_TEKST}.`)
      console.log('     Podmień go zmienną ANTHROPIC_MODEL (np. claude-sonnet-5-5)')
    }
  }
}

async function sprawdzReplicate() {
  if (!KLUCZE.REPLICATE_KEY) return zglos('Replicate', false, 'brak REPLICATE_KEY')
  try {
    const res = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${KLUCZE.REPLICATE_KEY}` },
    })
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`)
    const konto = await res.json()
    zglos('Replicate', true, `konto ${konto.username || konto.name || '?'}, model ${MODEL_OBRAZ}`)
  } catch (e) {
    zglos('Replicate', false, e.message)
    console.log('   → nowy token: replicate.com → Settings → API tokens, potem')
    console.log('     Settings → Secrets and variables → Actions → REPLICATE_KEY')
  }
}

async function main() {
  console.log('Sprawdzam klucze — nic nie generuję.\n')
  await sprawdzSupabase()
  await sprawdzAnthropic()
  await sprawdzReplicate()

  const padly = wyniki.filter(w => !w.ok)
  console.log('')
  if (!padly.length) {
    console.log('Wszystko działa — można odpalać generowanie.')
    return
  }
  console.log(`Nie działa: ${padly.map(w => w.nazwa).join(', ')}`)
  console.log('Generowanie w tym stanie padnie po pierwszym daniu.')
  process.exit(1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
