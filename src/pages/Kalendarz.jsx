import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

const DNI = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const DNI_KROTKO = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

function getPoniedzialek(offset = 0) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
function formatData(date) { return date.toISOString().split('T')[0] }
function formatKrotkoMies(date) {
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}
function formatMiesiacRok(date) {
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

export default function Kalendarz({ user, onBack, domyslnePorcje = 1, sledz }) {
  const [tydzien, setTydzien] = useState(0)
  const [dania, setDania] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [plan, setPlan] = useState({})
  const [loading, setLoading] = useState(true)
  const [zapisywanie, setZapisywanie] = useState(false)
  const [widok, setWidok] = useState('tydzien')
  const [aktywnyDzien, setAktywnyDzien] = useState(0)

  const [podmianaModal, setPodmianaModal] = useState(null)

  const poniedzialek = getPoniedzialek(tydzien)
  const dni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(poniedzialek)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => {
    if (tydzien === 0) {
      const d = new Date()
      const today = (d.getDay() || 7) - 1
      setAktywnyDzien(today)
    } else {
      setAktywnyDzien(0)
    }
  }, [tydzien])

  useEffect(() => {
    async function pobierzDane() {
      setLoading(true)

      const [{ data: d }, { data: do_ }, { data: sur }] = await Promise.all([
        supabase.from('dania').select('*').order('"Danie"'),
        supabase.from('dodatki').select('"Dodatek"').order('"Dodatek"'),
        supabase.from('surowki').select('"Surówka"').order('"Surówka"'),
      ])

      const unikalDania = [...new Map((d || []).map(x => [x['Danie'], x])).values()]
      setDania(unikalDania)
      setDodatki([...new Set((do_ || []).map(x => x.Dodatek))])
      setSurowki([...new Set((sur || []).map(x => x['Surówka']))])

      const od = formatData(dni[0])
      const doStr = formatData(dni[6])
      const { data: planData } = await supabase
        .from('kalendarz')
        .select('*')
        .eq('user_id', user.id)
        .gte('data', od)
        .lte('data', doStr)

      const nowyPlan = {}
      ;(planData || []).forEach(p => { nowyPlan[`${p.data}_${p.posilek}`] = p })
      setPlan(nowyPlan)
      setLoading(false)
    }
    pobierzDane()
  }, [tydzien])

  async function zapiszWpis(dataStr, posilek, pole, wartosc) {
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    setZapisywanie(true)

    // Zmiana dania = reset dodatku/surówki/podmian.
    // Porcje zostają (user mógł je już ustawić wcześniej).
    const dodatkoweReset = pole === 'danie'
      ? { dodatek: null, surowka: null, podmiany: {} }
      : {}

    if (istniejacy) {
      const { data: zaktualizowany } = await supabase
        .from('kalendarz')
        .update({ [pole]: wartosc, ...dodatkoweReset })
        .eq('id', istniejacy.id)
        .select()
        .single()
      setPlan(prev => ({ ...prev, [klucz]: zaktualizowany }))
    } else {
      const { data: nowy } = await supabase
        .from('kalendarz')
        .insert({ user_id: user.id, data: dataStr, posilek, [pole]: wartosc })
        .select()
        .single()
      setPlan(prev => ({ ...prev, [klucz]: nowy }))
      // Analytics: dopiero przy CREATE (nie przy każdej edycji)
      if (pole === 'danie' && wartosc) {
        sledz?.('zaplanuj_posilek', { dzien: dataStr, posilek, danie: wartosc })
      }
    }
    setZapisywanie(false)
  }

  async function zmienPorcje(dataStr, posilek, nowaWart) {
    // nowaWart może być null = wróć do domyślnej
    const klucz = `${dataStr}_${posilek}`
    const istniejacy = plan[klucz]
    if (!istniejacy) return
    setZapisywanie(true)
    const { data } = await supabase
      .from('kalendarz')
      .update({ porcje: nowaWart })
      .eq('id', istniejacy.id)
      .select()
      .single()
    if (data) setPlan(prev => ({ ...prev, [klucz]: data }))
    setZapisywanie(false)
  }

  async function zapiszPodmiany(wpisId, podmiany) {
    setZapisywanie(true)
    const { data } = await supabase
      .from('kalendarz')
      .update({ podmiany })
      .eq('id', wpisId)
      .select()
      .single()
    if (data) {
      const klucz = `${data.data}_${data.posilek}`
      setPlan(prev => ({ ...prev, [klucz]: data }))
      const liczba = Object.keys(podmiany).filter(k => podmiany[k]).length
      if (liczba > 0) sledz?.('podmien_skladnik', { ile: liczba, danie: data.danie })
    }
    setZapisywanie(false)
  }

  function pobierzTypDania(nazwaDania) {
    if (!nazwaDania) return 'samodzielne'
    return dania.find(x => x['Danie'] === nazwaDania)?.['TYP'] || 'samodzielne'
  }

  if (loading) return <div style={s.loading}>Ładowanie planu…</div>

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div>
            <div style={s.eyebrow}>{formatMiesiacRok(dni[3])}</div>
            <h1 style={s.title}>
              <em style={s.italic}>Twój</em> tydzień
            </h1>
            <div style={s.subRange}>{formatKrotkoMies(dni[0])} — {formatKrotkoMies(dni[6])}</div>
          </div>
          <div style={s.navRow}>
            <button style={s.navBtn} onClick={() => setTydzien(t => t - 1)} aria-label="Poprzedni tydzień">‹</button>
            <button style={s.navBtn} onClick={() => setTydzien(t => t + 1)} aria-label="Następny tydzień">›</button>
          </div>
        </header>

        <div style={s.toggleRow}>
          <div style={s.toggle}>
            {[
              { v: 'tydzien', label: 'Tydzień' },
              { v: 'dzien', label: 'Dzień' },
            ].map(b => (
              <button key={b.v}
                style={{ ...s.toggleBtn, ...(widok === b.v ? s.toggleBtnActive : {}) }}
                onClick={() => setWidok(b.v)}>
                {b.label}
              </button>
            ))}
          </div>
          {zapisywanie && <div style={s.saving}>Zapisuję…</div>}
        </div>

        <div style={s.dayStrip}>
          {dni.map((dzien, i) => {
            const isToday = formatData(dzien) === formatData(new Date())
            const isActive = widok === 'dzien' && aktywnyDzien === i
            return (
              <button
                key={i}
                style={{
                  ...s.dayPill,
                  background: isActive ? t.accent : (isToday ? t.accentSoft : 'transparent'),
                  color: isActive ? '#fff' : t.text,
                  borderColor: isActive ? 'transparent' : (isToday ? t.accent : t.border),
                }}
                onClick={() => { setWidok('dzien'); setAktywnyDzien(i) }}>
                <span style={{ ...s.dayPillDow, opacity: isActive ? 0.85 : 0.55 }}>
                  {DNI_KROTKO[i]}
                </span>
                <span style={{
                  ...s.dayPillDate,
                  color: isActive ? '#fff' : (isToday ? t.accent : t.text),
                }}>
                  {dzien.getDate()}
                </span>
                <span style={s.dayPillDots}>
                  {POSILKI.map(p => {
                    const v = plan[`${formatData(dzien)}_${p}`]?.danie
                    return (
                      <span key={p} style={{
                        width: 3, height: 3, borderRadius: 999,
                        background: v ? (isActive ? '#fff' : t.accent) : t.borderStrong,
                        opacity: v ? 1 : 0.45,
                      }} />
                    )
                  })}
                </span>
              </button>
            )
          })}
        </div>

        {widok === 'tydzien' ? (
          <div style={s.tydzienList}>
            {dni.map((dzien, di) => {
              const dataStr = formatData(dzien)
              const isToday = dataStr === formatData(new Date())
              return (
                <section key={dataStr} style={s.dzienBlok}>
                  <div style={s.dzienHeader}>
                    <h3 style={s.dzienTytul}>
                      {DNI[di]} <span style={s.dzienData}>· {dzien.getDate()}</span>
                    </h3>
                    {isToday && <span style={s.todayChip}>Dziś</span>}
                  </div>
                  <div style={s.posilkiInline}>
                    {POSILKI.map(posilek => {
                      const wpis = plan[`${dataStr}_${posilek}`]
                      const typ = pobierzTypDania(wpis?.danie)
                      return (
                        <PosilekRow
                          key={posilek}
                          posilek={posilek}
                          wpis={wpis}
                          dania={dania}
                          dodatki={dodatki}
                          surowki={surowki}
                          domyslnePorcje={domyslnePorcje}
                          pokazDodatki={typ === 'z_dodatkiem'}
                          onChange={(pole, v) => zapiszWpis(dataStr, posilek, pole, v)}
                          onPorcje={(p) => zmienPorcje(dataStr, posilek, p)}
                          onPodmien={() => setPodmianaModal({ dataStr, posilek, wpis })}
                          compact
                        />
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <section style={s.dzienCard}>
            <div style={s.dzienCardHeader}>
              <h3 style={s.dzienCardTytul}>
                {DNI[aktywnyDzien]}, <em style={s.italic}>{formatKrotkoMies(dni[aktywnyDzien])}</em>
              </h3>
            </div>
            <div style={s.posilkiBig}>
              {POSILKI.map(posilek => {
                const dataStr = formatData(dni[aktywnyDzien])
                const wpis = plan[`${dataStr}_${posilek}`]
                const typ = pobierzTypDania(wpis?.danie)
                return (
                  <PosilekRow
                    key={posilek}
                    posilek={posilek}
                    wpis={wpis}
                    dania={dania}
                    dodatki={dodatki}
                    surowki={surowki}
                    domyslnePorcje={domyslnePorcje}
                    pokazDodatki={typ === 'z_dodatkiem'}
                    onChange={(pole, v) => zapiszWpis(dataStr, posilek, pole, v)}
                    onPorcje={(p) => zmienPorcje(dataStr, posilek, p)}
                    onPodmien={() => setPodmianaModal({ dataStr, posilek, wpis })}
                  />
                )
              })}
            </div>
          </section>
        )}
      </div>

      {podmianaModal?.wpis && (
        <PodmianaModal
          wpis={podmianaModal.wpis}
          onClose={() => setPodmianaModal(null)}
          onSave={(podmiany) => {
            zapiszPodmiany(podmianaModal.wpis.id, podmiany)
            setPodmianaModal(null)
          }}
        />
      )}
    </div>
  )
}

function PosilekRow({ posilek, wpis, dania, dodatki, surowki, pokazDodatki, onChange, onPorcje, onPodmien, domyslnePorcje, compact }) {
  const liczbaPodmian = wpis?.podmiany ? Object.keys(wpis.podmiany).filter(k => wpis.podmiany[k]).length : 0
  const masDanie = !!wpis?.danie
  // Porcje: wartość z bazy lub domyślne. Wyświetlamy jako gwiazdkę jak różni się od domyślnej.
  const porcje = wpis?.porcje != null ? wpis.porcje : domyslnePorcje
  const porcjeRozne = wpis?.porcje != null && wpis.porcje !== domyslnePorcje

  function nawigujPorcje(delta) {
    const nowe = Math.max(0.5, Math.min(20, +(porcje + delta).toFixed(1)))
    // null jak wróciły do domyślnych (czystsza baza)
    onPorcje(nowe === domyslnePorcje ? null : nowe)
  }

  return (
    <div style={{ ...s.posilekRow, ...(compact ? s.posilekRowCompact : {}) }}>
      <div style={s.posilekHeader}>
        <div style={s.posilekLabel}>{posilek}</div>
        {masDanie && (
          <div style={s.posilekTools}>
            <div style={s.porcjeWidget}>
              <button style={s.porcjeMini} onClick={() => nawigujPorcje(-0.5)} aria-label="Mniej porcji">−</button>
              <span style={{ ...s.porcjeWart, color: porcjeRozne ? t.warm : t.mute }}>
                {porcje}
              </span>
              <button style={s.porcjeMini} onClick={() => nawigujPorcje(0.5)} aria-label="Więcej porcji">+</button>
            </div>
            <button style={s.podmienBtn}
              onClick={onPodmien}
              title={liczbaPodmian > 0 ? `${liczbaPodmian} podmian` : 'Podmień składnik'}>
              ↻ {liczbaPodmian > 0 ? `${liczbaPodmian}` : ''}
            </button>
          </div>
        )}
      </div>
      <select
        style={s.select}
        value={wpis?.danie || ''}
        onChange={e => onChange('danie', e.target.value || null)}
      >
        <option value="">— wybierz danie —</option>
        {dania.map(d => (<option key={d.Danie} value={d.Danie}>{d.Danie}</option>))}
      </select>
      {pokazDodatki && (
        <div style={s.selectRow}>
          <select style={{ ...s.select, ...s.selectMaly }} value={wpis?.dodatek || ''} onChange={e => onChange('dodatek', e.target.value || null)}>
            <option value="">+ dodatek</option>
            {dodatki.map(d => (<option key={d} value={d}>{d}</option>))}
          </select>
          <select style={{ ...s.select, ...s.selectMaly }} value={wpis?.surowka || ''} onChange={e => onChange('surowka', e.target.value || null)}>
            <option value="">+ surówka</option>
            {surowki.map(s2 => (<option key={s2} value={s2}>{s2}</option>))}
          </select>
        </div>
      )}
    </div>
  )
}

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
      const unikalne = [...new Set(wszystkie.filter(Boolean))]
      setSkladniki(unikalne)
      setLoading(false)
    }
    pobierz()
  }, [wpis.danie, wpis.dodatek, wpis.surowka])

  function ustawPodmiane(skladnik, nowy) {
    setPodmiany(prev => {
      const n = { ...prev }
      if (!nowy || nowy.trim() === '' || nowy.trim() === skladnik) {
        delete n[skladnik]
      } else {
        n[skladnik] = nowy.trim()
      }
      return n
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
                <input
                  style={modS.input}
                  placeholder="bez zmian"
                  value={podmiany[sk] || ''}
                  onChange={e => ustawPodmiane(sk, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <div style={modS.btnRow}>
          <button style={{ ...ui.btnGhost, flex: 1, padding: '12px 16px' }} onClick={onClose}>
            Anuluj
          </button>
          <button style={{ ...ui.btnPrimary, flex: 1, padding: '12px 16px' }} onClick={() => onSave(podmiany)}>
            Zapisz
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 32px',
    maxWidth: 760, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, marginBottom: 18,
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 4, textTransform: 'capitalize' },
  title: { ...ui.h1, fontSize: 32, lineHeight: 1 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },
  subRange: { fontFamily: fonts.sans, fontSize: 13, color: t.mute, marginTop: 4 },
  navRow: { display: 'flex', gap: 8 },
  navBtn: {
    width: 36, height: 36, borderRadius: 999,
    border: `0.5px solid ${t.border}`, background: t.surface,
    fontFamily: fonts.serif, fontSize: 20, color: t.text,
    cursor: 'pointer', display: 'grid', placeItems: 'center',
  },
  toggleRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, gap: 12,
  },
  toggle: {
    display: 'inline-flex', padding: 3, borderRadius: 999,
    background: t.surfaceAlt,
  },
  toggleBtn: {
    padding: '6px 14px', borderRadius: 999, border: 'none',
    background: 'transparent', color: t.mute,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  toggleBtnActive: { background: t.surface, color: t.text, fontWeight: 600, boxShadow: '0 1px 2px rgba(74,55,40,.08)' },
  saving: { fontFamily: fonts.sans, fontSize: 12, color: t.accent, fontWeight: 500 },
  dayStrip: { display: 'flex', gap: 4, marginBottom: 18 },
  dayPill: {
    flex: 1, padding: '10px 0 8px',
    borderRadius: 16, border: '0.5px solid', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    fontFamily: fonts.sans, transition: 'background .15s, color .15s',
  },
  dayPillDow: { fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' },
  dayPillDate: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 1, letterSpacing: -0.2 },
  dayPillDots: { display: 'flex', gap: 2, marginTop: 2 },

  tydzienList: { display: 'flex', flexDirection: 'column', gap: 10 },
  dzienBlok: { ...ui.card, padding: '14px 16px' },
  dzienHeader: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 },
  dzienTytul: { ...ui.h3, fontSize: 17 },
  dzienData: { color: t.mute, fontFamily: fonts.sans, fontSize: 13, fontWeight: 400 },
  todayChip: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
    color: t.warm, letterSpacing: 1, textTransform: 'uppercase',
  },
  posilkiInline: { display: 'flex', flexDirection: 'column', gap: 8 },

  dzienCard: { ...ui.card, padding: 18 },
  dzienCardHeader: { marginBottom: 14 },
  dzienCardTytul: { ...ui.h2, fontSize: 22 },
  posilkiBig: { display: 'flex', flexDirection: 'column', gap: 14 },

  posilekRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  posilekRowCompact: { gap: 4 },
  posilekHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 8,
  },
  posilekLabel: { ...ui.slotLabel },
  posilekTools: { display: 'flex', alignItems: 'center', gap: 4 },

  porcjeWidget: {
    display: 'flex', alignItems: 'center', gap: 0,
    background: t.surfaceAlt, borderRadius: 999, padding: '0 2px',
  },
  porcjeMini: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: t.text, width: 22, height: 22,
    fontSize: 14, fontFamily: fonts.serif, lineHeight: 1,
    display: 'grid', placeItems: 'center',
  },
  porcjeWart: {
    fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
  },

  podmienBtn: {
    background: 'none', border: 'none',
    color: t.warm, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.5, cursor: 'pointer',
    padding: '2px 6px', borderRadius: 8,
    fontFamily: fonts.sans,
  },

  selectRow: { display: 'flex', gap: 6 },
  select: {
    ...ui.input,
    padding: '10px 12px', fontSize: 14, marginBottom: 0,
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='%237A6B5C' d='M0 0h10L5 6z'/></svg>")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 30,
  },
  selectMaly: { flex: 1, fontSize: 13, padding: '9px 10px', paddingRight: 26 },

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
    background: t.surface,
    borderRadius: '22px 22px 0 0',
    padding: '22px 22px 32px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans, maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: t.text, letterSpacing: -0.2, lineHeight: 1.1 },
  sub: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 6 },
  close: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
  },
  loading: { padding: '24px 0', textAlign: 'center', color: t.mute, fontSize: 13 },
  lista: { overflowY: 'auto', flex: 1, marginBottom: 16, paddingRight: 4 },
  row: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 0',
    borderBottom: `0.5px solid ${t.border}`,
  },
  orig: { flex: 1, fontSize: 13.5, color: t.text, minWidth: 0 },
  arrow: { color: t.muteLight, fontSize: 12, flexShrink: 0 },
  input: {
    ...ui.input, flex: 1.2, padding: '8px 10px', fontSize: 13, marginBottom: 0,
  },
  btnRow: { display: 'flex', gap: 8 },
}
