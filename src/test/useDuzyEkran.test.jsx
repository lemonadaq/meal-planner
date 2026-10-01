import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useDuzyEkran, czyDuzyEkran, zapytanieODuzyEkran, PROG_DUZY_EKRAN } from '../useDuzyEkran'

// Podstawiamy matchMedia, bo jsdom nie zmienia go przy zmianie rozmiaru okna.
// `sluchacze` trzyma podpięte callbacki, żeby dało się udać zmianę szerokości.
function podstawMatchMedia({ pasuje = false, staryApi = false } = {}) {
  const stan = { pasuje, sluchacze: new Set(), odpiete: 0 }

  window.matchMedia = vi.fn((zapytanie) => {
    const mq = {
      media: zapytanie,
      get matches() { return stan.pasuje },
    }
    if (staryApi) {
      // Safari < 14: tylko addListener/removeListener
      mq.addListener = (fn) => stan.sluchacze.add(fn)
      mq.removeListener = (fn) => { stan.sluchacze.delete(fn); stan.odpiete++ }
    } else {
      mq.addEventListener = (_zdarzenie, fn) => stan.sluchacze.add(fn)
      mq.removeEventListener = (_zdarzenie, fn) => { stan.sluchacze.delete(fn); stan.odpiete++ }
    }
    return mq
  })

  stan.zmienSzerokosc = (nowe) => {
    stan.pasuje = nowe
    act(() => { stan.sluchacze.forEach(fn => fn({ matches: nowe })) })
  }
  return stan
}

function Probka({ prog }) {
  const duzy = useDuzyEkran(prog)
  return <div>{duzy ? 'SZEROKI' : 'WASKI'}</div>
}

let oryginalneMatchMedia
beforeEach(() => { oryginalneMatchMedia = window.matchMedia })
afterEach(() => { window.matchMedia = oryginalneMatchMedia })

describe('zapytanieODuzyEkran', () => {
  it('buduje zapytanie o minimalną szerokość', () => {
    expect(zapytanieODuzyEkran(900)).toBe('(min-width: 900px)')
    expect(zapytanieODuzyEkran()).toBe(`(min-width: ${PROG_DUZY_EKRAN}px)`)
  })
})

describe('czyDuzyEkran', () => {
  it('oddaje to, co mówi matchMedia', () => {
    podstawMatchMedia({ pasuje: true })
    expect(czyDuzyEkran()).toBe(true)
  })

  // Bezpieczniejsza strona pomyłki: wąski układ na szerokim ekranie jest
  // tylko pusty, a szeroki na wąskim się rozjeżdża.
  it('bez matchMedia zakłada układ telefonowy, zamiast rzucać', () => {
    window.matchMedia = undefined
    expect(czyDuzyEkran()).toBe(false)
  })
})

describe('useDuzyEkran', () => {
  it('na wąskim oknie daje układ telefonowy', () => {
    podstawMatchMedia({ pasuje: false })
    render(<Probka />)
    expect(screen.getByText('WASKI')).toBeInTheDocument()
  })

  it('na szerokim oknie daje układ szeroki już w pierwszym renderze', () => {
    podstawMatchMedia({ pasuje: true })
    render(<Probka />)
    // Bez mignięcia wąskim układem — stąd odczyt synchroniczny, nie useEffect.
    expect(screen.getByText('SZEROKI')).toBeInTheDocument()
  })

  // Sedno: ktoś przeciąga okno na pół monitora i układ ma nadążyć,
  // bez przeładowania strony.
  it('reaguje na zmianę szerokości okna na żywo', () => {
    const stan = podstawMatchMedia({ pasuje: false })
    render(<Probka />)
    expect(screen.getByText('WASKI')).toBeInTheDocument()

    stan.zmienSzerokosc(true)
    expect(screen.getByText('SZEROKI')).toBeInTheDocument()

    stan.zmienSzerokosc(false)
    expect(screen.getByText('WASKI')).toBeInTheDocument()
  })

  it('odpina nasłuch przy odmontowaniu', () => {
    const stan = podstawMatchMedia({ pasuje: false })
    const { unmount } = render(<Probka />)
    expect(stan.sluchacze.size).toBeGreaterThan(0)

    unmount()
    expect(stan.sluchacze.size).toBe(0)
    expect(stan.odpiete).toBeGreaterThan(0)
  })

  // Stare WebView w Capacitorze potrafi nie mieć addEventListener na MediaQueryList.
  it('działa na starym API (addListener/removeListener)', () => {
    const stan = podstawMatchMedia({ pasuje: false, staryApi: true })
    const { unmount } = render(<Probka />)

    stan.zmienSzerokosc(true)
    expect(screen.getByText('SZEROKI')).toBeInTheDocument()

    unmount()
    expect(stan.sluchacze.size).toBe(0)
  })

  it('przyjmuje własny próg', () => {
    podstawMatchMedia({ pasuje: true })
    render(<Probka prog={1200} />)
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1200px)')
  })
})
