import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Kontrolowane zapytania do `plan_tygodnia` — każde wywołanie supabase.from()
// dostaje własny, ręcznie odpalany Promise, więc test decyduje, w JAKIEJ
// kolejności "wracają odpowiedzi z sieci", niezależnie od kolejności, w jakiej
// zapytania zostały wysłane. To odtwarza dokładnie to, co dzieje się przy
// szybkim przełączaniu tygodni na słabszej sieci: zapytanie o tydzień,
// z którego user już zdążył wyjść, potrafi wrócić PO odpowiedzi dla
// aktualnego tygodnia.
const zapytania = []

function zapytanie() {
  const wpis = {}
  wpis.promise = new Promise((resolve) => { wpis.resolve = resolve })
  const q = {}
  q.select = () => q
  q.eq = () => q
  q.order = () => q
  q.then = (resolve, reject) => wpis.promise.then(resolve, reject)
  zapytania.push(wpis)
  return q
}

vi.mock('../supabase', () => ({ supabase: { from: () => zapytanie() } }))

const { useTydzien } = await import('../useTydzien')

// Kilka mikrotasków, żeby przepuścić `Promise.resolve().then(() => refresh())`
// z efektu w useTydzien.js oraz kolejne `.then` w łańcuchu zapytania.
async function przepuscMikrotaski(ile = 4) {
  for (let i = 0; i < ile; i++) await Promise.resolve()
}

describe('useTydzien — wyścig przy szybkiej zmianie tygodnia', () => {
  it('nie pokazuje spóźnionej odpowiedzi dla tygodnia, z którego user już wyszedł', async () => {
    const { result, rerender } = renderHook(
      ({ offset }) => useTydzien('household-1', { id: 'user-1' }, offset),
      { initialProps: { offset: 0 } },
    )

    await act(przepuscMikrotaski)
    expect(zapytania).toHaveLength(1) // zapytanie o tydzień A, jeszcze "w locie"

    // User szybko przechodzi na kolejny tydzień, zanim odpowiedź na A wróciła.
    rerender({ offset: 1 })
    await act(przepuscMikrotaski)
    expect(zapytania).toHaveLength(2) // zapytanie o tydzień B, też "w locie"

    // Odpowiedź na AKTUALNY tydzień (B) wraca pierwsza.
    await act(async () => {
      zapytania[1].resolve({ data: [{ danie: 'Danie-B', porcje: 1 }], error: null })
      await przepuscMikrotaski()
    })
    expect(result.current.pula.map(r => r.danie)).toEqual(['Danie-B'])

    // Spóźniona odpowiedź na NIEAKTUALNY już tydzień (A) wraca po fakcie —
    // nie może nadpisać tego, co user aktualnie widzi.
    await act(async () => {
      zapytania[0].resolve({ data: [{ danie: 'Danie-A', porcje: 1 }], error: null })
      await przepuscMikrotaski()
    })
    expect(result.current.pula.map(r => r.danie)).toEqual(['Danie-B'])
  })
})
