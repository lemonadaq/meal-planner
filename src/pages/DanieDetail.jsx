import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function DanieDetail({ nazwa, onBack }) {
  const [skladniki, setSkladniki] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function pobierzSkladniki() {
      const { data, error } = await supabase
        .from('dania')
        .select('"Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria"')
        .eq('"Danie"', nazwa)
        .order('"Kategoria"')

      if (error) {
        console.error(error)
      } else {
        setSkladniki(data)
      }
      setLoading(false)
    }
    pobierzSkladniki()
  }, [nazwa])

  // Grupuj po kategorii
  const pogrupowane = skladniki.reduce((acc, s) => {
    const kat = s.Kategoria?.replace(/^\d_/, '') || 'Inne'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(s)
    return acc
  }, {})

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>
      <button style={s.back} onClick={onBack}>← Wróć</button>
      <h1 style={s.title}>{nazwa}</h1>

      {Object.entries(pogrupowane).map(([kat, items]) => (
        <div key={kat} style={s.grupa}>
          <div style={s.katHeader}>{kat}</div>
          {items.map((s2, i) => (
            <div key={i} style={s.skladnik}>
              <span style={s.skladnikNazwa}>{s2.Składnik}</span>
              <span style={s.skladnikIlosc}>
                {s2['Ilość na 1 porcję'] && s2['Ilość na 1 porcję'] !== '-'
                  ? `${s2['Ilość na 1 porcję']} ${s2.Jednostka}`
                  : s2.Jednostka}
              </span>
            </div>
          ))}
        </div>
      ))}
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
  back: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#4a86e8',
    cursor: 'pointer',
    padding: '0 0 16px 0',
    display: 'block',
  },
  title: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 20,
    color: '#1a1a1a',
  },
  grupa: {
    marginBottom: 16,
  },
  katHeader: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#4a86e8',
    padding: '6px 0',
    borderBottom: '1px solid #eee',
    marginBottom: 8,
  },
  skladnik: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  skladnikNazwa: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  skladnikIlosc: {
    fontSize: 14,
    color: '#666',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#666',
  },
}