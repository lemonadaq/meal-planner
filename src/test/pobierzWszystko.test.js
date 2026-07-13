import { describe, it, expect } from 'vitest'
import { pobierzWszystkieWiersze } from '../pobierzWszystko'

// Regresja: Supabase ucina odpowiedź do 1000 wierszy — bez paginacji reroll
// widział tylko kawałek tabeli dania i losował w kółko z 2 obiadów.
function fakeSupabase(wiersze, { errorOd = null } = {}) {
  let wywolania = 0
  const buduj = () => ({
    range: async (od, doIdx) => {
      wywolania++
      if (errorOd !== null && od >= errorOd) return { data: null, error: { message: 'boom' } }
      return { data: wiersze.slice(od, doIdx + 1), error: null }
    },
  })
  return { buduj, ileWywolan: () => wywolania }
}

const WIERSZE_2500 = Array.from({ length: 2500 }, (_, i) => ({ id: i }))

describe('pobierzWszystkieWiersze', () => {
  it('składa wszystkie strony ponad limitem 1000 (2500 wierszy = 3 strony)', async () => {
    const { buduj, ileWywolan } = fakeSupabase(WIERSZE_2500)
    const { data, error } = await pobierzWszystkieWiersze(buduj)
    expect(error).toBe(null)
    expect(data).toHaveLength(2500)
    expect(data[0].id).toBe(0)
    expect(data[2499].id).toBe(2499)
    expect(ileWywolan()).toBe(3)
  })

  it('kończy po niepełnej stronie (nie strzela w pustkę)', async () => {
    const { buduj, ileWywolan } = fakeSupabase(WIERSZE_2500.slice(0, 700))
    const { data } = await pobierzWszystkieWiersze(buduj)
    expect(data).toHaveLength(700)
    expect(ileWywolan()).toBe(1)
  })

  it('pusta tabela → pusta tablica bez błędu', async () => {
    const { buduj } = fakeSupabase([])
    const { data, error } = await pobierzWszystkieWiersze(buduj)
    expect(data).toEqual([])
    expect(error).toBe(null)
  })

  it('błąd w trakcie → zwraca error + to co zdążył pobrać', async () => {
    const { buduj } = fakeSupabase(WIERSZE_2500, { errorOd: 1000 })
    const { data, error } = await pobierzWszystkieWiersze(buduj)
    expect(error).toBeTruthy()
    expect(data).toHaveLength(1000)
  })

  it('respektuje własny rozmiar strony', async () => {
    const { buduj, ileWywolan } = fakeSupabase(WIERSZE_2500.slice(0, 250))
    const { data } = await pobierzWszystkieWiersze(buduj, 100)
    expect(data).toHaveLength(250)
    expect(ileWywolan()).toBe(3)
  })
})
