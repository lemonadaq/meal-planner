# Menu Planer — warstwa preferencji w generatorze planu

Plik-instrukcja dla sesji Claude Code. Cel: podłączyć **wagi uczenia** do generatora
planu tygodnia — zliczanie sygnałów z `preferencje_sygnaly` + **propagacja przez mapę
podobieństwa** (Jaccard). Wdrażamy od razu pełną wersję, bo przy braku danych degraduje
się do obecnego losowania (mnożnik 1 dla wszystkiego) — niczego nie psuje w dniu zero.

Aplikacja: **Menu Planer** (PWA do planowania posiłków dla rodzin, rynek PL).
Stack: React + Vite, Supabase (auth / PostgreSQL / Storage), hosting Vercel.
Repo: `github.com/lemonadaq/meal-planner`.

---

## 0. Zanim zaczniesz — zasady (przeczytaj koniecznie)

- **Pracuj na realnych, aktualnych plikach z repo.** Brief opisuje intencję — najpierw
  otwórz i przeczytaj rzeczywiste pliki, zweryfikuj nazwy kolumn i funkcji.
- **Oddawaj kompletne pliki gotowe do wklejenia**, nie diffy. Waliduj esbuildem.
- **Czekaj na akceptację Filipa przed każdym commitem/zapisem.** Git/deploy robi Filip.
- **Konwencje kodu (krytyczne):**
  - `makeS()` wołane **wewnątrz ciała komponentu**; module-level stałe poza `makeS()`
    (inaczej TDZ i wywalony deploy na Vercelu).
  - PostgREST: `.eq('Danie', val)` ✅, `.eq('"Danie"', val)` ❌ (`PGRST125`).
    `.select('*')` pewniejsze niż wyliczanie kolumn o mieszanej wielkości liter.
  - Mutacje household przez RPC `security definer`.
- **Wszystko lokalnie, bez API** — czysta logika JS, łatwa do testowania.

## Co już istnieje (fundament — NIE buduj od nowa)

| Element | Plik | Stan |
|---|---|---|
| Generator planu (model wag, warstwy) | `generatorPlanu.js` | działa; ma gotowy zaczep `uczenie = { [nazwaDania]: mnożnik }` w `wagaDania()` |
| Spięcie z bazą i kalendarzem | `useGenerator.js` | działa; tu trzeba dodać pobieranie sygnałów i budowę `uczenie` |
| Mapa podobieństwa (Jaccard po składnikach) | `mapaPodobienstwa.js` | działa; `budujMapeSkladnikow()`, `podobneDania()` — pomija kategorię `7_Przyprawy` |
| Logowanie sygnałów | `logujSygnaly.js` + wywołania w `Kalendarz.jsx` | działa; zapisuje do `preferencje_sygnaly` (akcje: `zaplanuj` / `usun` / `przenies` / `podmien`) |

Czyli zadanie = **nowy moduł liczący wagi** + **wpięcie w `useGenerator.js`** +
ewentualne uzupełnienie logowania sygnałów.

---

## 1. ZWERYFIKUJ: kompletność logowania sygnałów

Zanim policzysz wagi, upewnij się, że sygnały rzeczywiście wpadają przy każdej
istotnej akcji. Sprawdź wywołania `logujSygnal()` w kodzie:

- [ ] **`zaplanuj`** — ręczne dodanie dania do slotu (z galerii dnia / z przepisu).
- [ ] **`usun`** — usunięcie dania z planu.
- [ ] **`podmien`** — wymiana dania w slocie. **Ważne:** podmiana to DWA sygnały —
      danie wychodzące (negatywny) i wchodzące (pozytywny). Jeśli obecnie logowany
      jest tylko jeden, rozszerz: albo dwa wiersze (`podmien_out` / `podmien_in`),
      albo kolumna z daniem zastępującym. Wybierz prostsze; zaktualizuj komentarz
      z migracją SQL w `logujSygnaly.js`, jeśli zmieniasz schemat.
- [ ] **`przenies`** — przeniesienie między slotami/dniami (sygnał neutralny,
      waga 0 w scoringu — ale loguj dalej, może się przydać).
- [ ] Sygnał z **generatora**: gdy plan wygenerowany automatycznie i danie zostało
      (nie wymienione/usunięte przez tydzień) — to *implicit akcept*. **Nie loguj tego
      osobno** — wyliczalne później z `kalendarz` + sygnałów. Nie komplikuj.

**Uwaga RLS:** polityka na `preferencje_sygnaly` to obecnie `user_id = auth.uid()`.
Do liczenia wag potrzebny **odczyt wszystkich sygnałów household** (profil jest
rodzinny, nie osobisty). Dodaj politykę SELECT po `household_id` dla członków
gospodarstwa (wzorzec jak przy innych tabelach household — sprawdź jak robi to
`kalendarz`). Zapis zostaje po `user_id`.

---

## 2. DODAJ: moduł `wagiPreferencji.js` (czysta logika, bez React/Supabase)

Wzorzec jak `generatorPlanu.js` — czyste funkcje, testowalne.

### 2a. Scoring bazowy (per danie)

Wejście: tablica sygnałów `[{ danie, akcja, created_at }]` (już pobranych dla household).

**Wagi akcji (stałe na górze modułu, łatwe do strojenia):**

```
zaplanuj      +1.0
podmien_in    +1.5   (aktywny wybór zamiast czegoś — najsilniejszy sygnał pozytywny)
podmien_out   −1.5   (aktywne odrzucenie)
usun          −1.0
przenies       0     (neutralny)
```

**Wygaszanie w czasie (recency decay):** każdy sygnał mnożony przez
`0.5 ^ (wiekDni / 60)` — półrocze życia sygnału to 60 dni. Stała `HALF_LIFE_DNI = 60`
na górze modułu. Dzięki temu profil nadąża za zmianami gustów (sezonowość, dzieci).

**Surowy score dania** = suma (waga akcji × decay) po wszystkich jego sygnałach.

### 2b. Propagacja przez podobieństwo

Użyj istniejącej mapy z `mapaPodobienstwa.js`:

1. Zbuduj mapę składników raz: `budujMapeSkladnikow(wierszeDan)`.
2. Dla każdego dania D z niezerowym surowym score: rozlej część score na dania
   podobne: `bonus(X) += score(D) × sim(D, X) × ALFA`, gdzie `ALFA = 0.5`
   (stała do strojenia). Propaguj tylko tam, gdzie `sim > PROG` (np. `PROG = 0.2`),
   żeby nie rozlewać szumu na całą bazę.
3. **Jeden krok propagacji, nie iteruj** (bez łańcuszków D→X→Y).
4. `scoreKoncowy(X) = scoreSurowy(X) + bonusPropagacji(X)`.

Wydajność: baza ma rzędu setek dań — pełna pętla par jest OK, ale licz mapę
podobieństwa **raz na wywołanie generatora** i przekazuj jako argument (nie buduj
w pętli). Bez cache między sesjami na razie.

### 2c. Konwersja score → mnożnik dla generatora

Score może być dowolną liczbą (też ujemną) — generator oczekuje **mnożnika > 0**
(albo 0 = nigdy). Zmapuj łagodnie i z ograniczeniami:

```
mnoznik(score) = clamp( 1 + TEMPO × tanh(score / SKALA), MIN, MAX )
```

ze stałymi startowymi: `TEMPO = 1.0`, `SKALA = 3`, `MIN = 0.25`, `MAX = 3.0`.

Własności (to są **wymagania**, nie sugestie):
- `score = 0` → mnożnik dokładnie `1` → **cold start = obecne zachowanie, bit w bit**.
- Bardzo lubiane danie max ×3 — nie zdominuje planu, anty-powtórki dalej działają.
- Nielubiane min ×0.25, **nigdy 0** — miękka kara, nie bana. Twarde wykluczenia
  to osobna, istniejąca warstwa (`wykluczone`) i tak ma zostać.

Eksport modułu (intencja, nazwy doprecyzuj):

```
budujWagiUczenia({ sygnaly, mapaSkladnikow }) → { [nazwaDania]: mnożnik }
```

Plus eksport funkcji składowych do testów.

### 2d. Mini-testy (w komentarzu lub osobnym pliku, jak wygodniej)

- pusta tablica sygnałów → pusty obiekt (lub wszystkie mnożniki 1) → generator
  działa identycznie jak dziś,
- 3× `podmien_out` na "Ryba po grecku" → mnożnik wyraźnie < 1,
- 3× `zaplanuj` na "Spaghetti bolognese" → mnożnik > 1 **i** podobna "Lasagne"
  też > 1 (propagacja działa),
- sygnał sprzed 180 dni waży ~1/8 świeżego.

---

## 3. WEPNIJ: `useGenerator.js`

1. Przed wywołaniem `generujPlanTygodnia` pobierz sygnały household:
   `select * from preferencje_sygnaly where household_id = … ` — ogranicz zakres,
   np. ostatnie **180 dni** i/lub `limit 2000` świeżych (przy decayu starsze i tak
   ważą grosze; nie ciągnij całej historii).
2. Pobierz wiersze `dania` ze składnikami do mapy podobieństwa — uwaga:
   obecny select w `useGenerator` bierze tylko metadane dania (bez `Składnik`).
   Albo rozszerz select, albo zrób drugi (sprawdź koszt — tabela długa).
3. `const uczenie = budujWagiUczenia({ sygnaly, mapaSkladnikow })` → przekaż w `opcje`.
4. **Obsługa błędów:** jeśli pobranie sygnałów padnie (np. tabela nie istnieje,
   kod `42P01`) — `uczenie = {}` i generuj normalnie. Preferencje to wzmocnienie,
   nigdy blokada generowania.
5. To samo `uczenie` użyj w "Wymień to danie" (regeneracja pojedynczego slotu),
   jeśli ta funkcja istnieje.

**Zero zmian w UI.** Żadnych ekranów "twoje preferencje" na razie — efekt ma być
odczuwalny w generowanych planach, nie pokazywany.

---

## 4. (OPCJONALNIE, jeśli zostanie czas) "Wymień na podobne"

Skoro mapa podobieństwa będzie już policzona w przepływie generatora: w menu slotu
dodaj akcję "Wymień na podobne" → `podobneDania(nazwa, mapa, 5)` przefiltrowane po
`rodzaj` slotu, losuj ważone mnożnikiem `uczenie`. Loguje się jako zwykła podmiana
(out/in). Jeśli wymaga grzebania w UI Kalendarza ponad godzinę — odpuść, osobne zadanie.

---

## Kryteria akceptacji

1. **Cold start:** świeży household bez sygnałów → generator daje plany nieodróżnialne
   od obecnych (mnożniki = 1). Brak błędów w konsoli, także gdy tabela sygnałów pusta.
2. **Uczenie pozytywne:** po kilkukrotnym ręcznym zaplanowaniu dania X, X i dania
   podobne do X wypadają w generowanych planach częściej (sprawdzalne: zaloguj
   tablicę mnożników w dev, albo wygeneruj 20 planów i policz).
3. **Uczenie negatywne:** danie wymieniane "out" kilka razy wypada rzadziej, ale
   **nadal może wypaść** (mnożnik ≥ 0.25, nie 0).
4. **Wykluczenia twarde** działają jak dotychczas (waga 0, nigdy w planie).
5. **Podmiana loguje dwa sygnały** (out + in) — widoczne w tabeli.
6. **Członek household widzi efekt sygnałów innych członków** (RLS: odczyt po
   household_id działa).
7. Deploy na Vercel przechodzi (brak TDZ, brak `PGRST125`).

---

## Notatka dla przyszłej sesji (status — uzupełnij na koniec)

- [ ] 1. Audyt + uzupełnienie logowania sygnałów (podmien_out/in)
- [ ] 1b. Polityka RLS SELECT po household_id
- [ ] 2. Moduł `wagiPreferencji.js` (scoring + decay + propagacja + mnożnik)
- [ ] 3. Wpięcie w `useGenerator.js`
- [ ] 4. (opc.) "Wymień na podobne"

Uwagi z implementacji:
