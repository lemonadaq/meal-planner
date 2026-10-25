import process from 'node:process'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Potok trybu `auto` od propozycji do wiersza w bazie — z zamockowanym
// Claude'em, Supabase i Replicate. Po kluczach nie da się tego odpalić
// w CI, a to jedyne miejsce, gdzie widać, CO FAKTYCZNIE LĄDUJE W `dania`:
// czy „garstka natki pietruszki" doszła jako „natka pietruszki" i czy 150 g
// cebuli zamieniło się na sztukę.

// ── Supabase: tabela `dania` w pamięci ────────────────────────────
const stan = { dania: [], meta: [], nastepneId: 1, wgrane: [] }

function zapytanieSelect(tabela) {
  const wiersze = () => (tabela === 'dania' ? stan.dania : stan.meta)
  const odpowiedz = { data: wiersze(), error: null }
  return {
    eq: (kol, val) => Promise.resolve({ data: wiersze().filter(w => w[kol] === val), error: null }),
    range: () => Promise.resolve(odpowiedz),
    then: (res, rej) => Promise.resolve(odpowiedz).then(res, rej),
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: tabela => ({
      select: () => zapytanieSelect(tabela),
      insert: nowe => ({
        select: () => {
          const zId = nowe.map(w => ({ ...w, id: stan.nastepneId++ }))
          stan.dania.push(...zId)
          return Promise.resolve({ data: zId.map(w => ({ id: w.id })), error: null })
        },
      }),
      update: pola => ({
        in: (kol, wartosci) => {
          for (const w of stan.dania) if (wartosci.includes(w[kol])) Object.assign(w, pola)
          return Promise.resolve({ error: null })
        },
      }),
    }),
    storage: {
      from: () => ({
        upload: (sciezka, buf) => {
          stan.wgrane.push({ sciezka, bajty: buf.length })
          return Promise.resolve({ error: null })
        },
        getPublicUrl: sciezka => ({ data: { publicUrl: `https://storage.test/${sciezka}` } }),
      }),
    },
  }),
}))

// ── Claude: odpowiada zgodnie ze schematem, o który go poproszono ──
const zapytania = []

function odpowiedzNaSchemat(params) {
  const pola = params.output_config.format.schema.properties
  const tresc = params.messages[0].content

  if (pola.dania) {
    // Nazwy z puli, nie „Danie 1/2/3" — podobne nazwy odsiewa miara dubli
    // i test mierzyłby wtedy coś innego, niż ma mierzyć.
    const PULA = [
      'Tarta z porami', 'Sernik baskijski', 'Risotto z borowikami', 'Zrazy wołowe',
      'Placki ziemniaczane', 'Krem z dyni', 'Pieczony dorsz', 'Ciasto marchewkowe',
    ]
    const rozbicie = [...tresc.matchAll(/^- (\w+): (\d+)$/gm)]
    const kuchnia = tresc.match(/dań kuchni ([A-ZĄĆĘŁŃÓŚŹŻ]+)/)?.[1]?.toLowerCase() || 'polska'
    const dania = []
    for (const [, rodzaj, ile] of rozbicie) {
      for (let i = 0; i < Number(ile); i++) {
        dania.push({ nazwa: PULA[dania.length % PULA.length], rodzaj, kuchnia })
      }
    }
    return { dania }
  }

  if (pola.skladniki) {
    return {
      czas_minuty: 30, kcal: 500, kuchnia: 'polska', poziom: 'latwe',
      skladniki: [
        // Dokładnie to, co model lubi przysłać mimo zasad w promptcie.
        { nazwa: 'garstka natki pietruszki', ilosc: 'garstka', jednostka: 'g', kategoria: '1_Warzywa i owoce' },
        { nazwa: 'cebula', ilosc: '150', jednostka: 'g', kategoria: '1_Warzywa i owoce' },
        { nazwa: 'ryż (najlepiej z wczoraj)', ilosc: '100', jednostka: 'g', kategoria: '5_Produkty sypkie' },
      ],
      kroki: ['Zagotuj.', 'Odcedź.'],
      opis_wizualny: 'A plate of rice with onion.',
    }
  }

  return { opis_wizualny: 'A plate of food.' }
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    constructor() {
      this.messages = {
        create: async params => {
          zapytania.push(params)
          return {
            stop_reason: 'end_turn',
            content: [{ type: 'text', text: JSON.stringify(odpowiedzNaSchemat(params)) }],
          }
        },
      }
    }
  },
}))

// ── Replicate + pobranie obrazu ──────────────────────────────────
globalThis.fetch = vi.fn(async url => {
  if (String(url).includes('/v1/models/')) {
    return { ok: true, json: async () => ({ id: 'pred1', urls: { get: 'https://api.replicate.com/v1/predictions/pred1' } }) }
  }
  if (String(url).includes('/v1/predictions/')) {
    return { ok: true, json: async () => ({ status: 'succeeded', output: 'https://replicate.test/obraz.jpg' }) }
  }
  return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
})

process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test'
process.env.ANTHROPIC_KEY = 'test'
process.env.REPLICATE_KEY = 'test'

const { proponujDania, pobierzSlownikSkladnikow, pobierzNazwyDan } = await import('../../skrypty/wspolne.js')
const { przetworzDania } = await import('../../skrypty/potok.js')
const { odfiltrujPropozycje } = await import('../../skrypty/propozycje.js')

beforeEach(() => {
  stan.dania = []
  stan.meta = []
  stan.nastepneId = 1
  stan.wgrane = []
  zapytania.length = 0
})

describe('proponujDania', () => {
  it('prosi o tyle dań, ile jest w rozbiciu, i zwraca je z rodzajem', async () => {
    const dania = await proponujDania({ kuchnia: 'polska', rodzaje: { obiad: 2, deser: 1 } })
    expect(dania).toHaveLength(3)
    expect(dania.filter(d => d.rodzaj === 'obiad')).toHaveLength(2)
  })

  it('schemat pozwala tylko na rodzaje z rozbicia', async () => {
    await proponujDania({ kuchnia: 'polska', rodzaje: { obiad: 1 } })
    const schemat = zapytania[0].output_config.format.schema
    expect(schemat.properties.dania.items.properties.rodzaj.enum).toEqual(['obiad'])
  })

  it('listę dań z bazy wysyła jako blok systemowy z cache\'em', async () => {
    await proponujDania({ kuchnia: 'polska', rodzaje: { obiad: 1 }, blokSystemowy: 'JUŻ W BAZIE\nBigos' })
    expect(zapytania[0].system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(zapytania[0].system[0].text).toContain('Bigos')
  })

  it('pustego rozbicia nie pyta w ogóle', async () => {
    expect(await proponujDania({ kuchnia: 'polska', rodzaje: { obiad: 0 } })).toEqual([])
    expect(zapytania).toHaveLength(0)
  })
})

describe('przetworzDania', () => {
  it('zapisuje danie, składniki i zdjęcie', async () => {
    const stat = await przetworzDania([{ nazwa: 'Danie testowe', rodzaj: 'obiad' }])

    expect(stat).toMatchObject({ nowe: 1, bledy: 0 })
    expect(stan.dania).toHaveLength(3)
    const wiersz = stan.dania[0]
    expect(wiersz['Danie']).toBe('Danie testowe')
    expect(wiersz['Przepis']).toBe('1. Zagotuj.\n2. Odcedź.')
    expect(wiersz.kcal).toBe(500)
    expect(stan.wgrane).toHaveLength(1)
    expect(stan.dania.every(w => w.zdjecie?.startsWith('https://storage.test/'))).toBe(true)
  }, 20000)

  it('sprząta składniki — bez słownika, samym czyszczeniem', async () => {
    await przetworzDania([{ nazwa: 'Danie testowe', rodzaj: 'obiad' }])
    const skladniki = stan.dania.map(w => w['Składnik'])
    // Nawias i słowo-ilość lecą zawsze; do mianownika („natka") doprowadza
    // dopiero słownik — patrz test niżej.
    expect(skladniki).toContain('ryż')
    expect(skladniki).toContain('natki pietruszki')
    expect(skladniki).not.toContain('garstka natki pietruszki')
    expect(skladniki).not.toContain('ryż (najlepiej z wczoraj)')
  }, 20000)

  it('ze słownikiem wchodzi pisownia, która w bazie już jest', async () => {
    stan.dania = Array(4).fill(null).map((_, i) => ({
      id: 800 + i, 'Danie': 'Stare danie', 'Składnik': 'natka pietruszki',
      'Jednostka': 'g', zdjecie: 'x',
    }))
    const { slownik } = await pobierzSlownikSkladnikow()
    await przetworzDania([{ nazwa: 'Danie testowe', rodzaj: 'obiad' }], { slownik })

    const nowe = stan.dania.filter(w => w['Danie'] === 'Danie testowe')
    expect(nowe.map(w => w['Składnik'])).toContain('natka pietruszki')
  }, 20000)

  it('ze słownikiem przelicza jednostkę na tę, która jest już w bazie', async () => {
    // Baza zna cebulę w sztukach, a skladniki_meta zna wagę sztuki.
    stan.dania = Array(4).fill(null).map((_, i) => ({
      id: 900 + i, 'Danie': 'Stare danie', 'Składnik': 'cebula', 'Jednostka': 'szt', zdjecie: 'x',
    }))
    stan.meta = [{
      nazwa: 'cebula', nazwa_norm: 'cebula',
      jednostka_bazowa: 'g', rozmiar_opakowania: 150, jednostka_opakowania: 'szt',
    }]
    const { slownik, tekst } = await pobierzSlownikSkladnikow()
    expect(tekst).toContain('cebula — szt')

    await przetworzDania([{ nazwa: 'Danie testowe', rodzaj: 'obiad' }], { slownik, blokSystemowy: tekst })

    const cebula = stan.dania.find(w => w['Danie'] === 'Danie testowe' && w['Składnik'] === 'cebula')
    expect(cebula['Jednostka']).toBe('szt')
    expect(cebula['Ilość na 1 porcję']).toBe('1')
  }, 20000)

  it('danie kompletne pomija bez pytania Claude\'a', async () => {
    stan.dania = [{ id: 1, 'Danie': 'Bigos', 'Składnik': 'kapusta', zdjecie: 'https://x/y.jpg' }]
    const stat = await przetworzDania([{ nazwa: 'Bigos', rodzaj: 'obiad' }])
    expect(stat).toMatchObject({ pominiete: 1, nowe: 0 })
    expect(zapytania).toHaveLength(0)
  })

  it('BEZ_ZDJEC: zapisuje przepis i nie rusza Replicate', async () => {
    const stat = await przetworzDania([{ nazwa: 'Danie testowe', rodzaj: 'obiad' }], { bezZdjec: true })
    expect(stat).toMatchObject({ nowe: 1 })
    expect(stan.wgrane).toHaveLength(0)
  })

  it('daniu z przepisem bez zdjęcia dorabia samo zdjęcie', async () => {
    stan.dania = [{
      id: 1, 'Danie': 'Bigos', rodzaj: 'obiad', 'Składnik': 'kapusta kiszona',
      'Ilość na 1 porcję': '200', 'Jednostka': 'g', 'Przepis': '1. Duś.', zdjecie: null,
    }]
    const stat = await przetworzDania([{ nazwa: 'Bigos', rodzaj: 'obiad' }])
    expect(stat).toMatchObject({ tylkoZdjecie: 1, nowe: 0 })
    expect(stan.dania[0].zdjecie).toContain('storage.test')
  }, 20000)
})

describe('propozycje kontra baza', () => {
  it('nazwy z bazy odsiewają propozycje, które już tam są', async () => {
    stan.dania = [{ id: 1, 'Danie': 'Tarta z porami', rodzaj: 'obiad', 'Składnik': 'x' }]
    const wBazie = await pobierzNazwyDan()
    expect(wBazie).toEqual([{ nazwa: 'Tarta z porami', rodzaj: 'obiad' }])

    const surowe = await proponujDania({ kuchnia: 'polska', rodzaje: { obiad: 2 } })
    const { przyjete, odrzucone } = odfiltrujPropozycje(surowe, wBazie.map(d => d.nazwa))
    expect(przyjete.map(d => d.nazwa)).toEqual(['Sernik baskijski'])
    expect(odrzucone).toEqual([{ nazwa: 'Tarta z porami', powod: 'w bazie jest „Tarta z porami"' }])
  })
})
