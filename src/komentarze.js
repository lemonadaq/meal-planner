// komentarze.js
// Komentarze pod wpisami (migracja: migracja_blog_komentarze.sql).
//
// Decyzje, które widać w tym kodzie:
//   • tekst wchodzi od razu, bez moderacji,
//   • ZDJĘCIE czeka na zatwierdzenie i do tego czasu nie ma publicznego adresu,
//   • komentarze da się wyłączyć globalnie i per wpis.
//
// Limity i wyłącznik są egzekwowane przez RLS w bazie, nie tutaj. To, co jest
// w tym pliku, służy wygodzie użytkownika — klucz `anon` jest jawny, więc
// sprawdzanie po stronie przeglądarki niczego nie pilnuje.

import { supabase } from './supabase'
import { pobierzWszystkieWiersze } from './pobierzWszystko'

export const BUCKET_KOMENTARZE = 'blog-komentarze'
export const MAKS_TRESC = 2000
export const MAKS_PSEUDONIM = 40
export const DOMYSLNY_PSEUDONIM = 'Anonim'

// Puste, same spacje albo za długie → sensowna wartość zamiast błędu.
export function ustalPseudonim(surowy) {
  const czysty = String(surowy ?? '').replace(/\s+/g, ' ').trim()
  if (!czysty) return DOMYSLNY_PSEUDONIM
  return czysty.slice(0, MAKS_PSEUDONIM)
}

// Ta sama granica co w polityce RLS — front ma powiedzieć „za długie"
// zanim baza odrzuci zapis bez wyjaśnienia.
export function sprawdzKomentarz(tresc) {
  const czysta = String(tresc ?? '').trim()
  if (!czysta) return 'Napisz coś, zanim wyślesz.'
  if (czysta.length > MAKS_TRESC) return `Za długi komentarz (${czysta.length}/${MAKS_TRESC} znaków).`
  return null
}

export function formatujCzas(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const minut = Math.floor((Date.now() - d.getTime()) / 60000)
  if (minut < 1) return 'przed chwilą'
  if (minut < 60) return `${minut} min temu`
  if (minut < 60 * 24) return `${Math.floor(minut / 60)} godz. temu`

  return d.toLocaleDateString('pl', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function pobierzKomentarze(wpisId) {
  try {
    const { data, error } = await supabase
      .from('komentarze')
      .select('id, pseudonim, tresc, zdjecie_url, zdjecie_zatwierdzone, created_at')
      .eq('wpis_id', wpisId)
      .order('created_at', { ascending: false })

    if (error) return { komentarze: [], blad: error.message }
    return { komentarze: data || [], blad: null }
  } catch (e) {
    return { komentarze: [], blad: e?.message || 'nie udało się pobrać komentarzy' }
  }
}

// Zdjęcie ląduje w prywatnym buckecie. Zwracamy ścieżkę, nie adres —
// publicznego adresu na tym etapie po prostu nie ma.
export async function wgrajZdjecieKomentarza(plik, wpisId) {
  const rozszerzenie = (plik.name?.split('.').pop() || 'jpg').toLowerCase()
  const sciezka = `${wpisId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${rozszerzenie}`

  try {
    const { error } = await supabase.storage
      .from(BUCKET_KOMENTARZE)
      .upload(sciezka, plik, { contentType: plik.type || 'image/jpeg', upsert: false })

    if (error) return { sciezka: null, blad: error.message }
    return { sciezka, blad: null }
  } catch (e) {
    return { sciezka: null, blad: e?.message || 'nie udało się wgrać zdjęcia' }
  }
}

export async function dodajKomentarz({ wpisId, pseudonim, tresc, zdjecieSciezka }) {
  const blad = sprawdzKomentarz(tresc)
  if (blad) return { komentarz: null, blad }

  try {
    const { data, error } = await supabase
      .from('komentarze')
      .insert({
        wpis_id: wpisId,
        pseudonim: ustalPseudonim(pseudonim),
        tresc: String(tresc).trim(),
        zdjecie_sciezka: zdjecieSciezka || null,
      })
      .select('id, pseudonim, tresc, zdjecie_url, zdjecie_zatwierdzone, created_at')
      .single()

    if (error) {
      // Polityka INSERT odrzuca wpis, gdy komentarze są wyłączone — bez tego
      // tłumaczenia user dostałby surowy komunikat o naruszeniu RLS.
      if (error.code === '42501') {
        return { komentarz: null, blad: 'Komentarze pod tym wpisem są wyłączone.' }
      }
      return { komentarz: null, blad: error.message }
    }
    return { komentarz: data, blad: null }
  } catch (e) {
    return { komentarz: null, blad: e?.message || 'nie udało się dodać komentarza' }
  }
}

export async function czyKomentarzeWlaczone() {
  try {
    const { data, error } = await supabase
      .from('blog_ustawienia')
      .select('komentarze_wlaczone')
      .maybeSingle()

    if (error) return true      // brak tabeli nie może chować formularza
    return data?.komentarze_wlaczone !== false
  } catch {
    return true
  }
}

// Odwiedziny liczy funkcja w bazie — anon nie ma prawa zapisu do tabeli,
// więc nie da się tą drogą nadpisać cudzych liczb.
//
// Jedno zliczenie na sesję i wpis: odświeżanie strony nie nabija licznika.
export async function zliczOdwiedziny(slug) {
  if (!slug) return
  const klucz = `odwiedziny_${slug}`

  try {
    if (sessionStorage.getItem(klucz)) return
    sessionStorage.setItem(klucz, '1')
  } catch {
    // prywatne okno albo zablokowane dane — liczymy mimo to
  }

  try {
    await supabase.rpc('zlicz_odwiedziny', { p_slug: slug })
  } catch {
    // licznik nie może wywalić strony
  }
}

// ── Panel ─────────────────────────────────────────────────────────

export async function pobierzKomentarzeDoModeracji() {
  try {
    const { data, error } = await supabase
      .from('komentarze')
      .select('*, wpisy(tytul, slug)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return { komentarze: [], blad: error.message }
    return { komentarze: data || [], blad: null }
  } catch (e) {
    return { komentarze: [], blad: e?.message || 'nie udało się pobrać komentarzy' }
  }
}

export async function ustawUkrycie(id, ukryty) {
  const { error } = await supabase.from('komentarze').update({ ukryty }).eq('id', id)
  return { blad: error ? error.message : null }
}

export async function oznaczPrzeczytane(idki) {
  if (!idki?.length) return { blad: null }
  const { error } = await supabase.from('komentarze').update({ przeczytany: true }).in('id', idki)
  return { blad: error ? error.message : null }
}

export async function usunKomentarz(id) {
  const { error } = await supabase.from('komentarze').delete().eq('id', id)
  return { blad: error ? error.message : null }
}

// Podgląd zdjęcia czekającego na decyzję. Bucket jest prywatny, więc adres
// musi być podpisany i wygasa — to jest ta różnica między „admin widzi"
// a „widzi każdy, kto zna link".
export async function podgladZdjecia(sciezka, sekund = 600) {
  if (!sciezka) return { url: null, blad: null }
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_KOMENTARZE)
      .createSignedUrl(sciezka, sekund)

    if (error) return { url: null, blad: error.message }
    return { url: data.signedUrl, blad: null }
  } catch (e) {
    return { url: null, blad: e?.message || 'nie udało się otworzyć podglądu' }
  }
}

// Zatwierdzenie = przeniesienie z prywatnego bucketa do publicznego.
// Dopiero wtedy zdjęcie dostaje adres, który zobaczy ktokolwiek.
export async function zatwierdzZdjecie(komentarz) {
  if (!komentarz?.zdjecie_sciezka) return { blad: 'Ten komentarz nie ma zdjęcia.' }

  const cel = `komentarze/${komentarz.id}-${komentarz.zdjecie_sciezka.split('/').pop()}`

  try {
    const { error: bladKopii } = await supabase.storage
      .from(BUCKET_KOMENTARZE)
      .copy(komentarz.zdjecie_sciezka, cel, { destinationBucket: 'blog-zdjecia' })

    if (bladKopii) return { blad: bladKopii.message }

    const { data } = supabase.storage.from('blog-zdjecia').getPublicUrl(cel)

    const { error } = await supabase
      .from('komentarze')
      .update({ zdjecie_zatwierdzone: true, zdjecie_url: data.publicUrl })
      .eq('id', komentarz.id)

    return { blad: error ? error.message : null, url: data.publicUrl }
  } catch (e) {
    return { blad: e?.message || 'nie udało się zatwierdzić zdjęcia' }
  }
}

export async function odrzucZdjecie(komentarz) {
  try {
    if (komentarz.zdjecie_sciezka) {
      await supabase.storage.from(BUCKET_KOMENTARZE).remove([komentarz.zdjecie_sciezka])
    }
    const { error } = await supabase
      .from('komentarze')
      .update({ zdjecie_sciezka: null, zdjecie_url: null, zdjecie_zatwierdzone: false })
      .eq('id', komentarz.id)

    return { blad: error ? error.message : null }
  } catch (e) {
    return { blad: e?.message || 'nie udało się odrzucić zdjęcia' }
  }
}

export async function ustawKomentarzeGlobalnie(wlaczone) {
  const { error } = await supabase
    .from('blog_ustawienia')
    .update({ komentarze_wlaczone: wlaczone, zaktualizowano: new Date().toISOString() })
    .eq('id', true)

  return { blad: error ? error.message : null }
}

export async function pobierzOdwiedziny() {
  try {
    // Wiersz na wpis i dzień, więc przy kilkudziesięciu wpisach przekroczy
    // 1000 w ciągu roku — bez paginacji licznik po cichu by się zaniżył.
    const { data, error } = await pobierzWszystkieWiersze(() =>
      supabase.from('wpisy_odwiedziny').select('wpis_id, ile').order('wpis_id'),
    )
    if (error) return { odwiedziny: {}, blad: error.message }

    const suma = {}
    for (const w of data || []) suma[w.wpis_id] = (suma[w.wpis_id] || 0) + (w.ile || 0)
    return { odwiedziny: suma, blad: null }
  } catch (e) {
    return { odwiedziny: {}, blad: e?.message || 'nie udało się pobrać odwiedzin' }
  }
}
