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
- [~] **Kalendarz → planer.jsx** — widok tygodnia (kompaktowe wiersze), strip dni, nawigacja tygodniowa, usuwanie z Alert, generator planu, 🔄 wymień danie, dish picker modal (tap "+" → filtrowana galeria → tap = przypisz danie). Brakuje:
  - [ ] Drag & drop: `react-native-reanimated` + `react-native-gesture-handler`
- [x] **Dania → przepisy.jsx** — FlatList grid 2 kolumny, wyszukiwarka z ✕, chipsy filtrów (rodzaj), nawigacja do detail, FAB dodaj danie
- [x] **DanieDetail → przepis/[nazwa].jsx** — hero image/emoji, chipki (rodzaj, TYP, czas), lista składników, kroki przygotowania, ulubione toggle, share, delete
  - [ ] Edycja inline (nazwa, rodzaj, składniki)
- [x] **DodajDanie → dodaj.jsx** — formularz z nazwą, rodzaj, typ, czas, składniki, przepis, zdjęcie (aparat/galeria via expo-image-picker), upload do Supabase Storage
- [x] **ListaZakupow → zakupy.jsx** — SectionList z kategoriami, checkbox z haptic, AsyncStorage persistencja kupionych, "Wyczyść ✓". Brakuje:
  - [ ] Promocje: chipy + szczegóły
- [x] **Ustawienia → ustawienia.jsx** — konto, wyloguj, motyw (systemowy/jasny/ciemny z AsyncStorage), nawigacja do Rodzina i Sloty
- [x] **Rodzina → rodzina.jsx** — lista członków, zaproszenia, akceptuj/odrzuć, zaproś nowego, opuść rodzinę
- [x] **KonfiguracjaSlotow → sloty.jsx** — lista slotów per dzień, dodawanie nowych, usuwanie z dnia, dodawanie istniejących, kopiowanie dnia. Brakuje:
  - [ ] Drag & drop reorder: `react-native-draggable-flatlist`

---

## Faza 3 — Natywne funkcje

- [ ] **Push notifications** — `expo-notifications` + Supabase Edge Function
- [x] **Haptics** — `expo-haptics` (wymiana dania, usuwanie, zakupy, konfiguracja slotów)
- [x] **Camera** — `expo-image-picker` (zdjęcia dań w dodaj.jsx)
- [ ] **Share** — `expo-sharing` (lista zakupów → WhatsApp/SMS)
- [ ] **Offline** — `@react-native-async-storage/async-storage` + cache planu/listy
- [ ] **Widgets** — (później) Android widget "Co dziś na obiad?"

---

## Faza 4 — Build i publikacja

### Jak zbudować APK (krok po kroku):
```bash
cd mobile

# 1. Załóż konto Expo (darmowe) na expo.dev
npx eas login

# 2. Build APK (preview) — buduje w chmurze, ściągasz plik
eas build --platform android --profile preview

# 3. (Opcjonalnie) Build AAB dla Google Play
eas build --platform android --profile production

# 4. iOS build (wymaga Apple Developer $99/rok)
eas build --platform ios --profile production
```

- [x] eas.json — skonfigurowany (development APK, preview APK, production AAB)
- [x] app.json — bundleIdentifier, permissions, splash
- [x] Placeholder assets (zastąpić właściwymi ikonami przed publikacją)
- [ ] Konto Expo (darmowe do 30 buildów/mies.) — **Filip musi założyć i zalogować się**
- [ ] Właściwe ikony: icon.png (1024×1024), adaptive-icon.png (1024×1024), splash.png (1284×2778)
- [ ] `eas build --platform android --profile preview` → APK na telefon
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
