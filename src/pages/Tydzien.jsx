// Tydzień — nowy główny ekran apki: tygodniowa pula dań zamiast planowania
// po dniach i slotach. Tapnięcie dania dodaje/wyjmuje je z puli bieżącego
// tygodnia (tabela plan_tygodnia, hook useTydzien).

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { pobierzWszystkieWiersze } from '../pobierzWszystko'
import { useTydzien, zakresTygodniaLabel } from '../useTydzien'

// Chipy filtrów — 'wszystko' i 'ulubione' specjalne, reszta to wartości `rodzaj`
const FILTRY = [
  { id: 'wszystko',  label: 'Wszystko' },
  { id: 'ulubione',  label: '★ Ulubione' },
  { id: 'sniadanie', label: 'Śniadania' },
  { id: 'obiad',     label: 'Obiady' },
  { id: 'kolacja',   label: 'Kolacje' },
  { id: 'zupa',      label: 'Zupy' },
  { id: 'deser',     label: 'Desery' },
]

const RODZAJ_LABEL = {
  sniadanie: 'Śniadanie', obiad: 'Obiad', kolacja: 'Kolacja',
  zupa: 'Zupa', deser: 'Deser',
  przekaska: 'Przekąska', dodatek: 'Dodatek', surowka: 'Surówka',
}

// Mały odcisk koloru dla dania — stabilny po nazwie (jak w Home.jsx)
function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6','#F4D9CC','#DCE5D2']
  let hash = 0
  for (let i = 0; i < (nazwa || '').length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}
function getEmoji(nazwa) {
  const n = (nazwa || '').toLowerCase()
  if (n.includes('kurczak') || n.includes('pierś')) return '🍗'
  if (n.includes('wołow') || n.includes('stek') || n.includes('burger')) return '🥩'
  if (n.includes('ryb') || n.includes('dorsz') || n.includes('pstrąg')) return '🐟'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('makaron') || n.includes('spaghetti') || n.includes('tagliatelle')) return '🍝'
  if (n.includes('zupa') || n.includes('gulasz')) return '🍲'
  if (n.includes('sałat') || n.includes('leczo')) return '🥗'
  if (n.includes('pierogi') || n.includes('pyzy') || n.includes('kopytka')) return '🥟'
  if (n.includes('wieprzow') || n.includes('schab') || n.includes('żeberka')) return '🍖'
  if (n.includes('jajk')) return '🍳'
  if (n.includes('ziem') || n.includes('placki')) return '🥔'
  if (n.includes('tortilla') || n.includes('burrito') || n.includes('quesadilla')) return '🌯'
  if (n.includes('kebab') || n.includes('gyros')) return '🥙'
  return '🍽️'
}

// Porcje z kropką → przecinek (1.5 → "1,5"), całkowite bez ogona
function formatPorcje(p) {
  return String(Number(p) || 1).replace('.', ',')
}

export default function Tydzien({ user, householdId, onSelectDanie, sledz, refreshKey, onZakupy }) {
  const [offset, setOffset] = useState(0)
  const { pula, dodaj, usun, zmienPorcje } = useTydzien(householdId, user, offset)

  const [dania, setDania] = useState([])
  const [loadingDania, setLoadingDania] = useState(true)
  const [szukaj, setSzukaj] = useState('')
  const [filtry, setFiltry] = useState([])

  useEffect(() => {
    let anulowane = false

    async function pobierz() {
      // Paginacja obowiązkowa — tabela dania to wiersz per składnik (>1000 wierszy)
      const { data } = await pobierzWszystkieWiersze(() =>
        supabase.from('dania')
          .select('"Danie", rodzaj, "TYP", zdjecie, ulubione, kcal')
          .order('"Danie"'))

      if (anulowane) return

      // Dedup po nazwie — preferuj wiersz ze zdjęciem; ulubione = OR (jak w Dania.jsx)
      const mapa = new Map()
      for (const d of data || []) {
        if (!d.Danie) continue
        const prev = mapa.get(d.Danie)
        if (!prev) {
          mapa.set(d.Danie, d)
          continue
        }
        const bazowy = (!prev.zdjecie && d.zdjecie) ? { ...d } : { ...prev }
        bazowy.ulubione = !!(prev.ulubione || d.ulubione)
        mapa.set(d.Danie, bazowy)
      }
      setDania([...mapa.values()])
      setLoadingDania(false)
    }

    pobierz()
    return () => { anulowane = true }
  }, [refreshKey])

  const wPuli = new Set(pula.map(r => r.danie))
  // Metadane (zdjęcie/emoji) dla miniatur w panelu wybranych
  const metaDan = new Map(dania.map(d => [d.Danie, d]))

  async function przelaczDanie(nazwa) {
    if (wPuli.has(nazwa)) {
      await usunZPuli(nazwa)
    } else {
      await dodaj(nazwa)
      sledz?.('tydzien_dodaj', { danie: nazwa })
    }
  }

  async function usunZPuli(nazwa) {
    await usun(nazwa)
    sledz?.('tydzien_usun', { danie: nazwa })
  }

  function toggleFiltr(id) {
    if (id === 'wszystko') {
      setFiltry([])
      return
    }
    setFiltry(prev => prev.includes(id)
      ? prev.filter(x => x !== id)
      : [...prev, id]
    )
  }

  // ── Filtrowanie ────────────────────────────────────────────
  const aktywneRodzaje = filtry.filter(f => f !== 'ulubione')
  const tylkoUlubione = filtry.includes('ulubione')

  const filtrowane = dania.filter(d => {
    if (tylkoUlubione && !d.ulubione) return false
    if (aktywneRodzaje.length > 0 && !aktywneRodzaje.includes(d.rodzaj)) return false
    if (szukaj && !d.Danie.toLowerCase().includes(szukaj.toLowerCase())) return false
    return true
  })

  const s = makeS()

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.tydzienNav}>
          <button
            style={s.tydzienStrzalka}
            onClick={() => setOffset(o => o - 1)}
            aria-label="Poprzedni tydzień"
          >‹</button>
          <div style={s.eyebrow}>{zakresTygodniaLabel(offset)}</div>
          <button
            style={s.tydzienStrzalka}
            onClick={() => setOffset(o => o + 1)}
            aria-label="Następny tydzień"
          >›</button>
        </div>
        <h1 style={s.tytul}>
          Co jemy w {offset === 0 ? 'tym' : offset === 1 ? 'przyszłym' : 'tamtym'} <em style={s.italic}>tygodniu</em>
          <span style={{ color: t.warm }}>?</span>
        </h1>
      </header>

      {/* Panel wybranych dań tygodnia */}
      <section style={s.pulaSekcja}>
        <h2 style={s.h2}>W tym tygodniu ({pula.length})</h2>
        {pula.length === 0 ? (
          <div style={s.pulaPusta}>
            Wybierz z listy poniżej co chcesz jeść w tym tygodniu.
          </div>
        ) : (
          <>
            <div style={s.pulaLista}>
              {pula.map(r => {
                const meta = metaDan.get(r.danie)
                return (
                  <div key={r.danie} style={s.pulaWiersz}>
                    <button style={s.pulaDanieBtn} onClick={() => onSelectDanie?.(r.danie)}>
                      <div style={{ ...s.pulaThumb, background: meta?.zdjecie ? 'transparent' : getKolor(r.danie) }}>
                        {meta?.zdjecie
                          ? <img src={meta.zdjecie} alt="" style={s.thumbImg} loading="lazy" />
                          : <span style={s.pulaThumbEmoji}>{getEmoji(r.danie)}</span>}
                      </div>
                      <div style={s.pulaNazwa}>{r.danie}</div>
                    </button>
                    <div style={s.stepper}>
                      <button
                        style={s.stepperBtn}
                        onClick={() => zmienPorcje(r.danie, -0.5)}
                        aria-label="Mniej porcji"
                      >−</button>
                      <span style={s.stepperVal}>{formatPorcje(r.porcje)}</span>
                      <button
                        style={s.stepperBtn}
                        onClick={() => zmienPorcje(r.danie, 0.5)}
                        aria-label="Więcej porcji"
                      >+</button>
                    </div>
                    <button
                      style={s.pulaUsun}
                      onClick={() => usunZPuli(r.danie)}
                      aria-label={`Usuń ${r.danie}`}
                    >✕</button>
                  </div>
                )
              })}
            </div>
            <button style={s.zakupyBtn} onClick={onZakupy}>
              Lista zakupów →
            </button>
          </>
        )}
      </section>

      {/* Sticky licznik puli */}
      <div style={s.licznikWrap}>
        <div style={s.licznik}>W tym tygodniu: {pula.length}</div>
      </div>

      {/* Search */}
      <div style={s.searchWrap}>
        <svg style={s.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.mute} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input
          style={{ ...s.search, paddingRight: szukaj ? 40 : 14 }}
          placeholder="Szukaj po nazwie…"
          value={szukaj}
          onChange={e => setSzukaj(e.target.value)}
        />
        {szukaj && (
          <button style={s.searchClear} onClick={() => setSzukaj('')} aria-label="Wyczyść">
            ✕
          </button>
        )}
      </div>

      {/* Chipy filtrów — horizontal scroll */}
      <div style={s.chipsRow}>
        <div style={s.chipsScroll}>
          {FILTRY.map(f => {
            const on = f.id === 'wszystko' ? filtry.length === 0 : filtry.includes(f.id)
            return (
              <button key={f.id}
                style={{ ...s.chip, ...(on ? s.chipOn : {}) }}
                onClick={() => toggleFiltr(f.id)}>
                {f.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista dań — tap dodaje/wyjmuje z puli tygodnia */}
      {loadingDania ? (
        <div style={s.loading}>Ładowanie dań…</div>
      ) : filtrowane.length === 0 ? (
        <div style={s.empty}>
          {szukaj ? `Brak wyników dla „${szukaj}"` : 'Brak dań dla wybranych filtrów.'}
        </div>
      ) : (
        <div style={s.lista}>
          {filtrowane.map(d => {
            const wybrane = wPuli.has(d.Danie)
            return (
              <button
                key={d.Danie}
                style={{ ...s.wiersz, ...(wybrane ? s.wierszWybrany : {}) }}
                onClick={() => przelaczDanie(d.Danie)}
              >
                <div style={{ ...s.thumb, background: d.zdjecie ? 'transparent' : getKolor(d.Danie) }}>
                  {d.zdjecie
                    ? <img src={d.zdjecie} alt="" style={s.thumbImg} loading="lazy" />
                    : <span style={s.thumbEmoji}>{getEmoji(d.Danie)}</span>}
                </div>
                <div style={s.wierszInfo}>
                  <div style={s.wierszNazwa}>{d.Danie}</div>
                  <div style={s.wierszRodzaj}>{RODZAJ_LABEL[d.rodzaj] || d.rodzaj}</div>
                </div>
                <div style={{ ...s.check, ...(wybrane ? s.checkOn : {}) }}>
                  {wybrane && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function makeS() {
  return {
    container: {
      padding: '20px 20px 24px',
      fontFamily: fonts.sans, color: t.text,
      background: t.bg, minHeight: '100vh',
      maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
    },

    header: { marginBottom: 14 },
    tydzienNav: {
      display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6,
    },
    tydzienStrzalka: {
      background: t.surface, border: `0.5px solid ${t.border}`,
      borderRadius: 999, width: 28, height: 28,
      display: 'grid', placeItems: 'center',
      fontFamily: fonts.serif, fontSize: 17, lineHeight: 1, color: t.accent,
      cursor: 'pointer', flexShrink: 0, paddingBottom: 2,
    },
    eyebrow: {
      ...ui.eyebrow, fontSize: 11, letterSpacing: 1.2,
      padding: '0 4px', minWidth: 0,
    },
    tytul: { ...ui.h1, fontSize: 30, lineHeight: 1.08, fontWeight: 400 },
    italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },

    pulaSekcja: { marginBottom: 18 },
    h2: { ...ui.h2, marginBottom: 10 },
    pulaPusta: {
      padding: '14px 16px',
      background: t.surfaceAlt, borderRadius: 14,
      fontFamily: fonts.sans, fontSize: 12.5, color: t.mute,
      lineHeight: 1.5, textAlign: 'center',
    },
    pulaLista: { display: 'flex', flexDirection: 'column', gap: 6 },
    pulaWiersz: {
      ...ui.card, padding: '8px 10px',
      display: 'flex', alignItems: 'center', gap: 8,
      boxSizing: 'border-box',
    },
    pulaDanieBtn: {
      display: 'flex', alignItems: 'center', gap: 10,
      flex: 1, minWidth: 0,
      background: 'none', border: 'none', padding: 0,
      cursor: 'pointer', textAlign: 'left', fontFamily: fonts.sans,
    },
    pulaThumb: {
      width: 42, height: 42, borderRadius: 11,
      display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0,
    },
    pulaThumbEmoji: { fontSize: 21 },
    pulaNazwa: {
      fontFamily: fonts.serif, fontSize: 15.5, color: t.text,
      letterSpacing: -0.1, lineHeight: 1.15, minWidth: 0,
      overflow: 'hidden', textOverflow: 'ellipsis',
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    },
    stepper: {
      display: 'flex', alignItems: 'center', gap: 2,
      background: t.surfaceAlt, borderRadius: 999, padding: 2,
      flexShrink: 0,
    },
    stepperBtn: {
      width: 26, height: 26, borderRadius: '50%',
      background: t.surface, border: `0.5px solid ${t.border}`,
      color: t.accent, fontFamily: fonts.sans, fontSize: 15, fontWeight: 600,
      cursor: 'pointer', display: 'grid', placeItems: 'center', lineHeight: 1,
      padding: 0,
    },
    stepperVal: {
      minWidth: 26, textAlign: 'center',
      fontFamily: fonts.sans, fontSize: 13, fontWeight: 700, color: t.text,
      fontVariantNumeric: 'tabular-nums',
    },
    pulaUsun: {
      width: 28, height: 28, borderRadius: '50%',
      background: 'none', border: 'none',
      color: t.muteLight, fontSize: 13, cursor: 'pointer',
      display: 'grid', placeItems: 'center', flexShrink: 0,
      padding: 0,
    },
    zakupyBtn: {
      ...ui.btnPrimary, width: '100%', marginTop: 10,
      fontSize: 14.5, borderRadius: 13, boxSizing: 'border-box',
    },

    licznikWrap: {
      position: 'sticky', top: 8, zIndex: 20,
      display: 'flex', justifyContent: 'flex-end',
      marginBottom: 10, pointerEvents: 'none',
    },
    licznik: {
      background: t.accent, color: '#fff',
      borderRadius: 999, padding: '7px 13px',
      fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 700,
      boxShadow: '0 4px 14px rgba(74,55,40,.22)',
    },

    searchWrap: { position: 'relative', marginBottom: 12 },
    searchIcon: { position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' },
    search: { ...ui.input, paddingLeft: 40, height: 44 },
    searchClear: {
      position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
      background: t.surfaceAlt, border: 'none', borderRadius: 999,
      width: 22, height: 22, fontSize: 11, color: t.mute, cursor: 'pointer',
      display: 'grid', placeItems: 'center', lineHeight: 1,
    },

    chipsRow: { marginBottom: 14, marginLeft: -20, marginRight: -20 },
    chipsScroll: {
      display: 'flex', gap: 6, overflowX: 'auto',
      padding: '4px 20px 8px',
      scrollbarWidth: 'none', msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    },
    chip: {
      flexShrink: 0,
      padding: '8px 14px', borderRadius: 999,
      background: t.surface, border: `0.5px solid ${t.border}`,
      fontFamily: fonts.sans, fontSize: 13, color: t.text, fontWeight: 500,
      cursor: 'pointer', whiteSpace: 'nowrap',
    },
    chipOn: {
      background: t.accent, borderColor: t.accent, color: '#fff', fontWeight: 600,
      boxShadow: '0 2px 8px rgba(77,124,77,.25)',
    },

    lista: { display: 'flex', flexDirection: 'column', gap: 8 },
    wiersz: {
      ...ui.card, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      width: '100%', cursor: 'pointer', textAlign: 'left',
      fontFamily: fonts.sans, boxSizing: 'border-box',
      border: `1.5px solid transparent`,
    },
    wierszWybrany: {
      border: `1.5px solid ${t.accent}`,
      background: t.accentSoft,
    },
    thumb: {
      width: 52, height: 52, borderRadius: 13,
      display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0,
    },
    thumbImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
    thumbEmoji: { fontSize: 26 },
    wierszInfo: { flex: 1, minWidth: 0 },
    wierszNazwa: {
      fontFamily: fonts.serif, fontSize: 17, color: t.text,
      letterSpacing: -0.1, lineHeight: 1.15,
    },
    wierszRodzaj: {
      fontFamily: fonts.sans, fontSize: 11, color: t.mute, marginTop: 3,
      textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600,
    },
    check: {
      width: 24, height: 24, borderRadius: '50%',
      border: `1.5px solid ${t.borderStrong}`,
      display: 'grid', placeItems: 'center', flexShrink: 0,
      background: 'transparent',
    },
    checkOn: {
      background: t.accent, borderColor: t.accent,
    },

    loading: {
      textAlign: 'center', padding: '40px 20px',
      fontFamily: fonts.sans, fontSize: 14, color: t.mute,
    },
    empty: {
      ...ui.card, padding: '40px 20px', textAlign: 'center',
      color: t.mute, fontFamily: fonts.sans, fontSize: 14,
    },
  }
}
