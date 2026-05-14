import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { t, fonts, ui, avatarBg } from '../theme'

function getPowitanie() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11)  return 'Dzień dobry'
  if (h >= 11 && h < 17) return 'Cześć'
  if (h >= 17 && h < 22) return 'Dobry wieczór'
  return 'Dobranoc'
}

export default function Home({ user, onTabChange, onUstawienia }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'
  const [dzisiaj, setDzisiaj] = useState([])
  const [liczbaPozycji, setLiczbaPozycji] = useState(0)
  const [powitanie] = useState(getPowitanie)

  useEffect(() => {
    async function pobierz() {
      const dzis = new Date().toISOString().split('T')[0]

      const { data: planData } = await supabase
        .from('kalendarz')
        .select('*')
        .eq('user_id', user.id)
        .eq('data', dzis)

      setDzisiaj(planData || [])

      const d = new Date()
      const day = d.getDay() || 7
      d.setDate(d.getDate() - day + 1)
      const poniedzialek = d.toISOString().split('T')[0]
      const niedziela = new Date(d)
      niedziela.setDate(niedziela.getDate() + 6)
      const niedzielaStr = niedziela.toISOString().split('T')[0]

      const { data: tydz } = await supabase
        .from('kalendarz')
        .select('danie')
        .eq('user_id', user.id)
        .gte('data', poniedzialek)
        .lte('data', niedzielaStr)

      const dania = new Set((tydz || []).filter(p => p.danie).map(p => p.danie))
      setLiczbaPozycji(dania.size)
    }
    pobierz()
  }, [user.id])

  const godziny = { Śniadanie: '8:00', Obiad: '13:00', Kolacja: '19:00' }
  const dzisiejszaData = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const zaplanowane = dzisiaj.filter(d => d.danie)

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
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

      <div style={s.sekcjaHeader}>
        <h2 style={s.h2}>Dzisiaj na talerzu</h2>
        <button style={s.link} onClick={() => onTabChange('planer')}>Plan tygodnia →</button>
      </div>

      {zaplanowane.length === 0 ? (
        <div style={s.pusty}>
          <h3 style={s.pustyTytul}>Pusty kalendarz</h3>
          <p style={s.pustySub}>Zaplanuj swoje posiłki — później Twoja lista zakupów ułoży się sama.</p>
          <button style={s.btnPlanuj} onClick={() => onTabChange('planer')}>
            Zaplanuj dzień
          </button>
        </div>
      ) : (
        <div style={s.posilkiLista}>
          {['Śniadanie', 'Obiad', 'Kolacja'].map((posilek, idx) => {
            const wpis = dzisiaj.find(d => d.posilek === posilek)
            if (!wpis?.danie) return null
            return (
              <article key={posilek} style={s.posilekItem}>
                <div style={s.posilekTime}>
                  <span style={s.timeIdx}>{String(idx + 1).padStart(2, '0')}</span>
                  <span style={s.timeHour}>{godziny[posilek]}</span>
                </div>
                <div style={s.posilekInfo}>
                  <div style={s.posilekNazwa}>{posilek}</div>
                  <div style={s.posilekDanie}>{wpis.danie}</div>
                  {wpis.dodatek && (
                    <div style={s.posilekExtra}>z {wpis.dodatek}{wpis.surowka ? ` · ${wpis.surowka}` : ''}</div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <h2 style={{ ...s.h2, marginTop: 32, marginBottom: 12 }}>Skróty</h2>
      <div style={s.skroty}>
        {[
          { tytuł: 'Lista zakupów', sub: liczbaPozycji > 0 ? `${liczbaPozycji} dań w tym tygodniu` : 'Brak dań w tym tygodniu', tab: 'zakupy', icon: CartIcon, hue: t.warm },
          { tytuł: 'Przepisy', sub: 'Przeglądaj bazę dań', tab: 'przepisy', icon: BookIcon, hue: t.accent },
          { tytuł: 'Planer tygodnia', sub: 'Zaplanuj posiłki', tab: 'planer', icon: CalIcon, hue: t.accent },
        ].map(k => (
          <button key={k.tab} style={s.skrotKarta} onClick={() => onTabChange(k.tab)}>
            <div style={{ ...s.skrotIkona, background: k.hue }}>
              <k.icon />
            </div>
            <div style={s.skrotInfo}>
              <div style={s.skrotTytuł}>{k.tytuł}</div>
              <div style={s.skrotSub}>{k.sub}</div>
            </div>
            <div style={s.skrotStrzalka}>›</div>
          </button>
        ))}
      </div>
    </div>
  )
}

const CartIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.5 12.5a2 2 0 0 0 2 1.5h7.5a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9" cy="21" r="1.2"/><circle cx="18" cy="21" r="1.2"/></svg>)
const BookIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 1-3-3V4z"/><path d="M20 4h-3a3 3 0 0 0-3 3v14h3a3 3 0 0 0 3-3V4z"/></svg>)
const CalIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>)

const s = {
  container: {
    padding: '20px 20px 24px',
    fontFamily: fonts.sans, color: t.text,
    background: t.bg, minHeight: '100vh',
    maxWidth: 600, margin: '0 auto', boxSizing: 'border-box',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28, gap: 12,
  },
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
  sekcjaHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: 12,
  },
  h2: { ...ui.h2 },
  link: { ...ui.btnText, color: t.accent, padding: 0 },
  pusty: { ...ui.card, padding: '28px 24px', textAlign: 'center' },
  pustyTytul: { ...ui.h3, marginBottom: 6 },
  pustySub: {
    fontFamily: fonts.sans, fontSize: 13.5, color: t.mute,
    margin: '0 0 18px', lineHeight: 1.5,
  },
  btnPlanuj: { ...ui.btnPrimary, padding: '12px 22px' },
  posilkiLista: { display: 'flex', flexDirection: 'column', gap: 8 },
  posilekItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 16px', ...ui.card,
  },
  posilekTime: {
    flexShrink: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2, paddingRight: 12,
    borderRight: `0.5px solid ${t.border}`,
    minWidth: 56,
  },
  timeIdx: {
    fontFamily: fonts.serif, fontSize: 20, color: t.accent,
    fontStyle: 'italic', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
  },
  timeHour: {
    fontFamily: fonts.sans, fontSize: 10, fontWeight: 600,
    letterSpacing: 0.6, color: t.mute, fontVariantNumeric: 'tabular-nums',
  },
  posilekInfo: { flex: 1, minWidth: 0 },
  posilekNazwa: { ...ui.slotLabel, marginBottom: 2 },
  posilekDanie: {
    fontFamily: fonts.serif, fontSize: 17, color: t.text,
    letterSpacing: -0.1, lineHeight: 1.15,
  },
  posilekExtra: { fontFamily: fonts.sans, fontSize: 12, color: t.mute, marginTop: 3 },
  skroty: { display: 'flex', flexDirection: 'column', gap: 8 },
  skrotKarta: {
    ...ui.card, padding: '12px 14px',
    display: 'flex', alignItems: 'center', gap: 14,
    cursor: 'pointer', textAlign: 'left', fontFamily: fonts.sans,
  },
  skrotIkona: {
    width: 40, height: 40, borderRadius: 12,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  skrotInfo: { flex: 1, minWidth: 0 },
  skrotTytuł: {
    fontFamily: fonts.serif, fontSize: 17, color: t.text,
    letterSpacing: -0.1, lineHeight: 1.2,
  },
  skrotSub: { fontFamily: fonts.sans, fontSize: 12.5, color: t.mute, marginTop: 2 },
  skrotStrzalka: { fontSize: 22, color: t.muteLight, fontFamily: fonts.serif },
}
