# ZADANIE: Natywna aplikacja mobilna (Expo / React Native)

Cel: przepisać UI na React Native z Expo, zachowując webową wersję.
Logika biznesowa (hooki, Supabase, helpery) współdzielona przez monorepo.

---

## Faza 0 — Struktura monorepo

- [ ] Wynieść czystą logikę do `packages/shared/` — pliki bez JSX ani CSS:
  - `supabase.js`, `dataHelpers.js`, `useSloty.js`, `useHousehold.js`,
    `useGenerator.js`, `generatorPlanu.js`, `promocjeMatch.js`,
    `mapaPodobienstwa.js`, `wagiPreferencji.js`, `useUstawienia.js`
- [ ] `packages/web/` — obecna apka Vite (importuje z `@smakuje/shared`)
- [ ] `packages/mobile/` — nowy projekt Expo
- [ ] Narzędzie: npm workspaces

---

## Faza 1 — Nowy projekt Expo

- [ ] `npx create-expo-app packages/mobile`
- [ ] Podpiąć Supabase: `@supabase/supabase-js` (ten sam klient, bez zmian)
- [ ] Autentykacja: `expo-secure-store` do przechowywania tokena sesji (zamiast localStorage)
- [ ] Nawigacja: `expo-router` (file-based routing, analogicznie do ekranów w web)
- [ ] Motyw: przepisać `theme.js` na RN `StyleSheet` — te same tokeny kolorów

---

## Faza 2 — Przepisanie ekranów (główna robota)

Każdy ekran = nowy komponent RN używający tych samych hooków co web.

- [ ] **Nawigacja** — Tab bar (`expo-router` Tabs): Home, Planer, Przepisy, Zakupy, Ustawienia
- [ ] **Home → HomeScreen**
  - `<ScrollView>`, `<Text>`, sugestie dnia, "Inne danie" — te same hooki
- [ ] **Kalendarz → PlanerScreen** (największy ekran)
  - Widok tygodnia: `<FlatList>` z sekcjami per dzień
  - Widok dnia: `<ScrollView>` + kafelki dań
  - Galeria dań: `<FlatList numColumns={3}>`
  - Drag & drop: `react-native-reanimated` + `react-native-gesture-handler`
  - Kompaktowy/komfortowy toggle
- [ ] **Dania → PrzepisyScreen**
  - Lista przepisów: `<FlatList>` z `<Image>`
  - Filtrowanie/wyszukiwanie: `<TextInput>` + chipsy
- [ ] **DanieDetail → PrzepisDetailScreen**
  - Składniki, kroki, edycja — formularze w `<ScrollView>`
  - Zdjęcie: `expo-image-picker` (natywny picker kamery/galerii)
- [ ] **DodajDanie → DodajDanieScreen**
  - Formularz + upload zdjęcia
- [ ] **ListaZakupow → ZakupyScreen**
  - `<SectionList>` z kategoriami
  - Odznaczanie checkboxem — `<Pressable>` + stan
  - Promocje: `promocjeMatch` bez zmian
- [ ] **Rodzina → RodzinaScreen**
  - Członkowie, zaproszenia
- [ ] **Ustawienia → UstawieniaScreen**
  - Motyw, domyślne porcje, wylogowanie
- [ ] **KonfiguracjaSlotow → SlotyScreen**
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
