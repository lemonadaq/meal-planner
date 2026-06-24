import { describe, it, expect } from 'vitest'
import { obliczScorySurowe, scoreDoMnoznika, budujWagiUczenia, propagujPrzezPodobienstwo } from '../wagiPreferencji'
import { budujMapeSkladnikow } from '../mapaPodobienstwa'

const teraz = new Date().toISOString()

describe('obliczScorySurowe', () => {
  it('puste sygnały → pusty obiekt', () => {
    expect(obliczScorySurowe([])).toEqual({})
  })

  it('zaplanuj daje pozytywny score', () => {
    const wynik = obliczScorySurowe([
      { danie: 'Pizza', akcja: 'zaplanuj', created_at: teraz },
    ])
    expect(wynik['Pizza']).toBeGreaterThan(0)
  })

  it('podmien_out daje negatywny score', () => {
    const wynik = obliczScorySurowe([
      { danie: 'Ryba', akcja: 'podmien_out', created_at: teraz },
    ])
    expect(wynik['Ryba']).toBeLessThan(0)
  })

  it('przenies jest neutralny (score = 0)', () => {
    const wynik = obliczScorySurowe([
      { danie: 'Zupa', akcja: 'przenies', created_at: teraz },
    ])
    expect(wynik['Zupa']).toBeUndefined()
  })
})

describe('scoreDoMnoznika', () => {
  it('score 0 → mnożnik dokładnie 1.0', () => {
    expect(scoreDoMnoznika(0)).toBe(1)
  })

  it('pozytywny score → mnożnik > 1', () => {
    expect(scoreDoMnoznika(3)).toBeGreaterThan(1)
  })

  it('negatywny score → mnożnik < 1', () => {
    expect(scoreDoMnoznika(-3)).toBeLessThan(1)
  })

  it('mnożnik zawsze w zakresie [0.25, 3.0]', () => {
    expect(scoreDoMnoznika(100)).toBeLessThanOrEqual(3)
    expect(scoreDoMnoznika(-100)).toBeGreaterThanOrEqual(0.25)
  })
})

describe('budujWagiUczenia', () => {
  it('puste sygnały → pusty obiekt', () => {
    expect(budujWagiUczenia({ sygnaly: [] })).toEqual({})
  })

  it('odrzucone danie (3× podmien_out) ma mnożnik < 1', () => {
    const sygnaly = Array(3).fill(null).map(() => ({
      danie: 'Grochówka', akcja: 'podmien_out', created_at: teraz,
    }))
    const wagi = budujWagiUczenia({ sygnaly })
    expect(wagi['Grochówka']).toBeLessThan(1)
  })

  it('lubiane danie (3× zaplanuj) ma mnożnik > 1', () => {
    const sygnaly = Array(3).fill(null).map(() => ({
      danie: 'Pierogi', akcja: 'zaplanuj', created_at: teraz,
    }))
    const wagi = budujWagiUczenia({ sygnaly })
    expect(wagi['Pierogi']).toBeGreaterThan(1)
  })
})

describe('propagujPrzezPodobienstwo', () => {
  const wiersze = [
    { Danie: 'A', Składnik: 'Mąka', Kategoria: '5_X' },
    { Danie: 'A', Składnik: 'Jajka', Kategoria: '3_X' },
    { Danie: 'A', Składnik: 'Mleko', Kategoria: '3_X' },
    { Danie: 'B', Składnik: 'Mąka', Kategoria: '5_X' },
    { Danie: 'B', Składnik: 'Jajka', Kategoria: '3_X' },
    { Danie: 'B', Składnik: 'Cukier', Kategoria: '5_X' },
    { Danie: 'C', Składnik: 'Ryż', Kategoria: '5_X' },
  ]
  const mapa = budujMapeSkladnikow(wiersze)

  it('bonus propaguje na podobne danie', () => {
    const scores = { A: 5 }
    const wynik = propagujPrzezPodobienstwo(scores, mapa)
    expect(wynik['B']).toBeGreaterThan(0)
  })

  it('nie propaguje na zupełnie inne danie', () => {
    const scores = { A: 5 }
    const wynik = propagujPrzezPodobienstwo(scores, mapa)
    expect(wynik['C']).toBeUndefined()
  })
})
