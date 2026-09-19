import { describe, it, expect, vi, beforeEach } from 'vitest'

// Fabryka mocka Supabase: odpowiada inaczej na zapytanie liczące (head: true)
// niż na pobranie strony, bo to właśnie na ich rozjeździe wykładała się
// optymalizacja równoległych stron.
const stan = {
  count: 0,
  bladLicznika: null,
  strony: [],
  zapytaniaOStrony: 0,
  sortowanie: [],
}

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: (_kolumny, opcje) => {
        const licznik = opcje?.head === true
        const wynik = {
          gte: () => {
            if (licznik) {
              return Promise.resolve({ count: stan.count, error: stan.bladLicznika })
            }
            // order() zwraca siebie, żeby dało się je łańcuchować jak w PostgREST,
            // i notuje kolumny — po tym poznajemy, że stronicowanie ma stabilny
            // porządek.
            const zapytanie = {
              order: (kolumna) => { stan.sortowanie.push(kolumna); return zapytanie },
              range: (od) => {
                stan.zapytaniaOStrony++
                const strona = stan.strony[Math.floor(od / 1000)]
                return Promise.resolve(strona ?? { data: [], error: null })
              },
            }
            return zapytanie
          },
        }
        return wynik
      },
    }),
  },
}))

const { pobierzAktualnePromocje } = await import('../promocjeMatch')

const ofertaTestowa = (nazwa, cena) => ({
  product_name: nazwa,
  price: cena,
  old_price: null,
  store_name: 'Biedronka',
  offer_end_at: '2099-12-31T23:59:00.000Z',
})

beforeEach(() => {
  localStorage.clear()
  stan.count = 0
  stan.bladLicznika = null
  stan.strony = []
  stan.zapytaniaOStrony = 0
  stan.sortowanie = []
})

describe('pobierzAktualnePromocje', () => {
  it('pobiera oferty gdy licznik zwraca liczbę', async () => {
    stan.count = 2
    stan.strony = [{ data: [ofertaTestowa('Masło', 5.99), ofertaTestowa('Mleko', 2.99)], error: null }]

    const wynik = await pobierzAktualnePromocje()

    expect(wynik).toHaveLength(2)
    expect(wynik[0].nazwa).toBe('Masło')
    expect(wynik[0].cena_nowa).toBe(5.99)
  })

  // To jest ten przypadek, przez który promocje zniknęły z listy: HEAD nie
  // zwraca Content-Range (proxy, cache, RLS), supabase-js oddaje count === null,
  // a kod uznawał to za „zero ofert" i kończył z pustą tablicą.
  it('gdy licznik nie zwraca count, schodzi na pętlę zamiast oddać pustkę', async () => {
    stan.count = null
    stan.strony = [{ data: [ofertaTestowa('Masło', 5.99)], error: null }]

    const wynik = await pobierzAktualnePromocje()

    expect(wynik).toHaveLength(1)
    expect(stan.zapytaniaOStrony).toBeGreaterThan(0)
  })

  it('gdy licznik zwraca błąd, też schodzi na pętlę', async () => {
    stan.count = null
    stan.bladLicznika = { message: 'statement timeout' }
    stan.strony = [{ data: [ofertaTestowa('Mleko', 2.99)], error: null }]

    const wynik = await pobierzAktualnePromocje()

    expect(wynik).toHaveLength(1)
  })

  it('pusty wynik NIE trafia do cache (inaczej awaria zostaje na 6 godzin)', async () => {
    stan.count = 0
    stan.strony = []

    await pobierzAktualnePromocje()

    expect(localStorage.getItem('promocje_cache')).toBeNull()
  })

  it('niepełny wynik (błąd strony) też nie trafia do cache', async () => {
    stan.count = 1500
    stan.strony = [
      { data: [ofertaTestowa('Masło', 5.99)], error: null },
      { data: null, error: { message: 'timeout' } },
    ]

    const wynik = await pobierzAktualnePromocje()

    expect(wynik).toHaveLength(1)
    expect(localStorage.getItem('promocje_cache')).toBeNull()
  })

  it('pełny wynik trafia do cache i drugie wywołanie nie pyta bazy', async () => {
    stan.count = 1
    stan.strony = [{ data: [ofertaTestowa('Masło', 5.99)], error: null }]

    await pobierzAktualnePromocje()
    const poPierwszym = stan.zapytaniaOStrony

    const drugi = await pobierzAktualnePromocje()

    expect(drugi).toHaveLength(1)
    expect(stan.zapytaniaOStrony).toBe(poPierwszym)
  })
})

// OFFSET bez ORDER BY nie obiecuje niczego — a strony lecą RÓWNOLEGLE, każda
// własnym planem. Bez stabilnego porządku ta sama oferta mogła wpaść dwa razy
// albo wypaść z wyniku, czyli zniknąć z listy zakupów bez śladu.
describe('pobierzAktualnePromocje — stabilne stronicowanie', () => {
  it('każda strona jest sortowana po unikalnej parze kolumn', async () => {
    stan.count = 1500
    stan.strony = [
      { data: [ofertaTestowa('Masło', 5.99)], error: null },
      { data: [ofertaTestowa('Mleko', 2.99)], error: null },
    ]

    await pobierzAktualnePromocje()

    // dwie strony × dwie kolumny sortowania
    expect(stan.sortowanie).toEqual(['offer_end_at', 'source_hash', 'offer_end_at', 'source_hash'])
  })

  it('pętla bez licznika też sortuje', async () => {
    stan.bladLicznika = { message: 'brak licznika' }
    stan.strony = [{ data: [ofertaTestowa('Masło', 5.99)], error: null }]

    await pobierzAktualnePromocje()

    expect(stan.sortowanie).toEqual(['offer_end_at', 'source_hash'])
  })
})
