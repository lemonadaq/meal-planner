import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg } from '../theme'
import { formatDataLocal as formatData } from '../dataHelpers'

function getPowitanie() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11)  return 'Dzień dobry'
  if (h >= 11 && h < 17) return 'Cześć'
  if (h >= 17 && h < 22) return 'Dobry wieczór'
  return 'Dobranoc'
}

// formatData z dataHelpers
function dataPlus(d, dni) {
  const n = new Date(d); n.setDate(n.getDate() + dni); return n
}

const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']
const SUGESTIA_TYPY = [
  { id: 'sniadanie', label: 'Śniadanie' },
  { id: 'obiad', label: 'Obiad' },
  { id: 'kolacja', label: 'Kolacja' },
]

const RODZAJ_LABEL = {
  sniadanie: 'śniadanie',
  obiad: 'obiad',
  kolacja: 'kolację',
}

const POSILEK_DLA_RODZAJU = {
  sniadanie: 'Śniadanie',
  obiad: 'Obiad',
  kolacja: 'Kolacja',
}

// Mały odcisk koloru dla dania — stabilny po nazwie (jak w DanieDetail)
function getKolor(nazwa) {
  const kolory = ['#F4E2D8','#E7E9D5','#EFE0DA','#E4E2D4','#F0DDC9','#E0E3D6','#F4D9CC','#DCE5D2']
  let hash = 0
  for (let i = 0; i < (nazwa || '').length; i++) hash = nazwa.charCodeAt(i) + ((hash << 5) - hash)
  return kolory[Math.abs(hash) % kolory.length]
}
function getEmoji(nazwa) {
  const n = (nazwa || '').toLowerCase()
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

export default function Home({ user, householdId, onTabChange, onUstawienia, onSelectDanie, refreshKey }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'
  const [powitanie] = useState(getPowitanie)

  const [planDni, setPlanDni] = useState({ dzis: [], jutro: [] })
  const [sugestia, setSugestia] = useState(null) // { Danie, zdjecie, rodzaj, ostatnio }
  const [sugestieMozliwe, setSugestieMozliwe] = useState([]) // pula do losowania
  const [typSugestii, setTypSugestii] = useState('obiad')
  const [loading, setLoading] = useState(true)
  const [planowanie, setPlanowanie] = useState(null)
  const [toast, setToast] = useState(null)

  const dzis = useMemo(() => new Date(), [])
  const dzisStr = formatData(dzis)
  const jutroStr = formatData(dataPlus(dzis, 1))

  const dzisiejszaData = dzis.toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const jutrzejszaData = dataPlus(dzis, 1).toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // ── Pobieranie ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return
    let anulowane = false

    async function pobierz() {
      // Plan dziś + jutro (jeden request)
      const { data: plany } = await supabase
        .from('kalendarz')
        .select('*')
        .eq('household_id', householdId)
        .in('data', [dzisStr, jutroStr])

      if (anulowane) return

      // Dociągam miniatury dla zaplanowanych dań, żeby Home był spójny z ekranem Przepisy.
      const nazwyDan = [...new Set((plany || []).map(p => p.danie).filter(Boolean))]
      const metaMap = {}
      if (nazwyDan.length > 0) {
        const { data: metaDania } = await supabase
          .from('dania')
          .select('"Danie", zdjecie')
          .in('"Danie"', nazwyDan)

        ;(metaDania || []).forEach(d => {
          if (d.Danie && !metaMap[d.Danie]) metaMap[d.Danie] = d
        })
      }

      if (anulowane) return

      const wzbogac = p => ({ ...p, _meta: metaMap[p.danie] || null })
      const dzisData = (plany || []).filter(p => p.data === dzisStr).map(wzbogac)
      const jutroData = (plany || []).filter(p => p.data === jutroStr).map(wzbogac)
      setPlanDni({ dzis: dzisData, jutro: jutroData })

      // Sugestia "Może ugotujesz" — pobierz w tle (równolegle)
      pobierzSugestie()
    }

    async function pobierzSugestie() {
      // 1) Wszystkie unikalne dania z bazy
      const { data: daniaRaw } = await supabase
        .from('dania')
        .select('"Danie", zdjecie, "TYP", rodzaj')

      if (anulowane || !daniaRaw) return

      const unikalne = [...new Map(
        daniaRaw
          .filter(d => d.Danie && ['sniadanie', 'obiad', 'kolacja'].includes(d.rodzaj))
          .map(d => [d.Danie, d])
      ).values()]

      // 2) Historia kalendarza usera za ostatnie 90 dni — żeby wiedzieć co dawno
      const dawno = new Date()
      dawno.setDate(dawno.getDate() - 90)
      const { data: historia } = await supabase
        .from('kalendarz')
        .select('danie, data')
        .eq('household_id', householdId)
        .gte('data', formatData(dawno))
        .not('danie', 'is', null)

      if (anulowane) return

      // 3) Mapa: danie -> ostatnia data w kalendarzu
      const ostatnio = {}
      ;(historia || []).forEach(h => {
        if (!h.danie) return
        if (!ostatnio[h.danie] || h.data > ostatnio[h.danie]) {
          ostatnio[h.danie] = h.data
        }
      })

      // 4) Pula: dania nigdy nie używane LUB użyte > 14 dni temu
      const dwaTygodnie = formatData(dataPlus(dzis, -14))
      const pula = unikalne
        .map(d => ({
          ...d,
          ostatnio: ostatnio[d.Danie] || null,
        }))
        .filter(d => !d.ostatnio || d.ostatnio < dwaTygodnie)

      setSugestieMozliwe(pula)
      setLoading(false)
    }

    pobierz()
    return () => { anulowane = true }
  }, [householdId, dzisStr, jutroStr, refreshKey])

  useEffect(() => {
    const pula = sugestieMozliwe.filter(d => d.rodzaj === typSugestii)
    if (pula.length === 0) {
      setSugestia(null)
      return
    }
    setSugestia(prev => {
      if (prev?.rodzaj === typSugestii && pula.some(d => d.Danie === prev.Danie)) return prev
      return pula[Math.floor(Math.random() * pula.length)]
    })
  }, [sugestieMozliwe, typSugestii])

  function losujInne() {
    const pula = sugestieMozliwe.filter(d => d.rodzaj === typSugestii)
    if (pula.length < 2) return
    let nowa
    do {
      nowa = pula[Math.floor(Math.random() * pula.length)]
    } while (nowa.Danie === sugestia?.Danie && pula.length > 1)
    setSugestia(nowa)
  }

  async function zaplanujSugestie(dataStr, kiedyLabel) {
    if (!sugestia || !householdId || !user?.id) return

    const posilek = POSILEK_DLA_RODZAJU[typSugestii] || 'Obiad'
    const bucket = dataStr === dzisStr ? 'dzis' : 'jutro'
    const istniejacy = planDni[bucket]?.find(p => p.posilek === posilek)

    setPlanowanie(`${dataStr}_${posilek}`)

    try {
      let zapisany

      if (istniejacy?.id) {
        const { data, error } = await supabase
          .from('kalendarz')
          .update({ danie: sugestia.Danie, dodatki: [], podmiany: {} })
          .eq('id', istniejacy.id)
          .select()
          .single()

        if (error) throw error
        zapisany = data
      } else {
        const { data, error } = await supabase
          .from('kalendarz')
          .insert({
            household_id: householdId,
            user_id: user.id,
            data: dataStr,
            posilek,
            danie: sugestia.Danie,
            dodatki: [],
          })
          .select()
          .single()

        if (error) throw error
        zapisany = data
      }

      const wzbogacony = { ...zapisany, _meta: { zdjecie: sugestia.zdjecie } }

      setPlanDni(prev => {
        const aktualne = prev[bucket] || []
        const bezSlota = aktualne.filter(p => p.posilek !== posilek)
        return {
          ...prev,
          [bucket]: [...bezSlota, wzbogacony],
        }
      })

      setToast(`Zaplanowano na ${kiedyLabel}: ${sugestia.Danie}`)
      setTimeout(() => setToast(null), 2400)
    } catch (error) {
      console.error('Błąd planowania sugestii z Home:', error)
      setToast('Nie udało się zaplanować')
      setTimeout(() => setToast(null), 2400)
    } finally {
      setPlanowanie(null)
    }
  }

  function opisOstatnio(iso) {
    if (!iso) return 'Jeszcze tego nie gotowałeś'
    const d = new Date(iso)
    const dni = Math.round((dzis - d) / (1000 * 60 * 60 * 24))
    if (dni < 30) return `Ostatnio ${dni} dni temu`
    if (dni < 60) return 'Ostatnio ponad miesiąc temu'
    return 'Ostatnio dawno temu'
  }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.eyebrow}>{dzisiejszaData}</div>
          <h1 style={s.powitanie}>
            {powitanie}, <em style={s.italic}>{imie}</em>
            <span style={{ color: t.warm }}>.</span>
          </h1>
        </div>
        <button
          style={s.avatar}
          title="Ustawienia"
          onClick={onUstawienia}
          aria-label="Ustawienia"
        >
          {imie[0]?.toUpperCase()}
        </button>
      </header>

      <DzienSekcja
        tytul="Dzisiaj"
        plan={planDni.dzis}
        onSlotClick={() => onTabChange('planer')}
        onDanieClick={onSelectDanie}
      />

      <DzienSekcja
        tytul="Jutro"
        plan={planDni.jutro}
        onSlotClick={() => onTabChange('planer')}
        onDanieClick={onSelectDanie}
        wyrozniony={false}
      />

      {/* Może ugotujesz? */}
      {sugestia && (
        <section style={s.sugestiaSekcja}>
          <div style={s.sugestiaHeader}>
            <h2 style={s.h2}>Może ugotujesz na {RODZAJ_LABEL[typSugestii]}?</h2>
            <button
              style={s.link}
              onClick={losujInne}
              disabled={sugestieMozliwe.filter(d => d.rodzaj === typSugestii).length < 2}
              title="Pokaż inne"
            >
              🔄 Inne
            </button>
          </div>

          <div style={s.sugestiaTypy}>
            {SUGESTIA_TYPY.map(typ => (
              <button
                key={typ.id}
                style={{ ...s.sugestiaTypBtn, ...(typSugestii === typ.id ? s.sugestiaTypBtnAktywny : {}) }}
                onClick={() => setTypSugestii(typ.id)}
              >
                {typ.label}
              </button>
            ))}
          </div>

          <button
            style={s.sugestiaCard}
            onClick={() => onSelectDanie(sugestia.Danie)}
          >
            <div
              style={{
                ...s.sugestiaThumb,
                background: sugestia.zdjecie ? 'transparent' : getKolor(sugestia.Danie),
              }}
            >
              {sugestia.zdjecie
                ? <img src={sugestia.zdjecie} alt={sugestia.Danie} style={s.sugestiaImg} />
                : <span style={s.sugestiaEmoji}>{getEmoji(sugestia.Danie)}</span>}
            </div>
            <div style={s.sugestiaInfo}>
              <div style={s.sugestiaNazwa}>{sugestia.Danie}</div>
              <div style={s.sugestiaSub}>{opisOstatnio(sugestia.ostatnio)}</div>
            </div>
            <div style={s.sugestiaArrow}>›</div>
          </button>

          <div style={s.sugestiaAkcje}>
            <button
              style={s.sugestiaPlanBtn}
              onClick={() => zaplanujSugestie(dzisStr, 'dziś')}
              disabled={!!planowanie}
            >
              {planowanie === `${dzisStr}_${POSILEK_DLA_RODZAJU[typSugestii]}` ? 'Planuję…' : 'Zaplanuj na dziś'}
            </button>
            <button
              style={s.sugestiaPlanBtnAlt}
              onClick={() => zaplanujSugestie(jutroStr, 'jutro')}
              disabled={!!planowanie}
            >
              {planowanie === `${jutroStr}_${POSILEK_DLA_RODZAJU[typSugestii]}` ? 'Planuję…' : 'Zaplanuj na jutro'}
            </button>
          </div>
        </section>
      )}

      {/* Bardzo lekki stan początkowy zanim sugestia się załaduje */}
      {!sugestia && loading && (
        <div style={s.sugestiaSekcja}>
          <h2 style={s.h2}>Może ugotujesz?</h2>
          <div style={s.sugestiaSkeleton} />
        </div>
      )}

      {toast && (
        <div style={s.toast}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Sekcja z planem dnia ──
function DzienSekcja({ tytul, plan, onSlotClick, onDanieClick, wyrozniony = true }) {
  return (
    <section style={s.dzienSekcja}>
      <h2 style={s.h2}>{tytul}</h2>
      <div style={s.posilkiLista}>
        {POSILKI.map(posilek => {
          const wpis = plan.find(d => d.posilek === posilek)
          const masDanie = !!wpis?.danie

          if (!masDanie) {
            return (
              <button
                key={posilek}
                style={s.posilekPusty}
                onClick={onSlotClick}
              >
                <div style={s.posilekPustyLabel}>{posilek}</div>
                <div style={s.posilekPustyPlus}>
                  <span style={s.posilekPustyTxt}>Zaplanuj</span>
                  <span style={s.posilekPustyIcon}>+</span>
                </div>
              </button>
            )
          }

          const zdjecie = wpis._meta?.zdjecie || wpis.zdjecie

          return (
            <button
              key={posilek}
              style={s.posilekItem}
              onClick={() => onDanieClick?.(wpis.danie)}
            >
              <MiniaturaDania nazwa={wpis.danie} zdjecie={zdjecie} />
              <div style={s.posilekInfo}>
                <div style={s.posilekNazwa}>{posilek}</div>
                <div style={s.posilekDanie}>{wpis.danie}</div>
                {Array.isArray(wpis.dodatki) && wpis.dodatki.filter(d => d?.nazwa).length > 0 && (
                  <div style={s.posilekExtra}>
                    z {wpis.dodatki.filter(d => d?.nazwa).map(d => d.nazwa).join(' · ')}
                  </div>
                )}
              </div>
              <div style={s.posilekArrow}>›</div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function MiniaturaDania({ nazwa, zdjecie }) {
  return (
    <div
      style={{
        ...s.posilekThumb,
        background: zdjecie ? 'transparent' : getKolor(nazwa),
      }}
    >
      {zdjecie
        ? <img src={zdjecie} alt="" style={s.posilekImg} />
        : <span style={s.posilekEmoji}>{getEmoji(nazwa)}</span>}
    </div>
  )
}

const s = {
  container: {
    padding: '20px 20px 24px',
    fontFamily: fonts.sans, color: t.text,
    background: t.bg, minHeight: '100vh',
    maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 24, gap: 12,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  eyebrow: {
    ...ui.eyebrow, marginBottom: 4, textTransform: 'capitalize',
    fontSize: 11, letterSpacing: 1.2,
  },
  powitanie: { ...ui.h1, fontSize: 30, lineHeight: 1.05, fontWeight: 400 },
  italic: { fontStyle: 'italic', color: t.accent, fontFamily: fonts.serif },
  avatar: {
    width: 44, height: 44, borderRadius: '50%',
    background: avatarBg('avatar:home'),
    color: '#fff', border: 'none',
    display: 'grid', placeItems: 'center',
    fontFamily: fonts.serif, fontSize: 18, fontWeight: 500,
    flexShrink: 0, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(74,55,40,.12)',
  },

  dzienSekcja: { marginBottom: 22 },
  h2: { ...ui.h2, marginBottom: 10 },
  link: {
    ...ui.btnText, color: t.accent, padding: 0,
    fontSize: 12.5, fontWeight: 600,
  },

  posilkiLista: { display: 'flex', flexDirection: 'column', gap: 8 },
  posilekItem: {
    ...ui.card, padding: '10px 12px',
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
    fontFamily: fonts.sans, boxSizing: 'border-box',
  },
  posilekThumb: {
    width: 52, height: 52, borderRadius: 13,
    display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0,
  },
  posilekImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  posilekEmoji: { fontSize: 26 },
  posilekInfo: { flex: 1, minWidth: 0 },
  posilekNazwa: { ...ui.slotLabel, marginBottom: 3 },
  posilekDanie: {
    fontFamily: fonts.serif, fontSize: 17, color: t.text,
    letterSpacing: -0.1, lineHeight: 1.15,
  },
  posilekExtra: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 3 },
  posilekArrow: { fontSize: 20, color: t.muteLight, fontFamily: fonts.serif, flexShrink: 0 },

  // Pusty slot — wizualnie wyraźnie inny od wypełnionego (dashed border, jaśniejszy)
  posilekPusty: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: `1px dashed ${t.borderStrong}`,
    borderRadius: 14,
    cursor: 'pointer', fontFamily: fonts.sans,
    transition: 'background .15s, border-color .15s',
  },
  posilekPustyLabel: {
    ...ui.slotLabel, color: t.muteLight,
  },
  posilekPustyPlus: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: t.mute,
  },
  posilekPustyTxt: {
    fontFamily: fonts.sans, fontSize: 12.5, fontWeight: 500,
  },
  posilekPustyIcon: {
    display: 'grid', placeItems: 'center',
    width: 22, height: 22, borderRadius: '50%',
    background: t.surfaceAlt,
    fontFamily: fonts.serif, fontSize: 17, lineHeight: 1,
    color: t.accent,
  },

  // Sugestia
  sugestiaSekcja: { marginTop: 8, marginBottom: 8 },
  sugestiaHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 10,
  },
  sugestiaTypy: {
    display: 'flex', gap: 6, marginBottom: 10,
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  },
  sugestiaTypBtn: {
    border: `1px solid ${t.border}`, background: t.surface,
    color: t.mute, borderRadius: 999, padding: '7px 10px',
    fontFamily: fonts.sans, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  sugestiaTypBtnAktywny: {
    background: t.accent, borderColor: t.accent, color: '#fff',
  },
  sugestiaCard: {
    ...ui.card, padding: 12,
    display: 'flex', alignItems: 'center', gap: 14,
    cursor: 'pointer', textAlign: 'left',
    fontFamily: fonts.sans, width: '100%',
  },
  sugestiaThumb: {
    width: 64, height: 64, borderRadius: 14,
    display: 'grid', placeItems: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  sugestiaImg: {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  },
  sugestiaEmoji: { fontSize: 32 },
  sugestiaInfo: { flex: 1, minWidth: 0 },
  sugestiaNazwa: {
    fontFamily: fonts.serif, fontSize: 17, color: t.text,
    letterSpacing: -0.1, lineHeight: 1.2,
  },
  sugestiaSub: {
    fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 3,
  },
  sugestiaArrow: { fontSize: 22, color: t.muteLight, fontFamily: fonts.serif },
  sugestiaAkcje: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8,
  },
  sugestiaPlanBtn: {
    background: t.accent, color: '#fff', border: 'none', borderRadius: 13,
    padding: '11px 10px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 3px 10px rgba(74,55,40,.12)',
  },
  sugestiaPlanBtnAlt: {
    background: t.surface, color: t.accent, border: `1px solid ${t.border}`, borderRadius: 13,
    padding: '11px 10px', fontFamily: fonts.sans, fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },

  toast: {
    position: 'fixed', bottom: 92, left: '50%', transform: 'translateX(-50%)',
    background: t.text, color: '#fff', borderRadius: 12, padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(0,0,0,.2)', zIndex: 200,
    fontFamily: fonts.sans, fontSize: 13, maxWidth: 'calc(100vw - 32px)',
  },

  sugestiaSkeleton: {
    height: 88, borderRadius: 16,
    background: t.surfaceAlt, opacity: 0.6,
  },
}