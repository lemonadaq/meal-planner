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
  return '🍽️'
}

export default function DanieDetail({ nazwa, onBack }) {
  const [skladniki, setSkladniki] = useState([])
  const [dodatki, setDodatki] = useState([])
  const [surowki, setSurowki] = useState([])
  const [typ, setTyp] = useState('samodzielne')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function pobierz() {
      setLoading(true)

      // Pobierz składniki dania
      const { data: daniaData } = await supabase
        .from('dania')
        .select('*')
        .eq('"Danie"', nazwa)
        .order('"Kategoria"')

      if (daniaData && daniaData.length > 0) {
        setSkladniki(daniaData)
        const typDania = daniaData.find(d => d['TYP'])?.['TYP'] || 'samodzielne'
        setTyp(typDania)

        // Jeśli z_dodatkiem pobierz dodatki i surówki
        if (typDania === 'z_dodatkiem') {
          const [{ data: dod }, { data: sur }] = await Promise.all([
            supabase.from('dodatki').select('"Dodatek"').order('"Dodatek"'),
            supabase.from('surowki').select('"Surówka"').order('"Surówka"'),
          ])

          // Grupuj po nazwie dodatku
          const dodMap = {}
          ;(dod || []).forEach(d => {
            if (!dodMap[d['Dodatek']]) dodMap[d['Dodatek']] = true
          })
          setDodatki(Object.keys(dodMap))

          const surMap = {}
          ;(sur || []).forEach(s => {
            if (!surMap[s['Surówka']]) surMap[s['Surówka']] = true
          })
          setSurowki(Object.keys(surMap))
        }
      }

      setLoading(false)
    }
    pobierz()
  }, [nazwa])

  // Grupuj składniki po kategorii
  const pogrupowane = skladniki.reduce((acc, s) => {
    const kat = s['Kategoria']?.replace(/^\d_/, '') || 'Inne'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(s)
    return acc
  }, {})

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>
      {/* Hero */}
      <div style={{
        ...s.hero,
        background: getKolor(nazwa),
      }}>
        <button style={s.back} onClick={onBack}>← Wróć</button>
        <div style={s.heroEmoji}>{getEmoji(nazwa)}</div>
        <h1 style={s.heroTytuł}>{nazwa}</h1>
        {typ === 'z_dodatkiem' && (
          <span style={s.heroTag}>🥔 Podawać z dodatkiem</span>
        )}
      </div>

      <div style={s.content}>
        {/* Składniki */}
        <h2 style={s.sekcjaTytuł}>Składniki</h2>
        {Object.entries(pogrupowane).map(([kat, items]) => (
          <div key={kat} style={s.grupa}>
            <div style={s.katHeader}>{kat}</div>
            {items.map((item, i) => (
              <div key={i} style={s.skladnik}>
                <span style={s.skladnikNazwa}>{item['Składnik']}</span>
                <span style={s.skladnikIlosc}>
                  {item['Ilość na 1 porcję'] && item['Ilość na 1 porcję'] !== '-'
                    ? `${item['Ilość na 1 porcję']} ${item['Jednostka']}`
                    : item['Jednostka']}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* Proponowane dodatki */}
        {dodatki.length > 0 && (
          <div style={s.sekcja}>
            <h2 style={s.sekcjaTytuł}>🥔 Proponowane dodatki</h2>
            <div style={s.chipyWrapper}>
              {dodatki.map(d => (
                <span key={d} style={s.chip}>{d}</span>
              ))}
            </div>
          </div>
        )}

        {/* Proponowane surówki */}
        {surowki.length > 0 && (
          <div style={s.sekcja}>
            <h2 style={s.sekcjaTytuł}>🥗 Proponowane surówki</h2>
            <div style={s.chipyWrapper}>
              {surowki.map(sur => (
                <span key={sur} style={s.chip}>{sur}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 600,
    margin: '0 auto',
  },
  hero: {
    padding: '20px 16px 32px',
    textAlign: 'center',
    position: 'relative',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    top: 16, left: 16,
    background: 'rgba(255,255,255,0.8)',
    border: 'none', borderRadius: 20,
    padding: '6px 14px', fontSize: 14,
    cursor: 'pointer', color: '#333',
    fontWeight: 500,
  },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroTytuł: {
    fontSize: 24, fontWeight: 700,
    color: '#1a1a1a', margin: '0 0 8px',
    textAlign: 'center',
  },
  heroTag: {
    background: 'rgba(255,255,255,0.8)',
    padding: '4px 12px', borderRadius: 20,
    fontSize: 13, color: '#555',
  },
  content: {
    padding: '20px 16px',
    background: '#f8f9fa',
    minHeight: '60vh',
  },
  sekcjaTytuł: {
    fontSize: 17, fontWeight: 700,
    color: '#1a1a1a', margin: '0 0 12px',
  },
  sekcja: { marginTop: 24 },
  grupa: { marginBottom: 16 },
  katHeader: {
    fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#4a86e8', padding: '6px 0',
    borderBottom: '1px solid #eee', marginBottom: 8,
  },
  skladnik: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: 'white',
    borderRadius: 10,
    marginBottom: 4,
  },
  skladnikNazwa: { fontSize: 15, color: '#1a1a1a' },
  skladnikIlosc: { fontSize: 14, color: '#888' },
  chipyWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    background: 'white',
    border: '1px solid #eee',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    color: '#555',
  },
  loading: {
    textAlign: 'center',
    padding: 60, fontSize: 16,
    color: '#666', fontFamily: 'sans-serif',
  },
}