import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

/**
 * Zwraca aktualny household_id dla zalogowanego usera + pełną info o rodzinie.
 * Każdy zarejestrowany user MA household (trigger w bazie tworzy go automatycznie).
 *
 * Zwraca:
 *   householdId  – uuid aktywnego household
 *   household    – { id, nazwa, created_by, created_at }
 *   loading      – true podczas pierwszego ładowania
 *   refresh()    – wymuś przeładowanie (np. po akceptacji zaproszenia)
 */
export function useHousehold(user) {
  const [household, setHousehold] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick(k => k + 1), [])

  useEffect(() => {
    if (!user?.id) {
      setHousehold(null)
      setLoading(false)
      return
    }
    let anulowane = false

    async function pobierz() {
      setLoading(true)

      // 1. Znajdź household_id usera
      const { data: czlonek } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (anulowane) return

      if (!czlonek?.household_id) {
        // Backup — jakby trigger zawiódł, spróbuj utworzyć ręcznie
        // (zostawiamy null żeby wyłapać błąd w konsoli)
        console.warn('[useHousehold] Brak household dla usera', user.id)
        setHousehold(null)
        setLoading(false)
        return
      }

      // 2. Pobierz pełne info o household
      const { data: hh } = await supabase
        .from('households')
        .select('*')
        .eq('id', czlonek.household_id)
        .maybeSingle()

      if (anulowane) return
      setHousehold(hh)
      setLoading(false)
    }

    pobierz()
    return () => { anulowane = true }
  }, [user?.id, tick])

  return {
    householdId: household?.id ?? null,
    household,
    loading,
    refresh,
  }
}
