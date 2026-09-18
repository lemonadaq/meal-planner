import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

const { zrobSlug, zajawka, migawkaPrzepisu, formatujDate } = await import('../blog')

describe('zrobSlug', () => {
  it('zdejmuje polskie znaki', () => {
    expect(zrobSlug('Żurek z jajkiem')).toBe('zurek-z-jajkiem')
    expect(zrobSlug('Pierś z kurczaka')).toBe('piers-z-kurczaka')
    expect(zrobSlug('Kimchi jjigae z wieprzowiną')).toBe('kimchi-jjigae-z-wieprzowina')
  })

  it('nie zostawia myślników na brzegach', () => {
    expect(zrobSlug('  Tteokbokki!  ')).toBe('tteokbokki')
    expect(zrobSlug('--- co to ---')).toBe('co-to')
  })

  it('skleja ciągi znaków specjalnych w jeden myślnik', () => {
    expect(zrobSlug('Zupa / krem — z dyni')).toBe('zupa-krem-z-dyni')
  })

  it('tnie długie tytuły i nie kończy myślnikiem', () => {
    const slug = zrobSlug('a'.repeat(50) + ' ' + 'b'.repeat(50))
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('znosi pustkę', () => {
    expect(zrobSlug('')).toBe('')
    expect(zrobSlug(null)).toBe('')
  })
})

describe('zajawka', () => {
  it('woli lead od treści', () => {
    expect(zajawka({ lead: 'Krótko o daniu', tresc: 'Długi tekst' })).toBe('Krótko o daniu')
  })

  it('bierze treść, gdy lead pusty', () => {
    expect(zajawka({ lead: '  ', tresc: 'Treść wpisu' })).toBe('Treść wpisu')
  })

  it('zdejmuje znaczniki markdown', () => {
    expect(zajawka({ tresc: '## Tytuł **gruby**' })).toBe('Tytuł gruby')
  })

  it('tnie na granicy słowa i dokłada wielokropek', () => {
    const wynik = zajawka({ tresc: 'slowo '.repeat(60) }, 40)
    expect(wynik.length).toBeLessThanOrEqual(41)
    expect(wynik.endsWith('…')).toBe(true)
    expect(wynik).not.toMatch(/slo…$/)
  })

  it('krótkiej treści nie tnie', () => {
    expect(zajawka({ tresc: 'Bardzo krótko' }, 180)).toBe('Bardzo krótko')
  })

  it('znosi brak wpisu', () => {
    expect(zajawka(null)).toBe('')
    expect(zajawka({})).toBe('')
  })
})

describe('migawkaPrzepisu', () => {
  // W bazie `dania` to wiersz na składnik — migawka ma to zwinąć w jeden
  // obiekt, żeby publiczna strona nie musiała nic dopytywać.
  const wiersze = [
    {
      'Danie': 'Bibimbap z tofu', rodzaj: 'obiad', czas_minuty: 40, kcal: 650,
      porcje_bazowe: 4, zdjecie: 'https://x/foto.jpg', 'Przepis': '1. Ugotuj ryż',
      'Składnik': 'ryż', 'Ilość na 1 porcję': '100', 'Jednostka': 'g', 'Kategoria': '5_Produkty sypkie',
    },
    {
      'Danie': 'Bibimbap z tofu', rodzaj: 'obiad', czas_minuty: 40, kcal: 650,
      porcje_bazowe: 4, zdjecie: 'https://x/foto.jpg', 'Przepis': '1. Ugotuj ryż',
      'Składnik': 'tofu', 'Ilość na 1 porcję': '80', 'Jednostka': 'g', 'Kategoria': '3_Nabiał',
    },
  ]

  it('zwija wiersze w jeden przepis', () => {
    const m = migawkaPrzepisu(wiersze)
    expect(m.danie).toBe('Bibimbap z tofu')
    expect(m.czas_minuty).toBe(40)
    expect(m.kcal).toBe(650)
    expect(m.kroki).toBe('1. Ugotuj ryż')
    expect(m.skladniki).toHaveLength(2)
    expect(m.skladniki[0]).toEqual({
      nazwa: 'ryż', ilosc: '100', jednostka: 'g', kategoria: '5_Produkty sypkie',
    })
  })

  it('pomija wiersze bez składnika', () => {
    const m = migawkaPrzepisu([...wiersze, { ...wiersze[0], 'Składnik': null }])
    expect(m.skladniki).toHaveLength(2)
  })

  it('brak wierszy daje null', () => {
    expect(migawkaPrzepisu([])).toBeNull()
    expect(migawkaPrzepisu(null)).toBeNull()
  })
})

describe('formatujDate', () => {
  it('formatuje po polsku', () => {
    expect(formatujDate('2026-09-18T10:00:00Z')).toContain('2026')
  })

  it('znosi pustkę i śmieci', () => {
    expect(formatujDate(null)).toBe('')
    expect(formatujDate('nie-data')).toBe('')
  })
})
