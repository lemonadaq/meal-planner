# ZADANIE: poprawki UX po analizie nagrania (adopcja)

Cel nadrzędny: skrócić drogę od „pusty planer" do „mam gotowy, ładny tydzień bez myślenia"
i usunąć drobiazgi psujące wrażenie natywnej apki. Kolejność: najpierw tani fundament
(grupa A), potem najwyższy zwrot z inwestycji (B), potem onboarding (C), na końcu większy
refaktor widoku (D).

> Uwaga: numery linii z analizy z 13.06.2026 — mogą się przesunąć. Szukaj po nazwach
> funkcji/stringach, nie po samych liniach.

---

## E. BUG: dodatki / surówki (zgłoszony z nagrania) — ZRÓB NAJPIERW

Objaw (słowa Filipa): „przy dodatkach sloty dań są przezroczyste praktycznie, są wybrane
dodatki, nie da się wybrać surówek, jest tam lipa". Diagnoza z kodu rozbija to na 3 rzeczy:

### [ ] E1. „Nie da się wybrać surówek" — tap na chip ZAZNACZA TEKST zamiast kliknąć
**Potwierdzone na nagraniu (3. wideo):** stuknięcie w chip „Surówki" wywołuje systemowe
zaznaczenie tekstu „Surówki" (niebieskie uchwyty + menu „Kopiuj / Udostępnij / Zaznacz
wszystko"). `onClick` chipa się NIE odpala — dlatego „Dodatki" zostają aktywne, a galeria
nie przełącza się na surówki. To **nie problem danych ani tagów `rodzaj`** (moje wcześniejsze
dwie hipotezy były błędne) — to dokładnie ten sam mechanizm co **A1**: brak `user-select: none`,
przez co WebView interpretuje tap jako press-and-select.
**Fix = zrób A1** (globalny `user-select: none` + `-webkit-touch-callout: none`), ze
szczególnym uwzględnieniem przycisków/chipów. Dla pewności dorzuć do współdzielonego stylu
chipa/buttona (`s.chip` w `Kalendarz.jsx` ~2673, i `ui.btn*` w `theme.js`):
```js
userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
```
**Akceptacja:** pojedynczy tap w „Surówki" przełącza galerię na surówki (chip robi się
czerwony), bez żadnego zaznaczania tekstu ani menu systemowego. Dotyczy WSZYSTKICH chipów.

### [ ] E3. „Przezroczyste sloty" — ghostowanie + sticky overlay wygląda na zepsute
**Przyczyna:** w sub-trybie kafle slotów dostają `opacity: 0.55` (`Kalendarz.jsx` ~1741) i
są `position: sticky, zIndex: 50` (`slotyDuzeSticky` ~2570) — wiszą półprzezroczyste nad
galerią podczas scrolla.
**Fix (wybierz wariant):**
- (Lekki) Podnieś opacity do ~0.9–1.0 w sub-trybie i delikatnie zmniejsz kafle (np. zwiń do
  pojedynczego wiersza miniatur), żeby nie zlewały się z galerią.
- (Lepszy UX) Zamiast ghostowanych pełnych kafli pokaż w sub-trybie kompaktowy pasek:
  „➕ Dodajesz do: {nazwa slotu} — [Dodatki | Surówki]  ·  Anuluj". Czytelny kontekst,
  zero nakładania się na galerię.
**Akceptacja:** w trakcie dodawania dodatku/surówki widać jasno, do czego dodajesz; nic nie
jest wyblakłe ani nie nachodzi na siatkę; taps na chipy zawsze trafiają.

---

## A. Klaster drobnych bugów (fundament, niskie ryzyko) — zrób RAZEM

### [ ] A1. Globalny `user-select: none` (native feel + NAPRAWIA E1!)
**Problem:** długie/„nerwowe" przytrzymanie tekstu w UI wywołuje systemowe menu zaznaczania
/ „szukaj w Google". **Co gorsza — to BLOKUJE działanie chipów:** tap w „Surówki" zaznacza
tekst zamiast kliknąć (patrz E1). To nie kosmetyka, to realnie psuje funkcję.
**Przyczyna:** brak globalnej reguły. `App.css` to martwy szablon Vite (nieużywany).
Globalny arkusz to **`index.css`** (importowany w `main.jsx`).
**Fix w `index.css`:**
```css
html, body, #root {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;   /* blokuje menu long-press w Android WebView/iOS */
}
button, [role="button"] {        /* pewność dla chipów/przycisków */
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
/* Opt-in tam, gdzie kopiowanie ma sens: przepis i lista zakupów */
input, textarea, [contenteditable],
[data-selectable] {
  -webkit-user-select: text;
  user-select: text;
}
```
Następnie dodać `data-selectable` na kontenerze treści przepisu (Składniki + kroki w
`DanieDetail.jsx`) i na pozycjach `ListaZakupow.jsx`, żeby user mógł skopiować listę.
**Sprzątanie przy okazji:** usuń `App.css` z importów, jeśli gdziekolwiek wisi (to czysty
boilerplate: `.counter`, `.hero`, `#docs`, `#next-steps`).
**Akceptacja:** długie przytrzymanie nagłówków/etykiet/chipów nie zaznacza tekstu i nie
pokazuje menu „szukaj"; tap w „Surówki" przełącza filtr; przepis i lista zakupów nadal dają
się zaznaczyć.

### [ ] A2. Ucięta etykieta „Dodatek do: ob"
**Problem:** w galerii dodatków tytuł pokazuje surowy `slotId` („ob") zamiast nazwy slotu.
**Lokalizacja:** `Kalendarz.jsx` ~linia 1710:
```js
const tytulGalerii = subTryb
  ? `${typGalerii === 'surowka' ? 'Surówka' : 'Dodatek'} do: ${subTryb.posilek}`
  : 'Galeria'
```
**Fix:** użyj `nazwaSlotu()` (jest w propsach komponentu galerii):
```js
const nazwaP = (nazwaSlotu?.(subTryb.posilek) || subTryb.posilek)
const tytulGalerii = subTryb
  ? `${typGalerii === 'surowka' ? 'Surówka' : 'Dodatek'} do: ${nazwaP.toLowerCase()}`
  : 'Galeria'
```
(Deklinacja „do obiadu" jest miła, ale opcjonalna — „do: obiad" w zupełności wystarczy.
Jeśli chcesz dopełniacz, prosty słownik: śniadanie→śniadania, obiad→obiadu,
kolacja→kolacji, zupa→zupy, deser→deseru.)
**Akceptacja:** nagłówek czyta się „Dodatek do: obiad", nigdy „do: ob".

### [ ] A3. W edytorze dnia podświetlają się WSZYSTKIE sloty naraz
**Problem:** przy wskazywaniu dania obie kafle (ŚNIADANIE i OBIAD) dostają czerwoną ramkę —
nie wiadomo, do którego trafi wybór.
**Przyczyna:** `Kalendarz.jsx` ~linia 1755 — flaga jest wspólna dla całego dnia:
```js
const podswietl = dragTyp === 'danie'   // <- to samo dla każdego slotu w .map()
...
podswietlony={podswietl}
```
**Fix:** podświetlaj tylko slot pod kursorem (jak w widoku tygodnia, gdzie jest
`podswietlony={hoverKey === key}`). Wprowadź `hoverSlot` w stanie drag/wyboru i:
```js
podswietlony={dragTyp === 'danie' && hoverSlotId === posilek}
```
Jeśli interakcja jest tap-em (nie drag): trzymaj `aktywnySlotId` ustawiany na tap w slot,
podświetlaj tylko jego, a nagłówek galerii zmień na „Wybierz na: {nazwa slotu}".
**Akceptacja:** w danym momencie świeci max. jeden slot; jasne, gdzie trafi wybrane danie.

---

## B. Shuffle pojedynczego posiłku — „daj inne danie" (NAJWYŻSZY ROI)

**Stan:** logika gotowa — `useGenerator.js` linia 114 `wymienDanie({ dataStr, slotId,
nazwaSlotu, wpisId, unikaj=[], opcje })`. Respektuje rodzaj slotu i wyklucza `unikaj`.
**Obecnie nie jest wołana znikąd** (w planerze). Trzeba dodać tylko przycisk + odświeżenie stanu.

> Wzór UX już istnieje: **Home** ma „🔄 Inne danie" przy sugestii dnia (`Home.jsx` `losujInne`,
> ~linia 245/375). Tu chodzi o przeniesienie tego gestu na KAŻDY kafel w planerze (tydzień + dzień),
> z gotowym `wymienDanie` (które dodatkowo respektuje anty-powtórki).

> Uwaga: ikona ↻ na kaflu (`SlotDuzy`, ~linia 2063, `onPodmien`) to PODMIANA SKŁADNIKÓW,
> nie dania. Nie myl. Nowy przycisk to osobna akcja — proponuję 🔄 obok ✕.

### [ ] B1. Przycisk 🔄 w widoku tygodnia (`KafelekPosilek`, ~linia 1916)
- Dodaj drugi przycisk obok `kafelekDelete` (✕), np. 🔄 „Inne danie".
- `onClick` (z `e.stopPropagation()`, jak przy delete) → callback `onWymien(wpis)`.
- Przekaż przez propsy aż do `Kalendarz` (analogicznie do `onDelete`/`onPodmien`).

### [ ] B2. Przycisk 🔄 w edytorze dnia (`SlotDuzy`, sekcja przycisków ~linia 2060)
- Ten sam wzorzec; ta sama akcja `onWymien(wpis)`.

### [ ] B3. Handler w `Kalendarz` + odświeżenie + Cofnij
```js
async function wymienPosilek(wpis) {
  const stareDanie = wpis.danie
  const { nowaNazwa, error } = await wymienDanie({
    dataStr: wpis.data,
    slotId: wpis.posilek,
    nazwaSlotu: nazwaSlotu(wpis.posilek),
    wpisId: wpis.id,
    unikaj: [stareDanie],          // gwarancja, że się zmieni
  })
  if (error || !nowaNazwa) { pokazToast('Brak alternatyw dla tego posiłku'); return }
  // zaktualizuj lokalny plan (klucz `${wpis.data}_${wpis.posilek}`) na nowaNazwa, dodatki=[]
  pokazToast(`Zmieniono na: ${nowaNazwa}`, async () => {
    // Cofnij: przywróć stareDanie tym samym update'em co w wymienDanie
    await supabase.from('kalendarz').update({ danie: stareDanie, dodatki: [], podmiany: {} }).eq('id', wpis.id)
    // odśwież plan lokalnie z powrotem na stareDanie
  })
}
```
- `useGenerator` jest już zainicjalizowany w `Kalendarz`? Jeśli nie — wstrzyknij
  `wymienDanie` z `useGenerator({ user, householdId, slotyConfig })`.
- Po podmianie wyzeruj dodatki/surówki tego slotu (nowe danie = inne dodatki).

**Akceptacja:** jeden tap na 🔄 zamienia danie w tym slocie na inne (tego samego rodzaju),
nie ruszając reszty tygodnia; jest Cofnij; jeśli to jedyne danie w kategorii — czytelny toast.

---

## C. Onboarding — „magia pierwszego tygodnia"

**Problem:** nowy user (po `ImieGate`) ląduje na pustym planie z mnóstwem slotów „+", co
podświadomie zaprasza do RĘCZNEGO klikania — czyli zaprzeczenia obietnicy „nie myśl".
Brak jakiegokolwiek powitalnego „ułożę Ci to jednym kliknięciem".

### [ ] C1. Wykryj „pusty stan" nowego household
- Warunek: brak wpisów w `kalendarz` dla bieżącego (i przyszłego) tygodnia danego household.
- Najlepsze miejsce: **`Home.jsx`** (ekran lądowania) — jeśli plan pusty, pokaż kartę-hero
  zamiast/nad sugestią dnia.

### [ ] C2. Karta powitalna z jednym CTA
- Treść: nagłówek „Ułożymy Twój pierwszy tydzień?" + podtekst „Jeden klik, gotowy plan na 7
  dni. Wszystko zmienisz później." + duży przycisk **„✨ Ułóż mój tydzień"**.
- `onClick` → `generuj({ dniTygodnia: <bieżący tydz.>, tryb: 'wszystko', istniejacyPlan: {} })`
  (z `useGenerator`), potem nawigacja do Planera z gotowym tygodniem + toast „Gotowe!
  Ułożono N posiłków".
- Po pierwszym ułożeniu karta znika (warunek pustego planu przestaje być prawdziwy — nie
  trzeba flagi, ale możesz dołożyć `localStorage` `onboarding_plan_done` dla pewności).

### [ ] C3. (opcjonalnie) Mikro-wskazówka w pustym Planerze
- Jeśli user wejdzie w Planer mimo pustego stanu: nad listą dni jedno zdanie-strzałka do
  przycisku „✨ Ułóż plan na tydzień", żeby nie zaczynał od ręcznego „+".

**Akceptacja:** świeże konto → w < 15 s i 1 tap user ma pełny, ładny tydzień; karta
powitalna nie wraca po wygenerowaniu.

---

## D. Kompaktowy widok tygodnia (mniej scrollowania)

**Problem:** każdy posiłek to duże zdjęcie pełnej szerokości. Tydzień × 2–3 sloty = bardzo
długa rolka; „co w czwartek na obiad" wymaga sporo przewijania. Zdjęcia są atutem — NIE
usuwać, tylko dać alternatywną gęstość.

> Wzór już istnieje: **Home** („Dzisiaj"/„Jutro") pokazuje posiłki jako kompaktowe wiersze
> (mała miniatura + etykieta slotu + nazwa). Reużyj tego layoutu w planerze jako tryb „Kompakt".

### [ ] D1. Przełącznik gęstości
- Toggle w nagłówku Planera: „Komfort / Kompakt" (ikonki). Stan w `localStorage`
  (`widok_gestosc`), inicjalizowany synchronicznie jak `motyw` (bez migotania).

### [ ] D2. Tryb kompaktowy
- Mniejsze kafle: miniatura ~56–64 px po lewej + nazwa dania + etykieta slotu w wierszu
  (layout poziomy zamiast dużej karty). Cały dzień mieści się na ~1 ekranie.
- Akcje (✕, 🔄, porcje) jako ikonki po prawej stronie wiersza.
- Reużyj danych z `KafelekPosilek`; nowy wariant stylu, nie nowy komponent danych.

### [ ] D3. Przyklejone nagłówki dni (oba tryby)
- `position: sticky; top: 0` na nagłówku dnia („Pon 29 · Otwórz dzień"), żeby przy scrollu
  było wiadomo, który dzień się ogląda.

**Akceptacja:** w trybie kompaktowym cały tydzień przewija się ~2–3× krócej; przełącznik
zapamiętany między sesjami; nagłówek dnia widoczny podczas scrolla.

---

## Kolejność realizacji (sugestia)
0. **A1 NAJPIERW** — globalny `user-select: none` naprawia od ręki E1 (chip „Surówki").
   Potem reszta A.
1. **E3** — przezroczyste/ghostowane kafle slotów („przezroczysty dzień") — kosmetyka layoutu.
2. **B** — backend gotowy (`wymienDanie`), największy efekt „chce mi się tego używać".
3. **C** — decyduje o retencji nowych userów (kluczowe przed Google Play / testerami).
4. **D** — największy refaktor UI, zrób na końcu, gdy reszta stabilna.

## Status
- [x] E1  [x] E3
- [x] A1  [x] A2  [x] A3
- [x] B1  [x] B2  [x] B3
- [ ] C1  [ ] C2  [ ] C3
- [x] D1  [x] D2  [x] D3

## Notatki / odkrycia z analizy kodu
- **„Nie da się wybrać surówek" = user-select, nie dane.** Nagranie pokazało, że tap w chip
  „Surówki" zaznacza tekst zamiast odpalić `onClick` — naprawia to globalny `user-select: none`
  (A1). Logika `zmienTrybGalerii`/filtrowania surówek jest poprawna. (Dwie wcześniejsze
  hipotezy — „brak surówek w bazie" i „zły tag `rodzaj`" — były błędne; `nowe-dania.txt` to
  kolejka dań, nie zrzut bazy.)
- „Przezroczysty dzień" = ghostowane kafle slotów w sub-trybie: `opacity: 0.55` (~1741) +
  `slotyDuzeSticky` sticky zIndex 50 (~2570). To E3.
- Empty-state w galerii już istnieje („Brak pasujących pozycji", ~1874).
- Ghostowanie slotów w sub-trybie: `opacity: 0.55` (~1741) + `slotyDuzeSticky` sticky zIndex 50 (~2570).
- `wymienDanie()` istniał, ale był martwy (zero wywołań w planerze) — grupa B to głównie UI.
  Wzór gestu „Inne danie" jest już na Home (`losujInne`).
- `App.css` = nieużywany szablon Vite; globalny CSS żyje w `index.css` (import w `main.jsx`).
- ↻ na kaflu = podmiana SKŁADNIKÓW (`onPodmien` → `setPodmianaModal`), nie dania.
- Widok kompaktowy (D) i sugestia z „🔄 Inne" (B) mają gotowe wzory na ekranie Home.
- Mocne strony do zachowania: zdjęcia dań; undo/Cofnij wszędzie; „Kopiuj z ub. tygodnia";
  dialog „Uzupełnij puste / Ułóż od nowa"; **lista zakupów z cenami i okazjami** („30 okazji
  na Twojej liście", porównanie sklepów) — to wygląda dojrzale, nie ruszać. Problem nie jest
  w wyglądzie, tylko w tym, żeby user OD RAZU poczuł, że apka robi robotę za niego.
