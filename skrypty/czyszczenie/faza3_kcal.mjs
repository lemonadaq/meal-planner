// Faza 3b — kcal na porcję dla wszystkich dań → raport_kcal.csv.
// Tylko czyta dane z dysku (dane/dania.json + zatwierdzone CSV). Liczy tym samym
// helperem, którego używa formularz w apce (src/kcalZeSkladnikow.js).
//
//   node skrypty/czyszczenie/faza3_kcal.mjs

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { kcalZeSkladnikow, gramySkladnika, iloscDoKcal } from '../../src/kcalZeSkladnikow.js'
import { dopasujMeta } from '../../src/jednostki.js'
import { TU, czytajJson, wczytajMapowania, przeksztalcDania } from './przeksztalc.mjs'

const dania = czytajJson('dane/dania.json')
const zatw = wczytajMapowania()
const { wynik, bledy } = przeksztalcDania(dania, zatw)
if (bledy.length) { console.error(bledy.join('\n')); process.exit(1) }

const stareKcal = new Map()
const porcje = new Map()
for (const r of dania) {
  const nowa = zatw.dania.get(r.Danie)?.danie_nowe
  if (nowa && !stareKcal.has(nowa)) { stareKcal.set(nowa, r.kcal); porcje.set(nowa, r.porcje_bazowe) }
}

const esc = v => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const raport = []
for (const [danie, wiersze] of [...wynik].sort((a, b) => a[0].localeCompare(b[0], 'pl'))) {
  const sk = wiersze.map(w => ({ nazwa: w['Składnik'], ilosc: w['Ilość na 1 porcję'], jednostka: w.Jednostka }))
  const w = kcalZeSkladnikow(sk, zatw.meta)
  const top = [...w.pozycje].sort((a, b) => b.kcal - a.kcal).slice(0, 3)
    .map(p => `${p.nazwa} (${Math.round(p.kcal)})`).join('; ')

  // Waga porcji — do wykrywania przepisów zapisanych „na całość", nie na porcję.
  let gramy = 0
  for (const s of sk) {
    const il = iloscDoKcal(s.ilosc)
    if (il == null || /^(woda|sól)/.test(s.nazwa)) continue
    const g = gramySkladnika(s.nazwa, il, s.jednostka, dopasujMeta(s.nazwa, zatw.meta))
    if (g) gramy += g
  }

  const uwagi = []
  const puste = sk.filter(s => s.ilosc == null || String(s.ilosc).trim() === '').map(s => s.nazwa)
  if (puste.length) uwagi.push(`pusta ilość (liczone jako 0): ${puste.join(', ')}`)
  if (w.braki.length) uwagi.push(`bez kcal: ${w.braki.join(', ')}`)
  if (w.kcal != null && w.kcal < 80) uwagi.push('PONIŻEJ 80 kcal')
  if (w.kcal != null && w.kcal > 1500) uwagi.push('POWYŻEJ 1500 kcal')
  if (gramy > 900) uwagi.push(`porcja waży ~${Math.round(gramy)} g — ilości chyba na całość (porcje_bazowe=${porcje.get(danie)})`)
  const stare = stareKcal.get(danie)
  // Ilości zapisane na CAŁY przepis, nie na porcję: wynik ≥ 2,5× tego, co jest
  // dziś w bazie (tamte kcal ktoś szacował już na porcję). Proponowany zapis =
  // wynik / porcje_bazowe — decyzja przy STOP 1.
  const pb = porcje.get(danie) || 1
  let doZapisu = w.kcal
  if (stare && w.kcal && w.kcal / stare >= 2.5 && pb > 1) {
    doZapisu = Math.round(w.kcal / pb / 10) * 10
    uwagi.push(`NA CAŁOŚĆ? ${w.kcal} / ${pb} porcje = ${doZapisu} (dziś ${stare})`)
  } else if (stare && w.kcal && (w.kcal / stare > 2 || stare / w.kcal > 2)) {
    uwagi.push(`duża różnica vs dziś (${stare})`)
  }

  raport.push({ danie, kcal: doZapisu, kcal_z_przepisu: w.kcal, kcal_dzis: stare ?? '', waga_porcji_g: Math.round(gramy), top3: top, uwagi: uwagi.join(' | ') })
}

const kol = ['danie', 'kcal', 'kcal_z_przepisu', 'kcal_dzis', 'waga_porcji_g', 'top3', 'uwagi']
writeFileSync(join(TU, 'raport_kcal.csv'),
  [kol.join(','), ...raport.map(r => kol.map(k => esc(r[k])).join(','))].join('\n') + '\n')

const z = (f) => raport.filter(f).length
console.log(`dań: ${raport.length}, bez kcal: ${z(r => r.kcal == null)}`)
console.log(`< 80 kcal: ${z(r => r.kcal != null && r.kcal < 80)}, > 1500 kcal: ${z(r => r.kcal > 1500)}`)
console.log(`podejrzane „na całość" (podzielone przez porcje): ${z(r => r.uwagi.includes('NA CAŁOŚĆ'))}`)
console.log(`porcja > 900 g: ${z(r => r.waga_porcji_g > 900)}, z brakami: ${z(r => r.uwagi.includes('bez kcal'))}`)
const k = raport.map(r => r.kcal).filter(Boolean).sort((a, b) => a - b)
console.log(`mediana: ${k[k.length >> 1]} kcal, p10: ${k[Math.floor(k.length * 0.1)]}, p90: ${k[Math.floor(k.length * 0.9)]}`)
