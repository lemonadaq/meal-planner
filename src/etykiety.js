// Etykiety pokazywane użytkownikowi dla wartości technicznych z bazy.
//
// Wartości w bazie są bez ogonków i bez emoji (`wloska`, `latwe`) — zamknięta
// lista pilnowana jest tam, gdzie dane powstają, czyli w schemacie przepisu
// w skrypty/wspolne.js. Tutaj jest wyłącznie warstwa wyświetlania.
//
// Wspólny plik, bo te same etykiety potrzebne są na kilku ekranach naraz:
// filtry w Przepisach, chipy w podglądzie przepisu, formularze dania.

// Zamknięta lista kuchni (czyszczenie bazy 2026-11-14). Kolejność ma
// znaczenie — po niej układa się lista w filtrze i w formularzu, więc polska
// i włoska stoją z przodu, a „międzynarodowa" na końcu jako worek na resztę.
export const KUCHNIE = [
  'polska', 'wloska', 'francuska', 'hiszpanska', 'portugalska', 'grecka', 'turecka',
  'bliskowschodnia', 'indyjska', 'chinska', 'japonska', 'koreanska', 'tajska',
  'wietnamska', 'meksykanska', 'amerykanska', 'brytyjska', 'niemiecka', 'wegierska',
  'wschodnioeuropejska', 'brazylijska', 'marokanska', 'miedzynarodowa',
]

const FLAGA = {
  polska: '🇵🇱', wloska: '🇮🇹', francuska: '🇫🇷', hiszpanska: '🇪🇸', portugalska: '🇵🇹',
  grecka: '🇬🇷', turecka: '🇹🇷', bliskowschodnia: '🥙', indyjska: '🇮🇳', chinska: '🇨🇳',
  japonska: '🇯🇵', koreanska: '🇰🇷', tajska: '🇹🇭', wietnamska: '🇻🇳', meksykanska: '🇲🇽',
  amerykanska: '🇺🇸', brytyjska: '🇬🇧', niemiecka: '🇩🇪', wegierska: '🇭🇺',
  wschodnioeuropejska: '🥟', brazylijska: '🇧🇷', marokanska: '🇲🇦', miedzynarodowa: '🌐',
  // Wartości sprzed czyszczenia 2026-11 — w bazie już ich nie ma, ale stary
  // plik supabase/fixes/20260924-kuchnie-i-poziomy.sql nadal ich używa.
  ukrainska: '🇺🇦', afrykanska: '🌍',
}

const NAZWA = {
  polska: 'Polska', wloska: 'Włoska', francuska: 'Francuska', hiszpanska: 'Hiszpańska',
  portugalska: 'Portugalska', grecka: 'Grecka', turecka: 'Turecka',
  bliskowschodnia: 'Bliski Wschód', indyjska: 'Indyjska', chinska: 'Chińska',
  japonska: 'Japońska', koreanska: 'Koreańska', tajska: 'Tajska', wietnamska: 'Wietnamska',
  meksykanska: 'Meksykańska', amerykanska: 'Amerykańska', brytyjska: 'Brytyjska',
  niemiecka: 'Niemiecka', wegierska: 'Węgierska', wschodnioeuropejska: 'Wschodnioeuropejska',
  brazylijska: 'Brazylijska', marokanska: 'Marokańska', miedzynarodowa: 'Międzynarodowa',
  ukrainska: 'Ukraińska', afrykanska: 'Afrykańska',
}

export const KUCHNIA_FLAGA = FLAGA
export const KUCHNIA_NAZWA = NAZWA
export const KUCHNIA_LABEL = Object.fromEntries(
  Object.keys(NAZWA).map(k => [k, `${FLAGA[k]} ${NAZWA[k]}`])
)

export const POZIOMY = ['latwe', 'srednie', 'trudne']
export const POZIOM_LABEL = { latwe: '🟢 Łatwe', srednie: '🟡 Średnie', trudne: '🔴 Trudne' }
export const POZIOM_KROPKA = { latwe: '🟢', srednie: '🟡', trudne: '🔴' }

// Przedziały filtra kalorii (kcal na porcję). Górna granica rozłączna:
// 400 kcal to już „400–700".
export const KCAL_PRZEDZIALY = [
  { id: 'do400', label: '🔥 do 400', od: 0, do: 400 },
  { id: '400-700', label: '🔥 400–700', od: 400, do: 700 },
  { id: '700+', label: '🔥 700+', od: 700, do: Infinity },
]

export function kcalWPrzedziale(kcal, id) {
  const p = KCAL_PRZEDZIALY.find(x => x.id === id)
  if (!p) return true
  const k = Number(kcal)
  return Number.isFinite(k) && k > 0 && k >= p.od && k < p.do
}

export const RODZAJ_LABEL = {
  sniadanie: 'Śniadanie', obiad: 'Obiad', kolacja: 'Kolacja',
  zupa: 'Zupa', deser: 'Deser',
  przekaska: 'Przekąska', dodatek: 'Dodatek', surowka: 'Surówka',
}
