import { useState, useRef, useCallback } from 'react'

// Generyczny undo: trzyma usunięty element, odlicza czas, zwraca akcje.
// Na razie NIEPODPIĘTY — Kalendarz używa własnego pokazToast(). Gotowy do
// użycia na innych ekranach (Dania, Lista zakupów itp.).
export function useUndo({ duration = 4500 } = {}) {
  const [toast, setToast] = useState(null)   // { id, label, payload } | null
  const snapshot = useRef(null)

  // wywołaj PO usunięciu z listy; payload = wszystko, co potrzebne do cofnięcia
  const show = useCallback((label, payload) => {
    snapshot.current = payload
    setToast({ id: Date.now(), label, payload })
  }, [])

  const undo = useCallback((onRestore) => {
    if (snapshot.current != null) onRestore?.(snapshot.current)
    snapshot.current = null
    setToast(null)
  }, [])

  const dismiss = useCallback(() => {
    snapshot.current = null
    setToast(null)
  }, [])

  return { toast, duration, show, undo, dismiss }
}
