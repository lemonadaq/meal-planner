import { describe, it, expect, vi } from 'vitest'

// ListaZakupow importuje supabase (createClient) — mockujemy, żeby import modułu nie
// wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { zbudujObiektEdycji } from '../pages/ListaZakupow'

// Regresja: przycisk ✕ na liście zakupów usuwa jednolicie wszystkie źródła.
// zbudujObiektEdycji decyduje JAK usunąć (własne/cykliczne po id z bazy,
// plan przez korektę usuniety). Ta sama funkcja obsługuje edycję (✎) i usuwanie (✕).
describe('zbudujObiektEdycji — normalizacja pozycji do usunięcia/edycji', () => {
  it('produkt własny → rekord z bazy z id (do DELETE) i __zrodlo=wlasne', () => {
    const item = { zrodlo: 'wlasne', skladnik: 'Papier', wlasnyData: { id: 7, nazwa: 'Papier', kategoria: '8_Inne' } }
    const o = zbudujObiektEdycji(item)
    expect(o.__zrodlo).toBe('wlasne')
    expect(o.id).toBe(7)
    expect(o.nazwa).toBe('Papier')
    expect(o.cykliczny).toBe(false)
  })

  it('produkt cykliczny → __zrodlo=cykliczne, cykliczny=true, id do DELETE', () => {
    const item = { zrodlo: 'cykliczne', skladnik: 'Mleko', cyklicneData: { id: 3, nazwa: 'Mleko' } }
    const o = zbudujObiektEdycji(item)
    expect(o.__zrodlo).toBe('cykliczne')
    expect(o.id).toBe(3)
    expect(o.cykliczny).toBe(true)
  })

  it('pozycja z planu → __zrodlo=plan, bazaKlucz i nazwa ze skladnik', () => {
    const item = {
      zrodlo: 'plan', skladnik: 'Marchew', klucz: 'Marchew||',
      bazaKlucz: 'Marchew||', kategoria: '1_Warzywa i owoce', ilosc: 2, jednostka: 'szt.',
    }
    const o = zbudujObiektEdycji(item)
    expect(o.__zrodlo).toBe('plan')
    expect(o.bazaKlucz).toBe('Marchew||')
    expect(o.nazwa).toBe('Marchew')
    expect(o.kategoria).toBe('1_Warzywa i owoce')
  })

  it('plan bez bazaKlucz → fallback na klucz, brak kategorii → 8_Inne', () => {
    const item = { zrodlo: 'plan', skladnik: 'Coś', klucz: 'Coś||' }
    const o = zbudujObiektEdycji(item)
    expect(o.bazaKlucz).toBe('Coś||')
    expect(o.kategoria).toBe('8_Inne')
  })

  it('brak itemu → null (bez wywrotki)', () => {
    expect(zbudujObiektEdycji(null)).toBe(null)
  })
})
