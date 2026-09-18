import { describe, it, expect } from 'vitest'
import { uproscNazweSkladnika } from '../../skrypty/wspolne.js'

describe('uproscNazweSkladnika', () => {
  // Te trzy przyszły z wygenerowanych przepisów koreańskich i to one
  // wywołały całą zmianę — na liście zakupów są bezużyteczne.
  it('tnie nawias z wyjaśnieniem', () => {
    expect(uproscNazweSkladnika('dymka (zielona cebulka)')).toBe('dymka')
  })

  it('zostawia pierwszy wariant z alternatywy', () => {
    expect(uproscNazweSkladnika('boczek wędzony lub podgardle')).toBe('boczek wędzony')
  })

  it('zdejmuje stan przygotowania razem z nawiasem', () => {
    expect(uproscNazweSkladnika('ryż ugotowany (najlepiej z dnia poprzedniego)')).toBe('ryż')
  })

  // Sedno: cecha, która ROZRÓŻNIA produkt w sklepie, musi zostać. Bez niej
  // trafiłoby się w zupełnie inny towar.
  it.each([
    'boczek wędzony',
    'mięso mielone',
    'papryka suszona',
    'mleko kokosowe',
    'ser żółty',
    'kapusta kiszona',
    'ogórki konserwowe',
    'pasta gochujang',
    'makaron ryżowy',
  ])('nie rusza cechy produktu: %s', (nazwa) => {
    expect(uproscNazweSkladnika(nazwa)).toBe(nazwa)
  })

  it.each([
    ['cebula pokrojona w kostkę', 'cebula'],
    ['masło roztopione', 'masło'],
    ['ser żółty starty', 'ser żółty'],
    ['fasola namoczona', 'fasola'],
    ['ziemniaki obrane', 'ziemniaki'],
    ['pomidory posiekane', 'pomidory'],
  ])('zdejmuje stan przygotowania: %s', (wejscie, oczekiwane) => {
    expect(uproscNazweSkladnika(wejscie)).toBe(oczekiwane)
  })

  it('tnie ogon po przecinku', () => {
    expect(uproscNazweSkladnika('cebula, drobno posiekana')).toBe('cebula')
  })

  it('radzi sobie z alternatywą i nawiasem naraz', () => {
    expect(uproscNazweSkladnika('kimchi (kapusta kiszona po koreańsku) lub ogórki'))
      .toBe('kimchi')
  })

  it('zwija nadmiarowe spacje', () => {
    expect(uproscNazweSkladnika('  pasta   gochujang  ')).toBe('pasta gochujang')
  })

  // Gdyby czyszczenie zjadło całą nazwę, oddajemy oryginał — pusty składnik
  // na liście zakupów jest gorszy niż brzydki.
  it('nie oddaje pustki', () => {
    expect(uproscNazweSkladnika('(do smaku)')).toBe('(do smaku)')
    expect(uproscNazweSkladnika('')).toBe('')
  })

  it('znosi null i undefined', () => {
    expect(uproscNazweSkladnika(null)).toBe('')
    expect(uproscNazweSkladnika(undefined)).toBe('')
  })
})

describe('uproscNazweSkladnika — przypadki brzegowe cięcia', () => {
  it('ucina sposób przygotowania idący za słowem', () => {
    expect(uproscNazweSkladnika('cebula pokrojona w kostkę')).toBe('cebula')
    expect(uproscNazweSkladnika('ser żółty starty na tarce')).toBe('ser żółty')
    expect(uproscNazweSkladnika('marchew pokrojona w słupki')).toBe('marchew')
  })

  // Cięcie od słowa zabrałoby całą nazwę, więc tu znika samo słowo.
  it('gdy stan przygotowania jest na początku, produkt zostaje', () => {
    expect(uproscNazweSkladnika('ugotowany ryż')).toBe('ryż')
    expect(uproscNazweSkladnika('roztopione masło')).toBe('masło')
  })
})
