import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KUCHNIA_LABEL, POZIOM_LABEL } from '../etykiety'

// Plik z przypisaniami kraju i poziomu dla wszystkich dań powstał ręcznie
// (tryb `kuchnie` wyczerpał kredyty API), więc nie przeszedł przez schemat
// z `wspolne.js`, który normalnie pilnuje zamkniętej listy wartości.
//
// Literówka w kraju albo poziomie nie wysypałaby niczego — danie po prostu
// zniknęłoby z filtrów i nikt by tego nie zauważył. Stąd ten test.
// Ścieżka liczona od tego pliku. `new URL(..., import.meta.url)` nie
// przejdzie — pod jsdom import.meta.url nie jest adresem pliku.
const KATALOG_TESTU = dirname(fileURLToPath(new URL(import.meta.url)))
const SQL = readFileSync(
  resolve(KATALOG_TESTU, '../../supabase/fixes/20260924-kuchnie-i-poziomy.sql'),
  'utf-8',
)

// ('Nazwa dania', 'kuchnia', 'poziom'),
const WIERSZ = /^\s*\('(.+)',\s*'([a-z]+)',\s*'([a-z]+)'\),?$/

function wiersze() {
  return SQL.split('\n')
    .map(l => l.match(WIERSZ))
    .filter(Boolean)
    .map(m => ({ danie: m[1].replace(/''/g, "'"), kuchnia: m[2], poziom: m[3] }))
}

describe('20260924-kuchnie-i-poziomy.sql', () => {
  it('przypisuje kraj i poziom wszystkim 630 daniom z bazy', () => {
    expect(wiersze()).toHaveLength(630)
  })

  it('każdy kraj jest z zamkniętej listy (inaczej danie wypada z filtrów)', () => {
    const dozwolone = new Set(Object.keys(KUCHNIA_LABEL))
    const zle = wiersze().filter(w => !dozwolone.has(w.kuchnia))
    expect(zle.map(w => `${w.danie} → ${w.kuchnia}`)).toEqual([])
  })

  it('każdy poziom to latwe/srednie/trudne', () => {
    const dozwolone = new Set(Object.keys(POZIOM_LABEL))
    const zle = wiersze().filter(w => !dozwolone.has(w.poziom))
    expect(zle.map(w => `${w.danie} → ${w.poziom}`)).toEqual([])
  })

  // Duplikat nazwy znaczy, że przy sklejaniu listy z przypisaniami coś się
  // rozjechało — a wtedy część dań dostałaby cudzy kraj.
  it('żadna nazwa nie powtarza się dwa razy', () => {
    const nazwy = wiersze().map(w => w.danie)
    const duble = nazwy.filter((n, i) => nazwy.indexOf(n) !== i)
    expect(duble).toEqual([])
  })

  it('nie nadpisuje tego, co już jest w bazie', () => {
    expect(SQL).toMatch(/coalesce\(d\.kuchnia,\s*p\.kuchnia\)/)
    expect(SQL).toMatch(/coalesce\(d\.poziom,\s*p\.poziom\)/)
  })

  // Co najmniej jedno danie ma spację na końcu nazwy („Jajka z papryką ").
  it('dopasowuje nazwy z przycięciem białych znaków', () => {
    expect(SQL).toMatch(/btrim\(d\."Danie"\)\s*=\s*p\.danie/)
  })
})
