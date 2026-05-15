import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'
import { formatDataLocal as formatData } from '../dataHelpers'

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
  return '🍽️'
}

const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżki', 'łyżeczka', 'szklanka', 'ząbki', 'pęczek', 'garść', 'do smaku']
const KATEGORIE = [
  '1_Mięso i ryby', '2_Warzywa', '3_Owoce', '4_Nabiał',
  '5_Pieczywo', '6_Sypkie', '7_Przyprawy', '8_Inne',
]
const DNI = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela']
const DNI_KROTKO = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

function getPoniedzialek(offset = 0) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0, 0, 0, 0)
  return d
}
// formatData z dataHelpers
function formatKrotkoMies(date) { return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }) }

export default function DanieDetail({ nazwa: nazwaProp, onBack, user, sledz }) {
  const [skladniki, setSkladniki] = useState([])
  const [przepis, setPrzepis] = useState([])
  const [loading, setLoading] = useState(true)
  const [edycja, setEdycja] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nazwa, setNazwa] = useState(nazwaProp)

  const [edNazwa, setEdNazwa] = useState('')
  const [edSkladniki, setEdSkladniki] = useState([])
  const [edPrzepis, setEdPrzepis] = useState([])
  const [nowyKrok, setNowyKrok] = useState('')

  const [pokazKalendarz, setPokazKalendarz] = useState(false)
  const [tydzien, setTydzien] = useState(0)
  const [wybranyDzien, setWybranyDzien] = useState(null)
  const [wybranyPosilek, setWybranyPosilek] = useState('Obiad')
  const [dodawanie, setDodawanie] = useState(false)
  const [sukces, setSukces] = useState(false)
  const [planTygodnia, setPlanTygodnia] = useState({})

  const poniedzialek = getPoniedzialek(tydzien)
  const dni = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(poniedzialek)
    d.setDate(d.getDate() + i)
    return d
  })

  useEffect(() => { pobierz() }, [nazwaProp])
  useEffect(() => {
    if (!pokazKalendarz || !user) return
    async function pobierzPlan() {
      const od = formatData(dni[0])
      const doStr = formatData(dni[6])
      const { data } = await supabase
        .from('kalendarz').select('*')
        .eq('user_id', user.id).gte('data', od).lte('data', doStr)
      const mapa = {}
      ;(data || []).forEach(p => { mapa[`${p.data}_${p.posilek}`] = p.danie })
      setPlanTygodnia(mapa)
    }
    pobierzPlan()
  }, [pokazKalendarz, tydzien, user])

  async function pobierz() {
    setLoading(true)
    const { data } = await supabase.from('dania').select('*')
      .eq('"Danie"', nazwaProp).order('"Kategoria"')
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
    setEdSkladniki(skladniki.map(sk => ({
      id: sk.id,
      Skladnik: sk['Składnik'] || '',
      Ilosc: sk['Ilość na 1 porcję'] || '',
      Jednostka: sk['Jednostka'] || 'szt.',
      Kategoria: sk['Kategoria'] || '8_Inne',
      _nowy: false,
    })))
    setEdPrzepis([...przepis])
    setEdycja(true)
  }

  function dodajPustySkladnik() {
    setEdSkladniki(prev => [
      ...prev,
      { id: null, Skladnik: '', Ilosc: '', Jednostka: 'szt.', Kategoria: '8_Inne', _nowy: true }
    ])
  }

  async function zapiszZmiany() {
    setSaving(true)
    const przepisTekst = edPrzepis.map((k, i) => `${i + 1}. ${k}`).join('\n')

    let aktualnaNazwa = nazwa
    if (edNazwa !== nazwa && edNazwa.trim()) {
      await supabase.from('dania').update({ 'Danie': edNazwa.trim() }).eq('"Danie"', nazwa)
      aktualnaNazwa = edNazwa.trim()
      setNazwa(aktualnaNazwa)
    }

    const operacje = []
    operacje.push(
      supabase.from('dania').update({ 'Przepis': przepisTekst }).eq('"Danie"', aktualnaNazwa)
    )

    edSkladniki.filter(sk => sk.id && !sk._nowy).forEach(sk => {
      operacje.push(
        supabase.from('dania').update({
          'Składnik': sk.Skladnik,
          'Ilość na 1 porcję': sk.Ilosc,
          'Jednostka': sk.Jednostka,
          'Kategoria': sk.Kategoria,
        }).eq('id', sk.id)
      )
    })

    const noweSkladniki = edSkladniki.filter(sk => sk._nowy && sk.Skladnik.trim())
    if (noweSkladniki.length > 0) {
      const wzor = skladniki[0] || {}
      const wiersze = noweSkladniki.map(sk => ({
        'Danie': aktualnaNazwa,
        'Składnik': sk.Skladnik.trim(),
        'Ilość na 1 porcję': sk.Ilosc,
        'Jednostka': sk.Jednostka,
        'Kategoria': sk.Kategoria,
        'Przepis': przepisTekst,
        'TYP': wzor['TYP'] || null,
        'zdjecie': wzor['zdjecie'] || null,
      }))
      operacje.push(supabase.from('dania').insert(wiersze))
    }

    await Promise.all(operacje)
    sledz?.('edytuj_danie', { danie: aktualnaNazwa, nowe_skladniki: noweSkladniki.length })
    await pobierz()
    setEdycja(false); setSaving(false)
  }

  async function usunSkladnik(i) {
    const sk = edSkladniki[i]
    if (sk._nowy || !sk.id) {
      setEdSkladniki(prev => prev.filter((_, idx) => idx !== i))
      return
    }
    await supabase.from('dania').delete().eq('id', sk.id)
    setEdSkladniki(prev => prev.filter((_, idx) => idx !== i))
  }

  function dodajKrok() {
    if (!nowyKrok.trim()) return
    setEdPrzepis(prev => [...prev, nowyKrok.trim()]); setNowyKrok('')
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
      .eq('user_id', user.id).eq('data', wybranyDzien).eq('posilek', wybranyPosilek)
      .maybeSingle()
    if (istniejacy) {
      await supabase.from('kalendarz').update({ danie: nazwa, podmiany: {} }).eq('id', istniejacy.id)
    } else {
      await supabase.from('kalendarz').insert({ user_id: user.id, data: wybranyDzien, posilek: wybranyPosilek, danie: nazwa })
    }
    sledz?.('dodaj_do_kalendarza', { danie: nazwa, dzien: wybranyDzien, posilek: wybranyPosilek })
    setDodawanie(false); setSukces(true)
    setTimeout(() => { setSukces(false); setPokazKalendarz(false) }, 1500)
  }

  const pogrupowane = skladniki.reduce((acc, sk) => {
    const kat = sk['Kategoria']?.replace(/^\d_/, '') || 'Inne'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(sk); return acc
  }, {})

  if (loading) return <div style={s.loading}>Ładowanie…</div>

  const heroZdj = skladniki.find(sk => sk.zdjecie)?.zdjecie

  return (
    <div style={s.outer}>
      {pokazKalendarz && (
        <div style={s.modalOverlay} onClick={() => setPokazKalendarz(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalEyebrow}>DO KALENDARZA</div>
                <div style={s.modalTytul}>{nazwa}</div>
              </div>
              <button style={s.modalClose} onClick={() => setPokazKalendarz(false)} aria-label="Zamknij">✕</button>
            </div>

            {sukces ? (
              <div style={s.sukces}>
                <div style={s.sukcesIkona}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                </div>
                <div style={s.sukcesTxt}>Dodano do kalendarza</div>
              </div>
            ) : (
              <>
                <div style={s.tydzienNav}>
                  <button style={s.navBtn} onClick={() => setTydzien(t => t - 1)}>‹</button>
                  <span style={s.tydzienLabel}>
                    {formatKrotkoMies(dni[0])} — {formatKrotkoMies(dni[6])}
                  </span>
                  <button style={s.navBtn} onClick={() => setTydzien(t => t + 1)}>›</button>
                </div>

                <div style={s.dniGrid}>
                  {dni.map((dzien, i) => {
                    const dataStr = formatData(dzien)
                    const aktywny = wybranyDzien === dataStr
                    const zaplanowane = planTygodnia[`${dataStr}_${wybranyPosilek}`]
                    return (
                      <button key={dataStr}
                        style={{ ...s.dzienBtn, ...(aktywny ? s.dzienBtnOn : {}) }}
                        onClick={() => setWybranyDzien(dataStr)}>
                        <span style={{ ...s.dzienBtnDow, color: aktywny ? '#fff' : t.mute }}>
                          {DNI_KROTKO[i]}
                        </span>
                        <span style={{ ...s.dzienBtnDate, color: aktywny ? '#fff' : t.text }}>
                          {dzien.getDate()}
                        </span>
                        {zaplanowane && (
                          <span style={{ ...s.dzienBtnNote, color: aktywny ? 'rgba(255,255,255,.85)' : t.accent }}>
                            {zaplanowane}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div style={s.posilkiRow}>
                  {POSILKI.map(p => (
                    <button key={p}
                      style={{ ...s.posilekBtn, ...(wybranyPosilek === p ? s.posilekBtnOn : {}) }}
                      onClick={() => setWybranyPosilek(p)}>
                      {p}
                    </button>
                  ))}
                </div>

                <button style={{ ...s.btnDodajKal, opacity: wybranyDzien ? 1 : 0.5 }}
                  onClick={dodajDoKalendarza}
                  disabled={!wybranyDzien || dodawanie}>
                  {dodawanie ? 'Dodaję…' : 'Dodaj do kalendarza'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={s.container}>
        <div style={s.topBar}>
          <button style={s.backTop} onClick={onBack}>← Wróć</button>
          {!edycja && (
            <button style={s.editTop} onClick={wejdzWEdycje}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>
              Edytuj
            </button>
          )}
        </div>

        <article style={s.hero}>
          <div style={{ ...s.heroImg, background: heroZdj ? 'transparent' : getKolor(nazwa) }}>
            {heroZdj
              ? <img src={heroZdj} alt={nazwa} style={s.heroImgInner} />
              : <span style={s.heroEmoji}>{getEmoji(nazwa)}</span>}
          </div>

          <div style={s.heroInfo}>
            <div style={s.eyebrow}>Przepis</div>
            {edycja ? (
              <input style={s.inputNazwa} value={edNazwa} onChange={e => setEdNazwa(e.target.value)} />
            ) : (
              <h1 style={s.heroTytul}>{nazwa}</h1>
            )}
            {!edycja && (
              <div style={s.heroActions}>
                <button style={s.btnKalendarz} onClick={() => setPokazKalendarz(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                  Zaplanuj
                </button>
              </div>
            )}
          </div>
        </article>

        <section style={s.section}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Składniki</h2>
            {!edycja && skladniki.length > 0 && (
              <span style={s.countBadge}>{skladniki.length}</span>
            )}
          </div>

          {edycja ? (
            <div style={s.edList}>
              {edSkladniki.map((sk, i) => (
                <div key={sk.id || `nowy-${i}`} style={s.edSkladnikBlok}>
                  <div style={s.edSkladnikRow}>
                    <input style={{ ...s.edInput, flex: 2 }} value={sk.Skladnik} placeholder="Składnik"
                      onChange={e => { const n = [...edSkladniki]; n[i].Skladnik = e.target.value; setEdSkladniki(n) }} />
                    <input style={{ ...s.edInput, flex: 1 }} value={sk.Ilosc} placeholder="Ilość"
                      onChange={e => { const n = [...edSkladniki]; n[i].Ilosc = e.target.value; setEdSkladniki(n) }} />
                    <select style={{ ...s.edInput, flex: 1 }} value={sk.Jednostka}
                      onChange={e => { const n = [...edSkladniki]; n[i].Jednostka = e.target.value; setEdSkladniki(n) }}>
                      {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                    <button style={s.btnUsun} onClick={() => usunSkladnik(i)} title="Usuń">✕</button>
                  </div>
                  <select style={{ ...s.edInput, ...s.kategoriaSelect }} value={sk.Kategoria}
                    onChange={e => { const n = [...edSkladniki]; n[i].Kategoria = e.target.value; setEdSkladniki(n) }}>
                    {KATEGORIE.map(k => <option key={k} value={k}>{k.replace(/^\d_/, '')}</option>)}
                  </select>
                </div>
              ))}
              <button style={s.btnDodajSkladnik} onClick={dodajPustySkladnik}>
                + Dodaj składnik
              </button>
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
        </section>

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Przepis</h2>
          {edycja ? (
            <div style={s.edList}>
              {edPrzepis.map((krok, i) => (
                <div key={i} style={s.edKrokRow}>
                  <span style={s.edKrokNr}>{String(i + 1).padStart(2, '0')}</span>
                  <input style={{ ...s.edInput, flex: 1 }} value={krok}
                    onChange={e => { const n = [...edPrzepis]; n[i] = e.target.value; setEdPrzepis(n) }} />
                  <button style={s.btnMini} onClick={() => przesunKrok(i, -1)}>↑</button>
                  <button style={s.btnMini} onClick={() => przesunKrok(i, 1)}>↓</button>
                  <button style={s.btnUsun} onClick={() => usunKrok(i)}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input style={{ ...s.edInput, flex: 1 }} placeholder="Nowy krok…"
                  value={nowyKrok} onChange={e => setNowyKrok(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && dodajKrok()} />
                <button style={s.btnDodajKrok} onClick={dodajKrok}>+ Dodaj</button>
              </div>
            </div>
          ) : przepis.length > 0 ? (
            <ol style={s.kroki}>
              {przepis.map((krok, i) => (
                <li key={i} style={s.krok}>
                  <span style={s.krokNr}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={s.krokTxt}>{krok}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div style={s.brak}>Brak przepisu. Kliknij <em style={s.italic}>Edytuj</em>, aby dodać kroki.</div>
          )}
        </section>

        {edycja && (
          <div style={s.saveRow}>
            <button style={{ ...ui.btnPrimary, flex: 1 }} onClick={zapiszZmiany} disabled={saving}>
              {saving ? 'Zapisuję…' : 'Zapisz zmiany'}
            </button>
            <button style={{ ...ui.btnGhost, padding: '14px 20px' }} onClick={() => setEdycja(false)}>
              Anuluj
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 40px',
    maxWidth: 760, margin: '0 auto', boxSizing: 'border-box',
  },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backTop: { ...ui.btnText, padding: 0 },
  editTop: {
    background: t.surface, color: t.text,
    border: `0.5px solid ${t.border}`, borderRadius: 999, padding: '8px 14px',
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center',
  },
  hero: { ...ui.card, overflow: 'hidden', marginBottom: 18, padding: 0 },
  heroImg: {
    width: '100%', aspectRatio: '5/3',
    display: 'grid', placeItems: 'center', overflow: 'hidden',
  },
  heroImgInner: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  heroEmoji: { fontSize: 88 },
  heroInfo: { padding: '20px 22px 22px' },
  eyebrow: { ...ui.eyebrow, marginBottom: 6 },
  heroTytul: { ...ui.h1, fontSize: 30, lineHeight: 1.05, margin: 0 },
  inputNazwa: {
    fontFamily: fonts.serif, fontSize: 28, color: t.text,
    border: 'none', borderBottom: `2px solid ${t.accent}`,
    background: 'transparent', padding: '6px 0', width: '100%',
    outline: 'none', letterSpacing: -0.4,
  },
  heroActions: { display: 'flex', gap: 8, marginTop: 14 },
  btnKalendarz: {
    ...ui.btnPrimary, display: 'inline-flex', alignItems: 'center',
    padding: '11px 16px', fontSize: 14,
  },
  section: { ...ui.card, padding: 20, marginBottom: 14 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { ...ui.h2, fontSize: 20 },
  countBadge: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 700,
    letterSpacing: 0.6, color: t.mute,
    padding: '2px 8px', borderRadius: 999, background: t.surfaceAlt,
  },
  skladnikiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16,
  },
  grupa: {},
  katHeader: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    paddingBottom: 6, marginBottom: 6, borderBottom: `0.5px solid ${t.border}`,
  },
  skladnik: {
    display: 'flex', justifyContent: 'space-between', gap: 8,
    padding: '5px 0', fontFamily: fonts.sans,
  },
  skladnikNazwa: { fontSize: 13.5, color: t.text },
  skladnikIlosc: { fontSize: 12.5, color: t.mute, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  kroki: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 },
  krok: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  krokNr: {
    flexShrink: 0, fontFamily: fonts.serif, fontSize: 20, color: t.accent,
    fontStyle: 'italic', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, minWidth: 28,
  },
  krokTxt: { fontFamily: fonts.sans, fontSize: 15, color: t.text, lineHeight: 1.55 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },
  brak: { fontFamily: fonts.sans, fontSize: 13.5, color: t.mute, padding: '6px 0' },
  edList: { display: 'flex', flexDirection: 'column', gap: 8 },
  edSkladnikBlok: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '8px 0', borderBottom: `0.5px solid ${t.border}`,
  },
  edSkladnikRow: { display: 'flex', gap: 6, alignItems: 'center' },
  kategoriaSelect: { padding: '6px 10px', fontSize: 11, color: t.mute, marginTop: 2 },
  edKrokRow: { display: 'flex', gap: 6, alignItems: 'center' },
  edKrokNr: {
    minWidth: 28, fontFamily: fonts.serif, fontSize: 18, color: t.accent,
    fontStyle: 'italic', fontVariantNumeric: 'tabular-nums',
  },
  edInput: { ...ui.input, padding: '9px 11px', fontSize: 13, marginBottom: 0 },
  btnUsun: {
    background: 'none', border: 'none', color: t.muteLight,
    fontSize: 16, cursor: 'pointer', padding: '0 6px',
  },
  btnMini: {
    background: t.surfaceAlt, border: 'none', borderRadius: 8,
    padding: '6px 9px', fontSize: 12, cursor: 'pointer',
    color: t.text, fontFamily: fonts.sans,
  },
  btnDodajSkladnik: {
    background: t.accentSoft, color: t.accentDark,
    border: 'none', borderRadius: 10, padding: '10px 14px',
    fontSize: 13, fontWeight: 600, fontFamily: fonts.sans,
    cursor: 'pointer', marginTop: 6,
  },
  btnDodajKrok: { ...ui.btnPrimary, padding: '10px 14px', fontSize: 13 },
  saveRow: { display: 'flex', gap: 8, marginTop: 14 },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(20,15,10,.4)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  modal: {
    background: t.surface,
    borderRadius: '22px 22px 0 0',
    padding: '22px 22px 32px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans,
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalEyebrow: { ...ui.eyebrow, marginBottom: 3 },
  modalTytul: { fontFamily: fonts.serif, fontSize: 22, color: t.text, letterSpacing: -0.2, lineHeight: 1.1 },
  modalClose: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 32, height: 32, fontSize: 14, color: t.mute, cursor: 'pointer',
  },
  tydzienNav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  tydzienLabel: { fontFamily: fonts.serif, fontSize: 16, color: t.text },
  navBtn: {
    width: 32, height: 32, borderRadius: 999,
    background: t.surface, border: `0.5px solid ${t.border}`,
    fontFamily: fonts.serif, fontSize: 18, color: t.text, cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  dniGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 14 },
  dzienBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 2px', minHeight: 70,
    background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 12,
    cursor: 'pointer',
  },
  dzienBtnOn: {
    background: t.accent, borderColor: t.accent,
    boxShadow: '0 4px 12px rgba(77,124,77,.3)',
  },
  dzienBtnDow: { fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' },
  dzienBtnDate: { fontFamily: fonts.serif, fontSize: 17, marginTop: 2 },
  dzienBtnNote: {
    fontSize: 8.5, marginTop: 3, padding: '0 2px',
    overflow: 'hidden', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textAlign: 'center', lineHeight: 1.2,
  },
  posilkiRow: { display: 'flex', gap: 6, marginBottom: 16 },
  posilekBtn: {
    flex: 1, padding: '10px 0', borderRadius: 10,
    background: t.surfaceAlt, border: 'none', cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 13, color: t.text, fontWeight: 500,
  },
  posilekBtnOn: { background: t.warm, color: '#fff', fontWeight: 600 },
  btnDodajKal: { ...ui.btnPrimary, width: '100%', padding: '14px' },
  sukces: { padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  sukcesIkona: {
    width: 56, height: 56, borderRadius: '50%',
    background: t.accentSoft, display: 'grid', placeItems: 'center',
  },
  sukcesTxt: { fontFamily: fonts.serif, fontSize: 18, color: t.text, letterSpacing: -0.2 },
  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },
}
