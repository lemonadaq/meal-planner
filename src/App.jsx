import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'
import Kalendarz from './pages/Kalendarz'
import ListaZakupow from './pages/ListaZakupow'
import DodajDanie from './pages/DodajDanie'

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
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: 'white', padding: '16px 20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999, fontFamily: 'sans-serif',
      borderRadius: '16px 16px 0 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
            📲 Dodaj do ekranu głównego
          </div>
          {jestChrome ? (
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
              Na iPhone działa tylko przez <strong>Safari</strong>. Otwórz tę stronę w Safari, a następnie kliknij <strong>□↑</strong> i <strong>"Dodaj do ekranu głównego"</strong>
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
  const [widok, setWidok] = useState('dania')
  const [wybraneD, setWybraneD] = useState(null)

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

  if (loading) return <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>Ładowanie...</div>
  if (!user) return <Login />

  return (
    <>
      {wybraneD && <DanieDetail nazwa={wybraneD} onBack={() => setWybraneD(null)} />}
      {!wybraneD && widok === 'kalendarz' && <Kalendarz user={user} onBack={() => setWidok('dania')} />}
      {!wybraneD && widok === 'lista' && <ListaZakupow user={user} onBack={() => setWidok('dania')} />}
      {!wybraneD && widok === 'dodaj' && (
        <DodajDanie
          onBack={() => setWidok('dania')}
          onZapisano={() => setWidok('dania')}
        />
      )}
      {!wybraneD && widok === 'dania' && (
        <Dania
          onSelect={setWybraneD}
          user={user}
          onKalendarz={() => setWidok('kalendarz')}
          onLista={() => setWidok('lista')}
          onDodaj={() => setWidok('dodaj')}
        />
      )}
      <IOSInstallBaner />
    </>
  )
}

export default App