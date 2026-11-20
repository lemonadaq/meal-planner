// dieta.js
// Pole `dieta` (`masa` / `fit`) i makro na porcję — wspólne dla Przepisów,
// Tygodnia i szczegółów dania.
//
// Kolumny dochodzą migracją `migracja_dieta_makro.sql`. Dopóki ktoś jej nie
// odpali, select z `dieta` zwraca błąd PostgREST („column does not exist")
// i lista przepisów byłaby pusta. Dlatego listy pytają najpierw z `dieta`,
// a na błąd powtarzają zapytanie bez niej — apka działa jak przed zmianą,
// tylko bez chipa diety.

// Wartości techniczne pilnuje DIETY w skrypty/wspolne.js.
export const DIETA_LABEL = { masa: '💪 Na masę', fit: '🥗 Fit' }

// O diecie decydują PROPORCJE makro (udział w kcal), nie kcal na porcję —
// kaloryczność wynika z wielkości porcji. Jedno danie może mieć obie
// etykiety: pole `dieta` to wtedy „masa,fit". Progi liczy SQL
// (supabase/fixes/20261120-2200-dieta-proporcje.sql), tu tylko odczyt.
export function dietyDania(d) {
  if (!d?.dieta) return []
  return String(d.dieta).split(',').map(x => x.trim()).filter(x => x in DIETA_LABEL)
}

// Diety obecne w danych, w kolejności z DIETA_LABEL — chip pokazujemy tylko
// wtedy, gdy jest co filtrować.
export function obecneDiety(dania) {
  return Object.keys(DIETA_LABEL).filter(k => dania.some(d => dietyDania(d).includes(k)))
}

// Porcja pod cel: ile porcji z przepisu zjeść, żeby trafić w kcal na dany
// posiłek. Tylko dla diet, które danie ma, i tylko gdy wynik ma sens
// (0,5–2,5 porcji) — talerz zupy ×3,6 to nie jest porada.
export const CEL_KCAL = {
  obiad:     { fit: 550, masa: 900 },
  sniadanie: { fit: 450, masa: 750 },
  kolacja:   { fit: 450, masa: 750 },
}

export function porcjePodCel(d) {
  const cele = CEL_KCAL[d?.rodzaj]
  const makroKcal = d?.bialko != null && d?.tluszcz != null && d?.wegle != null
    ? 4 * d.bialko + 9 * d.tluszcz + 4 * d.wegle : null
  const kcal = Number(d?.kcal) || makroKcal
  if (!cele || !kcal) return []
  return dietyDania(d)
    .map(k => ({ dieta: k, kcal: cele[k], porcje: Math.round(cele[k] / kcal * 10) / 10 }))
    .filter(p => p.porcje >= 0.5 && p.porcje <= 2.5)
}

// „0,8 porcji ≈ 550 kcal"
export function etykietaPorcji(p) {
  const ile = String(p.porcje).replace('.', ',')
  return `${ile} ${p.porcje === 1 ? 'porcja' : 'porcji'} ≈ ${p.kcal} kcal`
}

// Przy deduplikacji wierszy-składników jednego dania: dieta z któregokolwiek
// wiersza wygrywa (jak `ulubione`), bo składnik dodany ręcznie w edycji mógł
// powstać bez niej.
export function scalDiete(a, b) {
  return a?.dieta || b?.dieta || null
}

// `zapytanie(kolumnyDodatkowe)` → { data, error }. Pierwsza próba z `dieta`,
// druga bez, gdy kolumny jeszcze nie ma w bazie.
export async function zDietaAlboBez(zapytanie) {
  const z = await zapytanie(', dieta')
  if (!z.error) return z
  return zapytanie('')
}

// „B 55 g · T 30 g · W 110 g" — albo null, gdy danie nie ma makro.
export function etykietaMakro(w) {
  if (!w) return null
  const czesci = [['B', w.bialko], ['T', w.tluszcz], ['W', w.wegle]]
    .filter(([, v]) => v != null && v !== '')
    .map(([lit, v]) => `${lit} ${v} g`)
  return czesci.length ? czesci.join(' · ') : null
}
