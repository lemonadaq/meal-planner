import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Home({ user, onTabChange }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'
  const [dzisiaj, setDzisiaj] = useState([])
  const [liczbaPozycji, setLiczbaPozycji] = useState(0)

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
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.powitanie}>Dzień dobry, {imie}! 👋</h1>
          <p style={s.data}>{dzisiejszaData}</p>
        </div>
        <div style={s.avatar}>
          {imie[0]?.toUpperCase()}
        </div>
      </div>

      <div style={s.sekcja}>
        <div style={s.sekcjaHeader}>
          <span style={s.sekcjaTytuł}>Dzisiejsze posiłki</span>
          <button style={s.sekcjaLink} onClick={() => onTabChange('planer')}>
            Zobacz plan →
          </button>
        </div>

        {dzisiaj.filter(d => d.danie).length === 0 ? (
          <div style={s.pusty}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14, color: '#888' }}>Brak zaplanowanych posiłków</div>
            <button style={s.btnPlanuj} onClick={() => onTabChange('planer')}>
              Zaplanuj dzień
            </button>
          </div>
        ) : (
          <div style={s.posilkiLista}>
            {['Śniadanie', 'Obiad', 'Kolacja'].map(posilek => {
              const wpis = dzisiaj.find(d => d.posilek === posilek)
              if (!wpis?.danie) return null
              return (
                <div key={posilek} style={s.posilekItem}>
                  <div style={s.posilekGodz}>{godziny[posilek]}</div>
                  <div style={s.posilekInfo}>
                    <div style={s.posilekNazwa}>{posilek}</div>
                    <div style={s.posilekDanie}>{wpis.danie}</div>
                    {wpis.dodatek && (
                      <div style={s.posilekExtra}>+ {wpis.dodatek}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={s.skroty}>
        {[
          { ikona: '🛒', tytuł: 'Lista zakupów', sub: liczbaPozycji > 0 ? `${liczbaPozycji} dań w tym tygodniu` : 'Brak dań w tym tygodniu', tab: 'zakupy' },
          { ikona: '🍽️', tytuł: 'Przepisy', sub: 'Przeglądaj bazę dań', tab: 'przepisy' },
          { ikona: '📅', tytuł: 'Planer tygodnia', sub: 'Zaplanuj posiłki', tab: 'planer' },
        ].map(k => (
          <div key={k.tab} style={s.skrotKarta} onClick={() => onTabChange(k.tab)}>
            <div style={s.skrotIkona}>{k.ikona}</div>
            <div style={s.skrotInfo}>
              <div style={s.skrotTytuł}>{k.tytuł}</div>
              <div style={s.skrotSub}>{k.sub}</div>
            </div>
            <div style={s.skrotStrzalka}>›</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  container: {
    padding: '24px 16px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    maxWidth: 600,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  powitanie: {
    fontSize: 22, fontWeight: 700,
    color: '#1a1a1a', margin: '0 0 4px',
  },
  data: {
    fontSize: 14, color: '#888', margin: 0,
    textTransform: 'capitalize',
  },
  avatar: {
    width: 44, height: 44,
    borderRadius: '50%',
    background: '#4a86e8',
    color: 'white',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700,
    flexShrink: 0,
  },
  sekcja: {
    background: 'white',
    borderRadius: 20,
    padding: '16px',
    marginBottom: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sekcjaHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sekcjaTytuł: {
    fontSize: 16, fontWeight: 700, color: '#1a1a1a',
  },
  sekcjaLink: {
    background: 'none', border: 'none',
    fontSize: 13, color: '#4a86e8',
    cursor: 'pointer', fontWeight: 500,
  },
  pusty: {
    textAlign: 'center',
    padding: '20px 0',
  },
  btnPlanuj: {
    marginTop: 12,
    background: '#4a86e8', color: 'white',
    border: 'none', borderRadius: 10,
    padding: '10px 20px', fontSize: 14,
    cursor: 'pointer', fontWeight: 600,
  },
  posilkiLista: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  posilekItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: 12,
  },
  posilekGodz: {
    fontSize: 12, color: '#888',
    fontWeight: 600, minWidth: 36,
    paddingTop: 2,
  },
  posilekInfo: { flex: 1 },
  posilekNazwa: {
    fontSize: 11, color: '#4a86e8',
    fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: 2,
  },
  posilekDanie: {
    fontSize: 15, fontWeight: 600, color: '#1a1a1a',
  },
  posilekExtra: {
    fontSize: 12, color: '#888', marginTop: 2,
  },
  skroty: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  skrotKarta: {
    background: 'white',
    borderRadius: 16,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  skrotIkona: { fontSize: 28, flexShrink: 0 },
  skrotInfo: { flex: 1 },
  skrotTytuł: {
    fontSize: 15, fontWeight: 600, color: '#1a1a1a',
  },
  skrotSub: {
    fontSize: 13, color: '#888', marginTop: 2,
  },
  skrotStrzalka: {
    fontSize: 20, color: '#ccc',
  },
}