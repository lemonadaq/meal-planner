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

// Filip: „Cebula w kostkę? To też nie jest produkt do kupienia".
// Te frazy nie mają imiesłowu, więc cięcie po OPISY_PRZYGOTOWANIA ich nie łapało.
describe('uproscNazweSkladnika — frazy przygotowania bez imiesłowu', () => {
  it.each([
    ['cebula w kostkę', 'cebula'],
    ['marchew w plastry', 'marchew'],
    ['papryka w paski', 'papryka'],
    ['por w talarki', 'por'],
    ['ziemniaki w ćwiartki', 'ziemniaki'],
    ['czosnek na drobno', 'czosnek'],
    ['ser żółty na tarce', 'ser żółty'],
    ['natka pietruszki do dekoracji', 'natka pietruszki'],
    ['olej do smażenia', 'olej'],
    ['sól do smaku', 'sól'],
  ])('tnie instrukcję: %s', (wejscie, oczekiwane) => {
    expect(uproscNazweSkladnika(wejscie)).toBe(oczekiwane)
  })

  // Sedno rozróżnienia: instrukcja stoi w bierniku, produkt w miejscowniku.
  // „w plastry" to jak pokroić, „w plasterkach" to co kupić.
  it.each([
    'tuńczyk w oleju',
    'kukurydza w puszce',
    'mleko w proszku',
    'ogórki w occie',
    'szynka w plasterkach',
    'brzoskwinie w syropie',
    'śledź w zalewie',
    'fasola w sosie pomidorowym',
  ])('nie rusza produktu w miejscowniku: %s', (nazwa) => {
    expect(uproscNazweSkladnika(nazwa)).toBe(nazwa)
  })
})

describe('uproscNazweSkladnika — gramatura i ogony instrukcji', () => {
  it.each([
    ['pasta gochujang 2 łyżki', 'pasta gochujang'],
    ['mąka pszenna 100 g', 'mąka pszenna'],
    ['śmietana 30% 200 ml', 'śmietana 30%'],
    ['olej sezamowy do skropienia na koniec', 'olej sezamowy'],
    ['sezam do posypania na wierzch', 'sezam'],
  ])('zdejmuje ogon: %s', (wejscie, oczekiwane) => {
    expect(uproscNazweSkladnika(wejscie)).toBe(oczekiwane)
  })

  // Procent to cecha produktu („śmietana 30%" to inny towar niż 18%),
  // więc sam w sobie nie może być traktowany jak gramatura.
  it('procent zostaje, bo rozróżnia produkt', () => {
    expect(uproscNazweSkladnika('śmietana 18%')).toBe('śmietana 18%')
    expect(uproscNazweSkladnika('mleko 3,2%')).toBe('mleko 3,2%')
  })
})
