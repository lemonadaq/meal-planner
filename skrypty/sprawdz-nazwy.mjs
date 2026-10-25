// sprawdz-nazwy.mjs
// Czy te nazwy dań można dopisać do bazy, czy to duble?
//
// Porównuje podane nazwy z DWOMA zbiorami:
//   1. dania z bazy (LISTA_DAN.md — odśwież trybem `lista` + `zapisz_liste`)
//   2. dania z paczek czekających na import (skrypty/dania/*.json)
// Bez drugiego zbioru kolejna paczka powtarzałaby dania z poprzedniej.
//
// Miara podobieństwa: podobienstwo.js — ta sama, którą liczy `npm run duble`.
//
//   NAZWY="Bigos; Quiche lorraine" npm run sprawdz:nazwy
//   npm run sprawdz:nazwy -- plik-z-nazwami.txt
//
// UWAGA, i to jest istotne: ta miara porównuje NAPISY, nie dania. „Pollo alla
// cacciatora" i „Kurczak alla cacciatora" przejdą jej przez sito, choć to
// jedno danie. Lista „czystych" to kandydaci do PRZEJRZENIA, nie wyrok.

import { readFileSync, readdirSync, existsSync } from 'fs'
import { znajdzKolizje, zbudujIndeks } from './podobienstwo.js'

const PLIK_LISTY = 'LISTA_DAN.md'
const KATALOG_PACZEK = 'skrypty/dania'
const PROG = parseFloat(process.env.PROG || '0.6')

function zBazy() {
  if (!existsSync(PLIK_LISTY)) {
    console.error(`Brak ${PLIK_LISTY} — odśwież listę: tryb \`lista\` + \`zapisz_liste\``)
    process.exit(1)
  }
  return readFileSync(PLIK_LISTY, 'utf-8').split('\n')
    .filter(l => l.startsWith('| ') && !l.includes('---'))
    .map(l => l.split('|')[1].trim())
    .filter(n => n && n !== 'danie')
}

function zPaczek() {
  if (!existsSync(KATALOG_PACZEK)) return []
  return readdirSync(KATALOG_PACZEK).filter(f => f.endsWith('.json'))
    .flatMap(f => {
      const dane = JSON.parse(readFileSync(`${KATALOG_PACZEK}/${f}`, 'utf-8'))
      return (Array.isArray(dane) ? dane : dane.dania || []).map(d => d.nazwa)
    })
}

function wczytajNazwy() {
  const plik = process.argv[2]
  const tekst = plik ? readFileSync(plik, 'utf-8') : (process.env.NAZWY || '')
  const nazwy = tekst.split(/[\r\n;]+/).map(x => x.trim()).filter(x => x && !x.startsWith('#'))
  if (!nazwy.length) {
    console.error('Podaj nazwy: NAZWY="Jedno; Drugie" npm run sprawdz:nazwy')
    console.error('albo: npm run sprawdz:nazwy -- plik.txt (jedna nazwa w linii)')
    process.exit(1)
  }
  return nazwy
}

const baza = zBazy()
const paczki = zPaczek()
const nazwy = wczytajNazwy()

// Indeks rośnie w trakcie: przyjęta nazwa od razu blokuje swoje warianty.
const indeks = zbudujIndeks([...baza, ...paczki])
console.log(`Baza: ${baza.length} dań | paczki do importu: ${paczki.length} | próg: ${PROG}\n`)

const czyste = []
for (const nazwa of nazwy) {
  const kolizja = znajdzKolizje(nazwa, indeks, PROG)
  if (kolizja) {
    console.log(`✗ ${nazwa.padEnd(44)} ← już jest: ${kolizja}`)
    continue
  }
  czyste.push(nazwa)
  indeks.push(...zbudujIndeks([nazwa]))
}

console.log(`\n✓ CZYSTE (${czyste.length}/${nazwy.length}):`)
console.log(czyste.join('\n') || '(żadna)')
console.log('\nMiara porównuje nazwy, nie dania — przejrzyj listę oczami przed')
console.log('napisaniem przepisów (np. „Kurczak alla cacciatora" kontra')
console.log('„Pollo alla cacciatora" to jedno danie, a nazwy są różne).')
