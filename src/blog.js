// blog.js
// Warstwa danych bloga (tabela `wpisy`, migracja: migracja_blog.sql).
//
// Wpis jest jednostką publikacji: Filip wybiera danie, obudowuje je tekstem
// i zdjęciami, i dopiero to trafia w świat. Tabela `dania` zostaje zamknięta
// dla niezalogowanych — przepis jedzie we wpisie jako MIGAWKA (`przepis`),
// zrobiona w chwili, gdy Filip ją tam wstawi.

import { supabase } from './supabase'

export const BUCKET_BLOG = 'blog-zdjecia'

// Podział bloga. Te same nazwy techniczne co `dania.rodzaj`, żeby wpis
// powiązany z daniem dało się kiedyś zakwalifikować automatycznie.
export const KATEGORIE_BLOGA = [
  { id: 'sniadania', label: 'Śniadania' },
  { id: 'obiady', label: 'Obiady' },
  { id: 'kolacje', label: 'Kolacje' },
  { id: 'zupy', label: 'Zupy' },
  { id: 'przekaski', label: 'Przekąski' },
  { id: 'desery', label: 'Desery' },
  { id: 'inne', label: 'Inne' },
]

export function etykietaKategorii(id) {
  return KATEGORIE_BLOGA.find(k => k.id === id)?.label || null
}

// `dania.rodzaj` jest w liczbie pojedynczej, kategorie bloga w mnogiej —
// mapowanie pozwala podpowiedzieć kategorię przy wiązaniu wpisu z daniem.
const RODZAJ_NA_KATEGORIE = {
  sniadanie: 'sniadania', obiad: 'obiady', kolacja: 'kolacje',
  zupa: 'zupy', przekaska: 'przekaski', deser: 'desery',
  dodatek: 'inne', surowka: 'inne',
}

export function kategoriaZRodzaju(rodzaj) {
  return RODZAJ_NA_KATEGORIE[rodzaj] || null
}

// Slug trafia do adresu (menuplaner.pl/wpis/<slug>), więc musi być ascii,
// bez spacji i bez znaków, które trzeba by kodować.
export function zrobSlug(tekst = '') {
  // `String(null)` to „null", więc brak tytułu dałby adres /wpis/null.
  if (tekst == null) return ''

  return String(tekst)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

// Zajawka na listę: własny lead, a gdy go nie ma — początek treści.
export function zajawka(wpis, maks = 180) {
  const zLeadu = (wpis?.lead || '').trim()
  if (zLeadu) return zLeadu

  const zTresci = (wpis?.tresc || '')
    .replace(/[#>*_`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (zTresci.length <= maks) return zTresci
  // Tniemy na granicy słowa, żeby nie urywać w połowie wyrazu.
  return zTresci.slice(0, maks).replace(/\s+\S*$/, '') + '…'
}

export function formatujDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pl', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Przepis w bazie to wiersz na składnik. Migawka do wpisu składa to w jeden
// obiekt, żeby publiczna strona nie musiała nic dopytywać.
export function migawkaPrzepisu(wiersze) {
  if (!wiersze?.length) return null
  const pierwszy = wiersze[0]

  return {
    danie: pierwszy['Danie'],
    rodzaj: pierwszy['rodzaj'] ?? null,
    czas_minuty: pierwszy['czas_minuty'] ?? null,
    kcal: pierwszy['kcal'] ?? null,
    porcje_bazowe: pierwszy['porcje_bazowe'] ?? null,
    zdjecie: pierwszy['zdjecie'] ?? null,
    kroki: pierwszy['Przepis'] ?? '',
    skladniki: wiersze
      .filter(w => w['Składnik'])
      .map(w => ({
        nazwa: w['Składnik'],
        ilosc: w['Ilość na 1 porcję'] ?? '',
        jednostka: w['Jednostka'] ?? '',
        kategoria: w['Kategoria'] ?? '',
      })),
  }
}

// ── Odczyt publiczny ──────────────────────────────────────────────
// Bez `opublikowany` w filtrze też by działało (RLS przepuszcza tylko
// opublikowane), ale adminowi polityka pokazuje wszystko — a blog ma
// wyglądać tak samo niezależnie od tego, kto patrzy.

export async function pobierzWpisy({ limit = 50 } = {}) {
  try {
    const { data, error } = await supabase
      .from('wpisy')
      .select('id, slug, tytul, lead, tresc, danie, kategoria, zdjecie_glowne, opublikowano_at')
      .eq('opublikowany', true)
      .order('opublikowano_at', { ascending: false })
      .limit(limit)

    if (error) return { wpisy: [], blad: [error.code, error.message].filter(Boolean).join(': ') }
    return { wpisy: data || [], blad: null }
  } catch (e) {
    return { wpisy: [], blad: e?.message || 'nie udało się pobrać wpisów' }
  }
}

export async function pobierzWpis(slug) {
  try {
    const { data, error } = await supabase
      .from('wpisy')
      .select('*')
      .eq('slug', slug)
      .eq('opublikowany', true)
      .maybeSingle()

    if (error) return { wpis: null, blad: [error.code, error.message].filter(Boolean).join(': ') }
    return { wpis: data, blad: null }
  } catch (e) {
    return { wpis: null, blad: e?.message || 'nie udało się pobrać wpisu' }
  }
}

// ── Panel admina ──────────────────────────────────────────────────
// Tu świadomie NIE ma filtra po `opublikowany` — panel ma pokazywać szkice.
// Dostęp pilnuje RLS, nie ten kod.

export async function pobierzWszystkieWpisy() {
  try {
    const { data, error } = await supabase
      .from('wpisy')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) return { wpisy: [], blad: [error.code, error.message].filter(Boolean).join(': ') }
    return { wpisy: data || [], blad: null }
  } catch (e) {
    return { wpisy: [], blad: e?.message || 'nie udało się pobrać wpisów' }
  }
}

export async function zapiszWpis(wpis) {
  const rekord = {
    slug: wpis.slug,
    tytul: wpis.tytul,
    lead: wpis.lead || null,
    tresc: wpis.tresc || '',
    danie: wpis.danie || null,
    kategoria: wpis.kategoria || null,
    przepis: wpis.przepis || null,
    zdjecie_glowne: wpis.zdjecie_glowne || null,
    zdjecia: wpis.zdjecia || [],
    opublikowany: !!wpis.opublikowany,
    // Datę publikacji stawiamy raz, przy pierwszym opublikowaniu — kolejna
    // edycja opublikowanego wpisu nie ma go przesuwać na górę listy.
    opublikowano_at: wpis.opublikowany ? (wpis.opublikowano_at || new Date().toISOString()) : null,
    autor_email: wpis.autor_email || null,
  }

  try {
    const zapytanie = wpis.id
      ? supabase.from('wpisy').update(rekord).eq('id', wpis.id).select().single()
      : supabase.from('wpisy').insert(rekord).select().single()

    const { data, error } = await zapytanie
    if (error) return { wpis: null, blad: [error.code, error.message].filter(Boolean).join(': ') }
    return { wpis: data, blad: null }
  } catch (e) {
    return { wpis: null, blad: e?.message || 'nie udało się zapisać wpisu' }
  }
}

export async function usunWpis(id) {
  try {
    const { error } = await supabase.from('wpisy').delete().eq('id', id)
    return { blad: error ? error.message : null }
  } catch (e) {
    return { blad: e?.message || 'nie udało się usunąć wpisu' }
  }
}

// Pobiera wiersze dania i składa z nich migawkę do wpisu.
export async function pobierzPrzepisDoWpisu(nazwaDania) {
  try {
    const { data, error } = await supabase
      .from('dania')
      .select('*')
      .eq('"Danie"', nazwaDania)

    if (error) return { przepis: null, blad: error.message }
    return { przepis: migawkaPrzepisu(data), blad: null }
  } catch (e) {
    return { przepis: null, blad: e?.message || 'nie udało się pobrać przepisu' }
  }
}

export async function wgrajZdjecieWpisu(plik, slug) {
  const rozszerzenie = (plik.name?.split('.').pop() || 'jpg').toLowerCase()
  const sciezka = `${slug || 'wpis'}/${Date.now()}.${rozszerzenie}`

  try {
    const { error } = await supabase.storage
      .from(BUCKET_BLOG)
      .upload(sciezka, plik, { contentType: plik.type || 'image/jpeg', upsert: true })

    if (error) return { url: null, blad: error.message }

    const { data } = supabase.storage.from(BUCKET_BLOG).getPublicUrl(sciezka)
    return { url: data.publicUrl, blad: null }
  } catch (e) {
    return { url: null, blad: e?.message || 'nie udało się wgrać zdjęcia' }
  }
}
