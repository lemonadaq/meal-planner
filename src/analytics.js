// Lekki helper analytics. Eksportuje:
//   sledz(user, zdarzenie, wartosc, szczegoly)  — pojedyncze zdarzenie
//   useTabAnalytics(user, aktualnyTab)          — automatyczne śledzenie zakładek i czasu
//
// Filozofia: zero blokowania UI. Wszystkie zapisy idą "fire and forget".
// Buforowanie żeby nie wysyłać po jednym requeście — partia co 5s lub przy zmianie taba.

import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

const KOLEJKA = []
let timerFlush = null

async function flush() {
  if (KOLEJKA.length === 0) return
  const paczka = KOLEJKA.splice(0, KOLEJKA.length)
  try {
    await supabase.from('analytics').insert(paczka)
  } catch (e) {
    // nie blokujemy aplikacji — analytics ma być niewidoczne
    console.warn('analytics flush err', e)
  }
}

function zaplanujFlush() {
  if (timerFlush) return
  timerFlush = setTimeout(() => {
    timerFlush = null
    flush()
  }, 5000)
}

// Wymuś flush przed zamknięciem strony
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (KOLEJKA.length === 0) return
    // sendBeacon byłby idealny, ale Supabase REST tego nie obsłuży łatwo;
    // przy normalnym zamknięciu strony flush co 5s i tak załatwia sprawę.
    flush()
  })
  // Flush gdy karta przechodzi w tło — ważne dla mobile
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

export function sledz(user, zdarzenie, wartosc = null, szczegoly = {}, czas_trwania_s = null) {
  if (!user?.id) return
  KOLEJKA.push({
    user_id: user.id,
    user_email: user.email || null,
    zdarzenie, wartosc,
    szczegoly: szczegoly || {},
    czas_trwania_s,
  })
  zaplanujFlush()
}

// ─── Hook śledzenia zakładek + czasu ──────────────────────────────────
// W App.jsx wystarczy: useTabAnalytics(user, tab)
export function useTabAnalytics(user, aktualnyTab) {
  const startRef = useRef(null)
  const poprzedniRef = useRef(null)

  useEffect(() => {
    if (!user?.id || !aktualnyTab) return

    const teraz = Date.now()

    // Zamknij poprzedni tab (zapisz czas)
    if (poprzedniRef.current && startRef.current) {
      const sekundy = Math.round((teraz - startRef.current) / 1000)
      if (sekundy >= 1 && sekundy < 3600) {
        // ignoruj sesje krótsze niż 1s (przeklikiwanie) i dłuższe niż godzina (zostawiona karta)
        sledz(user, 'tab_czas', poprzedniRef.current, {}, sekundy)
      }
    }

    // Otwórz nowy
    sledz(user, 'tab_view', aktualnyTab)
    poprzedniRef.current = aktualnyTab
    startRef.current = teraz

    return () => {
      // Cleanup przy unmount całego App — zapisz ostatnią sesję
      if (poprzedniRef.current && startRef.current) {
        const sek = Math.round((Date.now() - startRef.current) / 1000)
        if (sek >= 1 && sek < 3600) {
          sledz(user, 'tab_czas', poprzedniRef.current, {}, sek)
        }
      }
    }
  }, [user?.id, aktualnyTab])
}
