import { describe, it, expect } from 'vitest'
import { chipyPodgladu, krokiPrzepisu, grupujSkladniki, iloscTekst } from '../podgladPrzepisu'

describe('chipyPodgladu', () => {
  it('pokazuje rodzaj, kraj, poziom, czas i kalorie', () => {
    expect(chipyPodgladu({
      rodzaj: 'obiad', kuchnia: 'wloska', poziom: 'latwe', czas_minuty: 30, kcal: 450,
    })).toEqual(['Obiad', '🇮🇹 Włoska', '🟢 Łatwe', '30 min', '450 kcal'])
  })

  // TYP steruje doborem dodatków przy planowaniu — użytkownikowi nic nie mówi,
  // więc w podglądzie nie ma prawa się pojawić (tak samo jak w pełnym widoku).
  it('NIGDY nie pokazuje pola TYP', () => {
    const chipy = chipyPodgladu({ rodzaj: 'obiad', TYP: 'z dodatkiem' })
    expect(chipy).toEqual(['Obiad'])
    expect(chipy.join(' ')).not.toMatch(/dodatk/i)
  })

  it('pomija puste pola zamiast rysować dziury', () => {
    expect(chipyPodgladu({ rodzaj: 'zupa', kcal: 0, czas_minuty: null })).toEqual(['Zupa'])
    expect(chipyPodgladu({})).toEqual([])
    expect(chipyPodgladu(null)).toEqual([])
  })

  // Kuchnie dopisuje skrypt, więc w bazie może wylądować wartość spoza listy.
  it('nieznany kraj albo poziom po prostu znika, nie psuje reszty', () => {
    expect(chipyPodgladu({ rodzaj: 'obiad', kuchnia: 'marsjanska', poziom: 'ekstremalne' }))
      .toEqual(['Obiad'])
  })
})

describe('krokiPrzepisu', () => {
  it('rozbija po liniach i zdejmuje numerację z tekstu', () => {
    expect(krokiPrzepisu('1. Pokrój cebulę\n2. Podsmaż\n3. Dolej wody'))
      .toEqual(['Pokrój cebulę', 'Podsmaż', 'Dolej wody'])
  })

  it('radzi sobie z numeracją w nawiasie i pustymi liniami', () => {
    expect(krokiPrzepisu('1) Pierwszy\n\n2) Drugi\n   \n')).toEqual(['Pierwszy', 'Drugi'])
  })

  it('brak przepisu to pusta lista, nie wyjątek', () => {
    expect(krokiPrzepisu('')).toEqual([])
    expect(krokiPrzepisu(null)).toEqual([])
    expect(krokiPrzepisu(undefined)).toEqual([])
  })

  // Liczba na początku kroku nie zawsze jest numeracją.
  it('nie zjada liczby, która jest treścią kroku', () => {
    expect(krokiPrzepisu('Piecz 200 stopni przez 40 minut'))
      .toEqual(['Piecz 200 stopni przez 40 minut'])
  })
})

describe('grupujSkladniki', () => {
  const wiersz = (skladnik, kategoria) => ({ 'Składnik': skladnik, 'Kategoria': kategoria })

  it('grupuje po kategorii i zdejmuje prefiks porządkowy', () => {
    const grupy = grupujSkladniki([
      wiersz('Mleko', '3_Nabiał'),
      wiersz('Cebula', '1_Warzywa i owoce'),
      wiersz('Masło', '3_Nabiał'),
    ])
    expect(grupy.map(([kat]) => kat)).toEqual(['Nabiał', 'Warzywa i owoce'])
    expect(grupy.find(([kat]) => kat === 'Nabiał')[1]).toHaveLength(2)
  })

  // `dania` trzyma metadane dania w KAŻDYM wierszu, więc trafia się wiersz
  // istniejący tylko po to, żeby nieść przepis — bez nazwy składnika.
  it('pomija wiersze bez nazwy składnika', () => {
    expect(grupujSkladniki([wiersz('', '3_Nabiał'), wiersz(null, '3_Nabiał')])).toEqual([])
  })

  it('brak kategorii ląduje w „Inne"', () => {
    expect(grupujSkladniki([{ 'Składnik': 'Coś' }])[0][0]).toBe('Inne')
  })

  it('znosi pustkę', () => {
    expect(grupujSkladniki([])).toEqual([])
    expect(grupujSkladniki(null)).toEqual([])
  })
})

describe('iloscTekst', () => {
  it('skleja ilość z jednostką', () => {
    expect(iloscTekst({ 'Ilość na 1 porcję': '200', 'Jednostka': 'g' })).toBe('200 g')
  })

  // „do smaku" nie ma ilości — sama jednostka jest całą informacją.
  it('bez ilości zostaje sama jednostka', () => {
    expect(iloscTekst({ 'Ilość na 1 porcję': '', 'Jednostka': 'do smaku' })).toBe('do smaku')
    expect(iloscTekst({ 'Ilość na 1 porcję': '-', 'Jednostka': 'do smaku' })).toBe('do smaku')
  })

  it('znosi brak obu pól', () => {
    expect(iloscTekst({})).toBe('')
    expect(iloscTekst(null)).toBe('')
  })
})
