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
import { normalizujNazwePromo, tokenizuj, rdzen, SLOWA_OPCJONALNE, punktacjaDopasowania } from './promocjeMatch'

// Blix wstawia grosz jako cenę produktów odblokowywanych kuponem za punkty
// w aplikacji sklepu. Jako promocja to prawdziwa oferta i dlatego zostaje na
// liście, ale cena bazowa to z definicji NAJWYŻSZY widziany odczyt — jeśli
// wyszedł grosz, to znaczy, że ceny półkowej tego produktu nigdy nie
// widzieliśmy. Taki wiersz nie ma czego wnieść do wyceny koszyka, a potrafi
// wygrać każde dopasowanie i zaniżyć całość.
const MIN_CENA_BAZOWA = 0.1

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

// Zwraca { ceny, blad }. Błąd NIE jest połykany — bez niego „brak cen" wygląda
// identycznie, czy widoku nie ma, czy jest pusty, czy PostgREST go nie wystawia,
// a to trzy różne problemy z trzema różnymi naprawami.
export async function pobierzCenyBazowe() {
  const zapisane = zCache()
  if (zapisane?.length) return { ceny: zapisane, blad: null }

  try {
    const wszystkie = []

    for (let i = 0; ; i++) {
      const { data, error } = await supabase
        .from('ceny_bazowe_view')
        .select('sklep, produkt, cena_bazowa, cena_min, obserwacji')
        .range(i * STRONA, i * STRONA + STRONA - 1)

      if (error) {
        return {
          ceny: wszystkie,
          blad: [error.code, error.message].filter(Boolean).join(': ') || 'nieznany błąd',
        }
      }
      if (!data?.length) break

      wszystkie.push(...data)
      if (data.length < STRONA) break
    }

    if (wszystkie.length) doCache(wszystkie)
    return { ceny: wszystkie, blad: null }
  } catch (e) {
    return { ceny: [], blad: e?.message || 'wyjątek przy pobieraniu cen' }
  }
}

// Ile opakowań danej pozycji trzeba kupić. Lista liczy `opakowania` tylko dla
// składników z wypełnioną metą — przy braku zakładamy jedno, bo i tak trzeba
// coś kupić, a zaniżanie kosztu byłoby gorsze niż zaokrąglenie w górę.
function ileOpakowan(item) {
  const n = Number(item?.opakowania)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 1
}

// Katalog cen budowany RAZ na tablicę z bazy — tokenizacja kilku tysięcy nazw
// przy każdym przerysowaniu listy była głównym kosztem zakładki Koszty.
// Odwrócony indeks po rdzeniach jak w promocjeMatch: pasujący produkt zawsze
// dzieli ze składnikiem co najmniej jeden rdzeń.
const KATALOGI_CEN = new WeakMap()

function katalogCen(ceny) {
  const gotowy = KATALOGI_CEN.get(ceny)
  if (gotowy) return gotowy

  const produkty = ceny
    .filter(c => c.sklep && c.produkt && Number(c.cena_bazowa) >= MIN_CENA_BAZOWA)
    .map(c => {
      const tokeny = tokenizuj(c.produkt)
      return {
        sklep: c.sklep,
        produkt: c.produkt,
        cena_bazowa: Number(c.cena_bazowa),
        norm: normalizujNazwePromo(c.produkt),
        tokeny,
        rdzenie: new Set(tokeny.map(rdzen)),
        wymagane: tokeny.filter(t => !SLOWA_OPCJONALNE.has(t)).map(rdzen),
      }
    })

  const wgRdzenia = new Map()
  const wgNormy = new Map()
  produkty.forEach((produkt, i) => {
    for (const r of produkt.rdzenie) {
      const kubelek = wgRdzenia.get(r)
      if (kubelek) kubelek.push(i)
      else wgRdzenia.set(r, [i])
    }
    const kubelek = wgNormy.get(produkt.norm)
    if (kubelek) kubelek.push(i)
    else wgNormy.set(produkt.norm, [i])
  })

  const katalog = {
    produkty,
    wgRdzenia,
    wgNormy,
    sklepy: [...new Set(produkty.map(c => c.sklep))].sort(),
    pamiec: new Map(),
  }
  KATALOGI_CEN.set(ceny, katalog)
  return katalog
}

// Najlepiej pasujący produkt per sklep. Ta sama logika tokenowa co
// w dopasujPromocje — składnik ⊆ produkt albo produkt ⊆ składnik, po rdzeniach.
//
// O wyborze decyduje celność nazwy, nie cena. Przy „najtańszym wygrywa"
// składnik „masło" łapał „Chipsy ziemniaczane masło z solą" za 0,01 zł
// i zaniżał cały koszyk.
//
// Wynik zależy tylko od nazwy składnika, więc ląduje w pamięci katalogu —
// odhaczenie pozycji nie musi przeliczać całego koszyka od nowa.
function dopasujCeny(skladnik, katalog) {
  const norm = normalizujNazwePromo(skladnik)
  if (!norm) return PUSTE_TRAFIENIA

  const zPamieci = katalog.pamiec.get(norm)
  if (zPamieci) return zPamieci

  const tokenyItemu = tokenizuj(skladnik)
  const rdzenieItemu = new Set(tokenyItemu.map(rdzen))
  const wymaganeItemu = tokenyItemu.filter(t => !SLOWA_OPCJONALNE.has(t)).map(rdzen)

  const kandydaci = new Set()
  for (const r of rdzenieItemu) {
    const kubelek = katalog.wgRdzenia.get(r)
    if (kubelek) for (const i of kubelek) kandydaci.add(i)
  }
  const zNormy = katalog.wgNormy.get(norm)
  if (zNormy) for (const i of zNormy) kandydaci.add(i)

  const perSklep = new Map()
  for (const i of kandydaci) {
    const c = katalog.produkty[i]
    const pasuje = c.norm === norm ||
      (wymaganeItemu.length > 0 && wymaganeItemu.every(r => c.rdzenie.has(r))) ||
      (c.wymagane.length > 0 && c.wymagane.every(r => rdzenieItemu.has(r)))
    if (!pasuje) continue

    const punkty = punktacjaDopasowania(c.tokeny, tokenyItemu)
    const stara = perSklep.get(c.sklep)

    if (!stara ||
        punkty < stara.punkty ||
        (punkty === stara.punkty && c.cena_bazowa < stara.cena_bazowa)) {
      perSklep.set(c.sklep, { ...c, punkty })
    }
  }

  katalog.pamiec.set(norm, perSklep)
  return perSklep
}

// Wspólna pusta mapa — jest tylko odczytywana.
const PUSTE_TRAFIENIA = new Map()

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

  const katalog = katalogCen(ceny)
  const sklepy = katalog.sklepy

  const pozycje = doKupienia.map(item => {
    const trafienia = dopasujCeny(item.skladnik, katalog)
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
