# Ustalenia

Decyzje produktowe Filipa. To **nie** jest backlog ani lista życzeń — tu trafia
wyłącznie to, co zostało już rozstrzygnięte.

Po co ten plik: agent QA chodzi po apce bez człowieka i zgłasza, co wygląda na
błąd. Część rzeczy wygląda na błąd, a jest decyzją. Bez tego pliku agent
„naprawia" je w kółko, a Filip w kółko odrzuca te same PR-y.

## Jak to czytać

Każde ustalenie ma trzy części:

- **Zasada** — jak ma być.
- **Dlaczego** — żeby dało się ocenić, czy nowy przypadek podpada pod to samo.
- **Czego NIE zgłaszać** — konkretne zachowania zgodne z zasadą, które nie są
  błędem.

Ustalenie jest nadrzędne wobec „to wygląda na błąd". Jeśli uważasz, że
ustalenie prowadzi do realnego problemu — status `PROPOZYCJA` z opisem, nigdy
poprawka wbrew zasadzie.

Ustalenia tylko się dopisuje. Kiedy decyzja się zmienia, stary wpis zostaje
z adnotacją, co ją zastąpiło — inaczej za miesiąc nikt nie będzie wiedział,
czy czegoś nie ma, bo nikt o tym nie pomyślał, czy dlatego, że tak ustalono.

---

## 1. Jednostka składnika jest opcjonalna

Ustalono: 2026-10-01

**Zasada.** Składnik da się dodać bez jednostki i tak ma zostać. Puste pole
„jednostka" nie jest błędem walidacji i nie blokuje dodania składnika — ani
w formularzu nowego dania, ani przy edycji istniejącego.

**Dlaczego.** Dodawanie przepisu ma być szybkie. Przy większości składników
jednostka jest oczywista albo nieistotna, a wymuszanie jej przy każdym wierszu
spowalnia wpisywanie całego przepisu. Szybkość wpisywania jest tu ważniejsza
niż komplet danych.

**Czego NIE zgłaszać:**

- pustej jednostki przy dodawaniu (`DodajDanie.jsx`) ani przy edycji dania
  (`DanieDetail.jsx`) jako błędu do naprawienia
- propozycji zamiany pola „jednostka" na wybór z zamkniętej listy, jeżeli
  jedynym powodem jest to, że da się je zostawić puste
- pozycji bez jednostki na liście zakupów, jeśli wynika to z pustej jednostki
  w przepisie

**Dotyczy:** PR #83 — odrzucony z tego powodu.

---

## 2. Nitpicki UX nie są błędami

Ustalono: 2026-10-06

**Zasada.** Rozmiar celu dotyku, zabezpieczenia przed szybkim double-tapem
i brak potwierdzenia przy akcji, którą da się po prostu powtórzyć, nie są
błędami do zgłaszania ani do poprawiania.

**Dlaczego.** Zdarzają się rzadko i nie przeszkadzają w gotowaniu — a to jest
jedyny test, który się tu liczy. Uwaga idzie na przepisy, nazwy składników
i listę zakupów, bo tam Filip faktycznie traci czas: stojąc w sklepie
z listą, na której ten sam produkt jest dwa razy albo pod nazwą, której nie
ma na półce.

**Czego NIE zgłaszać:**

- celu dotyku mniejszego niż 44×44 px
- podwójnego zadziałania przy szybkim double-tapie
- braku potwierdzenia przy akcji, którą da się powtórzyć (wyczyszczenie
  formularza, cofnięcie się z ekranu z niezapisaną zmianą)
- propozycji dodania dialogu „czy jesteś pewien?" gdziekolwiek, jeżeli jedynym
  powodem jest to, że da się kliknąć przez przypadek

**Czego to NIE obejmuje.** Utrata danych, których nie da się odtworzyć —
wpisany przepis, który przepada przy zapisie — jest błędem i zgłaszaj ją
dalej. Granica leży w tym, ile pracy user traci: przeklikanie ekranu od nowa
to nie strata, przepisanie przepisu od zera to strata.

**Dotyczy:** PR #131, #132, #133, #136 — odrzucone z tego powodu.

---

## 3. Z przypraw ukrywamy tylko sól i pieprz

Ustalono: 2026-10-06

**Zasada.** Na liście zakupów domyślnie ukrywane są **wyłącznie sól i pieprz**
(oraz stałe spiżarni: olej, oliwa, ocet, cukier, woda). Każda inna przyprawa
zachowuje się jak zwykły produkt i trafia na listę.

**Dlaczego.** Wcześniejsza reguła chowała całą kategorię `7_Przyprawy`, więc
razem z oregano znikał szafran, wanilia i kardamon — czyli dokładnie te
przyprawy, których w szafce nie ma, a które są drogie. User planował risotto
alla milanese i nie dowiadywał się, że musi kupić szafran. Lepiej, żeby na
liście było o dwie zbędne pozycje za dużo, niż żeby brakowało składnika, bez
którego dania nie da się ugotować.

Komu oregano faktycznie leży w szafce, odhacza je raz w panelu „Mam w domu"
i znika na stałe — to jest właściwe miejsce na taką decyzję, bo jest per
household, a nie wpisane w kod.

**Czego NIE zgłaszać:**

- obecności przyprawy na liście zakupów jako błędu
- propozycji przywrócenia reguły „cała kategoria `7_Przyprawy` jest w domu"
- propozycji dopisywania listy wyjątków do `domyslnieWDomu()` dla kolejnych
  przypraw

**Dotyczy:** issue #118.
