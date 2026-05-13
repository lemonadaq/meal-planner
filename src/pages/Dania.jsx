import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function getKolor(nazwa) {
  const kolory = ['#FFE4E1','#E1F5FE','#E8F5E9','#FFF8E1','#F3E5F5','#FCE4EC','#E0F2F1','#FBE9E7']
  let hash = 0
  for (let i = 0; i < nazwa.length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}

function getEmoji(nazwa) {
  const n = nazwa.toLowerCase()
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
  if (n.includes('kapust') || n.includes('surów') || n.includes('colesław') || n.includes('mizeria')) return '🥗'
  if (n.includes('buracz') || n.includes('marchew')) return '🥕'
  if (n.includes('ryż') || n.includes('kasza') || n.includes('kuskus')) return '🍚'
  if (n.includes('ziemniak') || n.includes('frytk') || n.includes('puree')) return '🥔'
  if (n.includes('chleb') || n.includes('bułk') || n.includes('bagietk')) return '🍞'
  return '🍽️'
}

export default function Dania({ onSelect, user, onDodaj }) {
  const [dania, setDania] = useState([])
  const [loading, setLoading] = useState(true)
  const [szukaj, setSzukaj] = useState('')
  const [filtr, setFiltr] = useState('wszystkie')
  const [sekcja, setSekcja] = useState('dania')

  useEffect(() => {
    async function pobierzDane() {
      setLoading(true)
      setSzukaj('')
      setFiltr('wszystkie')

      if (sekcja === 'dania') {
        const { data } = await supabase
          .from('dania')
          .select('"Danie", "TYP", zdjecie')
          .order('"Danie"')
        const unikalne = [...new Map((data || []).map(d => [d['Danie'], d])).values()]
        setDania(unikalne)
      } else if (sekcja === 'dodatki') {
        const { data } = await supabase
          .from('dodatki')
          .select('"Dodatek"')
          .order('"Dodatek"')
        const unikalne = [...new Set((data || []).map(d => d['Dodatek']))]
        setDania(unikalne.map(d => ({ 'Danie': d, 'TYP': 'dodatek' })))
      } else if (sekcja === 'surowki') {
        const { data } = await supabase
          .from('surowki')
          .select('"Surówka"')
          .order('"Surówka"')
        const unikalne = [...new Set((data || []).map(d => d['Surówka']))]
        setDania(unikalne.map(d => ({ 'Danie': d, 'TYP': 'surowka' })))
      }

      setLoading(false)
    }
    pobierzDane()
  }, [sekcja])

  const przefiltrowane = dania.filter(d => {
    const pasujeSzukaj = d['Danie']?.toLowerCase().includes(szukaj.toLowerCase())
    const pasujeFiltr =
      filtr === 'wszystkie' ||
      (filtr === 'z_dodatkiem' && d['TYP'] === 'z_dodatkiem') ||
      (filtr === 'samodzielne' && d['TYP'] === 'samodzielne')
    return pasujeSzukaj && pasujeFiltr
  })

  async function wyloguj() {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>
      {/* Nagłówek */}
      <div style={s.header}>
        <h1 style={s.title}>🍽️ Przepisy</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onDodaj} style={s.btnDodaj}>+ Dodaj</button>
          <button onClick={wyloguj} style={s.btnWyloguj}>Wyloguj</button>
        </div>
      </div>

      {/* Wyszukiwarka */}
      <input
        style={s.search}
        placeholder="Szukaj..."
        value={szukaj}
        onChange={e => setSzukaj(e.target.value)}
      />

      {/* Zakładki sekcji */}
      <div style={s.zakładki}>
        {[
          { id: 'dania', label: '🍽️ Dania' },
          { id: 'dodatki', label: '🥔 Dodatki' },
          { id: 'surowki', label: '🥗 Surówki' },
        ].map(z => (
          <button
            key={z.id}
            style={{ ...s.zakładka, ...(sekcja === z.id ? s.zakładkaAktywna : {}) }}
            onClick={() => setSekcja(z.id)}
          >
            {z.label}
          </button>
        ))}
      </div>

      {/* Filtry (tylko dla dań) */}
      {sekcja === 'dania' && (
        <div style={s.filtry}>
          {[
            { id: 'wszystkie', label: 'Wszystkie' },
            { id: 'z_dodatkiem', label: '🥔 Z dodatkiem' },
            { id: 'samodzielne', label: '🍝 Samodzielne' },
          ].map(f => (
            <button
              key={f.id}
              style={{ ...s.filtrBtn, ...(filtr === f.id ? s.filtrAktywny : {}) }}
              onClick={() => setFiltr(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Siatka */}
      <div style={s.grid}>
        {przefiltrowane.map(d => (
          <div
            key={d['Danie']}
            style={s.karta}
            onClick={() => sekcja === 'dania' ? onSelect(d['Danie']) : null}
          >
            <div style={{
              ...s.zdjecieWrapper,
              background: getKolor(d['Danie']),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
            }}>
              {getEmoji(d['Danie'])}
            </div>
            <div style={s.kartaInfo}>
              <div style={s.kartaNazwa}>{d['Danie']}</div>
              {sekcja === 'dania' && d['TYP'] && (
                <span style={d['TYP'] === 'z_dodatkiem' ? s.tagDodatek : s.tagSamo}>
                  {d['TYP'] === 'z_dodatkiem' ? '+ dodatek' : 'samodzielne'}
                </span>
              )}
              {sekcja === 'dodatki' && (
                <span style={s.tagDodatek}>🥔 dodatek</span>
              )}
              {sekcja === 'surowki' && (
                <span style={s.tagSurowka}>🥗 surówka</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {przefiltrowane.length === 0 && (
        <div style={s.empty}>
          {szukaj ? `Brak wyników dla "${szukaj}"` : 'Brak pozycji'}
        </div>
      )}
    </div>
  )
}

const s = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22, fontWeight: 700,
    color: '#1a1a1a', margin: 0,
  },
  btnDodaj: {
    background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 8,
    padding: '7px 12px', fontSize: 13,
    fontWeight: 600, cursor: 'pointer',
  },
  btnWyloguj: {
    background: 'none', border: 'none',
    color: '#aaa', fontSize: 13, cursor: 'pointer',
  },
  search: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 15,
    border: '1px solid #eee',
    borderRadius: 12,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none',
    background: 'white',
  },
  zakładki: {
    display: 'flex',
    gap: 0,
    marginBottom: 12,
    borderBottom: '2px solid #f0f0f0',
  },
  zakładka: {
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    fontSize: 14,
    cursor: 'pointer',
    color: '#888',
    fontWeight: 500,
  },
  zakładkaAktywna: {
    color: '#4a86e8',
    borderBottom: '2px solid #4a86e8',
    fontWeight: 700,
  },
  filtry: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    overflowX: 'auto',
    paddingBottom: 4,
  },
  filtrBtn: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid #eee',
    background: 'white',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    color: '#666',
  },
  filtrAktywny: {
    background: '#4a86e8',
    color: 'white',
    border: '1px solid #4a86e8',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  karta: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  zdjecieWrapper: {
    width: '100%',
    aspectRatio: '4/3',
    overflow: 'hidden',
  },
  kartaInfo: {
    padding: '10px 12px',
  },
  kartaNazwa: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  tagDodatek: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 20,
    background: '#d1e7dd',
    color: '#0a3622',
  },
  tagSamo: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 20,
    background: '#f0f0f0',
    color: '#666',
  },
  tagSurowka: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 20,
    background: '#e8f5e9',
    color: '#1b5e20',
  },
  loading: {
    textAlign: 'center',
    padding: 60, fontSize: 16,
    color: '#666', fontFamily: 'sans-serif',
  },
  empty: {
    textAlign: 'center',
    padding: 40, color: '#aaa', fontSize: 15,
  },
}