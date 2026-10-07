// Mapa adresów całego serwisu. Wydzielona z `main.jsx`, żeby dało się ją
// przetestować bez montowania prawdziwego drzewa Reacta — najłatwiej tu
// o cichą wpadkę w przekierowaniach starych linków.
//
// Planer (`App`) ma własną nawigację na stanie Reacta razem z obsługą
// cofania w Capacitorze i celowo jej nie ruszamy — dla routera cały planer
// to jedna trasa `/planer/*`.
//
// BLOG JEST ODCIĘTY. Serwis to planer i tylko planer:
//
//   /                 planer (własna bramka logowania)
//   /planer/*         planer, ten sam komponent — stary adres nie umiera
//
// Pliki bloga (`pages/Blog.jsx`, `Wpis.jsx`, `OMnie.jsx`, `WpisyAdmin.jsx`,
// `components/Komentarze*.jsx`, `blog.js`, `komentarze.js`) ZOSTAJĄ w repo,
// ale nic ich już nie montuje. Decyzja Filipa z 2026-10-06: blog zabierał
// uwagę, a produktem jest planer. Wejście z powrotem to dopisanie tu tras.
//
// Adresy bloga nie przekierowują na „/" ani nigdzie indziej — łapie je
// reguła `*` na końcu, tak samo jak każdy inny nieznany adres.

import { Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import PolitykaPrywatnosci from './pages/PolitykaPrywatnosci.jsx'
import Regulamin from './pages/Regulamin.jsx'

export default function Trasy() {
  return (
    <Routes>
      {/* Planer pod „/" bez żadnego rozgałęzienia po sesji — nie ma już bloga,
          któremu trzeba by ustąpić miejsca, a App ma własną bramkę logowania.
          Dlatego nie ma tu też `jestNatywna`: Capacitor ładuje bundle z „/"
          i od razu dostaje to, co ma dostać. */}
      <Route path="/" element={<App />} />
      <Route path="/planer/*" element={<App />} />

      {/* Dokumenty prawne pod stałymi, publicznymi adresami. Google Play
          wymaga podania adresu polityki prywatności w opisie aplikacji,
          a adres musi działać bez logowania. Ten sam komponent renderuje
          się też jako modal na ekranie logowania — treść jest jedna.
          ZOSTAJĄ niezależnie od losów bloga. */}
      <Route path="/polityka-prywatnosci" element={<PolitykaPrywatnosci />} />
      <Route path="/regulamin" element={<Regulamin />} />

      {/* Nieznany adres wraca na planer, a nie na biały ekran. Tędy lecą też
          stare adresy bloga: /blog, /blog/<slug>, /blog/o-mnie, /wpis/<slug>,
          /o-mnie. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
