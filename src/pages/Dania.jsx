import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

// Pastel placeholder color from name hash — same algorithm as before so old
// images stay visually identical for users.
function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6','#F4D9CC','#DCE5D2']
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
  const [sekcja, setSekcja] = useState('dania')   // 'dania' | 'dodatki' | 'surowki'
  const [widok, setWidok] = useState('siatka')    // 'siatka' | 'lista'

  useEffect(() => {
    async function pobierzDane() {
      setLoading(true)
      const [daniaRes, dodatkiRes, surowkiRes] = await Promise.all([
        supabase.from('dania').select('"Danie", "TYP", zdjecie').order('"Danie"'),
        supabase.from('dodatki').select('"Dodatek"').order('"Dodatek"'),
        supabase.from('surowki').select('"Surówka"').order('"Surówka"'),
      ])
      const daniaData = [...new Map((daniaRes.data || []).map(d => [d['Danie'], d])).values()]
      const dodatkiData = [...new Set((dodatkiRes.data || []).map(d => d['Dodatek']))]
        .map(d => ({ Danie: d, TYP: 'dodatek' }))
      const surowkiData = [...new Set((surowkiRes.data || []).map(d => d['Surówka']))]
        .map(d => ({ Danie: d, TYP: 'surowka' }))
      setDania(daniaData); setDodatki(dodatkiData); setSurowki(surowkiData)
      setLoading(false)
    }
    pobierzDane()
  }, [])

  const aktualneDane = sekcja === 'dania' ? dania : sekcja === 'dodatki' ? dodatki : surowki
  const przefiltrowane = aktualneDane.filter(d =>
    d['Danie']?.toLowerCase().includes(szukaj.toLowerCase())
  )

  async function wyloguj() { await supabase.auth.signOut() }

  function renderImg(d) {
    const nazwa = d['Danie']
    if (d.zdjecie) {
      return <img src={d.zdjecie} alt={nazwa} style={s.img} loading="lazy" />
    }
    return (
      <div style={{ ...s.placeholder, background: getKolor(nazwa) }}>
        <span style={s.placeholderEmoji}>{getEmoji(nazwa)}</span>
      </div>
    )
  }

  if (loading) return <div style={s.loading}>Ładowanie przepisów…</div>

  // Pierwsze danie z obrazem jako "featured", reszta w siatce
  const [featured, ...reszta] = przefiltrowane

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        {/* Header */}
        <header style={s.header}>
          <div>
            <div style={s.eyebrow}>Twoja kuchnia</div>
            <h1 style={s.title}>Przepisy</h1>
          </div>
          <div style={s.headerBtns}>
            <button style={s.btnAdd} onClick={onDodaj} title="Dodaj nowy przepis">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            <button style={s.btnLogout} onClick={wyloguj}>Wyloguj</button>
          </div>
        </header>

        {/* Search */}
        <div style={s.searchWrap}>
          <svg style={s.searchIcon} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={t.mute} strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            style={s.search}
            placeholder="Szukaj przepisu lub składnika…"
            value={szukaj}
            onChange={e => setSzukaj(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {[
            { id: 'dania', label: 'Dania' },
            { id: 'dodatki', label: 'Dodatki' },
            { id: 'surowki', label: 'Surówki' },
          ].map(z => {
            const on = sekcja === z.id
            return (
              <button key={z.id}
                style={{ ...s.tab, ...(on ? s.tabOn : {}) }}
                onClick={() => setSekcja(z.id)}>
                {z.label}
                {on && <span style={s.tabUnderline} />}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          {/* widok toggle */}
          <div style={s.viewToggle}>
            {['siatka', 'lista'].map(w => (
              <button key={w}
                style={{ ...s.viewBtn, ...(widok === w ? s.viewBtnOn : {}) }}
                onClick={() => setWidok(w)}
                title={w === 'siatka' ? 'Siatka' : 'Lista'}>
                {w === 'siatka' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {przefiltrowane.length === 0 ? (
          <div style={s.empty}>
            {szukaj ? `Brak wyników dla "${szukaj}"` : 'Brak pozycji'}
          </div>
        ) : widok === 'siatka' && sekcja === 'dania' ? (
          <>
            {/* Featured */}
            {featured && (
              <article style={s.featured} onClick={() => onSelect(featured['Danie'])}>
                <div style={s.featuredImg}>{renderImg(featured)}</div>
                <div style={s.featuredOverlay}>
                  <div style={s.featuredEyebrow}>POLECANE</div>
                  <h2 style={s.featuredTitle}>{featured['Danie']}</h2>
                </div>
              </article>
            )}

            {/* Grid */}
            <div style={s.grid}>
              {reszta.map(d => (
                <article key={d['Danie']} style={s.card}
                  onClick={() => onSelect(d['Danie'])}>
                  <div style={s.cardImg}>{renderImg(d)}</div>
                  <div style={s.cardBody}>
                    <h3 style={s.cardTitle}>{d['Danie']}</h3>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : widok === 'siatka' ? (
          // dodatki / surowki — bez detalu, więc prostsza siatka kart
          <div style={s.grid}>
            {przefiltrowane.map(d => (
              <article key={d['Danie']} style={s.card}>
                <div style={s.cardImg}>{renderImg(d)}</div>
                <div style={s.cardBody}>
                  <h3 style={s.cardTitle}>{d['Danie']}</h3>
                </div>
              </article>
            ))}
          </div>
        ) : (
          // List view
          <div style={s.listView}>
            {przefiltrowane.map(d => (
              <button key={d['Danie']} style={s.listItem}
                onClick={() => sekcja === 'dania' ? onSelect(d['Danie']) : null}>
                <div style={s.listImg}>{renderImg(d)}</div>
                <div style={s.listName}>{d['Danie']}</div>
                {sekcja === 'dania' && (
                  <div style={s.listArrow}>›</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 32px',
    maxWidth: 760, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', gap: 12, marginBottom: 18,
  },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { ...ui.h1, fontSize: 32, lineHeight: 1 },
  headerBtns: { display: 'flex', gap: 8, alignItems: 'center' },
  btnAdd: {
    width: 38, height: 38, borderRadius: 999,
    background: t.warm, color: '#fff', border: 'none',
    display: 'grid', placeItems: 'center', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(192,78,44,.3)',
  },
  btnLogout: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 12.5, color: t.mute, fontWeight: 500,
  },

  searchWrap: { position: 'relative', marginBottom: 14 },
  searchIcon: { position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)' },
  search: {
    ...ui.input, paddingLeft: 40, height: 44,
  },

  tabs: {
    display: 'flex', alignItems: 'center', gap: 16,
    borderBottom: `0.5px solid ${t.border}`,
    marginBottom: 16,
  },
  tab: {
    position: 'relative', padding: '10px 0',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 500, color: t.mute,
  },
  tabOn: { color: t.text, fontWeight: 600 },
  tabUnderline: {
    position: 'absolute', left: 0, right: 0, bottom: -0.5, height: 2,
    background: t.accent, borderRadius: 1,
  },
  viewToggle: {
    display: 'inline-flex', padding: 2, borderRadius: 8,
    background: t.surfaceAlt,
  },
  viewBtn: {
    width: 28, height: 26, border: 'none', borderRadius: 6,
    background: 'transparent', color: t.mute, cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  viewBtnOn: { background: t.surface, color: t.text, boxShadow: '0 1px 2px rgba(74,55,40,.08)' },

  // Featured
  featured: {
    position: 'relative', borderRadius: 20, overflow: 'hidden',
    aspectRatio: '16/9', marginBottom: 16, cursor: 'pointer',
  },
  featuredImg: { position: 'absolute', inset: 0 },
  featuredOverlay: {
    position: 'absolute', inset: 0, padding: 18, color: '#fff',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    background: 'linear-gradient(to top, rgba(20,15,10,.78), transparent 55%)',
  },
  featuredEyebrow: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
    letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6,
    color: '#fff', opacity: 0.85,
  },
  featuredTitle: {
    fontFamily: fonts.serif, fontSize: 26, lineHeight: 1.1,
    color: '#fff', letterSpacing: -0.3, fontWeight: 400, margin: 0,
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  card: {
    ...ui.card, overflow: 'hidden', cursor: 'pointer',
    display: 'flex', flexDirection: 'column',
  },
  cardImg: { width: '100%', aspectRatio: '4/3', position: 'relative', overflow: 'hidden' },
  cardBody: { padding: '10px 12px 12px' },
  cardTitle: {
    fontFamily: fonts.serif, fontSize: 15.5, lineHeight: 1.2,
    color: t.text, letterSpacing: -0.1, fontWeight: 400, margin: 0,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },

  // Image content
  img: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  placeholder: { width: '100%', height: '100%', display: 'grid', placeItems: 'center' },
  placeholderEmoji: { fontSize: 42, filter: 'grayscale(.1)' },

  // List view
  listView: { display: 'flex', flexDirection: 'column', gap: 6 },
  listItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 6, ...ui.card, cursor: 'pointer',
    fontFamily: fonts.sans, textAlign: 'left',
  },
  listImg: {
    width: 52, height: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
  },
  listName: {
    flex: 1, minWidth: 0,
    fontFamily: fonts.serif, fontSize: 16, color: t.text, letterSpacing: -0.1,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  listArrow: { fontSize: 22, color: t.muteLight, fontFamily: fonts.serif, paddingRight: 8 },

  empty: {
    ...ui.card, padding: '40px 20px', textAlign: 'center',
    color: t.mute, fontFamily: fonts.sans, fontSize: 14,
  },
  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },
}
