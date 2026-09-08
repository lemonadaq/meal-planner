import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { applyTheme, DOMYSLNY_MOTYW } from './theme'

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
  // motyw: null = jeszcze nie wiemy, co user ma zapisane. Do czasu odczytu z bazy
  // NIE ruszamy motywu ani localStorage — inaczej start apki nadpisywał zapisany
  // wybór wartością domyślną i motyw z theme.js migotał na systemowy.
  const [ustawienia, setUstawienia] = useState({ domyslne_porcje: 1, motyw: null })
  const [loading, setLoading] = useState(true)

  // Nasłuch systemowej preferencji — aktywny tylko gdy motyw === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      if (ustawienia.motyw === 'system') {
        applyTheme(mq.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [ustawienia.motyw])

  // Zastosuj motyw przy każdej zmianie ustawień
  useEffect(() => {
    if (!ustawienia.motyw) return   // jeszcze nie odczytane z bazy
    // zapamiętaj wybór, żeby przy następnym starcie ustawić motyw synchronicznie
    // (theme.js czyta to przy imporcie → brak migotania)
    try { localStorage.setItem('motyw', ustawienia.motyw) } catch (e) { /* noop */ }
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
        // Wiersz bez zapisanego motywu = user nigdy nie wybierał → domyślny.
        setUstawienia({ ...data, motyw: data.motyw || DOMYSLNY_MOTYW })
      } else if (!error) {
        const { data: nowe } = await supabase
          .from('ustawienia')
          .insert({ id: user.id, domyslne_porcje: 1, motyw: DOMYSLNY_MOTYW })
          .select()
          .single()
        if (!anulowane && nowe) setUstawienia({ ...nowe, motyw: nowe.motyw || DOMYSLNY_MOTYW })
      } else if (!anulowane) {
        // Nie udało się odczytać ustawień — nie zostawiaj motywu w zawieszeniu.
        setUstawienia(prev => ({ ...prev, motyw: DOMYSLNY_MOTYW }))
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
