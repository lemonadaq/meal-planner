// Hook + helpery tygodniowej puli dań (tabela plan_tygodnia, tryb "Tydzień").
// Jeden wiersz = jedno danie wybrane na dany tydzień (unique household+tydzien+danie).

import { useCallback, useEffect, useRef, useState } from 'react'
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

// Ile tygodni do przodu da się zaplanować danie z widoku przepisu.
// Dalej niż miesiąc nikt realnie nie planuje, a lista przestaje się mieścić.
export const TYGODNIE_DO_WYBORU = [0, 1, 2, 3]

// Nazwa tygodnia dla offsetu: 0 = bieżący. Zakres dat dokłada
// zakresTygodniaLabel, bo samo „za 3 tygodnie" nic nie mówi.
export function etykietaTygodnia(offset) {
  if (offset === 0) return 'Ten tydzień'
  if (offset === 1) return 'Przyszły tydzień'
  return `Za ${offset} tygodnie`
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

// Nazwa własnego dania do dodania z szukajki (danie "bez przepisu" — sama
// nazwa, żadnych składników). Zwraca przyciętą frazę, o ile niepusta i ani
// żaden istniejący przepis, ani danie już wybrane w tym tygodniu (np. wcześniej
// dodane własne danie) nie nazywa się dokładnie tak samo (bez wielkości liter) —
// wtedy user powinien po prostu tapnąć istniejący wiersz / danie jest już w puli.
export function wlasneDanieZSzukajki(dania, szukaj, pula) {
  const nazwa = (szukaj || '').trim()
  if (!nazwa) return null
  const q = nazwa.toLowerCase()
  if ((dania || []).some(d => (d.Danie || '').toLowerCase() === q)) return null
  if ((pula || []).some(r => (r.danie || '').toLowerCase() === q)) return null
  return nazwa
}

// Pula dań na tydzień wskazany offsetem (0 = bieżący). Wszystkie akcje robią
// optimistic update na stanie lokalnym i rollback gdy zapis do bazy padnie.
export function useTydzien(householdId, user, offset = 0) {
  const [pula, setPula] = useState([])
  const [loading, setLoading] = useState(true)
  // Źródło prawdy dla porcji przy kolejnych szybkich zmianach — ref jest
  // aktualizowany synchronicznie w zmienPorcje, więc dwa kliknięcia +/- w
  // tym samym ticku (zanim React przerysuje `pula`) liczą się od siebie,
  // zamiast oba startować z tej samej "starej" wartości.
  const porcjeRef = useRef(new Map())
  // Debounce zapisu do bazy per danie: dwa niezależne zapytania UPDATE z
  // dwóch szybkich kliknięć mogą się wyścigowo nadpisać (wygrywa to, które
  // serwer przetworzy jako ostatnie, niekoniecznie to kliknięte jako
  // ostatnie) — więc do bazy leci tylko jeden zapis z finalną wartością.
  const zapisTimeryRef = useRef(new Map())
  // Dania właśnie dodawane (insert w locie) — `pula` ze stanu renderu nie
  // widzi jeszcze optimistic update z pierwszego kliknięcia, więc podwójny
  // szybki tap na to samo danie (typowy na telefonie) przechodziłby przez
  // guard dwa razy: dwa tymczasowe wiersze z tym samym kluczem `danie` w
  // liście (błąd Reacta o duplikacie klucza) i drugi INSERT kończący się
  // konfliktem unikalności w bazie.
  const dodawanieWTokuRef = useRef(new Set())

  const tydzien = poniedzialekTygodnia(offset)

  const refresh = useCallback(async () => {
    if (!householdId) {
      // householdId jeszcze się ładuje (useHousehold w App.jsx) — nie
      // wiemy, czy pula jest pusta, więc zostajemy w stanie ładowania
      // zamiast na chwilę pokazywać fałszywe "pusto".
      setPula([])
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

  useEffect(() => {
    porcjeRef.current = new Map(pula.map(r => [r.danie, Number(r.porcje) || 1]))
  }, [pula])

  useEffect(() => {
    // Sprzątanie oczekujących zapisów przy zmianie tygodnia / odmontowaniu —
    // nie chcemy dopisać porcji do już nieaktualnego tygodnia.
    const timery = zapisTimeryRef.current
    return () => {
      for (const wpis of timery.values()) clearTimeout(wpis.timer)
      timery.clear()
    }
  }, [tydzien])

  async function dodaj(danie) {
    if (!householdId || !user?.id || !danie) return
    if (pula.some(r => r.danie === danie)) return
    if (dodawanieWTokuRef.current.has(danie)) return
    dodawanieWTokuRef.current.add(danie)

    const tymczasowy = {
      id: `tmp_${Date.now()}`,
      household_id: householdId,
      user_id: user.id,
      tydzien,
      danie,
      porcje: 1,
    }
    setPula(prev => [...prev, tymczasowy])

    try {
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
    } finally {
      dodawanieWTokuRef.current.delete(danie)
    }
  }

  async function usun(danie) {
    const wiersz = pula.find(r => r.danie === danie)
    if (!wiersz || !householdId) return

    const oczekujacy = zapisTimeryRef.current.get(danie)
    if (oczekujacy) {
      clearTimeout(oczekujacy.timer)
      zapisTimeryRef.current.delete(danie)
    }

    setPula(prev => prev.filter(r => r.danie !== danie))

    const { error } = await supabase
      .from('plan_tygodnia')
      .delete()
      .eq('household_id', householdId)
      .eq('tydzien', tydzien)
      .eq('danie', danie)

    if (error) setPula(prev => [...prev, wiersz])
  }

  function zmienPorcje(danie, delta) {
    if (!householdId || !pula.some(r => r.danie === danie)) return

    // `stare` z porcjeRef, nie z domkniętego `pula` — dwa szybkie kliknięcia
    // w tym samym ticku React (automatic batching, `pula` jeszcze nie
    // przerysowana) inaczej startowałyby z tej samej "starej" wartości i
    // drugie kliknięcie ginęłoby bez śladu, także w zapisie do bazy.
    const stare = porcjeRef.current.get(danie) ?? 1
    // krok 0.5, minimum 0.5 — zaokrąglenie broni przed dryfem floatów
    const nowe = Math.max(0.5, Math.round((stare + delta) * 2) / 2)
    if (nowe === stare) return
    porcjeRef.current.set(danie, nowe)

    setPula(prev => prev.map(r => (r.danie === danie ? { ...r, porcje: nowe } : r)))

    // Debounce: kolejne kliknięcie w tym samym daniu przed upływem czasu
    // anuluje poprzedni zapis i startuje nowy — do bazy leci tylko ostatnia
    // wartość, więc zapisy z rozjechanych w czasie odpowiedzi sieciowych nie
    // mogą się nawzajem nadpisać w złej kolejności.
    const istniejacy = zapisTimeryRef.current.get(danie)
    if (istniejacy) clearTimeout(istniejacy.timer)
    const przedBurstem = istniejacy ? istniejacy.przedBurstem : stare

    const timer = setTimeout(async () => {
      zapisTimeryRef.current.delete(danie)
      const finalna = porcjeRef.current.get(danie)
      const { error } = await supabase
        .from('plan_tygodnia')
        .update({ porcje: finalna })
        .eq('household_id', householdId)
        .eq('tydzien', tydzien)
        .eq('danie', danie)

      if (error) {
        porcjeRef.current.set(danie, przedBurstem)
        setPula(prev => prev.map(r => (r.danie === danie ? { ...r, porcje: przedBurstem } : r)))
      }
    }, 400)

    zapisTimeryRef.current.set(danie, { timer, przedBurstem })
  }

  return { pula, loading, tydzien, dodaj, usun, zmienPorcje, refresh }
}
