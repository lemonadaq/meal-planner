import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// Wiersze `dania` dla podglądanego dania — jeden wiersz na składnik,
// metadane powtórzone w każdym (tak jak w prawdziwej tabeli).
const { stan } = vi.hoisted(() => ({ stan: { wiersze: [], error: null } }))

vi.mock('../supabase', () => {
  function zapytanie() {
    const q = {}
    for (const m of ['select', 'eq', 'order']) q[m] = () => q
    q.then = (resolve) => resolve({ data: stan.wiersze, error: stan.error })
    return q
  }
  return { supabase: { from: () => zapytanie() } }
})

const { default: PodgladPrzepisu } = await import('../components/PodgladPrzepisu')

const META = {
  Danie: 'Risotto z warzywami', rodzaj: 'obiad', kuchnia: 'wloska',
  poziom: 'latwe', czas_minuty: 35, kcal: 520, TYP: 'samodzielne',
  'Przepis': '1. Podsmaż cebulę\n2. Dodaj ryż\n3. Dolewaj bulion',
}

beforeEach(() => {
  stan.error = null
  stan.wiersze = [
    { ...META, 'Składnik': 'Ryż arborio', 'Ilość na 1 porcję': '80', 'Jednostka': 'g', 'Kategoria': '5_Produkty sypkie' },
    { ...META, 'Składnik': 'Cebula', 'Ilość na 1 porcję': '1', 'Jednostka': 'szt.', 'Kategoria': '1_Warzywa i owoce' },
    { ...META, 'Składnik': 'Sól', 'Ilość na 1 porcję': '', 'Jednostka': 'do smaku', 'Kategoria': '7_Przyprawy' },
  ]
})

describe('PodgladPrzepisu — popup z przepisem', () => {
  it('pokazuje nazwę, składniki i kroki', async () => {
    render(<PodgladPrzepisu nazwa="Risotto z warzywami" onZamknij={() => {}} />)

    await waitFor(() => expect(screen.getByText('Ryż arborio')).toBeInTheDocument())
    expect(screen.getByText('Risotto z warzywami')).toBeInTheDocument()
    expect(screen.getByText('80 g')).toBeInTheDocument()
    expect(screen.getByText('do smaku')).toBeInTheDocument()
    expect(screen.getByText('Podsmaż cebulę')).toBeInTheDocument()
    // numeracja rysowana osobno, więc w treści kroku jej nie ma
    expect(screen.queryByText('1. Podsmaż cebulę')).not.toBeInTheDocument()
  })

  it('pokazuje kraj pochodzenia — po to w ogóle uzupełniamy kuchnie', async () => {
    render(<PodgladPrzepisu nazwa="Risotto z warzywami" onZamknij={() => {}} />)
    await waitFor(() => expect(screen.getByText('🇮🇹 Włoska')).toBeInTheDocument())
    expect(screen.getByText('🟢 Łatwe')).toBeInTheDocument()
    expect(screen.queryByText(/samodzieln/i)).not.toBeInTheDocument()
  })

  it('danie bez przepisu mówi to wprost, zamiast pokazywać pustkę', async () => {
    stan.wiersze = []
    render(<PodgladPrzepisu nazwa="Własne danie" onZamknij={() => {}} />)
    await waitFor(() => expect(screen.getByText(/nie ma jeszcze przepisu/i)).toBeInTheDocument())
  })

  it('błąd bazy nie zostawia pustego okna', async () => {
    stan.wiersze = []
    stan.error = { message: 'padło' }
    render(<PodgladPrzepisu nazwa="Risotto z warzywami" onZamknij={() => {}} />)
    await waitFor(() => expect(screen.getByText(/Nie udało się wczytać/i)).toBeInTheDocument())
  })

  it('przycisk dodaje do tygodnia i zamyka okno', async () => {
    const przelacz = vi.fn()
    const zamknij = vi.fn()
    render(
      <PodgladPrzepisu nazwa="Risotto z warzywami" wPuli={false}
        onPrzelacz={przelacz} onZamknij={zamknij} />,
    )
    await waitFor(() => expect(screen.getByText('Ryż arborio')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do tygodnia' }))
    expect(przelacz).toHaveBeenCalledWith('Risotto z warzywami')
    expect(zamknij).toHaveBeenCalled()
  })

  it('danie już w puli dostaje przycisk usuwania, nie dodawania', async () => {
    render(
      <PodgladPrzepisu nazwa="Risotto z warzywami" wPuli
        onPrzelacz={() => {}} onZamknij={() => {}} />,
    )
    await waitFor(() => expect(screen.getByText('Ryż arborio')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'Usuń z tygodnia' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dodaj do tygodnia' })).not.toBeInTheDocument()
  })

  it('kliknięcie w tło zamyka, kliknięcie w samo okno nie', async () => {
    const zamknij = vi.fn()
    render(<PodgladPrzepisu nazwa="Risotto z warzywami" onZamknij={zamknij} />)
    await waitFor(() => expect(screen.getByText('Ryż arborio')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('dialog'))
    expect(zamknij).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('presentation'))
    expect(zamknij).toHaveBeenCalled()
  })
})
