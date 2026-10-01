# Wpis w Google Play — Menu Planer

Gotowe teksty do wklejenia w Play Console oraz to, czego konsola zażąda poza
tekstem. Limity znaków są twarde — konsola utnie dłuższe.

---

## Nazwa aplikacji (max 30 znaków)

```
Menu Planer — plan i zakupy
```

27 znaków. Dziś `strings.xml` i `capacitor.config.json` mówią „Menu planer",
a `CLAUDE.md` nazywa projekt „Smakuje". W sklepie trzeba jednej nazwy —
proponuję „Menu Planer", bo zgadza się z domeną i z ikoną.

## Krótki opis (max 80 znaków)

```
Zaplanuj tydzień posiłków i miej gotową listę zakupów. Dla całej rodziny.
```

72 znaki.

## Pełny opis (max 4000 znaków)

```
Menu Planer układa jedzenie na cały tydzień i sam robi z tego listę zakupów.
Wybierasz dania, aplikacja liczy, co trzeba kupić.

CO ROBI

Tydzień
Wybierasz dania na nadchodzący tydzień — bez przypisywania ich do konkretnych
dni i godzin. Tapnięcie dodaje danie do puli, suwak ustawia liczbę porcji.
Nie wiesz, co ugotować? Przycisk losowania podpowie.

Przepisy
Ponad 600 gotowych przepisów ze zdjęciami, składnikami i krokami
przygotowania. Filtrujesz po rodzaju posiłku, kraju pochodzenia, poziomie
trudności i ulubionych. Szukajka działa po nazwie. Możesz dodawać własne
przepisy i poprawiać istniejące — ze zdjęciem z telefonu.

Zakupy
Lista powstaje sama z dań wybranych na tydzień. Ten sam składnik z kilku
przepisów sumuje się w jedną pozycję, a produkty grupują się w kategorie,
więc idziesz sklepem po kolei, zamiast wracać między półkami. Dorzucasz
własne pozycje i rzeczy kupowane cyklicznie. To, co masz w domu, chowasz
jednym tapnięciem. Tryb sklepu powiększa listę i wygasza ekran rzadziej.

DLA RODZINY

Zakładasz gospodarstwo domowe i zapraszasz domowników. Plan tygodnia, lista
zakupów i przepisy są wspólne — jeśli ktoś odhaczy mleko przy półce, znika
Ci ono z listy od razu, bez odświeżania.

PROMOCJE I KOSZT KOSZYKA

Przy pozycjach na liście pokazują się aktualne promocje z gazetek popularnych
sieci handlowych, jeśli dany produkt jest akurat przeceniony. Osobna zakładka
szacuje, ile cały koszyk kosztowałby w każdym ze sklepów — liczone na
wspólnym zestawie produktów, żeby porównanie miało sens.

Dane o promocjach pochodzą z publicznie dostępnych gazetek. Aplikacja nie
jest powiązana z żadną siecią handlową ani przez nią sponsorowana, a ceny
mają charakter orientacyjny.

CZEGO NIE MA

Bez reklam. Bez opłat. Bez kont premium. Nie sprzedajemy Twoich danych i nie
śledzimy Cię po innych aplikacjach.

CZEGO POTRZEBUJESZ

Konta — po to, żeby plan i lista były wspólne dla domowników i żeby nic nie
przepadło po zmianie telefonu. Zakładasz je e-mailem albo kontem Google.
Aplikacja wymaga połączenia z internetem.

Pytania i uwagi: kontakt@menuplaner.pl
Polityka prywatności: https://menuplaner.pl/polityka-prywatnosci
Regulamin: https://menuplaner.pl/regulamin
```

---

## Pozostałe pola w konsoli

| Pole | Wartość |
| --- | --- |
| Kategoria | Styl życia (Lifestyle) — alternatywnie Jedzenie i picie |
| Typ | Aplikacja, bezpłatna, bez zakupów w aplikacji |
| E-mail kontaktowy | kontakt@menuplaner.pl |
| Polityka prywatności | https://menuplaner.pl/polityka-prywatnosci |
| Reklamy | Aplikacja NIE zawiera reklam |

## Bezpieczeństwo danych (formularz „Data safety")

Deklaracja musi zgadzać się z tym, co aplikacja faktycznie robi — Google to
sprawdza, a rozbieżność kończy się zdjęciem aplikacji.

Zbierane dane:

| Typ | Po co | Wymagane | Udostępniane innym firmom |
| --- | --- | --- | --- |
| Adres e-mail | Logowanie i konto | Tak | Nie |
| Imię | Pokazywanie, kto dodał pozycję, w obrębie rodziny | Tak | Nie |
| Zdjęcia (opcjonalnie) | Zdjęcie własnego przepisu, wgrywane przez użytkownika | Nie | Nie |
| Aktywność w aplikacji | Statystyki własne — które ekrany są używane | Nie | Nie |

Pozostałe odpowiedzi:

- Dane są szyfrowane w przesyle (HTTPS): **tak**
- Użytkownik może poprosić o usunięcie danych: **tak**, pisząc na
  kontakt@menuplaner.pl (tak stanowi polityka prywatności)
- Dane lokalizacji, kontakty, pliki, SMS, aparat w tle: **nie zbieramy**

Uprawnienia w manifeście: wyłącznie `INTERNET`. Nic poza tym nie jest
deklarowane i nic poza tym nie jest potrzebne.

## Grafiki, które trzeba przygotować

Tych nie da się wygenerować z kodu — potrzebny telefon albo emulator
z prawdziwymi danymi.

| Element | Wymiary | Uwagi |
| --- | --- | --- |
| Ikona w sklepie | 512 × 512 PNG | Jest: `public/icon-512.png` |
| Grafika promocyjna | 1024 × 500 PNG/JPG | Trzeba zrobić — pokazuje się na górze wpisu |
| Zrzuty z telefonu | min. 2, zalecane 4–8 | Proporcje 16:9 lub 9:16, krótszy bok ≥ 320 px |

Zrzuty warte pokazania, w tej kolejności: ekran Tydzień z kilkoma daniami,
lista zakupów z kategoriami, podgląd przepisu, zakładka z kosztem koszyka.

## Klasyfikacja treści

Kwestionariusz wypełnia się samemu. Dla tej aplikacji wszystkie odpowiedzi
o przemocy, treściach seksualnych, hazardzie i używkach to „nie". Wynik
powinien wyjść „Dla wszystkich" / PEGI 3.

**Jedno pytanie wymaga uwagi:** konsola pyta o treści tworzone przez
użytkowników. W aplikacji każdy zalogowany może dodawać i edytować przepisy,
a te są widoczne dla pozostałych — formalnie jest to treść użytkownika.
Google oczekuje wtedy możliwości zgłoszenia nadużycia i moderacji. Dziś tego
nie ma (`CLAUDE.md`, zaległość 6: „Pełna moderacja dania"). Do przemyślenia
przed wysłaniem — patrz `WYDANIE-ANDROID.md`.
