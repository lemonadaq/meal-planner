import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { formatDataLocal as formatData, isDzis } from '../dataHelpers'

const DNI_KROTKO = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

const SLOT_KOLORY = {
  Śniadanie: 'rgba(196, 90, 50, .92)',
  Obiad:     'rgba(140, 100, 50, .92)',
  Kolacja:   'rgba(80, 110, 70, .92)',
}

// Posiłek → wartość kolumny `rodzaj` w bazie dań (do automatycznych sugestii w przyszłości)
const POSILEK_RODZAJ = {
  Śniadanie: 'sniadanie',
  Obiad:     'obiad',
  Kolacja:   'kolacja',
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
export default function Kalendarz({ user, householdId, onBack, domyslnePorcje = 1, sledz, onSelectDanie }) {
  const [tydzien, setTydzien] = useState(0)
  const [dania, setDania] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [skladnikiDan, setSkladnikiDan] = useState({}) // { nazwaDania: Set('składnik1','składnik2') }
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [widok, setWidok] = useState('tydzien')
  const [aktywnyDzien, setAktywnyDzien] = useState(0)
  const [subTryb, setSubTryb] = useState(null)
  const [podmianaModal, setPodmianaModal] = useState(null)
  const [kopiujModal, setKopiujModal] = useState(null) // { zDataStr } albo null

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

  useEffect(() => {
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

      // Dedup po nazwie
      const unikalneWszystko = [...new Map(
        (wszystko || []).filter(x => x.Danie).map(x => [x.Danie, x])
      ).values()]

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

    pokazToast(`${posilek} usunięty`, async () => {
      // Insert spowrotem (zachowując wszystkie pola)
      const { id, created_at, ...doInsert } = kopia
      const { data } = await supabase.from('kalendarz').insert(doInsert).select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))
      setToast(null)
    })
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

  if (loading) return <div style={s.loading}>Ładowanie planu…</div>

  return (
    <div style={s.outer}>
      <div style={s.container}>
        {!subTryb && (
          <>
            <button style={s.back} onClick={onBack}>← Wróć</button>

            <header style={s.header}>
              <div>
                <div style={s.eyebrow}>{formatMiesiacRok(dni[3]).toUpperCase()}</div>
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
                const wypelnione = POSILKI.map(p => !!plan[`${dataStr}_${p}`]?.danie)
                return (
                  <button
                    key={i}
                    onClick={() => { setWidok('dzien'); setAktywnyDzien(i) }}
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
              <button style={s.wrocTydzienBtn} onClick={() => setWidok('tydzien')}>
                ← Pokaż cały tydzień
              </button>
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
            onClickPusty={(di) => { setWidok('dzien'); setAktywnyDzien(di) }}
            onKopiujTydzien={kopiujTydzien}
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
function WidokTygodnia({ dni, plan, daniaMap, onSelectDanie, onClickPusty, onKopiujTydzien }) {
  const maZawartosc = Object.values(plan).some(p => p.danie)
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
        return (
          <section key={dataStr} style={s.dzienBlok}>
            <div style={s.dzienHeader}>
              <h3 style={s.dzienTytul}>{DNI_KROTKO[di]} {dzien.getDate()}</h3>
              {today && <span style={s.todayChip}>DZIŚ</span>}
            </div>
            <div style={s.kafelkiRzad}>
              {POSILKI.map(posilek => {
                const wpis = plan[`${dataStr}_${posilek}`]
                return (
                  <KafelekPosilek
                    key={posilek}
                    posilek={posilek}
                    wpis={wpis}
                    daniaMeta={daniaMap[wpis?.danie]}
                    onClick={() => {
                      if (wpis?.danie) onSelectDanie?.(wpis.danie)
                      else onClickPusty(di)
                    }}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function WidokDnia({
  dzien, dni, plan, daniaMap, dodatkiMap, surowkiMap,
  dania, dodatki, surowki, skladnikiDan, domyslnePorcje,
  subTryb, onSetSubTryb, onSelectDanie,
  onUstawDanie, onUstawSide,
  onUsunPosilek, onUsunSide,
  onZmienPorcje, onPodmien, onKopiujDzien,
}) {
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

  const startDrag = useCallback((nazwa, typ, meta, x, y) => {
    const stan = { nazwa, typ, meta, x, y, podniesiony: false }
    dragRef.current = stan
    setDragState(stan)
  }, [])

  const onPointerDownItem = useCallback((e, nazwa, typ, meta) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const x = e.clientX, y = e.clientY
    startPos.current = { x, y, nazwa, typ, meta }
    longPressTimer.current = setTimeout(() => {
      startDrag(nazwa, typ, meta, x, y)
      if (navigator.vibrate) navigator.vibrate(20)
    }, 250)
  }, [startDrag])

  // ── Edge scroll: jak drag jest blisko góry/dołu, scrolluj okno
  // UWAGA: gdy drag jest aktywny, body jest w position: fixed (iOS-safe pattern),
  // więc window.scrollBy nie zadziała. W tym trybie modyfikujemy body.style.top
  // (które reprezentuje "zamrożoną" pozycję scrolla — gdy ją zmieniamy, treść
  // wizualnie przesuwa się w górę/dół).
  const edgeScrollDelta = useRef(0)
  useEffect(() => {
    function loop() {
      if (edgeScrollDelta.current !== 0) {
        const body = document.body
        if (body.style.position === 'fixed') {
          // Drag aktywny — przesuwamy zamrożoną pozycję
          const current = parseFloat(body.style.top || '0') // ujemna wartość
          const max = -(document.documentElement.scrollHeight - window.innerHeight)
          const nowy = Math.max(max, Math.min(0, current - edgeScrollDelta.current))
          body.style.top = `${nowy}px`
        } else {
          // Normalny scroll (np. drag nie wystartował jeszcze)
          window.scrollBy(0, edgeScrollDelta.current)
        }
      }
      edgeScrollRaf.current = requestAnimationFrame(loop)
    }
    edgeScrollRaf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(edgeScrollRaf.current)
  }, [])

  // ── Blokada scrolla strony, gdy kafelek jest podniesiony
  // UWAGA: nie używamy overflow: hidden bo to psuje position: sticky
  // (sticky-element wymaga scrollującego przodka). Zamiast tego zapamiętujemy
  // pozycję scrolla, ustawiamy body w position: fixed (iOS-safe pattern),
  // a po puszczeniu kafelka przywracamy pozycję.
  useEffect(() => {
    if (!dragState?.podniesiony) return
    const body = document.body
    const scrollY = window.scrollY
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      touchAction: body.style.touchAction,
      overscrollBehavior: body.style.overscrollBehavior,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.touchAction = 'none'
    body.style.overscrollBehavior = 'contain'

    return () => {
      // Odczytaj aktualne body.style.top — mogło zostać zmienione przez edge-scroll
      const ostatniTop = parseFloat(body.style.top || '0')
      const docelowyScrollY = ostatniTop ? Math.abs(ostatniTop) : scrollY

      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.touchAction = prev.touchAction
      body.style.overscrollBehavior = prev.overscrollBehavior
      // Przywróć pozycję scrolla (uwzględniając edge-scroll w trakcie dragu)
      window.scrollTo(0, docelowyScrollY)
    }
  }, [dragState?.podniesiony])

  useEffect(() => {
    function handleMove(e) {
      if (longPressTimer.current && startPos.current) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        // Większy próg + jeśli głównie pionowy ruch = scroll, anuluj long-press
        if (Math.abs(dx) > 14 || Math.abs(dy) > 14) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
          startPos.current = null
        }
      }
      if (dragRef.current) {
        const stan = { ...dragRef.current, x: e.clientX, y: e.clientY, podniesiony: true }
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
    }

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

    function handleUp(e) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      edgeScrollDelta.current = 0

      if (dragRef.current) {
        const stan = dragRef.current
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
            // Jeśli upuszczamy DANIE na side-slot — zignoruj
            if (stan.typ === 'danie') {
              // No-op
            } else if (stan.typ === 'dodatek' || stan.typ === 'surowka') {
              onUstawSide(dataStr, posilek, slotIdx, stan.nazwa, stan.typ)
              onSetSubTryb(null)
            }
          } else {
            // Główny slot — przyjmuje tylko danie
            const posilek = targetKey
            if (stan.typ === 'danie') {
              onUstawDanie(dataStr, posilek, stan.nazwa)
            }
            // dodatek/surowka na glowny slot — zignoruj
          }
        }
        dragRef.current = null
        setDragState(null)
      }
      startPos.current = null
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [dataStr, subTryb, onUstawDanie, onUstawSide, onSetSubTryb])

  // ── Filtrowanie galerii ──
  // Filtrowanie po typie posiłku: gdy nie jesteśmy w sub-trybie, można pokazać:
  //  - tylko dania pasujące do "fokusu" (np. ostatnio dotkniętego slotu) — nie ma takiej koncepcji teraz
  //  - filtr ręczny: chip "Wszystko / Śniadania / Obiady / Kolacje"
  // Wybieram drugie: user-controlled, prosty toggle.
  const [filtrRodzaj, setFiltrRodzaj] = useState('wszystko')

  const galeriaItems = useMemo(() => {
    let lista
    if (subTryb?.typ === 'dodatek') {
      lista = dodatki.map(d => ({ nazwa: d.Dodatek, zdjecie: d.zdjecie }))
    } else if (subTryb?.typ === 'surowka') {
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
      if (!subTryb && skladnikiDan?.[x.nazwa]) {
        for (const sk of skladnikiDan[x.nazwa]) {
          if (sk.includes(q)) return true
        }
      }
      return false
    })
  }, [subTryb, dania, dodatki, surowki, filtr, filtrRodzaj, skladnikiDan])

  const typGalerii = subTryb?.typ || 'danie'
  const tytulGalerii = typGalerii === 'dodatek' ? `Dodatek do: ${subTryb?.posilek}` :
                       typGalerii === 'surowka' ? `Surówka do: ${subTryb?.posilek}` :
                       'Galeria dań'

  return (
    <div style={{ position: 'relative' }}>
      {/* STICKY: sloty z planem dnia na górze, zostają widoczne podczas scrolla */}
      <div style={{
        ...s.slotyDuzeSticky,
        opacity: subTryb ? 0.55 : 1,
        transition: 'opacity .2s',
      }}>
        <div style={s.slotyDuze}>
          {POSILKI.map(posilek => {
            const wpis = plan[`${dataStr}_${posilek}`]
            const dragTyp = dragState?.podniesiony ? dragState.typ : null
            const podswietl = dragTyp === 'danie'
            return (
              <SlotDuzy
                key={posilek}
                setRef={(el) => { slotRefs.current[posilek] = el }}
                setSideRef={(idx, el) => { slotRefs.current[`${posilek}_side_${idx}`] = el }}
                posilek={posilek}
                wpis={wpis}
                daniaMeta={daniaMap[wpis?.danie]}
                dodatkiMap={dodatkiMap}
                surowkiMap={surowkiMap}
                domyslnePorcje={domyslnePorcje}
                podswietlony={podswietl}
                podswietlSide={dragTyp === 'dodatek' || dragTyp === 'surowka'}
                onClick={() => wpis?.danie && onSelectDanie?.(wpis.danie)}
                onUsun={() => onUsunPosilek(dataStr, posilek)}
                onUsunSide={(slotIdx) => onUsunSide(dataStr, posilek, slotIdx)}
                onZmienPorcje={(p) => onZmienPorcje(dataStr, posilek, p)}
                onPodmien={() => onPodmien(wpis)}
                onWybierzSide={(slotIdx) => onSetSubTryb({ dataStr, posilek, typ: 'dodatek', slotIdx })}
              />
            )
          })}
        </div>

        {/* Pasek akcji dla dnia (kopiuj, podpowiedź) — w sticky żeby zawsze widoczne */}
        <div style={s.dzienAkcje}>
          <button
            style={s.dzienAkcjaBtn}
            onClick={() => onKopiujDzien(dataStr)}
            disabled={!dzienMaZawartosc}
            title={dzienMaZawartosc ? 'Kopiuj ten dzień do innego' : 'Pusty dzień — nie ma czego kopiować'}
          >
            ⎘ Kopiuj dzień
          </button>
          {subTryb && (
            <button style={s.dzienAkcjaBtnText} onClick={() => onSetSubTryb(null)}>
              Anuluj wybór
            </button>
          )}
        </div>
      </div>

      <section style={s.galeria}>
        <div style={s.galeriaHeader}>
          <h2 style={s.galeriaTytul}>{tytulGalerii}</h2>
          <input
            type="text"
            placeholder={subTryb ? 'Szukaj…' : 'Szukaj po nazwie lub składniku…'}
            value={filtr}
            onChange={e => setFiltr(e.target.value)}
            style={s.szukaj}
          />
        </div>

        {/* Filtr-chipy po rodzaju (tylko dla galerii dań, nie dla sub-trybu) */}
        {!subTryb && (
          <div style={s.chipsRow}>
            {[
              { id: 'wszystko',  label: 'Wszystko' },
              { id: 'sniadanie', label: 'Śniadania' },
              { id: 'obiad',     label: 'Obiady' },
              { id: 'kolacja',   label: 'Kolacje' },
            ].map(c => (
              <button
                key={c.id}
                style={{ ...s.chip, ...(filtrRodzaj === c.id ? s.chipOn : {}) }}
                onClick={() => setFiltrRodzaj(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div style={s.galeriaGrid}>
          {galeriaItems.map(item => (
            <GaleriaItem
              key={item.nazwa}
              item={item}
              typ={typGalerii}
              onPointerDown={(e) => onPointerDownItem(e, item.nazwa, typGalerii, item)}
              onTap={() => {
                if (typGalerii === 'danie') onSelectDanie?.(item.nazwa)
                else if (subTryb) {
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

        {/* W sub-trybie: pokazujemy dwa taby do wyboru typu (dodatek vs surówka) */}
        {subTryb && (
          <div style={s.subTrybTaby}>
            <button
              style={{ ...s.subTrybTab, ...(subTryb.typ === 'dodatek' ? s.subTrybTabOn : {}) }}
              onClick={() => onSetSubTryb({ ...subTryb, typ: 'dodatek' })}
            >
              Dodatki
            </button>
            <button
              style={{ ...s.subTrybTab, ...(subTryb.typ === 'surowka' ? s.subTrybTabOn : {}) }}
              onClick={() => onSetSubTryb({ ...subTryb, typ: 'surowka' })}
            >
              Surówki
            </button>
          </div>
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function KafelekPosilek({ posilek, wpis, daniaMeta, onClick }) {
  const masDanie = !!wpis?.danie
  return (
    <button onClick={onClick} style={{ ...s.kafelek, ...(masDanie ? {} : s.kafelekPusty) }}>
      {masDanie ? (
        <>
          {daniaMeta?.zdjecie ? (
            <img src={daniaMeta.zdjecie} alt={wpis.danie} style={s.kafelekImg} />
          ) : (
            <div style={{ ...s.kafelekImg, background: kolorDania(wpis.danie), display: 'grid', placeItems: 'center' }}>
              <span style={{ fontSize: 36 }}>{emojiDania(wpis.danie)}</span>
            </div>
          )}
          <span style={{ ...s.kafelekLabel, background: SLOT_KOLORY[posilek] }}>
            {posilek.toUpperCase()}
          </span>
          <div style={s.kafelekNazwa}>
            <span style={s.kafelekNazwaTxt}>{wpis.danie}</span>
          </div>
        </>
      ) : (
        <div style={s.kafelekPustyInner}>
          <span style={s.kafelekPustyLabel}>{posilek.toUpperCase()}</span>
          <span style={s.kafelekPustyPlus}>+</span>
        </div>
      )}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
function SlotDuzy({
  setRef, setSideRef, posilek, wpis, daniaMeta, dodatkiMap, surowkiMap,
  domyslnePorcje, podswietlony, podswietlSide,
  onClick, onUsun, onUsunSide,
  onZmienPorcje, onPodmien,
  onWybierzSide,
}) {
  const masDanie = !!wpis?.danie
  const typDania = daniaMeta?.TYP
  const porcje = wpis?.porcje != null ? wpis.porcje : domyslnePorcje
  const porcjeRozne = wpis?.porcje != null && wpis.porcje !== domyslnePorcje
  const liczbaPodmian = wpis?.podmiany ? Object.keys(wpis.podmiany).filter(k => wpis.podmiany[k]).length : 0

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
    <div style={{ position: 'relative' }}>
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
            <span style={{ ...s.kafelekLabel, background: SLOT_KOLORY[posilek] }}>
              {posilek.toUpperCase()}
            </span>
            <div style={s.kafelekNazwa}>
              <span style={s.kafelekNazwaTxt}>{wpis.danie}</span>
            </div>
          </>
        ) : (
          <div style={s.kafelekPustyInner}>
            <span style={s.kafelekPustyLabel}>{posilek.toUpperCase()}</span>
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
function GaleriaItem({ item, onPointerDown, onTap, aktywnyDrag }) {
  const downPos = useRef(null)
  function handleDown(e) {
    downPos.current = { x: e.clientX, y: e.clientY, t: Date.now() }
    onPointerDown(e)
  }
  function handleUp(e) {
    if (downPos.current && !aktywnyDrag) {
      const dt = Date.now() - downPos.current.t
      const dx = Math.abs(e.clientX - downPos.current.x)
      const dy = Math.abs(e.clientY - downPos.current.y)
      if (dt < 180 && dx < 10 && dy < 10) onTap()
    }
    downPos.current = null
  }

  return (
    <div
      onPointerDown={handleDown}
      onPointerUp={handleUp}
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
const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: { padding: '20px 18px 32px', maxWidth: 460, margin: '0 auto', boxSizing: 'border-box' },
  back: { ...ui.btnText, padding: '0 0 10px', display: 'block' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  eyebrow: { ...ui.eyebrow, fontSize: 10.5, marginBottom: 6, color: t.warm },
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

  tydzienList: { display: 'flex', flexDirection: 'column', gap: 16 },
  dzienBlok: {},
  dzienHeader: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: '0 2px' },
  dzienTytul: { ...ui.h3, fontSize: 17, color: t.text, textTransform: 'capitalize' },
  todayChip: {
    fontFamily: fonts.sans, fontSize: 9, fontWeight: 800, color: t.warm, letterSpacing: 1.2,
    padding: '1px 6px', background: t.warmSoft, borderRadius: 4,
  },
  kafelkiRzad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },

  kafelek: {
    position: 'relative', aspectRatio: '1', borderRadius: 16,
    background: t.surface, border: 'none', cursor: 'pointer',
    overflow: 'hidden', padding: 0, fontFamily: fonts.sans,
    boxShadow: '0 1px 2px rgba(74,55,40,.06), 0 6px 16px rgba(74,55,40,.06)',
  },
  kafelekImg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  kafelekLabel: {
    position: 'absolute', top: 8, left: 8,
    color: '#fff', fontSize: 8, fontWeight: 800, letterSpacing: 1.2,
    padding: '3px 7px', borderRadius: 5,
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
  slotyDuze: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
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
    // touchAction: 'manipulation' pozwala na natywny scroll w osi Y,
    // ale wycina double-tap-to-zoom. Drag startuje przez long-press w JS.
    touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none',
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
