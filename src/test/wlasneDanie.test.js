import { describe, it, expect, vi } from 'vitest'

// useTydzien importuje supabase (createClient) — mock, żeby import modułu nie
// wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { wlasneDanieZSzukajki } from '../useTydzien'

const DANIA = [
  { Danie: 'Kanapki z serem', rodzaj: 'sniadanie' },
  { Danie: 'Pomidorowa', rodzaj: 'zupa' },
]

describe('wlasneDanieZSzukajki — własne danie z szukajki (ekran Tydzień)', () => {
  it('pusta / biała fraza nie proponuje niczego', () => {
    expect(wlasneDanieZSzukajki(DANIA, '')).toBeNull()
    expect(wlasneDanieZSzukajki(DANIA, '   ')).toBeNull()
    expect(wlasneDanieZSzukajki(DANIA, undefined)).toBeNull()
  })

  it('nowa nazwa wraca przycięta', () => {
    expect(wlasneDanieZSzukajki(DANIA, '  ziemniaki z kefirem ')).toBe('ziemniaki z kefirem')
  })

  it('dokładna nazwa istniejącego dania nie proponuje duplikatu (bez wielkości liter)', () => {
    expect(wlasneDanieZSzukajki(DANIA, 'Pomidorowa')).toBeNull()
    expect(wlasneDanieZSzukajki(DANIA, 'pomidorowa')).toBeNull()
    expect(wlasneDanieZSzukajki(DANIA, ' POMIDOROWA ')).toBeNull()
  })

  it('częściowe dopasowanie to wciąż nowe danie', () => {
    expect(wlasneDanieZSzukajki(DANIA, 'Pomidorowa z ryżem')).toBe('Pomidorowa z ryżem')
  })

  it('brak listy dań nie wywala', () => {
    expect(wlasneDanieZSzukajki(null, 'kanapki')).toBe('kanapki')
    expect(wlasneDanieZSzukajki([{ }], 'kanapki')).toBe('kanapki')
  })
})
