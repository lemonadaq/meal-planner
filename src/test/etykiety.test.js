import { describe, it, expect, vi } from 'vitest'

// DanieDetail importuje klienta Supabase — w teście wystarczy pusta atrapa.
vi.mock('../supabase', () => ({ supabase: {} }))
import { KUCHNIE, KUCHNIA_LABEL, kcalWPrzedziale } from '../etykiety'
import { metaChipyDania } from '../pages/DanieDetail'

describe('kuchnie po czyszczeniu bazy 2026-11', () => {
  it('23 kuchnie, każda z etykietą (inaczej danie znika z filtra)', () => {
    expect(KUCHNIE).toHaveLength(23)
    expect(KUCHNIE.filter(k => !KUCHNIA_LABEL[k])).toEqual([])
  })
})

describe('kcalWPrzedziale', () => {
  it('granice: 400 to już „400–700", 700 to już „700+"', () => {
    expect(kcalWPrzedziale(399, 'do400')).toBe(true)
    expect(kcalWPrzedziale(400, 'do400')).toBe(false)
    expect(kcalWPrzedziale(400, '400-700')).toBe(true)
    expect(kcalWPrzedziale(700, '400-700')).toBe(false)
    expect(kcalWPrzedziale(700, '700+')).toBe(true)
  })

  it('danie bez kcal nie łapie się na żaden przedział', () => {
    expect(kcalWPrzedziale(null, 'do400')).toBe(false)
    expect(kcalWPrzedziale(0, 'do400')).toBe(false)
  })

  it('brak wybranego przedziału przepuszcza wszystko', () => {
    expect(kcalWPrzedziale(null, '')).toBe(true)
  })
})

describe('metaChipyDania — poziom i kuchnia', () => {
  it('dokłada poziom i kuchnię z flagą po kcal', () => {
    expect(metaChipyDania({ rodzaj: 'obiad', kcal: 450, poziom: 'srednie', kuchnia: 'wloska' }))
      .toEqual(['Obiad', '450 kcal', '🟡 Średnie', '🇮🇹 Włoska'])
  })
})
