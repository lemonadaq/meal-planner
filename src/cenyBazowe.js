// cenyBazowe.js
// Wycena koszyka po cenach bazowych z widoku `ceny_bazowe_view`
// (migracja: migracja_ceny_bazowe.sql).
//
// Cena bazowa to najwyższa cena, jaką scraper widział dla produktu w danym
// sklepie — gazetka pokazuje ceny promocyjne, więc najwyższy odczyt jest
// najbliżej półki. To DOLNE oszacowanie: produkt, który nigdy nie był
// w gazetce, w ogóle tu nie występuje.

import { supabase } from './supabase'
import { dzisLocal } from './dataHelpers'
import { normalizujNazwePromo, tokenizuj, zawieraWszystkie } from './promocjeMatch'

const CACHE_KLUCZ = 'ceny_bazowe_cache'
const CACHE_WAZNOSC_MS = 6 * 60 * 60 * 1000
const STRONA = 1000

function zCache() {
  try {
    const surowe = localStorage.getItem(CACHE_KLUCZ)
    if (!surowe) return null
    const { zapisano, dzien, ceny } = JSON.parse(surowe)
    if (dzien !== dzisLocal()) return null
    if (!zapisano || Date.now() - zapisano > CACHE_WAZNOSC_MS) return null
    return Array.isArray(ceny) ? ceny : null
  } catch {
    return null
  }
}

function doCache(ceny) {
  try {
    localStorage.setItem(CACHE_KLUCZ, JSON.stringify({
      zapisano: Date.now(),
      dzien: dzisLocal(),
      ceny,
    }))
  } catch {
    // pełny localStorage nie ma prawa wywalić listy zakupów
  }
}

// Zwraca [] gdy widoku jeszcze nie ma w bazie — zakładka pokaże wtedy
// instrukcję zamiast się wysypać.
export async function pobierzCenyBazowe() {
  const zapisane = zCache()
  if (zapisane?.length) return zapisane

  try {
    const wszystkie = []

    for (let i = 0; ; i++) {
      const { data, error } = await supabase
        .from('ceny_bazowe_view')
        .select('sklep, produkt, cena_bazowa, cena_min, obserwacji')
        .range(i * STRONA, i * STRONA + STRONA - 1)

      if (error) return wszystkie
      if (!data?.length) break

      wszystkie.push(...data)
      if (data.length < STRONA) break
    }

    if (wszystkie.length) doCache(wszystkie)
    return wszystkie
  } catch {
    return []
  }
}

// Ile opakowań danej pozycji trzeba kupić. Lista liczy `opakowania` tylko dla
// składników z wypełnioną metą — przy braku zakładamy jedno, bo i tak trzeba
// coś kupić, a zaniżanie kosztu byłoby gorsze niż zaokrąglenie w górę.
function ileOpakowan(item) {
  const n = Number(item?.opakowania)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 1
}

// Najtańsze dopasowanie ceny bazowej per sklep. Ta sama logika tokenowa co
// w dopasujPromocje — składnik ⊆ produkt albo produkt ⊆ składnik.
function dopasujCeny(skladnik, przygotowane) {
  const norm = normalizujNazwePromo(skladnik)
  if (!norm) return new Map()

  const tokenyItemu = tokenizuj(skladnik)
  const perSklep = new Map()

  for (const c of przygotowane) {
    const pasuje = c.norm === norm ||
      zawieraWszystkie(tokenyItemu, c.tokeny) ||
      zawieraWszystkie(c.tokeny, tokenyItemu)
    if (!pasuje) continue

    const stara = perSklep.get(c.sklep)
    if (!stara || c.cena_bazowa < stara.cena_bazowa) perSklep.set(c.sklep, c)
  }

  return perSklep
}

/**
 * Wycena koszyka per sklep.
 *
 * Ranking liczymy WYŁĄCZNIE na wspólnym podzbiorze — pozycjach, które mają
 * cenę we wszystkich sklepach naraz. Inaczej sklep z gorszym pokryciem
 * wychodziłby najtańszy tylko dlatego, że policzył mniej pozycji.
 *
 * `items` to pozycje listy (po dopasujPromocje, więc mogą nieść `promos`).
 */
export function wycenKoszyk(items, ceny) {
  const doKupienia = (items || []).filter(i => i?.skladnik)
  if (!doKupienia.length || !ceny?.length) {
    return { sklepy: [], pozycje: [], wspolnych: 0, bezCeny: doKupienia.length }
  }

  const przygotowane = ceny
    .filter(c => c.sklep && c.produkt && Number(c.cena_bazowa) > 0)
    .map(c => ({
      sklep: c.sklep,
      produkt: c.produkt,
      cena_bazowa: Number(c.cena_bazowa),
      norm: normalizujNazwePromo(c.produkt),
      tokeny: tokenizuj(c.produkt),
    }))

  const sklepy = [...new Set(przygotowane.map(c => c.sklep))].sort()

  const pozycje = doKupienia.map(item => {
    const trafienia = dopasujCeny(item.skladnik, przygotowane)
    const sztuk = ileOpakowan(item)

    // Aktualna promocja bije cenę bazową — to ona robi różnicę między sklepami.
    const promoWSklepie = new Map()
    for (const p of item.promos || []) {
      const teraz = Number(p.now)
      if (!Number.isFinite(teraz)) continue
      const stara = promoWSklepie.get(p.store)
      if (stara == null || teraz < stara) promoWSklepie.set(p.store, teraz)
    }

    const wSklepach = new Map()
    for (const [sklep, c] of trafienia) {
      const promo = promoWSklepie.get(sklep)
      const zaSztuke = promo != null ? Math.min(promo, c.cena_bazowa) : c.cena_bazowa
      wSklepach.set(sklep, {
        bazowa: c.cena_bazowa * sztuk,
        teraz: zaSztuke * sztuk,
        wPromocji: promo != null && promo < c.cena_bazowa,
        produkt: c.produkt,
      })
    }

    return {
      skladnik: item.skladnik,
      klucz: item.klucz,
      sztuk,
      wSklepach,
      wszedzie: wSklepach.size === sklepy.length && sklepy.length > 0,
    }
  })

  const wspolne = pozycje.filter(p => p.wszedzie)

  const podsumowanie = sklepy.map(sklep => {
    const zeSklepu = pozycje.filter(p => p.wSklepach.has(sklep))
    const suma = (lista, pole) =>
      lista.reduce((a, p) => a + p.wSklepach.get(sklep)[pole], 0)

    return {
      sklep,
      // Porównywalne między sklepami — tylko wspólny podzbiór.
      koszt: suma(wspolne, 'teraz'),
      kosztBazowy: suma(wspolne, 'bazowa'),
      // Cały koszyk, na ile da się go wycenić w tym sklepie.
      kosztCalosci: suma(zeSklepu, 'teraz'),
      wycenionych: zeSklepu.length,
      wPromocji: zeSklepu.filter(p => p.wSklepach.get(sklep).wPromocji).length,
    }
  }).sort((a, b) => a.koszt - b.koszt)

  return {
    sklepy: podsumowanie,
    pozycje,
    wspolnych: wspolne.length,
    bezCeny: pozycje.filter(p => p.wSklepach.size === 0).length,
  }
}

export function formatujZl(kwota) {
  if (!Number.isFinite(kwota)) return '—'
  return `${kwota.toFixed(2).replace('.', ',')} zł`
}
