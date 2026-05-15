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
export default function Kalendarz({ user, onBack, domyslnePorcje = 1, sledz, onSelectDanie }) {
  const [tydzien, setTydzien] = useState(0)
  const [dania, setDania] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [widok, setWidok] = useState('tydzien')
  const [aktywnyDzien, setAktywnyDzien] = useState(0)
  const [subTryb, setSubTryb] = useState(null)
  const [podmianaModal, setPodmianaModal] = useState(null)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  function pokazToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
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
    let anulowane = false
    async function pobierz() {
      setLoading(true)
      const [{ data: d }, { data: do_ }, { data: sur }, planRes] = await Promise.all([
        supabase.from('dania').select('"Danie", "TYP", zdjecie').order('"Danie"'),
        supabase.from('dodatki').select('"Dodatek", zdjecie').order('"Dodatek"'),
        supabase.from('surowki').select('"Surówka", zdjecie').order('"Surówka"'),
        supabase.from('kalendarz').select('*')
          .eq('user_id', user.id)
          .gte('data', formatData(dni[0]))
          .lte('data', formatData(dni[6])),
      ])
      if (anulowane) return
      const unikalDania = [...new Map((d || []).filter(x => x.Danie).map(x => [x.Danie, x])).values()]
      const unikalDodatki = [...new Map((do_ || []).filter(x => x.Dodatek).map(x => [x.Dodatek, x])).values()]
      const unikalSurowki = [...new Map((sur || []).filter(x => x['Surówka']).map(x => [x['Surówka'], x])).values()]
      setDania(unikalDania)
      setDodatki(unikalDodatki)
      setSurowki(unikalSurowki)
      const nowyPlan = {}
      ;(planRes.data || []).forEach(p => { nowyPlan[`${p.data}_${p.posilek}`] = p })
      setPlan(nowyPlan)
      setLoading(false)
    }
    pobierz()
    return () => { anulowane = true }
  }, [tydzien, user.id])

  const daniaMap = useMemo(() => { const m = {}; dania.forEach(d => { m[d.Danie] = d }); return m }, [dania])
  const dodatkiMap = useMemo(() => { const m = {}; dodatki.forEach(d => { m[d.Dodatek] = d }); return m }, [dodatki])
  const surowkiMap = useMemo(() => { const m = {}; surowki.forEach(d => { m[d['Surówka']] = d }); return m }, [surowki])

  async function ustawDanie(dataStr, posilek, nazwa) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (istniejacy) {
      const { data } = await supabase.from('kalendarz')
        .update({ danie: nazwa, dodatek: null, surowka: null, podmiany: {} })
        .eq('id', istniejacy.id).select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))
    } else {
      const { data } = await supabase.from('kalendarz')
        .insert({ user_id: user.id, data: dataStr, posilek, danie: nazwa })
        .select().single()
      if (data) setPlan(p => ({ ...p, [klucz]: data }))
      sledz?.('zaplanuj_posilek', { dzien: dataStr, posilek, danie: nazwa })
    }
    pokazToast(`${posilek}: ${nazwa}`)
  }

  async function ustawDodatek(dataStr, posilek, nazwa) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const { data } = await supabase.from('kalendarz')
      .update({ dodatek: nazwa }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
    pokazToast(`+ ${nazwa}`)
  }

  async function ustawSurowke(dataStr, posilek, nazwa) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const { data } = await supabase.from('kalendarz')
      .update({ surowka: nazwa }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
    pokazToast(`+ ${nazwa}`)
  }

  async function usunPosilek(dataStr, posilek) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    await supabase.from('kalendarz').delete().eq('id', istniejacy.id)
    setPlan(p => { const n = { ...p }; delete n[klucz]; return n })
    pokazToast(`${posilek} usunięty`)
  }

  async function usunDodatek(dataStr, posilek) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const { data } = await supabase.from('kalendarz')
      .update({ dodatek: null }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
  }
  async function usunSurowke(dataStr, posilek) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    const { data } = await supabase.from('kalendarz')
      .update({ surowka: null }).eq('id', istniejacy.id).select().single()
    if (data) setPlan(p => ({ ...p, [klucz]: data }))
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
          />
        )}

        {widok === 'dzien' && (
          <WidokDnia
            dzien={dni[aktywnyDzien]}
            plan={plan}
            daniaMap={daniaMap}
            dodatkiMap={dodatkiMap}
            surowkiMap={surowkiMap}
            dania={dania}
            dodatki={dodatki}
            surowki={surowki}
            domyslnePorcje={domyslnePorcje}
            subTryb={subTryb}
            onSetSubTryb={setSubTryb}
            onSelectDanie={onSelectDanie}
            onUstawDanie={ustawDanie}
            onUstawDodatek={ustawDodatek}
            onUstawSurowke={ustawSurowke}
            onUsunPosilek={usunPosilek}
            onUsunDodatek={usunDodatek}
            onUsunSurowke={usunSurowke}
            onZmienPorcje={zmienPorcje}
            onPodmien={(wpis) => setPodmianaModal(wpis)}
          />
        )}
      </div>

      {toast && <div style={s.toast}>{toast}</div>}

      {podmianaModal?.danie && (
        <PodmianaModal
          wpis={podmianaModal}
          onClose={() => setPodmianaModal(null)}
          onSave={(p) => { zapiszPodmiany(podmianaModal.id, p); setPodmianaModal(null) }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function WidokTygodnia({ dni, plan, daniaMap, onSelectDanie, onClickPusty }) {
  return (
    <div style={s.tydzienList}>
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
  dzien, plan, daniaMap, dodatkiMap, surowkiMap,
  dania, dodatki, surowki, domyslnePorcje,
  subTryb, onSetSubTryb, onSelectDanie,
  onUstawDanie, onUstawDodatek, onUstawSurowke,
  onUsunPosilek, onUsunDodatek, onUsunSurowke,
  onZmienPorcje, onPodmien,
}) {
  const dataStr = formatData(dzien)
  const [filtr, setFiltr] = useState('')
  const [dragState, setDragState] = useState(null)

  const slotRefs = useRef({})
  const longPressTimer = useRef(null)
  const startPos = useRef(null)
  const dragRef = useRef(null)

  // Reset filtra przy zmianie sub-trybu
  useEffect(() => { setFiltr('') }, [subTryb?.typ, subTryb?.posilek])

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
    }, 200)
  }, [startDrag])

  useEffect(() => {
    function handleMove(e) {
      if (longPressTimer.current && startPos.current) {
        const dx = e.clientX - startPos.current.x
        const dy = e.clientY - startPos.current.y
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
          startPos.current = null
        }
      }
      if (dragRef.current) {
        const stan = { ...dragRef.current, x: e.clientX, y: e.clientY, podniesiony: true }
        dragRef.current = stan
        setDragState(stan)
        if (e.cancelable) e.preventDefault()
      }
    }

    function znajdzSlotPodPointerem(x, y) {
      for (const posilek of POSILKI) {
        const el = slotRefs.current[posilek]
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return posilek
      }
      return null
    }

    function handleUp(e) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      if (dragRef.current) {
        const stan = dragRef.current
        let target = null
        // W sub-trybie cel jest predefiniowany (subTryb.posilek), nie sprawdzamy pozycji
        if (subTryb) {
          target = subTryb.posilek
        } else {
          target = znajdzSlotPodPointerem(e.clientX, e.clientY)
        }
        if (target) {
          if (stan.typ === 'danie')   onUstawDanie(dataStr, target, stan.nazwa)
          if (stan.typ === 'dodatek') { onUstawDodatek(dataStr, target, stan.nazwa); onSetSubTryb(null) }
          if (stan.typ === 'surowka') { onUstawSurowke(dataStr, target, stan.nazwa); onSetSubTryb(null) }
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
  }, [dataStr, subTryb, onUstawDanie, onUstawDodatek, onUstawSurowke, onSetSubTryb])

  const galeriaItems = useMemo(() => {
    let lista
    if (subTryb?.typ === 'dodatek') lista = dodatki.map(d => ({ nazwa: d.Dodatek, zdjecie: d.zdjecie }))
    else if (subTryb?.typ === 'surowka') lista = surowki.map(d => ({ nazwa: d['Surówka'], zdjecie: d.zdjecie }))
    else lista = dania.map(d => ({ nazwa: d.Danie, zdjecie: d.zdjecie }))
    if (!filtr.trim()) return lista
    const q = filtr.toLowerCase()
    return lista.filter(x => x.nazwa?.toLowerCase().includes(q))
  }, [subTryb, dania, dodatki, surowki, filtr])

  const typGalerii = subTryb?.typ || 'danie'
  const tytulGalerii = typGalerii === 'dodatek' ? `Wybierz dodatek do: ${subTryb?.posilek}` :
                       typGalerii === 'surowka' ? `Wybierz surówkę do: ${subTryb?.posilek}` :
                       'Galeria dań'

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        ...s.slotyDuze,
        opacity: subTryb ? 0.35 : 1,
        transition: 'opacity .2s',
        pointerEvents: subTryb ? 'none' : 'auto',
      }}>
        {POSILKI.map(posilek => {
          const wpis = plan[`${dataStr}_${posilek}`]
          const podswietl = !!dragState?.podniesiony && dragState.typ === 'danie'
          return (
            <SlotDuzy
              key={posilek}
              setRef={(el) => { slotRefs.current[posilek] = el }}
              posilek={posilek}
              wpis={wpis}
              daniaMeta={daniaMap[wpis?.danie]}
              dodatkiMeta={dodatkiMap[wpis?.dodatek]}
              surowkiMeta={surowkiMap[wpis?.surowka]}
              domyslnePorcje={domyslnePorcje}
              podswietlony={podswietl}
              onClick={() => wpis?.danie && onSelectDanie?.(wpis.danie)}
              onUsun={() => onUsunPosilek(dataStr, posilek)}
              onUsunDodatek={() => onUsunDodatek(dataStr, posilek)}
              onUsunSurowke={() => onUsunSurowke(dataStr, posilek)}
              onZmienPorcje={(p) => onZmienPorcje(dataStr, posilek, p)}
              onPodmien={() => onPodmien(wpis)}
              onWybierzDodatek={() => onSetSubTryb({ dataStr, posilek, typ: 'dodatek' })}
              onWybierzSurowke={() => onSetSubTryb({ dataStr, posilek, typ: 'surowka' })}
            />
          )
        })}
      </div>

      <div style={s.podpowiedz}>
        {subTryb
          ? <>Przytrzymaj i przeciągnij {typGalerii === 'dodatek' ? 'dodatek' : 'surówkę'} albo <strong>kliknij</strong>.</>
          : <>Przytrzymaj danie i przeciągnij na slot. Krótki tap = przepis.</>
        }
      </div>

      <section style={s.galeria}>
        <div style={s.galeriaHeader}>
          <h2 style={s.galeriaTytul}>{tytulGalerii}</h2>
          <input
            type="text"
            placeholder="Szukaj…"
            value={filtr}
            onChange={e => setFiltr(e.target.value)}
            style={s.szukaj}
          />
        </div>

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
                  if (typGalerii === 'dodatek') onUstawDodatek(subTryb.dataStr, subTryb.posilek, item.nazwa)
                  if (typGalerii === 'surowka') onUstawSurowke(subTryb.dataStr, subTryb.posilek, item.nazwa)
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
  setRef, posilek, wpis, daniaMeta, dodatkiMeta, surowkiMeta,
  domyslnePorcje, podswietlony,
  onClick, onUsun, onUsunDodatek, onUsunSurowke,
  onZmienPorcje, onPodmien,
  onWybierzDodatek, onWybierzSurowke,
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

  return (
    <div ref={setRef} style={{ position: 'relative' }}>
      <button
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
          <MiniSlot
            label="Dodatek"
            nazwa={wpis.dodatek}
            meta={dodatkiMeta}
            onClickPelny={onUsunDodatek}
            onClickPusty={onWybierzDodatek}
          />
          <MiniSlot
            label="Surówka"
            nazwa={wpis.surowka}
            meta={surowkiMeta}
            onClickPelny={onUsunSurowke}
            onClickPusty={onWybierzSurowke}
          />
        </div>
      )}
    </div>
  )
}

function MiniSlot({ label, nazwa, meta, onClickPelny, onClickPusty }) {
  const masWybor = !!nazwa
  return (
    <button onClick={masWybor ? onClickPelny : onClickPusty} style={{
      ...s.miniSlot,
      ...(masWybor ? {} : s.miniSlotPusty),
    }}>
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
          <span style={s.miniSlotPustyTxt}>+ {label.toLowerCase()}</span>
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
function PodmianaModal({ wpis, onClose, onSave }) {
  const [skladniki, setSkladniki] = useState([])
  const [podmiany, setPodmiany] = useState(wpis.podmiany || {})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function pobierz() {
      const promises = []
      if (wpis.danie)   promises.push(supabase.from('dania').select('"Składnik"').eq('"Danie"', wpis.danie))
      if (wpis.dodatek) promises.push(supabase.from('dodatki').select('"Składnik"').eq('"Dodatek"', wpis.dodatek))
      if (wpis.surowka) promises.push(supabase.from('surowki').select('"Składnik"').eq('"Surówka"', wpis.surowka))
      const wyniki = await Promise.all(promises)
      const wszystkie = wyniki.flatMap(r => (r.data || []).map(x => x['Składnik']))
      setSkladniki([...new Set(wszystkie.filter(Boolean))])
      setLoading(false)
    }
    pobierz()
  }, [wpis.danie, wpis.dodatek, wpis.surowka])

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

  slotyDuze: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 },
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
  },
  miniSlotLabel: {
    position: 'absolute', top: 4, left: 4,
    color: '#fff', fontSize: 7.5, fontWeight: 800, letterSpacing: 1,
    padding: '2px 5px', borderRadius: 3,
    background: 'rgba(0,0,0,.55)',
  },
  miniSlotPusty: { background: t.surfaceAlt, border: `1px dashed ${t.border}`, boxShadow: 'none' },
  miniSlotPustyInner: { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' },
  miniSlotPustyTxt: { fontSize: 9.5, color: t.mute, fontFamily: fonts.sans, fontWeight: 600 },

  podpowiedz: {
    background: t.surfaceAlt, color: t.mute,
    fontFamily: fonts.sans, fontSize: 11.5, lineHeight: 1.4,
    padding: '8px 12px', borderRadius: 10,
    marginBottom: 16, textAlign: 'center',
  },

  galeria: { marginTop: 10 },
  galeriaHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  galeriaTytul: { ...ui.h2, fontSize: 18, flex: 1 },
  szukaj: { ...ui.input, padding: '8px 12px', fontSize: 13, maxWidth: 140 },
  galeriaGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  galeriaItem: {
    display: 'flex', flexDirection: 'column', gap: 6,
    background: 'transparent', border: 'none', padding: 0,
    cursor: 'pointer', fontFamily: fonts.sans, textAlign: 'left',
    touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
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
    background: t.text, color: '#fff', borderRadius: 12, padding: '10px 18px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 200,
    maxWidth: 'calc(100vw - 32px)', textAlign: 'center',
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
}
