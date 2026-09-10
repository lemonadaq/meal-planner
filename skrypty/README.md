# Skrypty generujące dania

Generowanie przepisów (Claude) i zdjęć (Replicate) prosto do bazy `dania`.
Wiersze lądują w formacie 1:1 z formularzem `DodajDanie.jsx`.

## Sekrety

Żaden klucz nie jest w kodzie. Skrypty czytają env:

| Zmienna | Do czego | Skąd wziąć |
| --- | --- | --- |
| `SUPABASE_URL` | baza | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | baza (omija RLS) | Supabase → Settings → API Keys |
| `ANTHROPIC_API_KEY` | przepisy | console.anthropic.com → API keys |
| `REPLICATE_API_TOKEN` | zdjęcia | replicate.com → Settings → API tokens |

Na GitHubie: **Settings → Secrets and variables → Actions**. Pierwsze dwa
już tam są (używa ich `promo-daily`), dorzucić trzeba dwa ostatnie.

## Na GitHubie (bez odpalania czegokolwiek u siebie)

**Actions → „Generuj dania" → Run workflow.** Pola:

- **tryb** — `wszystko` (przepis + zdjęcie), `przepisy` (bez kosztów Replicate),
  `obrazy` (zdjęcia do dań, które są już w bazie bez zdjęcia)
- **dania** — `Bigos|obiad; Żurek|zupa` (po średniku, bo pole jest jednolinijkowe).
  W trybie `obrazy` puste = wszystkie dania bez zdjęcia.
- **limit** — bezpiecznik na koszty, `0` = bez limitu
- **overwrite** — w trybie `obrazy` regeneruje też te, które mają już zdjęcie
- **model_obrazu** — puste = `black-forest-labs/flux-2-pro`

> Workflow pokazuje się w zakładce Actions dopiero wtedy, gdy plik
> `.github/workflows/generuj-dania.yml` jest na gałęzi domyślnej (`main`).
> Dopóki siedzi tylko na branchu, przycisku „Run workflow" nie będzie.

## Lokalnie

```bash
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
       ANTHROPIC_API_KEY=... REPLICATE_API_TOKEN=...

npm run generuj:wszystko    # przepisy + zdjęcia dla dań z listy
npm run generuj:przepisy    # same przepisy
npm run generuj:obrazy      # same zdjęcia, do dań już w bazie
```

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
