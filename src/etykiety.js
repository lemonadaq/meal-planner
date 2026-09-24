// Etykiety pokazywane użytkownikowi dla wartości technicznych z bazy.
//
// Wartości w bazie są bez ogonków i bez emoji (`wloska`, `latwe`) — zamknięta
// lista pilnowana jest tam, gdzie dane powstają, czyli w schemacie przepisu
// w skrypty/wspolne.js. Tutaj jest wyłącznie warstwa wyświetlania.
//
// Wspólny plik, bo te same etykiety potrzebne są na kilku ekranach naraz:
// filtry w Przepisach, chipy w podglądzie przepisu, lista na ekranie Tydzień.

// Kolejność ma znaczenie — po niej układają się chipy filtrów, więc polska
// i włoska stoją z przodu, a „międzynarodowa" na końcu jako worek na resztę.
export const KUCHNIA_LABEL = {
  polska: '🇵🇱 Polska', wloska: '🇮🇹 Włoska', francuska: '🇫🇷 Francuska',
  hiszpanska: '🇪🇸 Hiszpańska', grecka: '🇬🇷 Grecka', niemiecka: '🇩🇪 Niemiecka',
  wegierska: '🇭🇺 Węgierska', ukrainska: '🇺🇦 Ukraińska',
  amerykanska: '🇺🇸 Amerykańska', meksykanska: '🇲🇽 Meksykańska',
  koreanska: '🇰🇷 Koreańska', japonska: '🇯🇵 Japońska', chinska: '🇨🇳 Chińska',
  tajska: '🇹🇭 Tajska', wietnamska: '🇻🇳 Wietnamska', indyjska: '🇮🇳 Indyjska',
  bliskowschodnia: '🥙 Bliski Wschód', turecka: '🇹🇷 Turecka',
  afrykanska: '🌍 Afrykańska', miedzynarodowa: '🌐 Międzynarodowa',
}

export const POZIOM_LABEL = { latwe: '🟢 Łatwe', srednie: '🟡 Średnie', trudne: '🔴 Trudne' }

export const RODZAJ_LABEL = {
  sniadanie: 'Śniadanie', obiad: 'Obiad', kolacja: 'Kolacja',
  zupa: 'Zupa', deser: 'Deser',
  przekaska: 'Przekąska', dodatek: 'Dodatek', surowka: 'Surówka',
}
