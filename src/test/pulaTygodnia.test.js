import { describe, it, expect, vi } from 'vitest'

// ListaZakupow importuje supabase (createClient) — mockujemy, żeby import modułu nie
// wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { dosypPuleTygodnia } from '../pages/ListaZakupow'

// Tryb „Tydzień": lista zakupów sumuje porcje z kalendarza (dni/sloty)
// ORAZ z tygodniowej puli dań (plan_tygodnia). To samo danie w obu
// źródłach ma się zsumować do jednej pozycji.
describe('dosypPuleTygodnia — scalanie puli tygodnia z porcjami z kalendarza', () => {
  it('dodaje dania z puli do pustej mapy', () => {
    const mapa = dosypPuleTygodnia({}, [
      { danie: 'Pizza', porcje: 2 },
      { danie: 'Pomidorowa', porcje: 1.5 },
    ])
    expect(mapa).toEqual({ Pizza: 2, Pomidorowa: 1.5 })
  })

  it('sumuje porcje gdy danie jest i w kalendarzu, i w puli', () => {
    const mapa = { 'Spaghetti bolognese': 2 }
    dosypPuleTygodnia(mapa, [{ danie: 'Spaghetti bolognese', porcje: 3 }])
    expect(mapa['Spaghetti bolognese']).toBe(5)
  })

  it('nie rusza dań z kalendarza nieobecnych w puli', () => {
    const mapa = { Stek: 4 }
    dosypPuleTygodnia(mapa, [{ danie: 'Kanapki', porcje: 1 }])
    expect(mapa).toEqual({ Stek: 4, Kanapki: 1 })
  })

  it('ignoruje wiersze bez dania i porcje niedodatnie/nienumeryczne', () => {
    const mapa = dosypPuleTygodnia({}, [
      { danie: null, porcje: 2 },
      { danie: 'Pizza', porcje: 0 },
      { danie: 'Stek', porcje: 'abc' },
      { danie: 'Pomidorowa', porcje: -1 },
      { danie: 'Kanapki', porcje: '2' }, // numeric z bazy może przyjść jako string
    ])
    expect(mapa).toEqual({ Kanapki: 2 })
  })

  it('null/undefined zamiast tablicy nie wybucha', () => {
    expect(dosypPuleTygodnia({ Pizza: 1 }, null)).toEqual({ Pizza: 1 })
    expect(dosypPuleTygodnia({ Pizza: 1 }, undefined)).toEqual({ Pizza: 1 })
  })
})
