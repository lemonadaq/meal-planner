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

            {/* Edytor skladniki_meta (opakowania) */}
            <SkladnikiMetaEdytor />
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Edytor opakowań — które składniki mają być przeliczane na "opak."
// ════════════════════════════════════════════════════════════
const JEDNOSTKI_BAZOWE = ['g', 'ml']
const JEDNOSTKI_OPAK = ['opak.', 'kostka', 'butelka', 'puszka', 'kubek', 'kg', 'l', 'szt.']

function SkladnikiMetaEdytor() {
  const [meta, setMeta] = useState([])
  const [loading, setLoading] = useState(true)
  const [nowy, setNowy] = useState({
    nazwa: '', jednostka_bazowa: 'g',
    rozmiar_opakowania: '', jednostka_opakowania: 'opak.',
    zaokraglaj: true,
  })
  const [filtr, setFiltr] = useState('')
  const [zapisuje, setZapisuje] = useState(false)

  useEffect(() => { pobierz() }, [])

  async function pobierz() {
    setLoading(true)
    const { data } = await supabase.from('skladniki_meta').select('*').order('nazwa')
    setMeta(data || [])
    setLoading(false)
  }

  async function dodaj() {
    if (!nowy.nazwa.trim() || !nowy.rozmiar_opakowania) return
    setZapisuje(true)
    const rec = {
      nazwa: nowy.nazwa.trim(),
      jednostka_bazowa: nowy.jednostka_bazowa,
      rozmiar_opakowania: parseFloat(String(nowy.rozmiar_opakowania).replace(',', '.')),
      jednostka_opakowania: nowy.jednostka_opakowania,
      zaokraglaj: nowy.zaokraglaj,
    }
    const { data, error } = await supabase.from('skladniki_meta').upsert(rec).select().single()
    if (error) { alert('Błąd: ' + error.message); setZapisuje(false); return }
    setMeta(prev => {
      const bez = prev.filter(m => m.nazwa !== rec.nazwa)
      return [...bez, data].sort((a, b) => a.nazwa.localeCompare(b.nazwa))
    })
    setNowy({ nazwa: '', jednostka_bazowa: 'g', rozmiar_opakowania: '', jednostka_opakowania: 'opak.', zaokraglaj: true })
    setZapisuje(false)
  }

  async function aktualizuj(nazwa, pola) {
    const { data, error } = await supabase.from('skladniki_meta')
      .update(pola).eq('nazwa', nazwa).select().single()
    if (error) { alert('Błąd: ' + error.message); return }
    setMeta(prev => prev.map(m => m.nazwa === nazwa ? data : m))
  }

  async function usun(nazwa) {
    if (!confirm(`Usunąć "${nazwa}"?`)) return
    await supabase.from('skladniki_meta').delete().eq('nazwa', nazwa)
    setMeta(prev => prev.filter(m => m.nazwa !== nazwa))
  }

  const widoczne = meta.filter(m =>
    !filtr || m.nazwa.toLowerCase().includes(filtr.toLowerCase())
  )

  return (
    <section style={s.section}>
      <h2 style={s.sectionTitle}>Opakowania składników</h2>
      <p style={metaS.opis}>
        Dla składników wpisanych poniżej lista zakupów pokaże zaokrągloną liczbę
        opakowań zamiast surowej ilości w g/ml. Brak rekordu = pokazujemy oryginał.
      </p>

      {/* Formularz dodawania */}
      <div style={metaS.formularz}>
        <input
          style={metaS.input}
          placeholder="Nazwa składnika (np. Frytki mrożone)"
          value={nowy.nazwa}
          onChange={e => setNowy(p => ({ ...p, nazwa: e.target.value }))}
        />
        <div style={metaS.rzad}>
          <select
            style={{ ...metaS.input, flex: 1 }}
            value={nowy.jednostka_bazowa}
            onChange={e => setNowy(p => ({ ...p, jednostka_bazowa: e.target.value }))}
          >
            {JEDNOSTKI_BAZOWE.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <input
            style={{ ...metaS.input, flex: 1 }}
            type="number"
            placeholder="Rozmiar (np. 1000)"
            value={nowy.rozmiar_opakowania}
            onChange={e => setNowy(p => ({ ...p, rozmiar_opakowania: e.target.value }))}
          />
          <select
            style={{ ...metaS.input, flex: 1 }}
            value={nowy.jednostka_opakowania}
            onChange={e => setNowy(p => ({ ...p, jednostka_opakowania: e.target.value }))}
          >
            {JEDNOSTKI_OPAK.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <label style={metaS.checkRow}>
          <input
            type="checkbox"
            checked={nowy.zaokraglaj}
            onChange={e => setNowy(p => ({ ...p, zaokraglaj: e.target.checked }))}
          />
          Zaokrąglaj w górę (np. 500g → 1 opak. dla paczki 1kg)
        </label>
        <button style={metaS.btn} onClick={dodaj} disabled={zapisuje}>
          {zapisuje ? 'Zapisuję…' : '+ Dodaj / zaktualizuj'}
        </button>
      </div>

      {/* Filtr + lista */}
      <input
        style={{ ...metaS.input, marginTop: 16 }}
        placeholder="Szukaj…"
        value={filtr}
        onChange={e => setFiltr(e.target.value)}
      />

      {loading ? (
        <div style={s.loading}>Ładuję…</div>
      ) : widoczne.length === 0 ? (
        <div style={s.empty}>Brak rekordów.</div>
      ) : (
        <div style={metaS.lista}>
          {widoczne.map(m => (
            <div key={m.nazwa} style={metaS.row}>
              <div style={metaS.rowInfo}>
                <div style={metaS.rowNazwa}>{m.nazwa}</div>
                <div style={metaS.rowMeta}>
                  {m.rozmiar_opakowania} {m.jednostka_bazowa} / {m.jednostka_opakowania}
                  {m.zaokraglaj && <span style={metaS.tag}>↑ zaokr.</span>}
                </div>
              </div>
              <button style={metaS.usunBtn} onClick={() => usun(m.nazwa)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const metaS = {
  opis: { fontSize: 12.5, color: t.mute, marginBottom: 12, lineHeight: 1.45 },
  formularz: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: t.surfaceAlt, borderRadius: 12 },
  rzad: { display: 'flex', gap: 8 },
  input: {
    padding: '8px 12px', border: `1px solid ${t.border}`, borderRadius: 8,
    background: t.surface, fontSize: 13, fontFamily: fonts.sans, color: t.text,
    outline: 'none', boxSizing: 'border-box', width: '100%',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: t.text, cursor: 'pointer' },
  btn: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 14px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
  },
  lista: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px', background: t.surface, borderRadius: 8,
    border: `1px solid ${t.border}`,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowNazwa: { fontSize: 13.5, color: t.text, fontWeight: 600 },
  rowMeta: { fontSize: 11.5, color: t.mute, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 },
  tag: {
    fontSize: 10, color: t.accent, background: t.surfaceAlt,
    padding: '1px 5px', borderRadius: 3, fontWeight: 600,
  },
  usunBtn: {
    background: 'transparent', border: 'none', color: t.mute,
    cursor: 'pointer', fontSize: 14, padding: '4px 8px',
  },
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
