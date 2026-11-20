import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

import { sprawdzDanie, wczytajPlik } from '../../skrypty/import-dan.js'
import { zbudujWiersze } from '../../skrypty/wspolne.js'
import { filtrujDania } from '../useTydzien'
import { metaChipyDania } from '../pages/DanieDetail'
import { dietyDania, etykietaMakro, etykietaPorcji, obecneDiety, porcjePodCel, scalDiete, zDietaAlboBez } from '../dieta'

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

  it('masa i fit naraz w Tygodniu działają jak OR między dietami', () => {
    const z = [...DANIA, { Danie: 'Ceviche z dorsza', rodzaj: 'kolacja', dieta: 'fit' }]
    expect(filtrujDania(z, { filtry: ['masa', 'fit'] })).toHaveLength(3)
    expect(filtrujDania(z, { filtry: ['fit'] }).map(d => d.Danie)).toEqual(['Ceviche z dorsza'])
  })

  it('dieta fit przechodzi walidację importu', () => {
    expect(sprawdzDanie({ ...DANIE, dieta: 'fit' })).toEqual([])
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

describe('dieta z proporcji — obie etykiety i porcja pod cel', () => {
  const KURCZAK = { Danie: 'Kurczak z ryżem', rodzaj: 'obiad', dieta: 'masa,fit', kcal: 700, bialko: 60, tluszcz: 15, wegle: 80 }

  it('„masa,fit" to dwie diety', () => {
    expect(dietyDania(KURCZAK)).toEqual(['masa', 'fit'])
    expect(dietyDania({ dieta: 'masa' })).toEqual(['masa'])
    expect(dietyDania({ dieta: null })).toEqual([])
  })

  it('danie z obiema etykietami wpada do obu filtrów', () => {
    const z = [KURCZAK, { Danie: 'Carbonara', rodzaj: 'obiad', dieta: null }]
    expect(filtrujDania(z, { filtry: ['fit'] }).map(d => d.Danie)).toEqual(['Kurczak z ryżem'])
    expect(filtrujDania(z, { filtry: ['masa'] }).map(d => d.Danie)).toEqual(['Kurczak z ryżem'])
    expect(obecneDiety(z)).toEqual(['masa', 'fit'])
  })

  it('chipy w szczegółach pokazują obie diety', () => {
    const chipy = metaChipyDania(KURCZAK)
    expect(chipy).toContain('💪 Na masę')
    expect(chipy).toContain('🥗 Fit')
  })

  it('porcja pod cel liczy się z kcal porcji przepisu', () => {
    expect(porcjePodCel(KURCZAK)).toEqual([
      { dieta: 'masa', kcal: 900, porcje: 1.3 },
      { dieta: 'fit', kcal: 550, porcje: 0.8 },
    ])
    expect(etykietaPorcji({ dieta: 'fit', kcal: 550, porcje: 0.8 })).toBe('0,8 porcji ≈ 550 kcal')
  })

  it('bez sensownego wyniku nie ma podpowiedzi porcji', () => {
    expect(porcjePodCel({ ...KURCZAK, kcal: 150 })).toEqual([])
    expect(porcjePodCel({ ...KURCZAK, rodzaj: 'deser' })).toEqual([])
    expect(porcjePodCel({ ...KURCZAK, dieta: null })).toEqual([])
  })

  it('import przyjmuje „masa,fit", ale nie literówki', () => {
    expect(sprawdzDanie({ ...DANIE, dieta: 'masa,fit' })).toEqual([])
    expect(sprawdzDanie({ ...DANIE, dieta: 'masa,fiit' })[0]).toMatch(/dieta/)
  })
})
