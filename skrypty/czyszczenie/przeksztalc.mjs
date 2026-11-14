// Wspólne dla Fazy 3 (raport kcal) i Fazy 4 (zastosuj.mjs): czyta zatwierdzone
// CSV i z wierszy `dania` liczy, jak mają wyglądać po czyszczeniu.
// Nic nie zapisuje — zwraca listę operacji (update / insert / delete).

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parsujIlosc, normalizujNazweMeta } from '../../src/jednostki.js'

export const TU = dirname(fileURLToPath(import.meta.url))

// ── CSV (RFC 4180: cudzysłowy, przecinki i nowe linie w polach) ──
export function czytajCsv(plik) {
  const tekst = readFileSync(join(TU, plik), 'utf8').replace(/^\uFEFF/, '')
  const wiersze = []
  let pole = '', wiersz = [], wCudz = false
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i]
    if (wCudz) {
      if (c === '"' && tekst[i + 1] === '"') { pole += '"'; i++ }
      else if (c === '"') wCudz = false
      else pole += c
    } else if (c === '"') wCudz = true
    else if (c === ',') { wiersz.push(pole); pole = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && tekst[i + 1] === '\n') i++
      wiersz.push(pole); pole = ''
      if (wiersz.length > 1 || wiersz[0] !== '') wiersze.push(wiersz)
      wiersz = []
    } else pole += c
  }
  if (pole || wiersz.length) { wiersz.push(pole); wiersze.push(wiersz) }
  const [naglowek, ...reszta] = wiersze
  return reszta.map(w => Object.fromEntries(naglowek.map((k, i) => [k, w[i] ?? ''])))
}

export function czytajJson(plik) {
  return JSON.parse(readFileSync(join(TU, plik), 'utf8'))
}

// ── Zapis ilości ──
// Jak w bazie: liczby całkowite gołe, ułamki zwykłe dla sztuk i łyżek
// („1/2", „1 1/2" — 803 wiersze tak dziś wyglądają), przecinek dziesiętny dla
// gramów poniżej 10.
const ULAMKI = [[0, ''], [1 / 4, '1/4'], [1 / 3, '1/3'], [1 / 2, '1/2'], [2 / 3, '2/3'], [3 / 4, '3/4'], [1, '']]

export function formatujIlosc(v, jednostka) {
  if (!Number.isFinite(v) || v <= 0) return null
  if (jednostka === 'g' || jednostka === 'ml') {
    if (v >= 100) return String(Math.round(v / 5) * 5)
    if (v >= 10) return String(Math.round(v))
    const r = Math.round(v * 2) / 2
    return String(r || 0.5).replace('.', ',')
  }
  if (v >= 5) return String(Math.round(v))
  let calosc = Math.floor(v)
  const reszta = v - calosc
  let [wart, tekst] = ULAMKI.reduce((a, b) => (Math.abs(b[0] - reszta) < Math.abs(a[0] - reszta) ? b : a))
  if (wart === 1) { calosc += 1; tekst = '' }
  if (calosc === 0 && !tekst) tekst = '1/4' // nie zjeżdżamy do zera
  return [calosc || '', tekst].filter(Boolean).join(' ')
}

// ── Wczytanie zatwierdzonych CSV ──
export function wczytajMapowania() {
  const mapa = new Map() // `${nazwa_stara}\u0000${jednostka_stara}` → [{...}]
  for (const w of czytajCsv('mapowanie_skladnikow.csv')) {
    const k = `${w.nazwa_stara}\u0000${w.jednostka_stara}`
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push({ ...w, mnoznik: parseFloat(w.mnoznik) })
  }
  const dania = new Map(czytajCsv('dania_meta.csv').map(w => [w.danie_stare, w]))
  const meta = czytajCsv('skladniki_meta_nowe.csv').map(m => ({
    ...m,
    aliasy: m.aliasy ? m.aliasy.split('|') : [],
    kcal_100g: m.kcal_100g === '' ? null : parseFloat(m.kcal_100g),
    waga_sztuki_g: m.waga_sztuki_g === '' ? null : parseFloat(m.waga_sztuki_g),
    rozmiar_opakowania: m.rozmiar_opakowania === '' ? null : parseFloat(m.rozmiar_opakowania),
    zaokraglaj: m.zaokraglaj === 'true',
  }))
  return { mapa, dania, meta }
}

// Poziom w CSV ma ogonki (jak w zadaniu), w bazie jest CHECK bez ogonków.
export const POZIOM_DO_BAZY = { 'łatwe': 'latwe', 'średnie': 'srednie', 'trudne': 'trudne' }
export function kuchniaDoBazy(k) {
  return (k || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
}

// ── Wyjątki per danie ──
// „Bagietka 3 szt" w bruschettcie to trzy KROMKI, a „1/2 szt" w kanapce to pół
// bagietki — jedna para (nazwa, jednostka) z dwoma znaczeniami, więc mnożnik
// z CSV tu nie wystarcza. Kromka ≈ 30 g ≈ 1/8 bagietki.
export const BAGIETKA_W_KROMKACH = new Set([
  'Bruschetta z pomidorami i bazylią', 'Bruschetta z pieczarkami', 'Carpaccio z buraka na grzankach',
  'Cebulowa (po francusku)', 'Grzanki czosnkowe z serem', 'Crostini z wątróbką drobiową',
  'Tapenada z oliwek', 'Sałatka z kurczakiem, fetą i grzankami',
])

// ── Przekształcenie wierszy `dania` ──
// Zwraca { operacje, wynik, bledy }:
//   operacje: [{typ:'update', id, zmiany}, {typ:'insert', wiersz}, {typ:'delete', id}]
//   wynik: Map(danie_nowe → [wiersze po zmianie]) — do liczenia kcal
export function przeksztalcDania(daniaWiersze, { mapa, dania }) {
  const operacje = []
  const bledy = []
  const wynik = new Map()

  const grupy = new Map()
  for (const r of daniaWiersze) {
    if (!grupy.has(r.Danie)) grupy.set(r.Danie, [])
    grupy.get(r.Danie).push(r)
  }

  for (const [stara, rs] of grupy) {
    const meta = dania.get(stara)
    if (!meta) { bledy.push(`brak w dania_meta.csv: ${JSON.stringify(stara)}`); continue }
    const noweWiersze = [] // {id|null, Składnik, Jednostka, ilosc, Kategoria, zrodlo}

    for (const r of rs) {
      const k = `${r['Składnik'] || ''}\u0000${r.Jednostka || ''}`
      const cele = mapa.get(k)
      if (!cele) { bledy.push(`brak mapowania: ${JSON.stringify(r['Składnik'])} [${r.Jednostka}] (${stara})`); continue }
      cele.forEach((c, i) => {
        const surowa = r['Ilość na 1 porcję']
        let ilosc = surowa
        let mn = c.mnoznik
        if (c.nazwa_nowa === 'bagietka' && c.jednostka_nowa === 'szt' && BAGIETKA_W_KROMKACH.has(stara)) mn *= 1 / 8
        if (mn !== 1) {
          const v = parsujIlosc(surowa)
          ilosc = v == null ? surowa : formatujIlosc(v * mn, c.jednostka_nowa)
        }
        noweWiersze.push({
          id: i === 0 ? r.id : null,
          'Składnik': c.nazwa_nowa,
          Jednostka: c.jednostka_nowa || null,
          'Ilość na 1 porcję': ilosc,
          Kategoria: c.kategoria_nowa,
          wzor: r,
        })
      })
    }

    // Ten sam składnik i jednostka dwa razy w jednym daniu → jeden wiersz z sumą.
    const scalone = []
    const poKluczu = new Map()
    for (const w of noweWiersze) {
      const k = `${w['Składnik']}\u0000${w.Jednostka || ''}`
      const juz = poKluczu.get(k)
      if (!juz) { poKluczu.set(k, w); scalone.push(w); continue }
      const a = parsujIlosc(juz['Ilość na 1 porcję']), b = parsujIlosc(w['Ilość na 1 porcję'])
      if (a != null || b != null) {
        juz['Ilość na 1 porcję'] = formatujIlosc((a || 0) + (b || 0), juz.Jednostka)
      }
      if (juz.id == null && w.id != null) juz.id = w.id
      else if (w.id != null) operacje.push({ typ: 'delete', id: w.id, powod: `scalony z ${w['Składnik']} (${stara})` })
    }

    const nowaNazwa = meta.danie_nowe
    const wspolne = {
      Danie: nowaNazwa,
      kuchnia: kuchniaDoBazy(meta.kuchnia),
      poziom: POZIOM_DO_BAZY[meta.poziom],
    }
    for (const w of scalone) {
      const pola = {
        ...wspolne,
        'Składnik': w['Składnik'],
        Jednostka: w.Jednostka,
        'Ilość na 1 porcję': w['Ilość na 1 porcję'],
        Kategoria: w.Kategoria,
      }
      if (w.id != null) {
        const stary = rs.find(r => r.id === w.id)
        const zmiany = Object.fromEntries(Object.entries(pola).filter(([k, v]) => stary[k] !== v))
        if (Object.keys(zmiany).length) operacje.push({ typ: 'update', id: w.id, zmiany })
      } else {
        // nowy wiersz (ROZBIJ albo scalenie bez id) — reszta kolumn z pierwszego wiersza dania
        const wzor = { ...rs[0] }
        delete wzor.id
        operacje.push({ typ: 'insert', wiersz: { ...wzor, ...pola } })
      }
    }
    wynik.set(nowaNazwa, scalone.map(w => ({ ...w, ...wspolne, wzor: undefined })))
  }
  return { operacje, wynik, bledy }
}

// Mapowanie samej NAZWY składnika (dla tabel zakupowych: zakupy_historia,
// produkty_w_domu, korekty_zakupow…). Bez jednostki — bierzemy wariant, który
// występuje najczęściej. Zwraca Map(nazwa_stara → nazwa_nowa); klucze też po
// normalizacji, bo w tych tabelach pisownia bywa inna niż w przepisach.
export function mapaNazwSkladnikow(mapa) {
  const glosy = new Map()
  for (const cele of mapa.values()) {
    const c = cele[0]
    for (const klucz of [c.nazwa_stara, normalizujNazweMeta(c.nazwa_stara)]) {
      if (!glosy.has(klucz)) glosy.set(klucz, new Map())
      const g = glosy.get(klucz)
      g.set(c.nazwa_nowa, (g.get(c.nazwa_nowa) || 0) + parseInt(c.wiersze || '1', 10))
    }
  }
  const out = new Map()
  for (const [k, g] of glosy) out.set(k, [...g.entries()].sort((a, b) => b[1] - a[1])[0][0])
  return out
}
