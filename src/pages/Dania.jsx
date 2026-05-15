import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui } from '../theme'

// Filtry-chipy: 'wszystko' i 'ulubione' to specjalne, reszta to wartości pola `rodzaj`
const FILTRY = [
  { id: 'wszystko',  label: 'Wszystko' },
  { id: 'ulubione',  label: '★ Ulubione' },
  { id: 'obiad',     label: 'Obiady' },
  { id: 'sniadanie', label: 'Śniadania' },
  { id: 'kolacja',   label: 'Kolacje' },
  { id: 'przekaska', label: 'Przekąski' },
  { id: 'dodatek',   label: 'Dodatki' },
  { id: 'surowka',   label: 'Surówki' },
]

const RODZAJ_LABEL = {
  obiad: 'Obiad', sniadanie: 'Śniadanie', kolacja: 'Kolacja',
  przekaska: 'Przekąska', dodatek: 'Dodatek', surowka: 'Surówka',
}

// Pastel placeholder color from name hash — identyczne jak wcześniej, żeby
// stare karty zachowały te same kolory.
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
  if (n.includes('ryb') || n.includes('dorsz') || n.includes('pstrąg') || n.includes('łosoś')) return '🐟'
  if (n.includes('pizza')) return '🍕'
  if (n.includes('makaron') || n.includes('spaghetti') || n.includes('tagliatelle')) return '🍝'
  if (n.includes('zupa') || n.includes('gulasz') || n.includes('krem')) return '🍲'
  if (n.includes('sałat') || n.includes('leczo')) return '🥗'
  if (n.includes('pierogi') || n.includes('pyzy') || n.includes('kopytka')) return '🥟'
  if (n.includes('wieprzow') || n.includes('schab') || n.includes('żeberka')) return '🍖'
  if (n.includes('jajk') || n.includes('omlet')) return '🍳'
  if (n.includes('ziem') || n.includes('placki')) return '🥔'
  if (n.includes('tortilla') || n.includes('burrito') || n.includes('quesadilla')) return '🌯'
  if (n.includes('kebab') || n.includes('gyros')) return '🥙'
  if (n.includes('buracz') || n.includes('marchew')) return '🥕'
  if (n.includes('ryż') || n.includes('kasza') || n.includes('kuskus')) return '🍚'
  if (n.includes('chleb') || n.includes('bułk') || n.includes('bagietk') || n.includes('tost')) return '🍞'
  if (n.includes('owsian') || n.includes('musli') || n.includes('granol')) return '🥣'
  if (n.includes('jogurt') || n.includes('smoothie') || n.includes('koktajl')) return '🥤'
  if (n.includes('owoc') || n.includes('banan') || n.includes('jabłk')) return '🍎'
  return '🍽️'
}

export default function Dania({ onSelect, user, onDodaj, onBack }) {
  const [wszystkie, setWszystkie] = useState([])
  const [loading, setLoading] = useState(true)
  const [szukaj, setSzukaj] = useState('')
  const [filtr, setFiltr] = useState('wszystko')
  const [widok, setWidok] = useState('siatka')

  // Menu kontekstowe (bottom sheet)
  const [menuDla, setMenuDla] = useState(null) // obiekt dania lub null

  // Potwierdzenie usunięcia (modal)
  const [potwierdz, setPotwierdz] = useState(null)
  // { danie: '...', rodzaj: '...', wpisyKalendarza: [...] }

  // Toast z undo
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function pokazToast(msg, onUndo) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, onUndo })
    toastTimer.current = setTimeout(() => setToast(null), 5500)
  }
  function zamknijToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(null)
  }

  useEffect(() => {
    pobierzDane()
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function pobierzDane() {
    setLoading(true)
    const { data } = await supabase
      .from('dania')
      .select('"Danie", "TYP", rodzaj, czas_minuty, porcje_bazowe, ulubione, zdjecie')
      .order('"Danie"')
    // Dedup po nazwie — jeden reprezentant per wpis
    const unikalne = [...new Map((data || []).map(d => [d['Danie'], d])).values()]
      .filter(d => d['Danie'])
    setWszystkie(unikalne)
    setLoading(false)
  }

  async function wyloguj() { await supabase.auth.signOut() }

  // ── Filtrowanie ───────────────────────────
  const filtrowane = wszystkie.filter(d => {
    if (filtr === 'ulubione' && !d.ulubione) return false
    if (filtr !== 'wszystko' && filtr !== 'ulubione' && d.rodzaj !== filtr) return false
    if (szukaj && !d['Danie'].toLowerCase().includes(szukaj.toLowerCase())) return false
    return true
  })

  // ── Akcje ─────────────────────────────────

  async function toggleUlubione(danie) {
    const obecne = wszystkie.find(d => d['Danie'] === danie)
    const nowa = !obecne?.ulubione
    // Aktualizuje wszystkie wiersze tego dania
    await supabase.from('dania').update({ ulubione: nowa }).eq('"Danie"', danie)
    setWszystkie(prev => prev.map(d => d['Danie'] === danie ? { ...d, ulubione: nowa } : d))
  }

  async function rozpocznijUsuwanie(danie, rodzaj) {
    setMenuDla(null)

    // Sprawdź czy wystepuje w kalendarzu — 3 osobne query (bezpieczniej niż or z escape'm)
    const [{ data: jakoD }, { data: jakoDo }, { data: jakoS }] = await Promise.all([
      supabase.from('kalendarz').select('id, data, posilek, danie, dodatek, surowka').eq('user_id', user.id).eq('danie', danie),
      supabase.from('kalendarz').select('id, data, posilek, danie, dodatek, surowka').eq('user_id', user.id).eq('dodatek', danie),
      supabase.from('kalendarz').select('id, data, posilek, danie, dodatek, surowka').eq('user_id', user.id).eq('surowka', danie),
    ])
    const wszystkieWpisy = [...(jakoD || []), ...(jakoDo || []), ...(jakoS || [])]
    const unikalneWpisy = [...new Map(wszystkieWpisy.map(w => [w.id, w])).values()]

    setPotwierdz({ danie, rodzaj, wpisyKalendarza: unikalneWpisy })
  }

  async function potwierdzUsuniecie(usunZKal) {
    if (!potwierdz) return
    const { danie, wpisyKalendarza } = potwierdz
    setPotwierdz(null)

    // Pobierz kopię wszystkich wierszy do undo
    const { data: kopiaWierszy } = await supabase.from('dania').select('*').eq('"Danie"', danie)
    const kopiaWierszyArr = (kopiaWierszy || []).map(({ id, ...reszta }) => reszta) // bez id, żeby insert ponownie nadał

    // Kopia wpisów kalendarza do undo
    const kopiaKalendarza = usunZKal ? wpisyKalendarza.map(w => ({ ...w })) : []

    // Usuń z `dania`
    await supabase.from('dania').delete().eq('"Danie"', danie)

    // Wyczyść z kalendarza (jeśli wybrano)
    if (usunZKal && wpisyKalendarza.length > 0) {
      const ops = wpisyKalendarza.map(w => {
        const update = {}
        if (w.danie === danie)   update.danie = null
        if (w.dodatek === danie) update.dodatek = null
        if (w.surowka === danie) update.surowka = null
        return supabase.from('kalendarz').update(update).eq('id', w.id)
      })
      await Promise.all(ops)
    }

    setWszystkie(prev => prev.filter(d => d['Danie'] !== danie))

    pokazToast(`Usunięto „${danie}"`, async () => {
      // Cofnij: insert wierszy + przywróć kalendarz
      if (kopiaWierszyArr.length > 0) {
        await supabase.from('dania').insert(kopiaWierszyArr)
      }
      if (kopiaKalendarza.length > 0) {
        const ops = kopiaKalendarza.map(w =>
          supabase.from('kalendarz').update({
            danie: w.danie, dodatek: w.dodatek, surowka: w.surowka,
          }).eq('id', w.id)
        )
        await Promise.all(ops)
      }
      await pobierzDane()
      zamknijToast()
    })
  }

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

  const filtrCfg = FILTRY.find(f => f.id === filtr)
  const showFeatured = widok === 'siatka' && filtr === 'wszystko' && filtrowane.length > 0
  const [featured, ...reszta] = filtrowane
  const tabela = showFeatured ? reszta : filtrowane

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
            <button style={s.btnAdd} onClick={onDodaj} title="Dodaj nowy wpis">
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
            placeholder="Szukaj po nazwie…"
            value={szukaj}
            onChange={e => setSzukaj(e.target.value)}
          />
        </div>

        {/* Chipy filtrów — horizontal scroll */}
        <div style={s.chipsRow}>
          <div style={s.chipsScroll}>
            {FILTRY.map(f => {
              const on = filtr === f.id
              return (
                <button key={f.id}
                  style={{ ...s.chip, ...(on ? s.chipOn : {}) }}
                  onClick={() => setFiltr(f.id)}>
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Liczba wyników + toggle widoku */}
        <div style={s.metaRow}>
          <span style={s.licznik}>
            {filtrowane.length} {filtrowane.length === 1 ? 'wpis' : (filtrowane.length < 5 ? 'wpisy' : 'wpisów')}
          </span>
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
        {filtrowane.length === 0 ? (
          <div style={s.empty}>
            {szukaj
              ? `Brak wyników dla „${szukaj}"`
              : filtr === 'ulubione'
                ? 'Brak ulubionych. Dodaj gwiazdkę w menu karty.'
                : `Brak wpisów w kategorii „${filtrCfg.label}"`}
          </div>
        ) : widok === 'siatka' ? (
          <>
            {showFeatured && featured && (
              <article style={s.featured}>
                <div style={s.featuredImg} onClick={() => onSelect(featured['Danie'])}>
                  {renderImg(featured)}
                </div>
                <div style={s.featuredOverlay} onClick={() => onSelect(featured['Danie'])}>
                  <div style={s.featuredEyebrow}>
                    {RODZAJ_LABEL[featured.rodzaj] || 'WPIS'} · POLECANE
                  </div>
                  <h2 style={s.featuredTitle}>{featured['Danie']}</h2>
                  {featured.czas_minuty > 0 && (
                    <div style={s.featuredMeta}>⏱ {featured.czas_minuty} min</div>
                  )}
                </div>
                <button
                  style={s.featuredStar}
                  onClick={e => { e.stopPropagation(); toggleUlubione(featured['Danie']) }}
                  aria-label={featured.ulubione ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
                  <StarIcon filled={featured.ulubione} darkBg />
                </button>
                <button style={s.featuredMenu} onClick={e => { e.stopPropagation(); setMenuDla(featured) }} aria-label="Menu">
                  <DotsIcon />
                </button>
              </article>
            )}

            <div style={s.grid}>
              {tabela.map(d => (
                <article key={d['Danie']} style={s.card}>
                  <div style={s.cardImgWrap} onClick={() => onSelect(d['Danie'])}>
                    {renderImg(d)}
                    <button
                      style={s.cardStar}
                      onClick={e => { e.stopPropagation(); toggleUlubione(d['Danie']) }}
                      aria-label={d.ulubione ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
                      <StarIcon filled={d.ulubione} small />
                    </button>
                    <button style={s.cardMenu} onClick={e => { e.stopPropagation(); setMenuDla(d) }} aria-label="Menu">
                      <DotsIcon />
                    </button>
                  </div>
                  <div style={s.cardBody} onClick={() => onSelect(d['Danie'])}>
                    <h3 style={s.cardTitle}>{d['Danie']}</h3>
                    <div style={s.cardMeta}>
                      {filtr === 'wszystko' || filtr === 'ulubione' ? (
                        <span style={s.cardBadge}>{RODZAJ_LABEL[d.rodzaj]}</span>
                      ) : null}
                      {d.czas_minuty > 0 && (
                        <span style={s.cardCzas}>⏱ {d.czas_minuty} min</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          // List view
          <div style={s.listView}>
            {filtrowane.map(d => (
              <div key={d['Danie']} style={s.listItem}>
                <div style={s.listClick} onClick={() => onSelect(d['Danie'])}>
                  <div style={s.listImg}>
                    {renderImg(d)}
                    <button
                      style={s.listStar}
                      onClick={e => { e.stopPropagation(); toggleUlubione(d['Danie']) }}
                      aria-label={d.ulubione ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
                      <StarIcon filled={d.ulubione} small />
                    </button>
                  </div>
                  <div style={s.listInfo}>
                    <div style={s.listName}>{d['Danie']}</div>
                    <div style={s.listMeta}>
                      <span style={s.cardBadge}>{RODZAJ_LABEL[d.rodzaj]}</span>
                      {d.czas_minuty > 0 && <span style={s.cardCzas}>⏱ {d.czas_minuty} min</span>}
                    </div>
                  </div>
                </div>
                <button style={s.listMenuBtn} onClick={() => setMenuDla(d)} aria-label="Menu">
                  <DotsIcon />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet menu */}
      {menuDla && (
        <div style={s.modalOverlay} onClick={() => setMenuDla(null)}>
          <div style={s.bottomSheet} onClick={e => e.stopPropagation()}>
            <div style={s.sheetHeader}>
              <div>
                <div style={s.sheetEyebrow}>{RODZAJ_LABEL[menuDla.rodzaj] || 'Wpis'}</div>
                <div style={s.sheetTitle}>{menuDla['Danie']}</div>
              </div>
              <button style={s.sheetClose} onClick={() => setMenuDla(null)} aria-label="Zamknij">✕</button>
            </div>

            <button style={s.sheetBtn} onClick={() => { toggleUlubione(menuDla['Danie']); setMenuDla(null) }}>
              <StarIcon filled={menuDla.ulubione} />
              <span>{menuDla.ulubione ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}</span>
            </button>

            <button style={s.sheetBtn} onClick={() => { onSelect(menuDla['Danie']); setMenuDla(null) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>
              <span>Otwórz i edytuj</span>
            </button>

            <button style={{ ...s.sheetBtn, ...s.sheetBtnDanger }} onClick={() => rozpocznijUsuwanie(menuDla['Danie'], menuDla.rodzaj)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              <span>Usuń</span>
            </button>
          </div>
        </div>
      )}

      {/* Potwierdzenie usunięcia */}
      {potwierdz && (
        <div style={s.modalOverlay} onClick={() => setPotwierdz(null)}>
          <div style={s.confirmModal} onClick={e => e.stopPropagation()}>
            <h3 style={s.confirmTitle}>Usuń „{potwierdz.danie}"?</h3>
            {potwierdz.wpisyKalendarza.length > 0 ? (
              <p style={s.confirmBody}>
                Ten wpis pojawia się w Twoim kalendarzu ({potwierdz.wpisyKalendarza.length} {potwierdz.wpisyKalendarza.length === 1 ? 'raz' : 'razy'}). Co zrobić z planem?
              </p>
            ) : (
              <p style={s.confirmBody}>
                Usuniecie zostanie potwierdzone — możesz cofnąć tę akcję w ciągu kilku sekund.
              </p>
            )}
            <div style={s.confirmActions}>
              <button style={ui.btnGhost} onClick={() => setPotwierdz(null)}>Anuluj</button>
              {potwierdz.wpisyKalendarza.length > 0 ? (
                <>
                  <button
                    style={{ ...s.btnDanger, padding: '12px 14px', fontSize: 13 }}
                    onClick={() => potwierdzUsuniecie(false)}>
                    Tylko z bazy
                  </button>
                  <button
                    style={{ ...s.btnDanger, padding: '12px 14px', fontSize: 13 }}
                    onClick={() => potwierdzUsuniecie(true)}>
                    Usuń też z planu
                  </button>
                </>
              ) : (
                <button style={s.btnDanger} onClick={() => potwierdzUsuniecie(false)}>
                  Usuń
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast z undo */}
      {toast && (
        <div style={s.toast}>
          <span style={s.toastMsg}>{toast.msg}</span>
          {toast.onUndo && (
            <button style={s.toastUndo} onClick={() => toast.onUndo()}>
              Cofnij
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Ikony ──
const StarIcon = ({ filled, small, darkBg }) => (
  <svg width={small ? 14 : 18} height={small ? 14 : 18} viewBox="0 0 24 24"
    fill={filled ? '#E8A547' : 'none'}
    stroke={filled ? '#E8A547' : (darkBg ? '#fff' : t.mute)}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2"/>
    <circle cx="12" cy="12" r="2"/>
    <circle cx="19" cy="12" r="2"/>
  </svg>
)

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

  searchWrap: { position: 'relative', marginBottom: 12 },
  searchIcon: { position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)' },
  search: { ...ui.input, paddingLeft: 40, height: 44 },

  // Chipy filtrów — horizontal scroll
  chipsRow: { marginBottom: 12, marginLeft: -20, marginRight: -20 },
  chipsScroll: {
    display: 'flex', gap: 6, overflowX: 'auto',
    padding: '4px 20px 8px',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
  },
  chip: {
    flexShrink: 0,
    padding: '8px 14px', borderRadius: 999,
    background: t.surface, border: `0.5px solid ${t.border}`,
    fontFamily: fonts.sans, fontSize: 13, color: t.text, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  chipOn: {
    background: t.accent, borderColor: t.accent, color: '#fff', fontWeight: 600,
    boxShadow: '0 2px 8px rgba(77,124,77,.25)',
  },

  metaRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  licznik: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute,
    letterSpacing: 0.3,
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
  featuredMeta: {
    marginTop: 8, fontFamily: fonts.sans, fontSize: 12,
    color: '#fff', opacity: 0.85,
  },
  featuredStar: {
    position: 'absolute', top: 12, left: 12,
    background: 'rgba(0,0,0,.4)', borderRadius: 999,
    padding: 6, backdropFilter: 'blur(8px)',
    border: 'none', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  featuredMenu: {
    position: 'absolute', top: 12, right: 12,
    background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(8px)',
    border: 'none', borderRadius: 999, width: 32, height: 32,
    color: '#fff', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  card: {
    ...ui.card, overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  cardImgWrap: { position: 'relative', cursor: 'pointer' },
  cardStar: {
    position: 'absolute', top: 8, left: 8,
    background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(4px)',
    borderRadius: 999, padding: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,.1)',
    border: 'none', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  cardMenu: {
    position: 'absolute', top: 8, right: 8,
    background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(4px)',
    border: 'none', borderRadius: 999, width: 28, height: 28,
    color: t.text, cursor: 'pointer',
    display: 'grid', placeItems: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,.1)',
  },
  cardBody: { padding: '10px 12px 12px', cursor: 'pointer' },
  cardTitle: {
    fontFamily: fonts.serif, fontSize: 15.5, lineHeight: 1.2,
    color: t.text, letterSpacing: -0.1, fontWeight: 400, margin: 0,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 8, flexWrap: 'wrap',
  },
  cardBadge: {
    fontFamily: fonts.sans, fontSize: 9.5, fontWeight: 600,
    letterSpacing: 0.8, textTransform: 'uppercase',
    color: t.accent, background: t.accentSoft,
    padding: '2px 7px', borderRadius: 999,
  },
  cardCzas: {
    fontFamily: fonts.sans, fontSize: 11, color: t.mute,
    fontVariantNumeric: 'tabular-nums',
  },

  // Image content
  img: { width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' },
  placeholder: { width: '100%', aspectRatio: '4/3', display: 'grid', placeItems: 'center' },
  placeholderEmoji: { fontSize: 42, filter: 'grayscale(.1)' },

  // List view
  listView: { display: 'flex', flexDirection: 'column', gap: 6 },
  listItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    ...ui.card, padding: 6,
  },
  listClick: {
    display: 'flex', alignItems: 'center', gap: 12,
    flex: 1, cursor: 'pointer', minWidth: 0,
  },
  listImg: {
    width: 56, height: 56, borderRadius: 12, overflow: 'hidden',
    flexShrink: 0, position: 'relative',
  },
  listStar: {
    position: 'absolute', top: 4, left: 4,
    background: 'rgba(255,255,255,.85)', borderRadius: 999, padding: 2,
    border: 'none', cursor: 'pointer',
    display: 'grid', placeItems: 'center',
  },
  listInfo: { flex: 1, minWidth: 0 },
  listName: {
    fontFamily: fonts.serif, fontSize: 16, color: t.text, letterSpacing: -0.1,
    lineHeight: 1.2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  listMeta: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 4, flexWrap: 'wrap',
  },
  listMenuBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: t.muteLight, padding: 8, display: 'grid', placeItems: 'center',
    flexShrink: 0,
  },

  empty: {
    ...ui.card, padding: '40px 20px', textAlign: 'center',
    color: t.mute, fontFamily: fonts.sans, fontSize: 14,
  },
  loading: {
    textAlign: 'center', padding: 80,
    fontFamily: fonts.sans, fontSize: 15, color: t.mute,
    background: t.bg, minHeight: '100vh',
  },

  // Bottom sheet (menu kontekstowe)
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(20,15,10,.4)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  bottomSheet: {
    background: t.surface,
    borderRadius: '22px 22px 0 0',
    padding: '20px 18px 28px', width: '100%', maxWidth: 540,
    boxShadow: '0 -12px 40px rgba(20,15,10,.2)',
    fontFamily: fonts.sans,
  },
  sheetHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16, paddingBottom: 14,
    borderBottom: `0.5px solid ${t.border}`,
  },
  sheetEyebrow: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase',
    color: t.mute, marginBottom: 3,
  },
  sheetTitle: {
    fontFamily: fonts.serif, fontSize: 19, color: t.text,
    letterSpacing: -0.2, lineHeight: 1.15,
  },
  sheetClose: {
    background: t.surfaceAlt, border: 'none', borderRadius: 999,
    width: 30, height: 30, fontSize: 13, color: t.mute, cursor: 'pointer',
    flexShrink: 0, marginLeft: 12,
  },
  sheetBtn: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 8px', background: 'none', border: 'none',
    borderRadius: 10, cursor: 'pointer',
    fontFamily: fonts.sans, fontSize: 15, color: t.text,
    textAlign: 'left',
  },
  sheetBtnDanger: { color: t.danger },

  // Confirm modal
  confirmModal: {
    background: t.surface, borderRadius: 18,
    padding: '24px 22px', width: 'calc(100% - 32px)', maxWidth: 420,
    margin: 'auto', boxShadow: '0 12px 40px rgba(20,15,10,.18)',
    fontFamily: fonts.sans, alignSelf: 'center',
  },
  confirmTitle: {
    fontFamily: fonts.serif, fontSize: 22, color: t.text,
    letterSpacing: -0.2, lineHeight: 1.15,
    margin: '0 0 10px',
  },
  confirmBody: {
    fontFamily: fonts.sans, fontSize: 14, color: t.textSoft,
    lineHeight: 1.5, margin: '0 0 20px',
  },
  confirmActions: {
    display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap',
  },
  btnDanger: {
    background: t.danger, color: '#fff',
    border: 'none', borderRadius: 12, padding: '14px 18px',
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 600,
    cursor: 'pointer',
  },

  // Toast
  toast: {
    position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff',
    padding: '12px 16px', borderRadius: 14,
    boxShadow: '0 12px 32px rgba(20,15,10,.25)',
    fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 14,
    zIndex: 2000, maxWidth: 'calc(100vw - 40px)',
  },
  toastMsg: { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  toastUndo: {
    background: 'none', border: 'none', color: '#FAD8B5',
    fontWeight: 700, fontSize: 13, letterSpacing: 0.5,
    textTransform: 'uppercase', cursor: 'pointer',
    flexShrink: 0,
  },
}
