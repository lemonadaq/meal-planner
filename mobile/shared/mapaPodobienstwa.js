// Mapa podobieństwa dań po składnikach (Jaccard similarity).
// Lokalnie, bez API. Liczone ze składników tabeli `dania`.

function jaccardSim(zbiorA, zbiorB) {
  if (zbiorA.size === 0 && zbiorB.size === 0) return 0
  let przeciecie = 0
  for (const s of zbiorA) { if (zbiorB.has(s)) przeciecie++ }
  return przeciecie / (zbiorA.size + zbiorB.size - przeciecie)
}

function normSkladnik(s) {
  return (s || '').toLowerCase().trim()
}

// Buduje mapę: nazwaDania -> Set<składnik> z wierszy tabeli `dania`.
// Wiersze kategorii 7_Przyprawy są pomijane żeby nie szumić wyników.
// wierszeDan: [{ Danie, Składnik, Kategoria }]
export function budujMapeSkladnikow(wierszeDan) {
  const mapa = {}
  for (const w of wierszeDan) {
    if (!w['Danie'] || !w['Składnik']) continue
    if ((w['Kategoria'] || '').startsWith('7_')) continue
    const nazwa = w['Danie']
    if (!mapa[nazwa]) mapa[nazwa] = new Set()
    mapa[nazwa].add(normSkladnik(w['Składnik']))
  }
  return mapa
}

// Zwraca top-N dań najbardziej podobnych do `nazwa` wg Jaccarda.
// mapaSkladnikow: wynik budujMapeSkladnikow()
// Zwraca: [{ danie: string, podobienstwo: number }]
export function podobneDania(nazwa, mapaSkladnikow, n = 5) {
  const zbiorA = mapaSkladnikow[nazwa]
  if (!zbiorA || zbiorA.size === 0) return []

  const wyniki = []
  for (const [inne, zbiorB] of Object.entries(mapaSkladnikow)) {
    if (inne === nazwa) continue
    const sim = jaccardSim(zbiorA, zbiorB)
    if (sim > 0) wyniki.push({ danie: inne, podobienstwo: sim })
  }

  wyniki.sort((a, b) => b.podobienstwo - a.podobienstwo)
  return wyniki.slice(0, n)
}
