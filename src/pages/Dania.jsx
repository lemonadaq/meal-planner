import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

async function wyloguj() {
    await supabase.auth.signOut()
  }

export default function Dania({ onSelect, user, onKalendarz }) {
  const [dania, setDania] = useState([])
  const [loading, setLoading] = useState(true)
  const [szukaj, setSzukaj] = useState('')

  useEffect(() => {
    async function pobierzDania() {
      const { data, error } = await supabase
        .from('dania')
        .select('"Danie", "TYP"')
        .order('"Danie"')

      if (error) {
        console.error(error)
      } else {
        // Unikalne dania
        const unikalne = [...new Map(
          data.map(d => [d.Danie, d])
        ).values()]
        setDania(unikalne)
      }
      setLoading(false)
    }
    pobierzDania()
  }, [])

  const przefiltrowane = dania.filter(d =>
    d.Danie?.toLowerCase().includes(szukaj.toLowerCase())
  )

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
        <div style={s.container}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={s.title}>🍽️ Przepisy</h1>
          <div style={{ display: 'flex', gap: 8 }}>
  <button onClick={onKalendarz} style={{ background: '#4a86e8', border: 'none', color: 'white', fontSize: 13, cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
    📅 Kalendarz
  </button>
  <button onClick={wyloguj} style={{ background: 'none', border: 'none', color: '#999', fontSize: 13, cursor: 'pointer' }}>
    Wyloguj
  </button>
</div>
          </div>
          <input
        style={s.search}
        placeholder="Szukaj dania..."
        value={szukaj}
        onChange={e => setSzukaj(e.target.value)}
      />
      <div style={s.lista}>
        {przefiltrowane.map(d => (
           <div key={d.Danie} style={s.item} onClick={() => onSelect(d.Danie)}>
            <span style={s.nazwa}>{d.Danie}</span>
            {d.TYP && (
              <span style={d.TYP === 'z_dodatkiem' ? s.tagDodatek : s.tagSamo}>
                {d.TYP === 'z_dodatkiem' ? '+ dodatek' : 'samodzielne'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '20px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 16,
    color: '#1a1a1a',
  },
  search: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 16,
    border: '1px solid #ddd',
    borderRadius: 12,
    marginBottom: 16,
    boxSizing: 'border-box',
    outline: 'none',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'white',
    borderRadius: 12,
    border: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  nazwa: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  tagDodatek: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 20,
    background: '#d1e7dd',
    color: '#0a3622',
  },
  tagSamo: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 20,
    background: '#f0f0f0',
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#666',
  },
}