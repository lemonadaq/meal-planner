import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

const {
  ustalPseudonim, sprawdzKomentarz, formatujCzas,
  DOMYSLNY_PSEUDONIM, MAKS_TRESC, MAKS_PSEUDONIM,
} = await import('../komentarze')

describe('ustalPseudonim', () => {
  it('brak pseudonimu daje Anonim', () => {
    expect(ustalPseudonim('')).toBe(DOMYSLNY_PSEUDONIM)
    expect(ustalPseudonim('   ')).toBe(DOMYSLNY_PSEUDONIM)
    expect(ustalPseudonim(null)).toBe(DOMYSLNY_PSEUDONIM)
    expect(ustalPseudonim(undefined)).toBe(DOMYSLNY_PSEUDONIM)
  })

  it('zostawia podany pseudonim', () => {
    expect(ustalPseudonim('Kasia')).toBe('Kasia')
  })

  it('zwija białe znaki', () => {
    expect(ustalPseudonim('  Jan   Kowalski  ')).toBe('Jan Kowalski')
  })

  // Ten sam limit stoi w polityce RLS — front ma go dotrzymać, żeby baza
  // nie odrzuciła zapisu bez wyjaśnienia.
  it('przycina do limitu z bazy', () => {
    expect(ustalPseudonim('x'.repeat(100))).toHaveLength(MAKS_PSEUDONIM)
  })
})

describe('sprawdzKomentarz', () => {
  it('pusty komentarz nie przechodzi', () => {
    expect(sprawdzKomentarz('')).toBeTruthy()
    expect(sprawdzKomentarz('    ')).toBeTruthy()
    expect(sprawdzKomentarz(null)).toBeTruthy()
  })

  it('normalny komentarz przechodzi', () => {
    expect(sprawdzKomentarz('Super przepis, robiłem wczoraj')).toBeNull()
  })

  it('za długi komentarz nie przechodzi', () => {
    const blad = sprawdzKomentarz('a'.repeat(MAKS_TRESC + 1))
    expect(blad).toBeTruthy()
    expect(blad).toContain(String(MAKS_TRESC))
  })

  it('dokładnie na limicie przechodzi', () => {
    expect(sprawdzKomentarz('a'.repeat(MAKS_TRESC))).toBeNull()
  })
})

describe('formatujCzas', () => {
  it('świeży komentarz', () => {
    expect(formatujCzas(new Date().toISOString())).toBe('przed chwilą')
  })

  it('minuty i godziny', () => {
    const temu = ms => new Date(Date.now() - ms).toISOString()
    expect(formatujCzas(temu(10 * 60000))).toBe('10 min temu')
    expect(formatujCzas(temu(3 * 3600000))).toBe('3 godz. temu')
  })

  it('starsze niż doba dostaje datę', () => {
    const dawno = new Date(Date.now() - 5 * 24 * 3600000).toISOString()
    expect(formatujCzas(dawno)).toMatch(/\d{4}/)
  })

  it('znosi pustkę i śmieci', () => {
    expect(formatujCzas(null)).toBe('')
    expect(formatujCzas('nie-data')).toBe('')
  })
})
