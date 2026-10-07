import { describe, it, expect } from 'vitest'
import {
  kluczProduktu,
  znajdzDuplikatNaLiscie,
  tekstDuplikatu,
} from '../duplikatyZakupow'

// Pozycja listy zakupów w minimalnej postaci — do rozpoznania duplikatu
// liczy się tylko `skladnik`.
const poz = (skladnik) => ({ skladnik })

describe('kluczProduktu', () => {
  // Sedno issue #112: „Cebula" z przepisu i „Cebula" dopisana ręcznie muszą
  // mieć ten sam klucz, inaczej lista pokazuje dwie linijki tego samego.
  it('ta sama nazwa różną wielkością liter daje jeden klucz', () => {
    expect(kluczProduktu('Cebula')).toBe(kluczProduktu('cebula'))
    expect(kluczProduktu('CEBULA')).toBe(kluczProduktu('Cebula'))
  })

  it.each([
    ['cebulka', 'cebula'],
    ['cebula pokrojona w kostkę', 'cebula'],
    ['sok z cytryny', 'cytryna'],
    ['ząbek czosnku', 'czosnek'],
    ['marchewka', 'marchew'],
  ])('%s i %s to jeden produkt', (a, b) => {
    expect(kluczProduktu(a)).toBe(kluczProduktu(b))
  })

  // Przymiotniki, które nie rozróżniają towaru w sklepie.
  it.each([
    ['ogórek', 'ogórek świeży'],
    ['bazylia', 'świeża bazylia'],
  ])('%s i %s to jeden produkt', (a, b) => {
    expect(kluczProduktu(a)).toBe(kluczProduktu(b))
  })

  // Scalenia z SCAL_NAZWY — trzy pisownie tego samego sera.
  it('trzy pisownie mozzarelli dają jeden klucz', () => {
    expect(kluczProduktu('mozarella')).toBe(kluczProduktu('ser mozzarella'))
  })

  // Granica: różne towary MUSZĄ mieć różne klucze, inaczej ostrzeżenie
  // o duplikacie zaczęłoby kłamać.
  it.each([
    ['cebula', 'zielona cebulka'],
    ['pietruszka', 'natka pietruszki'],
    ['masło', 'margaryna'],
    ['mleko', 'mleko kokosowe'],
    ['boczek', 'boczek wędzony'],
  ])('%s i %s to różne produkty', (a, b) => {
    expect(kluczProduktu(a)).not.toBe(kluczProduktu(b))
  })

  it('pusta nazwa daje pusty klucz', () => {
    expect(kluczProduktu('')).toBe('')
    expect(kluczProduktu(null)).toBe('')
    expect(kluczProduktu(undefined)).toBe('')
  })
})

describe('znajdzDuplikatNaLiscie', () => {
  const lista = [poz('Cebula'), poz('Masło'), poz('Chleb pszenny')]

  it('znajduje tę samą nazwę', () => {
    expect(znajdzDuplikatNaLiscie('Cebula', lista)).toEqual(poz('Cebula'))
  })

  it('znajduje zdrobnienie', () => {
    expect(znajdzDuplikatNaLiscie('cebulka', lista)).toEqual(poz('Cebula'))
  })

  it('zwraca null, gdy produktu nie ma na liście', () => {
    expect(znajdzDuplikatNaLiscie('Szafran', lista)).toBeNull()
  })

  it('pusta nazwa nie dopasowuje się do niczego', () => {
    expect(znajdzDuplikatNaLiscie('', lista)).toBeNull()
  })

  it('pusta lista nie wywala się', () => {
    expect(znajdzDuplikatNaLiscie('Cebula', [])).toBeNull()
    expect(znajdzDuplikatNaLiscie('Cebula')).toBeNull()
  })

  // Lista zakupów potrafi mieć dziury (pozycja usunięta korektą) — bez tego
  // `kluczProduktu(undefined.skladnik)` wywalałby cały ekran.
  it('pomija dziury w liście', () => {
    expect(znajdzDuplikatNaLiscie('Cebula', [null, undefined, poz('Cebula')]))
      .toEqual(poz('Cebula'))
  })
})

describe('tekstDuplikatu', () => {
  it('podaje ilość, którą już masz na liście', () => {
    expect(tekstDuplikatu('Cebula', '450 g'))
      .toBe('Dodano: Cebula — masz już 450 g na liście')
  })

  // Bez ilości nie piszemy „masz już  na liście" — to wygląda jak usterka.
  it.each(['', null, undefined])('bez ilości (%s) mówi po prostu, że już jest', (ile) => {
    expect(tekstDuplikatu('Cebula', ile)).toBe('Dodano: Cebula — to już jest na liście')
  })
})
