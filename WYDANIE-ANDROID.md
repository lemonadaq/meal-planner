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
| `VITE_SUPABASE_URL` | to samo, co w Vercelu |
| `VITE_SUPABASE_ANON_KEY` | to samo, co w Vercelu |

Dwa ostatnie są konieczne, bo apka natywna nosi bundle webowy w sobie —
zbudowany bez nich wstanie, ale nie połączy się z bazą. Workflow przerywa
z błędem, gdy ich brakuje, żeby taka wersja nie trafiła do sklepu.

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
