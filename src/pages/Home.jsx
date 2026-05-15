import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg } from '../theme'

function getPowitanie() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11)  return 'Dzień dobry'
  if (h >= 11 && h < 17) return 'Cześć'
  if (h >= 17 && h < 22) return 'Dobry wieczór'
  return 'Dobranoc'
}

function formatData(d) { return d.toISOString().split('T')[0] }
function dataPlus(d, dni) {
  const n = new Date(d); n.setDate(n.getDate() + dni); return n
}

const POSILKI = ['Śniadanie', 'Obiad', 'Kolacja']

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

export default function Home({ user, onTabChange, onUstawienia, onSelectDanie, refreshKey }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'
  const [powitanie] = useState(getPowitanie)

  const [planDni, setPlanDni] = useState({ dzis: [], jutro: [] })
  const [sugestia, setSugestia] = useState(null) // { Danie, zdjecie, ostatnio }
  const [sugestieMozliwe, setSugestieMozliwe] = useState([]) // pula do losowania
  const [loading, setLoading] = useState(true)

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
    if (!user?.id) return
    let anulowane = false

    async function pobierz() {
      // Plan dziś + jutro (jeden request)
      const { data: plany } = await supabase
        .from('kalendarz')
        .select('*')
        .eq('user_id', user.id)
        .in('data', [dzisStr, jutroStr])

      if (anulowane) return

      const dzisData = (plany || []).filter(p => p.data === dzisStr)
      const jutroData = (plany || []).filter(p => p.data === jutroStr)
      setPlanDni({ dzis: dzisData, jutro: jutroData })

      // Sugestia "Może ugotujesz" — pobierz w tle (równolegle)
      pobierzSugestie()
    }

    async function pobierzSugestie() {
      // 1) Wszystkie unikalne dania z bazy
      const { data: daniaRaw } = await supabase
        .from('dania')
        .select('"Danie", zdjecie, "TYP"')

      if (anulowane || !daniaRaw) return

      const unikalne = [...new Map(
        daniaRaw
          .filter(d => d.Danie)
          .map(d => [d.Danie, d])
      ).values()]

      // 2) Historia kalendarza usera za ostatnie 90 dni — żeby wiedzieć co dawno
      const dawno = new Date()
      dawno.setDate(dawno.getDate() - 90)
      const { data: historia } = await supabase
        .from('kalendarz')
        .select('danie, data')
        .eq('user_id', user.id)
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
      // Losowo
      if (pula.length > 0) {
        setSugestia(pula[Math.floor(Math.random() * pula.length)])
      } else {
        setSugestia(null)
      }
      setLoading(false)
    }

    pobierz()
    return () => { anulowane = true }
  }, [user?.id, dzisStr, jutroStr, refreshKey])

  function losujInne() {
    if (sugestieMozliwe.length < 2) return
    let nowa
    do {
      nowa = sugestieMozliwe[Math.floor(Math.random() * sugestieMozliwe.length)]
    } while (nowa.Danie === sugestia?.Danie && sugestieMozliwe.length > 1)
    setSugestia(nowa)
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
      />

      <DzienSekcja
        tytul="Jutro"
        plan={planDni.jutro}
        onSlotClick={() => onTabChange('planer')}
        wyrozniony={false}
      />

      {/* Może ugotujesz? */}
      {sugestia && (
        <section style={s.sugestiaSekcja}>
          <div style={s.sugestiaHeader}>
            <h2 style={s.h2}>Może ugotujesz?</h2>
            <button
              style={s.link}
              onClick={losujInne}
              disabled={sugestieMozliwe.length < 2}
              title="Pokaż inne"
            >
              🔄 Inne
            </button>
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
        </section>
      )}

      {/* Bardzo lekki stan początkowy zanim sugestia się załaduje */}
      {!sugestia && loading && (
        <div style={s.sugestiaSekcja}>
          <h2 style={s.h2}>Może ugotujesz?</h2>
          <div style={s.sugestiaSkeleton} />
        </div>
      )}
    </div>
  )
}

// ── Sekcja z planem dnia ──
function DzienSekcja({ tytul, plan, onSlotClick, wyrozniony = true }) {
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

          return (
            <article key={posilek} style={s.posilekItem}>
              <div style={s.posilekInfo}>
                <div style={s.posilekNazwa}>{posilek}</div>
                <div style={s.posilekDanie}>{wpis.danie}</div>
                {wpis.dodatek && (
                  <div style={s.posilekExtra}>
                    z {wpis.dodatek}{wpis.surowka ? ` · ${wpis.surowka}` : ''}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
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
    ...ui.card, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 14,
  },
  posilekInfo: { flex: 1, minWidth: 0 },
  posilekNazwa: { ...ui.slotLabel, marginBottom: 3 },
  posilekDanie: {
    fontFamily: fonts.serif, fontSize: 17, color: t.text,
    letterSpacing: -0.1, lineHeight: 1.15,
  },
  posilekExtra: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 3 },

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

  sugestiaSkeleton: {
    height: 88, borderRadius: 16,
    background: t.surfaceAlt, opacity: 0.6,
  },
}
