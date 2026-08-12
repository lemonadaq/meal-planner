import { describe, it, expect, vi } from 'vitest'

// ListaZakupow importuje supabase (createClient) — mockujemy, żeby import modułu nie
// wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { przesunPoniedzialek, wybierzWlasneNaTydzien } from '../pages/ListaZakupow'

// Czy pojedynczy produkt przechodzi filtr tygodnia.
const wlasnyNaTydzien = (row, poniedzialek) =>
  wybierzWlasneNaTydzien([row], poniedzialek).length === 1

describe('przesunPoniedzialek', () => {
  it('przesuwa o pełne tygodnie w przód i w tył', () => {
    expect(przesunPoniedzialek('2026-08-10', 1)).toBe('2026-08-17')
    expect(przesunPoniedzialek('2026-08-10', -1)).toBe('2026-08-03')
    expect(przesunPoniedzialek('2026-08-10', -4)).toBe('2026-07-13')
    expect(przesunPoniedzialek('2026-08-10', 0)).toBe('2026-08-10')
  })

  it('przechodzi przez granicę miesiąca i roku', () => {
    expect(przesunPoniedzialek('2026-12-28', 1)).toBe('2027-01-04')
    expect(przesunPoniedzialek('2027-01-04', -1)).toBe('2026-12-28')
  })
})

// Regresja: „dodałem listę zakupów, wyszedłem z apki, wróciłem — wszystko znikło".
// Własne produkty są kluczowane poniedziałkiem tygodnia. Jeśli lista czyta tylko
// dokładnie ten jeden tydzień, to produkt zapisany pod innym tygodniem (bo apka
// pokazywała następny tydzień, albo bo minęła północ z niedzieli na poniedziałek)
// przepada. Niekupione resztki mają się przenosić.
describe('wlasnyNaTydzien — co widać na liście danego tygodnia', () => {
  const PON = '2026-08-10'

  it('produkt z tego tygodnia — widoczny, kupiony czy nie', () => {
    expect(wlasnyNaTydzien({ tydzien: PON, odznaczone: false }, PON)).toBe(true)
    expect(wlasnyNaTydzien({ tydzien: PON, odznaczone: true }, PON)).toBe(true)
  })

  it('niekupiony produkt z poprzedniego tygodnia — przenosi się', () => {
    expect(wlasnyNaTydzien({ tydzien: '2026-08-03', odznaczone: false }, PON)).toBe(true)
  })

  it('kupiony produkt z poprzedniego tygodnia — nie wraca', () => {
    expect(wlasnyNaTydzien({ tydzien: '2026-08-03', odznaczone: true }, PON)).toBe(false)
  })

  it('produkt zaplanowany na przyszły tydzień nie wyskakuje wcześniej', () => {
    expect(wlasnyNaTydzien({ tydzien: '2026-08-17', odznaczone: false }, PON)).toBe(false)
  })

  it('stary rekord bez tygodnia — pokazujemy, zamiast gubić', () => {
    expect(wlasnyNaTydzien({ tydzien: null, odznaczone: false }, PON)).toBe(true)
  })

  it('brak rekordu nie wywraca filtra', () => {
    expect(wlasnyNaTydzien(null, PON)).toBe(false)
  })
})

describe('wybierzWlasneNaTydzien', () => {
  it('filtruje całą listę i zachowuje kolejność', () => {
    const rows = [
      { id: 1, nazwa: 'Musztarda', tydzien: '2026-08-03', odznaczone: false },
      { id: 2, nazwa: 'Mleko', tydzien: '2026-08-03', odznaczone: true },
      { id: 3, nazwa: 'Margaryna', tydzien: '2026-08-10', odznaczone: false },
      { id: 4, nazwa: 'Woda', tydzien: '2026-08-17', odznaczone: false },
    ]
    expect(wybierzWlasneNaTydzien(rows, '2026-08-10').map(r => r.id)).toEqual([1, 3])
  })

  it('pusto/undefined → pusta tablica', () => {
    expect(wybierzWlasneNaTydzien(undefined, '2026-08-10')).toEqual([])
    expect(wybierzWlasneNaTydzien([], '2026-08-10')).toEqual([])
  })
})
