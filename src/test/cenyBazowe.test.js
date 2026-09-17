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
