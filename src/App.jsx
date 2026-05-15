import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'
import Kalendarz from './pages/Kalendarz'
import ListaZakupow from './pages/ListaZakupow'
import DodajDanie from './pages/DodajDanie'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Ustawienia from './pages/Ustawienia'
import Admin from './pages/Admin'
import { useUstawienia } from './useUstawienia'
import { useTabAnalytics, sledz } from './analytics'

// ⚠️ ZMIEŃ NA SWÓJ EMAIL — to email który ma dostęp do panelu admina
const ADMIN_EMAILE = ['wojownik157@gmail.com']

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
  const [ekran, setEkran] = useState(null) // 'ustawienia' | 'admin' | null
  const [homeRefresh, setHomeRefresh] = useState(0)

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

  const { ustawienia, zapisz: zapiszUstawienia } = useUstawienia(user)
  useTabAnalytics(user, user ? tab : null)

  // Bumpuje refresh dla Home gdy wracamy z innej zakładki
  // (np. po dodaniu czegoś w planerze, zakupach, edycji dania)
  function zmienTab(nowyTab) {
    if (nowyTab === 'home' && tab !== 'home') {
      setHomeRefresh(k => k + 1)
    }
    setTab(nowyTab)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      Ładowanie...
    </div>
  )

  if (!user) return <Login />

  const jestAdmin = ADMIN_EMAILE.includes(user.email)
  const sledzAkcje = (wartosc, szczegoly) => sledz(user, 'akcja', wartosc, szczegoly)

  // ── Widoki overlay (bez navbara) ──
  if (ekran === 'ustawienia') {
    return (
      <Ustawienia
        user={user}
        ustawienia={ustawienia}
        onZapisz={zapiszUstawienia}
        onBack={() => setEkran(null)}
        onAdmin={() => setEkran('admin')}
        jestAdmin={jestAdmin}
      />
    )
  }
  if (ekran === 'admin') {
    return <Admin onBack={() => setEkran('ustawienia')} />
  }

  // Wybór dania (z Przepisów lub z sugestii na Home) — po powrocie odśwież Home
  if (wybraneD) return (
    <DanieDetail
      nazwa={wybraneD}
      onBack={() => {
        setWybraneD(null)
        setHomeRefresh(k => k + 1)
      }}
      user={user}
      sledz={sledzAkcje}
    />
  )
  if (dodajDanie) return (
    <DodajDanie
      onBack={() => setDodajDanie(false)}
      onZapisano={(nazwa) => {
        sledzAkcje('dodaj_danie', { danie: nazwa })
        setDodajDanie(false)
      }}
    />
  )

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh', background: '#FAF6F0' }}>
      {tab === 'home' && (
        <Home
          user={user}
          onTabChange={zmienTab}
          onUstawienia={() => setEkran('ustawienia')}
          onSelectDanie={setWybraneD}
          refreshKey={homeRefresh}
        />
      )}
      {tab === 'planer' && (
        <Kalendarz
          user={user}
          onBack={() => zmienTab('home')}
          domyslnePorcje={ustawienia?.domyslne_porcje ?? 1}
          sledz={sledzAkcje}
        />
      )}
      {tab === 'przepisy' && (
        <Dania
          onSelect={setWybraneD}
          user={user}
          onDodaj={() => setDodajDanie(true)}
          onBack={() => zmienTab('home')}
        />
      )}
      {tab === 'zakupy' && (
        <ListaZakupow
          user={user}
          onBack={() => zmienTab('home')}
          domyslnePorcje={ustawienia?.domyslne_porcje ?? 1}
          sledz={sledzAkcje}
        />
      )}
      <NavBar aktywny={tab} onChange={zmienTab} />
      <IOSInstallBaner />
    </div>
  )
}

export default App
