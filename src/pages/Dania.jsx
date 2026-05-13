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
  if (n.includes('buracz') || n.includes('marchew')) return '🥕'
  if (n.includes('ryż') || n.includes('kasza') || n.includes('kuskus')) return '🍚'
  if (n.includes('chleb') || n.includes('bułk') || n.includes('bagietk')) return '🍞'
  return '🍽️'
}

export default function Dania({ onSelect, user, onDodaj, onBack }) {
const [dania, setDania] = useState([])
const [dodatki, setDodatki] = useState([])
const [surowki, setSurowki] = useState([])
  const [loading, setLoading] = useState(true)
  const [szukaj, setSzukaj] = useState('')
  const [sekcja, setSekcja] = useState('dania')
  const [widok, setWidok] = useState('kafelki') // kafelki | male | lista

 useEffect(() => {
  async function pobierzDane() {
    setLoading(true)

    const [
      daniaRes,
      dodatkiRes,
      surowkiRes
    ] = await Promise.all([
      supabase
        .from('dania')
        .select('"Danie", "TYP", zdjecie')
        .order('"Danie"'),

      supabase
        .from('dodatki')
        .select('"Dodatek"')
        .order('"Dodatek"'),

      supabase
        .from('surowki')
        .select('"Surówka"')
        .order('"Surówka"')
    ])

    const daniaData = [...new Map(
      (daniaRes.data || []).map(d => [d['Danie'], d])
    ).values()]

    const dodatkiData = [...new Set(
      (dodatkiRes.data || []).map(d => d['Dodatek'])
    )].map(d => ({
      Danie: d,
      TYP: 'dodatek'
    }))

    const surowkiData = [...new Set(
      (surowkiRes.data || []).map(d => d['Surówka'])
    )].map(d => ({
      Danie: d,
      TYP: 'surowka'
    }))

    setDania(daniaData)
    setDodatki(dodatkiData)
    setSurowki(surowkiData)

    setLoading(false)
  }

  pobierzDane()
}, [])
const aktualneDane =
  sekcja === 'dania'
    ? dania
    : sekcja === 'dodatki'
    ? dodatki
    : surowki

const przefiltrowane = aktualneDane.filter(d =>
  d['Danie']?.toLowerCase().includes(szukaj.toLowerCase())
)

  async function wyloguj() {
    await supabase.auth.signOut()
  }

  function renderGrafika(d) {
    const nazwa = d['Danie']

    if (d.zdjecie) {
      return (
        <img
          src={d.zdjecie}
          alt={nazwa}
          style={s.zdjecie}
          loading="lazy"
        />
      )
    }

    return (
      
      <div
        style={{
          ...s.placeholder,
          background: getKolor(nazwa),
        }}
      >
        {getEmoji(nazwa)}
      </div>
      
    )
  }

  function renderKarta(d) {
    const nazwa = d['Danie']

    return (
      <div
        key={nazwa}
        style={{
          ...s.karta,
          ...(widok === 'male' ? s.kartaMala : {}),
        }}
        onClick={() => sekcja === 'dania' ? onSelect(nazwa) : null}
      >
        <div style={{
          ...s.zdjecieWrapper,
          ...(widok === 'male' ? s.zdjecieWrapperMaly : {}),
        }}>
          {renderGrafika(d)}
          <div style={s.nazwaOverlay}>
            {nazwa}
          </div>
        </div>
      </div>
    )
  }

  function renderLista(d) {
    const nazwa = d['Danie']

    return (
      <div
        key={nazwa}
        style={s.listaItem}
        onClick={() => sekcja === 'dania' ? onSelect(nazwa) : null}
      >
        <div style={s.listaMiniatura}>
          {d.zdjecie ? (
            <img src={d.zdjecie} alt={nazwa} style={s.listaZdjecie} loading="lazy" />
          ) : (
            <div style={{ ...s.listaEmoji, background: getKolor(nazwa) }}>
              {getEmoji(nazwa)}
            </div>
          )}
        </div>

        <div style={s.listaNazwa}>{nazwa}</div>
        <div style={s.listaStrzalka}>›</div>
      </div>
    )
  }

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>
      <div style={s.header}>
         <button style={s.back} onClick={onBack}>← Wróć</button>
        <h1 style={s.title}>🍽️ Przepisy</h1>
        <div style={s.headerButtons}>
           
          <button onClick={onDodaj} style={s.btnDodaj}>+ Dodaj</button>
          <button onClick={wyloguj} style={s.btnWyloguj}>Wyloguj</button>
        </div>
      </div>

      <input
        style={s.search}
        placeholder="Szukaj..."
        value={szukaj}
        onChange={e => setSzukaj(e.target.value)}
      />

      <div style={s.zakladki}>
        {[
          { id: 'dania', label: '🍽️ Dania' },
          { id: 'dodatki', label: '🥔 Dodatki' },
          { id: 'surowki', label: '🥗 Surówki' },
        ].map(z => (
          <button
            key={z.id}
            style={{ ...s.zakladka, ...(sekcja === z.id ? s.zakladkaAktywna : {}) }}
            onClick={() => setSekcja(z.id)}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div style={s.widokBar}>
        {[
          { id: 'kafelki', label: '▦ Duże' },
          { id: 'male', label: '▥ Małe' },
          { id: 'lista', label: '☰ Lista' },
        ].map(w => (
          <button
            key={w.id}
            style={{ ...s.widokBtn, ...(widok === w.id ? s.widokBtnAktywny : {}) }}
            onClick={() => setWidok(w.id)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {widok === 'lista' ? (
        <div style={s.lista}>
          {przefiltrowane.map(renderLista)}
        </div>
      ) : (
        <div
          style={{
            ...s.grid,
            ...(widok === 'male' ? s.gridMale : {}),
          }}
        >
          {przefiltrowane.map(renderKarta)}
        </div>
      )}

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
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
  },
  headerButtons: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  back: {
    top: 16, left: 16,
    background: 'rgba(255,255,255,0.8)',
    border: 'none', borderRadius: 20,
    padding: '6px 14px', fontSize: 14,
    cursor: 'pointer', color: '#4a86e8',
    fontWeight: 500,
  },
  btnDodaj: {
    background: '#4a86e8',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnWyloguj: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: 13,
    cursor: 'pointer',
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
  zakladki: {
    display: 'flex',
    gap: 0,
    marginBottom: 12,
    borderBottom: '2px solid #f0f0f0',
  },
  zakladka: {
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
  zakladkaAktywna: {
    color: '#4a86e8',
    borderBottom: '2px solid #4a86e8',
    fontWeight: 700,
  },
  widokBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  widokBtn: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 12,
    border: '1px solid #eee',
    background: 'white',
    color: '#666',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  widokBtnAktywny: {
    background: '#4a86e8',
    color: 'white',
    border: '1px solid #4a86e8',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  gridMale: {
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  karta: {
    background: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  kartaMala: {
    borderRadius: 12,
  },
  zdjecieWrapper: {
    width: '100%',
    aspectRatio: '4/3',
    overflow: 'hidden',
    position: 'relative',
  },
  zdjecieWrapperMaly: {
    aspectRatio: '1/1',
  },
  zdjecie: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
  },
  nazwaOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.48)',
    color: 'white',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
  },
  lista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listaItem: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    borderRadius: 14,
    padding: 8,
    gap: 12,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  listaMiniatura: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  listaZdjecie: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  listaEmoji: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 26,
  },
  listaNazwa: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    color: '#1a1a1a',
  },
  listaStrzalka: {
    fontSize: 26,
    color: '#bbb',
    paddingRight: 4,
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    fontSize: 16,
    color: '#666',
    fontFamily: 'sans-serif',
  },
  empty: {
    textAlign: 'center',
    padding: 40,
    color: '#aaa',
    fontSize: 15,
  },
}