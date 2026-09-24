import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Atrapy wszystkich ekranów — sprawdzamy, KTÓRY adres prowadzi GDZIE,
// a nie co te ekrany rysują.
vi.mock('../App.jsx', () => ({ default: () => <div>PLANER</div> }))
vi.mock('../StronaGlowna.jsx', () => ({ default: () => <div>STRONA GŁÓWNA</div> }))
vi.mock('../pages/Blog.jsx', () => ({ default: () => <div>BLOG</div> }))
vi.mock('../pages/OMnie.jsx', () => ({ default: () => <div>O MNIE</div> }))
// Atrapa wpisu wypisuje slug, żeby dało się sprawdzić, że przekierowanie
// starego adresu go nie gubi. Nazwa z wielkiej litery, bo to komponent.
vi.mock('../pages/Wpis.jsx', async () => {
  const { useParams } = await vi.importActual('react-router-dom')
  function AtrapaWpisu() {
    return <div>WPIS: {useParams().slug}</div>
  }
  return { default: AtrapaWpisu }
})

const { default: Trasy } = await import('../Trasy.jsx')

function otworz(adres, { jestNatywna = false } = {}) {
  render(
    <MemoryRouter initialEntries={[adres]}>
      <Trasy jestNatywna={jestNatywna} />
    </MemoryRouter>,
  )
}

describe('Trasy — rozdzielenie bloga i aplikacji', () => {
  it('„/" rozstrzyga StronaGlowna (planer albo blog, zależnie od sesji)', () => {
    otworz('/')
    expect(screen.getByText('STRONA GŁÓWNA')).toBeInTheDocument()
  })

  it('w apce natywnej „/" idzie prosto do planera, bez bloga', () => {
    otworz('/', { jestNatywna: true })
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })

  it('planer ma własny, stały adres', () => {
    otworz('/planer')
    expect(screen.getByText('PLANER')).toBeInTheDocument()
  })

  it('blog ma własny, stały adres — niezależny od tego, co jest pod „/"', () => {
    otworz('/blog')
    expect(screen.getByText('BLOG')).toBeInTheDocument()
  })

  it('wpis leży pod /blog/<slug>', () => {
    otworz('/blog/risotto-z-warzywami')
    expect(screen.getByText('WPIS: risotto-z-warzywami')).toBeInTheDocument()
  })

  // „o-mnie" wygląda jak slug wpisu — gdyby kolejność tras się zmieniła,
  // strona „O mnie" zaczęłaby szukać nieistniejącego wpisu o tej nazwie.
  it('„/blog/o-mnie" to strona O mnie, a nie wpis o slugu „o-mnie"', () => {
    otworz('/blog/o-mnie')
    expect(screen.getByText('O MNIE')).toBeInTheDocument()
    expect(screen.queryByText(/WPIS/)).not.toBeInTheDocument()
  })
})

// Linki do wpisów Filip mógł już komuś wysłać — te adresy nie mogą umrzeć.
describe('Trasy — stare adresy sprzed rozdzielenia', () => {
  it('/wpis/<slug> przekierowuje na /blog/<slug>, z zachowaniem sluga', () => {
    otworz('/wpis/risotto-z-warzywami')
    expect(screen.getByText('WPIS: risotto-z-warzywami')).toBeInTheDocument()
  })

  it('/o-mnie przekierowuje na /blog/o-mnie', () => {
    otworz('/o-mnie')
    expect(screen.getByText('O MNIE')).toBeInTheDocument()
  })

  it('nieznany adres wraca na stronę główną, nie na biały ekran', () => {
    otworz('/cos-czego-nie-ma')
    expect(screen.getByText('STRONA GŁÓWNA')).toBeInTheDocument()
  })
})
