// Helpery do pracy z konfiguracją slotów posiłków.
//
// Format konfiguracji w households.sloty:
// {
//   sloty: [
//     { id: 'sn', nazwa: 'Śniadanie', kolor: '#c45a32' },
//     { id: 'ob', nazwa: 'Obiad',     kolor: '#8c6432' },
//     ...
//   ],
//   dni: {
//     pon: ['sn', 'ob', 'kol'],
//     wt:  ['sn', 'ob', 'kol'],
//     ...
//   }
// }
//
// Zasady:
// - kalendarz.posilek przechowuje ID slotu (np. 'sn'), NIE nazwę
// - Slot można zmienić nazwę i kolor — wpisy nie tracą referencji bo ID stabilne
// - Slot można usunąć — wpisy z tym ID stają się "osierocone" (kalendarz je trzyma,
//   ale w UI ich nie pokazujemy bo dnia nie ma tego slotu w swojej konfiguracji).
//   W praktyce robimy DELETE wpisów przy usuwaniu slotu, ale ID może wystąpić
//   w `dni` różnych dni — usunięcie z UI jest per dzień, więc trzymamy.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'

// Konstans: domyślna konfiguracja (musi się zgadzać z SQL migracji!)
export const DEFAULT_SLOTY_CONFIG = {
  sloty: [
    { id: 'sn',  nazwa: 'Śniadanie', kolor: '#c45a32' },
    { id: 'ob',  nazwa: 'Obiad',     kolor: '#8c6432' },
    { id: 'kol', nazwa: 'Kolacja',   kolor: '#506e46' },
  ],
  dni: {
    pon: ['sn', 'ob', 'kol'],
    wt:  ['sn', 'ob', 'kol'],
    sr:  ['sn', 'ob', 'kol'],
    czw: ['sn', 'ob', 'kol'],
    pt:  ['sn', 'ob', 'kol'],
    sob: ['sn', 'ob', 'kol'],
    nd:  ['sn', 'ob', 'kol'],
  },
}

// Klucze dni tygodnia w kolejności pon-nd (zgodne z Date.getDay()-1 dla pon)
export const DNI_KLUCZE = ['pon', 'wt', 'sr', 'czw', 'pt', 'sob', 'nd']

export const DNI_LABELS = {
  pon: 'Poniedziałek',
  wt:  'Wtorek',
  sr:  'Środa',
  czw: 'Czwartek',
  pt:  'Piątek',
  sob: 'Sobota',
  nd:  'Niedziela',
}

// JavaScript Date.getDay(): 0=niedziela, 1=poniedziałek..., 6=sobota
// Nasze klucze: pon=0, wt=1, sr=2, czw=3, pt=4, sob=5, nd=6 (indeks w DNI_KLUCZE)
// Mapowanie: Date.getDay() -> klucz
const DOW_DO_KLUCZA = ['nd', 'pon', 'wt', 'sr', 'czw', 'pt', 'sob']

// Zwraca klucz dnia tygodnia dla obiektu Date lub stringa YYYY-MM-DD
export function kluczDnia(dataLubStr) {
  let d
  if (typeof dataLubStr === 'string') {
    // YYYY-MM-DD — parsujemy lokalnie żeby uniknąć UTC-shift
    const [y, m, day] = dataLubStr.split('-').map(Number)
    d = new Date(y, m - 1, day)
  } else {
    d = dataLubStr
  }
  return DOW_DO_KLUCZA[d.getDay()]
}

// ────────────────────────────────────────────────────────────────
//  Operacje na konfiguracji (zwracają nową, nie mutują)
// ────────────────────────────────────────────────────────────────

// Sanitacja: gwarantujemy że obiekt ma poprawną strukturę.
// Używamy jak fallback po pobraniu z bazy, żeby nigdy nie crashować na undefined.
export function sanityzuj(config) {
  if (!config || typeof config !== 'object') return DEFAULT_SLOTY_CONFIG
  const sloty = Array.isArray(config.sloty) ? config.sloty.filter(s => s && s.id && s.nazwa) : []
  const dni = config.dni && typeof config.dni === 'object' ? config.dni : {}
  const dniOk = {}
  for (const klucz of DNI_KLUCZE) {
    dniOk[klucz] = Array.isArray(dni[klucz]) ? dni[klucz].filter(Boolean) : []
  }
  return { sloty: sloty.length > 0 ? sloty : DEFAULT_SLOTY_CONFIG.sloty, dni: dniOk }
}

// Sloty w danym dniu (zwraca tablicę obiektów slotów w kolejności)
export function slotyWDniu(config, kluczDnia) {
  const c = sanityzuj(config)
  const ids = c.dni[kluczDnia] || []
  return ids
    .map(id => c.sloty.find(s => s.id === id))
    .filter(Boolean)
}

// Wszystkie unikalne sloty z całej konfiguracji (do galerii, list, etc.)
export function wszystkieSloty(config) {
  return sanityzuj(config).sloty
}

// Czy dany ID slotu istnieje w konfiguracji?
export function slotIstnieje(config, slotId) {
  return sanityzuj(config).sloty.some(s => s.id === slotId)
}

// Znajdź slot po ID
export function znajdzSlot(config, slotId) {
  return sanityzuj(config).sloty.find(s => s.id === slotId) || null
}

// Wygeneruj nowy unikalny ID slotu (krótki, czytelny)
export function nowySlotId(config) {
  const c = sanityzuj(config)
  const istniejace = new Set(c.sloty.map(s => s.id))
  // Próbuj 'slot_1', 'slot_2'... aż znajdziesz wolny
  for (let i = 1; i < 1000; i++) {
    const kandydat = `slot_${i}`
    if (!istniejace.has(kandydat)) return kandydat
  }
  // Fallback: timestamp
  return `slot_${Date.now()}`
}

// Domyślny kolor dla nowego slotu (rotacja z palety)
const PALETA_KOLOROW = [
  '#c45a32', // pomarańczowy (Śniadanie)
  '#8c6432', // brązowy (Obiad)
  '#506e46', // zielony (Kolacja)
  '#7c4a6e', // śliwkowy
  '#3a6e8c', // niebieski
  '#a8722e', // bursztyn
  '#5d5d8c', // fiolet stonowany
  '#6e4a3a', // ciemny brąz
]

export function nastepnyKolor(config) {
  const c = sanityzuj(config)
  const uzyte = new Set(c.sloty.map(s => s.kolor))
  for (const k of PALETA_KOLOROW) if (!uzyte.has(k)) return k
  // Wszystkie wykorzystane — random z palety
  return PALETA_KOLOROW[Math.floor(Math.random() * PALETA_KOLOROW.length)]
}

// ────────────────────────────────────────────────────────────────
//  Hook: useSloty
// ────────────────────────────────────────────────────────────────
// Zwraca:
//   - config: aktualną konfigurację (zawsze sanityzowana, nigdy null)
//   - zapisz(nowaConfig, opcje): zapis do bazy + optimistic update
//   - reload(): wymuszone odświeżenie z bazy
//   - loading: bool
//
// Realtime: subskrybujemy zmiany na households żeby drugi user widział
// edycje konfiguracji od razu (jak żona zmieni sloty, ty to widzisz).

export function useSloty(householdId) {
  const [config, setConfig] = useState(DEFAULT_SLOTY_CONFIG)
  const [loading, setLoading] = useState(true)

  const pobierz = useCallback(async () => {
    if (!householdId) {
      setConfig(DEFAULT_SLOTY_CONFIG)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('households')
      .select('sloty')
      .eq('id', householdId)
      .maybeSingle()

    if (!error && data) {
      setConfig(sanityzuj(data.sloty))
    } else {
      setConfig(DEFAULT_SLOTY_CONFIG)
    }
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    let anulowane = false
    pobierz()

    if (!householdId) return

    // Realtime: subskrybuj zmiany konkretnego household
    const kanal = supabase
      .channel(`household_sloty:${householdId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
        (payload) => {
          if (anulowane) return
          if (payload.new?.sloty) {
            setConfig(sanityzuj(payload.new.sloty))
          }
        }
      )
      .subscribe()

    return () => {
      anulowane = true
      supabase.removeChannel(kanal)
    }
  }, [householdId, pobierz])

  // Zapis — optimistic, potem update do bazy.
  // Jak update padnie, zwracamy się do stanu sprzed (ale to rzadko).
  const zapisz = useCallback(async (nowaConfig) => {
    if (!householdId) return { error: new Error('Brak household') }

    const sanit = sanityzuj(nowaConfig)
    const stary = config
    setConfig(sanit) // optimistic

    const { error } = await supabase
      .from('households')
      .update({ sloty: sanit })
      .eq('id', householdId)

    if (error) {
      console.error('[useSloty] błąd zapisu:', error)
      setConfig(stary) // rollback
      return { error }
    }
    return { error: null }
  }, [householdId, config])

  return { config, zapisz, reload: pobierz, loading }
}
