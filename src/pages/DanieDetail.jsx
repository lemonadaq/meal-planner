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

function podzielPrzepis(tekst) {
  if (!tekst) return []

  return tekst
    .split(/\n|(?=\d+\.)/)
    .map(krok =>
      krok
        .replace(/^\d+\.\s*/, '')
        .trim()
    )
    .filter(Boolean)
}

export default function DanieDetail({ nazwa, onBack }) {
  const [skladniki, setSkladniki] = useState([])
  const [przepis, setPrzepis] = useState('')
  const [zdjecie, setZdjecie] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function pobierz() {
      setLoading(true)

      const { data: daniaData } = await supabase
        .from('dania')
        .select('*')
        .eq('"Danie"', nazwa)
        .order('"Kategoria"')

      if (daniaData && daniaData.length > 0) {
        setSkladniki(daniaData)
        setPrzepis(daniaData.find(d => d['Przepis'])?.['Przepis'] || '')
        setZdjecie(daniaData.find(d => d.zdjecie)?.zdjecie || '')
      }

      setLoading(false)
    }

    pobierz()
  }, [nazwa])

  const pogrupowane = skladniki.reduce((acc, s) => {
    const kat = s['Kategoria']?.replace(/^\d_/, '') || 'Inne'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(s)
    return acc
  }, {})

  const krokiPrzepisu = podzielPrzepis(przepis)

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>
      <div
        style={{
          ...s.hero,
          background: getKolor(nazwa),
        }}
      >
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <div style={s.heroEmoji}>{getEmoji(nazwa)}</div>
        <h1 style={s.heroTytul}>{nazwa}</h1>
      </div>

<div style={s.skladnikiBox}>
  <h2 style={s.sekcjaTytul}>Składniki</h2>

  <div style={s.skladnikiGrid}>
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
  </div>
</div>

        <div style={s.przepisBox}>
          <h2 style={s.sekcjaTytul}>Przepis</h2>

          {krokiPrzepisu.length > 0 ? (
            <ol style={s.listaKrokow}>
              {krokiPrzepisu.map((krok, index) => (
                <li key={index} style={s.krok}>
                  {krok}
                </li>
              ))}
            </ol>
          ) : (
            <div style={s.brakPrzepisu}>
              Brak przepisu dla tego dania.
            </div>
          )}
        </div>
      </div>
  )
}

const s = {
 container: {
  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  width: '100%',
  maxWidth: 900,
  margin: '0 auto',
  background: '#f8f9fa',
  minHeight: '100vh',
},
skladnikiGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 14,
},
hero: {
  margin: 16,
  padding: '18px 16px 24px',
  textAlign: 'center',
  position: 'relative',
  minHeight: 180,
  borderRadius: 24,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
},
  back: {
    position: 'absolute',
    top: 16,
    left: 16,
    background: 'rgba(255,255,255,0.8)',
    border: 'none',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 14,
    cursor: 'pointer', color: '#4a86e8',
    fontWeight: 500,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  heroTytul: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
    textAlign: 'center',
  },
content: {
  padding: '0 16px 16px',
},
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 12,
    alignItems: 'start',
  },
skladnikiBox: {
  background: 'white',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
},
  zdjecieBox: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: '3/4',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 12,
  },
  zdjecie: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  zdjeciePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 52,
  },
  sekcjaTytul: {
    fontSize: 17,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 12px',
  },
  grupa: {
    marginBottom: 0,
  },
  katHeader: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#4a86e8',
    padding: '4px 0',
    borderBottom: '1px solid #eee',
    marginBottom: 6,
  },
  skladnik: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    padding: '7px 0',
    borderBottom: '1px solid #f3f3f3',
  },
  skladnikNazwa: {
    fontSize: 13,
    color: '#1a1a1a',
    lineHeight: 1.25,
  },
  skladnikIlosc: {
    fontSize: 12,
    color: '#888',
    whiteSpace: 'nowrap',
    lineHeight: 1.25,
  },
  przepisBox: {
    marginTop: 16,
    background: 'white',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  listaKrokow: {
    margin: 0,
    paddingLeft: 22,
  },
  krok: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 1.45,
    marginBottom: 10,
  },
  brakPrzepisu: {
    color: '#999',
    fontSize: 14,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#666',
    fontFamily: 'sans-serif',
  },
}