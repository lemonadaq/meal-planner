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

const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżki', 'łyżeczka', 'szklanka', 'ząbki', 'pęczek', 'garść', 'do smaku']
const DNI = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

function getPoniedzialek(offset = 0) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatData(date) {
  return date.toISOString().split('T')[0]
}

function formatNaglowek(date) {
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export default function DanieDetail({ nazwa: nazwaProp, onBack, user }) {
  const [skladniki, setSkladniki] = useState([])
  const [przepis, setPrzepis] = useState([])
  const [loading, setLoading] = useState(true)
  const [edycja, setEdycja] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nazwa, setNazwa] = useState(nazwaProp)

  // Edycja
  const [edNazwa, setEdNazwa] = useState('')
  const [edSkladniki, setEdSkladniki] = useState([])
  const [edPrzepis, setEdPrzepis] = useState([])
  const [nowyKrok, setNowyKrok] = useState('')

  // Kalendarz modal
  const [pokazKalendarz, setPokazKalendarz] = useState(false)
  const [tydzien, setTydzien] = useState(0)
  const [wybranyDzien, setWybranyDzien] = useState(null)
  const [wybranyPosilek, setWybranyPosilek] = useState('Obiad')
  const [dodawanie, setDodawanie] = useState(false)
  const [sukces, setSukces] = useState(false)

  useEffect(() => { pobierz() }, [nazwaProp])

  async function pobierz() {
    setLoading(true)
    const { data } = await supabase
      .from('dania').select('*')
      .eq('"Danie"', nazwaProp)
      .order('"Kategoria"')

    if (data && data.length > 0) {
      setSkladniki(data)
      const przepisTekst = data.find(d => d['Przepis'])?.['Przepis'] || ''
      const kroki = przepisTekst
        ? przepisTekst.split('\n').map(k => k.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
        : []
      setPrzepis(kroki)
    }
    setLoading(false)
  }

  function wejdzWEdycje() {
    setEdNazwa(nazwa)
    setEdSkladniki(skladniki.map(s => ({
      id: s.id,
      Skladnik: s['Składnik'] || '',
      Ilosc: s['Ilość na 1 porcję'] || '',
      Jednostka: s['Jednostka'] || 'szt.',
      Kategoria: s['Kategoria'] || '8_Inne',
    })))
    setEdPrzepis([...przepis])
    setEdycja(true)
  }

  async function zapiszZmiany() {
    setSaving(true)
    const przepisTekst = edPrzepis.map((k, i) => `${i + 1}. ${k}`).join('\n')
    if (edNazwa !== nazwa) {
      await supabase.from('dania').update({ 'Danie': edNazwa }).eq('"Danie"', nazwa)
      setNazwa(edNazwa)
    }
    await supabase.from('dania').update({ 'Przepis': przepisTekst }).eq('"Danie"', edNazwa)
    for (const s of edSkladniki) {
      await supabase.from('dania').update({
        'Składnik': s.Skladnik,
        'Ilość na 1 porcję': s.Ilosc,
        'Jednostka': s.Jednostka,
        'Kategoria': s.Kategoria,
      }).eq('id', s.id)
    }
    await pobierz()
    setEdycja(false)
    setSaving(false)
  }

  function usunSkladnik(i) { setEdSkladniki(prev => prev.filter((_, idx) => idx !== i)) }
  function dodajKrok() {
    if (!nowyKrok.trim()) return
    setEdPrzepis(prev => [...prev, nowyKrok.trim()])
    setNowyKrok('')
  }
  function usunKrok(i) { setEdPrzepis(prev => prev.filter((_, idx) => idx !== i)) }
  function przesunKrok(i, kierunek) {
    const nowe = [...edPrzepis]
    const j = i + kierunek
    if (j < 0 || j >= nowe.length) return
    ;[nowe[i], nowe[j]] = [nowe[j], nowe[i]]
    setEdPrzepis(nowe)
  }

  async function dodajDoKalendarza() {
    if (!wybranyDzien || !user) return
    setDodawanie(true)
    const { data: istniejacy } = await supabase
      .from('kalendarz').select('id')
      .eq('user_id', user.id)
      .eq('data', wybranyDzien)
      .eq('posilek', wybranyPosilek)
      .maybeSingle()

    if (istniejacy) {
      await supabase.from('kalendarz').update({ danie: nazwa }).eq('id', istniejacy.id)
    } else {
      await supabase.from('kalendarz').insert({ user_id: user.id, data: wybranyDzien, posilek: wybranyPosilek, danie: nazwa })
    }
    setDodawanie(false)
    setSukces(true)
    setTimeout(() => { setSukces(false); setPokazKalendarz(false) }, 1500)
  }

  const pogrupowane = skladniki.reduce((acc, s) => {
    const kat = s['Kategoria']?.replace(/^\d_/, '') || 'Inne'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(s)
    return acc
  }, {})

  const poniedzialek = getPoniedzialek(tydzien)
  const dni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(poniedzialek)
    d.setDate(d.getDate() + i)
    return d
  })

  if (loading) return <div style={s.loading}>Ładowanie...</div>

  return (
    <div style={s.container}>

      {/* Modal kalendarza */}
      {pokazKalendarz && (
        <div style={s.modalOverlay} onClick={() => setPokazKalendarz(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <span style={s.modalTytul}>📅 Dodaj do kalendarza</span>
              <button style={s.modalClose} onClick={() => setPokazKalendarz(false)}>✕</button>
            </div>
            {sukces ? (
              <div style={s.sukces}>✅ Dodano do kalendarza!</div>
            ) : (
              <>
                <div style={s.tydzienNav}>
                  <button style={s.navBtn} onClick={() => setTydzien(t => t - 1)}>‹</button>
                  <span style={s.tydzienLabel}>{formatNaglowek(dni[0])} — {formatNaglowek(dni[6])}</span>
                  <button style={s.navBtn} onClick={() => setTydzien(t => t + 1)}>›</button>
                </div>
                <div style={s.dniGrid}>
                  {dni.map((dzien, i) => {
                    const dataStr = formatData(dzien)
                    const aktywny = wybranyDzien === dataStr
                    return (
                      <button key={dataStr}
                        style={{ ...s.dzienBtn, ...(aktywny ? s.dzienBtnAktywny : {}) }}
                        onClick={() => setWybranyDzien(dataStr)}
                      >
                        <span style={s.dzienNazwa}>{DNI[i].slice(0, 3)}</span>
                        <span style={s.dzienData}>{dzien.getDate()}</span>
                      </button>
                    )
                  })}
                </div>
                <div style={s.posilkiRow}>
                  {POSILKI.map(p => (
                    <button key={p}
                      style={{ ...s.posilekBtn, ...(wybranyPosilek === p ? s.posilekBtnAktywny : {}) }}
                      onClick={() => setWybranyPosilek(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  style={{ ...s.btnDodajKal, opacity: wybranyDzien ? 1 : 0.5 }}
                  onClick={dodajDoKalendarza}
                  disabled={!wybranyDzien || dodawanie}
                >
                  {dodawanie ? 'Dodaję...' : '+ Dodaj do kalendarza'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{ ...s.hero, background: getKolor(nazwa) }}>
        <button style={s.back} onClick={onBack}>← Wróć</button>
        {!edycja && (
          <button style={s.btnEdytuj} onClick={wejdzWEdycje}>✏️ Edytuj</button>
        )}
        <div style={s.heroEmoji}>{getEmoji(nazwa)}</div>
        {edycja ? (
          <input style={s.inputNazwa} value={edNazwa} onChange={e => setEdNazwa(e.target.value)} />
        ) : (
          <h1 style={s.heroTytul}>{nazwa}</h1>
        )}
        {!edycja && (
          <button style={s.btnKalendarz} onClick={() => setPokazKalendarz(true)}>
            📅 Dodaj do kalendarza
          </button>
        )}
      </div>

      {/* Składniki */}
      <div style={s.skladnikiBox}>
        <h2 style={s.sekcjaTytul}>Składniki</h2>
        {edycja ? (
          <div>
            {edSkladniki.map((sk, i) => (
              <div key={sk.id} style={s.edSkladnikRow}>
                <input style={{ ...s.edInput, flex: 2 }} value={sk.Skladnik}
                  onChange={e => { const n = [...edSkladniki]; n[i].Skladnik = e.target.value; setEdSkladniki(n) }} />
                <input style={{ ...s.edInput, flex: 1 }} value={sk.Ilosc} placeholder="Ilość"
                  onChange={e => { const n = [...edSkladniki]; n[i].Ilosc = e.target.value; setEdSkladniki(n) }} />
                <select style={{ ...s.edInput, flex: 1 }} value={sk.Jednostka}
                  onChange={e => { const n = [...edSkladniki]; n[i].Jednostka = e.target.value; setEdSkladniki(n) }}>
                  {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <button style={s.btnUsun} onClick={() => usunSkladnik(i)}>✕</button>
              </div>
            ))}
          </div>
        ) : (
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
        )}
      </div>

      {/* Przepis */}
      <div style={s.przepisBox}>
        <h2 style={s.sekcjaTytul}>Przepis</h2>
        {edycja ? (
          <div>
            {edPrzepis.map((krok, i) => (
              <div key={i} style={s.edKrokRow}>
                <span style={s.edKrokNr}>{i + 1}.</span>
                <input style={{ ...s.edInput, flex: 1 }} value={krok}
                  onChange={e => { const n = [...edPrzepis]; n[i] = e.target.value; setEdPrzepis(n) }} />
                <button style={s.btnMini} onClick={() => przesunKrok(i, -1)}>↑</button>
                <button style={s.btnMini} onClick={() => przesunKrok(i, 1)}>↓</button>
                <button style={s.btnUsun} onClick={() => usunKrok(i)}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input style={{ ...s.edInput, flex: 1 }} placeholder="Nowy krok..."
                value={nowyKrok} onChange={e => setNowyKrok(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && dodajKrok()} />
              <button style={s.btnDodajKrok} onClick={dodajKrok}>+ Dodaj</button>
            </div>
          </div>
        ) : przepis.length > 0 ? (
          <ol style={s.listaKrokow}>
            {przepis.map((krok, i) => <li key={i} style={s.krok}>{krok}</li>)}
          </ol>
        ) : (
          <div style={s.brakPrzepisu}>Brak przepisu. Kliknij ✏️ Edytuj żeby dodać.</div>
        )}
      </div>

      {/* Przyciski zapisu */}
      {edycja && (
        <div style={{ display: 'flex', gap: 8, margin: '12px 16px 0' }}>
          <button style={{ ...s.btnZapisz, flex: 1 }} onClick={zapiszZmiany} disabled={saving}>
            {saving ? 'Zapisuję...' : '💾 Zapisz zmiany'}
          </button>
          <button style={{ ...s.btnAnuluj, flex: 0.4 }} onClick={() => setEdycja(false)}>
            Anuluj
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    width: '100%', maxWidth: 900,
    margin: '0 auto', background: '#f8f9fa',
    minHeight: '100vh', paddingBottom: 80,
  },
  hero: {
    margin: 16, padding: '18px 16px 24px',
    textAlign: 'center', position: 'relative',
    minHeight: 180, borderRadius: 24,
    boxSizing: 'border-box', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  back: {
    position: 'absolute', top: 16, left: 16,
    background: 'rgba(255,255,255,0.8)', border: 'none',
    borderRadius: 20, padding: '6px 14px', fontSize: 14,
    cursor: 'pointer', color: '#4a86e8', fontWeight: 500,
  },
  btnEdytuj: {
    position: 'absolute', top: 16, right: 16,
    background: 'rgba(255,255,255,0.8)', border: 'none',
    borderRadius: 20, padding: '6px 14px', fontSize: 14,
    cursor: 'pointer', color: '#333', fontWeight: 500,
  },
  heroEmoji: { fontSize: 64, marginBottom: 12 },
  heroTytul: {
    fontSize: 24, fontWeight: 700,
    color: '#1a1a1a', margin: '0 0 12px', textAlign: 'center',
  },
  inputNazwa: {
    fontSize: 20, fontWeight: 700,
    border: 'none', borderBottom: '2px solid #4a86e8',
    background: 'transparent', textAlign: 'center',
    padding: '4px 8px', marginBottom: 8,
    outline: 'none', width: '80%',
  },
  btnKalendarz: {
    background: 'rgba(255,255,255,0.9)', border: 'none',
    borderRadius: 20, padding: '8px 18px', fontSize: 14,
    cursor: 'pointer', color: '#4a86e8', fontWeight: 600,
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  skladnikiBox: {
    background: 'white', borderRadius: 16,
    padding: 16, margin: '0 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  skladnikiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  przepisBox: {
    marginTop: 12, margin: '12px 16px 0',
    background: 'white', borderRadius: 16,
    padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sekcjaTytul: {
    fontSize: 17, fontWeight: 700,
    color: '#1a1a1a', margin: '0 0 12px',
  },
  grupa: { marginBottom: 0 },
  katHeader: {
    fontSize: 9, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#4a86e8', padding: '3px 0',
    borderBottom: '1px solid #eee', marginBottom: 4,
  },
  skladnik: {
    display: 'flex', justifyContent: 'space-between',
    gap: 4, padding: '4px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  skladnikNazwa: { fontSize: 12, color: '#1a1a1a', lineHeight: 1.2 },
  skladnikIlosc: { fontSize: 11, color: '#888', whiteSpace: 'nowrap', lineHeight: 1.2 },
  edSkladnikRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 },
  edKrokRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 },
  edKrokNr: { fontSize: 13, color: '#888', minWidth: 20, fontWeight: 600 },
  edInput: {
    padding: '8px 10px', fontSize: 13,
    border: '1px solid #eee', borderRadius: 8,
    outline: 'none', background: 'white',
    boxSizing: 'border-box',
  },
  btnUsun: {
    background: 'none', border: 'none',
    color: '#ccc', fontSize: 16,
    cursor: 'pointer', flexShrink: 0, padding: '0 4px',
  },
  btnMini: {
    background: '#f0f0f0', border: 'none',
    borderRadius: 6, padding: '4px 8px',
    fontSize: 12, cursor: 'pointer', flexShrink: 0,
  },
  btnDodajKrok: {
    background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13,
    cursor: 'pointer', fontWeight: 600, flexShrink: 0,
  },
  listaKrokow: { margin: 0, paddingLeft: 20 },
  krok: { fontSize: 15, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 10 },
  brakPrzepisu: { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '20px 0' },
  btnZapisz: {
    padding: '14px', background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 12, fontSize: 15,
    fontWeight: 600, cursor: 'pointer',
  },
  btnAnuluj: {
    padding: '14px', background: '#f0f0f0', color: '#666',
    border: 'none', borderRadius: 12, fontSize: 15, cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: 60, fontSize: 16, color: '#666', fontFamily: 'sans-serif' },

  // Modal kalendarza
  modalOverlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 1000, display: 'flex',
    alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: 'white', borderRadius: '20px 20px 0 0',
    padding: '20px 16px 40px', width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTytul: { fontSize: 16, fontWeight: 700, color: '#1a1a1a' },
  modalClose: {
    background: 'none', border: 'none',
    fontSize: 20, color: '#aaa', cursor: 'pointer',
  },
  tydzienNav: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  tydzienLabel: { fontSize: 14, fontWeight: 600, color: '#1a1a1a' },
  navBtn: {
    background: '#f0f0f0', border: 'none',
    borderRadius: 8, width: 32, height: 32,
    fontSize: 18, cursor: 'pointer',
  },
  dniGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4, marginBottom: 12,
  },
  dzienBtn: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '6px 0',
    background: '#f8f9fa', border: 'none',
    borderRadius: 10, cursor: 'pointer',
  },
  dzienBtnAktywny: {
    background: '#4a86e8', color: 'white',
  },
  dzienNazwa: { fontSize: 9, fontWeight: 600, textTransform: 'uppercase', opacity: 0.7 },
  dzienData: { fontSize: 15, fontWeight: 700, marginTop: 2 },
  posilkiRow: { display: 'flex', gap: 8, marginBottom: 16 },
  posilekBtn: {
    flex: 1, padding: '10px 0',
    background: '#f0f0f0', border: 'none',
    borderRadius: 10, fontSize: 13,
    cursor: 'pointer', fontWeight: 500, color: '#666',
  },
  posilekBtnAktywny: {
    background: '#4a86e8', color: 'white', fontWeight: 700,
  },
  btnDodajKal: {
    width: '100%', padding: '14px',
    background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },
  sukces: {
    textAlign: 'center', padding: '30px 0',
    fontSize: 18, color: '#34a853',
  },
}