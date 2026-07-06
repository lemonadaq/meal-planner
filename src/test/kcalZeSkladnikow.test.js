import { describe, it, expect } from 'vitest'
import { parsujIlosc, kanonJednostka, naGramy } from '../jednostki'
import { kcalZeSkladnikow, etykietaKcal } from '../kcalZeSkladnikow'

const META = [
  { nazwa: 'Masło', nazwa_norm: 'maslo', kcal_100g: 735 },
  { nazwa: 'Jajko', nazwa_norm: 'jajko', kcal_100g: 143, waga_sztuki_g: 55 },
  { nazwa: 'Mąka pszenna', nazwa_norm: 'maka pszenna', kcal_100g: 360 },
  { nazwa: 'Olej rzepakowy', nazwa_norm: 'olej rzepakowy', kcal_100g: 884, aliasy: ['olej do smazenia'] },
  { nazwa: 'Oliwa z oliwek', nazwa_norm: 'oliwa z oliwek', kcal_100g: 884 },
  { nazwa: 'Cebula', nazwa_norm: 'cebula', kcal_100g: 40, jednostka_bazowa: 'g', rozmiar_opakowania: 150, jednostka_opakowania: 'szt.' },
]

describe('parsujIlosc', () => {
  it('parsuje ułamki, przecinki i kropki', () => {
    expect(parsujIlosc('1/2')).toBe(0.5)
    expect(parsujIlosc('0,5')).toBe(0.5)
    expect(parsujIlosc('1.5')).toBe(1.5)
    expect(parsujIlosc('2')).toBe(2)
  })

  it('zwraca null dla nie-liczb ("- do smaku", pusty)', () => {
    expect(parsujIlosc('- do smaku')).toBe(null)
    expect(parsujIlosc('')).toBe(null)
    expect(parsujIlosc(null)).toBe(null)
  })
})

describe('kanonJednostka + naGramy', () => {
  it('łyżka = 15 g, łyżeczka = 5 g', () => {
    expect(naGramy(1, kanonJednostka('łyżka'), null)).toBe(15)
    expect(naGramy(2, kanonJednostka('łyżeczka'), null)).toBe(10)
  })

  it('szt bez znanej wagi → null', () => {
    expect(naGramy(2, kanonJednostka('szt.'), null)).toBe(null)
  })
})

describe('kcalZeSkladnikow', () => {
  it('liczy kcal z gramów i sztuk (waga z meta)', () => {
    // masło 40 g × 7,35 = 294; jajko 1 szt × 55 g × 1,43 = 78,65 → 372,65 → 370
    const w = kcalZeSkladnikow([
      { nazwa: 'Masło', ilosc: '40', jednostka: 'g' },
      { nazwa: 'Jajko', ilosc: '1', jednostka: 'szt.' },
    ], META)
    expect(w.kcal).toBe(370)
    expect(w.policzone).toBe(2)
    expect(w.braki).toEqual([])
  })

  it('sztuka warzywa bierze wagę z rozmiar_opakowania', () => {
    // cebula 1 szt = 150 g × 0,40 = 60
    const w = kcalZeSkladnikow([{ nazwa: 'Cebula', ilosc: '1', jednostka: 'szt.' }], META)
    expect(w.kcal).toBe(60)
  })

  it('olej DO SMAŻENIA liczy tylko wchłonięte ~35%', () => {
    // 2 łyżki = 30 g × 8,84 = 265,2 × 0,35 = 92,8 → 90 (dopasowanie przez alias)
    const w = kcalZeSkladnikow([{ nazwa: 'Olej do smażenia', ilosc: '2', jednostka: 'łyżka' }], META)
    expect(w.kcal).toBe(90)
  })

  it('zwykła oliwa liczona w całości', () => {
    // 1 łyżka = 15 g × 8,84 = 132,6 → 130
    const w = kcalZeSkladnikow([{ nazwa: 'Oliwa z oliwek', ilosc: '1', jednostka: 'łyżka' }], META)
    expect(w.kcal).toBe(130)
  })

  it('składnik bez meta trafia do braków, reszta się liczy', () => {
    const w = kcalZeSkladnikow([
      { nazwa: 'Masło', ilosc: '40', jednostka: 'g' },
      { nazwa: 'Egzotyczny owoc smoka', ilosc: '100', jednostka: 'g' },
    ], META)
    expect(w.kcal).toBe(290)
    expect(w.braki).toEqual(['Egzotyczny owoc smoka'])
  })

  it('"- do smaku" pomijane bez wpisywania do braków', () => {
    const w = kcalZeSkladnikow([
      { nazwa: 'Masło', ilosc: '40', jednostka: 'g' },
      { nazwa: 'Sól', ilosc: '- do smaku', jednostka: '' },
    ], META)
    expect(w.braki).toEqual([])
    expect(w.policzone).toBe(1)
  })

  it('nic policzone → kcal null', () => {
    const w = kcalZeSkladnikow([{ nazwa: 'Nieznany', ilosc: '2', jednostka: 'szt' }], META)
    expect(w.kcal).toBe(null)
    expect(w.braki).toEqual(['Nieznany'])
  })
})

describe('etykietaKcal', () => {
  it('formatuje z brakami (max 3 + wielokropek)', () => {
    expect(etykietaKcal({ kcal: 370, braki: [] })).toBe('≈ 370 kcal/porcję')
    expect(etykietaKcal({ kcal: 370, braki: ['a', 'b', 'c', 'd'] })).toBe('≈ 370 kcal/porcję (bez: a, b, c…)')
    expect(etykietaKcal({ kcal: null, braki: [] })).toBe(null)
    expect(etykietaKcal(null)).toBe(null)
  })
})
