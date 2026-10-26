import { describe, it, expect } from 'vitest'
import {
  PLAN_KUCHNI, PLAN_RODZAJOW, parsujPlan, rozdziel, zbudujPlan, podzielZadanie,
  odfiltrujPropozycje, liniaDania,
} from '../../skrypty/propozycje.js'
import { znajdzKolizje, zbudujIndeks } from '../../skrypty/podobienstwo.js'
import { RODZAJE, KUCHNIE } from '../../skrypty/wspolne.js'

// Tryb `auto`: Filip wpisuje w akcji jedną liczbę, więc rozkład na kuchnie
// i rodzaje oraz pilnowanie dubli musi się policzyć samo i powtarzalnie.

describe('rozdziel', () => {
  it('rozdaje dokładnie tyle, ile ma rozdać', () => {
    for (const ile of [1, 7, 13, 50, 200]) {
      const wynik = rozdziel(ile, PLAN_KUCHNI)
      expect(Object.values(wynik).reduce((s, n) => s + n, 0)).toBe(ile)
    }
  })

  it('trzyma proporcje wag', () => {
    const wynik = rozdziel(100, { polska: 3, wloska: 1 })
    expect(wynik).toEqual({ polska: 75, wloska: 25 })
  })

  it('nie zwraca kubełków z zerem', () => {
    const wynik = rozdziel(2, PLAN_KUCHNI)
    expect(Object.values(wynik).every(n => n > 0)).toBe(true)
  })

  it('jest deterministyczny', () => {
    expect(rozdziel(37, PLAN_KUCHNI)).toEqual(rozdziel(37, PLAN_KUCHNI))
  })
})

describe('parsujPlan', () => {
  it('czyta wagi', () => {
    expect(parsujPlan('polska:3, wloska:1', KUCHNIE)).toEqual({ polska: 3, wloska: 1 })
  })

  it('sama lista nazw znaczy równe udziały', () => {
    expect(parsujPlan('obiad, zupa', RODZAJE)).toEqual({ obiad: 1, zupa: 1 })
  })

  it('puste wejście to brak planu, czyli domyślny', () => {
    expect(parsujPlan('', KUCHNIE)).toBe(null)
    expect(parsujPlan(undefined, KUCHNIE)).toBe(null)
  })

  it('literówka zatrzymuje przebieg, zamiast cicho ją zjeść', () => {
    expect(() => parsujPlan('polskaa:2', KUCHNIE)).toThrow(/nieznana wartość/)
    expect(() => parsujPlan('polska:0', KUCHNIE)).toThrow(/waga/)
  })
})

describe('zbudujPlan', () => {
  it('suma dań w planie zgadza się z zamówieniem', () => {
    const plan = zbudujPlan(200)
    expect(plan.reduce((s, z) => s + z.ile, 0)).toBe(200)
    for (const z of plan) {
      expect(Object.values(z.rodzaje).reduce((s, n) => s + n, 0)).toBe(z.ile)
    }
  })

  it('nie planuje przekąsek — Filip prosił, żeby je zostawić', () => {
    const rodzaje = zbudujPlan(200).flatMap(z => Object.keys(z.rodzaje))
    expect(rodzaje).not.toContain('przekaska')
    expect(PLAN_RODZAJOW.przekaska).toBeUndefined()
  })

  it('polska, włoska i francuska to większość paczki', () => {
    const plan = zbudujPlan(100)
    const trzy = plan.filter(z => ['polska', 'wloska', 'francuska'].includes(z.kuchnia))
    expect(trzy.reduce((s, z) => s + z.ile, 0)).toBeGreaterThan(50)
  })
})

describe('podzielZadanie', () => {
  it('nie wypuszcza paczki większej niż limit', () => {
    const paczki = podzielZadanie({ obiad: 20, kolacja: 12, deser: 10 }, 25)
    for (const p of paczki) {
      expect(Object.values(p).reduce((s, n) => s + n, 0)).toBeLessThanOrEqual(25)
    }
  })

  it('nie gubi ani nie dosypuje dań', () => {
    const zadanie = { obiad: 20, kolacja: 12, sniadanie: 10, deser: 10, surowka: 8 }
    const suma = o => Object.values(o).reduce((s, n) => s + n, 0)
    const paczki = podzielZadanie(zadanie, 25)
    expect(paczki.reduce((s, p) => s + suma(p), 0)).toBe(suma(zadanie))
  })
})

describe('odfiltrujPropozycje', () => {
  const wBazie = ['Bigos', 'Spaghetti carbonara', 'Zupa pomidorowa']

  it('odrzuca danie, które w bazie już jest', () => {
    const { przyjete, odrzucone } = odfiltrujPropozycje(
      [{ nazwa: 'bigos', rodzaj: 'obiad' }], wBazie)
    expect(przyjete).toHaveLength(0)
    expect(odrzucone[0].powod).toContain('Bigos')
  })

  it('odrzuca to samo danie pod inną nazwą', () => {
    const { przyjete } = odfiltrujPropozycje(
      [{ nazwa: 'Carbonara ze spaghetti', rodzaj: 'obiad' }], wBazie)
    expect(przyjete).toHaveLength(0)
  })

  it('odrzuca powtórkę w obrębie jednej paczki', () => {
    const { przyjete, odrzucone } = odfiltrujPropozycje([
      { nazwa: 'Tarta z porami', rodzaj: 'obiad' },
      { nazwa: 'Tarta z porami i boczkiem', rodzaj: 'obiad' },
    ], wBazie)
    expect(przyjete).toHaveLength(1)
    expect(odrzucone[0].powod).toContain('paczce')
  })

  it('odrzuca rodzaj poza zakresem — w tym przekąski', () => {
    const { odrzucone } = odfiltrujPropozycje(
      [{ nazwa: 'Chipsy z jarmużu', rodzaj: 'przekaska' }], wBazie,
      { rodzajeOk: ['obiad', 'deser'] })
    expect(odrzucone[0].powod).toContain('poza zakresem')
  })

  it('przepuszcza nowe danie i normalizuje jego pola', () => {
    const { przyjete } = odfiltrujPropozycje(
      [{ nazwa: '  Tarta   z porami ', rodzaj: 'OBIAD', kuchnia: 'francuska' }], wBazie)
    expect(przyjete).toEqual([{ nazwa: 'Tarta z porami', rodzaj: 'obiad', kuchnia: 'francuska' }])
  })

  it('nieznaną kuchnię zeruje, zamiast wpisywać śmieć do bazy', () => {
    const { przyjete } = odfiltrujPropozycje(
      [{ nazwa: 'Tarta z porami', rodzaj: 'obiad', kuchnia: 'bretońska' }], wBazie)
    expect(przyjete[0].kuchnia).toBe(null)
  })
})

describe('liniaDania', () => {
  it('składa linijkę do wklejenia w pole `dania`', () => {
    expect(liniaDania([
      { nazwa: 'Tarta z porami', rodzaj: 'obiad' },
      { nazwa: 'Sernik baskijski', rodzaj: 'deser' },
    ])).toBe('Tarta z porami|obiad; Sernik baskijski|deser')
  })
})

describe('znajdzKolizje', () => {
  it('ignoruje wielkość liter i ogonki', () => {
    expect(znajdzKolizje('zurek slaski', ['Żurek śląski'])).toBe('Żurek śląski')
  })

  it('łapie dłuższą nazwę tego samego dania', () => {
    expect(znajdzKolizje('Kotlet schabowy z kapustą zasmażaną', ['Schabowy z kapustą']))
      .toBe('Schabowy z kapustą')
  })

  it('nie łapie dań tylko podobnych z nazwy', () => {
    expect(znajdzKolizje('Tarta z porami', zbudujIndeks(['Zupa porowa z ziemniakami']))).toBe(null)
    expect(znajdzKolizje('Sernik baskijski', zbudujIndeks(['Sernik na zimno']))).toBe(null)
  })
})
