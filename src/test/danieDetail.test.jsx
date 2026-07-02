import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DanieDetail, { metaChipyDania } from '../pages/DanieDetail'

// ── Mocki zależności (supabase + hook slotów) ───────────────────
// Chainable mock: każda metoda zwraca ten sam obiekt, a obiekt jest "awaitowalny".
vi.mock('../supabase', () => {
  const ROW = {
    id: 1, Danie: 'Test Danie', 'Składnik': 'Mleko', 'Kategoria': '3_Nabiał',
    rodzaj: 'obiad', czas_minuty: 30, kcal: 450, TYP: 'z dodatkiem', 'Przepis': '1. Wymieszaj',
  }
  function makeQuery() {
    const q = {}
    for (const m of ['select', 'eq', 'order', 'gte', 'lte', 'range', 'update', 'insert', 'delete', 'single']) {
      q[m] = () => q
    }
    q.then = (resolve) => resolve({ data: [ROW], error: null })
    return q
  }
  return {
    supabase: {
      from: () => makeQuery(),
      storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    },
  }
})

vi.mock('../useSloty', () => ({
  useSloty: () => ({ config: { sloty: [], dni: {} } }),
  slotyWDniu: () => [],
  kluczDnia: () => 'pon',
}))

// ── Pura logika chipów meta ─────────────────────────────────────
describe('metaChipyDania', () => {
  it('pokazuje rodzaj i czas, ale NIGDY pola TYP (z dodatkiem / samodzielne)', () => {
    const chipy = metaChipyDania({ rodzaj: 'obiad', czas_minuty: 30, TYP: 'z dodatkiem' })
    expect(chipy).toContain('Obiad')
    expect(chipy).toContain('30 min')
    expect(chipy).not.toContain('z dodatkiem')
    expect(chipy.join(' ')).not.toMatch(/dodatk/i)
  })

  it('pomija czas gdy brak', () => {
    expect(metaChipyDania({ rodzaj: 'zupa' })).toEqual(['Zupa'])
  })

  it('pokazuje kalorie na porcję gdy są', () => {
    expect(metaChipyDania({ rodzaj: 'obiad', kcal: 450 })).toEqual(['Obiad', '450 kcal'])
  })

  it('pomija kcal gdy null/0', () => {
    expect(metaChipyDania({ rodzaj: 'obiad', kcal: null })).toEqual(['Obiad'])
    expect(metaChipyDania({ rodzaj: 'obiad', kcal: 0 })).toEqual(['Obiad'])
  })

  it('zwraca pustą tablicę dla braku danych', () => {
    expect(metaChipyDania(null)).toEqual([])
    expect(metaChipyDania({})).toEqual([])
  })
})

// ── Render widoku przepisu ──────────────────────────────────────
describe('DanieDetail (widok przepisu)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('przewija na górę przy wejściu w danie (nie dziedziczy scrolla z planera)', () => {
    render(<DanieDetail nazwa="Test Danie" onBack={() => {}} user={{ id: 'u1' }} householdId="h1" sledz={() => {}} />)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('NIE pokazuje kafelka TYP "z dodatkiem", ale pokazuje rodzaj, czas i kcal', async () => {
    render(<DanieDetail nazwa="Test Danie" onBack={() => {}} user={{ id: 'u1' }} householdId="h1" sledz={() => {}} />)
    // czekamy aż dane się załadują (pojawi się chip rodzaju)
    await waitFor(() => expect(screen.getByText('Obiad')).toBeInTheDocument())
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByText('450 kcal')).toBeInTheDocument()
    expect(screen.queryByText('z dodatkiem')).not.toBeInTheDocument()
  })
})
