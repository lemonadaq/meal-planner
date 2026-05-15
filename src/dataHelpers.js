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
