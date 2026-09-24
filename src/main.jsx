import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import Trasy from './Trasy.jsx'

// Mapa adresów siedzi w `Trasy.jsx` — tutaj zostaje samo montowanie.
const jestNatywna = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Trasy jestNatywna={jestNatywna} />
      {/* Statystyki Vercela — zbiera tylko odsłony, bez ciasteczek.
          Własny licznik w bazie zostaje, bo tamten widać w panelu bloga. */}
      {!jestNatywna && <Analytics />}
    </BrowserRouter>
  </StrictMode>,
)
