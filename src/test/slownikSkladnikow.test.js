import { describe, it, expect } from 'vitest'
import {
  czyscNazwe, normalizujIlosc, formatujIlosc, budujSlownik, dopasujDoSlownika,
  przeliczNaJednostke, czyscSkladnik, scalPowtorki, tekstSlownika,
} from '../../skrypty/slownik.js'

// Model dostaje czystą kartkę przy każdym daniu, więc ten sam produkt wraca
// w trzech pisowniach. Tu pilnujemy, że do bazy wchodzi jedna.

const WIERSZE = [
  ...Array(6).fill({ 'Składnik': 'natka pietruszki', 'Jednostka': 'g' }),
  ...Array(8).fill({ 'Składnik': 'cebula', 'Jednostka': 'szt' }),
  ...Array(5).fill({ 'Składnik': 'ser żółty', 'Jednostka': 'g' }),
  ...Array(2).fill({ 'Składnik': 'Cebula', 'Jednostka': 'g' }),
  { 'Składnik': 'kminek', 'Jednostka': 'szczypta' },
]
const META = [{
  nazwa: 'cebula', nazwa_norm: 'cebula',
  jednostka_bazowa: 'g', rozmiar_opakowania: 150, jednostka_opakowania: 'szt',
}]

describe('czyscNazwe', () => {
  it('wycina nawiasy i alternatywy', () => {
    expect(czyscNazwe('dymka (zielona cebulka)')).toBe('dymka')
    expect(czyscNazwe('boczek wędzony lub podgardle')).toBe('boczek wędzony')
  })

  it('wyrzuca ilość wklejoną w nazwę', () => {
    expect(czyscNazwe('500 g mąki')).toBe('mąki')
    expect(czyscNazwe('pasta gochujang 2 łyżki')).toBe('pasta gochujang')
  })

  it('zdejmuje słowo-ilość z początku nazwy', () => {
    expect(czyscNazwe('garstka natki pietruszki')).toBe('natki pietruszki')
    expect(czyscNazwe('szczypta soli')).toBe('soli')
  })

  it('nie rusza cechy, która rozróżnia produkt w sklepie', () => {
    expect(czyscNazwe('ser żółty')).toBe('ser żółty')
    expect(czyscNazwe('pomidory z puszki')).toBe('pomidory z puszki')
    expect(czyscNazwe('mięso mielone')).toBe('mięso mielone')
  })
})

describe('normalizujIlosc', () => {
  it('rozumie ułamki i przecinek', () => {
    expect(normalizujIlosc('1/2', 'szt').ilosc).toBe(0.5)
    expect(normalizujIlosc('1,5', 'łyżka').ilosc).toBe(1.5)
  })

  it('obcina jednostkę wklejoną do ilości', () => {
    expect(normalizujIlosc('100 g', 'g').ilosc).toBe(100)
  })

  it('zamienia słowo-ilość na liczbę i jednostkę', () => {
    expect(normalizujIlosc('szczypta', 'g')).toEqual({ ilosc: 1, jednostka: 'szczypta' })
    expect(normalizujIlosc('garstka', 'g')).toEqual({ ilosc: 1, jednostka: 'łyżka' })
  })

  it('z czegoś nieczytelnego robi 1 w jednostce od modelu', () => {
    expect(normalizujIlosc('wedle uznania', 'g')).toEqual({ ilosc: 1, jednostka: null })
    expect(normalizujIlosc('', 'szt')).toEqual({ ilosc: 1, jednostka: null })
  })
})

describe('formatujIlosc', () => {
  it('trzyma ułamki w postaci, jaką zapisuje formularz', () => {
    expect(formatujIlosc(0.5)).toBe('1/2')
    expect(formatujIlosc(1.5)).toBe('1 1/2')
    expect(formatujIlosc(0.25)).toBe('1/4')
  })

  it('liczby całkowite zostają całkowite', () => {
    expect(formatujIlosc(100)).toBe('100')
    expect(formatujIlosc(0)).toBe('1')
  })
})

describe('budujSlownik', () => {
  const slownik = budujSlownik(WIERSZE, META)

  it('bierze pisownię i jednostkę częstszą w bazie', () => {
    const cebula = slownik.get('cebula')
    expect(cebula.nazwa).toBe('cebula')
    expect(cebula.jednostka).toBe('szt')
    expect(cebula.ile).toBe(10)
  })

  it('wyciąga wagę sztuki ze skladniki_meta', () => {
    expect(slownik.get('cebula').wagaSztuki).toBe(150)
    expect(slownik.get('natka pietruszki').wagaSztuki).toBe(null)
  })

  it('dopasowuje odmienioną nazwę do wpisu z bazy', () => {
    expect(dopasujDoSlownika('natki pietruszki', slownik)).toMatchObject({
      dokladne: true, wpis: { nazwa: 'natka pietruszki' },
    })
  })

  it('dopasowanie po uproszczeniu do produktu NIE jest dokładne', () => {
    // „cebula pokrojona w kostkę" to ta sama cebula co w bazie, ale nazwy
    // z przepisu nie podmieniamy — stamtąd bierzemy tylko jednostkę.
    expect(dopasujDoSlownika('cebula pokrojona w kostkę', slownik)).toMatchObject({
      dokladne: false, wpis: { nazwa: 'cebula' },
    })
  })

  it('nie zmyśla trafienia dla składnika, którego nie ma', () => {
    expect(dopasujDoSlownika('pasta gochujang', slownik)).toBe(null)
  })

  it('w bloku do promptu pomija składniki pojedyncze', () => {
    const tekst = tekstSlownika(slownik)
    expect(tekst).toContain('cebula — szt')
    expect(tekst).toContain('natka pietruszki — g')
    expect(tekst).not.toContain('kminek')
  })
})

describe('przeliczNaJednostke', () => {
  it('przelicza gramy na sztuki, gdy znana jest waga sztuki', () => {
    expect(przeliczNaJednostke(150, 'g', 'szt', 150)).toEqual({ ilosc: 1, jednostka: 'szt' })
  })

  it('NIE zamienia sztuk na gramy', () => {
    // Słownik stoi na starych daniach, w których wszystko było w gramach.
    // Gdyby przeliczał w tę stronę, cofałby poprawki z promptu.
    expect(przeliczNaJednostke(1, 'szt', 'g', 150)).toBe(null)
  })

  it('odpuszcza, gdy wynik jest absurdalny', () => {
    expect(przeliczNaJednostke(5, 'g', 'szt', 150)).toBe(null)      // 0,03 szt
    expect(przeliczNaJednostke(5000, 'g', 'szt', 150)).toBe(null)   // 33 szt
  })

  it('bez wagi sztuki nie przelicza', () => {
    expect(przeliczNaJednostke(150, 'g', 'szt', null)).toBe(null)
  })
})

describe('czyscSkladnik', () => {
  const slownik = budujSlownik(WIERSZE, META)

  it('„garstka natki pietruszki" → nazwa z bazy i sensowna ilość', () => {
    expect(czyscSkladnik(
      { nazwa: 'garstka natki pietruszki', ilosc: 'garstka', jednostka: 'g', kategoria: '1_Warzywa i owoce' },
      slownik,
    )).toEqual({
      nazwa: 'natka pietruszki', ilosc: '1', jednostka: 'łyżka', kategoria: '1_Warzywa i owoce',
    })
  })

  it('150 g cebuli → 1 szt, bo tak cebula jest liczona w bazie', () => {
    const wynik = czyscSkladnik({ nazwa: 'cebula', ilosc: '150', jednostka: 'g', kategoria: '1_Warzywa i owoce' }, slownik)
    expect(wynik).toMatchObject({ nazwa: 'cebula', ilosc: '1', jednostka: 'szt' })
  })

  it('jednostkę poprawia też przy nazwie z opisem przygotowania, nazwy nie rusza', () => {
    const wynik = czyscSkladnik({ nazwa: 'cebula pokrojona w kostkę', ilosc: '150', jednostka: 'g', kategoria: '1_Warzywa i owoce' }, slownik)
    expect(wynik).toMatchObject({ nazwa: 'cebula pokrojona w kostkę', ilosc: '1', jednostka: 'szt' })
  })

  it('bez słownika robi samo sprzątanie', () => {
    expect(czyscSkladnik({ nazwa: 'ryż (najlepiej z wczoraj)', ilosc: '1/2', jednostka: 'g', kategoria: '5_Produkty sypkie' }))
      .toEqual({ nazwa: 'ryż', ilosc: '1/2', jednostka: 'g', kategoria: '5_Produkty sypkie' })
  })

  it('nieznaną jednostkę zastępuje gramami', () => {
    expect(czyscSkladnik({ nazwa: 'mleko', ilosc: '200', jednostka: 'litr', kategoria: '3_Nabiał' }).jednostka).toBe('g')
  })
})

describe('scalPowtorki', () => {
  it('sumuje dwa te same składniki w jednym daniu', () => {
    expect(scalPowtorki([
      { nazwa: 'natka pietruszki', ilosc: '1', jednostka: 'łyżka' },
      { nazwa: 'Natka pietruszki', ilosc: '2', jednostka: 'łyżka' },
    ])).toEqual([{ nazwa: 'natka pietruszki', ilosc: '3', jednostka: 'łyżka' }])
  })

  it('różne jednostki zostawia osobno', () => {
    expect(scalPowtorki([
      { nazwa: 'masło', ilosc: '1', jednostka: 'łyżka' },
      { nazwa: 'masło', ilosc: '20', jednostka: 'g' },
    ])).toHaveLength(2)
  })
})
