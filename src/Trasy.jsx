// Mapa adresów całego serwisu. Wydzielona z `main.jsx`, żeby dało się ją
// przetestować bez montowania prawdziwego drzewa Reacta — najłatwiej tu
// o cichą wpadkę w przekierowaniach starych linków.
//
// Planer (`App`) ma własną nawigację na stanie Reacta razem z obsługą
// cofania w Capacitorze i celowo jej nie ruszamy — dla routera cały planer
// to jedna trasa `/planer/*`.
//
// Aplikacja jest nadrzędna, blog jest dodatkiem, i adresy to odzwierciedlają:
//
//   /                 planer dla zalogowanych, blog dla gości (StronaGlowna)
//   /planer/*         planer, zawsze, z własną bramką logowania
//   /blog, /blog/…    blog, zawsze — stały adres do wysłania komuś
//
// Blog dostał własną przestrzeń `/blog/*`, żeby dało się go komuś podesłać
// bez względu na to, czy jest zalogowany. Stare adresy sprzed rozdzielenia
// przekierowują, więc żaden wysłany wcześniej link nie umiera.

import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import App from './App.jsx'
import StronaGlowna from './StronaGlowna.jsx'
import Blog from './pages/Blog.jsx'
import Wpis from './pages/Wpis.jsx'
import OMnie from './pages/OMnie.jsx'

// Stary adres wpisu → nowy, z zachowaniem sluga.
function PrzekierujWpis() {
  const { slug } = useParams()
  return <Navigate to={`/blog/${slug}`} replace />
}

export default function Trasy({ jestNatywna = false }) {
  return (
    <Routes>
      {/* W apce natywnej nie ma bloga: instalujesz planer, więc planer ma się
          otworzyć. Capacitor ładuje bundle z „/", stąd przekierowanie. */}
      <Route path="/" element={jestNatywna ? <Navigate to="/planer" replace /> : <StronaGlowna />} />

      <Route path="/planer/*" element={<App />} />

      <Route path="/blog" element={<Blog />} />
      {/* Statyczny segment wygrywa z `:slug`, więc „o-mnie" nie zostanie
          potraktowane jak nazwa wpisu. */}
      <Route path="/blog/o-mnie" element={<OMnie />} />
      <Route path="/blog/:slug" element={<Wpis />} />

      {/* Adresy sprzed rozdzielenia bloga i aplikacji. */}
      <Route path="/wpis/:slug" element={<PrzekierujWpis />} />
      <Route path="/o-mnie" element={<Navigate to="/blog/o-mnie" replace />} />

      {/* Nieznany adres wraca na stronę główną, a nie na biały ekran. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
