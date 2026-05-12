import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'
import Kalendarz from './pages/Kalendarz'
import ListaZakupow from './pages/ListaZakupow'

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

  if (wybraneD) return <DanieDetail nazwa={wybraneD} onBack={() => setWybraneD(null)} />
  if (widok === 'kalendarz') return <Kalendarz user={user} onBack={() => setWidok('dania')} />
  if (widok === 'lista') return <ListaZakupow user={user} onBack={() => setWidok('dania')} />

  return <Dania onSelect={setWybraneD} user={user} onKalendarz={() => setWidok('kalendarz')} onLista={() => setWidok('lista')} />
}

export default App