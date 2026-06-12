// useGenerator.js
// Spina czystą logikę generatorPlanu z bazą: pobiera dania, buduje mapę slotów
// dla tygodnia, woła generator i zapisuje batch do kalendarza.

import { useCallback } from 'react'
import { supabase } from './supabase'
import { generujPlanTygodnia } from './generatorPlanu'
import { slotyWDniu, kluczDnia, sanityzuj } from './useSloty'
import { formatDataLocal } from './dataHelpers'
import { budujMapeSkladnikow } from './mapaPodobienstwa'
import { budujWagiUczenia } from './wagiPreferencji'

// Mapowanie rodzaju dania na słowa-klucze slotów (spójne z Home.jsx)
const RODZAJ_KEYWORDS = {
  sniadanie: ['śniadanie', 'sniadanie', 'breakfast', 'brunch'],
  obiad:     ['obiad', 'lunch'],
  kolacja:   ['kolacja', 'dinner', 'kolacj'],
  zupa:      ['zupa', 'soup'],
  deser:     ['deser', 'dessert'],
}

// Dla danego slotu (po nazwie) zgadnij jaki rodzaj dania pasuje
function rodzajDlaSlotu(nazwaSlotu) {
  const n = (nazwaSlotu || '').toLowerCase()
  for (const [rodzaj, keywords] of Object.entries(RODZAJ_KEYWORDS)) {
    if (keywords.some(k => n.includes(k))) return rodzaj
  }
  return null // brak dopasowania → generator użyje całej puli
}

export function useGenerator({ user, householdId, slotyConfig }) {

  // Główna funkcja generowania.
  // tryb: 'puste' = wypełnij tylko wolne sloty | 'wszystko' = nadpisz cały tydzień
  // dniTygodnia: tablica Date (7 dni od poniedziałku danego tygodnia)
  // istniejacyPlan: { [`${dataStr}_${slotId}`]: wpis } — co już jest
  const generuj = useCallback(async ({ dniTygodnia, istniejacyPlan = {}, tryb = 'puste', opcje = {} }) => {
    if (!householdId) return { error: 'Brak household' }

    // 1. Pobierz wszystkie wiersze dań (Składnik/Kategoria potrzebne do mapy podobieństwa)
    const { data: wiersze, error } = await supabase
      .from('dania')
      .select('"Danie", rodzaj, "TYP", zdjecie, ulubione, "Składnik", "Kategoria"')
    if (error) return { error }

    // Deduplikacja po nazwie (tabela ma wiele wierszy/składników na danie)
    const mapaDan = new Map()
    for (const w of wiersze || []) {
      if (!w.Danie || !w.rodzaj) continue
      if (!mapaDan.has(w.Danie)) mapaDan.set(w.Danie, w)
    }
    const dania = [...mapaDan.values()]

    // 1b. Pobierz sygnały preferencji i zbuduj wagi uczenia
    let uczenie = {}
    try {
      const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      const { data: sygnaly } = await supabase
        .from('preferencje_sygnaly')
        .select('danie, akcja, created_at')
        .eq('household_id', householdId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(2000)
      const mapaSkladnikow = budujMapeSkladnikow(wiersze || [])
      uczenie = budujWagiUczenia({ sygnaly: sygnaly || [], mapaSkladnikow })
    } catch (e) {
      // Preferencje to wzmocnienie, nigdy blokada — generuj normalnie przy błędzie
    }

    // 2. Zbuduj strukturę dni + slotów dla generatora
    const cfg = sanityzuj(slotyConfig)
    const dni = dniTygodnia.map(d => ({ klucz: kluczDnia(d), dataStr: formatDataLocal(d) }))

    const dniSlotyMap = {}
    for (const d of dniTygodnia) {
      const klucz = kluczDnia(d)
      const sloty = slotyWDniu(cfg, klucz).map(s => ({
        id: s.id,
        nazwa: s.nazwa,
        rodzajDopasowany: rodzajDlaSlotu(s.nazwa),
      }))
      dniSlotyMap[klucz] = sloty
    }

    // 3. Jeśli tryb 'puste' — przekaż istniejące dania jako już "użyte" + pomiń zajęte sloty
    const opcjeZUczeniem = { ...opcje, uczenie: { ...uczenie, ...(opcje.uczenie || {}) } }
    let planSurowy = generujPlanTygodnia({ dni, dniSlotyMap, dania, opcje: opcjeZUczeniem })

    // 4. Złóż listę wpisów do zapisania
    const doInsertu = []
    const doUsuniecia = []

    for (const [klucz, nazwaDania] of Object.entries(planSurowy)) {
      const sep = klucz.indexOf('_')
      const dataStr = klucz.slice(0, sep)
      const slotId = klucz.slice(sep + 1)
      const istnieje = istniejacyPlan[klucz]

      if (tryb === 'puste' && istnieje?.danie) {
        continue // nie ruszaj zajętego slotu
      }
      if (istnieje?.id) {
        doUsuniecia.push(istnieje.id) // nadpisujemy: usuń stary, wstaw nowy
      }
      doInsertu.push({
        household_id: householdId,
        user_id: user.id,
        data: dataStr,
        posilek: slotId,
        danie: nazwaDania,
        dodatki: [],
      })
    }

    // 5. Zapisz do bazy
    if (doUsuniecia.length > 0) {
      await supabase.from('kalendarz').delete().in('id', doUsuniecia)
    }
    let utworzone = []
    if (doInsertu.length > 0) {
      const { data, error: insErr } = await supabase
        .from('kalendarz')
        .insert(doInsertu)
        .select()
      if (insErr) return { error: insErr }
      utworzone = data || []
    }

    return { utworzone, ileDodano: doInsertu.length }
  }, [user, householdId, slotyConfig])

  // Regeneruj pojedynczy slot ("wymień to danie" / "daj inne")
  const wymienDanie = useCallback(async ({ dataStr, slotId, nazwaSlotu, wpisId, unikaj = [], opcje = {} }) => {
    if (!householdId) return { error: 'Brak household' }

    const { data: wiersze } = await supabase
      .from('dania')
      .select('"Danie", rodzaj, "TYP", "Składnik", "Kategoria"')
    const mapaDan = new Map()
    for (const w of wiersze || []) {
      if (w.Danie && w.rodzaj && !mapaDan.has(w.Danie)) mapaDan.set(w.Danie, w)
    }
    const rodzaj = rodzajDlaSlotu(nazwaSlotu)
    const pula = [...mapaDan.values()].filter(d => d.rodzaj === rodzaj && !unikaj.includes(d.Danie))
    if (pula.length === 0) return { error: 'Brak alternatyw' }

    let uczenie = {}
    try {
      const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      const { data: sygnaly } = await supabase
        .from('preferencje_sygnaly')
        .select('danie, akcja, created_at')
        .eq('household_id', householdId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(2000)
      const mapaSkladnikow = budujMapeSkladnikow(wiersze || [])
      uczenie = budujWagiUczenia({ sygnaly: sygnaly || [], mapaSkladnikow })
    } catch (e) {
      // Preferencje to wzmocnienie, nigdy blokada
    }

    const dni = [{ klucz: kluczDnia(dataStr), dataStr }]
    const dniSlotyMap = { [kluczDnia(dataStr)]: [{ id: slotId, nazwa: nazwaSlotu, rodzajDopasowany: rodzaj }] }
    const opcjeZUczeniem = { ...opcje, uczenie: { ...uczenie, ...(opcje.uczenie || {}) } }
    const plan = generujPlanTygodnia({ dni, dniSlotyMap, dania: pula, opcje: opcjeZUczeniem })
    const nowa = plan[`${dataStr}_${slotId}`]
    if (!nowa) return { error: 'Nie wylosowano' }

    if (wpisId) {
      await supabase.from('kalendarz').update({ danie: nowa, dodatki: [], podmiany: {} }).eq('id', wpisId)
    } else {
      const { data } = await supabase.from('kalendarz')
        .insert({ household_id: householdId, user_id: user.id, data: dataStr, posilek: slotId, danie: nowa, dodatki: [] })
        .select().single()
      return { nowaNazwa: nowa, wpis: data }
    }
    return { nowaNazwa: nowa }
  }, [user, householdId])

  return { generuj, wymienDanie }
}
