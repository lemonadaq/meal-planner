import { useState, useMemo, useRef } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import Toast from '../components/Toast'
import {
  useSloty, sanityzuj, nowySlotId, nastepnyKolor,
  DNI_KLUCZE, DNI_LABELS, slotyWDniu,
} from '../useSloty'

const MAX_SLOTOW_W_DNIU = 8 // 2 rzędy × 4
const MAX_DLUGOSC_NAZWY = 20

// Paleta kolorów do wyboru przy edycji slotu
const PALETA = [
  '#c45a32', '#8c6432', '#506e46', '#7c4a6e',
  '#3a6e8c', '#a8722e', '#5d5d8c', '#6e4a3a',
  '#9b3b23', '#4a7a4a', '#7a5a3a', '#3a5a7a',
]

export default function KonfiguracjaSlotow({ householdId, onBack }) {
  const { config, zapisz, loading } = useSloty(householdId)

  // Edycja slotu (modal)
  const [edytowanySlot, setEdytowanySlot] = useState(null)
  // { mode: 'new' | 'edit', dzien?: 'pon'|..., slot: {id, nazwa, kolor} }

  const [dragSlot, setDragSlot] = useState(null)
  // { dzien, startIdx, overIdx }
  const dragRef = useRef(null)
  const slotItemRefs = useRef({})

  // Potwierdzenie usunięcia slotu z dnia (jak są wpisy w kalendarzu)
  const [potwierdz, setPotwierdz] = useState(null)
  // { dzien, slotId, ileWpisow, wpisyDoUsuniecia: [...] }

  // Toast z undo
  const [toast, setToast] = useState(null)

  function pokazToast(msg, onUndo = null, ms = 5000) {
    setToast({ id: Date.now(), msg, onUndo, ms })
  }

  // ── Akcje na konfiguracji ───────────────────────────────

  async function dodajSlotDoDnia(dzien, slotId) {
    const nowa = JSON.parse(JSON.stringify(sanityzuj(config)))
    if (!nowa.dni[dzien]) nowa.dni[dzien] = []
    if (nowa.dni[dzien].includes(slotId)) return // duplikat, ignoruj
    if (nowa.dni[dzien].length >= MAX_SLOTOW_W_DNIU) {
      pokazToast(`Maksymalnie ${MAX_SLOTOW_W_DNIU} posiłków w jednym dniu`)
      return
    }
    nowa.dni[dzien].push(slotId)
    await zapisz(nowa)
  }

  async function usunSlotZDnia(dzien, slotId, force = false) {
    // Sprawdź czy są jakieś wpisy w kalendarzu z tym slotem dla tego dnia tygodnia
    // (we wszystkich tygodniach, bo user usuwa slot z dnia tygodnia raz na zawsze)
    if (!force) {
      const { data: wpisy } = await supabase
        .from('kalendarz')
        .select('id, data, posilek, danie')
        .eq('household_id', householdId)
        .eq('posilek', slotId)
        .not('danie', 'is', null)

      // Filtruj tylko te które są w danym dniu tygodnia
      const wpisyDoUsuniecia = (wpisy || []).filter(w => {
        const [y, m, day] = w.data.split('-').map(Number)
        const d = new Date(y, m - 1, day)
        const dow = ['nd', 'pon', 'wt', 'sr', 'czw', 'pt', 'sob'][d.getDay()]
        return dow === dzien
      })

      if (wpisyDoUsuniecia.length > 0) {
        setPotwierdz({ dzien, slotId, ileWpisow: wpisyDoUsuniecia.length, wpisyDoUsuniecia })
        return
      }
    }

    // Brak wpisów albo force=true (po potwierdzeniu) — usuń slot z dnia
    const nowa = JSON.parse(JSON.stringify(sanityzuj(config)))
    nowa.dni[dzien] = (nowa.dni[dzien] || []).filter(id => id !== slotId)
    await zapisz(nowa)
  }

  async function potwierdzUsuniecie() {
    if (!potwierdz) return
    const { dzien, slotId, wpisyDoUsuniecia } = potwierdz
    setPotwierdz(null)

    // Kopia do undo
    const wpisyKopia = wpisyDoUsuniecia.map(({ id, ...rest }) => rest)
    const ids = wpisyDoUsuniecia.map(w => w.id)

    // Usuń wpisy z kalendarza
    if (ids.length > 0) {
      await supabase.from('kalendarz').delete().in('id', ids)
    }

    // Stary stan slotów (do undo)
    const staryConfig = JSON.parse(JSON.stringify(sanityzuj(config)))
    // Usuń slot z dnia
    await usunSlotZDnia(dzien, slotId, true)

    pokazToast(
      `Usunięto „${znajdzNazweSlotu(slotId)}" z ${DNI_LABELS[dzien].toLowerCase()} (${wpisyKopia.length} ${wpisyKopia.length === 1 ? 'posiłek' : 'posiłków'} zniknęło)`,
      async () => {
        // Cofnij: przywróć config + wpisy
        await zapisz(staryConfig)
        if (wpisyKopia.length > 0) {
          await supabase.from('kalendarz').insert(wpisyKopia)
        }
        setToast(null)
      },
      6000
    )
  }

  function znajdzNazweSlotu(slotId) {
    const slot = sanityzuj(config).sloty.find(s => s.id === slotId)
    return slot?.nazwa || slotId
  }

  // ── Edycja / dodawanie slotu (modal) ────────────────────

  function otworzNowySlot(dzien) {
    setEdytowanySlot({
      mode: 'new',
      dzien,
      slot: { id: nowySlotId(config), nazwa: '', kolor: nastepnyKolor(config) },
    })
  }

  function otworzEdycjeSlotu(slotId) {
    const slot = sanityzuj(config).sloty.find(s => s.id === slotId)
    if (!slot) return
    setEdytowanySlot({ mode: 'edit', slot: { ...slot } })
  }

  async function zapiszSlot(dane) {
    const sanit = sanityzuj(config)
    const nowa = JSON.parse(JSON.stringify(sanit))

    if (edytowanySlot.mode === 'new') {
      // Sprawdź czy nazwa już istnieje (case insensitive)
      if (sanit.sloty.some(s => s.nazwa.toLowerCase() === dane.nazwa.toLowerCase())) {
        pokazToast(`Slot „${dane.nazwa}" już istnieje`)
        return
      }
      nowa.sloty.push({ id: dane.id, nazwa: dane.nazwa.trim(), kolor: dane.kolor })
      // Od razu dodaj do dnia z którego otwarto modal
      if (edytowanySlot.dzien) {
        if (!nowa.dni[edytowanySlot.dzien]) nowa.dni[edytowanySlot.dzien] = []
        if (nowa.dni[edytowanySlot.dzien].length < MAX_SLOTOW_W_DNIU) {
          nowa.dni[edytowanySlot.dzien].push(dane.id)
        }
      }
    } else {
      // Edycja — sprawdź unikalność nazwy (ignorując samego siebie)
      if (sanit.sloty.some(s => s.id !== dane.id && s.nazwa.toLowerCase() === dane.nazwa.toLowerCase())) {
        pokazToast(`Slot „${dane.nazwa}" już istnieje`)
        return
      }
      const idx = nowa.sloty.findIndex(s => s.id === dane.id)
      if (idx >= 0) {
        nowa.sloty[idx] = { ...nowa.sloty[idx], nazwa: dane.nazwa.trim(), kolor: dane.kolor }
      }
    }

    await zapisz(nowa)
    setEdytowanySlot(null)
  }

  // ── Drag & drop kolejności slotów ──────────────────────────

  async function reorderSlotWDniu(dzien, noweIds) {
    const nowa = JSON.parse(JSON.stringify(sanityzuj(config)))
    nowa.dni[dzien] = noweIds
    await zapisz(nowa)
  }

  function startDrag(dzien, idx, slot, e) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { dzien, startIdx: idx, overIdx: idx, x: e.clientX, y: e.clientY, slotNazwa: slot.nazwa, slotKolor: slot.kolor }
    setDragSlot({ ...dragRef.current })
  }

  function moveDrag(dzien, slotyDnia, e) {
    if (!dragRef.current || dragRef.current.dzien !== dzien) return
    const y = e.clientY
    let newOver = dragRef.current.startIdx
    for (let i = 0; i < slotyDnia.length; i++) {
      const el = slotItemRefs.current[`${dzien}_${slotyDnia[i].id}`]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) { newOver = i; break }
      newOver = i + 1
    }
    newOver = Math.min(newOver, slotyDnia.length - 1)
    dragRef.current.overIdx = newOver
    dragRef.current.x = e.clientX
    dragRef.current.y = e.clientY
    setDragSlot({ ...dragRef.current })
  }

  async function endDrag(dzien, slotyDnia, e) {
    if (!dragRef.current || dragRef.current.dzien !== dzien) return
    const { startIdx, overIdx } = dragRef.current
    dragRef.current = null
    setDragSlot(null)
    if (startIdx !== overIdx) {
      const newIds = slotyDnia.map(s => s.id)
      const [moved] = newIds.splice(startIdx, 1)
      newIds.splice(overIdx, 0, moved)
      await reorderSlotWDniu(dzien, newIds)
    }
  }

  // Skopiuj konfigurację z jednego dnia do innych
  const [pokazKopiuj, setPokazKopiuj] = useState(null) // { zDnia: 'sob' }

  async function kopiujKonfiguracje(zDnia, naDni) {
    const sanit = sanityzuj(config)
    const nowa = JSON.parse(JSON.stringify(sanit))
    const source = nowa.dni[zDnia] || []
    naDni.forEach(d => {
      nowa.dni[d] = [...source]
    })
    await zapisz(nowa)
    setPokazKopiuj(null)
    pokazToast(`Skopiowano do ${naDni.length} ${naDni.length === 1 ? 'dnia' : 'dni'}`)
  }

  if (loading) return <div style={s.loading}>Ładuję…</div>

  const sanit = sanityzuj(config)

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div style={s.eyebrow}>KONFIGURACJA TYGODNIA</div>
          <h1 style={s.title}>Posiłki dnia</h1>
          <p style={s.sub}>
            Każdy dzień tygodnia może mieć inny zestaw posiłków.
            Maksymalnie {MAX_SLOTOW_W_DNIU} posiłków w jednym dniu.
            Zmiany widzi cała rodzina.
          </p>
        </header>

        {DNI_KLUCZE.map(dzien => {
          const slotyDnia = slotyWDniu(sanit, dzien)
          return (
            <section key={dzien} style={{ ...s.dzien, ...(dragSlot && dragSlot.dzien !== dzien ? { filter: 'blur(2px)', opacity: 0.45, pointerEvents: 'none' } : {}), transition: 'filter .2s, opacity .2s' }}>
              <div style={s.dzienHeader}>
                <h2 style={s.dzienTytul}>{DNI_LABELS[dzien]}</h2>
                <button
                  style={s.kopiujBtn}
                  onClick={() => setPokazKopiuj({ zDnia: dzien })}
                  title="Skopiuj ten układ do innych dni"
                >
                  ⎘ Kopiuj
                </button>
              </div>

              {slotyDnia.length === 0 && (
                <div style={s.pustyDzien}>Brak posiłków w tym dniu</div>
              )}

              <div style={s.slotyGrid}>
                {slotyDnia.map((slot, idx) => {
                  const isDragging = dragSlot?.dzien === dzien
                  const isThisDragged = isDragging && dragSlot.startIdx === idx
                  const isDropTarget = isDragging && dragSlot.overIdx === idx && !isThisDragged
                  return (
                  <div
                    key={slot.id}
                    ref={el => { slotItemRefs.current[`${dzien}_${slot.id}`] = el }}
                    style={{ ...s.slot, borderLeftColor: slot.kolor, opacity: isThisDragged ? 0.3 : 1, outline: isDropTarget ? `2px solid ${t.accent}` : 'none', outlineOffset: -2 }}
                  >
                    <div
                      style={s.dragHandle}
                      onPointerDown={(e) => startDrag(dzien, idx, slot, e)}
                      onPointerMove={(e) => moveDrag(dzien, slotyDnia, e)}
                      onPointerUp={(e) => endDrag(dzien, slotyDnia, e)}
                    >⠿</div>
                    <button
                      style={s.slotEdit}
                      onClick={() => otworzEdycjeSlotu(slot.id)}
                      title="Edytuj nazwę i kolor"
                    >
                      <span style={s.slotNazwa}>{slot.nazwa}</span>
                      <span style={s.slotEditIcon}>✎</span>
                    </button>
                    <button
                      style={s.slotUsun}
                      onClick={() => usunSlotZDnia(dzien, slot.id)}
                      title="Usuń z tego dnia"
                    >
                      ×
                    </button>
                  </div>
                  )
                })}

                {slotyDnia.length < MAX_SLOTOW_W_DNIU && (
                  <button style={s.btnDodaj} onClick={() => otworzNowySlot(dzien)}>
                    + Dodaj posiłek
                  </button>
                )}
              </div>

              {/* Lista istniejących slotów do dołożenia */}
              {slotyDnia.length < MAX_SLOTOW_W_DNIU && (
                <DodajIstniejacy
                  config={sanit}
                  dzien={dzien}
                  jestWeDniu={(id) => slotyDnia.some(s => s.id === id)}
                  onDodaj={(slotId) => dodajSlotDoDnia(dzien, slotId)}
                />
              )}
            </section>
          )
        })}
      </div>

      {dragSlot && (
        <div style={{ ...s.dragGhost, left: dragSlot.x, top: dragSlot.y }}>
          <div style={{ ...s.dragGhostPasek, background: dragSlot.slotKolor }} />
          <span style={s.dragGhostNazwa}>{dragSlot.slotNazwa}</span>
        </div>
      )}

      {/* Modal: dodawanie / edycja slotu */}
      {edytowanySlot && (
        <SlotModal
          mode={edytowanySlot.mode}
          slot={edytowanySlot.slot}
          onZapisz={zapiszSlot}
          onAnuluj={() => setEdytowanySlot(null)}
        />
      )}

      {/* Modal: kopiowanie do innych dni */}
      {pokazKopiuj && (
        <KopiowanieModal
          zDnia={pokazKopiuj.zDnia}
          onKopiuj={(naDni) => kopiujKonfiguracje(pokazKopiuj.zDnia, naDni)}
          onAnuluj={() => setPokazKopiuj(null)}
        />
      )}

      {/* Modal potwierdzenia usunięcia */}
      {potwierdz && (
        <div style={modS.overlay} onClick={() => setPotwierdz(null)}>
          <div style={modS.modal} onClick={e => e.stopPropagation()}>
            <div style={modS.eyebrow}>POTWIERDZENIE</div>
            <h2 style={modS.title}>
              Usunąć „{znajdzNazweSlotu(potwierdz.slotId)}" z {DNI_LABELS[potwierdz.dzien].toLowerCase()}?
            </h2>
            <p style={modS.sub}>
              W kalendarzu jest {potwierdz.ileWpisow} {potwierdz.ileWpisow === 1 ? 'zaplanowany posiłek' : 'zaplanowanych posiłków'} z tego slotu.
              Zostaną usunięte z kalendarza. Cofnięcie będzie możliwe przez kilka sekund.
            </p>
            <div style={modS.btnRow}>
              <button style={modS.btnGhost} onClick={() => setPotwierdz(null)}>Anuluj</button>
              <button style={{ ...modS.btnPrim, background: t.danger }} onClick={potwierdzUsuniecie}>
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        toast={toast ? { id: toast.id, label: toast.msg } : null}
        duration={toast?.ms ?? 5000}
        onUndo={toast?.onUndo}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function DodajIstniejacy({ config, dzien, jestWeDniu, onDodaj }) {
  const [otwarte, setOtwarte] = useState(false)
  const dostepne = useMemo(
    () => config.sloty.filter(s => !jestWeDniu(s.id)),
    [config.sloty, jestWeDniu]
  )
  if (dostepne.length === 0) return null
  return (
    <div style={s.istniejaceWrap}>
      <button style={s.istniejaceToggle} onClick={() => setOtwarte(o => !o)}>
        {otwarte ? '▾' : '▸'} Dodaj istniejący posiłek
      </button>
      {otwarte && (
        <div style={s.istniejaceLista}>
          {dostepne.map(slot => (
            <button
              key={slot.id}
              style={{ ...s.istniejacyChip, borderLeftColor: slot.kolor }}
              onClick={() => { onDodaj(slot.id); setOtwarte(false) }}
            >
              + {slot.nazwa}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function SlotModal({ mode, slot, onZapisz, onAnuluj }) {
  const [nazwa, setNazwa] = useState(slot.nazwa || '')
  const [kolor, setKolor] = useState(slot.kolor || PALETA[0])
  const [blad, setBlad] = useState('')

  function zatwierdz() {
    const trimmed = nazwa.trim()
    if (!trimmed) {
      setBlad('Wpisz nazwę posiłku')
      return
    }
    if (trimmed.length > MAX_DLUGOSC_NAZWY) {
      setBlad(`Maksymalnie ${MAX_DLUGOSC_NAZWY} znaków`)
      return
    }
    onZapisz({ ...slot, nazwa: trimmed, kolor })
  }

  return (
    <div style={modS.overlay} onClick={onAnuluj}>
      <div style={modS.modal} onClick={e => e.stopPropagation()}>
        <div style={modS.eyebrow}>{mode === 'new' ? 'NOWY POSIŁEK' : 'EDYCJA POSIŁKU'}</div>
        <h2 style={modS.title}>{mode === 'new' ? 'Dodaj posiłek' : 'Zmień posiłek'}</h2>

        <label style={modS.label}>Nazwa</label>
        <input
          type="text"
          value={nazwa}
          onChange={e => { setNazwa(e.target.value); setBlad('') }}
          placeholder="np. Zupa, Deser, Drugie śniadanie"
          maxLength={MAX_DLUGOSC_NAZWY}
          autoFocus
          style={modS.input}
        />

        <label style={modS.label}>Kolor</label>
        <div style={modS.paletaGrid}>
          {PALETA.map(k => (
            <button
              key={k}
              style={{
                ...modS.kolorBtn,
                background: k,
                outline: kolor === k ? `3px solid ${t.text}` : 'none',
                outlineOffset: 2,
              }}
              onClick={() => setKolor(k)}
              aria-label={`Kolor ${k}`}
            />
          ))}
        </div>

        {blad && <div style={modS.blad}>{blad}</div>}

        <div style={modS.btnRow}>
          <button style={modS.btnGhost} onClick={onAnuluj}>Anuluj</button>
          <button style={modS.btnPrim} onClick={zatwierdz}>
            {mode === 'new' ? 'Dodaj' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
function KopiowanieModal({ zDnia, onKopiuj, onAnuluj }) {
  const [zaznaczone, setZaznaczone] = useState(new Set())

  function toggle(d) {
    setZaznaczone(prev => {
      const nowy = new Set(prev)
      if (nowy.has(d)) nowy.delete(d)
      else nowy.add(d)
      return nowy
    })
  }

  function zaznaczWszystkie() {
    setZaznaczone(new Set(DNI_KLUCZE.filter(d => d !== zDnia)))
  }

  return (
    <div style={modS.overlay} onClick={onAnuluj}>
      <div style={modS.modal} onClick={e => e.stopPropagation()}>
        <div style={modS.eyebrow}>KOPIOWANIE</div>
        <h2 style={modS.title}>Skopiuj układ z {DNI_LABELS[zDnia].toLowerCase()}</h2>
        <p style={modS.sub}>
          Wybierz dni, do których chcesz skopiować dokładnie ten sam układ posiłków.
          Aktualny układ tych dni zostanie zastąpiony.
        </p>

        <button style={modS.btnZaznacz} onClick={zaznaczWszystkie}>
          Zaznacz wszystkie inne dni
        </button>

        <div style={modS.checkboxLista}>
          {DNI_KLUCZE.filter(d => d !== zDnia).map(d => (
            <label key={d} style={modS.checkboxRow}>
              <input
                type="checkbox"
                checked={zaznaczone.has(d)}
                onChange={() => toggle(d)}
                style={{ marginRight: 10 }}
              />
              <span style={modS.checkboxLabel}>{DNI_LABELS[d]}</span>
            </label>
          ))}
        </div>

        <div style={modS.btnRow}>
          <button style={modS.btnGhost} onClick={onAnuluj}>Anuluj</button>
          <button
            style={modS.btnPrim}
            onClick={() => onKopiuj([...zaznaczone])}
            disabled={zaznaczone.size === 0}
          >
            Skopiuj do {zaznaczone.size} {zaznaczone.size === 1 ? 'dnia' : 'dni'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Style
const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans, paddingBottom: 80 },
  container: {
    padding: '20px 20px 32px',
    maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },
  header: { marginBottom: 24 },
  eyebrow: { ...ui.eyebrow, marginBottom: 6 },
  title: { ...ui.h1, fontSize: 28, lineHeight: 1.1, marginBottom: 10 },
  sub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, lineHeight: 1.5, margin: 0 },

  dzien: { ...ui.card, padding: 18, marginBottom: 14 },
  dzienHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  dzienTytul: { ...ui.h2, fontSize: 17, margin: 0 },
  kopiujBtn: {
    background: 'transparent', border: `1px solid ${t.border}`,
    borderRadius: 999, padding: '5px 12px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    color: t.mute, cursor: 'pointer',
  },
  pustyDzien: {
    padding: '12px 14px', background: t.surfaceAlt, borderRadius: 10,
    fontFamily: fonts.sans, fontSize: 13, color: t.mute,
    textAlign: 'center', marginBottom: 10,
  },

  slotyGrid: { display: 'flex', flexDirection: 'column', gap: 6 },
  dragHandle: {
    padding: '0 10px 0 12px', display: 'flex', alignItems: 'center',
    color: t.mute, fontSize: 18, cursor: 'grab', touchAction: 'none',
    userSelect: 'none', WebkitUserSelect: 'none',
  },
  slot: {
    display: 'flex', alignItems: 'stretch',
    background: t.surface,
    borderLeft: '4px solid #ccc',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(74,55,40,.05)',
  },
  slotEdit: {
    flex: 1, background: 'none', border: 'none', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 14px', textAlign: 'left',
  },
  slotNazwa: {
    fontFamily: fonts.sans, fontSize: 14.5, fontWeight: 600, color: t.text,
  },
  slotEditIcon: {
    fontFamily: fonts.sans, fontSize: 13, color: t.mute,
  },
  slotUsun: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: t.danger, fontSize: 20, fontWeight: 400,
    padding: '0 14px',
    borderLeft: `1px solid ${t.border}`,
  },

  btnDodaj: {
    background: 'transparent',
    border: `1.5px dashed ${t.borderStrong}`, borderRadius: 10,
    padding: '11px 14px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 600,
    color: t.warm, cursor: 'pointer', marginTop: 4,
  },

  istniejaceWrap: { marginTop: 8 },
  istniejaceToggle: {
    background: 'none', border: 'none',
    fontFamily: fonts.sans, fontSize: 11.5, fontWeight: 600,
    color: t.mute, cursor: 'pointer', padding: '6px 0',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  istniejaceLista: {
    display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4,
  },
  istniejacyChip: {
    background: t.surfaceAlt, border: 'none',
    borderLeft: '3px solid #ccc',
    borderRadius: 8, padding: '6px 10px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    color: t.text, cursor: 'pointer',
  },

  dragGhost: {
    position: 'fixed', zIndex: 9999, pointerEvents: 'none',
    transform: 'translate(-50%, -50%) scale(1.05)',
    background: t.surface, borderRadius: 10,
    boxShadow: '0 12px 32px rgba(0,0,0,.25)',
    padding: '10px 16px 10px 12px',
    display: 'flex', alignItems: 'center', gap: 10,
    minWidth: 140,
  },
  dragGhostPasek: { width: 4, height: 28, borderRadius: 2, flexShrink: 0 },
  dragGhostNazwa: { fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, color: t.text },

  loading: {
    textAlign: 'center', padding: 80, color: t.mute,
    fontFamily: fonts.sans, fontSize: 14,
    background: t.bg, minHeight: '100vh',
  },

}

const modS = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(20,15,10,.45)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: t.surface, borderRadius: '22px 22px 0 0',
    padding: '22px 22px 32px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans, maxHeight: '90vh', overflowY: 'auto',
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 6 },
  title: { ...ui.h2, fontSize: 19, marginBottom: 10, lineHeight: 1.3 },
  sub: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, lineHeight: 1.5, margin: '0 0 16px' },

  label: {
    display: 'block',
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 1, color: t.mute,
    marginBottom: 6, marginTop: 14,
  },
  input: { ...ui.input, marginBottom: 0 },

  paletaGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8,
    marginTop: 4,
  },
  kolorBtn: {
    width: '100%', aspectRatio: '1', borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,.15)',
  },

  blad: {
    background: '#FBEAE4', color: '#9B3B23',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500,
    padding: '8px 12px', borderRadius: 10, marginTop: 12,
  },

  btnZaznacz: {
    background: t.surfaceAlt, border: 'none', borderRadius: 8,
    padding: '8px 12px', marginBottom: 12,
    fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 600,
    color: t.text, cursor: 'pointer',
  },
  checkboxLista: { display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 },
  checkboxRow: {
    display: 'flex', alignItems: 'center',
    padding: '10px 4px', borderBottom: `0.5px solid ${t.border}`,
    cursor: 'pointer',
  },
  checkboxLabel: { fontFamily: fonts.sans, fontSize: 14, color: t.text },

  btnRow: { display: 'flex', gap: 8, marginTop: 20 },
  btnGhost: {
    flex: 1, padding: '12px', background: 'transparent',
    border: `1px solid ${t.border}`, borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
    color: t.mute, cursor: 'pointer',
  },
  btnPrim: {
    flex: 1.5, padding: '12px', background: t.accent, color: '#fff',
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
