// Adres główny rozgałęzia się po sesji: domownik dostaje planer, gość bloga.
//
// Aplikacja jest nadrzędna — to ona jest produktem, blog jest dodatkiem.
// Dlatego „/" nie jest już blogiem na sztywno; blog ma własny, stały adres
// `/blog` i tam zawsze można kogoś wysłać, niezależnie od tego, kto patrzy.
//
// Sesję sprawdzamy TUTAJ, zanim cokolwiek pokażemy. Gdyby zdecydować dopiero
// po pierwszym renderze, zalogowanemu mignąłby blog, zanim Supabase odda
// sesję z localStorage.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import App from './App.jsx'
import Blog from './pages/Blog.jsx'

export default function StronaGlowna() {
  // null = jeszcze nie wiemy, true/false = wiemy
  const [zalogowany, setZalogowany] = useState(null)

  useEffect(() => {
    let anulowane = false

    supabase.auth.getSession().then(({ data }) => {
      if (!anulowane) setZalogowany(!!data?.session)
    })

    // Bez tego wylogowanie w planerze zostawiałoby pusty planer pod „/",
    // a zalogowanie z bloga wymagałoby przeładowania strony.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_zdarzenie, sesja) => {
      if (!anulowane) setZalogowany(!!sesja)
    })

    return () => {
      anulowane = true
      subscription?.unsubscribe()
    }
  }, [])

  if (zalogowany === null) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
        Ładowanie...
      </div>
    )
  }

  return zalogowany ? <App /> : <Blog />
}
