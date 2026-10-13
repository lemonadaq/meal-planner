import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Atrapy wszystkich ekranów — sprawdzamy, KTÓRY adres prowadzi GDZIE,
// a nie co te ekrany rysują.
vi.mock('../App.jsx', () => ({ default: () => <div>PLANER</div> }))
vi.mock('../pages/PolitykaPrywatnosci.jsx', () => ({ default: () => <div>POLITYKA</div> }))
vi.mock('../pages/Regulamin.jsx', () => ({ default: () => <div>REGULAMIN</div> }))

const { default: Trasy } = await import('../Trasy.jsx')

function otworz(adres) {
  render(
    <MemoryRouter initialEntries={[adres]}>
      <Trasy />
    </MemoryRouter>,
  )
}

describe('Trasy — serwis to planer', () => {
  it('„/" to planer, bez rozgałęziania po sesji', () => {
    otworz('/')
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })

  // Adres sprzed odcięcia bloga. Filip ma go w zakładkach, a Capacitor
  // w konfiguracji — nie może umrzeć.
  it('„/planer" prowadzi do tego samego planera', () => {
    otworz('/planer')
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })

  it('głębszy adres w planerze też go montuje', () => {
    otworz('/planer/cokolwiek')
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })
})

// Blog odcięty 2026-10-06, pliki usunięte z repo 2026-10-13 (decyzja Filipa).
// Ten blok pilnuje, żeby stare linki — z zakładek, z Google — nie dawały
// białego ekranu, tylko wracały na planer.
describe('Trasy — bloga nie ma', () => {
  it.each([
    '/blog',
    '/blog/risotto-z-warzywami',
    '/blog/o-mnie',
    '/wpis/risotto-z-warzywami',
    '/o-mnie',
  ])('stary adres bloga %s ląduje na planerze, nie na białym ekranie', (adres) => {
    otworz(adres)
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })

  it('nieznany adres wraca na planer', () => {
    otworz('/cos-czego-nie-ma')
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })
})

// Google Play wymaga adresu polityki prywatności, który działa BEZ logowania.
// Te dwa dokumenty ZOSTAJĄ po usunięciu bloga — to wymóg sklepu, nigdy nie
// były częścią bloga.
describe('Trasy — dokumenty prawne pod publicznym adresem', () => {
  it('polityka prywatności ma własny adres', () => {
    otworz('/polityka-prywatnosci')
    expect(screen.getByText('POLITYKA')).toBeInTheDocument()
  })

  it('regulamin ma własny adres', () => {
    otworz('/regulamin')
    expect(screen.getByText('REGULAMIN')).toBeInTheDocument()
  })

  // Gość, nie tylko zalogowany — inaczej recenzent Google zobaczy logowanie.
  it('nie prowadzą przez planer, czyli nie wymagają sesji', () => {
    otworz('/polityka-prywatnosci')
    expect(screen.queryByText('PLANER')).not.toBeInTheDocument()
  })
})
