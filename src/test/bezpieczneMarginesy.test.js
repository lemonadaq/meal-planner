import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GORA_TRESCI, PASEK_SYSTEMOWY } from '../theme'

// Android 15 wymusza rysowanie pod paskiem systemowym dla aplikacji celujących
// w API 35+ (mamy 36). Bez górnego marginesu nagłówek wchodzi pod zegar
// i baterię — dokładnie to zgłosił Filip po pierwszym buildzie ze sklepu.

const KATALOG = dirname(fileURLToPath(new URL(import.meta.url)))
const czytaj = (sciezka) => readFileSync(resolve(KATALOG, '..', sciezka), 'utf-8')

describe('tokeny bezpiecznego marginesu', () => {
  it('liczą się od wysokości paska systemowego, z zerem jako wartością domyślną', () => {
    expect(PASEK_SYSTEMOWY).toBe('env(safe-area-inset-top, 0px)')
    expect(GORA_TRESCI).toBe('calc(20px + env(safe-area-inset-top, 0px))')
  })

  // W przeglądarce env() daje 0, więc zostaje sam bazowy margines — tak
  // jak było przed zmianą. Zero to warunek, żeby nic nie zepsuć na webie.
  it('mają wartość domyślną, więc poza apką nic się nie zmienia', () => {
    expect(PASEK_SYSTEMOWY).toContain(', 0px)')
  })
})

describe('env() w ogóle zadziała', () => {
  // Bez viewport-fit=cover przeglądarka zwraca z env() zero niezależnie od
  // tego, jak wysoki jest pasek — i cała zmiana byłaby martwa.
  it('index.html ma viewport-fit=cover', () => {
    expect(czytaj('../index.html')).toMatch(/viewport-fit=cover/)
  })
})

// Lista ekranów, które widać w aplikacji natywnej. Blog jest pominięty
// celowo — w apce go nie ma, Trasy przekierowują na planer.
const EKRANY_NATYWNE = [
  'pages/Tydzien.jsx', 'pages/Dania.jsx', 'pages/ListaZakupow.jsx',
  'pages/DanieDetail.jsx', 'pages/DodajDanie.jsx', 'pages/Ustawienia.jsx',
  'pages/Rodzina.jsx', 'pages/KonfiguracjaSlotow.jsx', 'pages/Admin.jsx',
  'pages/Home.jsx', 'pages/Login.jsx', 'pages/ImieGate.jsx', 'pages/NoweHaslo.jsx',
]

describe('ekrany odsuwają treść spod paska systemowego', () => {
  it.each(EKRANY_NATYWNE)('%s', (plik) => {
    const src = czytaj(plik)
    expect(src).toMatch(/paddingTop:\s*(GORA_TRESCI|`calc\(.*PASEK_SYSTEMOWY.*`)/)
  })

  // Dolny margines był zrobiony wcześniej i ma zostać — bez niego pasek
  // zakładek wchodzi na przyciski systemowe.
  it('NavBar nadal odsuwa się od dołu', () => {
    expect(czytaj('components/NavBar.jsx')).toMatch(/env\(safe-area-inset-bottom/)
  })
})

// Nowy ekran dodany bez marginesu wygląda dobrze w przeglądarce i źle
// w sklepie — czyli dokładnie tam, gdzie nikt tego nie sprawdzi.
describe('kontrola na przyszłość', () => {
  it('żaden ekran apki nie ma gołego padding-top bez uwzględnienia paska', () => {
    const katalog = resolve(KATALOG, '..', 'pages')
    const bezMarginesu = readdirSync(katalog)
      .filter(f => f.endsWith('.jsx'))
      .filter(f => EKRANY_NATYWNE.includes(`pages/${f}`))
      .filter(f => !czytaj(`pages/${f}`).includes('paddingTop:'))

    expect(bezMarginesu).toEqual([])
  })
})
