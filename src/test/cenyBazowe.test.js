import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: { from: () => ({ select: () => ({ range: () => ({ data: [], error: null }) }) }) },
}))

const { wycenKoszyk, formatujZl } = await import('../cenyBazowe')

const cena = (sklep, produkt, bazowa) => ({
  sklep, produkt, cena_bazowa: bazowa, cena_min: bazowa, obserwacji: 3,
})

const item = (skladnik, opakowania = 1, promos = []) => ({
  skladnik, klucz: skladnik, opakowania, promos,
})

describe('wycenKoszyk', () => {
  it('sumuje koszyk per sklep', () => {
    const wynik = wycenKoszyk(
      [item('masło'), item('mleko')],
      [
        cena('Biedronka', 'Masło', 6.99), cena('Biedronka', 'Mleko', 3.49),
        cena('Lidl', 'Masło', 7.49), cena('Lidl', 'Mleko', 2.99),
      ]
    )

    expect(wynik.sklepy).toHaveLength(2)
    expect(wynik.wspolnych).toBe(2)
    // Biedronka 6.99+3.49 = 10.48, Lidl 7.49+2.99 = 10.48 — remis
    expect(wynik.sklepy[0].koszt).toBeCloseTo(10.48)
  })

  it('mnoży cenę przez liczbę opakowań', () => {
    const wynik = wycenKoszyk([item('masło', 3)], [cena('Biedronka', 'Masło', 6)])
    expect(wynik.sklepy[0].koszt).toBe(18)
  })

  it('brak `opakowania` liczy jako jedno, nie jako zero', () => {
    const wynik = wycenKoszyk([item('masło', null)], [cena('Biedronka', 'Masło', 6)])
    expect(wynik.sklepy[0].koszt).toBe(6)
  })

  it('ułamek opakowania zaokrągla w górę — pół kostki się nie kupi', () => {
    const wynik = wycenKoszyk([item('masło', 1.2)], [cena('Biedronka', 'Masło', 6)])
    expect(wynik.sklepy[0].koszt).toBe(12)
  })

  // Sedno sprawy: sklep, który zna cenę tylko jednej pozycji, nie może wygrać
  // rankingu dlatego, że drugiej nie policzył.
  it('ranking liczy tylko wspólny podzbiór', () => {
    const wynik = wycenKoszyk(
      [item('masło'), item('mleko')],
      [
        cena('Biedronka', 'Masło', 6.99), cena('Biedronka', 'Mleko', 3.49),
        cena('Lidl', 'Masło', 5.99), // Lidl nie zna mleka
      ]
    )

    // Wspólne jest tylko masło — i to po nim idzie ranking.
    expect(wynik.wspolnych).toBe(1)

    const lidl = wynik.sklepy.find(s => s.sklep === 'Lidl')
    const biedronka = wynik.sklepy.find(s => s.sklep === 'Biedronka')

    expect(lidl.koszt).toBeCloseTo(5.99)
    expect(biedronka.koszt).toBeCloseTo(6.99)
    expect(wynik.sklepy[0].sklep).toBe('Lidl')

    // Lidl wygrywa na maśle, ale nie udaje, że zna cały koszyk.
    expect(lidl.wycenionych).toBe(1)
    expect(biedronka.wycenionych).toBe(2)
    expect(lidl.kosztCalosci).toBeCloseTo(5.99)
  })

  it('aktualna promocja bije cenę bazową', () => {
    const wynik = wycenKoszyk(
      [item('masło', 1, [{ store: 'Biedronka', now: 3.99 }])],
      [cena('Biedronka', 'Masło', 6.99)]
    )

    expect(wynik.sklepy[0].koszt).toBeCloseTo(3.99)
    expect(wynik.sklepy[0].kosztBazowy).toBeCloseTo(6.99)
    expect(wynik.sklepy[0].wPromocji).toBe(1)
  })

  it('promocja droższa od bazowej nie podnosi kosztu', () => {
    const wynik = wycenKoszyk(
      [item('masło', 1, [{ store: 'Biedronka', now: 9.99 }])],
      [cena('Biedronka', 'Masło', 6.99)]
    )

    expect(wynik.sklepy[0].koszt).toBeCloseTo(6.99)
    expect(wynik.sklepy[0].wPromocji).toBe(0)
  })

  it('liczy pozycje bez żadnej ceny', () => {
    const wynik = wycenKoszyk(
      [item('masło'), item('szafran')],
      [cena('Biedronka', 'Masło', 6.99)]
    )
    expect(wynik.bezCeny).toBe(1)
  })

  it('pusty koszyk i brak cen nie wywalają wyceny', () => {
    expect(wycenKoszyk([], []).sklepy).toEqual([])
    expect(wycenKoszyk(null, null).sklepy).toEqual([])
    expect(wycenKoszyk([item('masło')], []).bezCeny).toBe(1)
  })
})

describe('formatujZl', () => {
  it('formatuje po polsku', () => {
    expect(formatujZl(12.5)).toBe('12,50 zł')
    expect(formatujZl(0)).toBe('0,00 zł')
  })

  it('nie-liczba daje myślnik', () => {
    expect(formatujZl(undefined)).toBe('—')
    expect(formatujZl(NaN)).toBe('—')
  })
})

// ── pobierzCenyBazowe: błąd musi dojść do UI, nie zniknąć ──
describe('pobierzCenyBazowe', () => {
  it('zwraca komunikat błędu zamiast go połykać', async () => {
    vi.resetModules()
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            range: () => Promise.resolve({
              data: null,
              error: { code: '42P01', message: 'relation "ceny_bazowe_view" does not exist' },
            }),
          }),
        }),
      },
    }))

    const { pobierzCenyBazowe } = await import('../cenyBazowe')
    const wynik = await pobierzCenyBazowe()

    expect(wynik.ceny).toEqual([])
    expect(wynik.blad).toContain('42P01')
    expect(wynik.blad).toContain('does not exist')
  })

  it('przy sukcesie oddaje ceny i brak błędu', async () => {
    vi.resetModules()
    vi.doMock('../supabase', () => ({
      supabase: {
        from: () => ({
          select: () => ({
            range: () => Promise.resolve({
              data: [{ sklep: 'Lidl', produkt: 'Masło', cena_bazowa: 7.49, cena_min: 4.99, obserwacji: 3 }],
              error: null,
            }),
          }),
        }),
      },
    }))

    const { pobierzCenyBazowe } = await import('../cenyBazowe')
    const wynik = await pobierzCenyBazowe()

    expect(wynik.blad).toBeNull()
    expect(wynik.ceny).toHaveLength(1)
  })
})

describe('wycenKoszyk — wybór produktu', () => {
  // Ten sam błąd co w promocjach: przy „najtańszym wygrywa" składnik „masło"
  // łapał chipsy o smaku masła za grosz i zaniżał cały koszyk.
  it('bierze celniejszą nazwę, nie najniższą cenę', () => {
    const wynik = wycenKoszyk(
      [item('masło')],
      [
        cena('Biedronka', 'Chipsy ziemniaczane masło z solą', 0.01),
        cena('Biedronka', 'Masło ekstra Pilos 82%', 6.99),
      ]
    )
    expect(wynik.sklepy[0].koszt).toBeCloseTo(6.99)
  })

  it('odmiana nie blokuje wyceny', () => {
    const wynik = wycenKoszyk(
      [item('pierś z kurczaka')],
      [cena('Biedronka', 'Filet z piersi kurczaka', 15.74)]
    )
    expect(wynik.sklepy[0].wycenionych).toBe(1)
    expect(wynik.sklepy[0].koszt).toBeCloseTo(15.74)
  })
})

describe('wycenKoszyk — ceny kuponowe i opis formy', () => {
  // Blix daje grosz produktom odblokowywanym kuponem za punkty. Jako promocja
  // to prawdziwa oferta, ale jako cena bazowa — nie, i wygrywała każde
  // dopasowanie.
  it('grosz nie służy za cenę bazową', () => {
    const wynik = wycenKoszyk(
      [item('cebula')],
      [
        cena('Biedronka', 'Chipsy ziemniaczane cebulka Wiejskie', 0.01),
        cena('Biedronka', 'Cebula żółta', 1.99),
      ]
    )
    expect(wynik.sklepy[0].koszt).toBeCloseTo(1.99)
  })

  it('gdy zostaje sam grosz, pozycja jest bez ceny', () => {
    const wynik = wycenKoszyk([item('cebula')], [cena('Biedronka', 'Cebula', 0.01)])
    expect(wynik.bezCeny).toBe(1)
  })

  // „w puszce" to opis formy, którego Blix w nazwach nie używa — wymaganie go
  // dawało zero dopasowań, choć „pomidory" są w trzydziestu ofertach.
  it('opis formy nie blokuje dopasowania', () => {
    const wynik = wycenKoszyk(
      [item('pomidory w puszce')],
      [cena('Biedronka', 'Pomidory krojone Pudliszki', 3.49)]
    )
    expect(wynik.sklepy[0].wycenionych).toBe(1)
  })

  it('ale produkt z tym opisem nadal wygrywa', () => {
    const wynik = wycenKoszyk(
      [item('pomidory w puszce')],
      [
        cena('Biedronka', 'Pomidory w puszce Pudliszki', 3.49),
        cena('Biedronka', 'Pomidory', 2.99),
      ]
    )
    expect(wynik.sklepy[0].koszt).toBeCloseTo(3.49)
  })
})

// Katalog cen był tokenizowany od nowa przy każdym przerysowaniu listy.
// Teraz buduje się raz na tablicę z bazy, z pamięcią wyników per składnik.
describe('wycenKoszyk — katalog liczony raz', () => {
  const cena = (produkt, sklep, kwota) => ({
    produkt, sklep, cena_bazowa: kwota, cena_min: kwota, obserwacji: 3,
  })

  it('druga wycena tego samego koszyka daje ten sam wynik', () => {
    const ceny = [cena('Masło Extra 200g', 'Lidl', 7.99), cena('Masło Extra 200g', 'Biedronka', 8.49)]
    const items = [{ klucz: 'masło||g', skladnik: 'masło', opakowania: 1 }]

    const raz = wycenKoszyk(items, ceny)
    const dwa = wycenKoszyk(items, ceny)
    expect(dwa.sklepy).toEqual(raz.sklepy)
    expect(dwa.wspolnych).toBe(raz.wspolnych)
  })

  it('nowa tablica cen NIE dziedziczy wyników po starej', () => {
    const items = [{ klucz: 'masło||g', skladnik: 'masło', opakowania: 1 }]

    const stare = wycenKoszyk(items, [cena('Masło Extra 200g', 'Lidl', 7.99)])
    expect(stare.sklepy[0].kosztCalosci).toBeCloseTo(7.99, 2)

    const nowe = wycenKoszyk(items, [cena('Masło Extra 200g', 'Lidl', 9.49)])
    expect(nowe.sklepy[0].kosztCalosci).toBeCloseTo(9.49, 2)
  })

  it('zmiana liczby opakowań przelicza koszt, choć dopasowanie jest z pamięci', () => {
    const ceny = [cena('Masło Extra 200g', 'Lidl', 7.99)]
    const jedno = wycenKoszyk([{ klucz: 'masło||g', skladnik: 'masło', opakowania: 1 }], ceny)
    const trzy = wycenKoszyk([{ klucz: 'masło||g', skladnik: 'masło', opakowania: 3 }], ceny)

    expect(jedno.sklepy[0].kosztCalosci).toBeCloseTo(7.99, 2)
    expect(trzy.sklepy[0].kosztCalosci).toBeCloseTo(23.97, 2)
  })
})
