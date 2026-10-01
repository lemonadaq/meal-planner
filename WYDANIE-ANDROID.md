# Wydanie aplikacji na Androida

Teksty do sklepu: `SKLEP-PLAY.md`. Ten plik jest o tym, jak powstaje plik
`.aab` i co trzeba zrobić poza kodem.

## Najpierw przeczytaj to

**Nowe osobiste konta deweloperskie muszą przejść testy zamknięte, zanim
dostaną dostęp do produkcji.** Google wymaga co najmniej **12 testerów
zapisanych nieprzerwanie przez 14 dni**. Dopiero potem można złożyć wniosek
o publikację. Kont firmowych to nie dotyczy.

Zaplanuj to z góry: trzeba zebrać 12 osób z kontami Google, które zapiszą się
do testu i zostaną w nim przez dwa tygodnie. Rodzina i znajomi wystarczą.
Zasada bywa zmieniana — sprawdź aktualne brzmienie w Play Console, zanim
zaczniesz liczyć dni.

Koszt konta: **25 USD jednorazowo**.

## Co jest już przygotowane

- `targetSdk 36`, `minSdk 24` — spełnia dzisiejsze wymagania Play
- jedyne uprawnienie to `INTERNET`, nic poza tym nie jest deklarowane
- własna ikona (nie domyślna Capacitora)
- polityka prywatności i regulamin pod publicznymi adresami
  (`/polityka-prywatnosci`, `/regulamin`) — Play wymaga działającego linku
- podpisywanie wydania czyta klucz i hasła wyłącznie ze zmiennych
  środowiskowych; nic tajnego nie leży w repozytorium
- workflow **Actions → „Wydanie Android"** buduje podpisany `.aab` i `.apk`

## Krok 1 — klucz podpisujący

Klucz robi się RAZ i podpisuje nim wszystkie przyszłe aktualizacje.

```bash
keytool -genkeypair -v \
  -keystore menuplaner.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias menuplaner
```

Zapamiętaj hasło i alias. Plik `.jks` **nie wchodzi do repozytorium** —
`.gitignore` już go blokuje.

Przy włączonym Play App Signing (domyślne dla nowych aplikacji) ten klucz
jest tylko **kluczem przesyłania**: właściwym kluczem aplikacji zarządza
Google. Zgubiony klucz przesyłania da się zresetować przez zgłoszenie do
Google — zgubiony klucz aplikacji nie, dlatego ten mechanizm w ogóle
istnieje. Mimo to zrób kopię pliku i hasła poza komputerem.

## Krok 2 — sekrety w GitHubie

Settings → Secrets and variables → Actions:

| Sekret | Co wpisać |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 menuplaner.jks` — cały wynik |
| `ANDROID_KEYSTORE_PASSWORD` | hasło do pliku `.jks` |
| `ANDROID_KEY_ALIAS` | `menuplaner` |
| `ANDROID_KEY_PASSWORD` | hasło do klucza (zwykle to samo) |
| `VITE_SUPABASE_ANON_KEY` | klucz **anon** — ten sam, co w Vercelu |

Adresu **nie trzeba dodawać osobno**: workflow bierze `VITE_SUPABASE_URL`,
a gdy go nie ma — istniejący `SUPABASE_URL`, którego używają inne workflow.
To ta sama wartość.

Klucz anon trzeba dodać, bo takiego sekretu jeszcze nie ma. Apka natywna nosi
bundle webowy w sobie — zbudowana bez klucza wstanie, ale nie połączy się
z bazą, a taka wersja trafiłaby do sklepu. Workflow przerywa z błędem.

**Nie podstawiaj pod niego `SUPABASE_SERVICE_ROLE_KEY`.** To jedyny klucz
Supabase, jaki już leży w sekretach, więc pomyłka jest łatwa — a skutki są
najgorsze z możliwych: klucz serwisowy omija całe RLS, wszedłby do pliku APK
i każdy, kto pobierze aplikację ze sklepu, mógłby go z niej wyjąć i czytać
oraz kasować cudze dane. Workflow to wykrywa (rozpoznaje JWT z rolą
`service_role` oraz nowszy format `sb_secret_...`) i przerywa build, ale nie
polegaj na tym — po prostu wklej właściwy klucz.

Klucz anon jest **publiczny z założenia**: jest już w kodzie strony
menuplaner.pl, więc jego skopiowanie niczego nie ujawnia. Nie jest sekretem
w sensie bezpieczeństwa, po prostu musi dotrzeć do builda.

## Krok 3 — budowanie

**Actions → „Wydanie Android" → Run workflow.** Pola:

- **version_name** — wersja widoczna w sklepie, np. `1.0.0`
- **version_code** — liczba, **musi rosnąć z każdym wydaniem**; Play odrzuca
  wgranie numeru, który już kiedyś był
- **podpisz** — zostaw zaznaczone; odznacz tylko, żeby sprawdzić, czy kod się
  kompiluje, bez ruszania klucza

Numer wersji ustawia workflow, a nie plik w repozytorium — pamiętanie
o ręcznym podbiciu przed każdym wydaniem to prosta droga do odrzuconego
wgrania.

Po przebiegu na dole strony jest artefakt z dwoma plikami:

- `.aab` — to wgrywasz do Play Console
- `.apk` — tego **nie** wgrywasz; służy do zainstalowania na własnym telefonie
  i sprawdzenia, zanim cokolwiek wyślesz. AAB-a nie da się zainstalować.

Workflow sam sprawdza na końcu (`apksigner verify`), czy artefakt jest
faktycznie podpisany.

## Krok 4 — zanim wyślesz

Zainstaluj `.apk` na telefonie i przejdź:

1. logowanie e-mailem **i** kontem Google (deep link `com.menuplaner.app`
   bywa pierwszą rzeczą, która pada w wersji natywnej)
2. dodanie dania do tygodnia, wejście w listę zakupów, odhaczenie pozycji
3. przycisk wstecz na każdej zakładce — w apce natywnej działa inaczej niż
   w przeglądarce
4. aplikacja ma otworzyć **planer**, nie blog (`jestNatywna` w `Trasy.jsx`)

## Krok 5 — testy zamknięte

**Nie potrzebujesz osobnego buildu dla testerów.** Ten sam `.aab` z artefaktu
idzie na kanał testów zamkniętych, a później — bez przebudowy — można go
awansować do produkcji.

### 5a. Zanim w ogóle pojawi się kanał testów

Play Console nie wypuści żadnej wersji, dopóki nie uzupełnisz tych sekcji.
Teksty i odpowiedzi są gotowe w `SKLEP-PLAY.md`.

- **Store listing** — nazwa, krótki i pełny opis, kategoria
- **Grafiki** — ikona 512×512, grafika promocyjna 1024×500, minimum 2 zrzuty
- **Polityka prywatności** — `https://menuplaner.pl/polityka-prywatnosci`
- **Bezpieczeństwo danych** — formularz, odpowiedzi w `SKLEP-PLAY.md`
- **Klasyfikacja treści** — kwestionariusz
- **Grupa odbiorców i reklamy** — aplikacja nie zawiera reklam

### 5b. Dostęp do aplikacji — to najczęstszy powód odrzucenia

Aplikacja wymaga logowania, więc recenzent Google **nie zobaczy nic poza
ekranem logowania**, jeśli nie dostanie konta. W sekcji **App access**
(Dostęp do aplikacji) trzeba podać działający login i hasło.

Zrób do tego **osobne konto**, nie swoje:

1. załóż konto w aplikacji na adres, który nie jest Twoim prywatnym,
2. zaloguj się na nie i dodaj kilka dań do tygodnia, żeby lista zakupów
   nie była pusta — recenzent ma zobaczyć działającą aplikację, a nie
   pusty ekran powitalny,
3. wpisz ten login i hasło w App access,
4. **nie kasuj tego konta** i nie zmieniaj mu hasła, dopóki aplikacja żyje
   w sklepie — Google wraca do niego przy każdej aktualizacji.

### 5c. Kanał testów i testerzy

**Testing → Closed testing → Create new release.**

- Lista testerów: przy 18 osobach najprościej **Email list** (do 100 adresów).
  Grupa Google ma sens dopiero przy większej skali.
- Adres musi być tym, na który dana osoba **loguje się do Google na telefonie**.
  Najczęstsza wpadka: ktoś podaje adres firmowy, a w telefonie ma prywatny —
  i potem nie widzi aplikacji.
- Wgraj `.aab` z artefaktu, dopisz krótkie „co nowego", wypuść wersję.
- Skopiuj **link do zapisu** (opt-in URL) — to jego rozsyłasz.

Po wypuszczeniu wersja bywa widoczna dopiero po kilku godzinach. Nie panikuj,
jeśli pierwsi testerzy zobaczą „nie znaleziono aplikacji".

### 5d. Co wysłać testerom

Gotowy tekst do wklejenia (WhatsApp, SMS):

```
Cześć! Testuję swoją apkę do planowania posiłków i zakupów —
potrzebuję kilku osób, żeby Google wpuścił ją do sklepu.

Zajmie Ci to 2 minuty:

1. Otwórz ten link NA TELEFONIE, zalogowany tym kontem Google,
   które podałeś/aś mi wcześniej:
   <TUTAJ WKLEJ LINK DO ZAPISU>

2. Kliknij „Zostań testerem" / „Become a tester".

3. Z tej samej strony przejdź do Google Play i zainstaluj apkę.

4. NAJWAŻNIEJSZE: zostaw ją zainstalowaną przez 2 tygodnie.
   Google liczy, ile osób jest zapisanych — jak ktoś się wypisze
   albo odinstaluje, licznik leci w dół i zaczynamy od nowa.

Możesz jej używać normalnie albo wcale, ważne żeby została.
Jak coś nie działa — pisz śmiało, o to chodzi.
```

### 5e. Licznik 14 dni

- Zegar rusza, gdy masz **co najmniej 12 zapisanych testerów**, i wymaga
  utrzymania tej liczby **nieprzerwanie**.
- Osiemnastu to dobry zapas: część osób nie kliknie linku, część zapomni,
  ktoś zmieni telefon. Poniżej dwunastu licznik startuje od nowa.
- Nie usuwaj i nie dodawaj testerów w trakcie bez potrzeby.
- Postęp widać w Play Console, w sekcji dostępu do produkcji — i to tam,
  a nie tutaj, jest prawda o aktualnych wymaganiach. Google tę zasadę
  zmieniał i może zmienić znowu.

Po przejściu okresu: **wniosek o dostęp do produkcji**, a po jego przyznaniu
awansujesz tę samą wersję z testów zamkniętych na produkcję.

### 5f. Gdy poprawiasz coś w trakcie testów

Odpalasz „Wydanie Android" z **podbitym `version_code`** (3, 4, 5…) i wgrywasz
nowy `.aab` na ten sam kanał. Testerzy dostają aktualizację automatycznie,
a licznik dni leci dalej — liczy się zapisanie do testu, nie konkretna wersja.

## Do przemyślenia przed wysłaniem

**Treści tworzone przez użytkowników.** Każdy zalogowany może dodać i edytować
przepis, a przepisy widzą wszyscy. Formalnie jest to treść użytkownika, przy
której Google oczekuje możliwości zgłoszenia nadużycia i moderacji. Dziś tego
nie ma — `CLAUDE.md`, zaległość 6. Do rozważenia: zgłaszanie przepisu,
ograniczenie edycji do własnych wpisów albo wyraźna informacja, że przepisy
są wspólne dla zamkniętej grupy.

**Nazwy sieci handlowych.** Opis mówi o „gazetkach popularnych sieci"
i wprost zaznacza brak powiązania. Nie wymieniaj sieci z nazwy w tytule ani
w grafice promocyjnej — to najkrótsza droga do zarzutu podszywania się.

**Nazwa aplikacji.** `strings.xml` mówi „Menu planer", `manifest.json`
„Menu Planer", `CLAUDE.md` „Smakuje". Przed wydaniem warto ujednolicić.
