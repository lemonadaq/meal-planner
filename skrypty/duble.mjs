// duble.mjs
// Szuka dań, które są tym samym daniem pod dwiema nazwami — także WPOPRZEK
// kategorii, bo tam duble najłatwiej przeoczyć (to samo raz jako przekąska,
// raz jako kolacja).
//
// Czyta LISTA_DAN.md, nie bazę — nie potrzebuje żadnych kluczy i nic nie
// kosztuje. Odśwież najpierw listę (tryb `lista` + `zapisz_liste`), jeśli
// baza się zmieniła.
//
//   npm run duble
//
// JAK TO DZIAŁA: nazwa → zbiór znaczących słów (bez „z", „i", „na"...),
// każde skrócone do 5 znaków bez ogonków, żeby „serem" i „ser" albo
// „naleśniki" i „naleśnik" wpadły w to samo. Potem dwa testy:
//   1. zawieranie — wszystkie słowa krótszej nazwy są w dłuższej
//   2. podobieństwo Jaccarda — ile słów wspólnych do wszystkich
//
// OGRANICZENIE: porównywane są NAZWY, nie składniki. Dwa dania o zupełnie
// różnych nazwach i identycznym przepisie tu nie wyjdą.

import { readFileSync } from 'fs'

const PLIK = 'LISTA_DAN.md'
const PROG = parseFloat(process.env.PROG || '0.6')

const STOP = new Set(['z', 'ze', 'i', 'w', 'we', 'na', 'do', 'po', 'od', 'a', 'o', 'bez', 'pod', 'nad', 'jak'])

const rdzen = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ł/g, 'l').replace(/[^a-z0-9]/g, '').slice(0, 5)

const tokeny = nazwa => new Set(
  nazwa.toLowerCase().split(/[^\p{L}\p{N}]+/u)
    .filter(w => w && !STOP.has(w)).map(rdzen).filter(Boolean))

function wczytaj() {
  return readFileSync(PLIK, 'utf-8').split('\n')
    .filter(l => l.startsWith('| ') && !l.includes('---'))
    .map(l => l.split('|').slice(1, 3).map(x => x.trim()))
    .filter(([n]) => n && n !== 'danie')
    .map(([nazwa, rodzaj]) => ({ nazwa, rodzaj, t: tokeny(nazwa) }))
}

const podzbior = (a, b) => [...a].every(x => b.has(x))

function jaccard(a, b) {
  let wspolne = 0
  for (const x of a) if (b.has(x)) wspolne++
  return wspolne / (a.size + b.size - wspolne)
}

function wypisz(tytul, pary) {
  console.log(`\n${tytul}  (${pary.length})`)
  console.log('─'.repeat(94))
  if (!pary.length) { console.log('  brak\n'); return }
  for (const { x, y, powod } of pary) {
    console.log(`  ${x.nazwa}`.padEnd(50) + `[${x.rodzaj}]`)
    console.log(`  └─ ${y.nazwa}`.padEnd(50) + `[${y.rodzaj}]   ${powod}\n`)
  }
}

function main() {
  const dania = wczytaj()
  const pary = []
  const widziane = new Set()

  for (let i = 0; i < dania.length; i++) {
    for (let j = 0; j < dania.length; j++) {
      if (i === j) continue
      const x = dania[i], y = dania[j]

      // Krótsza nazwa musi mieć min. 2 znaczące słowa. Inaczej jednowyrazowe
      // zupy („Pieczarkowa") są podzbiorem wszystkiego, co ma ten składnik,
      // i raport tonie w szumie.
      const zawiera = x.t.size >= 2 && x.t.size < y.t.size && podzbior(x.t, y.t)
      const s = jaccard(x.t, y.t)
      if (!zawiera && s < PROG) continue

      const klucz = [x.nazwa, y.nazwa].sort().join('|')
      if (widziane.has(klucz)) continue
      widziane.add(klucz)

      pary.push({ x, y, s, powod: zawiera ? 'zawieranie' : `podobne w ${(s * 100).toFixed(0)}%` })
    }
  }

  pary.sort((a, b) => b.s - a.s)
  const miedzy = pary.filter(p => p.x.rodzaj !== p.y.rodzaj)
  const wewnatrz = pary.filter(p => p.x.rodzaj === p.y.rodzaj)

  console.log(`Dań: ${dania.length} | próg podobieństwa: ${PROG} | podejrzanych par: ${pary.length}`)
  wypisz('◄ MIĘDZY KATEGORIAMI — tu duble najłatwiej przeoczyć', miedzy)
  wypisz('W TEJ SAMEJ KATEGORII', wewnatrz)

  console.log('Uwaga: porównywane są nazwy, nie składniki. Dwa dania o różnych')
  console.log('nazwach i tym samym przepisie tu nie wyjdą.')
}

main()
