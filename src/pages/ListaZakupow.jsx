import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { formatDataLocal } from '../dataHelpers'

const KATEGORIE = [
  { id: '1_Warzywa i owoce',   label: 'Warzywa i owoce' },
  { id: '2_Mięso i ryby',      label: 'Mięso i ryby' },
  { id: '3_Nabiał',            label: 'Nabiał' },
  { id: '4_Pieczywo',          label: 'Pieczywo' },
  { id: '5_Produkty sypkie',   label: 'Produkty sypkie' },
  { id: '6_Konserwy i słoiki', label: 'Konserwy i słoiki' },
  { id: '7_Przyprawy',         label: 'Przyprawy' },
  { id: '8_Inne',              label: 'Inne (papier, chemia, itp.)' },
]

const JEDNOSTKI = ['', 'szt.', 'opak.', 'g', 'kg', 'ml', 'l', 'pęczek']

const DOMYSLNE_PRODUKTY_W_DOMU = [
  'Sól', 'Pieprz', 'Pieprz czarny', 'Olej', 'Oliwa',
  'Cukier', 'Mąka', 'Papryka słodka', 'Oregano', 'Bazylia',
]

function normalizujProduktDomowy(nazwa = '') {
  return nazwa
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[;,.:\s]+$/g, '')
    .trim()
}

function ladnaNazwaProduktuDomowego(nazwa = '') {
  const czyste = poprawNazwe(nazwa)
  if (!czyste) return ''
  return czyste.charAt(0).toUpperCase() + czyste.slice(1)
}

function produktyWDomuStorageKey(householdId, userId) {
  return `produkty_w_domu_${householdId || userId || 'local'}`
}

function unikalneProduktyWDomu(lista = []) {
  const mapa = new Map()
  lista.forEach(nazwa => {
    const ladna = ladnaNazwaProduktuDomowego(nazwa)
    const norm = normalizujProduktDomowy(ladna)
    if (norm && !mapa.has(norm)) mapa.set(norm, ladna)
  })
  return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pl'))
}


function korektyZakupowStorageKey(householdId, userId) {
  return `korekty_zakupow_${householdId || userId || 'local'}_${aktualnyTydzienZakupow()}`
}

function wczytajKorektyZakupow(householdId, userId) {
  if (typeof localStorage === 'undefined') return {}
  const raw = localStorage.getItem(korektyZakupowStorageKey(householdId, userId))
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function kluczZakupu(skladnik, jednostka = '') {
  return `${poprawNazwe(skladnik)}||${jednostka || ''}`
}

function tekstIlosciZItemu(item) {
  if (!item) return ''
  if (item.iloscOryginalna != null && item.iloscOryginalna !== '') return item.iloscOryginalna.toString()
  if (item.ilosc != null) return `${item.ilosc}${item.jednostka ? ` ${item.jednostka}` : ''}`.trim()
  if (item.jednostka) return item.jednostka.toString()
  return ''
}

function zastosujKorekteZakupu(item, korekta) {
  if (!item) return null
  const bazaKlucz = item.bazaKlucz || item.klucz
  if (!korekta) return { ...item, bazaKlucz }
  if (korekta.usuniety) return null

  const nazwa = poprawNazwe(korekta.nazwa || item.skladnik)
  if (!nazwa) return null

  const iloscTekst = normalizujIloscTekst(korekta.ilosc)
  const kategoria = bezpiecznaKategoria(korekta.kategoria || item.kategoria)

  return {
    ...item,
    bazaKlucz,
    klucz: kluczZakupu(nazwa, ''),
    skladnik: nazwa,
    ilosc: null,
    iloscOryginalna: iloscTekst || '',
    jednostka: '',
    kategoria,
    edytowany: true,
  }
}

function wczytajProduktyWDomu(householdId, userId) {
  if (typeof localStorage === 'undefined') return DOMYSLNE_PRODUKTY_W_DOMU
  const key = produktyWDomuStorageKey(householdId, userId)
  const raw = localStorage.getItem(key)
  if (!raw) {
    const start = unikalneProduktyWDomu(DOMYSLNE_PRODUKTY_W_DOMU)
    localStorage.setItem(key, JSON.stringify(start))
    return start
  }
  try {
    const parsed = JSON.parse(raw)
    return unikalneProduktyWDomu(Array.isArray(parsed) ? parsed : DOMYSLNE_PRODUKTY_W_DOMU)
  } catch {
    return unikalneProduktyWDomu(DOMYSLNE_PRODUKTY_W_DOMU)
  }
}

function produktPasujeDoDomu(nazwa, produktyWDomuSet) {
  const n = normalizujProduktDomowy(nazwa)
  if (!n || !produktyWDomuSet?.size) return false
  if (produktyWDomuSet.has(n)) return true

  for (const baza of produktyWDomuSet) {
    if (!baza) continue
    // Dzięki temu wpis „Olej” ukryje też „Olej rzepakowy”,
    // ale nie ukryje przypadkowo środka wyrazu.
    if (n === baza || n.startsWith(`${baza} `) || n.includes(` ${baza} `)) return true
  }
  return false
}


function normalizujJednostke(raw = '') {
  const x = raw.toString().trim().toLowerCase().replace(/\.+$/, '')
  if (!x) return ''
  if (['szt', 'sztuka', 'sztuki', 'sztuk'].includes(x)) return 'szt.'
  if (['op', 'opak', 'opakowanie', 'opakowania', 'paczka', 'paczki', 'paczkę'].includes(x)) return 'opak.'
  if (['gram', 'gramy'].includes(x)) return 'g'
  if (['kilogram', 'kilogramy'].includes(x)) return 'kg'
  if (['dekagram', 'dekagramy', 'dkg'].includes(x)) return 'dag'
  if (['mililitr', 'mililitry'].includes(x)) return 'ml'
  if (['litr', 'litry'].includes(x)) return 'l'
  if (['peczek', 'pęczek', 'peczki', 'pęczki'].includes(x)) return 'pęczek'
  if (['sloik', 'słoik', 'sloiki', 'słoiki'].includes(x)) return 'słoik'
  if (['butelka', 'butelki'].includes(x)) return 'but.'
  return raw.toString().trim()
}

function rozpoznajKategorie(nazwa = '') {
  const x = nazwa.toLowerCase()
  if (/chleb|buł|bul|bagiet|kajzer|pieczyw|tost|tortill/.test(x)) return '4_Pieczywo'
  if (/mleko|jogurt|kefir|maślank|maslank|ser|twar[oó]g|śmietan|smietan|masło|maslo|margaryn|jaj/.test(x)) return '3_Nabiał'
  if (/pomidor|og[oó]rek|ziemni|marchew|cebula|czosnek|papryk|sałat|salat|jabł|jabl|banan|cytryn|limonk|awokado|broku|kalafior|kapust|cukini|bakła|bakla|pietruszk|koper|szczyp/.test(x)) return '1_Warzywa i owoce'
  if (/kurczak|wołow|wolow|wieprz|schab|kark[oó]w|mi[eę]so|mielon|szynk|boczek|kiełbas|kielbas|ryb|łosoś|losos|dorsz|tuńczyk|tunczyk/.test(x)) return '2_Mięso i ryby'
  if (/makaron|ryż|ryz|kasz|mąk|maka|cukier|płatki|platki|owsian|soczewic|ciecierzyc|fasol|groch/.test(x)) return '5_Produkty sypkie'
  if (/konserw|puszk|słoik|sloik|passat|przecier|kukurydz|groszek|oliwk|musztard|majonez|ketchup|chrzan/.test(x)) return '6_Konserwy i słoiki'
  if (/s[oó]l|pieprz|papryka słodka|papryka ostra|oregano|bazyl|curry|przypraw|zioł|ziol|cynamon/.test(x)) return '7_Przyprawy'
  return '8_Inne'
}

function poprawNazwe(nazwa = '') {
  return nazwa
    .replace(/^[-•*]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[;,.\s]+$/, '')
    .trim()
}

function toIlosc(raw) {
  const n = parseFloat((raw || '').toString().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function bezpiecznaKategoria(kategoria) {
  return KATEGORIE.some(k => k.id === kategoria) ? kategoria : '8_Inne'
}

function brakKolumnyJednostka(error) {
  return error?.code === 'PGRST204' && /jednostka/i.test(error?.message || '')
}

function bezJednostkiKolumny(rekord) {
  const { jednostka, ...reszta } = rekord || {}
  return reszta
}

function aktualnyTydzienZakupow() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return formatDataLocal(d)
}

function tekstIlosciSzybkiej(dane) {
  if (!dane || dane.ilosc == null || !Number.isFinite(dane.ilosc)) return null
  const liczba = Number.isInteger(dane.ilosc) ? String(dane.ilosc) : String(dane.ilosc).replace('.', ',')
  const jednostka = dane.jednostka ? normalizujJednostke(dane.jednostka) : ''
  return `${liczba}${jednostka ? ` ${jednostka}` : ''}`.trim() || null
}

function normalizujIloscTekst(raw) {
  const tekst = raw == null ? '' : raw.toString().replace(/\s+/g, ' ').trim()
  return tekst || null
}

function rozbijSzybkieLinie(tekst = '') {
  // Obsługuje zarówno Enter, średnik, jak i szybkie wpisy po przecinku:
  // „Woda, Musztarda sarepska 1szt., Margaryna”.
  // Nie rozbija liczb dziesiętnych typu „1,5 kg”.
  return tekst
    .split(/\r?\n|;/)
    .flatMap(linia => linia.split(/,\s+(?=[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż])/u))
    .map(x => x.trim())
    .filter(Boolean)
}

function parsujSzybkiProdukt(linia) {
  // Ten parser celowo jest tolerancyjny. Każda niepusta linijka ma zostać dodana,
  // nawet jeśli użytkownik wpisze tylko „Margaryna” albo coś w stylu „Musztarda sarepska 1szt.”.
  const tekst = poprawNazwe(linia)
  if (!tekst) return null

  const liczba = '(\\d+(?:[,.]\\d+)?)'
  const jednostka = '([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+\\.?)?'

  // Format na końcu: „Musztarda sarepska 1szt.”, „Chleb 1 szt.”, „Chleb 1”
  let m = tekst.match(new RegExp(`^(.+?)\\s+${liczba}\\s*${jednostka}\\.?$`, 'i'))
  if (m) {
    const nazwa = poprawNazwe(m[1])
    const ilosc = toIlosc(m[2])
    const jedn = normalizujJednostke(m[3] || '')
    if (nazwa) return { nazwa, ilosc, jednostka: jedn || null, kategoria: bezpiecznaKategoria(rozpoznajKategorie(nazwa)) }
  }

  // Format na początku: „1szt. Chleb”, „1 szt. Chleb”, „2 l Mleko”
  m = tekst.match(new RegExp(`^${liczba}\\s*${jednostka}\\s+(.+)$`, 'i'))
  if (m) {
    const nazwa = poprawNazwe(m[3])
    const ilosc = toIlosc(m[1])
    const jedn = normalizujJednostke(m[2] || '')
    if (nazwa) return { nazwa, ilosc, jednostka: jedn || null, kategoria: bezpiecznaKategoria(rozpoznajKategorie(nazwa)) }
  }

  // Fallback: nie rozpoznałem ilości/jednostki, ale i tak dodaję produkt.
  return {
    nazwa: tekst,
    ilosc: null,
    jednostka: null,
    kategoria: bezpiecznaKategoria(rozpoznajKategorie(tekst)),
  }
}

export default function ListaZakupow({ user, householdId, onBack, domyslnePorcje = 1, sledz }) {
  const [lista, setLista] = useState([])
  const [wlasne, setWlasne] = useState([]) // z tabeli zakupy_wlasne
  const [odznaczone, setOdznaczone] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [historiaIds, setHistoriaIds] = useState({})

  const [pokazDodaj, setPokazDodaj] = useState(false)
  const [edycjaWlasnego, setEdycjaWlasnego] = useState(null)
  const [trybSklepu, setTrybSklepu] = useState(false)
  const [szybkiTekst, setSzybkiTekst] = useState('')
  const [pokazMamWDomu, setPokazMamWDomu] = useState(false)
  const [produktyWDomu, setProduktyWDomu] = useState([])
  const [korektyZakupow, setKorektyZakupow] = useState({})

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  // Stan odznaczonych jest teraz w bazie (zakupy_historia, wspólne dla rodziny),
  // a nie w localStorage — funkcja zostaje jako no-op, żeby nie zmieniać call-site'ów.
  const storageKey = `lista_zakupow_${user.id}` // legacy, niezużywane

  function pokazToast(msg, onUndo) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, onUndo })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    setProduktyWDomu(wczytajProduktyWDomu(householdId, user?.id))
    setKorektyZakupow(wczytajKorektyZakupow(householdId, user?.id))
  }, [householdId, user?.id])

  const produktyWDomuSet = useMemo(
    () => new Set(produktyWDomu.map(normalizujProduktDomowy).filter(Boolean)),
    [produktyWDomu]
  )

  function zapiszProduktyWDomu(noweProdukty) {
    const czyste = unikalneProduktyWDomu(noweProdukty)
    setProduktyWDomu(czyste)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(produktyWDomuStorageKey(householdId, user?.id), JSON.stringify(czyste))
    }
  }


  function zapiszKorektyZakupow(noweKorekty) {
    const czyste = Object.fromEntries(
      Object.entries(noweKorekty || {}).filter(([_, v]) => v && typeof v === 'object')
    )
    setKorektyZakupow(czyste)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(korektyZakupowStorageKey(householdId, user?.id), JSON.stringify(czyste))
    }
  }

  function dodajDoMamWDomu(nazwa) {
    const ladna = ladnaNazwaProduktuDomowego(nazwa)
    if (!ladna) return
    const poprzednie = produktyWDomu
    const nowe = unikalneProduktyWDomu([...produktyWDomu, ladna])
    zapiszProduktyWDomu(nowe)
    pokazToast(`Mam w domu: ${ladna}`, () => {
      zapiszProduktyWDomu(poprzednie)
      setToast(null)
    })
  }

  // ── Generowanie listy z planu + ładowanie własnych ──
  const generuj = useCallback(async () => {
    setLoading(true)

    const d = new Date()
    const day = d.getDay() || 7
    d.setDate(d.getDate() - day + 1)
    d.setHours(0, 0, 0, 0)
    const poniedzialek = formatDataLocal(d)
    const niedziela = new Date(d)
    niedziela.setDate(niedziela.getDate() + 6)
    const niedzielaStr = formatDataLocal(niedziela)

    const [{ data: planData }, { data: wlasneData }, { data: historiaData }] = await Promise.all([
      supabase.from('kalendarz').select('*')
        .eq('household_id', householdId)
        .gte('data', poniedzialek)
        .lte('data', niedzielaStr),
      supabase.from('zakupy_wlasne').select('*')
        .eq('household_id', householdId)
        .eq('tydzien', poniedzialek)
        .order('created_at'),
      supabase.from('zakupy_historia').select('*')
        .eq('household_id', householdId),
    ])

    setWlasne(wlasneData || [])

    // Zbieram porcje
    const porcjeWszystkich = {}
    const globalnePodmiany = {}

    ;(planData || []).forEach(p => {
      const porcje = p.porcje != null ? +p.porcje : +domyslnePorcje
      if (p.danie) porcjeWszystkich[p.danie] = (porcjeWszystkich[p.danie] || 0) + porcje
      const dodatkiTab = Array.isArray(p.dodatki) ? p.dodatki : []
      dodatkiTab.forEach(slot => {
        if (slot?.nazwa) porcjeWszystkich[slot.nazwa] = (porcjeWszystkich[slot.nazwa] || 0) + porcje
      })
      const pod = p.podmiany || {}
      Object.entries(pod).forEach(([k, v]) => { if (v) globalnePodmiany[k] = v })
    })

    const skladnikiMap = {}
    function dodaj(skladnik, ilosc, jednostka, kategoria, mnoznik) {
      if (!skladnik) return
      const finalny = globalnePodmiany[skladnik] || skladnik
      const iloscNum = parseFloat(ilosc?.toString().replace(',', '.'))
      const klucz = `${finalny}||${jednostka || ''}`

      if (!iloscNum || isNaN(iloscNum)) {
        if (!skladnikiMap[klucz]) {
          skladnikiMap[klucz] = {
            skladnik: finalny, ilosc: null,
            iloscOryginalna: ilosc, jednostka,
            kategoria: kategoria || '8_Inne', klucz,
            podmieniono: !!globalnePodmiany[skladnik],
            zrodlo: 'plan',
          }
        }
        return
      }
      const realnaIlosc = iloscNum * (mnoznik || 1)
      if (skladnikiMap[klucz]) {
        if (skladnikiMap[klucz].ilosc != null) skladnikiMap[klucz].ilosc += realnaIlosc
        else skladnikiMap[klucz].ilosc = realnaIlosc
      } else {
        skladnikiMap[klucz] = {
          skladnik: finalny, ilosc: realnaIlosc, jednostka,
          kategoria: kategoria || '8_Inne', klucz,
          podmieniono: !!globalnePodmiany[skladnik],
          zrodlo: 'plan',
        }
      }
    }

    const wszystkieNazwy = Object.keys(porcjeWszystkich)
    if (wszystkieNazwy.length > 0) {
      const { data: daniaData } = await supabase.from('dania').select('*').in('"Danie"', wszystkieNazwy)
      ;(daniaData || []).forEach(r => {
        const mnoznik = porcjeWszystkich[r['Danie']] || 1
        dodaj(r['Składnik'], r['Ilość na 1 porcję'], r['Jednostka'], r['Kategoria'], mnoznik)
      })
    }

    Object.values(skladnikiMap).forEach(item => {
      if (item.ilosc != null) item.ilosc = Math.round(item.ilosc * 100) / 100
    })

    const posortowane = Object.values(skladnikiMap).sort((a, b) =>
      a.kategoria.localeCompare(b.kategoria) || a.skladnik.localeCompare(b.skladnik)
    )

    // Odtwórz stan odznaczonych z bazy (zakupy_historia jest wspólne dla rodziny).
    // Bierzemy pod uwagę także lokalnie edytowane pozycje z planu.
    const aktualneKlucze = new Set()
    posortowane.forEach(i => {
      aktualneKlucze.add(i.klucz)
      const poKorekcie = zastosujKorekteZakupu(i, korektyZakupow[i.klucz])
      if (poKorekcie?.klucz) aktualneKlucze.add(poKorekcie.klucz)
    })
    const odtworzone = new Set()
    const mapaHistoriaId = {}
    ;(historiaData || []).forEach(h => {
      const klucz = `${h.skladnik}||${h.jednostka || ''}`
      if (aktualneKlucze.has(klucz)) {
        odtworzone.add(klucz)
        mapaHistoriaId[klucz] = h.id
      }
    })

    setLista(posortowane)
    setOdznaczone(odtworzone)
    setHistoriaIds(mapaHistoriaId)
    setLoading(false)
  }, [householdId, domyslnePorcje, korektyZakupow])

  useEffect(() => { generuj() }, [generuj])

  // Realtime: gdy partner odhaczy/doda coś, aktualizuj lokalnie bez pełnego reloadu.
  // - zakupy_historia: ktoś odhaczył składnik → dodaj klucz do odznaczonych
  // - zakupy_wlasne:    ktoś dodał/zmienił/usunął własny produkt → odśwież listę wlasne
  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`zakupy:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zakupy_historia', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (!row) return
          const klucz = `${row.skladnik}||${row.jednostka || ''}`
          if (payload.eventType === 'DELETE') {
            setOdznaczone(prev => {
              if (!prev.has(klucz)) return prev
              const n = new Set(prev); n.delete(klucz); return n
            })
            setHistoriaIds(prev => {
              if (!(klucz in prev)) return prev
              const n = { ...prev }; delete n[klucz]; return n
            })
          } else {
            setOdznaczone(prev => prev.has(klucz) ? prev : new Set(prev).add(klucz))
            setHistoriaIds(prev => prev[klucz] === row.id ? prev : { ...prev, [klucz]: row.id })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'zakupy_wlasne', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (row?.tydzien && row.tydzien !== aktualnyTydzienZakupow()) return

          if (payload.eventType === 'DELETE') {
            setWlasne(prev => prev.filter(w => w.id !== payload.old?.id))
          } else if (payload.eventType === 'INSERT') {
            setWlasne(prev => prev.some(w => w.id === payload.new.id) ? prev : [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setWlasne(prev => prev.map(w => w.id === payload.new.id ? payload.new : w))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  function zapiszStanOdznaczenia(/* nowySet */) {
    // No-op — stan jest w bazie (zakupy_historia) i synchronizowany przez Realtime.
  }

  // ── Toggle zwykłego skladnika (z planu) ──
  async function toggle(item) {
    const klucz = item.klucz
    const byloOdznaczone = odznaczone.has(klucz)

    setOdznaczone(prev => {
      const n = new Set(prev)
      if (byloOdznaczone) n.delete(klucz)
      else n.add(klucz)
      zapiszStanOdznaczenia(n)
      return n
    })

    if (byloOdznaczone) {
      const histId = historiaIds[klucz]
      if (histId) {
        await supabase.from('zakupy_historia').delete().eq('id', histId)
        setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
      }
    } else {
      const { data } = await supabase.from('zakupy_historia').insert({
        household_id: householdId, user_id: user.id, skladnik: item.skladnik,
        ilosc: item.ilosc, jednostka: item.jednostka,
        kategoria: item.kategoria,
      }).select().single()
      if (data) {
        setHistoriaIds(prev => ({ ...prev, [klucz]: data.id }))
        sledz?.('kupione', { skladnik: item.skladnik })
      }
      pokazToast(`Kupione: ${item.skladnik}`, async () => {
        setOdznaczone(prev => {
          const n = new Set(prev); n.delete(klucz)
          zapiszStanOdznaczenia(n); return n
        })
        if (data?.id) {
          await supabase.from('zakupy_historia').delete().eq('id', data.id)
          setHistoriaIds(prev => { const n = { ...prev }; delete n[klucz]; return n })
        }
        setToast(null)
      })
    }
  }

  // ── Toggle własnego produktu (bezpośrednio w zakupy_wlasne) ──
  async function toggleWlasny(item) {
    const noweOdznaczone = !item.odznaczone
    const { data, error } = await supabase.from('zakupy_wlasne')
      .update({ odznaczone: noweOdznaczone })
      .eq('id', item.id).select().single()

    if (error) {
      console.error('Błąd odznaczania własnego produktu:', error, item)
      pokazToast('Nie udało się zmienić statusu produktu')
      return
    }

    if (data) {
      setWlasne(prev => prev.map(w => w.id === item.id ? data : w))
      if (noweOdznaczone) {
        pokazToast(`Kupione: ${item.nazwa}`, async () => {
          await supabase.from('zakupy_wlasne').update({ odznaczone: false }).eq('id', item.id)
          setWlasne(prev => prev.map(w => w.id === item.id ? { ...w, odznaczone: false } : w))
          setToast(null)
        })
      }
    }
  }

  // ── Dodawanie / edycja produktu ──
  // Własne produkty zapisujemy w zakupy_wlasne, a korekty pozycji z planu
  // trzymamy lokalnie jako nadpisanie listy zakupów dla bieżącego tygodnia.
  async function zapiszWlasny(dane) {
    const daneDoZapisu = {
      nazwa: poprawNazwe(dane.nazwa),
      ilosc: normalizujIloscTekst(dane.ilosc),
      kategoria: bezpiecznaKategoria(dane.kategoria),
    }

    if (!daneDoZapisu.nazwa) return

    if (edycjaWlasnego?.__zrodlo === 'plan') {
      const bazaKlucz = edycjaWlasnego.bazaKlucz || edycjaWlasnego.klucz
      if (!bazaKlucz) return

      zapiszKorektyZakupow({
        ...korektyZakupow,
        [bazaKlucz]: {
          ...(korektyZakupow[bazaKlucz] || {}),
          nazwa: daneDoZapisu.nazwa,
          ilosc: daneDoZapisu.ilosc,
          kategoria: daneDoZapisu.kategoria,
          usuniety: false,
        },
      })
      pokazToast(`Zmieniono: ${daneDoZapisu.nazwa}`)
    } else if (edycjaWlasnego) {
      const { data, error } = await supabase.from('zakupy_wlasne')
        .update(daneDoZapisu).eq('id', edycjaWlasnego.id).select().single()

      if (error) {
        console.error('Błąd edycji własnego produktu:', error, daneDoZapisu)
        pokazToast('Nie udało się zapisać produktu')
        return
      }

      if (data) setWlasne(prev => prev.map(w => w.id === data.id ? data : w))
      pokazToast(`Zmieniono: ${daneDoZapisu.nazwa}`)
    } else {
      const rekord = {
        ...daneDoZapisu,
        household_id: householdId,
        user_id: user.id,
        tydzien: aktualnyTydzienZakupow(),
        odznaczone: false,
      }

      const { data, error } = await supabase.from('zakupy_wlasne')
        .insert(rekord)
        .select().single()

      if (error) {
        console.error('Błąd dodawania własnego produktu:', error, rekord)
        pokazToast('Nie udało się dodać produktu')
        return
      }

      if (data) setWlasne(prev => [...prev, data])
      pokazToast(`Dodano: ${daneDoZapisu.nazwa}`)
    }
    setEdycjaWlasnego(null)
    setPokazDodaj(false)
  }

  function rozpocznijEdycjeItemu(item) {
    if (!item) return
    if (item.zrodlo === 'wlasne') {
      setEdycjaWlasnego({ ...item.wlasnyData, __zrodlo: 'wlasne' })
    } else {
      setEdycjaWlasnego({
        __zrodlo: 'plan',
        bazaKlucz: item.bazaKlucz || item.klucz,
        klucz: item.klucz,
        nazwa: item.skladnik,
        ilosc: tekstIlosciZItemu(item),
        kategoria: item.kategoria || '8_Inne',
      })
    }
    setPokazDodaj(true)
  }

  async function usunEdytowanyProdukt(item) {
    if (!item) return

    if (item.__zrodlo === 'plan') {
      const bazaKlucz = item.bazaKlucz || item.klucz
      if (!bazaKlucz) return
      const poprzednia = korektyZakupow[bazaKlucz]
      const kluczWidoku = kluczZakupu(item.nazwa, '')
      const histId = historiaIds[kluczWidoku] || historiaIds[item.klucz]

      zapiszKorektyZakupow({
        ...korektyZakupow,
        [bazaKlucz]: {
          ...(poprzednia || {}),
          nazwa: item.nazwa,
          ilosc: item.ilosc,
          kategoria: item.kategoria,
          usuniety: true,
        },
      })
      setOdznaczone(prev => {
        const n = new Set(prev)
        n.delete(kluczWidoku)
        if (item.klucz) n.delete(item.klucz)
        return n
      })
      if (histId) {
        await supabase.from('zakupy_historia').delete().eq('id', histId)
        setHistoriaIds(prev => {
          const n = { ...prev }
          delete n[kluczWidoku]
          if (item.klucz) delete n[item.klucz]
          return n
        })
      }
      setEdycjaWlasnego(null)
      setPokazDodaj(false)
      pokazToast(`Usunięto: ${item.nazwa}`, () => {
        const aktualne = wczytajKorektyZakupow(householdId, user?.id)
        if (poprzednia) zapiszKorektyZakupow({ ...aktualne, [bazaKlucz]: poprzednia })
        else {
          const n = { ...aktualne }
          delete n[bazaKlucz]
          zapiszKorektyZakupow(n)
        }
        setToast(null)
      })
      return
    }

    await usunWlasny(item)
  }

  async function dodajSzybkieProdukty(tekst) {
    const linie = rozbijSzybkieLinie(tekst)

    if (linie.length === 0) return

    const rekordy = linie
      .map(parsujSzybkiProdukt)
      .filter(Boolean)
      .map(dane => ({
        nazwa: poprawNazwe(dane.nazwa),
        ilosc: tekstIlosciSzybkiej(dane),
        kategoria: bezpiecznaKategoria(dane.kategoria),
        household_id: householdId,
        user_id: user.id,
        tydzien: aktualnyTydzienZakupow(),
        odznaczone: false,
      }))
      .filter(rekord => rekord.nazwa)

    if (rekordy.length === 0) return

    const { data, error } = await supabase.from('zakupy_wlasne')
      .insert(rekordy)
      .select()

    if (error) {
      console.error('Błąd szybkiego dodawania produktów — bulk insert:', error, rekordy)

      // Gdyby jedna linijka wywaliła bulk insert, spróbuj zapisać pozostałe pojedynczo.
      const dodane = []
      const bledy = []

      for (const rekord of rekordy) {
        const { data: singleData, error: singleError } = await supabase.from('zakupy_wlasne')
          .insert(rekord)
          .select()
          .single()

        if (singleData) dodane.push(singleData)
        if (singleError) bledy.push({ rekord, error: singleError })
      }

      if (bledy.length > 0) {
        console.error('Błędy szybkiego dodawania produktów — pojedyncze inserty:', bledy)
      }

      if (dodane.length === 0) {
        pokazToast('Nie udało się dodać — sprawdź konsolę Supabase')
        return
      }

      setWlasne(prev => {
        const ids = new Set(prev.map(w => w.id))
        return [...prev, ...dodane.filter(w => !ids.has(w.id))]
      })
      pokazToast(dodane.length === 1 ? `Dodano: ${dodane[0].nazwa}` : `Dodano ${dodane.length} produktów`)
      return
    }

    if (data?.length) {
      setWlasne(prev => {
        const ids = new Set(prev.map(w => w.id))
        return [...prev, ...data.filter(w => !ids.has(w.id))]
      })
      sledz?.('dodaj_szybki_produkt', { ile: data.length })
    }

    pokazToast(data?.length === 1 ? `Dodano: ${data[0].nazwa}` : `Dodano ${data?.length || rekordy.length} produktów`)
  }

  async function usunWlasny(item) {
    await supabase.from('zakupy_wlasne').delete().eq('id', item.id)
    setWlasne(prev => prev.filter(w => w.id !== item.id))
    pokazToast(`Usunięto: ${item.nazwa}`, async () => {
      // Przywróć (bez id, bo będzie nowy)
      const { id, created_at, __zrodlo, ...rest } = item
      const { data } = await supabase.from('zakupy_wlasne').insert(rest).select().single()
      if (data) setWlasne(prev => [...prev, data])
      setToast(null)
    })
    setEdycjaWlasnego(null)
  }

  async function zacznijOdNowa() {
    const snapshot = { odznaczone: new Set(odznaczone), historiaIds: { ...historiaIds } }
    if (snapshot.odznaczone.size === 0) return

    setOdznaczone(new Set())
    const ids = Object.values(snapshot.historiaIds)
    if (ids.length > 0) await supabase.from('zakupy_historia').delete().in('id', ids)
    setHistoriaIds({})

    pokazToast(`Wyczyszczono ${snapshot.odznaczone.size} z koszyka`, async () => {
      setOdznaczone(snapshot.odznaczone)
      zapiszStanOdznaczenia(snapshot.odznaczone)
      const itemsDoOdtworzenia = listaPoProduktachDomowych.filter(i => snapshot.odznaczone.has(i.klucz))
      if (itemsDoOdtworzenia.length > 0) {
        const { data } = await supabase.from('zakupy_historia').insert(
          itemsDoOdtworzenia.map(i => ({
            household_id: householdId, user_id: user.id, skladnik: i.skladnik,
            ilosc: i.ilosc, jednostka: i.jednostka, kategoria: i.kategoria,
          }))
        ).select()
        const nowaMapa = {}
        ;(data || []).forEach((row, idx) => { nowaMapa[itemsDoOdtworzenia[idx].klucz] = row.id })
        setHistoriaIds(nowaMapa)
      }
      setToast(null)
    })
  }

  // ── Łączenie list (plan + własne) do widoku ──
  // Każdy własny produkt mapuję na strukturę zgodną z item z planu
  const wlasneJakoItems = useMemo(() => wlasne.map(w => ({
    klucz: `wlasny_${w.id}`,
    skladnik: w.nazwa,
    ilosc: null,
    iloscOryginalna: w.ilosc || '',
    jednostka: '',
    kategoria: w.kategoria || '8_Inne',
    podmieniono: false,
    zrodlo: 'wlasne',
    wlasnyData: w, // referencja do oryginalnego rekordu
  })), [wlasne])

  const listaPoKorektach = useMemo(
    () => lista
      .map(item => zastosujKorekteZakupu(item, korektyZakupow[item.klucz]))
      .filter(Boolean),
    [lista, korektyZakupow]
  )

  const listaPoProduktachDomowych = useMemo(
    () => listaPoKorektach.filter(item => !produktPasujeDoDomu(item.skladnik, produktyWDomuSet)),
    [listaPoKorektach, produktyWDomuSet]
  )

  const ukrytePrzezMamWDomu = useMemo(
    () => listaPoKorektach.filter(item => produktPasujeDoDomu(item.skladnik, produktyWDomuSet)),
    [listaPoKorektach, produktyWDomuSet]
  )

  // Wszystkie itemy (plan + własne) razem. Produkty z „Mam w domu” ukrywamy
  // tylko z części wygenerowanej z planu — ręcznie dopisane produkty zostają.
  const wszystkieItemy = useMemo(() => {
    return [...listaPoProduktachDomowych, ...wlasneJakoItems]
  }, [listaPoProduktachDomowych, wlasneJakoItems])

  // Czy item jest kupione? (różne źródło prawdy w zależności od zrodla)
  const czyKupione = useCallback((item) => {
    if (item.zrodlo === 'wlasne') return !!item.wlasnyData.odznaczone
    return odznaczone.has(item.klucz)
  }, [odznaczone])

  const doKupienia = wszystkieItemy.filter(i => !czyKupione(i))
  const kupione = wszystkieItemy.filter(i => czyKupione(i))
  const procent = wszystkieItemy.length > 0 ? Math.round(kupione.length / wszystkieItemy.length * 100) : 0

  const kategorie = {}
  doKupienia.forEach(item => {
    const katId = item.kategoria
    const katLabel = (KATEGORIE.find(k => k.id === katId)?.label) || katId.replace(/^\d_/, '')
    if (!kategorie[katLabel]) kategorie[katLabel] = { id: katId, items: [] }
    kategorie[katLabel].items.push(item)
  })

  // Toggle uniwersalny
  function toggleAny(item) {
    if (item.zrodlo === 'wlasne') return toggleWlasny(item.wlasnyData)
    return toggle(item)
  }

  if (loading) return <div style={s.loading}>Generuję listę zakupów…</div>

  // ── Tryb sklepu (przejmuje cały ekran) ──
  if (trybSklepu) {
    return (
      <TrybSklepu
        wszystkieItemy={wszystkieItemy}
        czyKupione={czyKupione}
        onToggle={toggleAny}
        onClose={() => setTrybSklepu(false)}
      />
    )
  }

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.headerCard}>
          <div style={s.headerTop}>
            <div>
              <div style={s.headerEyebrow}>LISTA NA TEN TYDZIEŃ</div>
              <h1 style={s.title}>Zakupy</h1>
            </div>
            <div style={s.progressRing}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#fff" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={`${(procent / 100) * 150.8} 200`}
                  transform="rotate(-90 28 28)" />
              </svg>
              <div style={s.progressTxt}>{procent}%</div>
            </div>
          </div>
          <div style={s.headerSub}>
            {kupione.length} z {wszystkieItemy.length} produktów w koszyku
          </div>
        </header>

        <SzybkieDodawanie
          value={szybkiTekst}
          onChange={setSzybkiTekst}
          onDodaj={dodajSzybkieProdukty}
        />

        <MamWDomuShortcut
          ile={produktyWDomu.length}
          ukryte={ukrytePrzezMamWDomu.length}
          onClick={() => setPokazMamWDomu(true)}
        />

        {/* Główny CTA: Idę do sklepu */}
        {wszystkieItemy.length > 0 && (
          <button style={s.btnSklep} onClick={() => setTrybSklepu(true)}>
            🛒 Idę do sklepu
          </button>
        )}

        {wszystkieItemy.length === 0 ? (
          <div style={s.empty}>
            <h3 style={s.emptyTytul}>Brak rzeczy do kupienia</h3>
            <p style={s.emptySub}>
              Wypełnij kalendarz albo dodaj własny produkt.
            </p>
            <button style={s.emptyBtn} onClick={() => { setEdycjaWlasnego(null); setPokazDodaj(true) }}>
              + Dodaj produkt
            </button>
          </div>
        ) : (
          <>
            {Object.entries(kategorie).map(([katLabel, { items }]) => (
              <section key={katLabel} style={s.katSekcja}>
                <h3 style={s.katHeader}>{katLabel}</h3>
                <div style={s.katLista}>
                  {items.map(item => (
                    <ItemRow
                      key={item.klucz}
                      item={item}
                      kupione={false}
                      onTap={() => toggleAny(item)}
                      onLongPress={() => rozpocznijEdycjeItemu(item)}
                      onEdit={() => rozpocznijEdycjeItemu(item)}
                      onHome={item.zrodlo === 'plan' ? () => dodajDoMamWDomu(item.skladnik) : null}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Dodaj własny produkt — przycisk pomiędzy kategoriami */}
            <button style={s.btnDodajWlasny} onClick={() => { setEdycjaWlasnego(null); setPokazDodaj(true) }}>
              + Dodaj własny produkt (papier, chemia, lek…)
            </button>

            {kupione.length > 0 && (
              <section style={{ ...s.katSekcja, marginTop: 24 }}>
                <h3 style={s.katHeaderDone}>W koszyku ({kupione.length})</h3>
                <div style={s.katLista}>
                  {kupione.map(item => (
                    <ItemRow
                      key={item.klucz}
                      item={item}
                      kupione={true}
                      onTap={() => toggleAny(item)}
                      onEdit={() => rozpocznijEdycjeItemu(item)}
                      onHome={item.zrodlo === 'plan' ? () => dodajDoMamWDomu(item.skladnik) : null}
                    />
                  ))}
                </div>
              </section>
            )}

            <div style={s.btnRow}>
              <button style={s.btnGhost} onClick={zacznijOdNowa}>
                Zacznij od nowa
              </button>
              <button style={s.btnGhost} onClick={generuj}>
                Odśwież listę
              </button>
            </div>
          </>
        )}
      </div>

      {pokazDodaj && (
        <DodajProduktModal
          edycja={edycjaWlasnego}
          onClose={() => { setPokazDodaj(false); setEdycjaWlasnego(null) }}
          onSave={zapiszWlasny}
          onDelete={edycjaWlasnego ? () => usunEdytowanyProdukt(edycjaWlasnego) : null}
        />
      )}

      {pokazMamWDomu && (
        <MamWDomuModal
          produkty={produktyWDomu}
          aktualneProdukty={listaPoKorektach}
          ukryteProdukty={ukrytePrzezMamWDomu}
          onClose={() => setPokazMamWDomu(false)}
          onSave={(nowe) => {
            zapiszProduktyWDomu(nowe)
            setPokazMamWDomu(false)
            pokazToast('Zaktualizowano produkty w domu')
          }}
        />
      )}

      {toast && (
        <div style={s.toast}>
          <span style={s.toastMsg}>{toast.msg}</span>
          {toast.onUndo && (
            <button style={s.toastBtn} onClick={toast.onUndo}>Cofnij</button>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function MamWDomuShortcut({ ile, ukryte, onClick }) {
  return (
    <button style={s.mamWDomuShortcut} onClick={onClick}>
      <div>
        <div style={s.mamWDomuEyebrow}>MAM W DOMU</div>
        <div style={s.mamWDomuTitle}>Produkty pomijane na liście</div>
        <div style={s.mamWDomuSub}>
          {ile} zapisanych produktów{ukryte > 0 ? ` · ukryto teraz: ${ukryte}` : ''}
        </div>
      </div>
      <span style={s.mamWDomuArrow}>›</span>
    </button>
  )
}

function MamWDomuModal({ produkty, aktualneProdukty, ukryteProdukty, onClose, onSave }) {
  const [lokalne, setLokalne] = useState(() => unikalneProduktyWDomu(produkty))
  const [tekst, setTekst] = useState('')

  const lokalneSet = useMemo(
    () => new Set(lokalne.map(normalizujProduktDomowy).filter(Boolean)),
    [lokalne]
  )

  const sugestie = useMemo(() => {
    const mapa = new Map()
    ;(aktualneProdukty || []).forEach(item => {
      const ladna = ladnaNazwaProduktuDomowego(item.skladnik)
      const norm = normalizujProduktDomowy(ladna)
      if (norm && !lokalneSet.has(norm) && !mapa.has(norm)) mapa.set(norm, ladna)
    })
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pl')).slice(0, 18)
  }, [aktualneProdukty, lokalneSet])

  function dodajNazwy(raw) {
    const nazwy = rozbijSzybkieLinie(raw)
      .map(ladnaNazwaProduktuDomowego)
      .filter(Boolean)
    if (nazwy.length === 0) return
    setLokalne(prev => unikalneProduktyWDomu([...prev, ...nazwy]))
    setTekst('')
  }

  function usun(nazwa) {
    const norm = normalizujProduktDomowy(nazwa)
    setLokalne(prev => prev.filter(x => normalizujProduktDomowy(x) !== norm))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      dodajNazwy(tekst)
    }
  }

  return (
    <div style={mod.overlay} onClick={onClose}>
      <div style={mod.modal} onClick={e => e.stopPropagation()}>
        <div style={mod.header}>
          <div>
            <div style={mod.eyebrow}>MAM W DOMU</div>
            <div style={mod.title}>Nie dodawaj do zakupów</div>
          </div>
          <button style={mod.close} onClick={onClose}>✕</button>
        </div>

        <p style={mod.helpText}>
          Te produkty będą pomijane tylko z listy generowanej z przepisów. Produkty dopisane ręcznie zostają na liście.
        </p>

        {ukryteProdukty?.length > 0 && (
          <div style={mod.infoBox}>
            Teraz ukryto: {ukryteProdukty.slice(0, 5).map(i => i.skladnik).join(', ')}{ukryteProdukty.length > 5 ? ` +${ukryteProdukty.length - 5}` : ''}
          </div>
        )}

        <label style={mod.label}>Dopisz produkt</label>
        <div style={mod.inlineAddRow}>
          <input
            style={{ ...mod.input, flex: 1 }}
            type="text"
            placeholder="np. Sól, pieprz, olej"
            value={tekst}
            onChange={e => setTekst(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button style={mod.btnSmallSave} onClick={() => dodajNazwy(tekst)} disabled={!tekst.trim()}>
            Dodaj
          </button>
        </div>

        {sugestie.length > 0 && (
          <>
            <label style={mod.label}>Z aktualnej listy</label>
            <div style={mod.chipCloud}>
              {sugestie.map(nazwa => (
                <button key={nazwa} style={mod.chipGhost} onClick={() => setLokalne(prev => unikalneProduktyWDomu([...prev, nazwa]))}>
                  + {nazwa}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={mod.label}>Produkty w domu ({lokalne.length})</label>
        <div style={mod.chipCloud}>
          {lokalne.map(nazwa => (
            <button key={nazwa} style={mod.chipOn} onClick={() => usun(nazwa)} title="Usuń z listy produktów w domu">
              {nazwa} ×
            </button>
          ))}
        </div>

        <div style={mod.footerWrap}>
          <button style={mod.btnCancel} onClick={() => setLokalne(unikalneProduktyWDomu(DOMYSLNE_PRODUKTY_W_DOMU))}>
            Domyślne
          </button>
          <button style={mod.btnCancel} onClick={() => setLokalne([])}>
            Wyczyść
          </button>
          <button style={mod.btnSave} onClick={() => onSave(lokalne)}>
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Szybkie dodawanie: Enter dodaje produkt i zostawia pole aktywne.
function SzybkieDodawanie({ value, onChange, onDodaj }) {
  const textareaRef = useRef(null)

  async function dodajAktualne() {
    const tekst = value.trim()
    if (!tekst) return
    await onDodaj(tekst)
    onChange('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  async function handleChange(e) {
    const next = e.target.value

    // Obsługa wklejenia wielu linii albo Enter na klawiaturze mobilnej.
    if (/\r?\n/.test(next)) {
      const parts = next.split(/\r?\n/)
      const gotowe = parts.slice(0, -1).map(x => x.trim()).filter(Boolean)
      const reszta = parts[parts.length - 1] || ''

      onChange(reszta)
      if (gotowe.length > 0) await onDodaj(gotowe.join('\n'))
      requestAnimationFrame(() => textareaRef.current?.focus())
      return
    }

    onChange(next)
  }

  async function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await dodajAktualne()
    }
  }

  return (
    <section style={s.quickAddCard}>
      <div style={s.quickAddHeader}>
        <div>
          <div style={s.quickAddEyebrow}>SZYBKIE DODAWANIE</div>
          <div style={s.quickAddTitle}>Dopisz swoje produkty</div>
        </div>
        <button
          style={{ ...s.quickAddBtn, opacity: value.trim() ? 1 : 0.45 }}
          onClick={dodajAktualne}
          disabled={!value.trim()}
        >
          Dodaj
        </button>
      </div>
      <textarea
        ref={textareaRef}
        style={s.quickAddInput}
        value={value}
        rows={1}
        placeholder="np. Musztarda sarepska 1szt. albo Margaryna"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div style={s.quickAddHelp}>
        Enter dodaje produkt. Możesz wpisać też kilka po przecinku: „Woda, Musztarda sarepska 1szt., Margaryna”. Brak ilości też jest OK — produkt i tak trafi do „Inne”.
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════
// Pojedynczy wiersz listy — z long-pressem dla własnych
function ItemRow({ item, kupione, onTap, onLongPress, onEdit, onHome }) {
  const longPressTimer = useRef(null)
  const startPos = useRef(null)
  const triggered = useRef(false)

  function down(e) {
    triggered.current = false
    startPos.current = { x: e.clientX, y: e.clientY }
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        triggered.current = true
        onLongPress()
        if (navigator.vibrate) navigator.vibrate(20)
      }, 500)
    }
  }
  function move(e) {
    if (!startPos.current || !longPressTimer.current) return
    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  function up() {
    if (!startPos.current) return
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!triggered.current) onTap()
    startPos.current = null
  }
  function cancel() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    startPos.current = null
    triggered.current = false
  }

  const isWlasny = item.zrodlo === 'wlasne'

  return (
    <div
      style={{ ...s.item, ...(kupione ? s.itemDone : {}) }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <div style={{ ...s.checkbox, ...(kupione ? s.checkboxDone : {}) }}>
        {kupione && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
        )}
      </div>
      <div style={s.itemInfo}>
        <div style={{ ...s.itemNazwa, ...(kupione ? { textDecoration: 'line-through', color: t.muteLight } : {}) }}>
          {item.skladnik}
          {item.podmieniono && <span style={s.podmianaIcon} title="Składnik podmieniony">↻</span>}
          {item.edytowany && <span style={s.tagJednorazowo} title="Pozycja zmieniona na liście">edytowane</span>}
          {isWlasny && <span style={s.tagJednorazowo} title="Produkt dopisany ręcznie">własne</span>}
        </div>
        <div style={{ ...s.itemIlosc, ...(kupione ? { color: t.muteLight } : {}) }}>
          {item.ilosc != null
            ? `${item.ilosc} ${item.jednostka || ''}`
            : (item.iloscOryginalna || item.jednostka || '—')}
        </div>
      </div>
      {onHome && (
        <button
          style={s.itemHomeBtn}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onHome() }}
          aria-label={`Mam w domu ${item.skladnik}`}
          title="Mam w domu — ukryj z listy"
        >
          🏠
        </button>
      )}
      {onEdit && (
        <button
          style={s.itemEditBtn}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onEdit() }}
          aria-label={`Edytuj ${item.skladnik}`}
          title="Edytuj nazwę / ilość / usuń"
        >
          ✎
        </button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Modal: dodaj/edytuj własny produkt
function DodajProduktModal({ edycja, onClose, onSave, onDelete }) {
  const [nazwa, setNazwa] = useState(edycja?.nazwa || '')
  const [ilosc, setIlosc] = useState(edycja?.ilosc?.toString() || '')
  const [kategoria, setKategoria] = useState(edycja?.kategoria || '8_Inne')

  function submit() {
    if (!nazwa.trim()) return
    onSave({
      nazwa: nazwa.trim(),
      ilosc: normalizujIloscTekst(ilosc),
      kategoria,
    })
  }

  return (
    <div style={mod.overlay} onClick={onClose}>
      <div style={mod.modal} onClick={e => e.stopPropagation()}>
        <div style={mod.header}>
          <div>
            <div style={mod.eyebrow}>{edycja ? 'EDYTUJ' : 'NOWY'}</div>
            <div style={mod.title}>{edycja ? 'Edytuj produkt' : 'Własny produkt'}</div>
          </div>
          <button style={mod.close} onClick={onClose}>✕</button>
        </div>

        <div style={mod.body}>
          <label style={mod.label}>Nazwa</label>
          <input
            style={mod.input}
            type="text"
            placeholder="np. Papier toaletowy"
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
            autoFocus
          />

          <label style={mod.label}>Ilość / jednostka (opcjonalnie)</label>
          <input
            style={mod.input}
            type="text"
            placeholder="np. 1 szt., 2 l, opakowanie"
            value={ilosc}
            onChange={e => setIlosc(e.target.value)}
          />

          <label style={mod.label}>Kategoria</label>
          <select style={mod.input} value={kategoria} onChange={e => setKategoria(e.target.value)}>
            {KATEGORIE.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </div>

        <div style={mod.footer}>
          {onDelete && (
            <button style={mod.btnDelete} onClick={onDelete}>Usuń</button>
          )}
          <button style={mod.btnCancel} onClick={onClose}>Anuluj</button>
          <button style={mod.btnSave} onClick={submit} disabled={!nazwa.trim()}>
            {edycja ? 'Zapisz' : 'Dodaj'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Tryb sklepu — fullscreen, ciemne tło, swipe
function TrybSklepu({ wszystkieItemy, czyKupione, onToggle, onClose }) {
  const [wakeLockOn, setWakeLockOn] = useState(false)
  const wakeLockRef = useRef(null)

  // Wake Lock — ekran nie gaśnie
  useEffect(() => {
    let aktywne = true
    async function lock() {
      if (!('wakeLock' in navigator)) return
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        if (aktywne) setWakeLockOn(true)
        wakeLockRef.current.addEventListener('release', () => setWakeLockOn(false))
      } catch (e) {
        // Brak uprawnień / nieobsługiwane — to OK
      }
    }
    lock()
    // Re-request gdy strona wraca z tła
    function onVisible() {
      if (document.visibilityState === 'visible') lock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      aktywne = false
      document.removeEventListener('visibilitychange', onVisible)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [])

  const doKupienia = wszystkieItemy.filter(i => !czyKupione(i))
  const kupione = wszystkieItemy.filter(i => czyKupione(i))

  // Pogrupuj do kupienia po kategoriach
  const kategorie = {}
  doKupienia.forEach(item => {
    const katId = item.kategoria
    const katLabel = (KATEGORIE.find(k => k.id === katId)?.label) || katId.replace(/^\d_/, '')
    if (!kategorie[katLabel]) kategorie[katLabel] = []
    kategorie[katLabel].push(item)
  })

  return (
    <div style={sklep.outer}>
      <header style={sklep.header}>
        <div>
          <div style={sklep.eyebrow}>TRYB SKLEPU{wakeLockOn ? ' · EKRAN AKTYWNY' : ''}</div>
          <div style={sklep.headerStats}>
            <strong style={sklep.headerStatsNum}>{doKupienia.length}</strong> do kupienia
            {kupione.length > 0 && <span style={sklep.headerStatsDone}>· {kupione.length} w koszyku</span>}
          </div>
        </div>
        <button style={sklep.close} onClick={onClose} aria-label="Wyjdź ze sklepu">✕</button>
      </header>

      <div style={sklep.scroll}>
        {doKupienia.length === 0 ? (
          <div style={sklep.gotowe}>
            <div style={sklep.gotoweEmoji}>🎉</div>
            <div style={sklep.gotoweTitle}>Wszystko w koszyku!</div>
            <div style={sklep.gotoweSub}>Możesz wracać do domu.</div>
          </div>
        ) : (
          Object.entries(kategorie).map(([katLabel, items]) => (
            <section key={katLabel} style={sklep.kat}>
              <h2 style={sklep.katTitle}>{katLabel}</h2>
              <div style={sklep.katItems}>
                {items.map(item => (
                  <SwipeItem
                    key={item.klucz}
                    item={item}
                    onSwipeRight={() => onToggle(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {kupione.length > 0 && (
          <section style={{ ...sklep.kat, marginTop: 32, opacity: 0.55 }}>
            <h2 style={{ ...sklep.katTitle, color: '#aaa' }}>W koszyku ({kupione.length})</h2>
            <div style={sklep.katItems}>
              {kupione.map(item => (
                <SwipeItem
                  key={item.klucz}
                  item={item}
                  kupione
                  onSwipeRight={() => onToggle(item)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div style={sklep.hint}>
        Przesuń produkt w prawo, żeby {/* */}{doKupienia.length > 0 ? 'wrzucić do koszyka' : 'przywrócić'}
      </div>
    </div>
  )
}

// Pojedynczy swipe-able item w trybie sklepu
function SwipeItem({ item, kupione, onSwipeRight }) {
  const [translateX, setTranslateXState] = useState(0)
  const [animowanie, setAnimowanie] = useState(false)
  const itemRef = useRef(null)
  const swipe = useRef({ active: false, startX: 0, startY: 0, kierunek: null })
  const translateRef = useRef(0)
  const pointerIdRef = useRef(null)

  function setTranslateXSafe(value) {
    translateRef.current = value
    setTranslateXState(value)
  }

  function progZaliczenia() {
    const szerokosc = itemRef.current?.offsetWidth || window.innerWidth || 320
    // Celowo bez „szybkiego flicka”: zalicza dopiero świadome przesunięcie prawie do połowy.
    return Math.min(240, Math.max(115, szerokosc * 0.45))
  }

  function resetRefs() {
    swipe.current = { active: false, startX: 0, startY: 0, kierunek: null }
    pointerIdRef.current = null
  }

  function start(clientX, clientY) {
    if (animowanie) return
    swipe.current = { active: true, startX: clientX, startY: clientY, kierunek: null }
    setTranslateXSafe(0)
  }

  function move(clientX, clientY, event) {
    if (!swipe.current.active || animowanie) return

    const dx = clientX - swipe.current.startX
    const dy = clientY - swipe.current.startY
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)

    // Najpierw rozpoznaj kierunek. Pion = normalny scroll listy. Poziom = swipe produktu.
    if (!swipe.current.kierunek) {
      if (absX < 8 && absY < 8) return
      swipe.current.kierunek = absX > absY + 4 ? 'x' : 'y'
    }

    if (swipe.current.kierunek === 'y') return

    if (event?.cancelable) event.preventDefault()

    const szerokosc = itemRef.current?.offsetWidth || window.innerWidth || 320
    const ograniczone = Math.max(0, Math.min(dx, szerokosc * 0.85))
    setTranslateXSafe(ograniczone)
  }

  function end() {
    if (!swipe.current.active) return

    const zaliczone = swipe.current.kierunek === 'x' && translateRef.current >= progZaliczenia()

    if (zaliczone) {
      setAnimowanie(true)
      setTranslateXSafe(window.innerWidth)
      setTimeout(() => {
        onSwipeRight()
        setTranslateXSafe(0)
        setAnimowanie(false)
      }, 180)
      navigator.vibrate?.(15)
    } else {
      setTranslateXSafe(0)
    }

    resetRefs()
  }

  function cancel() {
    setTranslateXSafe(0)
    resetRefs()
  }

  function pointerDown(e) {
    // Dotyk obsługują onTouch*, żeby mobilne przeglądarki nie przejmowały gestu.
    if (e.pointerType === 'touch') return
    if (e.button != null && e.button !== 0) return
    pointerIdRef.current = e.pointerId
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
    start(e.clientX, e.clientY)
  }

  function pointerMove(e) {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
    move(e.clientX, e.clientY, e)
  }

  function pointerUp(e) {
    if (e.pointerType === 'touch') return
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return
    end()
  }

  function touchStart(e) {
    const touch = e.touches?.[0]
    if (!touch) return
    start(touch.clientX, touch.clientY)
  }

  function touchMove(e) {
    const touch = e.touches?.[0]
    if (!touch) return
    move(touch.clientX, touch.clientY, e)
  }

  return (
    <div style={sklep.itemWrapper}>
      {/* Tło które pokazuje się przy swipe */}
      <div style={{
        ...sklep.itemBg,
        opacity: Math.min(1, translateX / progZaliczenia()),
      }}>
        <span style={sklep.itemBgIcon}>✓</span>
        <span style={sklep.itemBgTxt}>{kupione ? 'Przywróć' : 'Do koszyka'}</span>
      </div>

      {/* Sam item */}
      <div
        ref={itemRef}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancel}
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={end}
        onTouchCancel={cancel}
        style={{
          ...sklep.item,
          ...(kupione ? sklep.itemKupione : {}),
          transform: `translateX(${translateX}px)`,
          transition: animowanie ? 'transform .18s ease-out' : (translateX === 0 ? 'transform .16s ease-out' : 'none'),
        }}
      >
        <div style={sklep.itemNazwa}>{item.skladnik}</div>
        <div style={sklep.itemIlosc}>
          {item.ilosc != null
            ? `${item.ilosc} ${item.jednostka || ''}`
            : (item.iloscOryginalna || item.jednostka || '')}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans, position: 'relative' },
  container: { padding: '20px 20px 32px', maxWidth: 620, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  headerCard: {
    background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentDark} 100%)`,
    color: '#fff', borderRadius: 22, padding: '20px 20px 18px',
    marginBottom: 16, position: 'relative', overflow: 'hidden',
  },
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerEyebrow: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 600,
    letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.75, marginBottom: 6,
  },
  title: {
    fontFamily: fonts.serif, fontSize: 32, lineHeight: 1, color: '#fff',
    letterSpacing: -0.4, margin: 0, fontWeight: 400,
  },
  headerSub: { fontFamily: fonts.sans, fontSize: 13, opacity: 0.85, marginTop: 14 },
  progressRing: { position: 'relative', width: 56, height: 56 },
  progressTxt: {
    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
  },

  btnSklep: {
    width: '100%', padding: '14px 16px', marginBottom: 20,
    background: t.text, color: '#fff', border: 'none', borderRadius: 14,
    fontFamily: fonts.sans, fontSize: 15, fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(74,55,40,.18)',
  },

  quickAddCard: {
    ...ui.card,
    padding: 14,
    marginBottom: 14,
  },
  quickAddHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    marginBottom: 10,
  },
  quickAddEyebrow: {
    fontFamily: fonts.sans, fontSize: 9.5, fontWeight: 800,
    letterSpacing: 1.2, textTransform: 'uppercase', color: t.accent,
    marginBottom: 3,
  },
  quickAddTitle: {
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 700, color: t.text,
  },
  quickAddBtn: {
    border: 'none', borderRadius: 10,
    background: t.accent, color: '#fff',
    fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 700,
    padding: '9px 12px', cursor: 'pointer',
  },
  quickAddInput: {
    width: '100%', boxSizing: 'border-box',
    border: `1px solid ${t.border}`, borderRadius: 12,
    background: t.surfaceAlt || t.bg,
    color: t.text,
    fontFamily: fonts.sans, fontSize: 15,
    lineHeight: 1.35,
    padding: '12px 13px',
    outline: 'none', resize: 'none', overflow: 'hidden',
  },
  quickAddHelp: {
    marginTop: 8,
    fontFamily: fonts.sans, fontSize: 11.5,
    lineHeight: 1.35,
    color: t.mute,
  },

  mamWDomuShortcut: {
    ...ui.card,
    width: '100%', boxSizing: 'border-box',
    padding: '13px 14px', marginBottom: 14,
    border: `1px solid ${t.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    textAlign: 'left', cursor: 'pointer', fontFamily: fonts.sans,
    background: t.surface,
  },
  mamWDomuEyebrow: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2,
    textTransform: 'uppercase', color: t.warm || t.accent,
    marginBottom: 3,
  },
  mamWDomuTitle: { fontSize: 13.5, fontWeight: 700, color: t.text },
  mamWDomuSub: { fontSize: 11.5, color: t.mute, marginTop: 3 },
  mamWDomuArrow: {
    fontFamily: fonts.serif, fontSize: 24, color: t.mute,
    lineHeight: 1, paddingRight: 2,
  },

  empty: { ...ui.card, padding: '30px 24px', textAlign: 'center' },
  emptyTytul: { ...ui.h3, marginBottom: 6 },
  emptySub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, margin: '0 0 18px', lineHeight: 1.5 },
  emptyBtn: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 12,
    padding: '12px 18px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },

  katSekcja: { marginBottom: 18 },
  katHeader: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    margin: '0 0 8px', padding: '0 4px',
  },
  katHeaderDone: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.muteLight,
    margin: '0 0 8px', padding: '0 4px',
  },
  katLista: { ...ui.card, padding: 0, overflow: 'hidden' },

  item: {
    width: '100%', boxSizing: 'border-box', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 12px 12px 16px', background: 'transparent', border: 'none',
    borderBottom: `0.5px solid ${t.border}`,
    cursor: 'pointer', fontFamily: fonts.sans,
    userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  },
  itemDone: { opacity: 0.7 },
  checkbox: {
    width: 22, height: 22, borderRadius: '50%',
    border: `1.5px solid ${t.borderStrong}`, flexShrink: 0,
    display: 'grid', placeItems: 'center',
    background: t.surface, transition: 'all .15s',
  },
  checkboxDone: { background: t.accent, borderColor: t.accent },
  itemInfo: { flex: 1, minWidth: 0 },
  itemNazwa: {
    fontSize: 14, fontWeight: 500, color: t.text, lineHeight: 1.2,
    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  itemIlosc: { fontSize: 12, color: t.mute, marginTop: 3, fontVariantNumeric: 'tabular-nums' },
  itemHomeBtn: {
    width: 30, height: 30, borderRadius: 999,
    border: `1px solid ${t.border}`,
    background: t.surfaceAlt,
    color: t.mute,
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
    marginRight: 0,
  },
  itemEditBtn: {
    width: 30, height: 30, borderRadius: 999,
    border: `1px solid ${t.border}`,
    background: t.surfaceAlt,
    color: t.mute,
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0,
    marginRight: 0,
  },
  podmianaIcon: { fontSize: 11, color: t.warm, fontWeight: 700 },
  tagPowtarzaj: {
    fontSize: 9.5, color: t.accent, background: t.surfaceAlt,
    padding: '2px 6px', borderRadius: 4, fontWeight: 600,
    letterSpacing: 0.3,
  },
  tagJednorazowo: {
    fontSize: 9.5, color: t.mute, background: t.surfaceAlt,
    padding: '2px 6px', borderRadius: 4, fontWeight: 600,
    letterSpacing: 0.3,
  },

  btnDodajWlasny: {
    width: '100%', padding: '14px 16px', marginTop: 4,
    background: 'transparent', border: `1.5px dashed ${t.borderStrong}`,
    borderRadius: 14, color: t.mute, cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600,
  },

  btnRow: { display: 'flex', gap: 8, marginTop: 18 },
  btnGhost: { ...ui.btnGhost, flex: 1, padding: '12px 14px' },

  toast: {
    position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff', borderRadius: 12, padding: '10px 14px',
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 200,
    fontFamily: fonts.sans, fontSize: 13, maxWidth: 'calc(100vw - 32px)',
  },
  toastMsg: { color: '#fff', flex: 1 },
  toastBtn: {
    background: 'none', border: 'none', color: t.accentSoft || '#FBD3C2',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', padding: '4px 6px',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },
}

const mod = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(74,55,40,.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 300, padding: 0,
  },
  modal: {
    background: t.surface, borderRadius: '20px 20px 0 0', width: '100%',
    maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
    padding: '20px 20px 24px', boxSizing: 'border-box',
    fontFamily: fonts.sans,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: {
    fontSize: 10.5, fontWeight: 600, letterSpacing: 1.4,
    textTransform: 'uppercase', color: t.mute, marginBottom: 4,
  },
  title: { fontFamily: fonts.serif, fontSize: 22, color: t.text, margin: 0 },
  close: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.text, cursor: 'pointer',
  },
  body: { display: 'flex', flexDirection: 'column' },
  helpText: {
    margin: '0 0 12px',
    fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.45,
    color: t.mute,
  },
  infoBox: {
    padding: '10px 12px', borderRadius: 10,
    background: t.surfaceAlt, color: t.text,
    fontFamily: fonts.sans, fontSize: 12.5, lineHeight: 1.4,
    marginBottom: 12,
  },
  inlineAddRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  btnSmallSave: {
    padding: '0 13px', background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },
  chipCloud: {
    display: 'flex', flexWrap: 'wrap', gap: 7,
    marginTop: 2, marginBottom: 4,
  },
  chipGhost: {
    border: `1px solid ${t.border}`, background: t.surface,
    color: t.text, borderRadius: 999,
    padding: '7px 10px', fontFamily: fonts.sans,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  chipOn: {
    border: `1px solid ${t.accent}`, background: t.surfaceAlt,
    color: t.accent, borderRadius: 999,
    padding: '7px 10px', fontFamily: fonts.sans,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  footerWrap: { display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' },
  label: {
    fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
    color: t.mute, marginBottom: 6, marginTop: 12,
  },
  input: {
    ...ui.input, marginBottom: 0, padding: '11px 12px', fontSize: 14,
  },
  rowSplit: { display: 'flex', gap: 12 },
  checkRow: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    marginTop: 16, padding: '12px', background: t.surfaceAlt,
    borderRadius: 10, cursor: 'pointer',
  },
  checkLabel: { fontSize: 13.5, fontWeight: 600, color: t.text },
  checkHelp: { fontSize: 12, color: t.mute, marginTop: 3, lineHeight: 1.4 },
  footer: { display: 'flex', gap: 8, marginTop: 20 },
  btnCancel: {
    flex: 1, padding: '12px', background: 'transparent',
    border: `1px solid ${t.border}`, borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600,
    color: t.mute, cursor: 'pointer',
  },
  btnSave: {
    flex: 1.5, padding: '12px', background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
  btnDelete: {
    padding: '12px 14px', background: 'transparent',
    border: `1px solid ${t.border}`, borderRadius: 12, color: '#c44',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  },
}

// Tryb sklepu — ciemny motyw, większy tekst
const SKLEP_BG = '#1a1814'
const SKLEP_SURFACE = '#2a2520'
const SKLEP_TEXT = '#f4ede2'
const SKLEP_MUTE = '#a89a85'

const sklep = {
  outer: {
    position: 'fixed', inset: 0, background: SKLEP_BG,
    color: SKLEP_TEXT, fontFamily: fonts.sans, zIndex: 500,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    padding: '18px 20px 14px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottom: `0.5px solid #3a342d`,
  },
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', color: t.warm || '#d8c4a8', marginBottom: 4,
  },
  headerStats: { fontSize: 18, color: SKLEP_TEXT },
  headerStatsNum: { fontFamily: fonts.serif, fontSize: 28, fontWeight: 400, marginRight: 6 },
  headerStatsDone: { color: SKLEP_MUTE, fontSize: 14, marginLeft: 6 },
  close: {
    background: SKLEP_SURFACE, border: 'none', borderRadius: 999,
    width: 36, height: 36, fontSize: 16, color: SKLEP_TEXT, cursor: 'pointer',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 16px 24px', WebkitOverflowScrolling: 'touch' },
  kat: { marginBottom: 24 },
  katTitle: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
    textTransform: 'uppercase', color: t.warm || '#d8c4a8',
    margin: '0 0 10px', padding: '0 4px',
  },
  katItems: { display: 'flex', flexDirection: 'column', gap: 4 },

  itemWrapper: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 14, background: SKLEP_BG,
    touchAction: 'pan-y',
  },
  itemBg: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, #1a4d2e 0%, #2a7d4f 100%)',
    display: 'flex', alignItems: 'center', paddingLeft: 24,
    color: '#fff', gap: 12,
  },
  itemBgIcon: { fontSize: 24, fontWeight: 700 },
  itemBgTxt: { fontSize: 14, fontWeight: 600, letterSpacing: 0.5 },

  item: {
    position: 'relative', background: SKLEP_SURFACE,
    padding: '18px 20px', borderRadius: 14,
    cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'pan-y', WebkitTouchCallout: 'none',
  },
  itemKupione: { opacity: 0.55 },
  itemNazwa: {
    fontSize: 20, fontWeight: 500, color: SKLEP_TEXT,
    fontFamily: fonts.serif, lineHeight: 1.2, letterSpacing: -0.2,
  },
  itemIlosc: {
    fontSize: 14, color: SKLEP_MUTE, marginTop: 5,
    fontVariantNumeric: 'tabular-nums',
  },

  gotowe: { padding: '60px 24px', textAlign: 'center' },
  gotoweEmoji: { fontSize: 48, marginBottom: 12 },
  gotoweTitle: {
    fontFamily: fonts.serif, fontSize: 26, color: SKLEP_TEXT, marginBottom: 6,
  },
  gotoweSub: { fontSize: 14, color: SKLEP_MUTE },

  hint: {
    padding: '10px 20px 16px', textAlign: 'center',
    fontSize: 11.5, color: SKLEP_MUTE,
    borderTop: `0.5px solid #3a342d`,
  },
}