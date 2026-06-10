import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

async function kompresujObraz(plik, maxSzerokosc = 1200, jakosc = 0.82) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSzerokosc) { height = Math.round(height * maxSzerokosc / width); width = maxSzerokosc }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', jakosc)
    }
    img.src = URL.createObjectURL(plik)
  })
}

async function uploadujZdjecie(plik, slug) {
  const blob = await kompresujObraz(plik)
  const sciezka = `dania/${slug}-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('dania-zdjecia').upload(sciezka, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw error
  return supabase.storage.from('dania-zdjecia').getPublicUrl(sciezka).data.publicUrl
}

const JEDNOSTKI = ['g', 'kg', 'ml', 'l', 'szt.', 'opak.', 'łyżka', 'łyżki', 'łyżeczka', 'szklanka', 'ząbki', 'pęczek', 'garść', 'do smaku']

const KATEGORIE = {
  'Warzywa i owoce':    '1_Warzywa i owoce',
  'Mięso i ryby':       '2_Mięso i ryby',
  'Nabiał':             '3_Nabiał',
  'Pieczywo':           '4_Pieczywo',
  'Produkty sypkie':    '5_Produkty sypkie',
  'Konserwy i słoiki':  '6_Konserwy i słoiki',
  'Przyprawy':          '7_Przyprawy',
  'Inne':               '8_Inne',
}

// Rodzaje — wszystko ląduje w tabeli `dania` (rodzaj decyduje o filtrach)
const RODZAJE = [
  { id: 'obiad',     label: 'Obiad',     placeholder: 'np. Makaron z dynią i szałwią' },
  { id: 'sniadanie', label: 'Śniadanie', placeholder: 'np. Owsianka z bananem' },
  { id: 'kolacja',   label: 'Kolacja',   placeholder: 'np. Tosty z awokado' },
  { id: 'zupa',      label: 'Zupa',      placeholder: 'np. Pomidorowa z makaronem' },
  { id: 'deser',     label: 'Deser',     placeholder: 'np. Sernik na zimno' },
  { id: 'przekaska', label: 'Przekąska', placeholder: 'np. Hummus z marchewką' },
  { id: 'dodatek',   label: 'Dodatek',   placeholder: 'np. Ryż basmati' },
  { id: 'surowka',   label: 'Surówka',   placeholder: 'np. Surówka z marchewki' },
]

// Rodzaje, które mogą być "z dodatkiem" — dla dodatek/surowka/zupa/deser nie ma sensu
const RODZAJE_GLOWNE = ['obiad', 'sniadanie', 'kolacja', 'przekaska']

export default function DodajDanie({ onBack, onZapisano }) {
  const [rodzaj, setRodzaj] = useState('obiad')
  const [nazwa, setNazwa] = useState('')
  const [typ, setTyp] = useState('samodzielne')
  const [czasMinuty, setCzasMinuty] = useState('')
  const [porcjeBazowe, setPorcjeBazowe] = useState('4')
  const [notatki, setNotatki] = useState('')

  const [skladniki, setSkladniki] = useState([])
  const [istniejaceSkladniki, setIstniejaceSkladniki] = useState([])
  const [nowyS, setNowyS] = useState({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
  const [podpowiedzi, setPodpowiedzi] = useState([])

  const [przepisRaw, setPrzepisRaw] = useState('')

  const [zdjeciePlik, setZdjeciePlik] = useState(null)
  const [zdjeciePreview, setZdjeciePreview] = useState(null)

  const [saving, setSaving] = useState(false)
  const [blad, setBlad] = useState('')

  const rodzajCfg = RODZAJE.find(r => r.id === rodzaj)
  const pokazTyp = RODZAJE_GLOWNE.includes(rodzaj)

  useEffect(() => {
    async function pobierzSkladniki() {
      const { data } = await supabase.from('dania').select('"Składnik", "Jednostka", "Kategoria"').limit(10000)
      if (data) {
        // Zmiana 1: dedup przez znormalizowany klucz (trim+lowercase), wyświetlamy z wielką literą
        const unikalne = [...new Map(
          data
            .filter(x => x['Składnik'])
            .map(x => {
              const trimmed = x['Składnik'].trim()
              const key = trimmed.toLowerCase()
              const display = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
              return [key, { ...x, 'Składnik': display }]
            })
        ).values()]
        setIstniejaceSkladniki(unikalne)
      }
    }
    pobierzSkladniki()
  }, [])

  function szukajPodpowiedzi(val) {
    setNowyS(prev => ({ ...prev, nazwa: val }))
    if (val.trim().length < 2) { setPodpowiedzi([]); return }
    const filtered = istniejaceSkladniki
      .filter(sk => sk['Składnik']?.toLowerCase().includes(val.trim().toLowerCase()))
      .slice(0, 4)
    setPodpowiedzi(filtered)
  }
  function wybierzPodpowiedz(sk) {
    setNowyS({
      nazwa: sk['Składnik'],
      ilosc: '',
      jednostka: sk['Jednostka'] || 'g',
      kategoria: sk['Kategoria'] || '1_Warzywa i owoce',
    })
    setPodpowiedzi([])
  }

  function wyczyscFormularz() {
    setRodzaj('obiad'); setNazwa(''); setTyp('samodzielne')
    setCzasMinuty(''); setPorcjeBazowe('4'); setNotatki('')
    setSkladniki([]); setKroki([])
    setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
    setNowyKrok('')
    setBlad(''); setPodpowiedzi([])
    setZdjeciePlik(null); setZdjeciePreview(null)
  }

  function dodajSkladnik() {
    if (!nowyS.nazwa.trim()) return
    if (skladniki.find(sk => sk.nazwa.toLowerCase() === nowyS.nazwa.toLowerCase())) {
      setBlad('Ten składnik już jest na liście'); return
    }
    setSkladniki(prev => [...prev, { ...nowyS, nazwa: nowyS.nazwa.trim() }])
    setNowyS({ nazwa: '', ilosc: '', jednostka: 'g', kategoria: '1_Warzywa i owoce' })
    setPodpowiedzi([]); setBlad('')
  }
  function usunSkladnik(i) { setSkladniki(prev => prev.filter((_, idx) => idx !== i)) }


  async function zapiszDanie() {
    if (!nazwa.trim()) { setBlad('Wpisz nazwę'); return }
    if (skladniki.length === 0) { setBlad('Dodaj przynajmniej jeden składnik'); return }
    setSaving(true); setBlad('')

    // Duplikat — sprawdzamy wszystko w nowej, scalonej tabeli `dania`
    const { data: istniejace } = await supabase
      .from('dania').select('"Danie", rodzaj')
      .eq('"Danie"', nazwa.trim())
      .limit(1)
    if (istniejace?.length) {
      const r = RODZAJE.find(x => x.id === istniejace[0].rodzaj)?.label || 'bazie'
      setBlad(`"${nazwa}" już istnieje (${r.toLowerCase()})`)
      setSaving(false); return
    }

    const krokiParsed = przepisRaw
      .split('\n').map(k => k.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
    const przepisTekst = krokiParsed.length > 0
      ? krokiParsed.map((k, i) => `${i + 1}. ${k}`).join('\n')
      : null

    let zdjecieUrl = null
    if (zdjeciePlik) {
      try {
        const slug = nazwa.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
        zdjecieUrl = await uploadujZdjecie(zdjeciePlik, slug)
      } catch (e) {
        setBlad('Błąd uploadu zdjęcia: ' + e.message)
        setSaving(false); return
      }
    }

    const wspolne = {
      'Danie': nazwa.trim(),
      'Przepis': przepisTekst,
      'rodzaj': rodzaj,
      'czas_minuty': czasMinuty ? parseInt(czasMinuty, 10) || null : null,
      'porcje_bazowe': porcjeBazowe ? parseInt(porcjeBazowe, 10) || 4 : 4,
      'notatki': notatki.trim() || null,
      'zdjecie': zdjecieUrl,
    }

    const rows = skladniki.map((sk, i) => ({
      ...wspolne,
      'Składnik': sk.nazwa,
      'Ilość na 1 porcję': sk.ilosc || '-',
      'Jednostka': sk.jednostka,
      'Kategoria': sk.kategoria,
      // TYP zapisujemy tylko dla głównych rodzajów, w pierwszym wierszu
      'TYP': pokazTyp && i === 0 ? typ : null,
    }))

    const { error } = await supabase.from('dania').insert(rows)
    if (error) {
      setBlad('Błąd zapisu: ' + error.message)
      setSaving(false)
    } else {
      onZapisano(nazwa)
    }
  }

  const s = makeS()

  return (
    <div style={s.outer}>
      <div style={s.container}>
        <button style={s.back} onClick={onBack}>← Wróć</button>

        <header style={s.header}>
          <div style={s.eyebrow}>NOWY WPIS</div>
          <h1 style={s.title}>
            Dodaj <em style={s.italic}>{rodzajCfg.label.toLowerCase()}</em>
          </h1>
        </header>

        {/* Wybór rodzaju — grid 3×2 */}
        <section style={s.section}>
          <label style={s.label}>Co dodajesz?</label>
          <div style={s.rodzajeGrid}>
            {RODZAJE.map(r => (
              <button key={r.id}
                style={{ ...s.rodzajBtn, ...(rodzaj === r.id ? s.rodzajBtnOn : {}) }}
                onClick={() => setRodzaj(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        </section>

        {/* Nazwa */}
        <section style={s.section}>
          <label style={s.label}>Nazwa</label>
          <input
            style={s.input}
            placeholder={rodzajCfg.placeholder}
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
          />
        </section>

        {/* Czas + porcje w jednym wierszu */}
        <section style={s.section}>
          <label style={s.label}>Czas i porcje</label>
          <div style={s.row2}>
            <div style={{ flex: 1 }}>
              <input
                style={s.input}
                placeholder="Czas (min)"
                type="number"
                inputMode="numeric"
                min="1"
                value={czasMinuty}
                onChange={e => setCzasMinuty(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <input
                style={s.input}
                placeholder="Porcje"
                type="number"
                inputMode="numeric"
                min="1"
                value={porcjeBazowe}
                onChange={e => setPorcjeBazowe(e.target.value)}
              />
            </div>
          </div>
          <div style={s.hint}>
            Czas przyrządzania to opcja — dla filtra „do 30 minut". Porcje określają, ile osób wykarmi ten przepis bazowo.
          </div>
        </section>

        {/* Typ dania (tylko dla głównych rodzajów) */}
        {pokazTyp && (
          <section style={s.section}>
            <label style={s.label}>Typ dania</label>
            <div style={s.segRow}>
              {[
                { val: 'samodzielne', label: 'Samodzielne' },
                { val: 'z_dodatkiem', label: 'Z dodatkiem' },
              ].map(b => (
                <button key={b.val}
                  style={{ ...s.segBtn, ...(typ === b.val ? s.segBtnOn : {}) }}
                  onClick={() => setTyp(b.val)}>
                  {b.label}
                </button>
              ))}
            </div>
            <div style={s.hint}>
              {typ === 'samodzielne'
                ? 'Posiłek kompletny — nie wymaga dodatku ani surówki w planie.'
                : 'Do tego posiłku w kalendarzu dobierzesz dodatek i surówkę.'}
            </div>
          </section>
        )}

        {/* Dodawanie składnika */}
        <section style={s.section}>
          <label style={s.label}>Dodaj składnik</label>

          <div>
            <input
              style={s.input}
              placeholder="Składnik…"
              value={nowyS.nazwa}
              onChange={e => szukajPodpowiedzi(e.target.value)}
            />
            {(podpowiedzi.length > 0 || nowyS.nazwa.trim().length >= 2) && (
              <div style={s.podpowiedzi}>
                {/* Zmiana 3: wiersz "➕ Użyj: «wpisane»" gdy brak dokładnego dopasowania */}
                {nowyS.nazwa.trim().length >= 2 &&
                  !podpowiedzi.some(p => p['Składnik'].toLowerCase() === nowyS.nazwa.trim().toLowerCase()) && (
                  <div style={{ ...s.podpowiedzItem, ...s.podpowiedzUzyj }}
                    onClick={() => {
                      const n = nowyS.nazwa.trim()
                      const display = n.charAt(0).toUpperCase() + n.slice(1)
                      setNowyS(prev => ({ ...prev, nazwa: display }))
                      setPodpowiedzi([])
                    }}>
                    <span>➕ Użyj: „{nowyS.nazwa.trim()}"</span>
                  </div>
                )}
                {podpowiedzi.map((p, i) => (
                  <div key={i} style={s.podpowiedzItem} onClick={() => wybierzPodpowiedz(p)}>
                    <span style={s.podpowiedzNazwa}>{p['Składnik']}</span>
                    <span style={s.podpowiedzJedn}>{p['Jednostka']}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={s.row2}>
            <input
              style={{ ...s.input, flex: 1 }}
              placeholder="Ilość"
              type="text"
              inputMode="decimal"
              value={nowyS.ilosc}
              onChange={e => setNowyS(prev => ({ ...prev, ilosc: e.target.value }))}
            />
            <select
              style={{ ...s.input, flex: 1 }}
              value={nowyS.jednostka}
              onChange={e => setNowyS(prev => ({ ...prev, jednostka: e.target.value }))}>
              {JEDNOSTKI.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <select
            style={s.input}
            value={nowyS.kategoria}
            onChange={e => setNowyS(prev => ({ ...prev, kategoria: e.target.value }))}>
            {Object.entries(KATEGORIE).map(([label, val]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <button style={s.btnDodajSkl} onClick={dodajSkladnik}>
            + Dodaj składnik
          </button>
        </section>

        {/* Lista składników */}
        {skladniki.length > 0 && (
          <section style={s.section}>
            <div style={s.skladnikiHeader}>
              <label style={s.label}>Składniki</label>
              <span style={s.badge}>{skladniki.length}</span>
            </div>
            <div style={s.skladnikiLista}>
              {skladniki.map((sk, i) => (
                <div key={i} style={s.skladnikItem}>
                  <span style={s.skNr}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={s.skInfo}>
                    <div style={s.skNazwa}>{sk.nazwa}</div>
                    <div style={s.skMeta}>{sk.ilosc || '—'} {sk.jednostka}</div>
                  </div>
                  <button style={s.btnUsun} onClick={() => usunSkladnik(i)} aria-label="Usuń">✕</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Kroki przepisu */}
        <section style={s.section}>
          <label style={s.label}>Kroki przepisu</label>
          <textarea
            style={{ ...s.input, minHeight: 140, resize: 'vertical', fontFamily: fonts.sans, lineHeight: 1.7 }}
            placeholder={'Każda linia = osobny krok:\nObtocz filet w jajku, potem w bułce tartej\nSmaż na rozgrzanym oleju 3 min z każdej strony\nOdłóż na ręcznik papierowy\n\nMożesz też numerować (1. 2. 3.) — numery znikną automatycznie.'}
            value={przepisRaw}
            onChange={e => setPrzepisRaw(e.target.value)}
          />
        </section>

        {/* Notatki — NOWE */}
        <section style={s.section}>
          <label style={s.label}>Notatki (opcjonalne)</label>
          <textarea
            style={{ ...s.input, minHeight: 70, resize: 'vertical', fontFamily: fonts.sans }}
            placeholder="Twoje uwagi, modyfikacje, wskazówki, czego unikać…"
            value={notatki}
            onChange={e => setNotatki(e.target.value)}
          />
        </section>

        {/* Zdjęcie */}
        <section style={s.section}>
          <label style={s.label}>Zdjęcie (opcjonalne)</label>
          {zdjeciePreview ? (
            <div style={s.zdjecieWrap}>
              <img src={zdjeciePreview} alt="Podgląd" style={s.zdjecieImg} />
              <button style={s.btnUsunZdj} onClick={() => { setZdjeciePlik(null); setZdjeciePreview(null) }}>
                Usuń
              </button>
            </div>
          ) : (
            <label style={s.btnDodajZdj}>
              + Dodaj zdjęcie
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                  const plik = e.target.files?.[0]
                  if (!plik) return
                  setZdjeciePlik(plik)
                  setZdjeciePreview(URL.createObjectURL(plik))
                }}
              />
            </label>
          )}
        </section>

        {blad && <div style={s.blad}>{blad}</div>}

        <div style={s.bottomRow}>
          <button style={{ ...ui.btnPrimary, flex: 1 }} onClick={zapiszDanie} disabled={saving}>
            {saving ? 'Zapisuję…' : 'Zapisz'}
          </button>
          <button style={{ ...ui.btnGhost, padding: '14px 18px' }} onClick={wyczyscFormularz}>
            Wyczyść
          </button>
        </div>
      </div>
    </div>
  )
}

function makeS() {
  return {
  outer: { background: t.bg, minHeight: '100vh', fontFamily: fonts.sans },
  container: {
    padding: '20px 20px 40px',
    maxWidth: 620, margin: '0 auto', boxSizing: 'border-box',
  },
  back: { ...ui.btnText, padding: '0 0 14px', display: 'block' },

  header: { marginBottom: 22 },
  eyebrow: { ...ui.eyebrow, marginBottom: 4 },
  title: { ...ui.h1, fontSize: 30, lineHeight: 1.05 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },

  section: { marginBottom: 22 },
  label: {
    display: 'block', fontFamily: fonts.sans, fontSize: 11, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: t.accent,
    marginBottom: 10,
  },

  // Rodzaje — 3×2 grid
  rodzajeGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
    padding: 4, background: t.surfaceAlt, borderRadius: 14,
  },
  rodzajBtn: {
    padding: '11px 6px', border: 'none', borderRadius: 10,
    background: 'transparent', color: t.mute,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
    transition: 'all .15s ease',
  },
  rodzajBtnOn: {
    background: t.surface, color: t.text, fontWeight: 600,
    boxShadow: '0 1px 3px rgba(74,55,40,.1)',
  },

  // Segmented control (Typ dania)
  segRow: { display: 'flex', gap: 4, padding: 3, background: t.surfaceAlt, borderRadius: 12 },
  segBtn: {
    flex: 1, padding: '9px 8px', border: 'none', borderRadius: 9,
    background: 'transparent', color: t.mute,
    fontFamily: fonts.sans, fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  segBtnOn: {
    background: t.surface, color: t.text, fontWeight: 600,
    boxShadow: '0 1px 2px rgba(74,55,40,.08)',
  },
  hint: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute,
    marginTop: 8, lineHeight: 1.5,
  },

  // Form
  input: { ...ui.input, marginBottom: 8 },
  row2: { display: 'flex', gap: 8 },

  // Suggestions
  podpowiedzi: {
    background: t.surface, border: `0.5px solid ${t.border}`, borderRadius: 12,
    overflow: 'hidden', maxHeight: 200, overflowY: 'auto',
    marginTop: 4, marginBottom: 8,
  },
  podpowiedzUzyj: {
    color: t.accent, fontWeight: 600,
  },
  podpowiedzItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '10px 14px', cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 14,
    borderBottom: `0.5px solid ${t.border}`,
  },
  podpowiedzNazwa: { color: t.text },
  podpowiedzJedn: { color: t.mute, fontSize: 12, fontVariantNumeric: 'tabular-nums' },

  btnDodajSkl: {
    width: '100%', padding: '12px', marginTop: 4,
    background: t.accentSoft, color: t.accentDark,
    border: 'none', borderRadius: 12,
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },

  // Składniki list
  skladnikiHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  badge: {
    fontFamily: fonts.sans, fontSize: 10.5, fontWeight: 700, color: t.mute,
    padding: '2px 8px', borderRadius: 999, background: t.surfaceAlt, letterSpacing: 0.6,
  },
  skladnikiLista: { ...ui.card, padding: 0, overflow: 'hidden' },
  skladnikItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '11px 16px', borderBottom: `0.5px solid ${t.border}`,
  },
  skNr: {
    fontFamily: fonts.serif, fontSize: 16, color: t.accent,
    fontStyle: 'italic', fontVariantNumeric: 'tabular-nums', minWidth: 24,
  },
  skInfo: { flex: 1, minWidth: 0 },
  skNazwa: { fontFamily: fonts.sans, fontSize: 14, color: t.text, fontWeight: 500 },
  skMeta: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 2 },
  btnUsun: {
    background: 'none', border: 'none',
    color: t.muteLight, fontSize: 14, cursor: 'pointer', padding: '4px 8px',
  },

  btnMini: {
    background: t.surfaceAlt, border: 'none', borderRadius: 6,
    padding: '3px 7px', fontSize: 11, cursor: 'pointer',
    color: t.text, fontFamily: fonts.sans, lineHeight: 1,
  },

  zdjecieWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden' },
  zdjecieImg: { width: '100%', aspectRatio: '5/3', objectFit: 'cover', display: 'block' },
  btnUsunZdj: {
    position: 'absolute', top: 8, right: 8,
    background: 'rgba(0,0,0,.5)', color: '#fff',
    border: 'none', borderRadius: 20, padding: '6px 12px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
  },
  btnDodajZdj: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', padding: '20px',
    background: t.surfaceAlt, color: t.mute,
    border: `1.5px dashed ${t.border}`, borderRadius: 14,
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer',
    boxSizing: 'border-box',
  },

  blad: {
    background: '#FBEAE4', color: '#9B3B23',
    fontFamily: fonts.sans, fontSize: 13.5, fontWeight: 500,
    padding: '10px 14px', borderRadius: 12, marginBottom: 14,
  },

  bottomRow: { display: 'flex', gap: 8, marginTop: 8 },
}
}
