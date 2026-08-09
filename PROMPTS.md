# PROMPTS.md — "Tydzień" simplification, step by step

Goal: add a radically simpler planning mode. Instead of assigning dishes to
specific days and meal slots, the user just picks a set of dishes for the week
("weekly pool") and the shopping list is generated from that pool. The old
calendar planner stays in the codebase as a hidden option (reachable from
Ustawienia), but the new **Tydzień** screen becomes the app's start screen.

How to use this file: run the prompts **in order**, one per fresh session.
Each prompt is self-contained. Steps 1–7 deliver the working feature;
steps 8–10 are polish/QA — the app is usable after step 7.

Rules that apply to EVERY prompt below (repeat-worthy, agents start fresh):

- Work on branch `claude/planner-app-simplification-qwfg35`. Commit with a
  clear message and push (`git push -u origin claude/planner-app-simplification-qwfg35`)
  when the step is done and `npm run lint`, `npm run test` and `npm run build` pass.
- Follow repo conventions from CLAUDE.md: plain JSX (no TypeScript), Polish
  variable/function names and Polish UI strings, functional components + hooks,
  async/await (no `.then()` chains), relative imports, inline styles built in a
  `makeS()` function using theme tokens `t, fonts, ui` from `../theme` (see
  `src/pages/Home.jsx` for the reference pattern), mobile-first layout.
- Supabase quirks: the `dania` table has ONE ROW PER INGREDIENT of a dish —
  columns `"Danie"`, `"Składnik"`, `"Ilość na 1 porcję"`, `"Jednostka"`,
  `"Kategoria"`, plus per-dish metadata repeated on each row (`rodzaj`, `"TYP"`,
  `zdjecie`, `kcal`, `ulubione`). Always deduplicate by `Danie` when you need
  a dish list, and always use `pobierzWszystkieWiersze` from
  `src/pobierzWszystko.js` (Supabase silently caps queries at 1000 rows).
- Do NOT modify or delete the old planner (`src/pages/Kalendarz.jsx`),
  `Home.jsx`, `KonfiguracjaSlotow.jsx`, the generator files
  (`useGenerator.js`, `generatorPlanu.js`, `wagiPreferencji.js`,
  `mapaPodobienstwa.js`) or their tests — they stay as a hidden option.

---

## Prompt 1 — Database: `plan_tygodnia` table + RLS

```
Create a SQL migration file `migracja_plan_tygodnia.sql` in the repo root
(follow the style of the existing `migracja_kcal.sql`). It must create a table
`plan_tygodnia` for the new "weekly pool" planning mode:

- id uuid primary key default gen_random_uuid()
- household_id uuid not null
- user_id uuid not null
- tydzien date not null            -- Monday of the week, e.g. 2026-08-03
- danie text not null              -- dish name, matches dania."Danie"
- porcje numeric not null default 1
- created_at timestamptz not null default now()
- unique (household_id, tydzien, danie)

Enable RLS. Policies must follow the household pattern used by other tables in
this project: authenticated users can SELECT/INSERT/UPDATE/DELETE only rows
where household_id = moj_household_id() (a SQL helper function that already
exists and reads the caller's JWT). Insert must also check
user_id = auth.uid(). Anon role: no access.

Then update CLAUDE.md: add `plan_tygodnia` to the table list in the
"Baza Supabase" section with a one-line description.

I will run the SQL manually in the Supabase dashboard — at the end, print the
full SQL and tell me exactly that (do not attempt to run it against any
database). Commit and push.
```

## Prompt 2 — Hook: `src/useTydzien.js` + unit tests

```
Create `src/useTydzien.js` — a data hook for the weekly pool stored in the
Supabase table `plan_tygodnia` (columns: id, household_id, user_id, tydzien
[date, Monday of the week as 'YYYY-MM-DD'], danie [text], porcje [numeric],
created_at; unique on household_id+tydzien+danie).

Export:
1. `poniedzialekTygodnia(offset = 0)` — pure function returning the Monday of
   the current week + offset weeks as a 'YYYY-MM-DD' string. Use
   `formatDataLocal` from `./dataHelpers` (NEVER toISOString — timezone bug).
   Week starts on Monday; Sunday belongs to the week that started the previous
   Monday. Mirror the logic of `tydzienZakupowZOffsetem` in
   `src/pages/ListaZakupow.jsx` so both screens agree on week boundaries.
2. `zakresTygodniaLabel(offset = 0)` — pure function returning a Polish label
   for the week range, e.g. "3–9 sierpnia" or "28 lipca – 3 sierpnia" when the
   week spans two months (use toLocaleDateString('pl-PL')).
3. `useTydzien(householdId, user, offset)` — the hook. State: `pula` (array of
   rows), `loading`. Actions (all async/await, all with optimistic local
   update and rollback on error):
   - `dodaj(danie)` — insert with porcje = 1; ignore duplicate (unique
     constraint) gracefully by refreshing instead of throwing
   - `usun(danie)` — delete the row for this week
   - `zmienPorcje(danie, delta)` — clamp to 0.5 minimum, step 0.5; update DB
   - `refresh()`
   It refetches when householdId or offset changes.

Add `src/test/useTydzien.test.js` with vitest tests for the two pure
functions (week boundary cases: Sunday evening, Monday morning, month-spanning
weeks, negative/positive offsets). Follow the style of the existing tests in
src/test/. Run `npm run test`, `npm run lint`. Commit and push.
```

## Prompt 3 — New screen: `src/pages/Tydzien.jsx` (v1: browse + toggle)

```
Create `src/pages/Tydzien.jsx` — the new main screen of the app ("weekly
pool" planning). Do NOT wire it into App.jsx yet (that's a later step); just
build the component. Props:
`{ user, householdId, onSelectDanie, sledz, refreshKey }`.

Layout (mobile-first, max-width 600 centered, styled exactly like
src/pages/Home.jsx — copy its makeS() approach with tokens t/fonts/ui from
'../theme'):

1. Header: eyebrow with the week range label (from `zakresTygodniaLabel` in
   src/useTydzien.js) with ‹ › arrow buttons to move between weeks (offset
   state), and an h1 like "Co jemy w tym tygodniu?". No settings avatar here.
2. Search input (text filter by dish name).
3. Category filter chips in a horizontally scrollable row — reuse the pattern
   from src/pages/Dania.jsx (FILTRY + chips): Wszystko / Ulubione /
   Śniadania / Obiady / Kolacje / Zupy / Desery. These map to the `rodzaj`
   column values: sniadanie, obiad, kolacja, zupa, deser; 'ulubione' filters
   on the boolean `ulubione` column. Multi-select like in Dania.jsx.
4. Vertical list of all dishes. Fetch with pobierzWszystkieWiersze (see
   src/pobierzWszystko.js) selecting '"Danie", rodzaj, "TYP", zdjecie,
   ulubione, kcal' from table `dania`, deduplicated by Danie (one row per
   ingredient in that table!). Each row: thumbnail (photo if `zdjecie`, else
   colored tile with emoji — copy the getKolor/getEmoji helpers from
   Home.jsx), dish name, small rodzaj label. Rows are buttons.

Interaction: tapping a row toggles the dish in/out of the current week's pool
via useTydzien (dodaj/usun). A dish that is in the pool shows a clear selected
state (accent border/background + a checkmark). Show a small sticky counter
somewhere visible ("W tym tygodniu: 5"). Log analytics via the `sledz` prop:
sledz('tydzien_dodaj', { danie }) and sledz('tydzien_usun', { danie }).

Keep it FAST and SIMPLE: no drag & drop, no modals, no day/slot logic.
Run lint + test + build. Commit and push.
```

## Prompt 4 — Tydzien.jsx v2: selected panel + portion stepper

```
Extend `src/pages/Tydzien.jsx` (created in an earlier step; uses the
useTydzien hook from src/useTydzien.js).

Add a "W tym tygodniu (n)" section between the header and the search input,
listing the dishes currently in the week's pool:

- Each selected dish: thumbnail, name, and a portion stepper "− 2 +"
  (calls zmienPorcje(danie, ±0.5) — values like 1.5 are legal, display with
  comma: "1,5"), plus an ✕ button to remove (usun).
- Tapping the dish name/thumbnail opens the recipe via onSelectDanie(danie).
- Empty state when the pool is empty: one short friendly line, e.g.
  "Wybierz z listy poniżej co chcesz jeść w tym tygodniu."
- When the pool is non-empty, show a prominent full-width button under the
  section: "Lista zakupów →" that calls a new prop `onZakupy` (add it to the
  component's props; it will navigate to the shopping list once wired).

Keep the browse list from v1 below, unchanged. Make sure switching weeks with
the ‹ › arrows swaps the pool contents (the hook already refetches on offset
change) and the selected checkmarks in the browse list follow the pool of the
VISIBLE week. Run lint + test + build. Commit and push.
```

## Prompt 5 — Wire into App.jsx + NavBar: Tydzień becomes the start screen

```
Wire the new Tydzien screen (src/pages/Tydzien.jsx, props: user, householdId,
onSelectDanie, sledz, refreshKey, onZakupy) into the app shell.

In src/App.jsx:
- Add tab id 'tydzien' and render <Tydzien> for it. Pass onZakupy={() =>
  zmienTab('zakupy')} and onSelectDanie={setWybraneD}.
- Make 'tydzien' the DEFAULT tab (useState('tydzien') instead of 'home').
- Update the back-navigation handler `cofnijWApceRef` so the "home base" tab
  is now 'tydzien' (back from any other tab goes to 'tydzien'; back on
  'tydzien' exits the app). Rename/adjust any `homeRefresh` plumbing so the
  Tydzien screen gets a bumped refreshKey when navigating back to it (same
  mechanism Home used).
- Home stays in the codebase and keeps working if rendered, but is no longer
  the start tab (it will be reachable from Ustawienia in a later step).

In src/components/NavBar.jsx:
- Tabs become: Tydzień ('tydzien', reuse the calendar icon), Przepisy
  ('przepisy'), Zakupy ('zakupy'). Remove Home and Planer from the navbar —
  do NOT delete the components, only the navbar entries.

Also: Tydzien has no settings avatar, so add a small settings (gear) icon
button in the Tydzien header (top-right) that calls a new prop
`onUstawienia` — wire it to setEkran('ustawienia') in App.jsx, same as Home
did. Check DanieDetail's NavBar usage in App.jsx still makes sense with the
new tab set. Run lint + test + build, quickly smoke-test with `npm run dev`
if possible. Commit and push.
```

## Prompt 6 — Old planner + old Home as hidden options in Ustawienia

```
The old calendar planner (src/pages/Kalendarz.jsx) and old start screen
(src/pages/Home.jsx) are no longer reachable after the navbar change. Keep
them in the codebase and expose them from Ustawienia as "advanced" options.

In src/pages/Ustawienia.jsx: in the "Konfiguracja tygodnia" section (next to
the existing buttons for sloty/rodzina), add two buttons styled like the
existing ones:
- "Planer kalendarza" → calls new prop `onKalendarz`
- "Stary ekran startowy" → calls new prop `onHome`

In src/App.jsx:
- Extend the overlay `ekran` state with values 'kalendarz-stary' and
  'home-stary'. Render <Kalendarz> / <Home> for them full-screen with the
  same props they received before (Kalendarz needs: user, householdId,
  onBack, domyslnePorcje, sledz, onSelectDanie, tydzien/onTydzienChange,
  cel/onCelObsluzony; Home needs: user, householdId, onTabChange,
  onPlanujSlot, onUstawienia, onSelectDanie, refreshKey). Their onBack /
  navigation callbacks should return to setEkran('ustawienia') or close the
  overlay sensibly (e.g. Home's onTabChange and onPlanujSlot may simply close
  the overlay and switch to the requested tab).
- Update `cofnijWApceRef` so the hardware/gesture back button from these two
  overlays returns to 'ustawienia'.

Note: the shopping list still reads the old `kalendarz` table too, so dishes
planned in the old planner keep flowing into the shopping list — do not
change that. Run lint + test + build. Commit and push.
```

## Prompt 7 — Shopping list reads the weekly pool

```
Make the shopping list include the new weekly pool. File:
src/pages/ListaZakupow.jsx, inside the `generuj` useCallback (search for
"Generowanie listy z planu").

Current behavior: it computes `poniedzialek` (Monday 'YYYY-MM-DD' of the
effective week from `tydzienZakupowZOffsetem(efektywnyOffset)`) and fetches
rows from `kalendarz` between dataOd and Sunday, then builds a map
`porcjeWszystkich` = { [dishName]: totalPortions } which drives ingredient
aggregation.

Change:
1. Add a query to the existing Promise.all: fetch from table `plan_tygodnia`
   (columns: danie, porcje) where household_id = householdId AND
   tydzien = poniedzialek. IMPORTANT: use `poniedzialek`, NOT `dataOd` — the
   weekly pool has no per-day granularity, so the "skip past days" filter
   must NOT apply to it.
2. After the existing kalendarz loop that fills `porcjeWszystkich`, add pool
   entries: for each pool row, porcjeWszystkich[danie] += Number(porcje)
   (initialize if absent). Pool rows have no dodatki/podmiany — skip those.
3. Everything downstream (meta matching, units, packaging, "mam w domu",
   promotions) works off porcjeWszystkich and must stay untouched.

Add a vitest unit test for the merge logic if you can extract it as a pure
function (preferred: extract a small pure helper like
`zsumujPorcje(planRows, pulaRows, domyslnePorcje)` into a module and test
dish-name overlap between kalendarz and pool rows summing correctly).
Follow existing test style in src/test/. Run lint + test + build.
Commit and push.
```

## Prompt 8 — "Wylosuj danie" + empty-state polish on Tydzien

```
Add a dice/random feature to src/pages/Tydzien.jsx: a small secondary button
"Wylosuj danie" in the "W tym tygodniu" section (visible in both empty and
non-empty state).

Behavior: pick a random dish and add it to the current week's pool via the
useTydzien hook. The candidate pool: all unique dishes (already fetched for
the browse list) whose rodzaj is one of sniadanie/obiad/kolacja/zupa/deser,
EXCLUDING dishes already in this week's pool, and PREFERRING dishes not
cooked recently — fetch `kalendarz` rows (danie, data) for this household
from the last 14 days plus `plan_tygodnia` rows from the previous week, and
exclude those names from the candidate set; if that leaves nothing, fall
back to the full candidate set. (This mirrors the "Może ugotujesz" logic in
src/pages/Home.jsx — see pobierzSugestie there — but much simpler; do not
import from Home.)

After adding, show a Toast (src/components/Toast.jsx, see Home.jsx usage)
"Dodano: {danie}" and log sledz('tydzien_losuj', { danie }).

Also polish empty/edge states on the screen: loading skeleton for the browse
list (simple gray rounded blocks like Home's sugestiaSkeleton), a "no results"
line when search+filters match nothing, and make sure a household with zero
dishes shows a hint pointing to Przepisy → dodaj danie.
Run lint + test + build. Commit and push.
```

## Prompt 9 — Test pass + regressions

```
Quality pass for the new "Tydzień" feature (weekly pool planning: table
plan_tygodnia, hook src/useTydzien.js, screen src/pages/Tydzien.jsx, shopping
list merge in src/pages/ListaZakupow.jsx).

1. Run `npm run test` — all existing tests must pass. Fix any regressions the
   new code introduced (do NOT weaken or delete existing tests to make them
   pass).
2. Review test coverage of the new code and fill the gaps with vitest tests
   in src/test/ (follow existing style there):
   - week-boundary helpers in useTydzien (if not already covered)
   - the shopping-list portion merge (kalendarz + plan_tygodnia overlap)
   - Tydzien.jsx filtering logic if it's extractable as pure functions
     (rodzaj chips multi-select + text search combined)
3. Run `npm run lint` and `npm run build`; fix everything they flag in files
   touched by this feature.
4. Read through App.jsx navigation with fresh eyes: default tab 'tydzien',
   back-gesture flow (tydzien → exit; other tabs → tydzien; overlays →
   ustawienia), DanieDetail opening from Tydzien and returning correctly,
   old Kalendarz/Home overlays reachable from Ustawienia. Fix what's broken.
Commit and push.
```

## Prompt 10 — Final QA + docs

```
Final step of the "Tydzień" simplification.

1. Update CLAUDE.md:
   - In "Architektura krótko": add Tydzien.jsx (new start screen, weekly
     pool) and useTydzien.js; note that Home.jsx and Kalendarz.jsx are now
     hidden options reachable from Ustawienia; note NavBar has 3 tabs
     (Tydzień / Przepisy / Zakupy).
   - In "Baza Supabase": ensure plan_tygodnia is listed.
   - In "Co ZOSTAŁO ZROBIONE niedawno": add a ✅ line summarizing this whole
     change (weekly-pool planning, new start screen, shopping list reads the
     pool, old planner hidden under Ustawienia).
2. Sweep the diff of branch claude/planner-app-simplification-qwfg35 vs main
   (git diff main...HEAD) for leftovers: dead code, console.logs, TODO
   markers, unused imports, Polish/English naming inconsistencies in the new
   files. Clean them up.
3. Run `npm run lint`, `npm run test`, `npm run build` one last time — all
   green.
4. Print a short manual smoke-test checklist for me (Polish, phone-oriented):
   the exact taps to verify the new flow end-to-end, including the Supabase
   migration reminder if migracja_plan_tygodnia.sql might not have been run
   yet.
Commit and push. Do NOT open a pull request — I'll do that myself.
```
