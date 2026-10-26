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
//   PACZKA=paczka-10.json npm run sprawdz:nazwy   ← sprawdza dania Z PACZKI
//
// Tryb PACZKA jest BRAMKĄ w workflow „Dania agentem": kończy się błędem,
// gdy choć jedno danie z nowej paczki koliduje z bazą albo z inną paczką.
// Agent raz napisał w raporcie „STATUS: OK" i wymienił „Sałatkę jarzynową",
// która jest w bazie dosłownie (run 40281264797) — od tej pory nie wierzymy
// raportowi, tylko sprawdzamy plik.
//
// UWAGA, i to jest istotne: ta miara porównuje NAPISY, nie dania. „Pollo alla
// cacciatora" i „Kurczak alla cacciatora" przejdą jej przez sito, choć to
// jedno danie. Lista „czystych" to kandydaci do PRZEJRZENIA, nie wyrok.

import { readFileSync, readdirSync, existsSync } from 'fs'
import { znajdzKolizje, zbudujIndeks } from './podobienstwo.js'

const PLIK_LISTY = 'LISTA_DAN.md'
const KATALOG_PACZEK = 'skrypty/dania'
const PROG = parseFloat(process.env.PROG || '0.6')
const PACZKA = process.env.PACZKA?.trim() || null

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

function nazwyZPliku(plik) {
  const dane = JSON.parse(readFileSync(`${KATALOG_PACZEK}/${plik}`, 'utf-8'))
  return (Array.isArray(dane) ? dane : dane.dania || []).map(d => d.nazwa)
}

// Dania z paczek czekających na import. `pomin` wyłącza paczkę sprawdzaną —
// inaczej kolidowałaby sama ze sobą.
function zPaczek(pomin = null) {
  if (!existsSync(KATALOG_PACZEK)) return []
  return readdirSync(KATALOG_PACZEK)
    .filter(f => f.endsWith('.json') && f !== pomin)
    .flatMap(nazwyZPliku)
}

function wczytajNazwy() {
  if (PACZKA) {
    if (!existsSync(`${KATALOG_PACZEK}/${PACZKA}`)) {
      console.error(`Nie ma pliku ${KATALOG_PACZEK}/${PACZKA}`)
      process.exit(1)
    }
    return nazwyZPliku(PACZKA)
  }
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
const paczki = zPaczek(PACZKA)
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

// W trybie PACZKA kolizja to BŁĄD, nie informacja: tak workflow zatrzymuje
// paczkę, zanim trafi do bazy.
if (PACZKA && czyste.length < nazwy.length) {
  console.error(`\n${nazwy.length - czyste.length} dań z ${PACZKA} już jest — paczka NIE przechodzi.`)
  process.exit(1)
}
