// Hook + helpery tygodniowej puli dań (tabela plan_tygodnia, tryb "Tydzień").
// Jeden wiersz = jedno danie wybrane na dany tydzień (unique household+tydzien+danie).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { formatDataLocal } from './dataHelpers'

// Poniedziałek bieżącego tygodnia + offset tygodni, jako 'YYYY-MM-DD'.
// Lustro tydzienZakupowZOffsetem z ListaZakupow.jsx — oba ekrany MUSZĄ zgadzać
// się co do granic tygodnia (niedziela należy do tygodnia od poprzedniego
// poniedziałku). formatDataLocal, nie toISOString — wieczorem UTC-shift
// przesunąłby datę o dzień.
export function poniedzialekTygodnia(offset = 0, teraz = new Date()) {
  const d = new Date(teraz)
  const day = d.getDay() // 0=nd, 6=sob
  const cofniecie = day === 0 ? 6 : Math.max(0, day - 1)
  d.setDate(d.getDate() - cofniecie + offset * 7)
  d.setHours(0, 0, 0, 0)
  return formatDataLocal(d)
}

// Polska etykieta zakresu tygodnia: "3–9 sierpnia" albo
// "28 lipca – 3 sierpnia" gdy tydzień łapie dwa miesiące.
export function zakresTygodniaLabel(offset = 0, teraz = new Date()) {
  const pon = poniedzialekTygodnia(offset, teraz)
  const [y, m, dzien] = pon.split('-').map(Number)
  const start = new Date(y, m - 1, dzien)
  const koniec = new Date(y, m - 1, dzien + 6)
  const pelna = (data) => data.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })
  if (start.getMonth() === koniec.getMonth()) {
    return `${start.getDate()}–${pelna(koniec)}`
  }
  return `${pelna(start)} – ${pelna(koniec)}`
}

// Czyste filtrowanie listy dań na ekranie Tydzień: chipy rodzajów
// (multi-select, OR w obrębie rodzajów), 'ulubione' jako dodatkowy warunek
// AND, szukajka po nazwie (bez wielkości liter).
export function filtrujDania(dania, { filtry = [], szukaj = '' } = {}) {
  const aktywneRodzaje = filtry.filter(f => f !== 'ulubione')
  const tylkoUlubione = filtry.includes('ulubione')
  const q = szukaj.trim().toLowerCase()

  return dania.filter(d => {
    if (tylkoUlubione && !d.ulubione) return false
    if (aktywneRodzaje.length > 0 && !aktywneRodzaje.includes(d.rodzaj)) return false
    if (q && !d.Danie.toLowerCase().includes(q)) return false
    return true
  })
}

// Pula dań na tydzień wskazany offsetem (0 = bieżący). Wszystkie akcje robią
// optimistic update na stanie lokalnym i rollback gdy zapis do bazy padnie.
export function useTydzien(householdId, user, offset = 0) {
  const [pula, setPula] = useState([])
  const [loading, setLoading] = useState(true)

  const tydzien = poniedzialekTygodnia(offset)

  const refresh = useCallback(async () => {
    if (!householdId) {
      setPula([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('plan_tygodnia')
      .select('*')
      .eq('household_id', householdId)
      .eq('tydzien', tydzien)
      .order('created_at')
    if (!error) setPula(data || [])
    setLoading(false)
  }, [householdId, tydzien])

  useEffect(() => {
    // Przez mikrotask — bez synchronicznego setState w ciele efektu
    // (react-hooks/set-state-in-effect), z guardem na szybkie zmiany tygodnia.
    let anulowane = false
    Promise.resolve().then(() => {
      if (!anulowane) refresh()
    })
    return () => { anulowane = true }
  }, [refresh])

  async function dodaj(danie) {
    if (!householdId || !user?.id || !danie) return
    if (pula.some(r => r.danie === danie)) return

    const tymczasowy = {
      id: `tmp_${Date.now()}`,
      household_id: householdId,
      user_id: user.id,
      tydzien,
      danie,
      porcje: 1,
    }
    setPula(prev => [...prev, tymczasowy])

    const { data, error } = await supabase
      .from('plan_tygodnia')
      .insert({ household_id: householdId, user_id: user.id, tydzien, danie, porcje: 1 })
      .select()
      .single()

    if (error) {
      // 23505 = unikalny duplikat (np. drugi domownik dodał równolegle) —
      // nie traktujemy jak błąd, po prostu dociągamy stan z bazy.
      if (error.code === '23505') {
        await refresh()
        return
      }
      setPula(prev => prev.filter(r => r.id !== tymczasowy.id))
      return
    }
    setPula(prev => prev.map(r => (r.id === tymczasowy.id ? data : r)))
  }

  async function usun(danie) {
    const wiersz = pula.find(r => r.danie === danie)
    if (!wiersz || !householdId) return

    setPula(prev => prev.filter(r => r.danie !== danie))

    const { error } = await supabase
      .from('plan_tygodnia')
      .delete()
      .eq('household_id', householdId)
      .eq('tydzien', tydzien)
      .eq('danie', danie)

    if (error) setPula(prev => [...prev, wiersz])
  }

  async function zmienPorcje(danie, delta) {
    const wiersz = pula.find(r => r.danie === danie)
    if (!wiersz || !householdId) return

    const stare = Number(wiersz.porcje) || 1
    // krok 0.5, minimum 0.5 — zaokrąglenie broni przed dryfem floatów
    const nowe = Math.max(0.5, Math.round((stare + delta) * 2) / 2)
    if (nowe === stare) return

    setPula(prev => prev.map(r => (r.danie === danie ? { ...r, porcje: nowe } : r)))

    const { error } = await supabase
      .from('plan_tygodnia')
      .update({ porcje: nowe })
      .eq('household_id', householdId)
      .eq('tydzien', tydzien)
      .eq('danie', danie)

    if (error) {
      setPula(prev => prev.map(r => (r.danie === danie ? { ...r, porcje: stare } : r)))
    }
  }

  return { pula, loading, tydzien, dodaj, usun, zmienPorcje, refresh }
}
