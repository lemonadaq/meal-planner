// Paginowane pobieranie z Supabase — PostgREST ucina odpowiedź do 1000 wierszy
// (nawet z .limit() powyżej tego), więc pełne tabele trzeba dociągać stronami.
// Tabela `dania` to wiersz per składnik (~2500+ wierszy), przez co selecty bez
// paginacji widziały tylko arbitralny kawałek bazy (np. reroll losował z 2 dań).
//
// budujZapytanie: funkcja zwracająca ŚWIEŻY builder zapytania przy każdym
// wywołaniu (z .select i najlepiej .order dla stabilnej kolejności stron).

const STRONA = 1000

export async function pobierzWszystkieWiersze(budujZapytanie, strona = STRONA) {
  let od = 0
  let wszystkie = []
  while (true) {
    const { data, error } = await budujZapytanie().range(od, od + strona - 1)
    if (error) return { data: wszystkie, error }
    if (!data?.length) break
    wszystkie = wszystkie.concat(data)
    if (data.length < strona) break
    od += strona
  }
  return { data: wszystkie, error: null }
}
