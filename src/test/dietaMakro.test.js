import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

import { sprawdzDanie, wczytajPlik } from '../../skrypty/import-dan.js'
import { zbudujWiersze } from '../../skrypty/wspolne.js'
import { filtrujDania } from '../useTydzien'
import { metaChipyDania } from '../pages/DanieDetail'
import { etykietaMakro, obecneDiety, scalDiete, zDietaAlboBez } from '../dieta'

// Dieta (filtr „💪 Na masę") i makro na porcję — paczka-10 + migracja_dieta_makro.sql

const DANIE = {
  nazwa: 'Kurczak teriyaki z ryżem i brokułem',
  rodzaj: 'obiad',
  kcal: 900, dieta: 'masa', bialko: 67, tluszcz: 15, wegle: 125,
  skladniki: [
    { nazwa: 'pierś z kurczaka', ilosc: '220', jednostka: 'g', kategoria: '2_Mięso i ryby' },
    { nazwa: 'ryż basmati', ilosc: '120', jednostka: 'g', kategoria: '5_Produkty sypkie' },
  ],
  kroki: ['Ugotuj ryż.', 'Usmaż kurczaka.'],
  opis_wizualny: 'A bowl of rice with teriyaki chicken.',
}

describe('import — dieta i makro', () => {
  it('poprawne danie z dietą i makro przechodzi', () => {
    expect(sprawdzDanie(DANIE)).toEqual([])
  })

  it('łapie dietę spoza listy — inaczej danie zniknęłoby z filtra', () => {
    expect(sprawdzDanie({ ...DANIE, dieta: 'Masa' })[0]).toMatch(/dieta/)
  })

  it('łapie ujemne makro', () => {
    expect(sprawdzDanie({ ...DANIE, bialko: -3 })[0]).toMatch(/bialko/)
  })

  it('wczytajPlik przenosi dietę i makro do przepisu', () => {
    const [d] = wczytajPlik(JSON.stringify([DANIE]), 'test.json')
    expect(d.przepis).toMatchObject({ dieta: 'masa', bialko: 67, tluszcz: 15, wegle: 125 })
  })

  it('zbudujWiersze wpisuje dietę i makro do każdego wiersza-składnika', () => {
    const [d] = wczytajPlik(JSON.stringify([DANIE]), 'test.json')
    const wiersze = zbudujWiersze(d.nazwa, d.rodzaj, d.przepis)
    expect(wiersze).toHaveLength(2)
    for (const w of wiersze) expect(w).toMatchObject({ dieta: 'masa', bialko: 67, tluszcz: 15, wegle: 125 })
  })

  it('stara paczka (bez diety) NIE dostaje kluczy, których baza bez migracji nie zna', () => {
    const { dieta, bialko, tluszcz, wegle, ...bez } = DANIE
    void dieta; void bialko; void tluszcz; void wegle
    const [d] = wczytajPlik(JSON.stringify([bez]), 'test.json')
    const [w] = zbudujWiersze(d.nazwa, d.rodzaj, d.przepis)
    for (const k of ['dieta', 'bialko', 'tluszcz', 'wegle']) expect(w).not.toHaveProperty(k)
  })
})

describe('filtr diety', () => {
  const DANIA = [
    { Danie: 'Kurczak teriyaki', rodzaj: 'obiad', dieta: 'masa' },
    { Danie: 'Bigos', rodzaj: 'obiad', dieta: null },
    { Danie: 'Pancakes proteinowe', rodzaj: 'sniadanie', dieta: 'masa' },
  ]

  it('chip „masa" w Tygodniu zawęża do dań na masę', () => {
    expect(filtrujDania(DANIA, { filtry: ['masa'] }).map(d => d.Danie))
      .toEqual(['Kurczak teriyaki', 'Pancakes proteinowe'])
  })

  it('masa + rodzaj działa jak AND („obiady na masę")', () => {
    expect(filtrujDania(DANIA, { filtry: ['masa', 'obiad'] }).map(d => d.Danie))
      .toEqual(['Kurczak teriyaki'])
  })

  it('chip pokazujemy tylko, gdy jest co filtrować', () => {
    expect(obecneDiety(DANIA)).toEqual(['masa'])
    expect(obecneDiety([{ dieta: null }])).toEqual([])
  })

  it('dieta z któregokolwiek wiersza-składnika wygrywa przy deduplikacji', () => {
    expect(scalDiete({ dieta: null }, { dieta: 'masa' })).toBe('masa')
    expect(scalDiete({}, {})).toBeNull()
  })

  it('bez kolumny w bazie pytamy drugi raz, bez `dieta`', async () => {
    const zapytanie = vi.fn(async kol => kol ? { data: null, error: { message: 'column dania.dieta does not exist' } } : { data: [1], error: null })
    expect(await zDietaAlboBez(zapytanie)).toEqual({ data: [1], error: null })
    expect(zapytanie).toHaveBeenNthCalledWith(1, ', dieta')
    expect(zapytanie).toHaveBeenNthCalledWith(2, '')
  })
})

describe('makro w szczegółach dania', () => {
  it('etykieta B/T/W', () => {
    expect(etykietaMakro({ bialko: 67, tluszcz: 15, wegle: 125 })).toBe('B 67 g · T 15 g · W 125 g')
    expect(etykietaMakro({ bialko: null })).toBeNull()
  })

  it('chipy pod tytułem pokazują makro i dietę', () => {
    const chipy = metaChipyDania({ rodzaj: 'obiad', kcal: 900, bialko: 67, tluszcz: 15, wegle: 125, dieta: 'masa' })
    expect(chipy).toContain('B 67 g · T 15 g · W 125 g')
    expect(chipy).toContain('💪 Na masę')
  })
})
