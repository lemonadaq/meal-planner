import { describe, it, expect, vi } from 'vitest'

// useTydzien importuje supabase (createClient) — mock, żeby import modułu nie
// wywołał createClient z pustymi env.
vi.mock('../supabase', () => ({ supabase: {} }))

import { filtrujDania } from '../useTydzien'

const DANIA = [
  { Danie: 'Kanapki z serem',       rodzaj: 'sniadanie', ulubione: false },
  { Danie: 'Spaghetti bolognese',   rodzaj: 'obiad',     ulubione: true },
  { Danie: 'Pomidorowa',            rodzaj: 'zupa',      ulubione: false },
  { Danie: 'Pizza',                 rodzaj: 'kolacja',   ulubione: true },
  { Danie: 'Sernik',                rodzaj: 'deser',     ulubione: false },
]

describe('filtrujDania — chipy rodzajów + ulubione + szukajka (ekran Tydzień)', () => {
  it('bez filtrów zwraca wszystko', () => {
    expect(filtrujDania(DANIA)).toHaveLength(5)
    expect(filtrujDania(DANIA, { filtry: [], szukaj: '' })).toHaveLength(5)
  })

  it('jeden rodzaj zawęża do tego rodzaju', () => {
    const w = filtrujDania(DANIA, { filtry: ['zupa'] })
    expect(w.map(d => d.Danie)).toEqual(['Pomidorowa'])
  })

  it('kilka rodzajów działa jak OR', () => {
    const w = filtrujDania(DANIA, { filtry: ['sniadanie', 'deser'] })
    expect(w.map(d => d.Danie)).toEqual(['Kanapki z serem', 'Sernik'])
  })

  it('ulubione to dodatkowy warunek AND do rodzajów', () => {
    expect(filtrujDania(DANIA, { filtry: ['ulubione'] }).map(d => d.Danie))
      .toEqual(['Spaghetti bolognese', 'Pizza'])
    expect(filtrujDania(DANIA, { filtry: ['ulubione', 'obiad'] }).map(d => d.Danie))
      .toEqual(['Spaghetti bolognese'])
    expect(filtrujDania(DANIA, { filtry: ['ulubione', 'zupa'] })).toHaveLength(0)
  })

  it('szukajka ignoruje wielkość liter i łączy się z chipami', () => {
    expect(filtrujDania(DANIA, { szukaj: 'piZZa' }).map(d => d.Danie)).toEqual(['Pizza'])
    expect(filtrujDania(DANIA, { filtry: ['zupa'], szukaj: 'pizza' })).toHaveLength(0)
    expect(filtrujDania(DANIA, { szukaj: '  ' })).toHaveLength(5) // same spacje = brak filtra
  })
})
