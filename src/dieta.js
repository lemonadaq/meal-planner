// dieta.js
// Pole `dieta` (np. `masa`) i makro na porcję — wspólne dla Przepisów,
// Tygodnia i szczegółów dania.
//
// Kolumny dochodzą migracją `migracja_dieta_makro.sql`. Dopóki ktoś jej nie
// odpali, select z `dieta` zwraca błąd PostgREST („column does not exist")
// i lista przepisów byłaby pusta. Dlatego listy pytają najpierw z `dieta`,
// a na błąd powtarzają zapytanie bez niej — apka działa jak przed zmianą,
// tylko bez chipa diety.

// Wartości techniczne pilnuje DIETY w skrypty/wspolne.js.
export const DIETA_LABEL = { masa: '💪 Na masę' }

// Diety obecne w danych, w kolejności z DIETA_LABEL — chip pokazujemy tylko
// wtedy, gdy jest co filtrować.
export function obecneDiety(dania) {
  return Object.keys(DIETA_LABEL).filter(k => dania.some(d => d.dieta === k))
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
