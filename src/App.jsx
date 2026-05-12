import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Login from './pages/Login'
import Dania from './pages/Dania'
import DanieDetail from './pages/DanieDetail'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wybraneD, setWybraneD] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      Ładowanie...
    </div>
  )

  if (!user) return <Login />

  if (wybraneD) {
    return <DanieDetail nazwa={wybraneD} onBack={() => setWybraneD(null)} />
  }

  return <Dania onSelect={setWybraneD} user={user} />
}

export default App