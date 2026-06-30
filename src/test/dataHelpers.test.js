import { describe, it, expect } from 'vitest'
import { formatDataLocal, isDzis, domyslnyDzienTygodnia, decyzjaAktywnyDzien } from '../dataHelpers'

describe('formatDataLocal', () => {
  it('formatuje datę jako YYYY-MM-DD', () => {
    const d = new Date(2026, 0, 5) // 5 stycznia 2026
    expect(formatDataLocal(d)).toBe('2026-01-05')
  })

  it('paduje miesiąc i dzień zerami', () => {
    const d = new Date(2026, 2, 3) // 3 marca
    expect(formatDataLocal(d)).toBe('2026-03-03')
  })

  it('obsługuje koniec roku', () => {
    const d = new Date(2025, 11, 31)
    expect(formatDataLocal(d)).toBe('2025-12-31')
  })
})

describe('isDzis', () => {
  it('zwraca true dla dzisiejszej daty', () => {
    expect(isDzis(new Date())).toBe(true)
  })

  it('zwraca false dla wczoraj', () => {
    const wczoraj = new Date()
    wczoraj.setDate(wczoraj.getDate() - 1)
    expect(isDzis(wczoraj)).toBe(false)
  })
})

describe('domyslnyDzienTygodnia', () => {
  it('bieżący tydzień (0) → dzisiejszy dzień', () => {
    const wtorek = new Date(2026, 5, 30) // 30.06.2026 = wtorek
    expect(domyslnyDzienTygodnia(0, wtorek)).toBe(1) // 0=Pon, 1=Wt
  })

  it('bieżący tydzień (0) → niedziela mapuje na index 6', () => {
    const niedziela = new Date(2026, 6, 5) // 5.07.2026 = niedziela
    expect(domyslnyDzienTygodnia(0, niedziela)).toBe(6)
  })

  it('inny tydzień → poniedziałek (0)', () => {
    expect(domyslnyDzienTygodnia(1)).toBe(0)
    expect(domyslnyDzienTygodnia(-2)).toBe(0)
  })
})

describe('decyzjaAktywnyDzien', () => {
  const wtorek = new Date(2026, 5, 30) // wtorek

  // To jest regresja: powrót z widoku dania = pierwszy mount → dzień NIE może się resetować
  it('pierwszy mount (powrót z dania) → zachowuje zapamiętany dzień', () => {
    const d = decyzjaAktywnyDzien({ pierwszyMount: true, recznyWybor: false, tydzien: 0, dzis: wtorek })
    expect(d.zachowaj).toBe(true)
    expect(d.powod).toBe('mount')
    expect(d.dzien).toBeUndefined()
  })

  it('pierwszy mount ma priorytet nawet przy innym tygodniu (piątek/środa zostają)', () => {
    const d = decyzjaAktywnyDzien({ pierwszyMount: true, recznyWybor: false, tydzien: 2, dzis: wtorek })
    expect(d).toEqual({ zachowaj: true, powod: 'mount' })
  })

  it('ręczny wybór daty → zachowuje dzień (już ustawiony przez przejdzDoDaty)', () => {
    const d = decyzjaAktywnyDzien({ pierwszyMount: false, recznyWybor: true, tydzien: 0, dzis: wtorek })
    expect(d).toEqual({ zachowaj: true, powod: 'reczny' })
  })

  it('realna zmiana tygodnia (bieżący) → dzisiejszy dzień', () => {
    const d = decyzjaAktywnyDzien({ pierwszyMount: false, recznyWybor: false, tydzien: 0, dzis: wtorek })
    expect(d).toEqual({ dzien: 1 })
  })

  it('realna zmiana tygodnia (inny) → poniedziałek', () => {
    const d = decyzjaAktywnyDzien({ pierwszyMount: false, recznyWybor: false, tydzien: 3, dzis: wtorek })
    expect(d).toEqual({ dzien: 0 })
  })
})
