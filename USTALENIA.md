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
