import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { formatDataLocal as formatData, isDzis } from '../dataHelpers'
import { useSloty, slotyWDniu, kluczDnia, sanityzuj } from '../useSloty'

const DNI_KROTKO = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

// Konwersja hex koloru na rgba dla overlayu labeli na kafelkach
function hexNaRgba(hex, alpha = 0.92) {
  const h = (hex || '').replace('#', '')
  if (h.length !== 6) return `rgba(120, 100, 70, ${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Próg przewijania krawędziowego przy dragu (px od krawędzi ekranu)
const EDGE_SCROLL_THRESHOLD = 80
const EDGE_SCROLL_SPEED = 10

// ── Helpery ─────────────────────────────────────────────────
function getPoniedzialek(offset = 0) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
// formatData importowane z dataHelpers (LOKALNA strefa, nie UTC)
function formatMiesiacRok(d) { return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }) }

const KOLORY = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6','#F4D9CC','#DCE5D2']
function kolorDania(n) {
  let h = 0; for (let i = 0; i < (n || '').length; i++) h = n.charCodeAt(i) + ((h << 5) - h)
  return KOLORY[Math.abs(h) % KOLORY.length]
}
function emojiDania(n) {
  const x = (n || '').toLowerCase()
  if (x.includes('kurczak') || x.includes('pierś')) return '🍗'
  if (x.includes('wołow') || x.includes('stek') || x.includes('burger')) return '🥩'
  if (x.includes('ryb') || x.includes('dorsz') || x.includes('pstrąg') || x.includes('łosoś')) return '🐟'
  if (x.includes('pizza')) return '🍕'
  if (x.includes('makaron') || x.includes('spaghetti') || x.includes('tagliatelle')) return '🍝'
  if (x.includes('zupa') || x.includes('gulasz') || x.includes('rosół')) return '🍲'
  if (x.includes('sałat') || x.includes('leczo')) return '🥗'
  if (x.includes('pierogi') || x.includes('pyzy') || x.includes('kopytka')) return '🥟'
  if (x.includes('wieprzow') || x.includes('schab') || x.includes('żeberka') || x.includes('karkówka')) return '🍖'
  if (x.includes('jajk') || x.includes('omlet')) return '🍳'
  if (x.includes('ziem') || x.includes('placki')) return '🥔'
  if (x.includes('tortilla') || x.includes('burrito') || x.includes('quesadilla')) return '🌯'
  if (x.includes('kebab') || x.includes('gyros')) return '🥙'
  if (x.includes('ryż') || x.includes('curry')) return '🍛'
  if (x.includes('musli') || x.includes('granola') || x.includes('owsianka')) return '🥣'
  if (x.includes('chleb') || x.includes('tost') || x.includes('kanapk')) return '🥪'
  if (x.includes('naleśnik') || x.includes('placuszek') || x.includes('pancake')) return '🥞'
  return '🍽️'
}

// ════════════════════════════════════════════════════════════
//   GŁÓWNY KOMPONENT
// ════════════════════════════════════════════════════════════
export default function Kalendarz({ user, householdId, onBack, domyslnePorcje = 1, sledz, onSelectDanie, tydzien: tydzienProp = 0, onTydzienChange }) {
  const [tydzien, _setTydzien] = useState(tydzienProp)

  // Synchronizuj tydzien z propem (gdy wraca z DanieDetail)
  useEffect(() => { _setTydzien(tydzienProp) }, [tydzienProp])

  // Zapamiętuj pozycję scrolla
  useEffect(() => {
    function onScroll() { sessionStorage.setItem('planer_scroll', String(window.scrollY)) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  function setTydzien(val) {
    const nowy = typeof val === 'function' ? val(tydzien) : val
    _setTydzien(nowy)
    onTydzienChange?.(nowy)
  }
  const [dania, setDania] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [skladnikiDan, setSkladnikiDan] = useState({}) // { nazwaDania: Set('składnik1','składnik2') }
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [widok, setWidok] = useState(() => sessionStorage.getItem('planer_widok') || 'tydzien')
  const [aktywnyDzien, setAktywnyDzien] = useState(() => parseInt(sessionStorage.getItem('planer_aktywnyDzien') || '0', 10))
  const [subTryb, setSubTryb] = useState(null)
  const [podmianaModal, setPodmianaModal] = useState(null)
  const [kopiujModal, setKopiujModal] = useState(null) // { zDataStr } albo null
  const [wyborDatyOpen, setWyborDatyOpen] = useState(false)
  const [wybranaData, setWybranaData] = useState(() => formatData(new Date()))
  // Modal wyboru wielu dni przy planowaniu z galerii
  const [wieloDniModal, setWieloDniModal] = useState(null) // { danie, posilek, dataStr } | null
  const recznyWyborDniaRef = useRef(false)

  // Konfiguracja slotów (per household) — dynamiczna lista posiłków per dzień tygodnia
  const { config: slotyConfig } = useSloty(householdId)

  // Helper: lista ID slotów dla podanego dnia (string YYYY-MM-DD lub obiekt Date)
  const slotyDlaDnia = useCallback((dataLubStr) => {
    const klucz = kluczDnia(dataLubStr)
    return slotyWDniu(slotyConfig, klucz).map(s => s.id)
  }, [slotyConfig])

  // Helper: zwraca pełny obiekt slotu po ID (z konfiguracji)
  const znajdzSlot = useCallback((slotId) => {
    return sanityzuj(slotyConfig).sloty.find(s => s.id === slotId) || null
  }, [slotyConfig])

  // Helper: nazwa slotu po ID (fallback do ID jeśli slot zniknął)
  const nazwaSlotu = useCallback((slotId) => {
    return znajdzSlot(slotId)?.nazwa || slotId
  }, [znajdzSlot])

  // Helper: kolor labela slotu (rgba na overlay) — z fallbackiem
  const kolorSlotu = useCallback((slotId) => {
    const slot = znajdzSlot(slotId)
    return hexNaRgba(slot?.kolor || '#806040', 0.92)
  }, [znajdzSlot])

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  function pokazToast(msg, onUndo) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, onUndo })
    toastTimer.current = setTimeout(() => setToast(null), onUndo ? 4000 : 2200)
  }

  const poniedzialek = getPoniedzialek(tydzien)
  const dni = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(poniedzialek); d.setDate(d.getDate() + i); return d
  }), [poniedzialek])

  function otworzDzien(di) {
    setSubTryb(null)
    setWidok('dzien')
    sessionStorage.setItem('planer_widok', 'dzien')
    setAktywnyDzien(di)
    sessionStorage.setItem('planer_aktywnyDzien', String(di))
  }

  function otworzWyborDaty() {
    setWybranaData(formatData(dni[aktywnyDzien] || dni[0] || new Date()))
    setWyborDatyOpen(true)
  }

  function przejdzDoDaty(dataStr) {
    if (!dataStr) return
    const wybrana = new Date(dataStr + 'T12:00:00')
    if (Number.isNaN(wybrana.getTime())) return

    const wybranaPon = new Date(wybrana)
    const day = wybranaPon.getDay() || 7
    wybranaPon.setDate(wybranaPon.getDate() - day + 1)
    wybranaPon.setHours(0, 0, 0, 0)

    const aktualnyPon = getPoniedzialek(0)
    const tydzOffset = Math.round((wybranaPon - aktualnyPon) / (7 * 24 * 60 * 60 * 1000))
    const dzienIdx = (wybrana.getDay() || 7) - 1

    recznyWyborDniaRef.current = true
    setTydzien(tydzOffset)
    setAktywnyDzien(dzienIdx)
    sessionStorage.setItem('planer_aktywnyDzien', String(dzienIdx))
    setWidok('dzien')
    sessionStorage.setItem('planer_widok', 'dzien')
    setSubTryb(null)
    setWyborDatyOpen(false)
  }

  useEffect(() => {
    if (recznyWyborDniaRef.current) {
      recznyWyborDniaRef.current = false
      return
    }
    if (tydzien === 0) {
      const today = (new Date().getDay() || 7) - 1
      setAktywnyDzien(today)
    } else {
      setAktywnyDzien(0)
    }
  }, [tydzien])

  useEffect(() => {
    if (!householdId) return
    let anulowane = false
    async function pobierz() {
      setLoading(true)
      const [{ data: wszystko }, { data: skl }, planRes] = await Promise.all([
        // Wszystkie pozycje (dania, dodatki, surówki, przekąski) — jedna tabela
        supabase.from('dania').select('"Danie", "TYP", rodzaj, zdjecie').order('"Danie"'),
        // Wszystkie składniki — do search po składnikach
        supabase.from('dania').select('"Danie", "Składnik"'),
        supabase.from('kalendarz').select('*')
          .eq('household_id', householdId)
          .gte('data', formatData(dni[0]))
          .lte('data', formatData(dni[6])),
      ])
      if (anulowane) return

      // Dedup po nazwie — preferuj wiersz ze zdjęciem
      const dedupMapa = new Map()
      for (const x of (wszystko || [])) {
        if (!x.Danie) continue
        const prev = dedupMapa.get(x.Danie)
        if (!prev || (!prev.zdjecie && x.zdjecie)) dedupMapa.set(x.Danie, x)
      }
      const unikalneWszystko = [...dedupMapa.values()]

      // Podział wg rodzaju:
      // - 'dodatek' / 'surowka' -> osobne listy do galerii w sub-trybie
      // - reszta (obiad/sniadanie/kolacja/przekaska) -> dania głównego wyboru
      const unikalDania = unikalneWszystko.filter(d => d.rodzaj !== 'dodatek' && d.rodzaj !== 'surowka')
      // Mapuję na strukturę zgodną z resztą kodu (klucz Dodatek/Surówka jak wcześniej)
      const unikalDodatki = unikalneWszystko
        .filter(d => d.rodzaj === 'dodatek')
        .map(d => ({ Dodatek: d.Danie, zdjecie: d.zdjecie }))
      const unikalSurowki = unikalneWszystko
        .filter(d => d.rodzaj === 'surowka')
        .map(d => ({ 'Surówka': d.Danie, zdjecie: d.zdjecie }))

      // Mapa: nazwa dania -> Set jego składników (do search)
      const sklMapa = {}
      ;(skl || []).forEach(row => {
        if (!row.Danie || !row['Składnik']) return
        if (!sklMapa[row.Danie]) sklMapa[row.Danie] = new Set()
        sklMapa[row.Danie].add(row['Składnik'].toLowerCase())
      })

      setDania(unikalDania)
      setDodatki(unikalDodatki)
      setSurowki(unikalSurowki)
      setSkladnikiDan(sklMapa)
      const nowyPlan = {}
      ;(planRes.data || []).forEach(p => { nowyPlan[`${p.data}_${p.posilek}`] = p })
      setPlan(nowyPlan)
      setLoading(false)
      // Przywróć pozycję scrolla po załadowaniu danych
      const savedScroll = parseInt(sessionStorage.getItem('planer_scroll') || '0', 10)
      if (savedScroll > 0) {
        // Kilka prób — czekamy aż strona osiągnie wystarczającą wysokość
        const tryScroll = (attemptsLeft) => {
          window.scrollTo({ top: savedScroll, behavior: 'instant' })
          if (attemptsLeft > 0 && window.scrollY < savedScroll - 10) {
            setTimeout(() => tryScroll(attemptsLeft - 1), 100)
          }
        }
        setTimeout(() => tryScroll(5), 50)
      }
    }
    pobierz()
    return () => { anulowane = true }
  }, [tydzien, householdId])

  // Realtime sync: gdy ktoś z rodziny zmieni plan, aktualizuj lokalnie.
  useEffect(() => {
    if (!householdId) return
    const dataOd = formatData(dni[0])
    const dataDo = formatData(dni[6])

    const channel = supabase
      .channel(`kalendarz:${householdId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kalendarz', filter: `household_id=eq.${householdId}` },
        (payload) => {
          const row = payload.new || payload.old
          if (!row?.data || row.data < dataOd || row.data > dataDo) return
          const klucz = `${row.data}_${row.posilek}`
          if (payload.eventType === 'DELETE') {
            setPlan(p => { const n = { ...p }; delete n[klucz]; return n })
          } else {
            setPlan(p => ({ ...p, [klucz]: payload.new }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, dni])

  const daniaMap = useMemo(() => { const m = {}; dania.forEach(d => { m[d.Danie] = d }); return m }, [dania])
  const dodatkiMap = useMemo(() => { const m = {}; dodatki.forEach(d => { m[d.Dodatek] = d }); return m }, [dodatki])
  const surowkiMap = useMemo(() => { const m = {}; surowki.forEach(d => { m[d['Surówka']] = d }); return m }, [surowki])

  async function ustawDanie(dataStr, posilek, nazwa) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (istniejacy) {
      // Zachowaj kopię — undo gdy user nie chciał nadpisać
      const kopia = { ...istniejacy }
      const { data } = await supabase.from('kalendarz')
        .update({ danie: nazwa, dodatki: [], podmiany: {} })
        .eq('id', istniejacy.id).select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))

      // Undo tylko jeśli stary wpis miał danie (zmiana z czegoś na coś)
      if (kopia.danie && kopia.danie !== nazwa) {
        pokazToast(`Zmieniono na: ${nazwa}`, async () => {
          await supabase.from('kalendarz')
            .update({
              danie: kopia.danie,
              dodatki: kopia.dodatki || [],
              podmiany: kopia.podmiany || {},
            })
            .eq('id', istniejacy.id)
          setPlan(p => ({ ...p, [klucz]: kopia }))
          setToast(null)
        })
      } else {
        pokazToast(`Zaplanowano: ${nazwa}`)
      }
    } else {
      const { data } = await supabase.from('kalendarz')
        .insert({ household_id: householdId, user_id: user.id, data: dataStr, posilek, danie: nazwa, dodatki: [] })
        .select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))
      sledz?.('zaplanuj_posilek', { dzien: dataStr, posilek, danie: nazwa })
      pokazToast(`Zaplanowano: ${nazwa}`)
    }
  }

  // ── Planowanie na wiele dni naraz (z multi-dni modala) ──
  async function zaplanujNaWieleDni(danie, posilek, dniDoZapisania) {
    // dniDoZapisania: tablica stringów YYYY-MM-DD
    if (!danie || !posilek || !dniDoZapisania?.length) return

    const inserty = []
    const updaty = []

    for (const dataStr of dniDoZapisania) {
      const klucz = `${dataStr}_${posilek}`
      const istniejacy = plan[klucz]
      if (istniejacy) {
        updaty.push({ id: istniejacy.id, dataStr, posilek })
      } else {
        inserty.push({ household_id: householdId, user_id: user.id, data: dataStr, posilek, danie, dodatki: [] })
      }
    }

    const wyniki = {}

    if (inserty.length > 0) {
      const { data } = await supabase.from('kalendarz').insert(inserty).select()
      ;(data || []).forEach(r => { wyniki[`${r.data}_${r.posilek}`] = r })
    }
    for (const u of updaty) {
      const { data } = await supabase.from('kalendarz')
        .update({ danie, dodatki: [], podmiany: {} })
        .eq('id', u.id).select().single()
      if (data) wyniki[`${data.data}_${data.posilek}`] = data
    }

    setPlan(p => ({ ...p, ...wyniki }))
    const ile = dniDoZapisania.length
    pokazToast(`Zaplanowano na ${ile} ${ile === 1 ? 'dzień' : ile < 5 ? 'dni' : 'dni'}: ${danie}`)
    sledz?.('zaplanuj_wiele_dni', { danie, ile })
  }

  // ── Side-sloty (dodatki/surówki) — tablica jsonb ──
  // Format: dodatki = [{ nazwa: string, typ: 'dodatek' | 'surowka' }, ...]
  // Każdy slot niezależnie — można mieć 2 dodatki, 2 surówki, mix, lub puste.
  async function ustawSide(dataStr, posilek, slotIdx, nazwa, typ) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const aktualne = Array.isArray(istniejacy.dodatki) ? [...istniejacy.dodatki] : []
    // Wypełnij dziury (gdy slotIdx=1 a aktualne=[]) pustym placeholderem na slot 0
    while (aktualne.length < slotIdx) aktualne.push(null)
    aktualne[slotIdx] = { nazwa, typ }
    // Wyczyść końcowe nulle żeby tablica była zwarta
    while (aktualne.length > 0 && !aktualne[aktualne.length - 1]) aktualne.pop()
    const { data } = await supabase.from('kalendarz')
      .update({ dodatki: aktualne }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
    pokazToast(`+ ${nazwa}`)
  }

  async function usunSide(dataStr, posilek, slotIdx) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const aktualne = Array.isArray(istniejacy.dodatki) ? [...istniejacy.dodatki] : []
    if (slotIdx >= aktualne.length) return
    aktualne[slotIdx] = null
    while (aktualne.length > 0 && !aktualne[aktualne.length - 1]) aktualne.pop()
    const { data } = await supabase.from('kalendarz')
      .update({ dodatki: aktualne }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
  }

  async function usunPosilek(dataStr, posilek) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    // Zachowaj kopię żeby móc przywrócić przy undo
    const kopia = { ...istniejacy }
    await supabase.from('kalendarz').delete().eq('id', istniejacy.id)
    setPlan(p => { const n = { ...p }; delete n[klucz]; return n })

    pokazToast(`${nazwaSlotu(posilek)} usunięty`, async () => {
      // Insert spowrotem (zachowując wszystkie pola)
      const { id, created_at, ...doInsert } = kopia
      const { data } = await supabase.from('kalendarz').insert(doInsert).select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))
      setToast(null)
    })
  }

  async function przeniesPosilek(zDataStr, zPosilek, naDataStr, naPosilek) {
    const zKlucz = `${zDataStr}_${zPosilek}`
    const naKlucz = `${naDataStr}_${naPosilek}`
    if (zKlucz === naKlucz) return

    const zrodlo = plan[zKlucz]
    const cel = plan[naKlucz]
    if (!zrodlo?.danie) return

    const bezTechnicznych = (row, noweData, nowyPosilek) => {
      const { id, created_at, ...rest } = row
      return { ...rest, data: noweData, posilek: nowyPosilek }
    }

    const snapshot = { ...plan }

    // Pusty slot: zwykłe przeniesienie wpisu, zachowujemy id rekordu.
    if (!cel?.danie) {
      setPlan(prev => {
        const n = { ...prev }
        delete n[zKlucz]
        n[naKlucz] = { ...zrodlo, data: naDataStr, posilek: naPosilek }
        return n
      })

      const { data, error } = await supabase.from('kalendarz')
        .update({ data: naDataStr, posilek: naPosilek })
        .eq('id', zrodlo.id)
        .select()
        .single()

      if (error) {
        setPlan(snapshot)
        pokazToast('Nie udało się przenieść posiłku')
        return
      }

      if (data) {
        setPlan(prev => {
          const n = { ...prev }
          delete n[zKlucz]
          n[`${data.data}_${data.posilek}`] = data
          return n
        })
      }

      pokazToast(`Przeniesiono: ${zrodlo.danie}`, async () => {
        const aktualny = data || { ...zrodlo, data: naDataStr, posilek: naPosilek }
        const { data: cof } = await supabase.from('kalendarz')
          .update({ data: zDataStr, posilek: zPosilek })
          .eq('id', aktualny.id)
          .select()
          .single()

        setPlan(prev => {
          const n = { ...prev }
          delete n[naKlucz]
          n[zKlucz] = cof || zrodlo
          return n
        })
        setToast(null)
      })
      return
    }

    // Zajęty slot: zamień miejscami całe wpisy.
    // Robimy delete + insert, żeby nie wpaść na ewentualny unique constraint data+posilek.
    setPlan(prev => {
      const n = { ...prev }
      delete n[zKlucz]
      delete n[naKlucz]
      n[naKlucz] = { ...zrodlo, data: naDataStr, posilek: naPosilek }
      n[zKlucz] = { ...cel, data: zDataStr, posilek: zPosilek }
      return n
    })

    const { error: delError } = await supabase.from('kalendarz')
      .delete()
      .in('id', [zrodlo.id, cel.id])

    if (delError) {
      setPlan(snapshot)
      pokazToast('Nie udało się zamienić posiłków')
      return
    }

    const noweWpisy = [
      bezTechnicznych(zrodlo, naDataStr, naPosilek),
      bezTechnicznych(cel, zDataStr, zPosilek),
    ]

    const { data: utworzone, error: insError } = await supabase.from('kalendarz')
      .insert(noweWpisy)
      .select()

    if (insError) {
      // Best effort rollback w bazie, żeby użytkownik nie stracił wpisów.
      await supabase.from('kalendarz').insert([
        bezTechnicznych(zrodlo, zDataStr, zPosilek),
        bezTechnicznych(cel, naDataStr, naPosilek),
      ])
      setPlan(snapshot)
      pokazToast('Nie udało się zamienić posiłków')
      return
    }

    if (utworzone) {
      setPlan(prev => {
        const n = { ...prev }
        delete n[zKlucz]
        delete n[naKlucz]
        utworzone.forEach(row => { n[`${row.data}_${row.posilek}`] = row })
        return n
      })
    }

    pokazToast(`Zamieniono: ${zrodlo.danie}`)
  }

  async function zmienPorcje(dataStr, posilek, nowaWart) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const { data } = await supabase.from('kalendarz')
      .update({ porcje: nowaWart }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
  }

  async function zapiszPodmiany(wpisId, podmiany) {
    const { data } = await supabase.from('kalendarz')
      .update({ podmiany }).eq('id', wpisId).select().single()
    if (data) {
      const klucz = `${data.data}_${data.posilek}`
      setPlan(p => ({ ...p, [klucz]: data }))
      const liczba = Object.keys(podmiany).filter(k => podmiany[k]).length
      if (liczba > 0) sledz?.('podmien_skladnik', { ile: liczba, danie: data.danie })
    }
  }

  // ── Kopiowanie planu ──
  // Kopiuje wszystkie wpisy z dnia źródłowego do docelowego (nadpisuje istniejące).
  async function kopiujDzien(zDataStr, naDataStr) {
    const zrodlowe = Object.values(plan).filter(p => p.data === zDataStr && p.danie)
    if (zrodlowe.length === 0) {
      pokazToast('Dzień źródłowy jest pusty')
      return
    }
    // Usuń istniejące w dniu docelowym (żeby nadpisać czysto)
    const doUsuniecia = Object.values(plan).filter(p => p.data === naDataStr)
    if (doUsuniecia.length > 0) {
      await supabase.from('kalendarz').delete().in('id', doUsuniecia.map(p => p.id))
    }
    // Wstaw nowe (kopie bez id/created_at)
    const noweWpisy = zrodlowe.map(p => {
      const { id, created_at, ...rest } = p
      return { ...rest, data: naDataStr }
    })
    const { data: utworzone } = await supabase.from('kalendarz').insert(noweWpisy).select()
    // Zaktualizuj lokalny stan
    setPlan(prev => {
      const n = { ...prev }
      doUsuniecia.forEach(p => { delete n[`${p.data}_${p.posilek}`] })
      ;(utworzone || []).forEach(p => { n[`${p.data}_${p.posilek}`] = p })
      return n
    })
    pokazToast(`Skopiowano ${zrodlowe.length} ${zrodlowe.length === 1 ? 'posiłek' : 'posiłki'}`)
    sledz?.('kopiuj_dzien', { z: zDataStr, na: naDataStr, ile: zrodlowe.length })
  }

  // Kopiuje cały tydzień z poprzedniego (offset -1) do bieżącego.
  async function kopiujTydzien() {
    // Pobierz tydzień poprzedni
    const poprzedniPon = new Date(poniedzialek); poprzedniPon.setDate(poprzedniPon.getDate() - 7)
    const poprzedniNd = new Date(poprzedniPon); poprzedniNd.setDate(poprzedniNd.getDate() + 6)
    const { data: poprzedniPlan } = await supabase.from('kalendarz').select('*')
      .eq('household_id', householdId)
      .gte('data', formatData(poprzedniPon))
      .lte('data', formatData(poprzedniNd))

    const zZawartoscia = (poprzedniPlan || []).filter(p => p.danie)
    if (zZawartoscia.length === 0) {
      pokazToast('Poprzedni tydzień jest pusty')
      return
    }

    // Usuń istniejące w bieżącym tygodniu
    const doUsuniecia = Object.values(plan).filter(p => p.id)
    if (doUsuniecia.length > 0) {
      await supabase.from('kalendarz').delete().in('id', doUsuniecia.map(p => p.id))
    }

    // Wstaw przesunięte o 7 dni
    const noweWpisy = zZawartoscia.map(p => {
      const { id, created_at, ...rest } = p
      const d = new Date(p.data + 'T12:00:00')
      d.setDate(d.getDate() + 7)
      return { ...rest, data: formatData(d) }
    })
    const { data: utworzone } = await supabase.from('kalendarz').insert(noweWpisy).select()
    const nowyPlan = {}
    ;(utworzone || []).forEach(p => { nowyPlan[`${p.data}_${p.posilek}`] = p })
    setPlan(nowyPlan)
    pokazToast(`Skopiowano ${zZawartoscia.length} posiłków z ub. tygodnia`)
    sledz?.('kopiuj_tydzien', { ile: zZawartoscia.length })
  }

  // isDzis importowane z dataHelpers
  const s = makeS()

  if (loading) return <div style={s.loading}>Ładowanie planu…</div>



  return (
    <div style={s.outer}>
      <div style={s.container}>
        {!subTryb && (
          <>
            <button style={s.back} onClick={onBack}>← Wróć</button>

            <header style={s.header}>
              <div>
                <button type="button" style={s.monthBtn} onClick={otworzWyborDaty}>
                  {formatMiesiacRok(dni[3]).toUpperCase()} ▾
                </button>
                <h1 style={s.title}><em style={s.italic}>Twój</em> tydzień</h1>
              </div>
              <div style={s.headerActions}>
                <button style={s.navBtn} onClick={() => setTydzien(t => t - 1)}>‹</button>
                <button style={s.navBtn} onClick={() => setTydzien(t => t + 1)}>›</button>
              </div>
            </header>

            <div style={s.dayStrip}>
              {dni.map((dzien, i) => {
                const dataStr = formatData(dzien)
                const today = isDzis(dzien)
                const active = widok === 'dzien' && aktywnyDzien === i
                const slotyTegoDnia = slotyDlaDnia(dzien)
                const wypelnione = slotyTegoDnia.map(slotId => !!plan[`${dataStr}_${slotId}`]?.danie)
                return (
                  <button
                    key={i}
                    onClick={() => otworzDzien(i)}
                    style={{
                      ...s.dayPill,
                      background: active ? t.warm : 'transparent',
                      border: active ? `1px solid ${t.warm}` : `1px solid transparent`,
                    }}
                  >
                    <span style={{ ...s.dayPillDow, color: active ? '#fff' : (today ? t.warm : t.mute) }}>
                      {DNI_KROTKO[i]}
                    </span>
                    <span style={{ ...s.dayPillDate, color: active ? '#fff' : (today ? t.warm : t.text) }}>
                      {dzien.getDate()}
                    </span>
                    <span style={s.dayPillDots}>
                      {wypelnione.map((on, idx) => (
                        <span key={idx} style={{
                          ...s.dot,
                          background: on ? (active ? '#fff' : t.warm) : (active ? 'rgba(255,255,255,.3)' : t.border),
                        }} />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>

            {widok === 'dzien' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
                <button style={{ ...s.wrocTydzienBtn, paddingBottom: 0 }} onClick={() => { setWidok('tydzien'); sessionStorage.setItem('planer_widok', 'tydzien') }}>
                  ← Pokaż cały tydzień
                </button>
                <button
                  style={s.dzienAkcjaBtn}
                  onClick={() => setKopiujModal({ zDataStr: formatData(dni[aktywnyDzien]) })}
                  title="Kopiuj ten dzień do innego"
                >
                  ⎘ Kopiuj dzień
                </button>
              </div>
            )}
          </>
        )}

        {subTryb && (
          <button style={s.back} onClick={() => setSubTryb(null)}>← Wróć do dnia</button>
        )}

        {widok === 'tydzien' && !subTryb && (
          <WidokTygodnia
            dni={dni}
            plan={plan}
            daniaMap={daniaMap}
            onSelectDanie={onSelectDanie}
            onClickPusty={otworzDzien}
            onClickDzien={otworzDzien}
            onUsunPosilek={usunPosilek}
            onPrzeniesPosilek={przeniesPosilek}
            onKopiujTydzien={kopiujTydzien}
            slotyDlaDnia={slotyDlaDnia}
            nazwaSlotu={nazwaSlotu}
            kolorSlotu={kolorSlotu}
          />
        )}

        {widok === 'dzien' && (
          <WidokDnia
            dzien={dni[aktywnyDzien]}
            dni={dni}
            plan={plan}
            daniaMap={daniaMap}
            dodatkiMap={dodatkiMap}
            surowkiMap={surowkiMap}
            dania={dania}
            dodatki={dodatki}
            surowki={surowki}
            skladnikiDan={skladnikiDan}
            domyslnePorcje={domyslnePorcje}
            subTryb={subTryb}
            onSetSubTryb={setSubTryb}
            onSelectDanie={onSelectDanie}
            onUstawDanie={ustawDanie}
            onUstawSide={ustawSide}
            onUsunPosilek={usunPosilek}
            onUsunSide={usunSide}
            onZmienPorcje={zmienPorcje}
            onPodmien={(wpis) => setPodmianaModal(wpis)}
            onKopiujDzien={(zDataStr) => setKopiujModal({ zDataStr })}
            slotyDlaDnia={slotyDlaDnia}
            nazwaSlotu={nazwaSlotu}
            kolorSlotu={kolorSlotu}
            wieloDniModal={wieloDniModal}
            onWieloDniModal={setWieloDniModal}
            onZaplanujWieleDni={zaplanujNaWieleDni}
          />
        )}
      </div>

      {toast && (
        <div style={s.toast}>
          <span style={s.toastMsg}>{toast.msg}</span>
          {toast.onUndo && (
            <button style={s.toastBtn} onClick={toast.onUndo}>
              Cofnij
            </button>
          )}
        </div>
      )}

      {podmianaModal?.danie && (
        <PodmianaModal
          wpis={podmianaModal}
          onClose={() => setPodmianaModal(null)}
          onSave={(p) => { zapiszPodmiany(podmianaModal.id, p); setPodmianaModal(null) }}
        />
      )}

      {wyborDatyOpen && (
        <div style={modS.overlay} onClick={() => setWyborDatyOpen(false)}>
          <div style={modS.modal} onClick={e => e.stopPropagation()}>
            <div style={modS.header}>
              <div>
                <div style={modS.eyebrow}>WYBIERZ DATĘ</div>
                <div style={modS.title}>Przejdź do dnia</div>
                <div style={modS.sub}>Wybierz datę, a planer otworzy odpowiedni tydzień i konkretny dzień.</div>
              </div>
              <button style={modS.close} onClick={() => setWyborDatyOpen(false)}>✕</button>
            </div>
            <input
              type="date"
              value={wybranaData}
              onChange={e => setWybranaData(e.target.value)}
              style={s.dateInput}
              autoFocus
            />
            <div style={modS.btnRow}>
              <button style={{ ...ui.btnGhost, flex: 1, padding: '12px 16px' }} onClick={() => setWyborDatyOpen(false)}>
                Anuluj
              </button>
              <button style={{ ...ui.btnPrimary, flex: 1, padding: '12px 16px' }} onClick={() => przejdzDoDaty(wybranaData)}>
                Pokaż dzień
              </button>
            </div>
          </div>
        </div>
      )}

      {kopiujModal && (
        <KopiujModal
          zDataStr={kopiujModal.zDataStr}
          dni={dni}
          plan={plan}
          onClose={() => setKopiujModal(null)}
          onWybierz={(naDataStr) => {
            kopiujDzien(kopiujModal.zDataStr, naDataStr)
            setKopiujModal(null)
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function WidokTygodnia({
  dni, plan, daniaMap, onSelectDanie, onClickPusty, onClickDzien,
  onUsunPosilek, onPrzeniesPosilek, onKopiujTydzien,
  slotyDlaDnia, nazwaSlotu, kolorSlotu,
}) {
  const s = makeS()
  const maZawartosc = Object.values(plan).some(p => p.danie)
  const [dragSet, setDragSet] = useState(null)
  const [hoverKey, setHoverKey] = useState(null)

  const slotRefs = useRef({})
  const dragRef = useRef(null)
  const startRef = useRef(null)
  const longPressTimer = useRef(null)
  const edgeScrollDelta = useRef(0)
  const ignoreClickUntil = useRef(0)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const wyczyscDrag = useCallback(() => {
    clearLongPress()
    dragRef.current = null
    startRef.current = null
    edgeScrollDelta.current = 0
    setDragSet(null)
    setHoverKey(null)
  }, [clearLongPress])

  useEffect(() => {
    function loop() {
      if (edgeScrollDelta.current !== 0) {
        window.scrollBy(0, edgeScrollDelta.current)
      }
      const raf = requestAnimationFrame(loop)
      edgeScrollDelta.raf = raf
    }
    const raf = requestAnimationFrame(loop)
    edgeScrollDelta.raf = raf
    return () => cancelAnimationFrame(edgeScrollDelta.raf)
  }, [])

  function slotKey(dataStr, posilek) {
    return `${dataStr}__${posilek}`
  }

  function parsujSlotKey(key) {
    const [dataStr, posilek] = key.split('__')
    return { dataStr, posilek }
  }

  function ustawSlotRef(key, el) {
    if (el) slotRefs.current[key] = el
    else delete slotRefs.current[key]
  }

  function znajdzCel(x, y) {
    for (const [key, el] of Object.entries(slotRefs.current)) {
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key
    }
    return null
  }

  function podnies(start, x, y) {
    clearLongPress()
    const stan = {
      ...start,
      x,
      y,
      podniesiony: true,
      sourceKey: slotKey(start.dataStr, start.posilek),
    }
    dragRef.current = stan
    setDragSet(stan)
    ignoreClickUntil.current = Date.now() + 900
    navigator.vibrate?.(20)
  }

  function zacznijPointer(e, dataStr, posilek, wpis, meta) {
    if (!wpis?.danie) return
    if (e.pointerType === 'touch') return
    if (e.button != null && e.button !== 0) return
    if (e.target?.closest?.('button')) return

    const start = { dataStr, posilek, wpis, meta, x0: e.clientX, y0: e.clientY, pointerId: e.pointerId, typ: 'pointer' }
    startRef.current = start
    clearLongPress()
    longPressTimer.current = setTimeout(() => podnies(start, e.clientX, e.clientY), 220)
  }

  function zacznijTouch(e, dataStr, posilek, wpis, meta) {
    if (!wpis?.danie) return
    if (e.touches.length !== 1) return
    if (e.target?.closest?.('button')) return

    const touch = e.touches[0]
    const start = { dataStr, posilek, wpis, meta, x0: touch.clientX, y0: touch.clientY, touchId: touch.identifier, typ: 'touch' }
    startRef.current = start
    clearLongPress()
    longPressTimer.current = setTimeout(() => podnies(start, touch.clientX, touch.clientY), 320)
  }

  function aktualizujDrag(x, y) {
    const obecny = dragRef.current
    if (!obecny) return

    const stan = { ...obecny, x, y, podniesiony: true }
    dragRef.current = stan
    setDragSet(stan)

    const cel = znajdzCel(x, y)
    setHoverKey(cel && cel !== obecny.sourceKey ? cel : null)

    const vh = window.innerHeight
    if (y < EDGE_SCROLL_THRESHOLD) {
      edgeScrollDelta.current = -EDGE_SCROLL_SPEED * (1 - y / EDGE_SCROLL_THRESHOLD)
    } else if (y > vh - EDGE_SCROLL_THRESHOLD) {
      edgeScrollDelta.current = EDGE_SCROLL_SPEED * (1 - (vh - y) / EDGE_SCROLL_THRESHOLD)
    } else {
      edgeScrollDelta.current = 0
    }
  }

  function upusc(x, y) {
    const obecny = dragRef.current
    if (!obecny) {
      wyczyscDrag()
      return
    }

    const cel = znajdzCel(x, y)
    if (cel && cel !== obecny.sourceKey) {
      const target = parsujSlotKey(cel)
      onPrzeniesPosilek?.(obecny.dataStr, obecny.posilek, target.dataStr, target.posilek)
    }

    ignoreClickUntil.current = Date.now() + 600
    wyczyscDrag()
  }

  useEffect(() => {
    function pointerMove(e) {
      const start = startRef.current

      if (start?.typ === 'pointer' && !dragRef.current) {
        const dx = Math.abs(e.clientX - start.x0)
        const dy = Math.abs(e.clientY - start.y0)
        if (dx > 9 || dy > 9) {
          clearLongPress()
          startRef.current = null
        }
        return
      }

      if (!dragRef.current || dragRef.current.typ !== 'pointer') return
      if (dragRef.current.pointerId != null && e.pointerId !== dragRef.current.pointerId) return
      aktualizujDrag(e.clientX, e.clientY)
      if (e.cancelable) e.preventDefault()
    }

    function pointerUp(e) {
      if (dragRef.current?.typ === 'pointer') {
        upusc(e.clientX, e.clientY)
        return
      }
      clearLongPress()
      startRef.current = null
    }

    function touchMove(e) {
      const start = startRef.current
      const touch = Array.from(e.touches).find(t => t.identifier === (dragRef.current?.touchId ?? start?.touchId))
      if (!touch) return

      if (start?.typ === 'touch' && !dragRef.current) {
        const dx = Math.abs(touch.clientX - start.x0)
        const dy = Math.abs(touch.clientY - start.y0)
        if (dx > 10 || dy > 10) {
          clearLongPress()
          startRef.current = null
        }
        return
      }

      if (!dragRef.current || dragRef.current.typ !== 'touch') return
      aktualizujDrag(touch.clientX, touch.clientY)
      if (e.cancelable) e.preventDefault()
    }

    function touchEnd(e) {
      if (dragRef.current?.typ === 'touch') {
        const touch = Array.from(e.changedTouches).find(t => t.identifier === dragRef.current.touchId) || e.changedTouches[0]
        upusc(touch?.clientX ?? dragRef.current.x, touch?.clientY ?? dragRef.current.y)
        return
      }
      clearLongPress()
      startRef.current = null
    }

    function cancel() {
      wyczyscDrag()
    }

    window.addEventListener('pointermove', pointerMove, { passive: false })
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('touchmove', touchMove, { passive: false })
    window.addEventListener('touchend', touchEnd)
    window.addEventListener('touchcancel', cancel)

    return () => {
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('touchend', touchEnd)
      window.removeEventListener('touchcancel', cancel)
    }
  }, [clearLongPress, onPrzeniesPosilek, wyczyscDrag])

  return (
    <div style={s.tydzienList}>
      {!maZawartosc && (
        <button style={s.kopiujTydzienBtn} onClick={onKopiujTydzien}>
          ⎘ Skopiuj plan z poprzedniego tygodnia
        </button>
      )}
      {dni.map((dzien, di) => {
        const dataStr = formatData(dzien)
        const today = isDzis(dzien)
        const slotyDnia = slotyDlaDnia(dzien)
        const cols = slotyDnia.length <= 4 ? slotyDnia.length : 3
        const tileW = cols > 0 ? `calc(${(100/cols).toFixed(3)}% - ${((6*(cols-1))/cols).toFixed(2)}px)` : '100%'
        return (
          <section key={dataStr} style={s.dzienBlok}>
            <button type="button" style={s.dzienHeaderBtn} onClick={() => onClickDzien(di)}>
              <span style={s.dzienHeaderLeft}>
                <span style={s.dzienTytul}>{DNI_KROTKO[di]} {dzien.getDate()}</span>
                {today && <span style={s.todayChip}>DZIŚ</span>}
              </span>
              <span style={s.dzienHeaderHint}>Otwórz dzień</span>
            </button>
            <div style={s.kafelkiRzad}>
              {slotyDnia.map(posilek => {
                const key = slotKey(dataStr, posilek)
                const wpis = plan[`${dataStr}_${posilek}`]
                return (
                  <div key={posilek} style={{ flex: `0 0 ${tileW}`, maxWidth: tileW }}>
                    <KafelekPosilek
                      setRef={(el) => ustawSlotRef(key, el)}
                      posilek={posilek}
                      posilekLabel={nazwaSlotu(posilek)}
                      posilekKolor={kolorSlotu(posilek)}
                      wpis={wpis}
                      daniaMeta={daniaMap[wpis?.danie]}
                      podswietlony={hoverKey === key}
                      przeciagany={dragSet?.sourceKey === key}
                      onPointerDownDrag={(e) => zacznijPointer(e, dataStr, posilek, wpis, daniaMap[wpis?.danie])}
                      onTouchStartDrag={(e) => zacznijTouch(e, dataStr, posilek, wpis, daniaMap[wpis?.danie])}
                      onClick={() => {
                        if (Date.now() < ignoreClickUntil.current) return
                        if (wpis?.danie) onSelectDanie?.(wpis.danie)
                        else onClickPusty(di)
                      }}
                      onDelete={wpis?.danie ? () => onUsunPosilek(dataStr, posilek) : null}
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {dragSet?.podniesiony && (
        <div style={{ ...s.dragGhost, left: dragSet.x, top: dragSet.y }}>
          <div style={s.dragGhostThumb}>
            {dragSet.meta?.zdjecie ? (
              <img src={dragSet.meta.zdjecie} alt="" style={s.dragGhostImg} />
            ) : (
              <div style={{ ...s.dragGhostImg, background: kolorDania(dragSet.wpis?.danie), display: 'grid', placeItems: 'center' }}>
                <span style={{ fontSize: 24 }}>{emojiDania(dragSet.wpis?.danie)}</span>
              </div>
            )}
          </div>
          <div style={s.dragGhostName}>{dragSet.wpis?.danie}</div>
          <div style={s.dragGhostSub}>{nazwaSlotu ? nazwaSlotu(dragSet.posilek) : dragSet.posilek}</div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
function WidokDnia({
  dzien, dni, plan, daniaMap, dodatkiMap, surowkiMap,
  dania, dodatki, surowki, skladnikiDan, domyslnePorcje,
  subTryb, onSetSubTryb, onSelectDanie,
  onUstawDanie, onUstawSide,
  onUsunPosilek, onUsunSide,
  onZmienPorcje, onPodmien, onKopiujDzien,
  slotyDlaDnia, nazwaSlotu, kolorSlotu,
  wieloDniModal, onWieloDniModal, onZaplanujWieleDni,
}) {
  const s = makeS()
  const dataStr = formatData(dzien)
  const [filtr, setFiltr] = useState('')
  const [dragState, setDragState] = useState(null)

  // Refy do slotów (dla wykrywania drop): zarówno głównych jak i side-slotów
  // Klucz: `${posilek}` dla dania, `${posilek}_side_${i}` dla side-slotów
  const slotRefs = useRef({})
  const longPressTimer = useRef(null)
  const startPos = useRef(null)
  const dragRef = useRef(null)
  const edgeScrollRaf = useRef(null)

  // Czy dzień ma cokolwiek (do "Kopiuj ten dzień")
  const dzienMaZawartosc = useMemo(
    () => Object.values(plan).some(p => p.data === dataStr && p.danie),
    [plan, dataStr]
  )

  // Reset filtra przy zmianie sub-trybu / dnia
  useEffect(() => { setFiltr('') }, [subTryb?.typ, subTryb?.posilek, dataStr])

  const edgeScrollDelta = useRef(0)
  const activePointerIdRef = useRef(null)
  const capturedTargetRef = useRef(null)
  const lastTouchPointRef = useRef(null)

  const wyczyscGesture = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    edgeScrollDelta.current = 0

    if (capturedTargetRef.current && activePointerIdRef.current != null) {
      try {
        capturedTargetRef.current.releasePointerCapture(activePointerIdRef.current)
      } catch {}
    }

    capturedTargetRef.current = null
    activePointerIdRef.current = null
    startPos.current = null
    lastTouchPointRef.current = null
  }, [])

  const startDrag = useCallback((nazwa, typ, meta, x, y, target = null, pointerId = null) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Na desktopie / myszce przechwytujemy pointer dopiero po long-press.
    // Na telefonie ruch obsługują touchmove/touchend, bo mobilne przeglądarki
    // potrafią mimo pointer events przejąć gest jako scroll.
    if (target && pointerId != null) {
      activePointerIdRef.current = pointerId
      try {
        target.setPointerCapture?.(pointerId)
        capturedTargetRef.current = target
      } catch {}
    }

    const stan = { nazwa, typ, meta, x, y, podniesiony: true }
    dragRef.current = stan
    setDragState(stan)

    navigator.vibrate?.(20)
  }, [])

  const onPointerDownItem = useCallback((e, nazwa, typ, meta) => {
    // Touch obsługujemy osobnymi eventami touch*, bo to daje stabilny drag na telefonie.
    if (e.pointerType === 'touch') return
    if (e.pointerType === 'mouse' && e.button !== 0) return

    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    const x = e.clientX
    const y = e.clientY
    const target = e.currentTarget
    const pointerId = e.pointerId

    startPos.current = { x, y, nazwa, typ, meta, target, pointerId }
    activePointerIdRef.current = pointerId

    longPressTimer.current = setTimeout(() => {
      startDrag(nazwa, typ, meta, x, y, target, pointerId)
    }, 320)
  }, [startDrag])

  const onTouchStartItem = useCallback((e, nazwa, typ, meta) => {
    if (e.touches.length !== 1) return

    if (longPressTimer.current) clearTimeout(longPressTimer.current)

    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY

    startPos.current = { x, y, nazwa, typ, meta, isTouch: true }
    lastTouchPointRef.current = { x, y }
    activePointerIdRef.current = null

    longPressTimer.current = setTimeout(() => {
      startDrag(nazwa, typ, meta, x, y)
    }, 320)
  }, [startDrag])


  const znajdzPierwszyPustySideSlot = useCallback((posilek) => {
    const wpis = plan[`${dataStr}_${posilek}`]
    if (!wpis?.danie) return null

    const meta = daniaMap[wpis.danie]
    if (meta?.TYP !== 'z_dodatkiem') return null

    const dodatkiTab = Array.isArray(wpis.dodatki) ? wpis.dodatki : []
    for (let idx = 0; idx < 2; idx++) {
      if (!dodatkiTab[idx]) return idx
    }

    return null
  }, [plan, dataStr, daniaMap])

  // ── Edge scroll: jak drag jest blisko góry/dołu, scrolluj okno
  useEffect(() => {
    function loop() {
      if (edgeScrollDelta.current !== 0) {
        window.scrollBy(0, edgeScrollDelta.current)
      }
      edgeScrollRaf.current = requestAnimationFrame(loop)
    }
    edgeScrollRaf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(edgeScrollRaf.current)
  }, [])

  // ── Blokada scrolla strony, gdy kafelek jest podniesiony
  // Twarda blokada: overflow:hidden na html i body. Gwarantuje że strona
  // NIE będzie się scrollować podczas dragu, niezależnie od tego co robi
  // przeglądarka z eventami pointer. Działa też jako dodatkowa warstwa
  // dla pointer capture (3 niezależne warstwy obrony).
  useEffect(() => {
    if (!dragState?.podniesiony) return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      touchAction: body.style.touchAction,
      overscrollBehavior: body.style.overscrollBehavior,
    }

    // Telefon: po podniesieniu kafelka strona nie może przejąć gestu jako scroll.
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.touchAction = 'none'
    body.style.overscrollBehavior = 'none'

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.left = prev.bodyLeft
      body.style.right = prev.bodyRight
      body.style.width = prev.bodyWidth
      body.style.touchAction = prev.touchAction
      body.style.overscrollBehavior = prev.overscrollBehavior
      window.scrollTo(0, scrollY)
    }
  }, [dragState?.podniesiony])

  useEffect(() => {
    function znajdzCel(x, y) {
      // Sprawdzaj side-sloty przed głównym (są na wierzchu wizualnie i mniejsze)
      // Klucze: `${posilek}_side_0`, `${posilek}_side_1`, `${posilek}`
      const keys = Object.keys(slotRefs.current)
      // Sortuj: side przed głównym (po długości klucza)
      keys.sort((a, b) => b.length - a.length)

      for (const key of keys) {
        const el = slotRefs.current[key]
        if (!el) continue

        const r = el.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key
      }

      return null
    }

    function handleMove(e) {
      if (e.pointerType === 'touch') return
      if (activePointerIdRef.current != null && e.pointerId !== activePointerIdRef.current) return

      if (longPressTimer.current && startPos.current && !dragRef.current) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y

        // Normalny ruch palcem po galerii = scroll. Wtedy anulujemy long-press.
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          wyczyscGesture()
        }

        return
      }

      if (!dragRef.current) return

      const stan = {
        ...dragRef.current,
        x: e.clientX,
        y: e.clientY,
        podniesiony: true,
      }

      dragRef.current = stan
      setDragState(stan)

      // Edge scroll: blisko górnej / dolnej krawędzi viewportu
      const vh = window.innerHeight
      if (e.clientY < EDGE_SCROLL_THRESHOLD) {
        edgeScrollDelta.current = -EDGE_SCROLL_SPEED * (1 - e.clientY / EDGE_SCROLL_THRESHOLD)
      } else if (e.clientY > vh - EDGE_SCROLL_THRESHOLD) {
        edgeScrollDelta.current = EDGE_SCROLL_SPEED * (1 - (vh - e.clientY) / EDGE_SCROLL_THRESHOLD)
      } else {
        edgeScrollDelta.current = 0
      }

      if (e.cancelable) e.preventDefault()
    }

    function handleUp(e) {
      if (e.pointerType === 'touch') return
      if (activePointerIdRef.current != null && e.pointerId !== activePointerIdRef.current) return

      if (longPressTimer.current && !dragRef.current) {
        wyczyscGesture()
        return
      }

      const stan = dragRef.current

      if (stan) {
        let targetKey = null

        if (subTryb) {
          // W sub-trybie cel jest predefiniowany — pierwszy pusty side-slot lub konkretny
          targetKey = subTryb.posilek + '_side_' + (subTryb.slotIdx ?? 0)
        } else {
          targetKey = znajdzCel(e.clientX, e.clientY)
        }

        if (targetKey) {
          // Parsuj key: "Obiad" lub "Obiad_side_0"
          const sideMatch = targetKey.match(/^(.+)_side_(\d+)$/)

          if (sideMatch) {
            const posilek = sideMatch[1]
            const slotIdx = parseInt(sideMatch[2], 10)

            // Side-sloty przyjmują tylko dodatek/surówkę.
            if (stan.typ === 'dodatek' || stan.typ === 'surowka') {
              onUstawSide(dataStr, posilek, slotIdx, stan.nazwa, stan.typ)
              onSetSubTryb(null)
            }
          } else {
            const posilek = targetKey

            if (stan.typ === 'danie') {
              onUstawDanie(dataStr, posilek, stan.nazwa)
            } else if (stan.typ === 'dodatek' || stan.typ === 'surowka') {
              // Uproszczenie: dodatek/surówkę można upuścić na całym kafelku dania.
              // Aplikacja sama wybiera pierwszy pusty mini-slot.
              const slotIdx = znajdzPierwszyPustySideSlot(posilek)
              if (slotIdx != null) {
                onUstawSide(dataStr, posilek, slotIdx, stan.nazwa, stan.typ)
                onSetSubTryb(null)
              }
            }
          }
        }
      }

      dragRef.current = null
      setDragState(null)
      wyczyscGesture()
    }

    function handleCancel(e) {
      if (e.pointerType === 'touch') return
      if (activePointerIdRef.current != null && e.pointerId !== activePointerIdRef.current) return

      dragRef.current = null
      setDragState(null)
      wyczyscGesture()
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
    }
  }, [dataStr, subTryb, onUstawDanie, onUstawSide, onSetSubTryb, wyczyscGesture, znajdzPierwszyPustySideSlot])

  // ── Mobilny drag: osobna obsługa touch*, żeby scroll galerii był naturalny,
  // a po long-press ruch palca przesuwał kafelek, nie stronę.
  useEffect(() => {
    function znajdzCel(x, y) {
      const keys = Object.keys(slotRefs.current)
      keys.sort((a, b) => b.length - a.length)

      for (const key of keys) {
        const el = slotRefs.current[key]
        if (!el) continue

        const r = el.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key
      }

      return null
    }

    function aktualizujDrag(x, y) {
      if (!dragRef.current) return

      const stan = {
        ...dragRef.current,
        x,
        y,
        podniesiony: true,
      }

      dragRef.current = stan
      setDragState(stan)
      lastTouchPointRef.current = { x, y }
    }

    function upusc(x, y) {
      const stan = dragRef.current

      if (stan) {
        let targetKey = null

        if (subTryb) {
          targetKey = subTryb.posilek + '_side_' + (subTryb.slotIdx ?? 0)
        } else {
          targetKey = znajdzCel(x, y)
        }

        if (targetKey) {
          const sideMatch = targetKey.match(/^(.+)_side_(\d+)$/)

          if (sideMatch) {
            const posilek = sideMatch[1]
            const slotIdx = parseInt(sideMatch[2], 10)

            if (stan.typ === 'dodatek' || stan.typ === 'surowka') {
              onUstawSide(dataStr, posilek, slotIdx, stan.nazwa, stan.typ)
              onSetSubTryb(null)
            }
          } else {
            const posilek = targetKey

            if (stan.typ === 'danie') {
              onUstawDanie(dataStr, posilek, stan.nazwa)
            } else if (stan.typ === 'dodatek' || stan.typ === 'surowka') {
              // Uproszczenie: nie trzeba celować w mały mini-slot.
              // Drop na kafelek dania uzupełnia pierwszy pusty slot dodatku/surówki.
              const slotIdx = znajdzPierwszyPustySideSlot(posilek)
              if (slotIdx != null) {
                onUstawSide(dataStr, posilek, slotIdx, stan.nazwa, stan.typ)
                onSetSubTryb(null)
              }
            }
          }
        }
      }

      dragRef.current = null
      setDragState(null)
      wyczyscGesture()
    }

    function handleTouchMove(e) {
      if (!startPos.current?.isTouch && !dragRef.current) return
      if (e.touches.length !== 1) return

      const touch = e.touches[0]
      const x = touch.clientX
      const y = touch.clientY

      if (longPressTimer.current && startPos.current?.isTouch && !dragRef.current) {
        const dx = x - startPos.current.x
        const dy = y - startPos.current.y

        // Ruch przed long-pressem = normalny scroll galerii. Niczego nie blokujemy.
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          wyczyscGesture()
        }

        return
      }

      if (!dragRef.current || !startPos.current?.isTouch) return

      // Po long-press to już jest drag — blokujemy natywny scroll telefonu.
      if (e.cancelable) e.preventDefault()
      aktualizujDrag(x, y)
    }

    function handleTouchEnd(e) {
      if (!startPos.current?.isTouch && !dragRef.current) return

      if (longPressTimer.current && !dragRef.current) {
        wyczyscGesture()
        return
      }

      const point = lastTouchPointRef.current || startPos.current
      upusc(point.x, point.y)
    }

    function handleTouchCancel() {
      if (!startPos.current?.isTouch && !dragRef.current) return

      dragRef.current = null
      setDragState(null)
      wyczyscGesture()
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })
    window.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [dataStr, subTryb, onUstawDanie, onUstawSide, onSetSubTryb, wyczyscGesture, znajdzPierwszyPustySideSlot])

  // ── Filtrowanie galerii ──
  // Główny tryb galerii jest niezależny od kliknięcia mini-slotu:
  // można wybrać Dania / Dodatki / Surówki na górze i przeciągać od razu.
  const [filtrRodzaj, setFiltrRodzaj] = useState(() => sessionStorage.getItem('planer_filtrRodzaj') || 'wszystko')
  const [galeriaTryb, setGaleriaTryb] = useState(() => sessionStorage.getItem('planer_galeriaTryb') || 'danie')

  const typGalerii = subTryb?.typ || galeriaTryb

  function zmienTrybGalerii(id) {
    setGaleriaTryb(id)
    sessionStorage.setItem('planer_galeriaTryb', id)
    setFiltr('')

    if (subTryb) {
      if (id === 'danie') onSetSubTryb(null)
      else onSetSubTryb({ ...subTryb, typ: id })
    }
  }

  const galeriaItems = useMemo(() => {
    let lista

    if (typGalerii === 'dodatek') {
      lista = dodatki.map(d => ({ nazwa: d.Dodatek, zdjecie: d.zdjecie }))
    } else if (typGalerii === 'surowka') {
      lista = surowki.map(d => ({ nazwa: d['Surówka'], zdjecie: d.zdjecie }))
    } else {
      lista = dania
        .filter(d => {
          if (filtrRodzaj === 'wszystko') return true
          // 'przekaska' pasuje do wszystkich slotów — pokazuje się zawsze
          if (d.rodzaj === 'przekaska') return true
          return d.rodzaj === filtrRodzaj
        })
        .map(d => ({ nazwa: d.Danie, zdjecie: d.zdjecie, rodzaj: d.rodzaj }))
    }

    const q = filtr.trim().toLowerCase()
    if (!q) return lista

    return lista.filter(x => {
      if (x.nazwa?.toLowerCase().includes(q)) return true

      // Search po składnikach — tylko dla dań
      if (typGalerii === 'danie' && skladnikiDan?.[x.nazwa]) {
        for (const sk of skladnikiDan[x.nazwa]) {
          if (sk.includes(q)) return true
        }
      }

      return false
    })
  }, [typGalerii, dania, dodatki, surowki, filtr, filtrRodzaj, skladnikiDan])

  const tytulGalerii = subTryb
    ? `${typGalerii === 'surowka' ? 'Surówka' : 'Dodatek'} do: ${subTryb.posilek}`
    : 'Galeria'

  const planStickyStyle = dragState?.podniesiony
    ? {
        ...s.slotyDuzeSticky,
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(424px, calc(100vw - 36px))',
        zIndex: 9998,
      }
    : s.slotyDuzeSticky

  // Sloty dnia z konfiguracji household
  const slotyTegoDnia = useMemo(() => slotyDlaDnia(dzien), [slotyDlaDnia, dzien])
  // Liczba kolumn dopasowana do liczby slotów — żeby ładnie wyglądało
  const kolumnGrida = useMemo(() => {
    const n = slotyTegoDnia.length
    if (n <= 3) return 3
    if (n === 4) return 4
    if (n <= 6) return 3
    return 4
  }, [slotyTegoDnia.length])

  return (
    <div style={{ position: 'relative' }}>
      {/* STICKY: sloty z planem dnia na górze, zostają widoczne podczas scrolla */}
      <div style={{
        ...planStickyStyle,
        opacity: subTryb ? 0.55 : 1,
        transition: 'opacity .2s',
      }}>
        {subTryb && (
          <div style={s.dzienAkcje}>
            <button style={s.dzienAkcjaBtnText} onClick={() => onSetSubTryb(null)}>
              Anuluj wybór
            </button>
          </div>
        )}
        <div style={s.slotyDuze}>
          {slotyTegoDnia.map(posilek => {
            const wpis = plan[`${dataStr}_${posilek}`]
            const dragTyp = dragState?.podniesiony ? dragState.typ : null
            const podswietl = dragTyp === 'danie'
            const slotItemWidth = kolumnGrida === 4 ? 'calc(25% - 6px)' : 'calc(33.333% - 6px)'
            return (
              <SlotDuzy
                key={posilek}
                style={{ flex: `0 0 ${slotItemWidth}`, maxWidth: slotItemWidth }}
                setRef={(el) => { slotRefs.current[posilek] = el }}
                setSideRef={(idx, el) => { slotRefs.current[`${posilek}_side_${idx}`] = el }}
                posilek={posilek}
                posilekLabel={nazwaSlotu(posilek)}
                posilekKolor={kolorSlotu(posilek)}
                wpis={wpis}
                daniaMeta={daniaMap[wpis?.danie]}
                dodatkiMap={dodatkiMap}
                surowkiMap={surowkiMap}
                domyslnePorcje={domyslnePorcje}
                podswietlony={podswietl}
                podswietlSide={dragTyp === 'dodatek' || dragTyp === 'surowka' || (!dragTyp && (typGalerii === 'dodatek' || typGalerii === 'surowka'))}
                onClick={() => wpis?.danie && onSelectDanie?.(wpis.danie)}
                onUsun={() => onUsunPosilek(dataStr, posilek)}
                onUsunSide={(slotIdx) => onUsunSide(dataStr, posilek, slotIdx)}
                onZmienPorcje={(p) => onZmienPorcje(dataStr, posilek, p)}
                onPodmien={() => onPodmien(wpis)}
                onWybierzSide={(slotIdx) => {
                  setGaleriaTryb('dodatek')
                  onSetSubTryb({ dataStr, posilek, typ: 'dodatek', slotIdx })
                }}
              />
            )
          })}
        </div>

      </div>

      <section style={s.galeria}>
        <div style={s.galeriaHeader}>
          <h2 style={s.galeriaTytul}>{tytulGalerii}</h2>
          <input
            type="text"
            placeholder={typGalerii === 'danie' ? 'Szukaj po nazwie lub składniku…' : 'Szukaj…'}
            value={filtr}
            onChange={e => setFiltr(e.target.value)}
            style={s.szukaj}
          />
        </div>

        {/* Jeden dynamiczny pasek filtrów */}
        <div style={s.chipsRow}>
          <button
            style={{ ...s.chip, ...(typGalerii === 'danie' && filtrRodzaj === 'wszystko' ? s.chipOn : {}) }}
            onClick={() => { zmienTrybGalerii('danie'); setFiltrRodzaj('wszystko'); sessionStorage.setItem('planer_filtrRodzaj', 'wszystko') }}
          >
            Wszystko
          </button>
          {/* Dynamiczne kategorie z bazy (tylko te które istnieją w daniach) */}
          {[...new Set(dania.map(d => d.rodzaj).filter(Boolean))]
            .filter(r => r !== 'przekaska')
            .sort((a, b) => {
              const order = ['sniadanie', 'obiad', 'kolacja', 'zupa', 'deser']
              const ia = order.indexOf(a), ib = order.indexOf(b)
              if (ia === -1 && ib === -1) return a.localeCompare(b)
              if (ia === -1) return 1
              if (ib === -1) return -1
              return ia - ib
            })
            .map(rodzaj => {
              const labelMap = {
                sniadanie: 'Śniadania', obiad: 'Obiady', kolacja: 'Kolacje',
                zupa: 'Zupy', deser: 'Desery', przekaska: 'Przekąski', dodatek: 'Dodatki', surowka: 'Surówki',
              }
              return (
                <button
                  key={rodzaj}
                  style={{ ...s.chip, ...(typGalerii === 'danie' && filtrRodzaj === rodzaj ? s.chipOn : {}) }}
                  onClick={() => { zmienTrybGalerii('danie'); setFiltrRodzaj(rodzaj); sessionStorage.setItem('planer_filtrRodzaj', rodzaj) }}
                >
                  {labelMap[rodzaj] || rodzaj}
                </button>
              )
            })
          }
          {/* Dodatki i Surówki na końcu */}
          <button
            style={{ ...s.chip, ...(typGalerii === 'dodatek' ? s.chipOn : {}) }}
            onClick={() => zmienTrybGalerii('dodatek')}
          >
            Dodatki
          </button>
          <button
            style={{ ...s.chip, ...(typGalerii === 'surowka' ? s.chipOn : {}) }}
            onClick={() => zmienTrybGalerii('surowka')}
          >
            Surówki
          </button>
        </div>

        <div style={s.galeriaGrid}>
          {galeriaItems.map(item => (
            <GaleriaItem
              key={item.nazwa}
              item={item}
              typ={typGalerii}
              onPointerDown={(e) => onPointerDownItem(e, item.nazwa, typGalerii, item)}
              onTouchStart={(e) => onTouchStartItem(e, item.nazwa, typGalerii, item)}
              onTap={() => {
                if (typGalerii === 'danie') {
                  // Tap = szczegóły przepisu
                  onSelectDanie?.(item.nazwa)
                } else if (subTryb) {
                  // Tap = wybór szybki, omijamy drag
                  const slotIdx = subTryb.slotIdx ?? 0
                  onUstawSide(subTryb.dataStr, subTryb.posilek, slotIdx, item.nazwa, typGalerii)
                  onSetSubTryb(null)
                }
              }}
              aktywnyDrag={dragState?.podniesiony && dragState.nazwa === item.nazwa}
            />
          ))}
        </div>
        {galeriaItems.length === 0 && (
          <div style={s.brakDan}>Brak pasujących pozycji.</div>
        )}

      </section>

      {dragState?.podniesiony && (
        <div style={{ ...s.dragGhost, left: dragState.x, top: dragState.y }}>
          <div style={s.dragGhostThumb}>
            {dragState.meta?.zdjecie ? (
              <img src={dragState.meta.zdjecie} alt="" style={s.dragGhostImg} />
            ) : (
              <div style={{ ...s.dragGhostImg, background: kolorDania(dragState.nazwa), display: 'grid', placeItems: 'center' }}>
                <span style={{ fontSize: 24 }}>{emojiDania(dragState.nazwa)}</span>
              </div>
            )}
          </div>
          <div style={s.dragGhostName}>{dragState.nazwa}</div>
        </div>
      )}

      {wieloDniModal && (
        <WieloDniModal
          danie={wieloDniModal.danie}
          posilek={wieloDniModal.posilek}
          domyslnaData={wieloDniModal.dataStr}
          dni={dni}
          plan={plan}
          nazwaSlotu={nazwaSlotu}
          onClose={() => onWieloDniModal(null)}
          onPodgladDania={() => { onWieloDniModal(null); onSelectDanie?.(wieloDniModal.danie) }}
          onZatwierdz={(wybraneDni) => {
            onZaplanujWieleDni(wieloDniModal.danie, wieloDniModal.posilek, wybraneDni)
            onWieloDniModal(null)
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function KafelekPosilek({ posilek, posilekLabel, posilekKolor, wpis, daniaMeta, onClick, onDelete, setRef, onPointerDownDrag, onTouchStartDrag, podswietlony, przeciagany, style }) {
  const s = makeS()
  const masDanie = !!wpis?.danie
  const label = (posilekLabel || posilek || '').toUpperCase()
  const kolor = posilekKolor || 'rgba(120,100,70,.92)'

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      ref={setRef}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onPointerDown={onPointerDownDrag}
      onTouchStart={onTouchStartDrag}
      style={{
        ...s.kafelek,
        ...style,
        ...(masDanie ? {} : s.kafelekPusty),
        ...(podswietlony ? s.kafelekDropHover : {}),
        opacity: przeciagany ? 0.35 : 1,
      }}
    >
      {masDanie ? (
        <>
          {daniaMeta?.zdjecie ? (
            <img src={daniaMeta.zdjecie} alt={wpis.danie} style={s.kafelekImg} />
          ) : (
            <div style={{ ...s.kafelekImg, background: kolorDania(wpis.danie), display: 'grid', placeItems: 'center' }}>
              <span style={{ fontSize: 36 }}>{emojiDania(wpis.danie)}</span>
            </div>
          )}
          <span style={{ ...s.kafelekLabel, background: kolor }}>
            {label}
          </span>
          {onDelete && (
            <button
              type="button"
              style={s.kafelekDelete}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label={`Usuń ${label}`}
              title="Usuń z planu"
            >
              ✕
            </button>
          )}
          <div style={s.kafelekNazwa}>
            <span style={s.kafelekNazwaTxt}>{wpis.danie}</span>
          </div>
        </>
      ) : (
        <div style={s.kafelekPustyInner}>
          <span style={s.kafelekPustyLabel}>{label}</span>
          <span style={s.kafelekPustyPlus}>+</span>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function SlotDuzy({
  setRef, setSideRef, posilek, posilekLabel, posilekKolor, wpis, daniaMeta, dodatkiMap, surowkiMap,
  domyslnePorcje, podswietlony, podswietlSide,
  onClick, onUsun, onUsunSide,
  onZmienPorcje, onPodmien,
  onWybierzSide, style,
}) {
  const s = makeS()
  const masDanie = !!wpis?.danie
  const typDania = daniaMeta?.TYP
  const porcje = wpis?.porcje != null ? wpis.porcje : domyslnePorcje
  const porcjeRozne = wpis?.porcje != null && wpis.porcje !== domyslnePorcje
  const liczbaPodmian = wpis?.podmiany ? Object.keys(wpis.podmiany).filter(k => wpis.podmiany[k]).length : 0
  const label = (posilekLabel || posilek || '').toUpperCase()
  const kolor = posilekKolor || 'rgba(120,100,70,.92)'

  function navPorcje(delta, e) {
    e.stopPropagation()
    const nowe = Math.max(0.5, Math.min(20, +(porcje + delta).toFixed(1)))
    onZmienPorcje(nowe === domyslnePorcje ? null : nowe)
  }

  // Side-sloty: 2 niezależne sloty, każdy może być dodatkiem lub surówką
  // (lub być pusty). Tablica wpis.dodatki = [{nazwa, typ}, ...]
  const dodatkiTab = Array.isArray(wpis?.dodatki) ? wpis.dodatki : []
  const sideSloty = [0, 1].map(idx => {
    const slot = dodatkiTab[idx] || null
    if (!slot) return { idx, nazwa: null, typ: null, meta: null }
    const meta = slot.typ === 'dodatek' ? dodatkiMap[slot.nazwa] : surowkiMap[slot.nazwa]
    return { idx, nazwa: slot.nazwa, typ: slot.typ, meta }
  })

  return (
    <div style={{ position: 'relative', ...style }}>
      <button
        ref={setRef}
        onClick={onClick}
        style={{
          ...s.slotDuzy,
          ...(masDanie ? {} : s.slotDuzyPusty),
          ...(podswietlony ? s.slotDuzyPodswietlony : {}),
        }}
      >
        {masDanie ? (
          <>
            {daniaMeta?.zdjecie ? (
              <img src={daniaMeta.zdjecie} alt={wpis.danie} style={s.kafelekImg} />
            ) : (
              <div style={{ ...s.kafelekImg, background: kolorDania(wpis.danie), display: 'grid', placeItems: 'center' }}>
                <span style={{ fontSize: 48 }}>{emojiDania(wpis.danie)}</span>
              </div>
            )}
            <span style={{ ...s.kafelekLabel, background: kolor }}>
              {label}
            </span>
            <div style={s.kafelekNazwa}>
              <span style={s.kafelekNazwaTxt}>{wpis.danie}</span>
            </div>
          </>
        ) : (
          <div style={s.kafelekPustyInner}>
            <span style={s.kafelekPustyLabel}>{label}</span>
            <span style={s.kafelekPustyPlus}>+</span>
          </div>
        )}
      </button>

      {masDanie && (
        <div style={s.slotKontrolki}>
          <div style={s.porcjeWidget}>
            <button style={s.porcjeMini} onClick={(e) => navPorcje(-0.5, e)}>−</button>
            <span style={{ ...s.porcjeWart, color: porcjeRozne ? t.warm : t.text }}>{porcje}</span>
            <button style={s.porcjeMini} onClick={(e) => navPorcje(0.5, e)}>+</button>
          </div>
          <button style={s.malyBtn} onClick={(e) => { e.stopPropagation(); onPodmien() }} title="Podmień składniki">
            ↻{liczbaPodmian > 0 ? ` ${liczbaPodmian}` : ''}
          </button>
          <button style={s.malyBtn} onClick={(e) => { e.stopPropagation(); onUsun() }} title="Usuń posiłek">✕</button>
        </div>
      )}

      {masDanie && typDania === 'z_dodatkiem' && (
        <div style={s.miniSloty}>
          {sideSloty.map(slot => (
            <MiniSlot
              key={slot.idx}
              setRef={(el) => setSideRef(slot.idx, el)}
              nazwa={slot.nazwa}
              typ={slot.typ}
              meta={slot.meta}
              podswietlony={podswietlSide && !slot.nazwa}
              onClickPelny={() => onUsunSide(slot.idx)}
              onClickPusty={() => onWybierzSide(slot.idx)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MiniSlot({ setRef, nazwa, typ, meta, podswietlony, onClickPelny, onClickPusty }) {
  const s = makeS()
  const masWybor = !!nazwa
  // Etykieta zależy od typu obecnej zawartości
  const label = typ === 'dodatek' ? 'Dodatek' : typ === 'surowka' ? 'Surówka' : '+ Dodaj'
  return (
    <button
      ref={setRef}
      onClick={masWybor ? onClickPelny : onClickPusty}
      style={{
        ...s.miniSlot,
        ...(masWybor ? {} : s.miniSlotPusty),
        ...(podswietlony ? s.miniSlotPodswietlony : {}),
      }}
    >
      {masWybor ? (
        <>
          {meta?.zdjecie ? (
            <img src={meta.zdjecie} alt={nazwa} style={s.kafelekImg} />
          ) : (
            <div style={{ ...s.kafelekImg, background: kolorDania(nazwa), display: 'grid', placeItems: 'center' }}>
              <span style={{ fontSize: 18 }}>{emojiDania(nazwa)}</span>
            </div>
          )}
          <span style={s.miniSlotLabel}>{label.toUpperCase()}</span>
        </>
      ) : (
        <div style={s.miniSlotPustyInner}>
          <span style={s.miniSlotPustyTxt}>{label}</span>
        </div>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
function GaleriaItem({ item, onPointerDown, onTouchStart, onTap, aktywnyDrag }) {
  const s = makeS()
  const downPos = useRef(null)
  const touchPos = useRef(null)

  function handlePointerDown(e) {
    // Touch ma osobny tor obsługi. Pointer zostaje dla myszy/trackpada.
    if (e.pointerType === 'touch') return

    downPos.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    onPointerDown(e)
  }

  function handlePointerUp(e) {
    if (e.pointerType === 'touch') return

    if (downPos.current && !aktywnyDrag) {
      const dt = Date.now() - downPos.current.t
      const dx = Math.abs(e.clientX - downPos.current.x)
      const dy = Math.abs(e.clientY - downPos.current.y)
      if (dt < 180 && dx < 10 && dy < 10) onTap()
    }

    downPos.current = null
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    touchPos.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), moved: false }
    onTouchStart(e)
  }

  function handleTouchMove(e) {
    if (!touchPos.current || e.touches.length !== 1) return

    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchPos.current.x)
    const dy = Math.abs(touch.clientY - touchPos.current.y)
    if (dx > 10 || dy > 10) touchPos.current.moved = true
  }

  function handleTouchEnd() {
    if (touchPos.current && !touchPos.current.moved && !aktywnyDrag) {
      const dt = Date.now() - touchPos.current.t
      if (dt < 180) onTap()
    }

    touchPos.current = null
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ ...s.galeriaItem, opacity: aktywnyDrag ? 0.3 : 1 }}
    >
      <div style={s.galeriaThumb}>
        {item.zdjecie ? (
          <img src={item.zdjecie} alt={item.nazwa} style={s.galeriaImg} draggable={false} />
        ) : (
          <div style={{ ...s.galeriaImg, background: kolorDania(item.nazwa), display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{emojiDania(item.nazwa)}</span>
          </div>
        )}
      </div>
      <div style={s.galeriaNazwa}>{item.nazwa}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// Modal: zaplanuj danie na wiele dni tygodnia naraz
function WieloDniModal({ danie, posilek, domyslnaData, dni, plan, nazwaSlotu, onClose, onPodgladDania, onZatwierdz }) {
  const nazwaP = nazwaSlotu(posilek) || posilek

  // Domyślnie zaznacz dzień z którego otwarto modal
  const domyslnyIdx = dni.findIndex(d => formatData(d) === domyslnaData)
  const [zaznaczone, setZaznaczone] = useState(
    new Set(domyslnyIdx >= 0 ? [domyslnyIdx] : [])
  )

  function toggleDzien(i) {
    setZaznaczone(prev => {
      const n = new Set(prev)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  function zatwierdz() {
    const wybraneDni = [...zaznaczone].sort((a, b) => a - b).map(i => formatData(dni[i]))
    if (wybraneDni.length === 0) return
    onZatwierdz(wybraneDni)
  }

  const s = makeS()

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.wieloDniSheet} onClick={e => e.stopPropagation()}>
        <div style={s.wieloDniHeader}>
          <div>
            <div style={s.wieloDniEyebrow}>{nazwaP.toUpperCase()}</div>
            <div style={s.wieloDniTytul}>{danie}</div>
          </div>
          <button style={s.wieloDniClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.wieloDniSub}>Wybierz dni tygodnia</div>

        <div style={s.wieloDniDni}>
          {DNI_KROTKO.map((label, i) => {
            const dataStr = formatData(dni[i])
            const zaznaczony = zaznaczone.has(i)
            const maJuz = !!plan[`${dataStr}_${posilek}`]?.danie
            return (
              <button
                key={i}
                style={{
                  ...s.wieloDniBtn,
                  ...(zaznaczony ? s.wieloDniBtnAktywny : {}),
                  ...(maJuz && !zaznaczony ? s.wieloDniBtnMaJuz : {}),
                }}
                onClick={() => toggleDzien(i)}
              >
                <span style={s.wieloDniBtnLabel}>{label}</span>
                <span style={s.wieloDniBtnDate}>{dni[i].getDate()}</span>
                {maJuz && <span style={s.wieloDniKropka} />}
              </button>
            )
          })}
        </div>

        <div style={s.wieloDniAkcje}>
          <button style={s.wieloDniBtnPodglad} onClick={onPodgladDania}>
            Zobacz przepis
          </button>
          <button
            style={{ ...s.wieloDniBtnZatwierdz, opacity: zaznaczone.size === 0 ? 0.45 : 1 }}
            onClick={zatwierdz}
            disabled={zaznaczone.size === 0}
          >
            Zaplanuj ({zaznaczone.size})
          </button>
        </div>
      </div>
    </div>
  )
}

function KopiujModal({ zDataStr, dni, plan, onClose, onWybierz }) {
  const ileWZrodlowym = Object.values(plan).filter(p => p.data === zDataStr && p.danie).length

  return (
    <div style={modS.overlay} onClick={onClose}>
      <div style={modS.modal} onClick={e => e.stopPropagation()}>
        <div style={modS.header}>
          <div>
            <div style={modS.eyebrow}>KOPIUJ DZIEŃ</div>
            <div style={modS.title}>Wybierz dzień docelowy</div>
            <div style={modS.sub}>
              Kopiowane: {ileWZrodlowym} {ileWZrodlowym === 1 ? 'posiłek' : 'posiłki'}.
              Plan w dniu docelowym zostanie zastąpiony.
            </div>
          </div>
          <button style={modS.close} onClick={onClose}>✕</button>
        </div>
        <div style={modS.lista}>
          {dni.map((dzien, i) => {
            const dStr = formatData(dzien)
            const isSelf = dStr === zDataStr
            const ileTam = Object.values(plan).filter(p => p.data === dStr && p.danie).length
            return (
              <button
                key={dStr}
                style={{
                  ...modS.dzienRow,
                  opacity: isSelf ? 0.4 : 1,
                  cursor: isSelf ? 'not-allowed' : 'pointer',
                }}
                disabled={isSelf}
                onClick={() => !isSelf && onWybierz(dStr)}
              >
                <span style={modS.dzienRowName}>
                  {DNI_KROTKO[i]} {dzien.getDate()}
                  {isSelf && <span style={modS.dzienRowSelf}> (źródło)</span>}
                </span>
                <span style={modS.dzienRowMeta}>
                  {ileTam > 0 ? `${ileTam} posiłków — zostanie nadpisany` : 'pusty'}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function PodmianaModal({ wpis, onClose, onSave }) {
  const [skladniki, setSkladniki] = useState([])
  const [podmiany, setPodmiany] = useState(wpis.podmiany || {})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function pobierz() {
      // Lista wszystkich nazw do sprawdzenia: główne danie + każdy side-slot
      const nazwy = []
      if (wpis.danie) nazwy.push(wpis.danie)
      const dodatkiTab = Array.isArray(wpis.dodatki) ? wpis.dodatki : []
      dodatkiTab.forEach(d => { if (d?.nazwa) nazwy.push(d.nazwa) })

      if (nazwy.length === 0) {
        setSkladniki([])
        setLoading(false)
        return
      }
      const { data } = await supabase.from('dania')
        .select('"Składnik"').in('"Danie"', nazwy)
      const wszystkie = (data || []).map(x => x['Składnik']).filter(Boolean)
      setSkladniki([...new Set(wszystkie)])
      setLoading(false)
    }
    pobierz()
  }, [wpis.danie, JSON.stringify(wpis.dodatki || [])])

  function ustaw(sk, n) {
    setPodmiany(p => {
      const x = { ...p }
      if (!n || n.trim() === '' || n.trim() === sk) delete x[sk]
      else x[sk] = n.trim()
      return x
    })
  }

  return (
    <div style={modS.overlay} onClick={onClose}>
      <div style={modS.modal} onClick={e => e.stopPropagation()}>
        <div style={modS.header}>
          <div>
            <div style={modS.eyebrow}>PODMIEŃ SKŁADNIKI</div>
            <div style={modS.title}>{wpis.danie}</div>
            <div style={modS.sub}>Tylko ten posiłek — przepis bazowy bez zmian.</div>
          </div>
          <button style={modS.close} onClick={onClose}>✕</button>
        </div>
        {loading ? (
          <div style={modS.loading}>Ładuję składniki…</div>
        ) : skladniki.length === 0 ? (
          <div style={modS.loading}>Brak składników do podmiany.</div>
        ) : (
          <div style={modS.lista}>
            {skladniki.map(sk => (
              <div key={sk} style={modS.row}>
                <div style={modS.orig}>{sk}</div>
                <span style={modS.arrow}>→</span>
                <input style={modS.input} placeholder="bez zmian"
                  value={podmiany[sk] || ''} onChange={e => ustaw(sk, e.target.value)} />
              </div>
            ))}
          </div>
        )}
        <div style={modS.btnRow}>
          <button style={{ ...ui.btnGhost, flex: 1, padding: '12px 16px' }} onClick={onClose}>Anuluj</button>
          <button style={{ ...ui.btnPrimary, flex: 1, padding: '12px 16px' }} onClick={() => onSave(podmiany)}>Zapisz</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function makeS() {
  return {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '20px 18px 32px', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 10px', display: 'block' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  eyebrow: { ...ui.eyebrow, fontSize: 10.5, marginBottom: 6, color: t.warm },
  monthBtn: {
    ...ui.eyebrow,
    fontSize: 10.5,
    marginBottom: 6,
    color: t.warm,
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left',
  },
  title: { ...ui.h1, fontSize: 36, lineHeight: 0.95 },
  italic: { fontStyle: 'italic', color: t.text, fontFamily: fonts.serif },
  headerActions: { display: 'flex', gap: 8 },
  navBtn: {
    width: 36, height: 36, borderRadius: 999,
    border: `1px solid ${t.border}`, background: t.surface,
    fontFamily: fonts.serif, fontSize: 20, color: t.text,
    cursor: 'pointer', display: 'grid', placeItems: 'center',
  },
  dayStrip: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 18 },
  dayPill: {
    padding: '8px 0 7px', borderRadius: 14, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    fontFamily: fonts.sans, transition: 'background .15s',
    background: 'transparent', border: '1px solid transparent',
  },
  dayPillDow: { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
  dayPillDate: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 1, letterSpacing: -0.3 },
  dayPillDots: { display: 'flex', gap: 2.5, marginTop: 3 },
  dot: { width: 4, height: 4, borderRadius: 999 },
  wrocTydzienBtn: { ...ui.btnText, padding: '0 0 12px', display: 'inline-block', color: t.mute, fontSize: 12 },
  dateInput: {
    ...ui.input,
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: 16,
    padding: '13px 14px',
    fontSize: 16,
  },

  tydzienList: { display: 'flex', flexDirection: 'column', gap: 16 },
  dzienBlok: {},
  dzienHeader: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: '0 2px' },
  dzienHeaderBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    padding: '2px 4px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: fonts.sans,
    textAlign: 'left',
  },
  dzienHeaderLeft: { display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 },
  dzienHeaderHint: { fontSize: 10.5, color: t.muteLight, fontWeight: 600 },
  dzienTytul: { ...ui.h3, fontSize: 17, color: t.text, textTransform: 'capitalize' },
  todayChip: {
    fontFamily: fonts.sans, fontSize: 9, fontWeight: 800, color: t.warm, letterSpacing: 1.2,
    padding: '1px 6px', background: t.warmSoft, borderRadius: 4,
  },
  kafelkiRzad: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },

  kafelek: {
    position: 'relative', aspectRatio: '1', borderRadius: 16,
    background: t.surface, border: 'none', cursor: 'pointer',
    overflow: 'hidden', padding: 0, fontFamily: fonts.sans,
    boxShadow: '0 1px 2px rgba(74,55,40,.06), 0 6px 16px rgba(74,55,40,.06)',
    touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
  },
  kafelekDropHover: {
    outline: `3px solid ${t.warm}`,
    outlineOffset: 2,
    boxShadow: '0 0 0 5px rgba(196,90,50,.16), 0 8px 24px rgba(74,55,40,.18)',
    transform: 'scale(1.015)',
  },
  kafelekImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  kafelekLabel: {
    position: 'absolute', top: 8, left: 8,
    color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 1.2,
    padding: '3px 7px', borderRadius: 5,
  },
  kafelekDelete: {
    position: 'absolute', top: 7, right: 7,
    width: 26, height: 26, borderRadius: 999,
    border: 'none', background: 'rgba(0,0,0,.58)', color: '#fff',
    fontSize: 13, fontWeight: 800, lineHeight: '26px',
    display: 'grid', placeItems: 'center',
    cursor: 'pointer', zIndex: 3,
    boxShadow: '0 3px 10px rgba(0,0,0,.2)',
  },
  kafelekNazwa: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 8px 8px',
    background: 'linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,0))',
    color: '#fff',
  },
  kafelekNazwaTxt: {
    fontFamily: fonts.sans, fontSize: 11.5, fontWeight: 600, lineHeight: 1.2,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  kafelekPusty: { background: t.surfaceAlt, border: `1.5px dashed ${t.borderStrong}`, boxShadow: 'none' },
  kafelekPustyInner: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  kafelekPustyLabel: {
    fontFamily: fonts.sans, fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
    color: t.muteLight, textTransform: 'uppercase',
  },
  kafelekPustyPlus: { fontFamily: fonts.serif, fontSize: 26, color: t.muteLight, lineHeight: 1 },

  slotyDuzeSticky: {
    position: 'sticky', top: 0, zIndex: 50,
    background: t.bg,
    paddingTop: 4, paddingBottom: 8,
    // Lekka linia na dole gdy sticky się "przykleja" - subtelnie
    boxShadow: '0 4px 12px -8px rgba(74,55,40,.15)',
  },
  slotyDuze: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  slotDuzy: {
    position: 'relative', width: '100%', aspectRatio: '1', borderRadius: 16,
    background: t.surface, border: 'none', cursor: 'pointer', overflow: 'hidden', padding: 0,
    boxShadow: '0 1px 2px rgba(74,55,40,.06), 0 6px 16px rgba(74,55,40,.06)',
    transition: 'transform .15s, box-shadow .15s',
  },
  slotDuzyPusty: { background: t.surfaceAlt, border: `1.5px dashed ${t.borderStrong}`, boxShadow: 'none' },
  slotDuzyPodswietlony: {
    transform: 'scale(1.04)',
    boxShadow: `0 0 0 3px ${t.warm}, 0 8px 24px rgba(196,90,50,.3)`,
  },
  slotKontrolki: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, gap: 4,
  },
  porcjeWidget: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: t.surfaceAlt, borderRadius: 999, padding: '0 2px',
  },
  porcjeMini: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: t.text, width: 20, height: 22, fontSize: 13,
    fontFamily: fonts.serif, lineHeight: 1, display: 'grid', placeItems: 'center',
  },
  porcjeWart: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 700,
    minWidth: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
  },
  malyBtn: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 24, minWidth: 24, height: 22, fontSize: 10.5, color: t.mute,
    cursor: 'pointer', fontFamily: fonts.sans, fontWeight: 600,
    display: 'grid', placeItems: 'center', padding: '0 6px',
  },

  miniSloty: { display: 'flex', gap: 4, marginTop: 4 },
  miniSlot: {
    flex: 1, position: 'relative', aspectRatio: '2',
    borderRadius: 10, background: t.surface, border: 'none',
    cursor: 'pointer', overflow: 'hidden', padding: 0,
    boxShadow: '0 1px 2px rgba(74,55,40,.06)',
    transition: 'transform .15s, box-shadow .15s',
  },
  miniSlotLabel: {
    position: 'absolute', top: 4, left: 4,
    color: '#fff', fontSize: 7.5, fontWeight: 800, letterSpacing: 1,
    padding: '2px 5px', borderRadius: 3,
    background: 'rgba(0,0,0,.55)',
  },
  miniSlotPusty: { background: t.surfaceAlt, border: `1px dashed ${t.border}`, boxShadow: 'none' },
  miniSlotPodswietlony: {
    transform: 'scale(1.06)',
    boxShadow: `0 0 0 2px ${t.warm}, 0 4px 12px rgba(196,90,50,.25)`,
    borderColor: t.warm,
  },
  miniSlotPustyInner: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  miniSlotPustyTxt: { fontSize: 9.5, color: t.mute, fontFamily: fonts.sans, fontWeight: 600 },

  // Pasek akcji dla dnia (kopiuj, anuluj sub-tryb)
  dzienAkcje: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
    marginTop: 10,
  },
  dzienAkcjaBtn: {
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 999, padding: '6px 12px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    color: t.text, cursor: 'pointer',
  },
  dzienAkcjaBtnText: {
    background: 'transparent', border: 'none',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    color: t.warm, cursor: 'pointer', padding: '6px 12px',
  },

  // Główne taby galerii
  trybGaleriiRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
    background: t.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 10,
  },
  trybGaleriiBtn: {
    background: 'transparent', border: 'none', borderRadius: 10,
    padding: '8px 6px', fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 700,
    color: t.mute, cursor: 'pointer',
  },
  trybGaleriiBtnOn: {
    background: t.surface, color: t.text, boxShadow: '0 1px 2px rgba(74,55,40,.08)',
  },

  // Filtr-chipy galerii
  chipsRow: {
    display: 'flex', gap: 6, marginBottom: 12,
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none', padding: '2px 0',
  },
  chip: {
    background: t.surfaceAlt, border: 'none',
    borderRadius: 999, padding: '6px 12px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    color: t.mute, cursor: 'pointer', whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipOn: { background: t.warm, color: '#fff' },

  // Taby w sub-trybie (dodatek/surówka)
  subTrybTaby: {
    display: 'flex', gap: 0, marginTop: 16,
    background: t.surfaceAlt, borderRadius: 12, padding: 3,
  },
  subTrybTab: {
    flex: 1, background: 'transparent', border: 'none',
    borderRadius: 9, padding: '8px 12px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    color: t.mute, cursor: 'pointer',
  },
  subTrybTabOn: { background: t.surface, color: t.text, boxShadow: '0 1px 2px rgba(74,55,40,.08)' },

  kopiujTydzienBtn: {
    background: t.surface, border: `1px dashed ${t.borderStrong}`,
    borderRadius: 14, padding: '14px 16px',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 600,
    color: t.warm, cursor: 'pointer',
    marginBottom: 6,
  },

  galeria: { marginTop: 14 },
  galeriaHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  galeriaTytul: { ...ui.h2, fontSize: 18, flex: 1 },
  szukaj: { ...ui.input, padding: '8px 12px', fontSize: 13, maxWidth: 140 },
  galeriaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  galeriaItem: {
    display: 'flex', flexDirection: 'column', gap: 6,
    background: 'transparent', border: 'none', padding: 0,
    cursor: 'pointer', fontFamily: fonts.sans, textAlign: 'left',
    // pan-y zostawia natywny pionowy scroll galerii; drag startuje dopiero po long-press.
    touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
  },
  galeriaThumb: {
    aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
    position: 'relative', background: t.surfaceAlt,
  },
  galeriaImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' },
  galeriaNazwa: {
    fontSize: 11.5, color: t.text, lineHeight: 1.25,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', padding: '0 2px',
  },
  brakDan: { textAlign: 'center', padding: 24, color: t.mute, fontSize: 13 },

  dragGhost: {
    position: 'fixed', zIndex: 9999, pointerEvents: 'none',
    transform: 'translate(-50%, -50%) scale(1.05)',
    background: t.surface, borderRadius: 16,
    boxShadow: '0 12px 32px rgba(0,0,0,.25)',
    padding: 8, width: 110,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  dragGhostThumb: {
    width: 80, height: 80, borderRadius: 12, overflow: 'hidden',
    position: 'relative', flexShrink: 0,
  },
  dragGhostImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  dragGhostName: {
    fontFamily: fonts.sans, fontSize: 10, color: t.text, fontWeight: 600,
    textAlign: 'center', lineHeight: 1.2,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  dragGhostSub: {
    fontFamily: fonts.sans, fontSize: 9, color: t.mute,
    fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
  },

  toast: {
    position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff', borderRadius: 12, padding: '10px 14px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 200,
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex', alignItems: 'center', gap: 14,
  },
  toastMsg: { color: '#fff', flex: 1 },
  toastBtn: {
    background: 'none', border: 'none',
    color: t.warmSoft || '#FBD3C2',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', padding: '4px 6px',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },

  // WieloDniModal
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1100,
    background: 'rgba(20,15,10,.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  wieloDniSheet: {
    background: t.surface, borderRadius: '22px 22px 0 0',
    padding: '22px 20px 32px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(0,0,0,.25)',
    fontFamily: fonts.sans,
  },
  wieloDniHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 4,
  },
  wieloDniEyebrow: { ...ui.eyebrow, marginBottom: 3 },
  wieloDniTytul: {
    fontFamily: fonts.serif, fontSize: 20, color: t.text,
    letterSpacing: -0.2, lineHeight: 1.15,
  },
  wieloDniClose: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
    flexShrink: 0,
  },
  wieloDniSub: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute,
    marginBottom: 14, marginTop: 2,
  },
  wieloDniDni: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
    marginBottom: 18,
  },
  wieloDniBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '8px 4px', borderRadius: 12,
    background: t.surfaceAlt, border: `1px solid ${t.border}`,
    cursor: 'pointer', position: 'relative',
  },
  wieloDniBtnAktywny: {
    background: t.accentSoft, borderColor: t.accent,
  },
  wieloDniBtnMaJuz: {
    borderStyle: 'dashed',
  },
  wieloDniBtnLabel: {
    fontFamily: fonts.sans, fontSize: 9.5, fontWeight: 700,
    letterSpacing: 0.5, textTransform: 'uppercase', color: t.mute,
  },
  wieloDniBtnDate: {
    fontFamily: fonts.serif, fontSize: 16, color: t.text, lineHeight: 1,
  },
  wieloDniKropka: {
    position: 'absolute', bottom: 4,
    width: 4, height: 4, borderRadius: '50%',
    background: t.accent,
  },
  wieloDniAkcje: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  wieloDniBtnPodglad: {
    background: t.surfaceAlt, border: `1px solid ${t.border}`,
    color: t.textSoft, borderRadius: 13,
    padding: '12px 10px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },
  wieloDniBtnZatwierdz: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 13,
    padding: '12px 10px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },
  }
}

const modS = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(20,15,10,.4)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: t.surface, borderRadius: '22px 22px 0 0',
    padding: '22px 22px 32px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans, maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: t.text, letterSpacing: -0.2, lineHeight: 1.1 },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 6 },
  close: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
  },
  loading: { padding: '24px 0', textAlign: 'center', color: t.mute, fontSize: 13 },
  lista: { overflowY: 'auto', flex: 1, marginBottom: 16, paddingRight: 4 },
  row: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `0.5px solid ${t.border}` },
  orig: { flex: 1, fontSize: 13.5, color: t.text, minWidth: 0 },
  arrow: { color: t.muteLight, fontSize: 12, flexShrink: 0 },
  input: { ...ui.input, flex: 1.2, padding: '8px 10px', fontSize: 13, marginBottom: 0 },
  btnRow: { display: 'flex', gap: 8 },

  // KopiujModal: wiersze dni
  dzienRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    width: '100%', padding: '14px 4px',
    background: 'transparent', border: 'none', borderBottom: `0.5px solid ${t.border}`,
    fontFamily: fonts.sans, textAlign: 'left',
  },
  dzienRowName: { fontFamily: fonts.serif, fontSize: 16, color: t.text },
  dzienRowSelf: { fontFamily: fonts.sans, fontSize: 11, color: t.mute, fontStyle: 'italic' },
  dzienRowMeta: { fontFamily: fonts.sans, fontSize: 12, color: t.mute },
}