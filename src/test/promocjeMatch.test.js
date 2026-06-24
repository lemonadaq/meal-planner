import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase', () => ({
  supabase: { from: () => ({ select: () => ({ gte: () => ({ range: () => ({ data: [], error: null }) }) }) }) },
}))

import { normalizujNazwePromo, etykietaWazneDo, dopasujPromocje } from '../promocjeMatch'

describe('normalizujNazwePromo', () => {
  it('lowercase + trim', () => {
    expect(normalizujNazwePromo('  Masło Extra  ')).toBe('masło extra')
  })

  it('wiele spacji → jedna', () => {
    expect(normalizujNazwePromo('ser   żółty   gouda')).toBe('ser żółty gouda')
  })

  it('puste → pusty string', () => {
    expect(normalizujNazwePromo()).toBe('')
    expect(normalizujNazwePromo('')).toBe('')
  })
})

describe('etykietaWazneDo', () => {
  it('dziś → "dziś!"', () => {
    const dzis = new Date()
    const y = dzis.getFullYear()
    const m = String(dzis.getMonth() + 1).padStart(2, '0')
    const d = String(dzis.getDate()).padStart(2, '0')
    expect(etykietaWazneDo(`${y}-${m}-${d}`)).toBe('dziś!')
  })

  it('jutro → "do jutra"', () => {
    const jutro = new Date()
    jutro.setDate(jutro.getDate() + 1)
    const y = jutro.getFullYear()
    const m = String(jutro.getMonth() + 1).padStart(2, '0')
    const d = String(jutro.getDate()).padStart(2, '0')
    expect(etykietaWazneDo(`${y}-${m}-${d}`)).toBe('do jutra')
  })
})

describe('dopasujPromocje', () => {
  const promocje = [
    { nazwa_norm: 'masło extra', nazwa: 'Masło Extra', cena_nowa: 4.99, cena_stara: 6.99, sklep: 'Biedronka', wazne_do: '2099-12-31', rabat_label: '-28%' },
    { nazwa_norm: 'cebula', nazwa: 'Cebula', cena_nowa: 1.99, cena_stara: 2.99, sklep: 'Lidl', wazne_do: '2099-12-31', rabat_label: null },
    { nazwa_norm: 'cebula prażona', nazwa: 'Cebula prażona', cena_nowa: 3.49, cena_stara: null, sklep: 'Auchan', wazne_do: '2099-12-31', rabat_label: null },
  ]

  it('dopasowuje exact match', () => {
    const items = [{ skladnik: 'Masło extra' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeTruthy()
    expect(wynik[0].promo.store).toBe('Biedronka')
    expect(wynik[0].promo.now).toBe(4.99)
  })

  it('dopasowuje przez tokeny', () => {
    const items = [{ skladnik: 'Cebula' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeTruthy()
    expect(wynik[0].promo.store).toBe('Lidl')
  })

  it('nie dopasowuje cebuli prażonej do zwykłej cebuli', () => {
    const items = [{ skladnik: 'Cebula' }]
    const wynik = dopasujPromocje(items, promocje)
    const sklepy = wynik[0].promos.map(p => p.store)
    expect(sklepy).not.toContain('Auchan')
  })

  it('zwraca promo=null gdy brak dopasowania', () => {
    const items = [{ skladnik: 'Awokado' }]
    const wynik = dopasujPromocje(items, promocje)
    expect(wynik[0].promo).toBeNull()
  })

  it('puste promocje → items bez zmian', () => {
    const items = [{ skladnik: 'X' }]
    const wynik = dopasujPromocje(items, [])
    expect(wynik).toEqual(items)
  })
})
