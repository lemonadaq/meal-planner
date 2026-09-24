import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Rozdzielenie bloga i aplikacji: „/" ma pokazać planer domownikowi,
// a bloga gościowi. Podmieniamy oba ekrany na atrapy — sprawdzamy WYBÓR,
// nie zawartość planera ani bloga.
const { stan } = vi.hoisted(() => ({
  stan: { sesja: null, sluchacz: null },
}))

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: stan.sesja } }),
      onAuthStateChange: (fn) => {
        stan.sluchacz = fn
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
  },
}))

vi.mock('../App.jsx', () => ({ default: () => <div>PLANER</div> }))
vi.mock('../pages/Blog.jsx', () => ({ default: () => <div>BLOG</div> }))

const { default: StronaGlowna } = await import('../StronaGlowna.jsx')

beforeEach(() => {
  stan.sesja = null
  stan.sluchacz = null
})

describe('StronaGlowna — co widać pod „/"', () => {
  it('gość dostaje bloga', async () => {
    render(<StronaGlowna />)
    await waitFor(() => expect(screen.getByText('BLOG')).toBeInTheDocument())
    expect(screen.queryByText('PLANER')).not.toBeInTheDocument()
  })

  it('zalogowany dostaje planer', async () => {
    stan.sesja = { user: { id: 'u1' } }
    render(<StronaGlowna />)
    await waitFor(() => expect(screen.getByText('PLANER')).toBeInTheDocument())
    expect(screen.queryByText('BLOG')).not.toBeInTheDocument()
  })

  // Sedno tego, po co w ogóle sprawdzamy sesję PRZED renderem: zalogowanemu
  // nie ma mignąć blog, zanim Supabase odda sesję z localStorage.
  it('zanim sesja jest znana, nie pokazuje ani bloga, ani planera', () => {
    stan.sesja = { user: { id: 'u1' } }
    render(<StronaGlowna />)
    expect(screen.queryByText('BLOG')).not.toBeInTheDocument()
    expect(screen.queryByText('PLANER')).not.toBeInTheDocument()
    expect(screen.getByText(/Ładowanie/)).toBeInTheDocument()
  })

  it('wylogowanie oddaje bloga bez przeładowania strony', async () => {
    stan.sesja = { user: { id: 'u1' } }
    render(<StronaGlowna />)
    await waitFor(() => expect(screen.getByText('PLANER')).toBeInTheDocument())

    stan.sluchacz('SIGNED_OUT', null)
    await waitFor(() => expect(screen.getByText('BLOG')).toBeInTheDocument())
  })

  it('zalogowanie oddaje planer bez przeładowania strony', async () => {
    render(<StronaGlowna />)
    await waitFor(() => expect(screen.getByText('BLOG')).toBeInTheDocument())

    stan.sluchacz('SIGNED_IN', { user: { id: 'u1' } })
    await waitFor(() => expect(screen.getByText('PLANER')).toBeInTheDocument())
  })
})
