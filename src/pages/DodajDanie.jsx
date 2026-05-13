import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżki', 'łyżeczka', 'szklanka', 'ząbki', 'pęczek', 'garść', 'do smaku']

const KATEGORIE = {
  'Warzywa i owoce': '1_Warzywa i owoce',
  'Mięso i ryby': '2_Mięso i ryby',
  'Nabiał': '3_Nabiał',
  'Pieczywo': '4_Pieczywo',
  'Produkty sypkie': '5_Produkty sypkie',
  'Konserwy i słoiki': '6_Konserwy i słoiki',
  'Przyprawy': '7_Przyprawy',
  'Inne': '8_Inne',
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
      .filter(s => s['Składnik']?.toLowerCase().includes(val.toLowerCase()))
      .slice(0, 6)
    setPodpowiedzi(filtered)
  }

  function wybierzPodpowiedz(s) {
    setNowyS({
      nazwa: s['Składnik'],
      ilosc: '',
      jednostka: s['Jednostka'] || 'g',
      kategoria: s['Kategoria'] || '1_Warzywa i owoce',
    })
    setPodpowiedzi([])
  }
function wyczyscFormularz() {
  setNazwa('')
  setTyp('samodzielne')
  setSkladniki([])
  setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
  setBlad('')
  setPodpowiedzi([])
}
 function dodajSkladnik() {
  if (!nowyS.nazwa.trim()) return
  
  // Sprawdź czy już jest na liście
  if (skladniki.find(s => s.nazwa.toLowerCase() === nowyS.nazwa.toLowerCase())) {
    setBlad('Ten składnik już jest na liście!')
    return
  }
  
  setSkladniki(prev => [...prev, { ...nowyS }])
  setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
  setPodpowiedzi([])
  setBlad('')
}

  function usunSkladnik(i) {
    setSkladniki(prev => prev.filter((_, idx) => idx !== i))
  }

async function zapiszDanie() {
  if (!nazwa.trim()) { setBlad('Wpisz nazwę'); return }
  if (skladniki.length === 0) { setBlad('Dodaj przynajmniej jeden składnik'); return }

  setSaving(true)
  setBlad('')

 const kolumna = tabela === 'dania' ? '"Danie"' : tabela === 'dodatki' ? '"Dodatek"' : '"Surówka"'
// Sprawdź we wszystkich tabelach
const [{ data: wDaniach }, { data: wDodatkach }, { data: wSurowkach }] = await Promise.all([
  supabase.from('dania').select('id').eq('"Danie"', nazwa.trim()).limit(1),
  supabase.from('dodatki').select('id').eq('"Dodatek"', nazwa.trim()).limit(1),
  supabase.from('surowki').select('id').eq('"Surówka"', nazwa.trim()).limit(1),
])

if (
  (wDaniach && wDaniach.length > 0) ||
  (wDodatkach && wDodatkach.length > 0) ||
  (wSurowkach && wSurowkach.length > 0)
) {
  const gdzie = wDaniach?.length > 0 ? 'daniach' : wDodatkach?.length > 0 ? 'dodatkach' : 'surówkach'
  setBlad(`"${nazwa}" już istnieje w ${gdzie}!`)
  setSaving(false)
  return
}
  let rows = []

  if (tabela === 'dania') {
    rows = skladniki.map((s, i) => ({
      'Danie': nazwa.trim(),
      'Składnik': s.nazwa,
      'Ilość na 1 porcję': s.ilosc || '-',
      'Jednostka': s.jednostka,
      'Kategoria': s.kategoria,
      'TYP': i === 0 ? typ : null,
    }))
  } else if (tabela === 'dodatki') {
    rows = skladniki.map(s => ({
      'Dodatek': nazwa.trim(),
      'Składnik': s.nazwa,
      'Ilość na porcję': s.ilosc || '-',
      'Jednostka': s.jednostka,
      'Kategoria': s.kategoria,
    }))
  } else if (tabela === 'surowki') {
    rows = skladniki.map(s => ({
      'Surówka': nazwa.trim(),
      'Składnik': s.nazwa,
      'Ilość na porcję': s.ilosc || '-',
      'Jednostka': s.jednostka,
      'Kategoria': s.kategoria,
    }))
  }

  const { error } = await supabase.from(tabela).insert(rows)

  if (error) {
    setBlad('Błąd zapisu: ' + error.message)
  } else {
    onZapisano(nazwa)
  }
  setSaving(false)
}

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', overflowX: 'hidden' }}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>
        <h1 style={s.title}>
  {tabela === 'dania' ? '🍽️ Nowe danie' : tabela === 'dodatki' ? '🥔 Nowy dodatek' : '🥗 Nowa surówka'}
</h1>
<div style={s.sekcja}>
  <label style={s.label}>Co dodajesz?</label>
  <div style={s.typRow}>
    {[
      { val: 'dania', label: '🍽️ Danie' },
      { val: 'dodatki', label: '🥔 Dodatek' },
      { val: 'surowki', label: '🥗 Surówka' },
    ].map(t => (
      <button
        key={t.val}
        style={{ ...s.typBtn, ...(tabela === t.val ? s.typBtnActive : {}) }}
        onClick={() => setTabela(t.val)}
      >
        {t.label}
      </button>
    ))}
  </div>
</div>
        <div style={s.sekcja}>
          <label style={s.label}>Nazwa dania</label>
          <input
            style={s.input}
            placeholder="np. Kurczak w sosie śmietanowym"
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
          />
        </div>

        {tabela === 'dania' && (
  <div style={s.sekcja}>
    <label style={s.label}>Typ dania</label>
    <div style={s.typRow}>
      {['samodzielne', 'z_dodatkiem'].map(t => (
        <button
          key={t}
          style={{ ...s.typBtn, ...(typ === t ? s.typBtnActive : {}) }}
          onClick={() => setTyp(t)}
        >
          {t === 'samodzielne' ? '🍝 Samodzielne' : '🥔 Z dodatkiem'}
        </button>
      ))}
    </div>
  </div>
)}

        <div style={s.sekcja}>
          <label style={s.label}>Składniki</label>

          <div style={{ position: 'relative' }}>
            <input
              style={s.input}
              placeholder="Nazwa składnika..."
              value={nowyS.nazwa}
              onChange={e => szukajPodpowiedzi(e.target.value)}
            />
            {podpowiedzi.length > 0 && (
              <div style={s.podpowiedzi}>
                {podpowiedzi.map((p, i) => (
                  <div key={i} style={s.podpowiedzItem} onClick={() => wybierzPodpowiedz(p)}>
                    {p['Składnik']}
                    <span style={{ color: '#aaa', fontSize: 12 }}> — {p['Jednostka']}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.row}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Ilość"
              value={nowyS.ilosc}
              onChange={e => setNowyS(prev => ({ ...prev, ilosc: e.target.value }))}
            />
            <select
              style={{ ...s.input, flex: 1 }}
              value={nowyS.jednostka}
              onChange={e => setNowyS(prev => ({ ...prev, jednostka: e.target.value }))}
            >
              {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <select
            style={s.input}
            value={nowyS.kategoria}
            onChange={e => setNowyS(prev => ({ ...prev, kategoria: e.target.value }))}
          >
            {Object.entries(KATEGORIE).map(([nazwa, val]) => (
              <option key={val} value={val}>{nazwa}</option>
            ))}
          </select>

          <button style={s.btnDodaj} onClick={dodajSkladnik}>
            + Dodaj składnik
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
  <button style={{ ...s.btnZapisz, flex: 1 }} onClick={zapiszDanie} disabled={saving}>
    {saving ? 'Zapisuję...' : '💾 Zapisz danie'}
  </button>
  <button style={{ ...s.btnZapisz, flex: 0.4, background: '#f0f0f0', color: '#666' }} onClick={wyczyscFormularz}>
    🗑️ Wyczyść
  </button>
</div>
        </div>

        {skladniki.length > 0 && (
          <div style={s.sekcja}>
            <label style={s.label}>Dodane składniki ({skladniki.length})</label>
            {skladniki.map((sk, i) => (
              <div key={i} style={s.skladnikItem}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{sk.nazwa}</span>
                  <span style={{ color: '#888', fontSize: 13 }}> — {sk.ilosc || '-'} {sk.jednostka}</span>
                </div>
                <button style={s.btnUsun} onClick={() => usunSkladnik(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {blad && <div style={s.blad}>{blad}</div>}
      </div>
    </div>
  )
}

const s = {
  container: {
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  back: {
    background: 'none', border: 'none',
    fontSize: 16, color: '#4a86e8',
    cursor: 'pointer', padding: '0 0 12px 0',
    display: 'block',
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 20 },
  sekcja: { marginBottom: 20 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#4a86e8', marginBottom: 8,
  },
  input: {
    width: '100%', padding: '12px 14px',
    fontSize: 15, border: '1px solid #eee',
    borderRadius: 10, marginBottom: 8,
    boxSizing: 'border-box', outline: 'none',
    background: 'white',
  },
  row: { display: 'flex', gap: 8 },
  typRow: { display: 'flex', gap: 8 },
  typBtn: {
    flex: 1, padding: '10px',
    border: '1px solid #eee', borderRadius: 10,
    background: 'white', fontSize: 14,
    cursor: 'pointer', color: '#666',
  },
  typBtnActive: {
    background: '#4a86e8', color: 'white',
    border: '1px solid #4a86e8', fontWeight: 600,
  },
podpowiedzi: {
  position: 'absolute',
  bottom: '100%',  // ← zmień top na bottom
  left: 0, right: 0,
  background: 'white',
  border: '1px solid #eee',
  borderRadius: 10,
  zIndex: 100,
  boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',  // ← cień do góry
  maxHeight: 200, overflowY: 'auto',
},
  podpowiedzItem: {
    padding: '10px 14px', cursor: 'pointer',
    fontSize: 14, borderBottom: '1px solid #f5f5f5',
  },
  btnDodaj: {
    width: '100%', padding: '12px',
    background: '#f0f4ff', color: '#4a86e8',
    border: '1px solid #d0e0ff', borderRadius: 10,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  skladnikItem: {
    display: 'flex', alignItems: 'center',
    padding: '10px 12px', background: '#f9f9f9',
    borderRadius: 10, marginBottom: 6,
  },
  btnUsun: {
    background: 'none', border: 'none',
    color: '#ccc', fontSize: 16, cursor: 'pointer',
  },
  blad: { color: '#e53e3e', fontSize: 13, marginBottom: 12 },
  btnZapisz: {
    width: '100%', padding: '15px',
    background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 16, fontWeight: 600, cursor: 'pointer',
    marginTop: 8,
  },
}