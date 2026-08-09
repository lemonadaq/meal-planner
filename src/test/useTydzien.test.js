import { describe, it, expect, vi } from 'vitest'

// useTydzien importuje supabase (createClient) — mockujemy, żeby import modułu
// nie wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { poniedzialekTygodnia, zakresTygodniaLabel } from '../useTydzien'

// Fakty kalendarzowe 2026: 3 sierpnia = poniedziałek, 9 sierpnia = niedziela,
// 27 lipca = poniedziałek, 1 stycznia = czwartek.

describe('poniedzialekTygodnia', () => {
  it('poniedziałek rano → ten sam dzień', () => {
    const pon = new Date(2026, 7, 3, 0, 5)
    expect(poniedzialekTygodnia(0, pon)).toBe('2026-08-03')
  })

  it('środek tygodnia → poniedziałek tego tygodnia', () => {
    const sroda = new Date(2026, 7, 5, 14, 0)
    expect(poniedzialekTygodnia(0, sroda)).toBe('2026-08-03')
  })

  // Regresja timezone/granica tygodnia: niedziela WIECZOREM należy do tygodnia
  // rozpoczętego poprzedni poniedziałek, nie do następnego.
  it('niedziela wieczorem → poniedziałek sprzed 6 dni', () => {
    const niedzielaWieczor = new Date(2026, 7, 9, 23, 45)
    expect(poniedzialekTygodnia(0, niedzielaWieczor)).toBe('2026-08-03')
  })

  it('offset +1 → poniedziałek następnego tygodnia (też z niedzieli)', () => {
    const niedziela = new Date(2026, 7, 9, 20, 0)
    expect(poniedzialekTygodnia(1, niedziela)).toBe('2026-08-10')
  })

  it('offset -1 → poniedziałek poprzedniego tygodnia', () => {
    const pon = new Date(2026, 7, 3)
    expect(poniedzialekTygodnia(-1, pon)).toBe('2026-07-27')
  })

  it('offset przeskakuje granicę miesiąca', () => {
    const sroda = new Date(2026, 7, 5)
    expect(poniedzialekTygodnia(-2, sroda)).toBe('2026-07-20')
    expect(poniedzialekTygodnia(4, sroda)).toBe('2026-08-31')
  })

  it('tydzień z przełomem roku → poniedziałek w starym roku', () => {
    const piatek = new Date(2026, 0, 2) // 2.01.2026 = piątek
    expect(poniedzialekTygodnia(0, piatek)).toBe('2025-12-29')
  })
})

describe('zakresTygodniaLabel', () => {
  it('tydzień w jednym miesiącu → "3–9 sierpnia"', () => {
    const sroda = new Date(2026, 7, 5)
    expect(zakresTygodniaLabel(0, sroda)).toBe('3–9 sierpnia')
  })

  it('tydzień na przełomie miesięcy → "27 lipca – 2 sierpnia"', () => {
    const czwartek = new Date(2026, 6, 30)
    expect(zakresTygodniaLabel(0, czwartek)).toBe('27 lipca – 2 sierpnia')
  })

  it('tydzień na przełomie roku → "29 grudnia – 4 stycznia"', () => {
    const piatek = new Date(2026, 0, 2)
    expect(zakresTygodniaLabel(0, piatek)).toBe('29 grudnia – 4 stycznia')
  })

  it('offset przesuwa etykietę o tydzień', () => {
    const sroda = new Date(2026, 7, 5)
    expect(zakresTygodniaLabel(1, sroda)).toBe('10–16 sierpnia')
    expect(zakresTygodniaLabel(-1, sroda)).toBe('27 lipca – 2 sierpnia')
  })
})
