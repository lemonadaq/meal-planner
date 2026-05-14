import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

export function useUstawienia(user) {
  const [ustawienia, setUstawienia] = useState({ domyslne_porcje: 1 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let anulowane = false

    async function pobierz() {
      const { data, error } = await supabase
        .from('ustawienia')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (anulowane) return

      if (data) {
        setUstawienia(data)
      } else if (!error) {
        // Pierwszy raz — utwórz domyślne
        const { data: nowe } = await supabase
          .from('ustawienia')
          .insert({ id: user.id, domyslne_porcje: 1 })
          .select()
          .single()
        if (!anulowane && nowe) setUstawienia(nowe)
      }
      if (!anulowane) setLoading(false)
    }
    pobierz()

    return () => { anulowane = true }
  }, [user?.id])

  const zapisz = useCallback(async (zmiany) => {
    const nowe = { ...ustawienia, ...zmiany }
    setUstawienia(nowe) // optimistic
    await supabase
      .from('ustawienia')
      .upsert({ id: user.id, ...nowe, updated_at: new Date().toISOString() })
  }, [user?.id, ustawienia])

  return { ustawienia, zapisz, loading }
}
