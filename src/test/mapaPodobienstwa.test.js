import { describe, it, expect } from 'vitest'
import { budujMapeSkladnikow, podobneDania } from '../mapaPodobienstwa'

const WIERSZE = [
  { Danie: 'Spaghetti', Składnik: 'Makaron', Kategoria: '5_Produkty sypkie' },
  { Danie: 'Spaghetti', Składnik: 'Mięso mielone', Kategoria: '2_Mięso' },
  { Danie: 'Spaghetti', Składnik: 'Pomidory', Kategoria: '1_Warzywa' },
  { Danie: 'Lasagne', Składnik: 'Makaron', Kategoria: '5_Produkty sypkie' },
  { Danie: 'Lasagne', Składnik: 'Mięso mielone', Kategoria: '2_Mięso' },
  { Danie: 'Lasagne', Składnik: 'Ser', Kategoria: '3_Nabiał' },
  { Danie: 'Sałatka', Składnik: 'Sałata', Kategoria: '1_Warzywa' },
  { Danie: 'Sałatka', Składnik: 'Pomidory', Kategoria: '1_Warzywa' },
]

describe('budujMapeSkladnikow', () => {
  it('buduje mapę nazwa → Set<składnik>', () => {
    const mapa = budujMapeSkladnikow(WIERSZE)
    expect(Object.keys(mapa)).toHaveLength(3)
    expect(mapa['Spaghetti'].size).toBe(3)
    expect(mapa['Spaghetti'].has('makaron')).toBe(true)
  })

  it('pomija kategorię 7_Przyprawy', () => {
    const wiersze = [
      ...WIERSZE,
      { Danie: 'Spaghetti', Składnik: 'Sól', Kategoria: '7_Przyprawy' },
    ]
    const mapa = budujMapeSkladnikow(wiersze)
    expect(mapa['Spaghetti'].has('sól')).toBe(false)
  })

  it('pomija wiersze bez Danie lub Składnik', () => {
    const wiersze = [
      { Danie: '', Składnik: 'coś', Kategoria: '1_X' },
      { Danie: 'X', Składnik: '', Kategoria: '1_X' },
    ]
    const mapa = budujMapeSkladnikow(wiersze)
    expect(Object.keys(mapa)).toHaveLength(0)
  })
})

describe('podobneDania', () => {
  const mapa = budujMapeSkladnikow(WIERSZE)

  it('Spaghetti jest najbardziej podobne do Lasagne', () => {
    const wynik = podobneDania('Spaghetti', mapa, 5)
    expect(wynik[0].danie).toBe('Lasagne')
    expect(wynik[0].podobienstwo).toBeGreaterThan(0.3)
  })

  it('zwraca pustą tablicę dla nieznanego dania', () => {
    expect(podobneDania('Nieznane', mapa)).toEqual([])
  })

  it('nie zawiera samego siebie w wynikach', () => {
    const wynik = podobneDania('Spaghetti', mapa)
    expect(wynik.every(w => w.danie !== 'Spaghetti')).toBe(true)
  })

  it('respektuje limit n', () => {
    const wynik = podobneDania('Spaghetti', mapa, 1)
    expect(wynik).toHaveLength(1)
  })
})
