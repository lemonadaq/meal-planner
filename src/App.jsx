import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'
import Kalendarz from './pages/Kalendarz'
import ListaZakupow from './pages/ListaZakupow'
import DodajDanie from './pages/DodajDanie'
import NavBar from './components/NavBar'

function IOSInstallBaner() {
  const [pokaz, setPokaz] = useState(false)
  const [jestChrome, setJestChrome] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()
    const iosUrzadzenie = /iphone|ipad|ipod/.test(ua)
    const chrome = /crios/.test(ua)
    const juzZainstalowana = window.navigator.standalone === true
    const ukryte = localStorage.getItem('banerUkryty')
    if (iosUrzadzenie && !juzZainstalowana && !ukryte) {
      setJestChrome(chrome)
      setPokaz(true)
    }
  }, [])

  if (!pokaz) return null

  return (
    <div style={{
      position: 'fixed', bottom: 70, left: 12, right: 12,
      background: 'white', padding: '16px 20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999, fontFamily: 'sans-serif',
      borderRadius: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            📲 Dodaj do ekranu głównego
          </div>
          {jestChrome ? (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
              Na iPhone działa tylko przez <strong>Safari</strong>. Otwórz tę stronę w Safari, kliknij <strong>□↑</strong> i <strong>"Dodaj do ekranu głównego"</strong>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
              Kliknij <strong>□↑</strong> na dole ekranu, a następnie <strong>"Dodaj do ekranu głównego"</strong>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            localStorage.setItem('banerUkryty', '1')
            setPokaz(false)
          }}
          style={{ background: 'none', border: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer', padding: '0 0 0 12px' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('home')
  const [wybraneD, setWybraneD] = useState(null)
  const [dodajDanie, setDodajDanie] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      Ładowanie...
    </div>
  )

  if (!user) return <Login />

  // Widoki overlay (bez navbara)
  if (wybraneD) return <DanieDetail nazwa={wybraneD} onBack={() => setWybraneD(null)} />
  if (dodajDanie) return (
    <DodajDanie
      onBack={() => setDodajDanie(false)}
      onZapisano={() => setDodajDanie(false)}
    />
  )

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh', background: '#f8f9fa' }}>
      {tab === 'home' && <Home user={user} onTabChange={setTab} />}
      {tab === 'planer' && <Kalendarz user={user} onBack={() => setTab('home')} />}
      {tab === 'przepisy' && (
        <Dania
          onSelect={setWybraneD}
          user={user}
          onDodaj={() => setDodajDanie(true)}
        />
      )}
      {tab === 'zakupy' && <ListaZakupow user={user} onBack={() => setTab('home')} />}
      <NavBar aktywny={tab} onChange={setTab} />
      <IOSInstallBaner />
    </div>
  )
}

// Tymczasowy placeholder dla Home
function Home({ user, onTabChange }) {
  const imie = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Cześć'

  return (
    <div style={{ padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
        Dzień dobry, {imie}! 👋
      </h1>
      <p style={{ color: '#888', fontSize: 15, marginBottom: 24 }}>
        {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { ikona: '📅', label: 'Planer', tab: 'planer', kolor: '#e8f0fe' },
          { ikona: '🛒', label: 'Zakupy', tab: 'zakupy', kolor: '#e6f4ea' },
          { ikona: '🍽️', label: 'Przepisy', tab: 'przepisy', kolor: '#fce8e6' },
        ].map(k => (
          <div
            key={k.tab}
            onClick={() => onTabChange(k.tab)}
            style={{
              background: k.kolor, borderRadius: 16,
              padding: '20px 16px', cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{k.ikona}</div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App