import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { sprawdzDanie, wczytajPlik } from '../../skrypty/import-dan.js'
import { wczytajDania } from '../../skrypty/wspolne.js'

// Tryb `import` wstawia do bazy to, co stoi w pliku — bez modelu, który
// pilnowałby schematu. Walidacja jest więc jedyną barierą między literówką
// a wierszem, który zniknie z filtrów w apce.

const DANIE_OK = {
  nazwa: 'Quiche lorraine',
  rodzaj: 'obiad',
  kuchnia: 'francuska',
  poziom: 'srednie',
  czas_minuty: 70,
  kcal: 520,
  skladniki: [
    { nazwa: 'mąka pszenna', ilosc: '50', jednostka: 'g', kategoria: '5_Produkty sypkie' },
    { nazwa: 'jajka', ilosc: '3/4', jednostka: 'szt', kategoria: '3_Nabiał' },
  ],
  kroki: ['Zagnieć ciasto.', 'Piecz 30 minut.'],
  opis_wizualny: 'A round open tart with a golden crust.',
}

describe('sprawdzDanie', () => {
  it('poprawne danie przechodzi bez uwag', () => {
    expect(sprawdzDanie(DANIE_OK)).toEqual([])
  })

  it('łapie rodzaj poza listą', () => {
    expect(sprawdzDanie({ ...DANIE_OK, rodzaj: 'obiadek' })[0]).toMatch(/rodzaj/)
  })

  it('łapie kategorię składnika poza listą — to ona układa listę zakupów', () => {
    const danie = { ...DANIE_OK, skladniki: [{ ...DANIE_OK.skladniki[0], kategoria: 'warzywa' }, DANIE_OK.skladniki[1]] }
    expect(sprawdzDanie(danie)[0]).toMatch(/kategoria/)
  })

  it('łapie jednostkę poza enumem', () => {
    const danie = { ...DANIE_OK, skladniki: [{ ...DANIE_OK.skladniki[0], jednostka: 'kg' }, DANIE_OK.skladniki[1]] }
    expect(sprawdzDanie(danie)[0]).toMatch(/jednostka/)
  })

  it('wymaga opisu wyglądu, bo bez niego nie ma z czego zrobić zdjęcia', () => {
    const bezOpisu = { ...DANIE_OK }
    delete bezOpisu.opis_wizualny
    expect(sprawdzDanie(bezOpisu)[0]).toMatch(/opis_wizualny/)
  })

  it('wymaga składników i kroków', () => {
    expect(sprawdzDanie({ ...DANIE_OK, skladniki: [] })[0]).toMatch(/składniki/)
    expect(sprawdzDanie({ ...DANIE_OK, kroki: ['jeden'] })[0]).toMatch(/kroki/)
  })

  it('łapie kcal jako tekst', () => {
    expect(sprawdzDanie({ ...DANIE_OK, kcal: -5 })[0]).toMatch(/kcal/)
  })
})

describe('wczytajPlik', () => {
  it('przerabia plik na format, który rozumie potok.js', () => {
    const dania = wczytajPlik(JSON.stringify([DANIE_OK]), 'test.json')
    expect(dania).toHaveLength(1)
    expect(dania[0].nazwa).toBe('Quiche lorraine')
    expect(dania[0].przepis.kroki).toHaveLength(2)
    expect(dania[0].przepis.opis_wizualny).toContain('tart')
  })

  it('zły JSON zatrzymuje przebieg z nazwą pliku w komunikacie', () => {
    expect(() => wczytajPlik('{nie json', 'paczka-07.json')).toThrow(/paczka-07\.json/)
  })

  it('jedno złe danie wywala CAŁY plik — lepiej stanąć niż wstawić połowę', () => {
    expect(() => wczytajPlik(JSON.stringify([DANIE_OK, { nazwa: 'Złe', rodzaj: 'xyz' }]), 'p.json'))
      .toThrow(/rodzaj/)
  })
})

describe('paczki w skrypty/dania', () => {
  const pliki = readdirSync('skrypty/dania').filter(f => f.endsWith('.json'))

  it('jest co importować', () => {
    expect(pliki.length).toBeGreaterThan(0)
  })

  it.each(pliki)('%s przechodzi walidację', plik => {
    const dania = wczytajPlik(readFileSync(`skrypty/dania/${plik}`, 'utf-8'), plik)
    expect(dania.length).toBeGreaterThan(0)
  })

  it('żadne danie nie powtarza się między paczkami', () => {
    const nazwy = pliki.flatMap(p =>
      wczytajPlik(readFileSync(`skrypty/dania/${p}`, 'utf-8'), p).map(d => d.nazwa.toLowerCase()))
    expect(new Set(nazwy).size).toBe(nazwy.length)
  })

  it('nie ma przekąsek — Filip prosił, żeby je na razie zostawić', () => {
    const rodzaje = pliki.flatMap(p =>
      wczytajPlik(readFileSync(`skrypty/dania/${p}`, 'utf-8'), p).map(d => d.rodzaj))
    expect(rodzaje).not.toContain('przekaska')
  })
})

// ── Lista dań z pola `dania` albo z pliku rezerwowego ─────────────
// Pole w akcji jest jednolinijkowe, więc dania podaje się po średniku.
// Plik rezerwowy ma komentarze — i tu był błąd: średnik w komentarzu
// rozcinał go i druga połowa wchodziła do przebiegu jako danie.
describe('wczytajDania', () => {
  it('czyta dania po średniku z jednej linii', () => {
    expect(wczytajDania('Bigos|obiad; Żurek|zupa')).toEqual([
      { nazwa: 'Bigos', rodzaj: 'obiad' },
      { nazwa: 'Żurek', rodzaj: 'zupa' },
    ])
  })

  it('czyta dania z wielu linii', () => {
    expect(wczytajDania('Bigos|obiad\nŻurek|zupa')).toHaveLength(2)
  })

  it('NIE bierze dania z komentarza ze średnikiem', () => {
    expect(wczytajDania('# przykład: Bigos|obiad; Żurek|zupa')).toEqual([])
  })

  it('pomija puste linie i komentarze', () => {
    expect(wczytajDania('# naglowek\n\nBigos|obiad\n\n# stopka')).toEqual([
      { nazwa: 'Bigos', rodzaj: 'obiad' },
    ])
  })

  it('brak rodzaju znaczy obiad', () => {
    expect(wczytajDania('Bigos')).toEqual([{ nazwa: 'Bigos', rodzaj: 'obiad' }])
  })

  it('plik rezerwowy w repo jest pusty — żadnego dania', () => {
    // Dopóki leżała w nim stara paczka, puste pole `dania` w akcji znaczyło
    // „przerób 37 dań, które już są w bazie" (run 40275904955).
    expect(wczytajDania(readFileSync('skrypty/nowe-dania.txt', 'utf-8'))).toEqual([])
  })
})
