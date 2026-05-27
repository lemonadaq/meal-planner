\# Smakuje — meal planner dla rodziny



\## Stack

\- React 18 + Vite

\- Supabase (Postgres + Auth + Storage)

\- PWA (instalowalne na telefon)

\- Bez TypeScriptu, czysty JSX

\- Style: CSS w plikach + tokeny w `theme.js`

\- Język UI: polski (nazwy plików też po polsku — `Dania.jsx`, `Kalendarz.jsx`, `Ustawienia.jsx` itd.)



\## Architektura krótko

\- `App.jsx` — root, routing, sesja użytkownika

\- `Home.jsx` — ekran startowy, sugestie dań na dzisiaj

\- `Kalendarz.jsx` — planowanie tygodnia, galeria dań do przeciągania w sloty

\- `Dania.jsx` — lista wszystkich przepisów, filtry, dodawanie nowego

\- `DanieDetail.jsx` — szczegóły dania, składniki, edycja

\- `DodajDanie.jsx` — formularz dodawania

\- `ListaZakupow.jsx` — generowana z `kalendarz` + ręczne pozycje

\- `Rodzina.jsx` — household, zaproszenia, członkowie

\- `Ustawienia.jsx` + `useUstawienia.js` — preferencje usera

\- `KonfiguracjaSlotow.jsx` + `useSloty.js` — definiowanie slotów posiłków per dzień

\- `Admin.jsx` — panel admina (tylko wojownik157@gmail.com)

\- `supabase.js` — klient Supabase

\- `useHousehold.js` — hook do pobierania household\_id



\## Baza Supabase

Główne tabele: `dania`, `kalendarz`, `households`, `household\_members`, `household\_invites`, 

`produkty\_w\_domu`, `skladniki\_meta`, `ustawienia`, `zakupy\_historia`, `zakupy\_wlasne`, `analytics`.



Widoki: `household\_members\_view`, `moje\_zaproszenia\_view` (oba `security\_invoker = false` 

z wewnętrznym filtrem przez `moj\_household\_id()` / `moj\_email()`).



RLS jest WŁĄCZONE wszędzie. Admin = `auth.jwt()->>'email' = 'wojownik157@gmail.com'`.



Helpery SQL: `moj\_household\_id()`, `moj\_email()` — używają JWT pytającego usera.



\## Konwencje kodu

\- Polskie nazwy zmiennych i komentarzy ("danie", "slot", "skladniki", "rodzaj")

\- Funkcje async/await, nie `.then()`

\- Komponenty funkcyjne + hooki

\- Style mobile-first, układane pod telefon (apka żyje głównie na mobile)

\- Importy: relatywne (`./supabase`, nie aliasy)



\## Lista zadań (z chatu z głównym Claude'em)



\### 🔥 Priorytet

1\. \*\*Zdjęcia dań\*\* — upload do Supabase Storage. Komponent w `DodajDanie.jsx` (z kompresją po stronie klienta) i tryb edycji w `DanieDetail.jsx` żeby dorzucać do starych. Pole `dania.zdjecie`.

2\. \*\*Lista zakupów bez minionych dni\*\* — filtrować `kalendarz` po `data >= dziś` przed agregacją do listy.



\### 🐛 Zaległości

4\. \*\*Mnożnik porcji w DanieDetail\*\* — suwak +/− nad składnikami, przelicznik tylko na stanie komponentu (bez bazy)

5\. \*\*Statystyki w Adminie\*\* — najczęściej gotowane dania, retencja, czas — dane są w tabeli `analytics`

6\. \*\*Pełna moderacja `dania`\*\* — osobny chat, na razie tylko łatka RLS (każdy zalogowany pisze, anon zablokowany)



\### 💡 Pomysły

7\. Scraper promocji (Blix.pl → tabela `promocje` → 💰 obok pozycji na liście)

8\. Makro per porcja (tania wersja: jedno pole kcal na danie)

9\. Eksport listy zakupów (share-sheet WhatsApp/SMS/kopiuj)

10\. Powtarzaj posiłek (wzorce tygodnia, jak `zakupy\_cykliczne` dla kalendarza)

11\. Dark mode (wyciągnąć tokeny z trybu sklepu, przełącznik w Ustawieniach)

12\. PWA offline (Service Worker + cache planu i listy)



\## Co ZOSTAŁO ZROBIONE niedawno (nie ruszaj)

\- ✅ Wyśrodkowanie slotów posiłków w widoku tygodnia i dnia — `kafelkiRzad` i `slotyDuze` na flex+center; n≤4 → jeden rząd (4 kafelki mniejsze), n≥5 → 3+reszta wyśrodkowana (`Kalendarz.jsx`)

\- ✅ Drag & drop reorderowania slotów w Ustawieniach — ghost śledzi palec, inne dni rozmyte za szybą (`KonfiguracjaSlotow.jsx`)

\- ✅ Konfigurowalne sloty posiłków per dzień (`KonfiguracjaSlotow.jsx`, `useSloty.js`, migracja `migracja\_faza\_B.sql`)

\- ✅ Rodzaje dań rozszerzone o `zupa` i `deser`

\- ✅ RLS na `dania` (wszyscy authenticated mogą wszystko — łatka do czasu moderacji)

\- ✅ Widoki `household\_members\_view` i `moje\_zaproszenia\_view` przerobione na bezpieczne (definer + filtr wewnętrzny przez `moj\_household\_id()` / `moj\_email()`)

\- ✅ Tabela `household\_invites` ma `invited\_by\_email` (text), NIE ma kolumny `invited\_by` (uuid). NIE joinuj z `auth.users` po `invited\_by`.

\- ✅ Tabela `household\_members` ma kolumny: `household\_id`, `user\_id`, `joined\_at`. NIE ma kolumny `role`.



\## Workflow z Filipem

\- Filip steruje z telefonu (leży w łóżku), Ty wykonujesz na PC

\- Zawsze pytaj o zgodę przed `git commit` i `git push`

\- Przed edycją większego pliku — pokaż mu plan/diff, dopiero po akceptacji edytuj

\- Tłumacz po polsku, krótko, konkretnie. Bez lania wody.

\- Jak coś niejasne — pytaj jedno pytanie z 2-4 opcjami, nie 5 pytań naraz

\- Repo: github.com/lemonadaq/meal-planner



\## Pierwsze co zrób w sesji

Otwórz `Kalendarz.jsx`, znajdź galerię dań (te przeciągane do slotów), pokaż Filipowi 

fragment kodu odpowiedzialny za layout siatki kafelków. Zaproponuj jak naprawić 

wyśrodkowanie ostatniego niepełnego rzędu. Czekaj na akceptację zanim cokolwiek zmienisz.

