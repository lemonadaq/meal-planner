# ZADANIE: Natywna aplikacja mobilna (Expo / React Native)

Cel: przepisać UI na React Native z Expo, zachowując webową wersję.
Logika biznesowa (hooki, Supabase, helpery) współdzielona przez monorepo.

---

## Faza 0 — Struktura ✅ ZROBIONE

- [x] Shared logic w `mobile/shared/` — skopiowane pliki bez JSX:
  `supabase.js` (SecureStore), `dataHelpers.js`, `useSloty.js`, `useHousehold.js`,
  `useGenerator.js`, `generatorPlanu.js`, `promocjeMatch.js`,
  `mapaPodobienstwa.js`, `wagiPreferencji.js`, `theme.js` (RN Appearance API)
- [x] Web app zostaje w root (bez zmian)
- [x] `mobile/` — nowy katalog Expo

---

## Faza 1 — Projekt Expo ✅ ZROBIONE

- [x] Expo 56 + React Native 0.85 zainstalowane w `mobile/`
- [x] Supabase z `expo-secure-store` (zamiast localStorage)
- [x] `expo-router` file-based routing z tab navigation
- [x] Theme z RN `Appearance` API (auto dark/light)
- [x] Auth guard (`hooks/useAuth.jsx`) z redirect do login/tabs
- [x] Ekran logowania (`app/login.jsx`)

---

## Faza 2 — Przepisanie ekranów (główna robota)

Każdy ekran = nowy komponent RN używający tych samych hooków co web.

- [x] **Nawigacja** — Tab bar (Home, Planer, Przepisy, Zakupy, Więcej) z Ionicons
- [x] **Home → index.jsx** — powitanie, plan dzisiaj/jutro, CTA planer, pull-to-refresh
- [~] **Kalendarz → planer.jsx** — widok tygodnia (kompaktowe wiersze), strip dni, nawigacja tygodniowa, usuwanie z Alert. Brakuje:
  - [ ] Widok dnia + galeria dań do wyboru
  - [ ] Drag & drop: `react-native-reanimated` + `react-native-gesture-handler`
  - [ ] Przycisk generatora planu
  - [ ] Przycisk 🔄 wymień danie
- [x] **Dania → przepisy.jsx** — FlatList grid 2 kolumny, wyszukiwarka z ✕. Brakuje:
  - [ ] Nawigacja do DanieDetail
  - [ ] Chipsy filtrów (rodzaj)
- [ ] **DanieDetail → przepis/[nazwa].jsx**
  - Składniki, kroki, edycja — formularze w `<ScrollView>`
  - Zdjęcie: `expo-image-picker` (natywny picker kamery/galerii)
- [ ] **DodajDanie → dodaj.jsx**
  - Formularz + upload zdjęcia
- [x] **ListaZakupow → zakupy.jsx** — SectionList z kategoriami, checkbox z haptic. Brakuje:
  - [ ] Promocje: chipy + szczegóły
  - [ ] Persistencja odznaczonych (AsyncStorage)
- [x] **Ustawienia → ustawienia.jsx** — konto, wyloguj. Brakuje:
  - [ ] Rodzina (członkowie, zaproszenia)
  - [ ] Konfiguracja slotów
  - [ ] Motyw (przełącznik jasny/ciemny/system)
- [ ] **KonfiguracjaSlotow → sloty.jsx**
  - Drag & drop reorder: `react-native-draggable-flatlist`

---

## Faza 3 — Natywne funkcje

- [ ] **Push notifications** — `expo-notifications` + Supabase Edge Function
- [ ] **Haptics** — `expo-haptics` (drag & drop, swipe, wymiana dania)
- [ ] **Camera** — `expo-image-picker` (zdjęcia dań)
- [ ] **Share** — `expo-sharing` (lista zakupów → WhatsApp/SMS)
- [ ] **Offline** — `@react-native-async-storage/async-storage` + cache planu/listy
- [ ] **Widgets** — (później) Android widget "Co dziś na obiad?"

---

## Faza 4 — Build i publikacja

- [ ] Konto Expo (darmowe do 30 buildów/mies.)
- [ ] `eas build --platform android` → AAB → Google Play
- [ ] `eas build --platform ios` → IPA → App Store Connect (bez Maca!)
- [ ] Konto Google Play Developer ($25 jednorazowo)
- [ ] Konto Apple Developer ($99/rok)
- [ ] Screenshoty, opis, polityka prywatności
- [ ] TestFlight (iOS beta) + Internal Testing (Android beta)
- [ ] Submission do review

---

## Faza 5 — CI/CD

- [ ] EAS Build na push do main (GitHub Actions)
- [ ] OTA updates przez `expo-updates` (drobne poprawki bez review sklepu)
- [ ] Automatyczne wersjonowanie

---

## Co zostaje bez zmian

- Cała webowa apka — działa jak dziś, osobny deploy
- Supabase — ten sam backend, te same tabele, te same RLS
- Logika biznesowa — useGenerator, useSloty, promocjeMatch — kopiowana 1:1
- Baza danych — zero migracji, natywna apka łączy się z tym samym Supabase

## Szacunki

- Faza 0+1 (setup): 1-2 dni
- Faza 2 (przepisanie UI): 2-3 tygodnie (Kalendarz ~1 tydzień, reszta prostsza)
- Faza 3 (natywne ficzery): 2-3 dni
- Faza 4 (build + sklepy): 1-2 dni + czas review Apple
