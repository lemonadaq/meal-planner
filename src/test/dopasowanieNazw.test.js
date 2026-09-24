import { describe, it, expect } from 'vitest'
import { kluczNazwy, polaczOdpowiedzi } from '../../skrypty/dopasowanie-nazw.mjs'

// Pierwszy przebieg trybu `kuchnie` zgubił ~40% dań, mimo że model odpowiedział:
// klucz mapy był DOKŁADNĄ nazwą z bazy, więc każda drobna różnica wyrzucała danie.
describe('kluczNazwy', () => {
  it('ignoruje wielkość liter i ogonki', () => {
    expect(kluczNazwy('Żurek Śląski')).toBe(kluczNazwy('zurek slaski'))
  })

  it('ignoruje gwiazdki, ukośniki i typograficzne cudzysłowy', () => {
    expect(kluczNazwy('Jajka po turecku*')).toBe(kluczNazwy('Jajka po turecku'))
    expect(kluczNazwy('Pyzy/kluski śląskie')).toBe(kluczNazwy('Pyzy / kluski slaskie'))
    expect(kluczNazwy('Placki bananowe z „chrupką”')).toBe(kluczNazwy('Placki bananowe z "chrupka"'))
  })

  it('ignoruje nadmiarowe spacje', () => {
    expect(kluczNazwy('  Pierogi   ruskie ')).toBe('pierogi ruskie')
  })

  it('NIE skleja różnych dań', () => {
    expect(kluczNazwy('Pierogi ruskie')).not.toBe(kluczNazwy('Pierogi z mięsem'))
  })

  it('znosi null i undefined', () => {
    expect(kluczNazwy(null)).toBe('')
    expect(kluczNazwy(undefined)).toBe('')
  })
})

describe('polaczOdpowiedzi', () => {
  const danie = (nazwa) => ({ nazwa })
  const odp = (nazwa, kuchnia) => ({ nazwa, kuchnia, poziom: 'latwe' })

  it('łączy po nazwie, gdy nazwy się zgadzają', () => {
    const { pary, brakujace } = polaczOdpowiedzi(
      [danie('Pierogi ruskie'), danie('Pizza domowa')],
      [odp('Pizza domowa', 'wloska'), odp('Pierogi ruskie', 'polska')],
    )
    expect(brakujace).toEqual([])
    expect(pary.map(([d, w]) => [d.nazwa, w.kuchnia]))
      .toEqual([['Pierogi ruskie', 'polska'], ['Pizza domowa', 'wloska']])
  })

  it('łączy mimo drobnych różnic w zapisie nazwy', () => {
    const { pary, brakujace } = polaczOdpowiedzi(
      [danie('Jajka po turecku*'), danie('Pyzy/kluski śląskie')],
      [odp('Jajka po turecku', 'turecka'), odp('Pyzy / kluski śląskie', 'polska')],
    )
    expect(brakujace).toEqual([])
    expect(pary).toHaveLength(2)
  })

  // Prompt prosi o tę samą kolejność, więc przy komplecie pozycji indeks
  // jest wiarygodny nawet wtedy, gdy model przepisał nazwę po swojemu.
  it('gdy komplet pozycji się zgadza, ratuje dopasowanie po kolejności', () => {
    const { pary, brakujace } = polaczOdpowiedzi(
      [danie('Coś zupełnie innego'), danie('Pizza domowa')],
      [odp('Cos zupelnie inne', 'polska'), odp('Pizza domowa', 'wloska')],
    )
    expect(brakujace).toEqual([])
    expect(pary[0][1].kuchnia).toBe('polska')
  })

  // Sedno: przy NIEPEŁNEJ odpowiedzi indeksy się rozjeżdżają i danie
  // dostałoby cudzą kuchnię. Lepiej zgłosić brak, niż wpisać bzdurę.
  it('przy niepełnej odpowiedzi NIE zgaduje po kolejności', () => {
    const { pary, brakujace } = polaczOdpowiedzi(
      [danie('Pierogi ruskie'), danie('Pizza domowa'), danie('Żurek')],
      [odp('Pizza domowa', 'wloska')],
    )
    expect(pary.map(([d]) => d.nazwa)).toEqual(['Pizza domowa'])
    expect(brakujace.map(d => d.nazwa)).toEqual(['Pierogi ruskie', 'Żurek'])
  })

  it('duplikat w odpowiedzi nie nadpisuje trafienia', () => {
    const { pary } = polaczOdpowiedzi(
      [danie('Pizza domowa')],
      [odp('Pizza domowa', 'wloska'), odp('Pizza domowa', 'amerykanska')],
    )
    expect(pary[0][1].kuchnia).toBe('wloska')
  })

  it('pusta albo zepsuta odpowiedź to same braki, nie wyjątek', () => {
    expect(polaczOdpowiedzi([danie('X')], []).brakujace).toHaveLength(1)
    expect(polaczOdpowiedzi([danie('X')], null).brakujace).toHaveLength(1)
    expect(polaczOdpowiedzi([danie('X')], undefined).brakujace).toHaveLength(1)
  })
})
