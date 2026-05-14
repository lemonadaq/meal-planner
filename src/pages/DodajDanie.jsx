import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżki', 'łyżeczka', 'szklanka', 'ząbki', 'pęczek', 'garść', 'do smaku']

const KATEGORIE = {
  'Warzywa i owoce':    '1_Warzywa i owoce',
  'Mięso i ryby':       '2_Mięso i ryby',
  'Nabiał':             '3_Nabiał',
  'Pieczywo':           '4_Pieczywo',
  'Produkty sypkie':    '5_Produkty sypkie',
  'Konserwy i słoiki':  '6_Konserwy i słoiki',
  'Przyprawy':          '7_Przyprawy',
  'Inne':               '8_Inne',
}

export default function DodajDanie({ onBack, onZapisano }) {
  const [nazwa, setNazwa] = useState('')
  const [typ, setTyp] = useState('samodzielne')
  const [skladniki, setSkladniki] = useState([])
  const [istniejaceSkladniki, setIstniejaceSkladniki] = useState([])
  const [nowyS, setNowyS] = useState({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
  const [saving, setSaving] = useState(false)
  const [blad, setBlad] = useState('')
  const [podpowiedzi, setPodpowiedzi] = useState([])
  const [tabela, setTabela] = useState('dania')

  useEffect(() => {
    async function pobierzSkladniki() {
      const { data } = await supabase.from('dania').select('"Składnik", "Jednostka", "Kategoria"')
      if (data) {
        const unikalne = [...new Map(data.map(x => [x['Składnik'], x])).values()]
        setIstniejaceSkladniki(unikalne)
      }
    }
    pobierzSkladniki()
  }, [])

  function szukajPodpowiedzi(val) {
    setNowyS(prev => ({ ...prev, nazwa: val }))
    if (val.length < 2) { setPodpowiedzi([]); return }
    const filtered = istniejaceSkladniki
      .filter(sk => sk['Składnik']?.toLowerCase().includes(val.toLowerCase()))
      .slice(0, 6)
    setPodpowiedzi(filtered)
  }
  function wybierzPodpowiedz(sk) {
    setNowyS({
      nazwa: sk['Składnik'],
      ilosc: '',
      jednostka: sk['Jednostka'] || 'g',
      kategoria: sk['Kategoria'] || '1_Warzywa i owoce',
    })
    setPodpowiedzi([])
  }
  function wyczyscFormularz() {
    setNazwa(''); setTyp('samodzielne'); setSkladniki([])
    setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
    setBlad(''); setPodpowiedzi([])
  }
  function dodajSkladnik() {
    if (!nowyS.nazwa.trim()) return
    if (skladniki.find(sk => sk.nazwa.toLowerCase() === nowyS.nazwa.toLowerCase())) {
      setBlad('Ten składnik już jest na liście'); return
    }
    setSkladniki(prev => [...prev, { ...nowyS }])
    setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
    setPodpowiedzi([]); setBlad('')
  }
  function usunSkladnik(i) { setSkladniki(prev => prev.filter((_, idx) => idx !== i)) }

  async function zapiszDanie() {
    if (!nazwa.trim()) { setBlad('Wpisz nazwę'); return }
    if (skladniki.length === 0) { setBlad('Dodaj przynajmniej jeden składnik'); return }
    setSaving(true); setBlad('')

    // Sprawdź duplikaty we wszystkich 3 tabelach
    const [{ data: wDaniach }, { data: wDodatkach }, { data: wSurowkach }] = await Promise.all([
      supabase.from('dania').select('id').eq('"Danie"', nazwa.trim()).limit(1),
      supabase.from('dodatki').select('id').eq('"Dodatek"', nazwa.trim()).limit(1),
      supabase.from('surowki').select('id').eq('"Surówka"', nazwa.trim()).limit(1),
    ])
    if ((wDaniach?.length) || (wDodatkach?.length) || (wSurowkach?.length)) {
      const gdzie = wDaniach?.length ? 'daniach' : wDodatkach?.length ? 'dodatkach' : 'surówkach'
      setBlad(`"${nazwa}" już istnieje w ${gdzie}`)
      setSaving(false); return
    }

    let rows = []
    if (tabela === 'dania') {
      rows = skladniki.map((sk, i) => ({
        'Danie': nazwa.trim(),
        'Składnik': sk.nazwa,
        'Ilość na 1 porcję': sk.ilosc || '-',
        'Jednostka': sk.jednostka,
        'Kategoria': sk.kategoria,
        'TYP': i === 0 ? typ : null,
      }))
    } else if (tabela === 'dodatki') {
      rows = skladniki.map(sk => ({
        'Dodatek': nazwa.trim(),
        'Składnik': sk.nazwa, 'Ilość na porcję': sk.ilosc || '-',
        'Jednostka': sk.jednostka, 'Kategoria': sk.kategoria,
      }))
    } else {
      rows = skladniki.map(sk => ({
        'Surówka': nazwa.trim(),
        'Składnik': sk.nazwa, 'Ilość na porcję': sk.ilosc || '-',
        'Jednostka': sk.jednostka, 'Kategoria': sk.kategoria,
      }))
    }

    const { error } = await supabase.from(tabela).insert(rows)
    if (error) setBlad('Błąd zapisu: ' + error.message)
    else onZapisano(nazwa)
    setSaving(false)
  }

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        {/* Header */}
        <header style={s.header}>
          <div style={s.eyebrow}>NOWY WPIS</div>
          <h1 style={s.title}>
            {tabela === 'dania' ? <>Dodaj <em style={s.italic}>danie</em></>
              : tabela === 'dodatki' ? <>Dodaj <em style={s.italic}>dodatek</em></>
              : <>Dodaj <em style={s.italic}>surówkę</em></>}
          </h1>
        </header>

        {/* Typ wpisu */}
        <section style={s.section}>
          <label style={s.label}>Co dodajesz?</label>
          <div style={s.segRow}>
            {[
              { val: 'dania', label: 'Danie' },
              { val: 'dodatki', label: 'Dodatek' },
              { val: 'surowki', label: 'Surówka' },
            ].map(b => (
              <button key={b.val}
                style={{ ...s.segBtn, ...(tabela === b.val ? s.segBtnOn : {}) }}
                onClick={() => setTabela(b.val)}>
                {b.label}
              </button>
            ))}
          </div>
        </section>

        {/* Nazwa */}
        <section style={s.section}>
          <label style={s.label}>Nazwa</label>
          <input
            style={s.input}
            placeholder={tabela === 'dania' ? 'np. Makaron z dynią i szałwią' : 'np. Surówka z marchewki'}
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
          />
        </section>

        {/* Typ dania (tylko dla dań) */}
        {tabela === 'dania' && (
          <section style={s.section}>
            <label style={s.label}>Typ dania</label>
            <div style={s.segRow}>
              {[
                { val: 'samodzielne', label: 'Samodzielne' },
                { val: 'z_dodatkiem', label: 'Z dodatkiem' },
              ].map(b => (
                <button key={b.val}
                  style={{ ...s.segBtn, ...(typ === b.val ? s.segBtnOn : {}) }}
                  onClick={() => setTyp(b.val)}>
                  {b.label}
                </button>
              ))}
            </div>
            <div style={s.hint}>
              {typ === 'samodzielne'
                ? 'Danie kompletne — nie wymaga dodatku ani surówki w planie.'
                : 'Do tego dania w planie kalendarza dobierzesz dodatek i surówkę.'}
            </div>
          </section>
        )}

        {/* Dodawanie składnika */}
        <section style={s.section}>
          <label style={s.label}>Dodaj składnik</label>

          <div style={{ position: 'relative' }}>
            <input
              style={s.input}
              placeholder="Składnik…"
              value={nowyS.nazwa}
              onChange={e => szukajPodpowiedzi(e.target.value)}
            />
            {podpowiedzi.length > 0 && (
              <div style={s.podpowiedzi}>
                {podpowiedzi.map((p, i) => (
                  <div key={i} style={s.podpowiedzItem} onClick={() => wybierzPodpowiedz(p)}>
                    <span style={s.podpowiedzNazwa}>{p['Składnik']}</span>
                    <span style={s.podpowiedzJedn}>{p['Jednostka']}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.row2}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Ilość"
              type="text"
              inputMode="decimal"
              value={nowyS.ilosc}
              onChange={e => setNowyS(prev => ({ ...prev, ilosc: e.target.value }))}
            />
            <select
              style={{ ...s.input, flex: 1 }}
              value={nowyS.jednostka}
              onChange={e => setNowyS(prev => ({ ...prev, jednostka: e.target.value }))}>
              {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <select
            style={s.input}
            value={nowyS.kategoria}
            onChange={e => setNowyS(prev => ({ ...prev, kategoria: e.target.value }))}>
            {Object.entries(KATEGORIE).map(([label, val]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <button style={s.btnDodajSkl} onClick={dodajSkladnik}>
            + Dodaj składnik
          </button>
        </section>

        {/* Lista składników */}
        {skladniki.length > 0 && (
          <section style={s.section}>
            <div style={s.skladnikiHeader}>
              <label style={s.label}>Składniki</label>
              <span style={s.badge}>{skladniki.length}</span>
            </div>
            <div style={s.skladnikiLista}>
              {skladniki.map((sk, i) => (
                <div key={i} style={s.skladnikItem}>
                  <span style={s.skNr}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={s.skInfo}>
                    <div style={s.skNazwa}>{sk.nazwa}</div>
                    <div style={s.skMeta}>{sk.ilosc || '—'} {sk.jednostka}</div>
                  </div>
                  <button style={s.btnUsun} onClick={() => usunSkladnik(i)}>✕</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {blad && <div style={s.blad}>{blad}</div>}

        <div style={s.bottomRow}>
          <button style={{ ...ui.btnPrimary, flex: 1 }} onClick={zapiszDanie} disabled={saving}>
            {saving ? 'Zapisuję…' : 'Zapisz'}
          </button>
          <button style={{ ...ui.btnGhost, padding: '14px 18px' }} onClick={wyczyscFormularz}>
            Wyczyść
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 40px',
    maxWidth: 620, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  header: { marginBottom: 22 },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { ...ui.h1, fontSize: 30, lineHeight: 1.05 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },

  section: { marginBottom: 22 },
  label: {
    display: 'block', fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    marginBottom: 10,
  },

  // Segmented control
  segRow: { display: 'flex', gap: 4, padding: 3, background: t.surfaceAlt, borderRadius: 12 },
  segBtn: {
    flex: 1, padding: '9px 8px', border: 'none', borderRadius: 9,
    background: 'transparent', color: t.mute,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  segBtnOn: {
    background: t.surface, color: t.text, fontWeight: 600,
    boxShadow: '0 1px 2px rgba(74,55,40,.08)',
  },
  hint: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute,
    marginTop: 8, lineHeight: 1.5,
  },

  // Form
  input: { ...ui.input, marginBottom: 8 },
  row2: { display: 'flex', gap: 8 },

  // Suggestions
  podpowiedzi: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
    background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 12,
    boxShadow: '0 12px 32px rgba(74,55,40,.12)',
    overflow: 'hidden', maxHeight: 240, overflowY: 'auto',
    marginTop: -4,
  },
  podpowiedzItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '10px 14px', cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 14,
    borderBottom: `0.5px solid ${t.border}`,
  },
  podpowiedzNazwa: { color: t.text },
  podpowiedzJedn: { color: t.mute, fontSize: 12, fontVariantNumeric: 'tabular-nums' },

  btnDodajSkl: {
    width: '100%', padding: '12px', marginTop: 4,
    background: t.accentSoft, color: t.accent,
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  // Ingredients list
  skladnikiHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  badge: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 700, color: t.mute,
    padding: '2px 8px', borderRadius: 999, background: t.surfaceAlt, letterSpacing: 0.6,
  },
  skladnikiLista: { ...ui.card, padding: 0, overflow: 'hidden' },
  skladnikItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '11px 16px', borderBottom: `0.5px solid ${t.border}`,
  },
  skNr: {
    fontFamily: fonts.serif, fontSize: 16, color: t.accent,
    fontStyle: 'italic', fontVariantNumeric: 'tabular-nums', minWidth: 24,
  },
  skInfo: { flex: 1, minWidth: 0 },
  skNazwa: { fontFamily: fonts.sans, fontSize: 14, color: t.text, fontWeight: 500 },
  skMeta: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 2 },
  btnUsun: {
    background: 'none', border: 'none',
    color: t.muteLight, fontSize: 14, cursor: 'pointer', padding: '4px 8px',
  },

  blad: {
    background: '#FBEAE4', color: '#9B3B23',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 500,
    padding: '10px 14px', borderRadius: 12, marginBottom: 14,
  },

  bottomRow: { display: 'flex', gap: 8, marginTop: 8 },
}
