import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DanieDetail, { metaChipyDania } from '../pages/DanieDetail'

// ── Mock supabase ──────────────────────────────────────────────
// Chainable mock: każda metoda zwraca ten sam obiekt, a obiekt jest "awaitowalny".
// ZAPISY notują insert-y razem z tabelą — po tym poznajemy, czy planowanie
// poszło do puli tygodnia, czy (błędnie) z powrotem do kalendarza.
const { ZAPISY } = vi.hoisted(() => ({ ZAPISY: [] }))

vi.mock('../supabase', () => {
  const ROW = {
    id: 1, Danie: 'Test Danie', 'Składnik': 'Mleko', 'Kategoria': '3_Nabiał',
    rodzaj: 'obiad', czas_minuty: 30, kcal: 450, TYP: 'z dodatkiem', 'Przepis': '1. Wymieszaj',
  }
  function makeQuery(tabela) {
    const q = {}
    for (const m of ['select', 'eq', 'order', 'gte', 'lte', 'range', 'update', 'delete', 'single']) {
      q[m] = () => q
    }
    q.insert = (wiersz) => { ZAPISY.push({ tabela, wiersz }); return q }
    q.then = (resolve) => resolve({ data: [ROW], error: null })
    return q
  }
  return {
    supabase: {
      from: (tabela) => makeQuery(tabela),
      storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    },
  }
})

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
    ZAPISY.length = 0
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

// Filip: „w widoku przepisu zostało stare »zaplanuj« — trzeba zmienić, żeby
// dawało wybór tygodnia a nie dnia". Apka planuje pulą tygodnia, dni i sloty
// zostały tylko w schowanym kalendarzu.
describe('DanieDetail — „Zaplanuj" celuje w tydzień', () => {
  beforeEach(() => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    ZAPISY.length = 0
  })

  async function otworz() {
    render(<DanieDetail nazwa="Test Danie" onBack={() => {}} user={{ id: 'u1' }} householdId="h1" sledz={() => {}} />)
    await waitFor(() => expect(screen.getByText('Obiad')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Zaplanuj/ }))
    await waitFor(() => expect(screen.getByText('Ten tydzień')).toBeInTheDocument())
  }

  it('proponuje tygodnie zamiast dni i slotów', async () => {
    await otworz()
    expect(screen.getByText('DO PLANU TYGODNIA')).toBeInTheDocument()
    expect(screen.getByText('Przyszły tydzień')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dodaj do planu/ })).toBeInTheDocument()

    // stary wybór dnia tygodnia i przycisk kalendarza nie mają wracać
    expect(screen.queryByText('Pon')).not.toBeInTheDocument()
    expect(screen.queryByText(/Dodaj do kalendarza/)).not.toBeInTheDocument()
  })

  it('zapisuje do plan_tygodnia, nie do kalendarza', async () => {
    await otworz()
    fireEvent.click(screen.getByRole('button', { name: /Dodaj do planu/ }))
    await waitFor(() => expect(ZAPISY.length).toBeGreaterThan(0))

    const ostatni = ZAPISY[ZAPISY.length - 1]
    expect(ostatni.tabela).toBe('plan_tygodnia')
    expect(ostatni.wiersz).toMatchObject({ danie: 'Test Danie', household_id: 'h1', porcje: 1 })
    expect(ostatni.wiersz.tydzien).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(ZAPISY.some(z => z.tabela === 'kalendarz')).toBe(false)
  })
})
