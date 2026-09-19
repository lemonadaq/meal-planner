import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: { from: () => ({ select: () => ({ gte: () => ({ range: () => ({ data: [], error: null }) }) }) }) },
}))

import { normalizujNazwePromo, etykietaWazneDo, dopasujPromocje } from '../promocjeMatch'

describe('normalizujNazwePromo', () => {
  it('lowercase + trim', () => {
    expect(normalizujNazwePromo('  Masło Extra  ')).toBe('masło extra')
  })

  it('wiele spacji → jedna', () => {
    expect(normalizujNazwePromo('ser   żółty   gouda')).toBe('ser żółty gouda')
  })

  it('puste → pusty string', () => {
    expect(normalizujNazwePromo()).toBe('')
    expect(normalizujNazwePromo('')).toBe('')
  })
})

describe('etykietaWazneDo', () => {
  it('dziś → "dziś!"', () => {
    const dzis = new Date()
    const y = dzis.getFullYear()
    const m = String(dzis.getMonth() + 1).padStart(2, '0')
    const d = String(dzis.getDate()).padStart(2, '0')
    expect(etykietaWazneDo(`${y}-${m}-${d}`)).toBe('dziś!')
  })

  it('jutro → "do jutra"', () => {
    const jutro = new Date()
    jutro.setDate(jutro.getDate() + 1)
    const y = jutro.getFullYear()
    const m = String(jutro.getMonth() + 1).padStart(2, '0')
    const d = String(jutro.getDate()).padStart(2, '0')
    expect(etykietaWazneDo(`${y}-${m}-${d}`)).toBe('do jutra')
  })
})

describe('dopasujPromocje', () => {
  const promocje = [
    { nazwa_norm: 'masło extra', nazwa: 'Masło Extra', cena_nowa: 4.99, cena_stara: 6.99, sklep: 'Biedronka', wazne_do: '2099-12-31', rabat_label: '-28%' },
    { nazwa_norm: 'cebula', nazwa: 'Cebula', cena_nowa: 1.99, cena_stara: 2.99, sklep: 'Lidl', wazne_do: '2099-12-31', rabat_label: null },
    { nazwa_norm: 'cebula prażona', nazwa: 'Cebula prażona', cena_nowa: 3.49, cena_stara: null, sklep: 'Auchan', wazne_do: '2099-12-31', rabat_label: null },
  ]

  it('dopasowuje exact match', () => {
    const items = [{ skladnik: 'Masło extra' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeTruthy()
    expect(wynik[0].promo.store).toBe('Biedronka')
    expect(wynik[0].promo.now).toBe(4.99)
  })

  it('dopasowuje przez tokeny', () => {
    const items = [{ skladnik: 'Cebula' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeTruthy()
    expect(wynik[0].promo.store).toBe('Lidl')
  })

  it('nie dopasowuje cebuli prażonej do zwykłej cebuli', () => {
    const items = [{ skladnik: 'Cebula' }]
    const wynik = dopasujPromocje(items, promocje)
    const sklepy = wynik[0].promos.map(p => p.store)
    expect(sklepy).not.toContain('Auchan')
  })

  it('zwraca promo=null gdy brak dopasowania', () => {
    const items = [{ skladnik: 'Awokado' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeNull()
  })

  it('puste promocje → items bez zmian', () => {
    const items = [{ skladnik: 'X' }]
    const wynik = dopasujPromocje(items, [])
    expect(wynik).toEqual(items)
  })
})

// ── Rdzeniowanie i wybór po celności nazwy ──
describe('rdzen', () => {
  it('skleja formy tego samego słowa', async () => {
    const { rdzen } = await import('../promocjeMatch')
    expect(rdzen('piersi')).toBe(rdzen('pierś'))
    expect(rdzen('marchewka')).toBe(rdzen('marchew'))
    expect(rdzen('cebulka')).toBe(rdzen('cebula'))
  })

  it('nie skraca poniżej 4 znaków', async () => {
    const { rdzen } = await import('../promocjeMatch')
    expect(rdzen('ryż').length).toBeGreaterThanOrEqual(3)
    expect(rdzen('soli').length).toBeGreaterThanOrEqual(4)
  })

  it('zdejmuje ogonki', async () => {
    const { rdzen } = await import('../promocjeMatch')
    expect(rdzen('żółty')).not.toMatch(/[żółć]/)
  })
})

describe('dopasujPromocje — wybór oferty', () => {
  // Regresja: „najtańsza wygrywa" podstawiało chipsy o smaku cebulki
  // zamiast cebuli, bo śmieć bywa tańszy od prawdziwego produktu.
  it('wybiera celniejszą nazwę, nie niższą cenę', () => {
    const promocje = [
      { nazwa: 'Chipsy ziemniaczane cebulka Wiejska', cena_nowa: 0.01, cena_stara: null, sklep: 'Biedronka', wazne_do: '2099-12-31' },
      { nazwa: 'Cebula żółta', cena_nowa: 1.99, cena_stara: null, sklep: 'Biedronka', wazne_do: '2099-12-31' },
    ]
    const wynik = dopasujPromocje([{ skladnik: 'cebula', klucz: 'c' }], promocje)

    expect(wynik[0].promo.now).toBe(1.99)
  })

  it('przy równie celnych nazwach decyduje cena', () => {
    const promocje = [
      { nazwa: 'Cebula', cena_nowa: 2.99, cena_stara: null, sklep: 'Lidl', wazne_do: '2099-12-31' },
      { nazwa: 'Cebula', cena_nowa: 1.49, cena_stara: null, sklep: 'Lidl', wazne_do: '2099-12-31' },
    ]
    const wynik = dopasujPromocje([{ skladnik: 'cebula', klucz: 'c' }], promocje)

    expect(wynik[0].promo.now).toBe(1.49)
  })

  it('odmiana nie blokuje dopasowania', () => {
    const promocje = [
      { nazwa: 'Filet z piersi kurczaka', cena_nowa: 15.74, cena_stara: null, sklep: 'Biedronka', wazne_do: '2099-12-31' },
    ]
    const wynik = dopasujPromocje([{ skladnik: 'pierś z kurczaka', klucz: 'p' }], promocje)

    expect(wynik[0].promo?.now).toBe(15.74)
  })

  it('myślnik rozdziela słowa w nazwie z Blixa', async () => {
    const { tokenizuj } = await import('../promocjeMatch')
    expect(tokenizuj('marchew-banan-jabłko')).toEqual(['marchew', 'banan', 'jabłko'])
  })
})

// Dopasowanie chodziło po WSZYSTKICH ofertach przy każdym przerysowaniu listy
// (4000 ofert × 60 pozycji ≈ 3,7 s blokady UI), więc doszedł indeks po
// rdzeniach i pamięć wyników per nazwa. Te testy pilnują, żeby pamięć nie
// zaczęła kłamać — reszta pliku sprawdza, że wyniki są te same co wcześniej.
describe('dopasujPromocje — indeks i pamięć podręczna', () => {
  const oferta = (nazwa, sklep, cena) => ({
    nazwa, nazwa_norm: nazwa.toLowerCase(), sklep,
    cena_nowa: cena, cena_stara: cena + 2, wazne_do: '2099-12-31',
  })

  it('drugie wywołanie na tej samej tablicy daje ten sam wynik', () => {
    const promocje = [oferta('Masło Extra 200g', 'Lidl', 5.99)]
    const items = [{ klucz: 'masło||g', skladnik: 'masło' }]

    const raz = dopasujPromocje(items, promocje)
    const dwa = dopasujPromocje(items, promocje)
    expect(dwa[0].promo).toEqual(raz[0].promo)
    expect(dwa[0].promo.now).toBe(5.99)
  })

  it('nowa tablica promocji NIE dziedziczy wyników po starej', () => {
    const items = [{ klucz: 'masło||g', skladnik: 'masło' }]

    const stare = dopasujPromocje(items, [oferta('Masło Extra 200g', 'Lidl', 5.99)])
    expect(stare[0].promo.now).toBe(5.99)

    // Scraper przeliczył gazetki — inna tablica, inne ceny.
    const nowe = dopasujPromocje(items, [oferta('Masło Extra 200g', 'Lidl', 4.49)])
    expect(nowe[0].promo.now).toBe(4.49)
  })

  it('ta sama nazwa w dwóch pozycjach listy dostaje to samo dopasowanie', () => {
    const promocje = [oferta('Cebula żółta luzem', 'Biedronka', 2.49)]
    const wynik = dopasujPromocje([
      { klucz: 'cebula||g', skladnik: 'cebula' },
      { klucz: 'cebula||szt.', skladnik: 'Cebula' }, // inna wielkość liter
    ], promocje)

    expect(wynik[0].promo.now).toBe(2.49)
    expect(wynik[1].promo.now).toBe(2.49)
  })

  it('pozycja bez dopasowania nie dostaje promocji z pamięci sąsiada', () => {
    const promocje = [oferta('Masło Extra 200g', 'Lidl', 5.99)]
    const wynik = dopasujPromocje([
      { klucz: 'masło||g', skladnik: 'masło' },
      { klucz: 'gochujang||g', skladnik: 'pasta gochujang' },
    ], promocje)

    expect(wynik[0].promo).not.toBeNull()
    expect(wynik[1].promo).toBeNull()
    expect(wynik[1].promos).toEqual([])
  })
})
