import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Blog from './pages/Blog.jsx'
import Wpis from './pages/Wpis.jsx'

// Routing siedzi TYLKO tutaj, na samej górze. Planer (`App`) ma własną
// nawigację na stanie Reacta razem z obsługą cofania w Capacitorze i celowo
// jej nie ruszamy — dla routera cały planer to jedna trasa `/planer/*`.
//
// Blog jest publiczny (`/`, `/wpis/:slug`), planer wymaga logowania. Bramkę
// trzyma `App`, tak jak dotąd.

// W apce natywnej nie ma bloga: instalujesz planer, więc planer ma się otworzyć.
// Capacitor ładuje bundle z `/`, stąd przekierowanie.
const jestNatywna = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={jestNatywna ? <Navigate to="/planer" replace /> : <Blog />} />
        <Route path="/wpis/:slug" element={<Wpis />} />
        <Route path="/planer/*" element={<App />} />
        {/* Nieznany adres wraca na blog, a nie na biały ekran. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
