import { useState, useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import Login from './pages/Login'
import ImieGate from './pages/ImieGate'
import NoweHaslo from './pages/NoweHaslo'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'
import Kalendarz from './pages/Kalendarz'
import ListaZakupow from './pages/ListaZakupow'
import DodajDanie from './pages/DodajDanie'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Ustawienia from './pages/Ustawienia'
import Admin from './pages/Admin'
import Rodzina from './pages/Rodzina'
import KonfiguracjaSlotow from './pages/KonfiguracjaSlotow'
import ZaproszenieModal from './components/ZaproszenieModal'
import { useUstawienia } from './useUstawienia'
import { useHousehold } from './useHousehold'
import { useTabAnalytics, sledz } from './analytics'
import { t } from './theme'
import { useThemeVersion } from './useThemeVersion'

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
    const jestNatywna = window.Capacitor?.isNativePlatform?.() === true
    if (iosUrzadzenie && !juzZainstalowana && !ukryte && !jestNatywna) {
      setJestChrome(chrome)
      setPokaz(true)
    }
  }, [])

  if (!pokaz) return null

  return (
    <div style={{
      position: 'fixed', bottom: 70, left: 12, right: 12,
      background: t.surface, padding: '16px 20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999, fontFamily: 'sans-serif',
      borderRadius: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: t.text }}>
            📲 Dodaj do ekranu głównego
          </div>
          {jestChrome ? (
            <div style={{ fontSize: 13, color: t.mute, lineHeight: 1.5 }}>
              Na iPhone działa tylko przez <strong>Safari</strong>. Otwórz tę stronę w Safari, kliknij <strong>□↑</strong> i <strong>"Dodaj do ekranu głównego"</strong>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: t.mute, lineHeight: 1.5 }}>
              Kliknij <strong>□↑</strong> na dole ekranu, a następnie <strong>"Dodaj do ekranu głównego"</strong>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            localStorage.setItem('banerUkryty', '1')
            setPokaz(false)
          }}
          style={{ background: 'none', border: 'none', fontSize: 20, color: t.mute, cursor: 'pointer', padding: '0 0 0 12px' }}
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
  const [resetHasla, setResetHasla] = useState(false)
  const [tab, setTab] = useState('home')
  const [wybraneD, setWybraneD] = useState(null)
  const [dodajDanie, setDodajDanie] = useState(false)
  const [ekran, setEkran] = useState(null) // 'ustawienia' | 'admin' | 'rodzina' | 'sloty' | null
  const [homeRefresh, setHomeRefresh] = useState(0)
  const [tydzienKalendarza, setTydzienKalendarza] = useState(0)

  // Subskrypcja zmian motywu — wymusza re-render całego drzewa
  useThemeVersion()

  const navStateRef = useRef({ tab, ekran, wybraneD, dodajDanie })
  const cofnijWApceRef = useRef(null)

  useEffect(() => {
    navStateRef.current = { tab, ekran, wybraneD, dodajDanie }
  }, [tab, ekran, wybraneD, dodajDanie])

  cofnijWApceRef.current = () => {
    const st = navStateRef.current

    if (st.ekran === 'admin' || st.ekran === 'rodzina' || st.ekran === 'sloty') {
      setEkran('ustawienia')
      return true
    }

    if (st.ekran === 'ustawienia') {
      setEkran(null)
      return true
    }

    if (st.wybraneD) {
      setWybraneD(null)
      setHomeRefresh(k => k + 1)
      return true
    }

    if (st.dodajDanie) {
      setDodajDanie(false)
      return true
    }

    if (st.tab !== 'home') {
      setTab('home')
      setHomeRefresh(k => k + 1)
      return true
    }

    return false
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'PASSWORD_RECOVERY') setResetHasla(true)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const { ustawienia, zapisz: zapiszUstawienia } = useUstawienia(user)
  const { householdId, household, refresh: refreshHousehold } = useHousehold(user)
  useTabAnalytics(user, user ? tab : null)

  useEffect(() => {
    let listener
    CapApp.addListener('backButton', () => {
      cofnijWApceRef.current?.()
    }).then(l => { listener = l })
    return () => listener?.remove()
  }, [])

  useEffect(() => {
    let listener
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url?.startsWith('com.menuplaner.app://')) return
      try { await Browser.close() } catch {}
      const hash = url.split('#')[1] || ''
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const { data } = await supabase.auth.setSession({ access_token, refresh_token })
        if (data?.session) setUser(data.session.user)
      }
    }).then(l => { listener = l })
    return () => listener?.remove()
  }, [])

  function poZaakceptowaniu() {
    refreshHousehold()
    setHomeRefresh(k => k + 1)
  }

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

  // Tryb odzyskiwania hasła (po kliknięciu w link z maila) — ma priorytet
  if (resetHasla) return <NoweHaslo onGotowe={() => setResetHasla(false)} />

  if (!user) return <Login />

  // Pierwsze logowanie bez imienia → poproś o nie (zapis w user_metadata.full_name)
  const imieUsera = (user.user_metadata?.full_name || '').trim()
  if (!imieUsera) return <ImieGate user={user} onZapisano={(u) => setUser(u)} />

  const jestAdmin = ADMIN_EMAILE.includes(user.email)
  const sledzAkcje = (wartosc, szczegoly) => sledz(user, 'akcja', wartosc, szczegoly)

  // ── Widoki overlay (bez navbara) ──
  if (ekran === 'ustawienia') {
    return (
      <>
        <Ustawienia
          user={user}
          ustawienia={ustawienia}
          onZapisz={zapiszUstawienia}
          onBack={() => setEkran(null)}
          onAdmin={() => setEkran('admin')}
          onRodzina={() => setEkran('rodzina')}
          onSloty={() => setEkran('sloty')}
          jestAdmin={jestAdmin}
        />
        <ZaproszenieModal user={user} onZaakceptowano={poZaakceptowaniu} />
      </>
    )
  }
  if (ekran === 'admin') {
    return <Admin onBack={() => setEkran('ustawienia')} />
  }
  if (ekran === 'rodzina') {
    return (
      <Rodzina
        user={user}
        householdId={householdId}
        onBack={() => setEkran('ustawienia')}
        onZmianaHousehold={poZaakceptowaniu}
      />
    )
  }
  if (ekran === 'sloty') {
    return (
      <KonfiguracjaSlotow
        householdId={householdId}
        onBack={() => setEkran('ustawienia')}
      />
    )
  }

  if (wybraneD) return (
    <>
      <DanieDetail
        nazwa={wybraneD}
        onBack={() => {
          setWybraneD(null)
          setHomeRefresh(k => k + 1)
        }}
        user={user}
        householdId={householdId}
        sledz={sledzAkcje}
      />
      <NavBar
        aktywny={tab}
        onChange={(nowyTab) => {
          setWybraneD(null)
          setHomeRefresh(k => k + 1)
          setTab(nowyTab)
        }}
      />
      <ZaproszenieModal user={user} onZaakceptowano={poZaakceptowaniu} />
    </>
  )
  if (dodajDanie) return (
    <>
      <DodajDanie
        onBack={() => setDodajDanie(false)}
        onZapisano={(nazwa) => {
          sledzAkcje('dodaj_danie', { danie: nazwa })
          setDodajDanie(false)
        }}
      />
      <ZaproszenieModal user={user} onZaakceptowano={poZaakceptowaniu} />
    </>
  )

  return (
    <div style={{ paddingBottom: 80, minHeight: '100vh', background: t.bg }}>
      {tab === 'home' && (
        <Home
          user={user}
          householdId={householdId}
          onTabChange={zmienTab}
          onUstawienia={() => setEkran('ustawienia')}
          onSelectDanie={setWybraneD}
          refreshKey={homeRefresh}
        />
      )}
      {tab === 'planer' && (
        <Kalendarz
          user={user}
          householdId={householdId}
          onBack={() => zmienTab('home')}
          domyslnePorcje={ustawienia?.domyslne_porcje ?? 1}
          sledz={sledzAkcje}
          onSelectDanie={setWybraneD}
          tydzien={tydzienKalendarza}
          onTydzienChange={setTydzienKalendarza}
        />
      )}
      {tab === 'przepisy' && (
        <Dania
          onSelect={setWybraneD}
          user={user}
          householdId={householdId}
          onDodaj={() => setDodajDanie(true)}
          onBack={() => zmienTab('home')}
        />
      )}
      {tab === 'zakupy' && (
        <ListaZakupow
          user={user}
          householdId={householdId}
          onBack={() => zmienTab('home')}
          domyslnePorcje={ustawienia?.domyslne_porcje ?? 1}
          sledz={sledzAkcje}
          tydzienKalendarza={tydzienKalendarza}
        />
      )}
      <NavBar aktywny={tab} onChange={zmienTab} />
      <IOSInstallBaner />
      <ZaproszenieModal user={user} onZaakceptowano={poZaakceptowaniu} />
    </div>
  )
}

export default App
