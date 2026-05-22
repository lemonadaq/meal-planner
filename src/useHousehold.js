import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

/**
 * Zwraca aktualny household_id dla zalogowanego usera.
 * Jeśli user nie ma household, automatycznie go tworzy (idempotentnie,
 * przez RPC `utworz_moj_household`).
 *
 * Dzięki temu nie polegamy na triggerach Supabase ani backfillach —
 * household powstaje przy pierwszym wejściu do apki po zalogowaniu.
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

    async function pobierzLubUtworz() {
      setLoading(true)

      // Krok 1: spróbuj pobrać istniejący household
      const { data: czlonek } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (anulowane) return

      let hid = czlonek?.household_id

      // Krok 2: jeśli nie ma → wywołaj RPC żeby go utworzyć
      if (!hid) {
        const { data: nowyHid, error } = await supabase.rpc('utworz_moj_household')
        if (anulowane) return
        if (error) {
          console.error('[useHousehold] utworz_moj_household błąd:', error)
          setHousehold(null)
          setLoading(false)
          return
        }
        hid = nowyHid
      }

      // Krok 3: pobierz pełne dane household
      const { data: hh, error: hhError } = await supabase
        .from('households')
        .select('*')
        .eq('id', hid)
        .maybeSingle()

      if (anulowane) return

      if (hhError) {
        console.error('[useHousehold] błąd pobierania household:', hhError)
        setHousehold(null)
        setLoading(false)
        return
      }

      setHousehold(hh)
      setLoading(false)
    }

    pobierzLubUtworz()
    return () => { anulowane = true }
  }, [user?.id, tick])

  return {
    householdId: household?.id ?? null,
    household,
    loading,
    refresh,
  }
}
