// Czy jest miejsce na układ szerszy niż telefonowy.
//
// Mierzymy SZEROKOŚĆ OKNA, nie rodzaj urządzenia. Rozpoznawanie po
// user-agencie („czy to telefon") psuje się natychmiast: tablet, telefon
// w poziomie, okno przeciągnięte na pół monitora, podzielony ekran na
// Androidzie. Szerokość zawsze mówi prawdę o tym, ile mamy miejsca.
//
// Styl apki siedzi w obiektach JS (`makeS()` w komponentach), a nie w CSS,
// więc `@media` do niego nie sięga — stąd wykrywanie po stronie JS.
// Wzorzec ten sam co przy motywie systemowym w `useUstawienia.js`:
// matchMedia + nasłuch 'change', dzięki czemu zmiana rozmiaru okna działa
// na żywo, bez przeładowania.

import { useCallback, useSyncExternalStore } from 'react'

// 900 px: poniżej tego dwie kolumny kart przepisów robią się węższe niż
// na telefonie i nic nie zyskujemy. Powyżej — zaczyna się marnować miejsce.
export const PROG_DUZY_EKRAN = 900

export function zapytanieODuzyEkran(prog = PROG_DUZY_EKRAN) {
  return `(min-width: ${prog}px)`
}

function brakMatchMedia() {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function'
}

// Odczyt bez Reacta — w środowisku bez `matchMedia` (stare WebView, test bez
// jsdom) zwracamy false, czyli układ telefonowy. To bezpieczniejsza strona
// pomyłki: wąski układ na szerokim ekranie jest tylko pusty, a szeroki na
// wąskim się rozjeżdża.
export function czyDuzyEkran(prog = PROG_DUZY_EKRAN) {
  if (brakMatchMedia()) return false
  return window.matchMedia(zapytanieODuzyEkran(prog)).matches
}

// useSyncExternalStore, a nie useState + useEffect: matchMedia to dokładnie
// „zewnętrzne źródło prawdy", pod które ten hook jest w Reakcie zrobiony.
// Przy useEffect trzeba by jeszcze ręcznie dosynchronizować stan, który mógł
// się zmienić między pierwszym renderem a podpięciem nasłuchu — tutaj React
// robi to sam.
export function useDuzyEkran(prog = PROG_DUZY_EKRAN) {
  const subskrybuj = useCallback((powiadom) => {
    if (brakMatchMedia()) return () => {}

    const mq = window.matchMedia(zapytanieODuzyEkran(prog))

    // Safari < 14 nie ma addEventListener na MediaQueryList — stąd fallback
    // na addListener. Capacitor na starszym iOS potrafi takie WebView mieć.
    if (mq.addEventListener) mq.addEventListener('change', powiadom)
    else mq.addListener(powiadom)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', powiadom)
      else mq.removeListener(powiadom)
    }
  }, [prog])

  const odczyt = useCallback(() => czyDuzyEkran(prog), [prog])

  // Trzeci argument to odczyt serwerowy. Apka jest czysto kliencka, ale
  // zostawiamy go jawnie: gdyby kiedyś doszedł prerender, ma wyjść układ
  // telefonowy, a nie wyjątek.
  return useSyncExternalStore(subskrybuj, odczyt, () => false)
}
