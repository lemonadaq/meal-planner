// promocjeMatch.js
// Dopasowanie promocji (tabela `promocje`) do pozycji listy zakupów. MVP w JS:
// exact match + token overlap; świadomie akceptujemy false-negatives (lepiej nie
// pokazać promocji niż pokazać błędną). Fuzzy pg_trgm przez RPC — później.

import { supabase } from './supabase'
import { dzisLocal } from './dataHelpers'

// Słowa pomijane przy tokenizacji — nie rozróżniają produktu.
const STOP_WORDS = new Set([
  'świeży', 'świeża', 'świeże', 'świeżą',
  'ekstra', 'extra', 'premium', 'klasyczny', 'klasyczna', 'klasyczne',
  'naturalny', 'naturalna', 'naturalne',
  'polski', 'polska', 'polskie',
  'luz', 'luzem', 'ok', 'około', 'typu',
])

// Token „gramaturowy" — liczby, jednostki, procenty: `200`, `g`, `0,5l`, `82%`, `x4`
const GRAMATURA_RGX = /^(\d+([,.]\d+)?(g|kg|ml|l|szt|%)?|g|kg|ml|l|szt|sztuk|opak|x\d+)$/

// lower + trim + pojedyncze spacje; polskie znaki ZOSTAJĄ (spójne z nazwa_norm w bazie)
export function normalizujNazwePromo(nazwa = '') {
  return nazwa.toString().toLowerCase().replace(/\s+/g, ' ').trim()
}

function tokenizuj(nazwa) {
  return normalizujNazwePromo(nazwa)
    .split(/[\s,()\/]+/)
    .filter(tok => tok.length > 1 && !STOP_WORDS.has(tok) && !GRAMATURA_RGX.test(tok))
}

// Czy wszystkie tokeny `a` występują w tokenach `b`?
function zawieraWszystkie(a, b) {
  if (!a.length) return false
  const zbiorB = new Set(b)
  return a.every(tok => zbiorB.has(tok))
}

// Human-readable „do kiedy": dziś! / do jutra / do niedzieli / do DD.MM
export function etykietaWazneDo(wazneDo) {
  const dzis = dzisLocal()
  if (wazneDo === dzis) return 'dziś!'

  const d = new Date(wazneDo + 'T12:00:00')
  const dzisD = new Date(dzis + 'T12:00:00')
  const diffDni = Math.round((d - dzisD) / (24 * 60 * 60 * 1000))
  if (diffDni === 1) return 'do jutra'

  // „do niedzieli" gdy promocja kończy się w najbliższą niedzielę (w tym tygodniu)
  if (d.getDay() === 0 && diffDni > 0 && diffDni <= 6) return 'do niedzieli'

  return `do ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Zamień rekord z tabeli `promocje` na obiekt item.promo (format z Promocje.jsx)
function promoZRekordu(p) {
  const old = p.cena_stara != null ? +p.cena_stara : null
  const now = +p.cena_nowa
  let off = p.rabat_label
  if (!off && old != null && old > now) {
    off = `-${Math.round((1 - now / old) * 100)}%`
  }
  return {
    store: p.sklep,
    old,
    now,
    off: off || '',
    until: etykietaWazneDo(p.wazne_do),
  }
}

// Główna funkcja: itemy listy + rekordy promocje → itemy z dopisanym item.promo|null.
// Matching:
//   1. exact: nazwa_norm === znormalizowany skladnik
//   2. token overlap: tokeny składnika ⊆ tokeny promo LUB odwrotnie
//   3. kilka dopasowań → najtańsza cena_nowa
export function dopasujPromocje(items, promocje, preferowanySlep = null) {
  if (!promocje?.length) return items

  const przygotowane = promocje
    .filter(p => p.cena_nowa != null)
    .map(p => ({
      rekord: p,
      norm: normalizujNazwePromo(p.nazwa_norm || p.nazwa),
      tokeny: tokenizuj(p.nazwa_norm || p.nazwa),
    }))

  return items.map(item => {
    const norm = normalizujNazwePromo(item.skladnik)
    if (!norm) return { ...item, promo: null }
    const tokenyItemu = tokenizuj(item.skladnik)

    const pasujace = przygotowane.filter(p =>
      p.norm === norm ||
      zawieraWszystkie(tokenyItemu, p.tokeny) ||
      zawieraWszystkie(p.tokeny, tokenyItemu)
    )
    if (!pasujace.length) return { ...item, promo: null }

    if (preferowanySlep) {
      const zPreferowanego = pasujace.filter(p => p.rekord.sklep === preferowanySlep)
      if (!zPreferowanego.length) return { ...item, promo: null }
      const najtansza = zPreferowanego.reduce((min, p) =>
        +p.rekord.cena_nowa < +min.rekord.cena_nowa ? p : min
      )
      return { ...item, promo: promoZRekordu(najtansza.rekord) }
    }

    const najtansza = pasujace.reduce((min, p) =>
      +p.rekord.cena_nowa < +min.rekord.cena_nowa ? p : min
    )
    return { ...item, promo: promoZRekordu(najtansza.rekord) }
  })
}

// Fetch aktualnych promocji (wazne_do >= dziś). Zwraca [] przy błędzie —
// promocje to wzmocnienie, nigdy blokada listy (np. tabela jeszcze nie istnieje).
export async function pobierzAktualnePromocje() {
  try {
    const teraz = new Date().toISOString()
    const PAGE = 1000
    const wszystkie = []
    let od = 0
    while (true) {
      const { data, error } = await supabase
        .from('promo_offers')
        .select('product_name, price, old_price, store_name, offer_end_at')
        .gte('offer_end_at', teraz)
        .range(od, od + PAGE - 1)
      if (error || !data?.length) break
      wszystkie.push(...data)
      if (data.length < PAGE) break
      od += PAGE
    }
    return wszystkie.map(p => ({
      nazwa_norm: p.product_name,
      nazwa: p.product_name,
      cena_nowa: p.price,
      cena_stara: p.old_price,
      sklep: p.store_name,
      wazne_do: p.offer_end_at ? p.offer_end_at.substring(0, 10) : null,
      rabat_label: null,
    }))
  } catch (e) {
    return []
  }
}
