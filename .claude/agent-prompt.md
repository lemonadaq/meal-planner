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
- **home** — ekran startowy, sugestie dań na dziś (`Home.jsx`)
- **planer** — kalendarz tygodnia, sloty, galeria dań, generator planu (`Kalendarz.jsx`, `GeneratorPlanu.jsx`, `generatorPlanu.js`, `useSloty.js`)
- **przepisy** — lista, filtry, szczegóły dania, składniki (`Dania.jsx`, `DanieDetail.jsx`)
- **dodawanie** — formularz nowego dania (`DodajDanie.jsx`)
- **zakupy** — lista zakupów z planu + ręczne pozycje (`ListaZakupow.jsx`)
- **ustawienia** — ustawienia, konfiguracja slotów, rodzina i zaproszenia (`Ustawienia.jsx`, `KonfiguracjaSlotow.jsx`, `Rodzina.jsx`)
- **dane** — jakość przepisów w bazie (`dania`, `skladniki_meta`) + sprawdzenie w UI

## Przebieg
1. **Rozpoznanie** (ok. 20 akcji w przeglądarce): zaloguj się i przejdź obszar jak zwykły użytkownik — typowa ścieżka, potem przypadki brzegowe: pusty stan, długie nazwy, podwójne kliknięcie, przycisk wstecz, odświeżenie strony w trakcie. Zrzut `przed-<nazwa>.png`.
2. **Wybór jednego problemu** według priorytetu:
   1. crash, biały ekran, błąd w konsoli
   2. funkcja działa źle (złe przeliczenie, nie zapisuje, nieaktualna lista)
   3. błąd w danych przepisu
   4. drobny problem UX na telefonie: ucięty tekst, element poza ekranem, cel dotyku < 40 px, brak informacji zwrotnej po akcji, niejasny komunikat
3. **Poprawka** — minimalna i lokalna, w stylu istniejącego kodu; kolory i odstępy z `theme.js`.
4. **Weryfikacja** — `npm run lint` (nie dokładaj nowych błędów w zmienionych plikach), `npm run build`, powtórz ten sam scenariusz w przeglądarce, konsola czysta, zrzut `po-<nazwa>.png`. Jeśli nie działa — popraw i sprawdź jeszcze raz. **Maksymalnie 3 podejścia.**
5. **Wynik** — zapisz `agent-out/wynik.md` i zakończ. Po ok. 60 akcjach kończ i zapisz wynik, nawet jeśli nie skończyłeś.

## Obszar „dane”
Najpierw `\d dania` i `\d skladniki_meta` — nie zgaduj nazw kolumn (są polskie, np. "Danie", "Składnik", "Ilość na 1 porcję", "Jednostka"). Tabela `dania` jest w formacie długim: wiersz = jeden składnik dania.

Szukaj: ilości 0 / NULL / absurdalnych na 1 porcję, różnych jednostek tego samego składnika, dwóch pisowni tego samego składnika, złej kategorii w `skladniki_meta`, zdublowanego składnika w daniu.

Poprawka:
- SQL do pliku `supabase/fixes/<ID_TASKU>.sql`: komentarz na górze (co i dlaczego), tylko `UPDATE` (ewentualnie `INSERT` do `skladniki_meta`), precyzyjne `WHERE`, komentarz nad każdą zmianą.
- Plik musi być bezpieczny do jednokrotnego uruchomienia na produkcji — po merge'u wykona się tam automatycznie.
- Wykonaj go na stagingu: `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/fixes/<ID_TASKU>.sql`, sprawdź SELECT-em i w UI.
- Maksymalnie ok. 20 zmienionych wierszy na task. Nie masz pewności, jaka wartość jest kulinarnie poprawna → status PROPOZYCJA zamiast zgadywania.

## Zakazy
- Nie ruszaj: `Login.jsx`, `NoweHaslo.jsx`, `ImieGate.jsx`, `Admin.jsx`, `supabase.js`, polityk RLS i schematu bazy (żadnego DDL), Capacitor/`android`/`ios`, `package.json` i zależności, plików `.env*`, `.github/`, `.claude/`, skryptów generujących.
- W bazie: żadnego `DELETE`, `DROP`, `TRUNCATE`, `ALTER`.
- Zaproszenia do rodziny tylko na adresy `@example.com`.
- Rzeczy z sekcji „ZOSTAŁO ZROBIONE (nie ruszaj)” w CLAUDE.md zmieniasz tylko wtedy, gdy są bezpośrednim źródłem błędu.
- Bez nowych bibliotek, bez refaktoryzacji „przy okazji”, bez przebudowy całych ekranów.
- Zmiana większa niż jeden komponent albo zmiana zachowania, co do której Filip mógłby mieć inne zdanie → nie implementuj; status PROPOZYCJA z 2–3 wariantami opisanymi słownie.

## Plik wyniku — `agent-out/wynik.md` (ZAWSZE, także gdy nic nie znalazłeś)
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
