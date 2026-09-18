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

- **tryb** — `wszystko` (przepis + zdjęcie), `przepisy` (bez kosztów Replicate),
  `obrazy` (zdjęcia do dań, które są już w bazie bez zdjęcia),
  `lista` (tylko wypisuje dania z bazy — nic nie zmienia, zero kosztów),
  `usun` (KASUJE dania podane w polu `dania` — nieodwracalne),
  `kuchnie` (dopisuje kuchnię i poziom trudności — suchy bieg, chyba że `zapisz`)
- **dania** — `Bigos|obiad; Żurek|zupa` (po średniku, bo pole jest jednolinijkowe).
  W trybie `obrazy` puste = wszystkie dania bez zdjęcia.
- **limit** — bezpiecznik na koszty, `0` = bez limitu
- **overwrite** — nadpisuje istniejące: w trybie `obrazy` regeneruje zdjęcia,
  w trybie `przepisy` regeneruje przepisy dań, które są już w bazie
  (`ulubione` i `zdjecie` są przenoszone na nowe wiersze)
- **model_obrazu** — puste = `black-forest-labs/flux-2-pro`
- **rodzaj**, **tylko_ulubione** — filtry dla trybu `lista`
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

Efekt uboczny i pożądany: „białko jajka" z jednego przepisu i „jajka"
z drugiego schodzą się w JEDNĄ pozycję na liście, zamiast dwóch osobnych.

Co **zostaje nietknięte**, bo rozróżnia produkt na półce: `boczek wędzony`,
`mięso mielone`, `papryka suszona`, `mleko kokosowe`, `ser żółty`,
`kapusta kiszona`, a także `tuńczyk w oleju` i `szynka w plasterkach`.

Frazy przygotowania odróżniamy od nazw produktów **gramatycznie**: instrukcja
stoi w bierniku (`w kostkę`, `w plastry`, `na drobno` — jak pokroić), produkt
w miejscowniku (`w oleju`, `w puszce`, `w plasterkach` — w czym jest).

Testy: `src/test/nazwySkladnikow.test.js`. Każdy nowy przypadek zgłoszony
z apki zaczyna się tam od testu.

Prompt przepisu (`ZASADY_SKLADNIKOW` w `wspolne.js`) nadal prosi o nazwy bez
nawiasów i bez alternatyw, bo to szum również w przepisie — ale nic tego nie
egzekwuje przy zapisie i jest to świadome.

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
