import { describe, it, expect } from 'vitest'
import { formatDataLocal, isDzis } from '../dataHelpers'

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
