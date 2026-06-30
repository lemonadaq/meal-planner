// Helpery do formatowania dat — używaj zamiast .toISOString().split('T')[0],
// bo toISOString() konwertuje do UTC, co wieczorem w PL daje datę "dnia wcześniej".

// LOKALNA data w formacie YYYY-MM-DD
export function formatDataLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Skrót dla "dzisiaj"
export function dzisLocal() {
  return formatDataLocal(new Date())
}

// Czy data (obiekt Date) to dzisiaj?
export function isDzis(d) {
  return formatDataLocal(d) === dzisLocal()
}

// Domyślny aktywny dzień dla danego tygodnia (index 0=Pon … 6=Nd):
// bieżący tydzień (offset 0) → dzisiejszy dzień, inne tygodnie → poniedziałek.
export function domyslnyDzienTygodnia(tydzien, dzis = new Date()) {
  if (tydzien === 0) return (dzis.getDay() || 7) - 1
  return 0
}

// Decyzja efektu zmiany tygodnia w planerze: jaki ma być aktywny dzień.
// Kluczowe: przy pierwszym mountcie (powrót z widoku dania) ORAZ przy ręcznym
// wyborze daty NIE resetujemy dnia — zostaje ten zapamiętany. Dopiero realna
// zmiana tygodnia (strzałki ‹ ›) ustawia dzień domyślny.
// Zwraca { zachowaj: true, powod } gdy zostawić bez zmian, albo { dzien } do ustawienia.
export function decyzjaAktywnyDzien({ pierwszyMount, recznyWybor, tydzien, dzis = new Date() }) {
  if (pierwszyMount) return { zachowaj: true, powod: 'mount' }
  if (recznyWybor) return { zachowaj: true, powod: 'reczny' }
  return { dzien: domyslnyDzienTygodnia(tydzien, dzis) }
}
