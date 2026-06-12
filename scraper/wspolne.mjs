// wspolne.mjs — wspólne helpery scraperów gazetek (Lidl, Kaufland).
//
// Uruchamianie z PC Filipa, NA HOTSPOCIE (sieć biurowa podmienia certyfikaty SSL).
// Wymagane env (PowerShell):
//   $env:SUPABASE_URL="https://<projekt>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="..."   # NIGDY do repo
// Bez env skrypt działa w trybie dry-run (tylko podsumowanie, zero zapisu).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const UA = 'Smakuje-PromoScraper/1.0 (prywatny planer posilkow rodziny; uzytek wlasny)'

export const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export const dzisISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// lower + trim + pojedyncze spacje; polskie znaki zostają —
// spójne z `nazwa_norm` w bazie i normalizacją w src/promocjeMatch.js
export function normalizujNazwe(nazwa = '') {
  return nazwa.toString().toLowerCase().replace(/\s+/g, ' ').trim()
}

// '5,99' / '5.99' / '699,00 zł' / '149' / '149-' → number | null
export function parsujCene(tekst) {
  if (tekst == null) return null
  const m = tekst.toString().replace(/\s/g, '').match(/(\d+)(?:[,.](\d{1,2}))?/)
  if (!m) return null
  const cena = parseFloat(`${m[1]}.${m[2] || '00'}`)
  return Number.isFinite(cena) && cena > 0 ? cena : null
}

// Zapis surowej odpowiedzi do scraper/cache/ (debug; katalog jest w .gitignore)
export function zapiszCache(nazwaPliku, dane) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cache')
  fs.mkdirSync(dir, { recursive: true })
  const plik = path.join(dir, nazwaPliku)
  fs.writeFileSync(plik, typeof dane === 'string' ? dane : JSON.stringify(dane, null, 2))
  return plik
}

// Usuwa duplikaty po (nazwa_norm, wazne_do) — zostaje najtańsza cena_nowa
export function deduplikuj(rekordy) {
  const mapa = new Map()
  for (const r of rekordy) {
    const klucz = `${r.nazwa_norm}|${r.wazne_do}`
    const stary = mapa.get(klucz)
    if (!stary || r.cena_nowa < stary.cena_nowa) mapa.set(klucz, r)
  }
  return [...mapa.values()]
}

// Kasuje przeterminowane promocje sklepu i upsertuje nowe rekordy.
// PostgREST bezpośrednio przez fetch — bez zależności od node_modules.
export async function zapiszDoBazy({ sklep, rekordy, dry }) {
  const url = process.env.SUPABASE_URL
  const klucz = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (dry || !url || !klucz) {
    console.log(`\n[dry-run] pominięto zapis do bazy (${rekordy.length} rekordów).`)
    if (!url || !klucz) console.log('  Ustaw SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY w env, żeby zapisać.')
    return
  }
  const naglowki = {
    apikey: klucz,
    Authorization: `Bearer ${klucz}`,
    'Content-Type': 'application/json',
  }

  const del = await fetch(
    `${url}/rest/v1/promocje?sklep=eq.${encodeURIComponent(sklep)}&wazne_do=lt.${dzisISO()}`,
    { method: 'DELETE', headers: naglowki }
  )
  if (!del.ok) throw new Error(`DELETE przeterminowanych: ${del.status} ${await del.text()}`)
  console.log(`\nUsunięto przeterminowane promocje (${sklep}).`)

  const ins = await fetch(
    `${url}/rest/v1/promocje?on_conflict=sklep,nazwa_norm,wazne_do`,
    {
      method: 'POST',
      headers: { ...naglowki, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(rekordy),
    }
  )
  if (!ins.ok) throw new Error(`UPSERT: ${ins.status} ${await ins.text()}`)
  console.log(`Zapisano ${rekordy.length} rekordów (${sklep}).`)
}

export function podsumuj({ sklep, rekordy, odrzucone, kategorieNieznane }) {
  console.log(`\n══ Podsumowanie ${sklep} ══`)
  console.log(`Rekordów do zapisu: ${rekordy.length}, odrzuconych (nie-spożywcze/braki): ${odrzucone}`)
  if (kategorieNieznane?.size) {
    console.log('Kategorie spoza listy wykluczeń (zostawione — sprawdź czy spożywcze):')
    for (const k of [...kategorieNieznane].sort()) console.log(`  • ${k}`)
  }
  console.log('Przykładowe rekordy:')
  for (const r of rekordy.slice(0, 5)) {
    const stara = r.cena_stara != null ? ` (było ${r.cena_stara})` : ''
    const war = r.warunek ? ` [${r.warunek}]` : ''
    console.log(`  • ${r.nazwa} — ${r.cena_nowa} zł${stara}${war}, do ${r.wazne_do}`)
  }
}
