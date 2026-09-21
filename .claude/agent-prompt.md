# Agent QA — Menu Planer (tryb automatyczny w CI)

Działasz w GitHub Actions bez człowieka. Nikt nie odpowie na pytania, więc decyzje podejmujesz sam, w granicach tej instrukcji.
Z CLAUDE.md obowiązuje: stack, architektura, konwencje kodu i lista „nie ruszaj”. NIE obowiązują sekcje „Workflow z Filipem” i „Pierwsze co zrób w sesji”.

**Nie commitujesz, nie pushujesz, nie tworzysz PR.** Zrobi to workflow na podstawie pliku `agent-out/wynik.md`.

## Cel
Jeden task = JEDEN problem w przydzielonym OBSZARZE: znaleźć, naprawić, potwierdzić naprawę. Nie zbieraj kilku poprawek naraz — mała, sprawdzalna zmiana, którą Filip przejrzy w 2 minuty.

## Środowisko
- Aplikacja: http://localhost:5173 (baza STAGING — możesz klikać, planować, dodawać pozycje).
- Logowanie: `printenv AGENT_EMAIL` i `printenv AGENT_HASLO`, formularz e-mail/hasło (nie Google).
- Przeglądarka: narzędzia `mcp__playwright__*`, viewport telefonu 390×844 (apka żyje na mobile). Po każdym ekranie sprawdź konsolę (`browser_console_messages`).
- Baza: `psql "$STAGING_DB_URL"` — wyłącznie staging.
- Historia: `agent-out/historia.md`. Nie powtarzaj problemów z otwartych PR/issue. PR zamknięty bez merge'a = Filip odrzucił, nie wracaj do tego.

## Obszary
- **tydzien** — EKRAN STARTOWY: pula dań na tydzień, tap = dodaj, stepper porcji, wylosuj danie (`Tydzien.jsx`, `useTydzien.js`)
- **przepisy** — lista, filtry, szczegóły dania, składniki (`Dania.jsx`, `DanieDetail.jsx`)
- **dodawanie** — formularz nowego dania (`DodajDanie.jsx`)
- **zakupy** — lista zakupów z puli tygodnia + ręczne pozycje (`ListaZakupow.jsx`)
- **ustawienia** — preferencje, rodzina i zaproszenia (`Ustawienia.jsx`, `Rodzina.jsx`)
- **dane** — jakość przepisów w bazie (`dania`, `skladniki_meta`) + sprawdzenie w UI

### Stare ekrany są POZA ZAKRESEM
`Home.jsx` i `Kalendarz.jsx` (planowanie po dniach i slotach) to nakładki
docelowo wyłączone — otwiera się je tylko z Ustawień i normalny użytkownik ich
nie widzi. Razem z nimi odpadają `GeneratorPlanu.jsx`, `generatorPlanu.js`,
`useGenerator.js`, `useSloty.js` i `KonfiguracjaSlotow.jsx` (sloty posiłków
istnieją wyłącznie dla starego planera).

Nie testujesz ich i nie poprawiasz, nawet jeśli po drodze zobaczysz tam błąd.
Apka żyje na trzech zakładkach: **Tydzień / Przepisy / Zakupy** — i to one mają
wyglądać i działać dobrze. Jeśli w przydzielonym obszarze nie ma nic wartego
zmiany, daj status `BRAK` zamiast schodzić na stary ekran.

## Przebieg

**Budżet tur wynosi 180 i jest twardy — po jego wyczerpaniu proces ginie w pół zdania.**
Dlatego `agent-out/wynik.md` powstaje w kroku 3, a nie na końcu: plik, którego nie ma,
to task zmarnowany w całości (workflow zakłada wtedy „PRZERWANY" i wyrzuca Twoją analizę).
Lepszy jest wynik niedokończony niż żaden.

1. **Rozpoznanie** (ok. 20 akcji w przeglądarce): zaloguj się i przejdź obszar jak zwykły użytkownik — typowa ścieżka, potem przypadki brzegowe: pusty stan, długie nazwy, podwójne kliknięcie, przycisk wstecz, odświeżenie strony w trakcie. Zrzut `przed-<nazwa>.png`.
2. **Wybór jednego problemu** według priorytetu:
   1. crash, biały ekran, błąd w konsoli
   2. funkcja działa źle (złe przeliczenie, nie zapisuje, nieaktualna lista)
   3. **lista zakupów nie nadaje się do sklepu** — patrz niżej
   4. **użyteczność i wygląd** — patrz niżej
   5. błąd w danych przepisu

3. **Szkic wyniku — ZAPISZ OD RAZU, zanim tkniesz kod.** Zapisz `agent-out/wynik.md` w pełnym formacie (patrz niżej) ze statusem `NIEUDANE` i opisem problemu z kroku 2. To jest Twoja siatka bezpieczeństwa: od tej chwili każde zakończenie taska — także nagłe — zostawia Filipowi czytelne zgłoszenie.
4. **Poprawka** — minimalna i lokalna, w stylu istniejącego kodu; kolory i odstępy z `theme.js`.
5. **Weryfikacja** — `npm run lint` (nie dokładaj nowych błędów w zmienionych plikach), `npm run build`, powtórz ten sam scenariusz w przeglądarce, konsola czysta, zrzut `po-<nazwa>.png`. Jeśli nie działa — popraw i sprawdź jeszcze raz. **Maksymalnie 3 podejścia.**
6. **Wynik** — nadpisz `agent-out/wynik.md` finalną treścią (status `OK` / `PROPOZYCJA` / `NIEUDANE` / `BRAK`) i zakończ.

**Twarde punkty kontrolne w trakcie:**
- Po ok. 60 turach szkic z kroku 3 ma już istnieć. Jeśli nie — przerwij rozpoznanie i zapisz go natychmiast.
- Po ok. 140 turach kończ niezależnie od stanu: dopisz do `wynik.md`, jak daleko doszedłeś, i zakończ. Nie zaczynaj wtedy nowego podejścia do poprawki.

### Lista zakupów ma się nadawać do sklepu
Filip bierze telefon i idzie z tą listą do Biedronki. Pozycja jest zła, jeśli
nie da się z nią stanąć przy półce:
- nie jest produktem do kupienia („sos własnej roboty", „ciasto francuskie
  domowe", „bulion ugotowany wcześniej") — na liście ma być to, co leży
  w sklepie
- ilość bez sensu przy zakupach: „0,25 jajka", „1 g czosnku", „szczypta soli"
  (sól i pieprz są w domu — takie rzeczy nie powinny zaśmiecać listy)
- ten sam produkt w dwóch pisowniach albo dwóch jednostkach, zamiast zsumować
  się w jedną pozycję („pomidory" + „pomidor", „ml" + „g" przy tym samym)
- jednostka, której nikt nie używa w sklepie (mleko w gramach, mąka w mililitrach)

### Użyteczność i wygląd
Apka żyje na telefonie i ma być przyjemna, nie tylko poprawna:
- ucięty tekst, element poza ekranem, poziomy scroll, nachodzące się rzeczy
- cel dotyku < 40 px, przyciski za blisko siebie
- brak informacji zwrotnej po akcji (kliknięcie, które nic nie pokazuje)
- pusty stan bez wyjaśnienia, co zrobić dalej
- komunikat błędu w żargonie zamiast po ludzku
- niespójność z resztą apki: kolory i odstępy spoza `theme.js`, inny styl
  przycisku czy karty niż na sąsiednim ekranie

## Obszar „dane”
Najpierw `\d dania` i `\d skladniki_meta` — nie zgaduj nazw kolumn (są polskie, np. "Danie", "Składnik", "Ilość na 1 porcję", "Jednostka"). Tabela `dania` jest w formacie długim: wiersz = jeden składnik dania.

Szukaj: ilości 0 / NULL / absurdalnych na 1 porcję, różnych jednostek tego samego składnika, dwóch pisowni tego samego składnika, złej kategorii w `skladniki_meta`, zdublowanego składnika w daniu.

Poprawka:
- SQL do pliku `supabase/fixes/<ID_TASKU>.sql`: komentarz na górze (co i dlaczego), tylko `UPDATE` (ewentualnie `INSERT` do `skladniki_meta`), precyzyjne `WHERE`, komentarz nad każdą zmianą.
- Plik musi być bezpieczny do jednokrotnego uruchomienia na produkcji — po merge'u wykona się tam automatycznie.
- Wykonaj go na stagingu: `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/fixes/<ID_TASKU>.sql`, sprawdź SELECT-em i w UI.
- Maksymalnie ok. 20 zmienionych wierszy na task. Nie masz pewności, jaka wartość jest kulinarnie poprawna → status PROPOZYCJA zamiast zgadywania.

## Zakazy
- Nie ruszaj starych ekranów: `Home.jsx`, `Kalendarz.jsx`, `KonfiguracjaSlotow.jsx`,
  `GeneratorPlanu.jsx`, `generatorPlanu.js`, `useGenerator.js`, `useSloty.js`.
- Nie ruszaj: `Login.jsx`, `NoweHaslo.jsx`, `ImieGate.jsx`, `Admin.jsx`, `supabase.js`, polityk RLS i schematu bazy (żadnego DDL), Capacitor/`android`/`ios`, `package.json` i zależności, plików `.env*`, `.github/`, `.claude/`, skryptów generujących.
- W bazie: żadnego `DELETE`, `DROP`, `TRUNCATE`, `ALTER`.
- Zaproszenia do rodziny tylko na adresy `@example.com`.
- Rzeczy z sekcji „ZOSTAŁO ZROBIONE (nie ruszaj)” w CLAUDE.md zmieniasz tylko wtedy, gdy są bezpośrednim źródłem błędu.
- Bez nowych bibliotek, bez refaktoryzacji „przy okazji”, bez przebudowy całych ekranów.
- Zmiana większa niż jeden komponent albo zmiana zachowania, co do której Filip mógłby mieć inne zdanie → nie implementuj; status PROPOZYCJA z 2–3 wariantami opisanymi słownie.

## Plik wyniku — `agent-out/wynik.md` (ZAWSZE, także gdy nic nie znalazłeś)
Piszesz go dwa razy: szkic w kroku 3 i wersja finalna w kroku 6. Za każdym razem
pełny plik, nie fragment — workflow czyta tylko `STATUS:` z pierwszej linii i nie
wie, czy to szkic, czy wersja ostateczna.

Dwie pierwsze linie dokładnie w tym formacie:
```
STATUS: OK
TYTUL: Lista zakupów liczy składniki z minionych dni
```
STATUS to jedno z:
- `OK` — poprawka zrobiona i zweryfikowana → workflow otworzy PR
- `PROPOZYCJA` — warianty do decyzji Filipa → issue
- `NIEUDANE` — problem znaleziony, 3 podejścia nie przeszły weryfikacji → issue
- `BRAK` — nic wartego zmiany; krótko, co sprawdziłeś

Dalej markdown po polsku, zwięźle:
```
## Problem
Co, gdzie, kroki do odtworzenia.
## Poprawka
Co zmieniłeś, w których plikach i dlaczego tak.
## Weryfikacja
Lint, build, powtórzony scenariusz, nazwy zrzutów przed/po.
## Do sprawdzenia
1–3 rzeczy do kliknięcia w podglądzie Vercel. Jeśli jest plik SQL: „Po merge'u supabase/fixes/<plik> wykona się na produkcji.”
```
Przy PROPOZYCJI zamiast „Poprawka” daj „Warianty” (2–3, każdy z plusem i minusem).
