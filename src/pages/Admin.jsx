import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

const TABS_LABEL = {
  home:     'Home',
  planer:   'Planer',
  przepisy: 'Przepisy',
  zakupy:   'Zakupy',
}

const AKCJE_LABEL = {
  dodaj_danie:           'Dodano nowy wpis',
  zaplanuj_posilek:      'Zaplanowano posiłek',
  dodaj_do_kalendarza:   'Dodanie z przepisu',
  edytuj_danie:          'Edycja dania',
  podmien_skladnik:      'Podmiana składnika',
  kupione:               'Odznaczono zakup',
}

function fmtCzas(sek) {
  if (!sek) return '–'
  if (sek < 60) return `${sek}s`
  const m = Math.floor(sek / 60)
  const s = sek % 60
  return `${m}m ${s}s`
}

function fmtDataKr(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export default function Admin({ onBack }) {
  const [dane, setDane] = useState([])
  const [loading, setLoading] = useState(true)
  const [zakres, setZakres] = useState(7)
  const [blad, setBlad] = useState('')

  useEffect(() => {
    async function pobierz() {
      setLoading(true); setBlad('')
      const od = new Date()
      od.setDate(od.getDate() - zakres)
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .gte('created_at', od.toISOString())
        .order('created_at', { ascending: false })
        .limit(5000)
      if (error) {
        setBlad('Brak uprawnień lub błąd: ' + error.message)
        setDane([])
      } else {
        setDane(data || [])
      }
      setLoading(false)
    }
    pobierz()
  }, [zakres])

  // ─── Agregaty ───
  const userzy = new Set(dane.filter(d => d.user_email).map(d => d.user_email))
  const totalZdarzen = dane.length

  // Aktywność per dzień
  const aktywnoscDziennie = {}
  dane.forEach(d => {
    const dzien = d.created_at?.split('T')[0]
    if (!dzien) return
    if (!aktywnoscDziennie[dzien]) aktywnoscDziennie[dzien] = new Set()
    if (d.user_email) aktywnoscDziennie[dzien].add(d.user_email)
  })
  const dniSorted = Object.entries(aktywnoscDziennie)
    .sort((a, b) => b[0].localeCompare(a[0]))
  const maxDziennie = Math.max(1, ...Object.values(aktywnoscDziennie).map(s => s.size))

  // Wejścia w zakładki
  const wejscia = {}
  dane.filter(d => d.zdarzenie === 'tab_view').forEach(d => {
    wejscia[d.wartosc] = (wejscia[d.wartosc] || 0) + 1
  })
  const sumaWejsc = Object.values(wejscia).reduce((a, b) => a + b, 0) || 1

  // Średni czas na zakładkę
  const czasy = {}
  dane.filter(d => d.zdarzenie === 'tab_czas' && d.czas_trwania_s).forEach(d => {
    if (!czasy[d.wartosc]) czasy[d.wartosc] = { suma: 0, n: 0 }
    czasy[d.wartosc].suma += d.czas_trwania_s
    czasy[d.wartosc].n += 1
  })

  // Akcje
  const akcje = {}
  dane.filter(d => d.zdarzenie === 'akcja').forEach(d => {
    akcje[d.wartosc] = (akcje[d.wartosc] || 0) + 1
  })

  // Per użytkownik
  const perUser = {}
  dane.forEach(d => {
    const u = d.user_email || '(anonim)'
    if (!perUser[u]) perUser[u] = { zdarzen: 0, czas: 0, ostatnio: null }
    perUser[u].zdarzen += 1
    if (d.czas_trwania_s) perUser[u].czas += d.czas_trwania_s
    if (!perUser[u].ostatnio || d.created_at > perUser[u].ostatnio) {
      perUser[u].ostatnio = d.created_at
    }
  })
  const perUserSorted = Object.entries(perUser).sort((a, b) => b[1].zdarzen - a[1].zdarzen)

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div style={s.eyebrow}>ANALITYKA</div>
          <h1 style={s.title}>Panel <em style={s.italic}>admina</em></h1>
        </header>

        <div style={s.zakresRow}>
          {[7, 14, 30, 90].map(n => (
            <button key={n}
              style={{ ...s.zakresBtn, ...(zakres === n ? s.zakresBtnAkt : {}) }}
              onClick={() => setZakres(n)}>
              {n} dni
            </button>
          ))}
        </div>

        {blad && <div style={s.blad}>{blad}</div>}

        {loading ? (
          <div style={s.loading}>Ładuję dane…</div>
        ) : (
          <>
            {/* Statystyki ogólne */}
            <div style={s.statyRow}>
              <Stat label="Aktywni userzy" value={userzy.size} />
              <Stat label="Zdarzeń" value={totalZdarzen} />
              <Stat label="Wejść w zakładki" value={Object.values(wejscia).reduce((a,b)=>a+b,0)} />
            </div>

            {/* Aktywność per dzień */}
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Aktywni dziennie</h2>
              {dniSorted.length === 0 ? (
                <div style={s.empty}>Brak danych w wybranym zakresie.</div>
              ) : (
                <div style={s.barLista}>
                  {dniSorted.slice(0, 30).map(([dzien, set]) => (
                    <div key={dzien} style={s.barRow}>
                      <span style={s.barLabel}>{fmtDataKr(dzien)}</span>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${(set.size / maxDziennie) * 100}%` }} />
                      </div>
                      <span style={s.barWart}>{set.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Wejścia w zakładki */}
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Popularność zakładek</h2>
              {Object.keys(wejscia).length === 0 ? (
                <div style={s.empty}>Brak wejść.</div>
              ) : (
                <div style={s.barLista}>
                  {Object.entries(wejscia).sort((a, b) => b[1] - a[1]).map(([tab, n]) => {
                    const cz = czasy[tab]
                    const sredni = cz ? Math.round(cz.suma / cz.n) : 0
                    return (
                      <div key={tab} style={s.barRow}>
                        <span style={s.barLabel}>{TABS_LABEL[tab] || tab}</span>
                        <div style={s.barTrack}>
                          <div style={{ ...s.barFill, width: `${(n / sumaWejsc) * 100}%` }} />
                        </div>
                        <span style={s.barWart}>{n}</span>
                        <span style={s.barCzas}>śr. {fmtCzas(sredni)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Akcje */}
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Akcje użytkowników</h2>
              {Object.keys(akcje).length === 0 ? (
                <div style={s.empty}>Brak akcji.</div>
              ) : (
                <div style={s.akcjeLista}>
                  {Object.entries(akcje).sort((a, b) => b[1] - a[1]).map(([akcja, n]) => (
                    <div key={akcja} style={s.akcjaRow}>
                      <span style={s.akcjaNazwa}>{AKCJE_LABEL[akcja] || akcja}</span>
                      <span style={s.akcjaN}>{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Per użytkownik */}
            <section style={s.section}>
              <h2 style={s.sectionTitle}>Użytkownicy</h2>
              {perUserSorted.length === 0 ? (
                <div style={s.empty}>Brak danych.</div>
              ) : (
                <div style={s.userLista}>
                  {perUserSorted.map(([email, info]) => (
                    <div key={email} style={s.userRow}>
                      <div style={s.userInfo}>
                        <div style={s.userEmail}>{email}</div>
                        <div style={s.userMeta}>
                          {info.zdarzen} zdarzeń · łącznie {fmtCzas(info.czas)} ·
                          ostatnio {info.ostatnio ? fmtDataKr(info.ostatnio) : '–'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={s.stat}>
      <div style={s.statVal}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 40px',
    maxWidth: 760, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  header: { marginBottom: 18 },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { ...ui.h1, fontSize: 30, lineHeight: 1 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },

  zakresRow: {
    display: 'inline-flex', padding: 3, borderRadius: 999,
    background: t.surfaceAlt, marginBottom: 16,
  },
  zakresBtn: {
    padding: '6px 14px', borderRadius: 999, border: 'none',
    background: 'transparent', color: t.mute,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  zakresBtnAkt: {
    background: t.surface, color: t.text, fontWeight: 600,
    boxShadow: '0 1px 2px rgba(74,55,40,.08)',
  },

  blad: {
    ...ui.card, padding: 14, marginBottom: 14,
    background: '#FEEBE5', border: `1px solid ${t.warmSoft}`,
    fontSize: 13, color: t.danger,
  },
  loading: {
    ...ui.card, padding: 30, textAlign: 'center',
    color: t.mute, fontSize: 14,
  },

  statyRow: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
    marginBottom: 14,
  },
  stat: {
    ...ui.card, padding: '14px 12px', textAlign: 'center',
  },
  statVal: {
    fontFamily: fonts.serif, fontSize: 28, color: t.accent,
    fontStyle: 'italic', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 600,
    letterSpacing: 0.8, textTransform: 'uppercase', color: t.mute,
    marginTop: 6,
  },

  section: { ...ui.card, padding: 20, marginBottom: 14 },
  sectionTitle: { ...ui.h2, fontSize: 18, marginBottom: 14 },
  empty: { fontSize: 13, color: t.mute, padding: '6px 0' },

  barLista: { display: 'flex', flexDirection: 'column', gap: 8 },
  barRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: fonts.sans, fontSize: 13,
  },
  barLabel: { minWidth: 76, color: t.text, fontSize: 13 },
  barTrack: {
    flex: 1, height: 8, borderRadius: 999,
    background: t.surfaceAlt, overflow: 'hidden',
  },
  barFill: {
    height: '100%', background: `linear-gradient(90deg, ${t.accent}, ${t.accentDark})`,
    borderRadius: 999, transition: 'width .3s',
  },
  barWart: {
    minWidth: 32, textAlign: 'right',
    fontVariantNumeric: 'tabular-nums', color: t.text, fontWeight: 600, fontSize: 13,
  },
  barCzas: {
    minWidth: 70, textAlign: 'right',
    fontSize: 11, color: t.mute, fontVariantNumeric: 'tabular-nums',
  },

  akcjeLista: { display: 'flex', flexDirection: 'column', gap: 4 },
  akcjaRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: `0.5px solid ${t.border}`,
    fontFamily: fonts.sans,
  },
  akcjaNazwa: { fontSize: 14, color: t.text },
  akcjaN: {
    fontVariantNumeric: 'tabular-nums', fontWeight: 700,
    color: t.accent, fontSize: 14,
  },

  userLista: { display: 'flex', flexDirection: 'column', gap: 0 },
  userRow: {
    padding: '10px 0', borderBottom: `0.5px solid ${t.border}`,
  },
  userInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  userEmail: { fontSize: 13.5, color: t.text, fontWeight: 500 },
  userMeta: { fontSize: 11.5, color: t.mute, fontVariantNumeric: 'tabular-nums' },
}
