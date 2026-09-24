// Dopasowanie odpowiedzi modelu do dań z bazy — po nazwie, odpornie.
//
// Pierwszy przebieg trybu `kuchnie` zgubił ~40% dań z komunikatem „brak
// odpowiedzi", choć model odpowiedział. Powód: klucz mapy był DOKŁADNĄ nazwą
// z bazy, a model potrafi odesłać nazwę minimalnie inną — bez gwiazdki na
// końcu, z prostym cudzysłowem zamiast „typograficznego", z inną spacją.
// Każda taka różnica wyrzucała danie, a przy kolejnym przebiegu kosztowała
// ponowne zapytanie.
//
// Bez side-effectów i bez kluczy API — dzięki temu daje się przetestować.

// Klucz porównania: bez ogonków, bez wielkości liter, bez znaków, które nie
// niosą treści. „Pyzy/kluski śląskie" i „Pyzy / kluski slaskie" to to samo
// danie, a „Jajka po turecku*" to „Jajka po turecku".
export function kluczNazwy(nazwa) {
  return String(nazwa ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/gi, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Łączy dania wysłane do modelu z tym, co odesłał.
 *
 * Trzy podejścia, po kolei:
 *   1. po znormalizowanej nazwie — normalny przypadek,
 *   2. po pozycji, ale TYLKO gdy model odesłał dokładnie tyle pozycji, ile
 *      wysłaliśmy (prompt prosi o tę samą kolejność). Przy innej liczbie
 *      pozycji indeksy się rozjeżdżają i danie dostałoby cudzą kuchnię,
 *      więc wtedy tej drogi nie ma.
 *
 * Zwraca { pary, brakujace } — `pary` to [danieZBazy, odpowiedzModelu].
 */
export function polaczOdpowiedzi(wyslane, odebrane) {
  const lista = Array.isArray(odebrane) ? odebrane : []

  const wgKlucza = new Map()
  for (const pozycja of lista) {
    const klucz = kluczNazwy(pozycja?.nazwa)
    // Pierwsze wystąpienie wygrywa — duplikat nazwy w odpowiedzi nie może
    // nadpisać trafienia, które już mamy.
    if (klucz && !wgKlucza.has(klucz)) wgKlucza.set(klucz, pozycja)
  }

  const poKolei = lista.length === wyslane.length

  const pary = []
  const brakujace = []

  wyslane.forEach((danie, i) => {
    const trafienie = wgKlucza.get(kluczNazwy(danie.nazwa)) || (poKolei ? lista[i] : null)
    if (trafienie) pary.push([danie, trafienie])
    else brakujace.push(danie)
  })

  return { pary, brakujace }
}
