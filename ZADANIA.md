# ZADANIE: Poprawki przed-launchowe (UX + bugi)

Lista pogrupowana tak, żeby zadania dotykające tych samych plików robić w jednej sesji.
Kolejność = sugerowany porządek wykonania (najpierw globalne fundamenty, potem ekrany).

---

## GRUPA A — Ujednolicenie przycisków (globalne) ✅ ZROBIONE (2026-06)
**Pliki:** theme.js (token przycisku) + miejsca użycia

- [x] Wprowadzić jeden wspólny styl przycisku akcji (token w theme.js, np. `ui.btnPrimary`). — token już istniał, bez zmian.
- [x] Przyciski "Ułóż plan" i "Ułóż mi plan na cały tydzień" → jeden tekst, jeden rozmiar, jedna pozycja.
- [x] Przycisk "Idę na zakupy" (ListaZakupow.jsx) w trybie ciemnym jest jasny → ten sam wspólny styl.
- [x] Cel: wszystkie główne przyciski wyglądają identycznie w obu motywach.

**Co zrobiono:** GeneratorPlanu.jsx przepisany na jeden przycisk btnPrimary (pełna szerokość, napis "✨ Ułóż plan na tydzień") — wariant duzy/gradient usunięty, prop wariant zlikwidowany. Kalendarz.jsx: oba stany (pusty / z zawartością) stackowane, więc przycisk jest identyczny wszędzie. ListaZakupow.jsx: btnSklep → `...ui.btnPrimary` (był `background: t.text`).

---

## GRUPA B — Toasty / powiadomienia w trybie ciemnym ✅ ZROBIONE (2026-06)
**Pliki:** komponent toasta (sprawdzić App.jsx / globalny styl) + miejsca wywołań

- [x] Toasty w trybie ciemnym są jasne z białym tekstem → nieczytelne. Naprawić kontrast (tło + tekst z tokenów motywu).
- [x] Błąd językowy: zamiast "kolacja/śniadanie/zupa usunięty" → format "Usunięto [nazwa slota]" (rodzaj neutralny, bo użytkownicy dodają własne pozycje).

**Co zrobiono:** nowy wspólny komponent `src/components/Toast.jsx` (tokeny motywu → czytelny w obu trybach, lżejszy cień w jasnym, pasek postępu, "Cofnij" tylko gdy jest `onUndo`, sam się chowa, łapie zmianę motywu przez `useThemeVersion`). Keyframes (`toastIn`/`Out`/`Shrink`) dodane do `index.css`. Podpięty na wszystkich ekranach z toastami: Kalendarz, Home, Dania, ListaZakupow, Rodzina, KonfiguracjaSlotow — każdy zachowuje swój czas wyświetlania. Kalendarz: format usuwania → "Usunięto [slot]" (lowercase).

Do wykorzystania później: `src/hooks/useUndo.js` (generyczny undo) — wrzucony, ale niepodpięty; gotowy pod ekrany, gdzie cofania jeszcze nie ma.

---

## GRUPA C — Nawigacja: Home → slot, wstecz, jasne tło ✅ ZROBIONE (2026-06)
**Pliki:** Home.jsx, App.jsx, Kalendarz.jsx

- [x] Home → "Zaplanuj" ma otwierać konkretny slot w danym dniu, nie ogólny planer (przekazać date + slotId).
- [x] Przycisk wstecz ma wracać do poprzedniego ekranu z zachowanymi filtrami i pozycją scrolla, a nie zamykać aplikację.
- [x] C3 — jasne tło w trybie ciemnym po kliknięciu "Zaplanuj" — naprawione.

**Co zrobiono (C1):** Home przekazuje `slot.id` → `onPlanujSlot(data, slotId)`; App.jsx trzyma `celPlanowania` i przełącza na planer; Kalendarz.jsx efektem na cel woła istniejące `przejdzDoDaty()` (tydzień + dzień + widok dnia), potem czyści cel. Danie wybierasz przeciągając z galerii (główny przepływ widoku dnia).

**Co zrobiono (C2):** App.jsx — pułapka historii (`popstate`, tylko web/PWA): gest/przycisk "wstecz" nawiguje w aplikacji zamiast ją zamykać; na natywnym dalej `backButton`. Filtry/scroll i tak są w `sessionStorage`.

---

## GRUPA D — Kopiowanie tygodnia + bug fantomowych dań
**Pliki:** useSloty.js, dataHelpers.js, Kalendarz.jsx

- [ ] "Skopiuj plan z poprzedniego tygodnia" → dać wybór, który tydzień kopiujemy.
- [ ] Bug: kopiowanie pustego tygodnia wyświetla "skopiowano 1 posiłek" → poprawić licznik (0 = komunikat o pustym tygodniu, nic nie kopiować).
- [ ] Bug fantomowych dań: pusty kalendarz, ale lista zakupów pokazuje pierś z kurczaka / panko / jajka, a kopiowanie pustego tygodnia twierdzi że skopiowano 1 posiłek.
  → Najpewniej osierocone wpisy slotów (klucz `${dateISO}_${slotId}`) niezsynchronizowane z widokiem kalendarza. Zdiagnozować źródło danych listy zakupów vs. kalendarza.
- [ ] Uwaga: D i bug fantomowy prawdopodobnie mają wspólną przyczynę (rozjazd między tym, co widzi kalendarz, a co czyta lista zakupów / licznik kopiowania). Zdiagnozować razem.

---

## GRUPA E — Widok przepisu (DanieDetail.jsx) ✅ ZROBIONE (2026-06)
**Pliki:** DanieDetail.jsx, NavBar.jsx

- [x] Tryb ciemny: biały pasek między navbarem a krokami przepisu.
- [x] Sekcja "Dodatki" osobno na końcu, niezależnie od alfabetu.

**Co zrobiono (pasek):** Pierwsza próba (spacer NavBara z `t.bg`) nie pomogła — to nie był spacer, tylko samo tło navbara (`navWrap` używał `t.surface` jaśniejszego od `t.bg`, więc tworzył widoczny prostokąt). Ostatecznie NavBar.jsx: `navWrap.background` zmienione z `t.surface` na `t.bg` — navbar wtapia się w stronę, `borderTop` dalej go subtelnie oddziela.

**Co zrobiono (kolejność):** To była pomyłka — chodziło o galerię w WidokDnia, nie składniki w DanieDetail. Sortowanie kategorii w DanieDetail wg prefiksu KATEGORIE zostało (drobna, nieszkodliwa kosmetyka). Właściwy fix → patrz Grupa F (chipsy multi-select).

---

## GRUPA F — Ekran "Przepisy" / galeria dnia (Dania.jsx, Kalendarz.jsx)
**Pliki:** Dania.jsx, Kalendarz.jsx

- [ ] W polu wyszukiwania po wpisaniu tekstu ma pojawić się krzyżyk (✕) do wyczyszczenia całego pola.
- [ ] Na kafelkach przepisów (Dania.jsx) gwiazdka "ulubione" i menu (trzy kropki) mają białe okrągłe tła zarówno w trybie jasnym, jak i ciemnym — w ciemnym wyglądają jak nalepki. Dopasować do motywu (np. półprzezroczyste tło z tokenów, albo bez tła z lekkim cieniem).
- [x] Galeria w widoku dnia planera — chipsy działają jak filtry multi-select; gdy są wybrane dania główne + dodatki/surówki, strony lądują w osobnej sekcji na dole (alfabetycznie razem). ✅ ZROBIONE (2026-06, Kalendarz.jsx)

---

## GRUPA G — Lista zakupów: scalanie składników (ListaZakupow.jsx)
**Pliki:** ListaZakupow.jsx, ew. mapaPodobienstwa.js

- [ ] Nie łączy "Ogórek" i "Ogórek świeży" → poprawić normalizację/scalanie nazw składników.

---

## GRUPA H — Drag & drop slotów (GeneratorPlanu.jsx / Kalendarz.jsx) ✅ ZROBIONE (2026-06)
**Pliki:** ekran planowania dnia

- [x] Przy podnoszeniu kafelka dania, gdy widać pasek dni tygodnia, slot przeskakuje na górę zamiast zostać na widocznej pozycji → naprawić zachowanie scrolla podczas drag.

**Co zrobiono:** Scroll-lock effect w `WidokDnia` zmieniony z `useEffect` na `useLayoutEffect`. Dzięki temu `body.style.position = 'fixed'` i `body.style.top = -scrollY` aplikują się synchronicznie przed malowaniem przeglądarki — brak wizualnego "skoku" przy podnoszeniu kafelka.

---

## GRUPA I — Brakujące pola edycji dania (DanieDetail.jsx) ✅ ZROBIONE (2026-06)
**Pliki:** DanieDetail.jsx

- [x] Brak możliwości edycji **rodzaju dania** (śniadanie/obiad/kolacja/zupa itd.) — pole `rodzaj`.
- [x] Brak możliwości edycji **czasu przygotowania** — pole `czas_minuty`.
- [x] Brak możliwości edycji **trybu podania** (samodzielne / z dodatkiem) — pole `TYP`.

**Co zrobiono:** dodano stałe RODZAJE/TYPY, stany edRodzaj/edCzas/edTyp, inicjalizację w wejdzWEdycje(), zapis w zapiszZmiany(). W trybie normalnym chipki pod tytułem dania; w trybie edycji trzy pola inline (select + number input + select).

---

## GRUPA I — Brakujące pola edycji dania (DanieDetail.jsx)
**Pliki:** DanieDetail.jsx

- [ ] Brak możliwości edycji **rodzaju dania** (śniadanie/obiad/kolacja/zupa itd.) — pole `rodzaj` w tabeli `dania`.
- [ ] Brak możliwości edycji **czasu przygotowania** — pole `czas_minuty`.
- [ ] Brak możliwości edycji **trybu podania** (samodzielne / z dodatkiem) — pole `TYP`.

W widoku normalnym te pola też nie są w ogóle wyświetlane — dodać chipki pod tytułem dania.

---

## Notatka

- ✅ Zrobione: A, B, C, E, F (krzyżyk + białe kółka), G, H, I.
- ❌ Pozostało: D (kopiowanie tygodnia + bug fantomowych dań).
- D + bug fantomowy mają prawdopodobnie wspólną przyczynę (rozjazd kalendarz ↔ lista zakupów) — diagnozować razem.
