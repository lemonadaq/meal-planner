// wspolne.js
// Wspólna warstwa dla skryptów generujących: klucze, Supabase, Claude,
// Replicate, upload do Storage. Żadnych kluczy w kodzie — wszystko z env
// (lokalnie z powłoki, na GitHubie z Actions secrets).

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Klucze ────────────────────────────────────────────────────────
// Główne nazwy = te, które są w GitHub Secrets. Standardowe nazwy SDK
// (ANTHROPIC_API_KEY, REPLICATE_API_TOKEN) działają jako alias, żeby lokalnie
// zadziałało jedno i drugie.
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
const REPLICATE_KEY = process.env.REPLICATE_KEY || process.env.REPLICATE_API_TOKEN

export const BUCKET = 'dania-zdjecia'
export const PORCJE_BAZOWE = 4

// Model tekstowy — do przepisów. Podmiana przez env, bez ruszania kodu.
export const MODEL_TEKST = process.env.ANTHROPIC_MODEL || 'claude-opus-5'
// Model obrazu na Replicate — patrz MODELE_OBRAZU niżej.
export const MODEL_OBRAZ = process.env.REPLICATE_MODEL || 'black-forest-labs/flux-2-pro'

// Rodzaje dań, które rozumie apka (Dania.jsx / Kalendarz.jsx / useSloty.js).
// Cokolwiek spoza tej listy wpadnie do bazy i zniknie z filtrów.
export const RODZAJE = [
  'sniadanie', 'obiad', 'kolacja', 'zupa', 'przekaska',
  'deser', 'dodatek', 'surowka',
]

export const KATEGORIE = [
  '1_Warzywa i owoce', '2_Mięso i ryby', '3_Nabiał', '4_Pieczywo',
  '5_Produkty sypkie', '6_Konserwy i słoiki', '7_Przyprawy', '8_Inne',
]

// Sprawdza klucze potrzebne dla danego skryptu. Wywołane na starcie —
// lepiej wywalić się od razu niż po 40 daniach.
export function sprawdzKlucze(potrzebne) {
  const dostepne = {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE,
    ANTHROPIC_KEY,
    REPLICATE_KEY,
  }
  const brakuje = potrzebne.filter(k => !dostepne[k])
  if (brakuje.length) {
    console.error(`Brak kluczy: ${brakuje.join(', ')}`)
    console.error('Lokalnie: export SUPABASE_URL=... (itd.)')
    console.error('Na GitHubie: Settings → Secrets and variables → Actions')
    process.exit(1)
  }
}

// Klienci powstają leniwie, przy pierwszym użyciu. Gdyby createClient leciał
// na poziomie modułu, wywalałby się przy imporcie — czyli ZANIM sprawdzKlucze()
// zdąży powiedzieć po ludzku, którego klucza brakuje.
let _supabase = null
export const supabase = new Proxy({}, {
  get(_cel, pole) {
    if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const wartosc = _supabase[pole]
    return typeof wartosc === 'function' ? wartosc.bind(_supabase) : wartosc
  },
})

let _anthropic = null
function klientAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
  return _anthropic
}

// ── Pomocnicze ────────────────────────────────────────────────────
export function slug(s) {
  return s.toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e').replace(/ł/g, 'l')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's').replace(/[żź]/g, 'z')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export const pauza = ms => new Promise(r => setTimeout(r, ms))

// Ponawianie z narastającym odstępem. Domyślnie łapie limity (429) i 5xx.
async function ponow(nazwaOperacji, fn, proby = 4) {
  for (let i = 0; i < proby; i++) {
    try {
      return await fn()
    } catch (e) {
      const kod = e?.status ?? e?.kodHttp
      const doPonowienia = kod === 429 || kod === 408 || (kod >= 500 && kod < 600)
      if (!doPonowienia || i === proby - 1) throw e
      const czekaj = 2000 * 2 ** i
      console.log(`  ↻ ${nazwaOperacji}: ${kod}, ponawiam za ${czekaj / 1000}s`)
      await pauza(czekaj)
    }
  }
}

// ── Supabase: paginowany odczyt ───────────────────────────────────
// PostgREST tnie odpowiedź do 1000 wierszy, a `dania` to wiersz na składnik
// (~2500+). Bez tego skrypt widzi arbitralny kawałek bazy — dokładnie ten sam
// problem, który w apce rozwiązuje src/pobierzWszystko.js.
export async function pobierzWszystkieWiersze(budujZapytanie, strona = 1000) {
  let od = 0
  let wszystkie = []
  while (true) {
    const { data, error } = await budujZapytanie().range(od, od + strona - 1)
    if (error) throw error
    if (!data?.length) break
    wszystkie = wszystkie.concat(data)
    if (data.length < strona) break
    od += strona
  }
  return wszystkie
}

// ── Claude: przepis + opis wizualny ───────────────────────────────
// output_config.format wymusza schemat po stronie API — nie ma już czyszczenia
// ```json ani JSON.parse, który wybucha raz na dwadzieścia dań.
const SCHEMAT_PRZEPISU = {
  type: 'object',
  properties: {
    czas_minuty: { type: 'integer', description: 'Szacowany czas przygotowania w minutach' },
    kcal: { type: 'integer', description: 'Kalorie na JEDNĄ porcję' },
    skladniki: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nazwa: { type: 'string' },
          ilosc: { type: 'string', description: "Ilość NA 1 PORCJĘ jako tekst, np. '100' albo '1/2'" },
          jednostka: { type: 'string', enum: ['g', 'ml', 'szt', 'łyżka', 'łyżeczka', 'szczypta'] },
          kategoria: { type: 'string', enum: KATEGORIE },
        },
        required: ['nazwa', 'ilosc', 'jednostka', 'kategoria'],
        additionalProperties: false,
      },
      minItems: 4,
      maxItems: 12,
    },
    kroki: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 8,
      description: 'Krótkie konkretne kroki po polsku, BEZ numeracji w treści',
    },
    opis_wizualny: {
      type: 'string',
      description:
        'Po ANGIELSKU, 1-2 zdania: co konkretnie widać na talerzu — kolory, tekstury, ' +
        'podanie, dodatki. Sam jedzenie, BEZ opisu stylu fotografii, światła i tła.',
    },
  },
  required: ['czas_minuty', 'kcal', 'skladniki', 'kroki', 'opis_wizualny'],
  additionalProperties: false,
}

async function pytajClaude(tresc, schemat) {
  const odpowiedz = await ponow('Claude', () =>
    klientAnthropic().messages.create({
      model: MODEL_TEKST,
      max_tokens: 8000,
      // Proste generowanie strukturalne — niski effort tnie koszt bez straty jakości.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schemat } },
      messages: [{ role: 'user', content: tresc }],
    }),
  )
  if (odpowiedz.stop_reason === 'refusal') {
    throw new Error(`Claude odmówił: ${odpowiedz.stop_details?.explanation || 'bez powodu'}`)
  }
  const tekst = odpowiedz.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return JSON.parse(tekst)
}

export async function generujPrzepis(nazwa, rodzaj) {
  return pytajClaude(
    `Jesteś polskim kucharzem. Wygeneruj przepis na danie: "${nazwa}" (rodzaj: ${rodzaj}).\n\n` +
      'Zasady:\n' +
      '- Ilości podaj NA 1 PORCJĘ, nie na całość.\n' +
      '- Kroki krótkie i konkretne, po polsku.\n' +
      '- kcal to kalorie na jedną porcję.\n' +
      '- Przepis ma być realistyczny dla domowej kuchni, bez restauracyjnych udziwnień.',
    SCHEMAT_PRZEPISU,
  )
}

// Dla dania, które JUŻ MA przepis w bazie — dogenerowujemy sam opis wizualny,
// żeby zdjęcie zgadzało się ze składnikami, które Filip już ma.
const SCHEMAT_OPISU = {
  type: 'object',
  properties: { opis_wizualny: { type: 'string' } },
  required: ['opis_wizualny'],
  additionalProperties: false,
}

export async function generujOpisWizualny(nazwa, skladniki, przepis) {
  const lista = skladniki.map(s => `- ${s.nazwa}: ${s.ilosc} ${s.jednostka}`).join('\n')
  const { opis_wizualny } = await pytajClaude(
    `Jesteś fotografem jedzenia. Danie "${nazwa}", składniki:\n${lista}\n` +
      (przepis ? `\nPrzepis:\n${przepis}\n` : '') +
      '\nOpisz po ANGIELSKU w 1-2 zdaniach, co konkretnie widać na talerzu — kolory, tekstury, ' +
      'podanie, dodatki. Opisz samo jedzenie, BEZ stylu fotografii, światła i tła.',
    SCHEMAT_OPISU,
  )
  return opis_wizualny
}

// ── Replicate: generowanie obrazu ─────────────────────────────────
// Każdy model ma własny kształt inputu. Domyślny flux-2-pro jest sprawdzony;
// reszta to gotowe alternatywy do podmiany przez REPLICATE_MODEL.
const MODELE_OBRAZU = {
  'black-forest-labs/flux-2-pro': p => ({
    prompt: p, aspect_ratio: '4:3', output_format: 'jpg', output_quality: 90, safety_tolerance: 2,
  }),
  'black-forest-labs/flux-2-max': p => ({
    prompt: p, aspect_ratio: '4:3', output_format: 'jpg', output_quality: 90, safety_tolerance: 2,
  }),
  'google/nano-banana-2': p => ({
    prompt: p, aspect_ratio: '4:3', output_format: 'jpg', resolution: '2K',
  }),
  'google/imagen-4-ultra': p => ({ prompt: p, aspect_ratio: '4:3' }),
}

async function generujObraz(prompt) {
  const budujInput = MODELE_OBRAZU[MODEL_OBRAZ] || (p => ({ prompt: p, aspect_ratio: '4:3' }))

  const start = await ponow('Replicate start', async () => {
    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL_OBRAZ}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REPLICATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: budujInput(prompt) }),
    })
    if (!res.ok) {
      const blad = new Error(`Replicate start ${res.status}: ${await res.text()}`)
      blad.kodHttp = res.status
      throw blad
    }
    return res.json()
  })

  const urlPolling = start.urls?.get || `https://api.replicate.com/v1/predictions/${start.id}`
  for (let i = 0; i < 60; i++) {
    await pauza(3000)
    const res = await fetch(urlPolling, { headers: { Authorization: `Bearer ${REPLICATE_KEY}` } })
    const p = await res.json()
    if (p.status === 'succeeded') {
      const url = Array.isArray(p.output) ? p.output[0] : p.output
      if (!url) throw new Error('Replicate: brak URL w odpowiedzi')
      return url
    }
    if (p.status === 'failed' || p.status === 'canceled') {
      throw new Error(`Replicate: ${p.status} — ${p.error || 'nieznany błąd'}`)
    }
  }
  throw new Error('Replicate: timeout, predykcja trwała ponad 3 minuty')
}

// ── Storage: wgranie zdjęcia i podpięcie do wszystkich wierszy dania ──
// Ścieżka z timestampem — jak w apce (DanieDetail.jsx). Stała nazwa pliku
// z upsert:true powodowała, że po regeneracji CDN i przeglądarki dalej
// serwowały stary obraz spod tego samego URL-a.
export async function wgrajZdjecie(nazwa, promptObrazu, ids) {
  const obrazUrl = await generujObraz(promptObrazu)

  const res = await fetch(obrazUrl)
  if (!res.ok) throw new Error(`Pobieranie obrazu ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())

  const sciezka = `dania/${slug(nazwa)}-${Date.now()}.jpg`
  const { error: bladUpload } = await supabase.storage
    .from(BUCKET)
    .upload(sciezka, buf, { contentType: 'image/jpeg', upsert: true })
  if (bladUpload) throw bladUpload

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(sciezka)

  const { error: bladUpdate } = await supabase
    .from('dania')
    .update({ zdjecie: pub.publicUrl })
    .in('id', ids)
  if (bladUpdate) throw bladUpdate

  return pub.publicUrl
}

// ── Wejście: lista dań z pliku lub ze zmiennej DANIA ──────────────
// Format linii: "Nazwa dania|rodzaj". Puste linie i # komentarze pomijane.
// Separatorem jest nowa linia ALBO średnik — pole tekstowe w formularzu
// GitHub Actions jest jednolinijkowe, więc tam wpisuje się dania po średniku.
export function wczytajDania(tekst) {
  const dania = []
  const bledy = []
  for (const linia of tekst.split(/[\r\n;]+/)) {
    const czysta = linia.trim()
    if (!czysta || czysta.startsWith('#')) continue
    const [nazwa, rodzajSurowy] = czysta.split('|').map(x => x.trim())
    const rodzaj = (rodzajSurowy || 'obiad').toLowerCase()
    if (!nazwa) continue
    if (!RODZAJE.includes(rodzaj)) {
      bledy.push(`"${nazwa}" — nieznany rodzaj "${rodzaj}"`)
      continue
    }
    dania.push({ nazwa, rodzaj })
  }
  if (bledy.length) {
    console.error('Błędy w liście dań (rodzaj musi być jednym z: ' + RODZAJE.join(', ') + '):')
    bledy.forEach(b => console.error(`  ✗ ${b}`))
    process.exit(1)
  }
  return dania
}

// Wiersze do wstawienia — format 1:1 z formularzem DodajDanie.jsx.
export function zbudujWiersze(nazwa, rodzaj, przepis) {
  const tekstKrokow = przepis.kroki.map((k, i) => `${i + 1}. ${k}`).join('\n')
  const wspolne = {
    'Danie': nazwa,
    'Przepis': tekstKrokow,
    'rodzaj': rodzaj,
    'czas_minuty': przepis.czas_minuty || null,
    'kcal': przepis.kcal || null,
    'porcje_bazowe': PORCJE_BAZOWE,
    'notatki': null,
  }
  return przepis.skladniki.map(s => ({
    ...wspolne,
    'Składnik': s.nazwa,
    'Ilość na 1 porcję': s.ilosc || '-',
    'Jednostka': s.jednostka || 'g',
    'Kategoria': s.kategoria,
    'TYP': null,
  }))
}
