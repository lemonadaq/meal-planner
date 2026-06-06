# Menu Planer — brief dla Claude Code

Plik-instrukcja dla nowej sesji Claude Code. Cel: naprawić zapis edycji dania,
przywrócić generator planu tygodnia, dodać mapę podobieństwa dań (po składnikach)
oraz zaktualizować politykę prywatności i regulamin.

Aplikacja: **Menu Planer** (PWA do planowania posiłków dla rodzin, rynek PL).
Stack: React + Vite, Supabase (auth / PostgreSQL / Storage), hosting Vercel,
domena `menuplaner.pl`. Repo: `github.com/lemonadaq/meal-planner`.

---

## 0. Zanim zaczniesz — zasady (przeczytaj koniecznie)

- **Pracuj na realnych, aktualnych plikach z repo.** Nie zakładaj struktury z tego
  briefu jako pewnika — najpierw otwórz i przeczytaj rzeczywiste pliki, zweryfikuj
  nazwy kolumn, slotów i funkcji. Brief opisuje *intencję*, nie sztywne numery linii.
- **Oddawaj kompletne pliki gotowe do wklejenia**, nie diffy ani fragmenty.
- **Czekaj na akceptację Filipa przed każdym commitem/zapisem.**
- **Konwencje kodu (krytyczne):**
  - Wzorzec stylów: `function makeS() { return {…} }` wołany jako `const s = makeS()`
    **wewnątrz ciała komponentu**. Module-level stałe (`const mod`, `const SKLEP_*`)
    muszą zostać **poza** `makeS()` — inaczej TDZ i wywalony deploy.
  - PostgREST: kolumny z wielkimi literami referuj **bez wewnętrznych cudzysłowów** —
    `.eq('Danie', val)` ✅, `.eq('"Danie"', val)` ❌ (błąd `PGRST125`).
    `.select('*')` jest pewniejsze niż wyliczanie kolumn o mieszanej wielkości liter.
  - Mutacje household idą przez RPC `security definer`. Widoki: `security_invoker = false`.
  - Kolory/typografia tylko z tokenów w `theme.js` (paleta kremowo-terakotowa).
- **Sieć:** skrypty bijące po API (Anthropic, Replicate) muszą iść z prywatnego
  hotspotu — sieć firmowa blokuje je przez podmianę certyfikatu SSL. (Generator i
  mapa podobieństwa są **lokalne, bez API** — to nie dotyczy.)

---

## 1. NAPRAW: zapis edycji dania  ⟵ blokujące, zrób najpierw

**Objaw:** w szczegółach dania (`DanieDetail.jsx`) zmiana składników nie da się zapisać.

**Najbardziej prawdopodobna przyczyna:** zapytanie zapisu używa `.eq('"Danie"', …)`
z cudzysłowami w środku → PostgREST zwraca `PGRST125` i zapis pada. To dokładnie ten
sam bug, który był już raz naprawiany w tym pliku — mógł wrócić przy merge'u.

**Kroki:**
1. Otwórz `DanieDetail.jsx`, znajdź logikę zapisu (update/delete/insert wierszy w `dania`).
2. Sprawdź **wszystkie** odwołania do kolumny `Danie` w `.eq()`, `.update()`, `.match()`,
   `.order()` — mają być `.eq('Danie', …)` bez wewnętrznych cudzysłowów.
3. Pamiętaj, że tabela `dania` jest „długa": **jeden wiersz = jeden składnik**. Edycja
   składników dania = aktualizacja/usunięcie/wstawienie wielu wierszy filtrowanych po
   `Danie`. Sprawdź, czy logika poprawnie obsługuje dodanie i usunięcie składnika
   (nie tylko zmianę istniejącego).
4. Jeśli quoting jest OK, sprawdź RLS/RPC: czy zapis idzie przez właściwą politykę /
   `security definer` i czy user ma prawo edytować danie w swoim household.

**Kryterium akceptacji:** wchodzę w danie → zmieniam ilość składnika, dodaję nowy,
usuwam jeden → zapisuję → po odświeżeniu zmiany są w bazie. Brak `PGRST125` w konsoli.

---

## 2. PRZYWRÓĆ: generator planu tygodnia

Funkcja istniała wcześniej (`generatorPlanu.js`, `generujPlanTygodnia`) i wypadła z kodu.
Odtwórz ją + podłącz przycisk w Planerze.

**Sygnatura (intencja):**
```
generujPlanTygodnia({ dni, dniSlotyMap, dania, opcje }) → { [klucz_slotu]: nazwaDania }
```
- `klucz_slotu` w formacie `${dataISO}_${idSlotu}` (np. `2026-06-01_ob`) — zweryfikuj
  realny format kluczy używany przez `Kalendarz.jsx` / tabelę `kalendarz`.
- `opcje` zawiera m.in. `lubiane` (Set tagów), `wykluczone` (Set), zaczepy pod wagi uczenia.

**Warstwy algorytmu (lokalnie, bez API):**
1. baza — losowanie z puli dań pasujących do `rodzaj` danego slotu
   (`rodzaj`: `sniadanie`, `zupa`, `przekaska`, `kolacja`, `obiad`, `deser`, `dodatek`, `surowka`)
2. twarde filtry — wykluczenia → waga 0 (nigdy nie wpadają)
3. miękkie preferencje — lubiane tagi ×2 (większa szansa)
4. anty-powtórki w obrębie tygodnia (te same dania nie lecą pod rząd / zbyt często)
5. zaczep pod przyszłe wagi uczenia (na razie neutralny mnożnik = 1)

**UI / wpięcie:**
- Przycisk **„Wygeneruj plan tygodnia"** w Planerze (`Kalendarz.jsx`).
- Gdy część dni jest już zaplanowana → **dialog: „nadpisać wszystko / tylko puste sloty"**.
- Hook: pobierz `dania` + sloty (z `useSloty` / configu household, JSONB na `households`),
  zawołaj generator, **zapisz batch** do tabeli `kalendarz` dla wybranego tygodnia
  (`tydzienKalendarza` żyje w `App.jsx`).
- Dorzuć też „Wymień to danie" (regeneracja pojedynczego slotu) jeśli proste.

**Kryterium akceptacji:** pusty tydzień + klik „Wygeneruj" → sloty wypełnione sensownie,
wykluczenia nigdy nie wpadają, lubiane częściej, mała powtarzalność. Przy częściowo
zaplanowanym tygodniu dialog działa zgodnie z wyborem.

---

## 3. DODAJ: mapa podobieństwa dań (po składnikach)

To „drugi krok" generatora w wersji wykonalnej **już teraz** — bo nie wymaga danych od
userów (jest *content-based*, liczona ze składników, nie z zachowań).

**Jak:**
1. Zgrupuj wiersze `dania` po kolumnie `Danie` → dla każdego dania zbiór składników
   (kolumna `Składnik`, znormalizowana — użyj `skladniki_meta` jeśli jest kanon nazw).
2. Policz podobieństwo par dań — **Jaccard** na zbiorach składników:
   `sim(A,B) = |A∩B| / |A∪B|`. Opcjonalnie waż po kategorii (główne składniki ważniejsze
   niż przyprawy — przyprawy można pominąć, bo zaszumiają).
3. Funkcja `podobneDania(nazwa, dania, n=5)` → top-N najbardziej podobnych dań.

**Zastosowanie:** „wymień na podobne" w slocie, lepsze sugestie na Home, podpowiedzi
przy układaniu planu. Lokalnie, bez kosztu. Można policzyć raz i scache'ować.

**Kryterium akceptacji:** dla dania makaronowego top-N zwraca inne dania makaronowe/
o pokrywających się składnikach, a nie losowe.

---

## 4. (FUNDAMENT, NIE PEŁNE UCZENIE) — sygnały preferencji

**Nie buduj teraz algorytmu uczącego się z zachowań.** Powód: apka przed startem, realnie
dwoje userów — nie ma z czego się uczyć, „uczenie" na pustym zbiorze to losowanie w przebraniu.
To była świadoma decyzja: walidować prostą wersję, komplikować po feedbacku userów.

**Co MOŻNA zrobić teraz (tanio, na przyszłość):** zacznij **logować sygnały** — każda
podmiana/usunięcie/dodanie dania w planie to sygnał preferencji. Zapisuj je do prostej
tabeli (np. `preferencje_sygnaly`: user/household, danie, akcja, kontekst slotu, timestamp),
**ale jeszcze nie wykorzystuj** w algorytmie. Dzięki temu, gdy pojawią się userzy, dane już
będą się gromadzić. Wagi uczenia podłączysz do warstwy 5 generatora później.

---

## 5. ZAKTUALIZUJ: polityka prywatności + regulamin

Dokumenty (PL) istnieją w repo jako regulamin + polityka prywatności. Zaktualizuj je o to,
co zmieniło się od ich napisania. **To nie jest porada prawna** — to lista zmian do naniesienia;
Filip powinien przejrzeć całość przed publikacją.

**Delta do naniesienia:**
- **Domena / dane administratora:** aplikacja działa pod `menuplaner.pl`; zaktualizuj nazwę
  i adres kontaktowy (np. `kontakt@menuplaner.pl`).
- **Nowy sposób logowania:** oprócz Google OAuth doszło **logowanie e-mailem + hasłem**
  (hasła przechowuje i hashuje Supabase Auth), wpisywanie imienia, reset hasła.
- **Nowy procesor — wysyłka e-mail:** maile transakcyjne (potwierdzenie konta, reset hasła)
  wysyłane przez **Resend** (SMTP) z domeny `menuplaner.pl`. Dodaj Resend do listy podmiotów
  przetwarzających.
- **Lista procesorów (sprawdź kompletność):** Supabase (auth, baza, storage), Vercel (hosting),
  Resend (e-mail), Google (logowanie OAuth).
- **Zakres danych:** e-mail, imię (`full_name` w metadanych auth), przynależność do gospodarstwa
  domowego, zaplanowane posiłki, preferencje dań (jeśli wdrożone logowanie sygnałów — pkt 4).
- **Pamięć lokalna:** w `localStorage` trzymany jest wybór motywu (`motyw`) — wspomnij w sekcji
  o plikach/cookies/pamięci lokalnej.
- **Prawa użytkownika i kontakt:** zweryfikuj, że są aktualne (dostęp, usunięcie konta, kontakt).

**Kryterium akceptacji:** oba dokumenty wymieniają `menuplaner.pl`, logowanie e-mail/hasło,
Resend jako procesora i aktualną listę przetwarzających; nic nie wskazuje na starą nazwę/domenę.

---

## Ściąga: struktura danych

- **`dania`** — „długa", jeden wiersz = jeden składnik. Kolumny: `Danie`, `Składnik`,
  `Ilość na 1 porcję`, `Jednostka`, `Kategoria`, `Przepis`, `rodzaj`, `czas_minuty`,
  `porcje_bazowe`, `ulubione`, `zdjecie`, `TYP`. (Zweryfikuj w realnym schemacie/kodzie.)
- **`rodzaj`:** `sniadanie`, `zupa`, `przekaska`, `kolacja`, `obiad`, `deser`, `dodatek`, `surowka`.
- **Kategorie składników:** format `N_Nazwa`, np. `1_Warzywa i owoce`, `2_Mięso i ryby`,
  `3_Nabiał`, `7_Przyprawy`…
- **Tabele:** `dania`, `kalendarz`, `households`, `household_members`, `household_invites`,
  `ustawienia`, `zakupy_wlasne`, `skladniki_meta`, `skladniki_kcal`, `analytics`.
- **Sloty posiłków:** konfigurowalne, JSONB na `households`; hook `useSloty`.
- **Stan tygodnia:** `tydzienKalendarza` w `App.jsx`, przekazywany do `Kalendarz` i `ListaZakupow`.

---

## Sugerowana kolejność

1. Naprawa zapisu dania (pkt 1) — odblokowuje pracę.
2. Generator planu tygodnia (pkt 2) — przywrócenie podstawowej funkcji.
3. Mapa podobieństwa dań (pkt 3) — „drugi krok" w wersji wykonalnej teraz.
4. Logowanie sygnałów preferencji (pkt 4) — fundament, bez algorytmu.
5. Aktualizacja polityki prywatności i regulaminu (pkt 5).
