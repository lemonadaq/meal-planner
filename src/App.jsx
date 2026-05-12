import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [status, setStatus] = useState('Łączę z bazą...')

  useEffect(() => {
    supabase.from('_test').select('*').then(({ error }) => {
      if (error?.message.includes('does not exist')) {
        setStatus('✅ Połączono z Supabase!')
      } else if (error) {
        setStatus('❌ Błąd: ' + error.message)
      }
    })
  }, [])

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>🍽️ Meal Planner</h1>
      <p>{status}</p>
    </div>
  )
}

export default App