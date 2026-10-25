# Skrypty generujące dania

Generowanie przepisów (Claude) i zdjęć (Replicate) prosto do bazy `dania`.
Wiersze lądują w formacie 1:1 z formularzem `DodajDanie.jsx`.

## Sekrety

Żaden klucz nie jest w kodzie. Skrypty czytają env:

| Zmienna | Do czego | Skąd wziąć |
| --- | --- | --- |
| `SUPABASE_URL` | baza | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | baza (omija RLS) | Supabase → Settings → API Keys |
| `ANTHROPIC_KEY` | przepisy | console.anthropic.com → API keys |
| `REPLICATE_KEY` | zdjęcia | replicate.com → Settings → API tokens |

Wszystkie cztery są już w **Settings → Secrets and variables → Actions**.
Lokalnie działają też standardowe nazwy SDK (`ANTHROPIC_API_KEY`,
`REPLICATE_API_TOKEN`) — skrypty przyjmują jedno i drugie.

## Na GitHubie (bez odpalania czegokolwiek u siebie)

**Actions → „Generuj dania" → Run workflow.** Pola:

- **tryb** — `auto` (podajesz LICZBĘ dań, nazwy wymyśla Claude — patrz niżej),
  `propozycje` (same nazwy do przejrzenia, nic nie zapisuje),
  `klucze` (sprawdza, czy klucze i kredyty działają — nic nie generuje),
  `wszystko` (przepis + zdjęcie), `przepisy` (bez kosztów Replicate),
  `obrazy` (zdjęcia do dań, które są już w bazie bez zdjęcia),
  `lista` (tylko wypisuje dania z bazy — nic nie zmienia, zero kosztów),
  `usun` (KASUJE dania podane w polu `dania` — nieodwracalne),
  `kuchnie` (dopisuje kuchnię i poziom trudności — suchy bieg, chyba że `zapisz`)
- **ile** — tryb `auto`/`propozycje`: ile dań dodać. Jedyne pole, które trzeba
  wypełnić
- **dania** — `Bigos|obiad; Żurek|zupa` (po średniku, bo pole jest jednolinijkowe).
  W trybie `obrazy` puste = wszystkie dania bez zdjęcia. W trybie `auto` to pole
  znaczy co innego: rozkład kuchni (`polska:3, wloska:1`), puste = domyślny
- **limit** — bezpiecznik na koszty, `0` = bez limitu
- **overwrite** — nadpisuje istniejące: w trybie `obrazy` regeneruje zdjęcia,
  w trybie `przepisy` regeneruje przepisy dań, które są już w bazie
  (`ulubione` i `zdjecie` są przenoszone na nowe wiersze)
- **model_obrazu** — puste = `black-forest-labs/flux-2-pro`
- **rodzaj**, **tylko_ulubione** — filtry dla trybu `lista`. W trybie `auto`
  **rodzaj** to rozkład rodzajów (`obiad:3, zupa:1`), puste = domyślny
- **zapisz_liste** — tryb `lista`: przepisuje `LISTA_DAN.md` aktualnym stanem bazy
  i commituje zmianę do repo
- **zapisz** — tryb `kuchnie`: bez tego suchy bieg, z nim faktyczny zapis

> Workflow pokazuje się w zakładce Actions dopiero wtedy, gdy plik
> `.github/workflows/generuj-dania.yml` jest na gałęzi domyślnej (`main`).
> Dopóki siedzi tylko na branchu, przycisku „Run workflow" nie będzie.

## Lokalnie

```bash
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
       ANTHROPIC_KEY=... REPLICATE_KEY=...

npm run sprawdz:klucze      # czy klucze działają (kredyty!) — nic nie generuje
ILE=20 npm run generuj:auto # 20 nowych dań: nazwy, przepisy i zdjęcia
npm run generuj:wszystko    # przepisy + zdjęcia dla dań z listy
npm run generuj:przepisy    # same przepisy
npm run generuj:obrazy      # same zdjęcia, do dań już w bazie
npm run lista               # wypisz dania z bazy (read-only)
```

Filtry dla `lista` (łączą się przez ORAZ):

```bash
RODZAJ=sniadanie ULUBIONE=1 npm run lista   # ulubione śniadania
BEZ_ZDJECIA=1 npm run lista                 # dania bez zdjęcia
ZAPISZ_LISTE=1 npm run lista                # odśwież LISTA_DAN.md
npm run duble                               # szukaj dubli (offline, z LISTA_DAN.md)
DANIA="Nazwa jedna; Nazwa druga" npm run usun   # skasuj dania (NIEODWRACALNE)
```

`ZAPISZ_LISTE` zapisuje **całą** bazę, niezależnie od filtrów — plik ma opisywać
stan wszystkiego, a nie wycinek.

Na końcu `lista` wypisuje gotową linijkę do wklejenia w pole **dania**
w akcji — czyli można nią wybrać zestaw i od razu puścić na niego `obrazy`.

Lista dań: zmienna `DANIA` albo plik `skrypty/nowe-dania.txt`
(format `Nazwa|rodzaj`, `#` to komentarz).

Bezpiecznik: `LIMIT=5 npm run generuj:wszystko` przerobi tylko 5 pierwszych dań.

## Tryb `auto` — podajesz liczbę, nie listę

Wpisujesz **ile** dań dodać i tyle. Skrypt (`generuj-auto.mjs`):

1. czyta nazwy wszystkich dań z bazy,
2. rozdziela zamówioną liczbę na kuchnie i rodzaje (`propozycje.js`),
3. prosi Claude'a o nazwy — osobno dla każdej kuchni, paczkami po 25,
4. odsiewa duble: dokładne i „to samo danie pod inną nazwą",
5. każde przyjęte danie idzie standardową ścieżką: przepis → INSERT →
   zdjęcie → Storage (ten sam `potok.js`, co tryb `wszystko`).

Domyślny rozkład (do podmiany polami `dania` i `rodzaj`):

| | |
| --- | --- |
| kuchnie | polska 30, włoska 18, francuska 14, grecka 8, hiszpańska 8, amerykańska 7, meksykańska 6, niemiecka 5, węgierska 4 |
| rodzaje | obiad 34, kolacja 20, śniadanie 16, deser 16, surówka 14 |

`przekaska` **nie jest** generowana (ustalenie Filipa). `zupa` i `dodatek` też
nie są w domyślnym rozkładzie — jak mają być, wpisz je w pole **rodzaj**
(`obiad:3, zupa:1`).

Duble są pilnowane dwa razy, bo samo proszenie modelu nie wystarcza:

- nazwy dań z bazy idą do promptu (blok systemowy z cache'em, płacimy raz),
- każda propozycja przechodzi przez miarę podobieństwa nazw
  (`podobienstwo.js`) — tę samą, którą liczy `npm run duble`. Dlatego przy
  „Spaghetti carbonara" w bazie odpadnie też „Carbonara z boczkiem".

Przy gęstej bazie model zwróci mniej dań, niż zamówisz — skrypt wtedy dopytuje
(3 rundy na paczkę) i na końcu pisze, ile z ilu wyszło. To normalne: 630 dań
w bazie znaczy, że klasyka jest już zajęta.

**Duża paczka (200 dań): rób po 50.** Jeden przebieg to ~1 min na danie
(przepis + zdjęcie), czyli 200 dań ≈ 3,5 h i ocieranie się o limit czasu
joba. Cztery przebiegi po 50 są bezpieczniejsze, a drugi i kolejne widzą już
to, co dodał pierwszy, więc nie powtórzą dań.

**Najpierw obejrzyj nazwy:** tryb `propozycje` robi punkty 1-4 i wypisuje
gotową linijkę do wklejenia w pole **dania**. Koszt to kilka zapytań
tekstowych, zero zdjęć.

## Słownik składników

Model dostaje czystą kartkę przy każdym daniu, więc ten sam produkt wraca
w trzech pisowniach: „natka pietruszki", „garstka natki pietruszki",
„pietruszka — natka". Na liście zakupów to trzy pozycje, a `skladniki_meta`
(rozmiar opakowania, kcal) dopasuje się tylko do jednej.

Dlatego każde generowanie przepisu (`auto`, `wszystko`, `przepisy`) zaczyna się
od zbudowania słownika z bazy — `slownik.js`:

- **do promptu** idzie lista „tak te produkty już się nazywają i w czym się je
  liczy" (400 najczęstszych, blok systemowy z cache'em),
- **po odpowiedzi** `czyscSkladnik()` sprząta to, co model przysłał mimo
  prośby: nawiasy, alternatywy („boczek lub podgardle"), ilość wklejoną
  w nazwę, słowo-ilość w polu ilości („garstka" → 1 łyżka), a nazwę podmienia
  na pisownię, która w bazie już jest (łapie też odmianę: „natki pietruszki"
  → „natka pietruszki", „soli" → „sól").

Jednostki przelicza **tylko w jedną stronę** — z gramów na sztuki, nigdy
odwrotnie. `150 g cebuli` staje się `1 szt`, bo tak cebula jest w bazie
liczona i tak się ją kupuje, ale `1 szt` nigdy nie zrobi się `150 g`. Powód:
słownik stoi na starych daniach, w których wszystko było w gramach (patrz
„Jednostki: czemu cebula bywa w gramach") — przeliczanie w drugą stronę
cofałoby poprawki, które wnosi prompt. Do przeliczenia potrzebna jest waga
sztuki ze `skladniki_meta`; bez niej jednostka zostaje taka, jaką podał model.

Granica jest ta sama co w `src/nazwySkladnikow.js`: **ujednolicamy pisownię
i jednostkę, nie podmieniamy towaru.** „Natka pietruszki" nie staje się
„pietruszką", „zielona cebulka" nie staje się „cebulą". Gdy nazwa pasuje do
bazy tylko po uproszczeniu do produktu ze sklepu („cebula pokrojona w kostkę"
↔ „cebula"), bierzemy stamtąd samą jednostkę — nazwa z przepisu zostaje.

Testy: `src/test/slownikSkladnikow.test.js`, `src/test/generujAutoPotok.test.js`
(cały potok na zamockowanym Claude, Supabase i Replicate).

## Gdy padają kredyty albo klucz

**Actions → „Generuj dania" → tryb `klucze`.** Odpytuje po kolei Supabase,
Anthropic (jedno zapytanie na `max_tokens=1`) i Replicate (`/v1/account`,
darmowe) i mówi, co nie działa. Skończone kredyty widać po komunikacie
„credit balance is too low" — to nie zły klucz, tylko puste konto.

Nowy klucz wpisuje się **wyłącznie** w Settings → Secrets and variables →
Actions → `ANTHROPIC_KEY` → Update secret. Do kodu kluczy nie wpisujemy
nigdy — `.gitignore` blokuje stare lokalne `generuj-*.mjs` właśnie dlatego,
że miały je na sztywno.

Model tekstowy można podmienić bez ruszania kodu: `ANTHROPIC_MODEL`
(np. `claude-sonnet-5-5`, tańszy od Opusa przy generowaniu przepisów).

## Wznawianie

Skrypty są wznawialne — po błędzie odpal ponownie, dokończą tylko to, czego brakuje:

- danie z przepisem **i** zdjęciem → pomijane
- danie z przepisem **bez** zdjęcia → dogenerowywane samo zdjęcie, prompt
  budowany ze składników z bazy (żeby zdjęcie zgadzało się z przepisem)
- danie nieznane → przepis + zdjęcie

Jeśli przepis się zapisał, a zdjęcie padło — przepis zostaje, kolejny przebieg
dorobi samo zdjęcie.

## Duble

`npm run duble` porównuje nazwy dań i wypisuje pary, które mogą być tym samym
daniem — osobno te **między kategoriami**, bo tam najłatwiej je przeoczyć
(to samo raz jako przekąska, raz jako kolacja). Czyta `LISTA_DAN.md`, więc nie
potrzebuje kluczy i nic nie kosztuje; odśwież najpierw listę, jeśli baza się
zmieniła. Próg czułości: `PROG=0.5 npm run duble`.

Warto puścić przed dorzuceniem nowej paczki dań.

## Kasowanie

`usun` kasuje dania po nazwie. Supabase nie ma kosza, więc to nieodwracalne.
Bezpieczniki: kasuje wyłącznie nazwy podane wprost (nigdy nic po wzorcu), nazwa
musi pasować dokładnie, przed skasowaniem wypisuje **pełną zawartość wierszy
do logu** — z niego da się danie odtworzyć — i ostrzega, gdy kasowane danie jest
ulubione.

Po skasowaniu odśwież `LISTA_DAN.md` (tryb `lista` + `zapisz_liste`).

## Nazwy składników: przepis kontra lista zakupów

To są dwie różne potrzeby i dlatego rozwiązane są w dwóch różnych miejscach.

**W przepisie nazwa może być precyzyjna.** „Białko jajka", „ryż ugotowany",
„orzechy laskowe prażone" niosą informację, która jest w przepisie potrzebna
i tam zostaje. Tabela `dania` NIE jest przez nic przerabiana.

**Na liście zakupów nazwa musi być produktem ze sklepu.** Białka jajka nie
kupisz, a nazwa z nawiasem nie dopasuje się ani do `skladniki_meta` (rozmiar
opakowania), ani do promocji.

Przekształcenie robi `uproscNazweSkladnika()` z `src/nazwySkladnikow.js`,
wołane **w locie** przy budowaniu listy w `ListaZakupow.jsx`:

| W przepisie | Na liście zakupów |
| --- | --- |
| `białko jajka` | `jajka` |
| `ryż z wczoraj` | `ryż` |
| `prażone orzechy laskowe - siekane` | `prażone orzechy laskowe` |
| `gorzka czekolada do posypania` | `gorzka czekolada` |
| `kawa espresso (świeżo zaparzona)` | `kawa espresso` |
| `cebula w kostkę` | `cebula` |
| `sok z cytryny` | `cytryna` |
| `ząbek czosnku` | `czosnek` |
| `liście bazylii` | `bazylia` |
| `cebulka` | `cebula` |
| `500 g mąki` | `mąka` |

Efekt uboczny i pożądany: „białko jajka" z jednego przepisu i „jajka"
z drugiego schodzą się w JEDNĄ pozycję na liście, zamiast dwóch osobnych.

Co **zostaje nietknięte**, bo rozróżnia produkt na półce: `boczek wędzony`,
`mięso mielone`, `papryka suszona`, `mleko kokosowe`, `ser żółty`,
`kapusta kiszona`, a także `tuńczyk w oleju` i `szynka w plasterkach`.

Granica jest jedna i ważna: **czyścimy OPIS, nie podmieniamy TOWARU.**
Dlatego `natka pietruszki` NIE staje się `pietruszką` (liście w pęczku kontra
korzeń — dwa różne produkty), a `zielona cebulka` NIE staje się `cebulą`
(to dymka, inne miejsce w sklepie). Mapa zdrobnień dopasowuje całą nazwę
właśnie po to, żeby tego nie zepsuć.

Frazy przygotowania odróżniamy od nazw produktów **gramatycznie**: instrukcja
stoi w bierniku (`w kostkę`, `w plastry`, `na drobno` — jak pokroić), produkt
w miejscowniku (`w oleju`, `w puszce`, `w plasterkach` — w czym jest).

Testy: `src/test/nazwySkladnikow.test.js`. Każdy nowy przypadek zgłoszony
z apki zaczyna się tam od testu.

Prompt przepisu (`ZASADY_SKLADNIKOW` w `wspolne.js`) prosi o nazwy bez nawiasów
i bez alternatyw, bo to szum również w przepisie. Od trybu `auto` prośba ma
poparcie w kodzie: `czyscSkladnik()` ze `slownik.js` wycina nawiasy,
alternatywy i słowa-ilości przed zapisem (patrz „Słownik składników"). Ale
tylko dla dań generowanych OD TERAZ — w bazie leży kilkaset dań zapisanych
wcześniej, więc `uproscNazweSkladnika()` nadal musi radzić sobie z tym, co tam
jest, a nie zakładać, że prompt albo słownik zadziałał.

## Jednostki: czemu cebula bywa w gramach

Enum `jednostka` w schemacie dopuszcza `g`, `ml`, `szt`, `łyżka`,
`łyżeczka`, `szczypta`. Długo **nic nie mowiło modelowi, co kiedy wybrać** —
więc sypał gramami, bo są uniwersalne. W bazie wylądowała `cebula 150 g`
zamiast `cebula 1 szt`.

Na liście zakupów to realna różnica: cebuli nie kupuje się na wagę, więc
`450 g cebuli` trzeba sobie w sklepie podzielić w głowie. Lista **potrafi**
przeliczyć gramy na sztuki (`policzOpakowania()` w `ListaZakupow.jsx`), ale
tylko gdy `skladniki_meta` ma dla produktu `rozmiar_opakowania` i włączone
`zaokraglaj` — a dla większości warzyw nie ma.

Reguly wyboru jednostki siedzą w `ZASADY_JEDNOSTEK` w `wspolne.js`: `szt` dla
tego, co liczy się na sztuki (cebula, czosnek, jajko, cytryna, papryka,
ziemniak, pierś z kurczaka, puszka), `g` dla tego, co się waży (mięso
mielone, ryż, mąka, ser), `ml` dla płynów, `łyżka`/`łyżeczka` dla dodatków,
`szczypta` dla przypraw.

**To naprawia dania generowane OD TERAZ.** Dania już zapisane zostają
z gramami — żeby je poprawić, trzeba albo uzupełnić `skladniki_meta`
(wagę sztuki dla warzyw), albo przegenerować przepisy z `overwrite`.
Prompt sam z siebie nie rusza tego, co leży w bazie.

Drugie zabezpieczenie dokłada słownik składników: gdy model mimo wszystko
poda `150 g cebuli`, a baza liczy cebulę w sztukach i `skladniki_meta` zna
wagę sztuki — zapisze się `1 szt`. Szczegóły i granice: „Słownik składników".

## Gdy model uparcie pudłuje

`opisy-reczne.js` trzyma dwie mapy per danie, obie nadpisują to, co wymyśli model:

- **`OPISY_RECZNE`** — opis wyglądu po angielsku, wchodzi do promptu zdjęcia
  zamiast opisu wygenerowanego. Pisz też, czego ma NIE być („no grill marks",
  „no halved eggs") — modele obrazu reagują na zakaz mocniej niż na opis wersji
  poprawnej. Potem: tryb `obrazy` + `overwrite`.
- **`WSKAZOWKI_PRZEPISU`** — po polsku, doklejane na początek promptu przepisu.
  Używane tylko wtedy, gdy przepis jest generowany, czyli przy nowym daniu albo
  przy `overwrite` w trybie `przepisy`.

Zmiana przepisu zwykle oznacza, że zdjęcie też trzeba przegenerować — skrypt
przypomina o tym w podsumowaniu.

## Style zdjęć

`style-zdjec.js` — 4 setupy fotograficzne (rustykalny, nordycki, moody, domowy),
rotowane **deterministycznie** po nazwie dania: to samo danie zawsze dostaje ten
sam styl, sąsiednie dania różne. Do tego naczynie dobierane po rodzaju (zupa
w miseczce, deser na talerzyku) i rotowana niedoskonałość (okruchy, zaciek sosu,
ślad po łyżce) — bo idealnie ułożony talerz to pierwsza rzecz, która czyta się
jako AI.

Dokładanie piątego stylu = dopisanie obiektu do tablicy `STYLE`. Uwaga: zmiana
kolejności w tablicy przetasuje style wszystkim daniom (indeks liczony modulo
z długości), więc nowe style dopisuj na końcu.

## Zmiana modeli

```bash
ANTHROPIC_MODEL=claude-haiku-4-5 npm run generuj:przepisy
REPLICATE_MODEL=google/nano-banana-2 npm run generuj:obrazy
```

Gotowe kształty inputu w `wspolne.js` → `MODELE_OBRAZU`: `flux-2-pro` (domyślny),
`flux-2-max`, `nano-banana-2`, `imagen-4-ultra`. Inny model dostanie generyczny
input `{ prompt, aspect_ratio }` — jak wymaga innych pól, dopisz go do mapy.

## `sprawdz-nazwe-pakietu.sh` — nie do generowania, do wydania Androida

Odstaje od reszty katalogu: nie dotyka ani bazy, ani Replicate. Sprawdza, czy
nazwa pakietu w zbudowanym APK zgadza się z tą, pod którą aplikacja jest
założona w Play Console (`pl.menuplaner`). Woła go workflow „Wydanie Android"
tuż po zbudowaniu artefaktów.

```
bash skrypty/sprawdz-nazwe-pakietu.sh <plik.apk> pl.menuplaner
bash skrypty/sprawdz-nazwe-pakietu.test.sh     # test na atrapie aapt2
```

Dlaczego osobny plik i osobny test, skoro to dziesięć linijek: pierwsza wersja
była wklejona wprost w YAML-u workflow i miała zachłanne `.*name='`. Łapało to
OSTATNIE wystąpienie `name='` w linii `aapt2 dump badging`, czyli
`compileSdkVersionCodename='16'` — więc zamiast nazwy pakietu wychodziło „16"
i wydanie padało na „niezgodnej nazwie" przy poprawnie zbudowanym pliku.
Wyrażenie jest teraz zakotwiczone na `^package: name='`, a test odtwarza tamto
wyjście aapt2 jeden do jednego. Nie przenoś tej logiki z powrotem do YAML-a —
tam nie da się jej odpalić bez palenia całego przebiegu wydania.
