import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { applyTheme } from './theme'

// Rozwiązanie trybu 'system':
// matchMedia('(prefers-color-scheme: dark)') z nasłuchem 'change'.
// Wywołujemy applyTheme() przy każdej zmianie ustawienia lub preferencji systemu.
function resolveMotyw(motyw) {
  if (motyw === 'dark')  return 'dark'
  if (motyw === 'light') return 'light'
  // 'system' lub undefined
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useUstawienia(user) {
  const [ustawienia, setUstawienia] = useState({ domyslne_porcje: 1, motyw: 'system' })
  const [loading, setLoading] = useState(true)

  // Nasłuch systemowej preferencji — aktywny tylko gdy motyw === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      if (ustawienia.motyw === 'system' || !ustawienia.motyw) {
        applyTheme(mq.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [ustawienia.motyw])

  // Zastosuj motyw przy każdej zmianie ustawień
  useEffect(() => {
    // zapamiętaj wybór, żeby przy następnym starcie ustawić motyw synchronicznie
    // (theme.js czyta to przy imporcie → brak migotania)
    try { localStorage.setItem('motyw', ustawienia.motyw || 'system') } catch (e) { /* noop */ }
    applyTheme(resolveMotyw(ustawienia.motyw))
  }, [ustawienia.motyw])

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
        const { data: nowe } = await supabase
          .from('ustawienia')
          .insert({ id: user.id, domyslne_porcje: 1, motyw: 'system' })
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
