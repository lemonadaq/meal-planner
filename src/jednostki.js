// Wspólne przeliczniki jednostek i dopasowanie do skladniki_meta.
// Wydzielone z ListaZakupow.jsx, używane też przez kcalZeSkladnikow.js.

// Normalizacja MUSI być identyczna z SQL:
// trim(regexp_replace(lower(translate(nazwa, polskie→ascii)), '[^a-z0-9]+', ' ', 'g'))
export function normalizujNazweMeta(nazwa = '') {
  return nazwa
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ── Uniwersalne przeliczniki (stałe, te same dla wszystkich; trzymane w kodzie) ──
// Sprowadzamy każdą jednostkę do „rodziny": waga (g), objętość (ml), łyżki (ml),
// sztuki (szt). Łyżka/łyżeczka/szczypta to przybliżenia — wystarczające dla zakupów.
export const LYZKI_ML = { lyzka: 15, lyzeczka: 5, szczypta: 0.5 }
export const WAGA_DO_G = { g: 1, kg: 1000, dag: 10 }
export const OBJ_DO_ML = { ml: 1, l: 1000 }
export const INNE_DO_G = { peczek: 30, garsc: 30 }

// Kanoniczna postać jednostki do przeliczeń (ł→l, bez ogonków, bez końcowej kropki,
// liczba pojedyncza/mnoga sprowadzona do jednego klucza).
export function kanonJednostka(raw = '') {
  const x = raw.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[łl]/g, 'l')
    .replace(/\.+$/, '').trim()
  if (!x) return ''
  if (['g', 'gram', 'gramy', 'gramow'].includes(x)) return 'g'
  if (['kg', 'kilogram', 'kilogramy'].includes(x)) return 'kg'
  if (['dag', 'dkg', 'dekagram', 'dekagramy'].includes(x)) return 'dag'
  if (['ml', 'mililitr', 'mililitry'].includes(x)) return 'ml'
  if (['l', 'litr', 'litry'].includes(x)) return 'l'
  if (['lyzka', 'lyzki', 'lyzke', 'lyzek'].includes(x)) return 'lyzka'
  if (['lyzeczka', 'lyzeczki', 'lyzeczke', 'lyzeczek'].includes(x)) return 'lyzeczka'
  if (['szczypta', 'szczypty', 'szczypte', 'szczypt'].includes(x)) return 'szczypta'
  // Ząbek (czosnku) i kromka (chleba) traktujemy jak sztukę — waga „sztuki" dla
  // tych produktów to ząbek/kromka (ustawiane w skladniki_meta.waga_sztuki_g),
  // więc „4 szt czosnku" = 4 ząbki, „2 szt chleba" = 2 kromki.
  if (['zabek', 'zabki', 'zabka', 'zabkow', 'zabkach', 'zabkami', 'zabeczek'].includes(x)) return 'szt'
  if (['kromka', 'kromki', 'kromke', 'kromek'].includes(x)) return 'szt'
  if (['szt', 'sztuka', 'sztuki', 'sztuk'].includes(x)) return 'szt'
  if (['peczek', 'peczki'].includes(x)) return 'peczek'
  if (['garsc', 'garsci'].includes(x)) return 'garsc'
  return x
}

// Ile gramów „waży" dana ilość w danej jednostce (gęstość ~1 dla płynów/łyżek).
// szt liczymy tylko jeśli znamy wagę sztuki. Zwraca null gdy się nie da.
export function naGramy(ilosc, jKanon, wagaSztuki) {
  if (jKanon in WAGA_DO_G) return ilosc * WAGA_DO_G[jKanon]
  if (jKanon in OBJ_DO_ML) return ilosc * OBJ_DO_ML[jKanon]
  if (jKanon in LYZKI_ML) return ilosc * LYZKI_ML[jKanon]
  if (jKanon in INNE_DO_G) return ilosc * INNE_DO_G[jKanon]
  if (jKanon === 'szt' && wagaSztuki) return ilosc * wagaSztuki
  return null
}

// Waga jednej „sztuki" (g/ml). Dla produktu z bazą g/ml „1 szt" w przepisie =
// jedno opakowanie/sztuka = `rozmiar_opakowania` (cebula 150 g, puszka 400 g,
// karton 1000 ml…). Wyjątek: produkty sprzedawane na kg (opak.='kg'), gdzie
// rozmiar to wielkość paczki, a nie waga sztuki — wtedy bierzemy jawną
// `waga_sztuki_g` (np. pierś z kurczaka), inaczej nie zgadujemy.
export function wagaSztukiZMeta(meta) {
  if (!meta) return null
  if (meta.waga_sztuki_g) {
    const w = parseFloat(meta.waga_sztuki_g)
    if (Number.isFinite(w) && w > 0) return w
  }
  const opak = kanonJednostka(meta.jednostka_opakowania)
  const baza = kanonJednostka(meta.jednostka_bazowa)
  if (opak !== 'kg' && (baza === 'g' || baza === 'ml')) {
    const r = parseFloat(meta.rozmiar_opakowania)
    if (Number.isFinite(r) && r > 0) return r
  }
  return null
}

// Znajdź wpis skladniki_meta dla danej nazwy składnika.
// Strategia: normalizacja → exact match po nazwa_norm → match po aliasach.
export function dopasujMeta(nazwaSkladnika, wszystkieMeta) {
  if (!nazwaSkladnika || !wszystkieMeta?.length) return null
  const norm = normalizujNazweMeta(nazwaSkladnika)
  if (!norm) return null

  // Najpierw exact match po nazwa_norm
  const byName = wszystkieMeta.find(m => m.nazwa_norm === norm)
  if (byName) return byName

  // Potem aliasy
  const byAlias = wszystkieMeta.find(m => Array.isArray(m.aliasy) && m.aliasy.includes(norm))
  return byAlias || null
}

// Ilość z przepisu na liczbę: obsługuje „1/2", „0,5", „1.5", „2". Null gdy nie liczba.
export function parsujIlosc(raw) {
  if (raw == null) return null
  const s = raw.toString().replace(',', '.').trim()
  const ulamek = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)
  if (ulamek) {
    const licznik = parseFloat(ulamek[1]), mianownik = parseFloat(ulamek[2])
    return mianownik > 0 ? licznik / mianownik : null
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}
