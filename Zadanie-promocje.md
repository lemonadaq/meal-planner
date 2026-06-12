# ZADANIE: Promocje sklepowe na liście zakupów (UI + baza + scraper Lidl/Kaufland)

Design UI jest zatwierdzony — komponenty podane niżej w sekcji A są gotowe, nie zmieniaj ich
wyglądu, tylko zaadaptuj do realnych struktur danych projektu. Zanim cokolwiek zmienisz:
pokaż Filipowi plan + diff, czekaj na akceptację. Przed `git commit` / `git push` — zawsze pytaj.

Kolejność wykonania: **B (baza) → A (UI na mockach) → C (matching) → D (scraper)**.
UI ma działać od razu na mockach, scraper dopina dane później.

---

## CZĘŚĆ A — UI promocji (design zatwierdzony)

Nowy plik `src/components/Promocje.jsx` + modyfikacja `ListaZakupow.jsx`. Wszystkie kolory
przez tokeny `t` (działają w light/dark). Sprawdziłem — wszystkie użyte tokeny
(`secondarySoft`, `surfaceWash`, `muteLight`, `textSoft` itd.) istnieją w `theme.js`.

### Model danych promo na pozycji listy

```js
// item.promo = null | {
//   store: 'Lidl',             // nazwa sklepu
//   old: 8.49, now: 5.99,      // ceny w zł (number); old może być null
//   off: '-29%',               // etykieta rabatu (string — może być „2 za 7 zł")
//   until: 'do niedzieli',     // do kiedy, krótki human-readable
// }
```

### Helpery (w `Promocje.jsx`)

```js
export const zl = (v) => v.toFixed(2).replace('.', ',') + ' zł'

// kolory-kropki sklepów (neutralne, nie loga) — celowo stałe w obu motywach
export const STORE_DOT = { Biedronka:'#C9A33B', Lidl:'#4A7FB5', Kaufland:'#B5564A', Auchan:'#8A6B43' }

export function StoreDot({ store, size = 8 }) {
  return <span style={{ width:size, height:size, borderRadius:'50%',
    background: STORE_DOT[store] || t.mute, display:'inline-block', flex:'0 0 auto' }} />
}
```

Keyframe — dodaj raz do `index.css` (obok keyframes toasta):

```css
@keyframes expandIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
```

### A1) PromoBanner — zwijana karta nad listą

```jsx
function PromoBanner({ items }) {
  const [open, setOpen] = useState(false)
  const promos = items.filter(i => i.promo)
  if (!promos.length) return null
  const saved = promos.reduce((s, i) => s + ((i.promo.old ?? i.promo.now) - i.promo.now), 0)
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: t.secondarySoft, borderRadius: 16, padding: '13px 14px',
      marginBottom: 12, cursor: 'pointer', border: `1px solid ${t.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>🏷️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>{promos.length} okazji na Twojej liście</div>
          <div style={{ fontSize: 12, color: t.secondary, fontWeight: 600, marginTop: 1 }}>oszczędzasz ~{zl(saved)}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.secondary} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      {open && (
        <div style={{ marginTop: 11, display: 'flex', flexDirection: 'column', gap: 8, animation: 'expandIn .18s ease-out' }}>
          {promos.map(item => (
            <div key={item.klucz} style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.surface, borderRadius: 11, padding: '9px 11px' }}>
              <StoreDot store={item.promo.store} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{item.skladnik}</span>
                <span style={{ fontSize: 11.5, color: t.mute }}> · {item.promo.store}, {item.promo.until}</span>
              </div>
              <div style={{ fontSize: 12, flex: '0 0 auto' }}>
                {item.promo.old != null && <s style={{ color: t.muteLight }}>{zl(item.promo.old)}</s>}
                {' '}<b style={{ color: t.secondary }}>{zl(item.promo.now)}</b>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

Uwaga adaptacyjna: w designie było `item.id` / `item.name` — w projekcie to `item.klucz`
i `item.skladnik`. Powyżej już poprawione; pilnuj tego w całej integracji.

### A2) PromoChip — chip ceny po prawej stronie wiersza

```jsx
function PromoChip({ promo, open }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
      <span style={{ background: t.secondarySoft, borderRadius: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.secondary }}>{zl(promo.now)}</span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: t.secondary, opacity: .75 }}>{promo.off}</span>
      </span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.muteLight} strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  )
}
```

### A3) PromoDetail — rozwijany szczegół pod wierszem

```jsx
function PromoDetail({ promo }) {
  return (
    <div style={{
      margin: '0 0 11px 35px', padding: '10px 12px', borderRadius: 11,
      background: t.surfaceWash, border: `1px solid ${t.border}`,
      animation: 'expandIn .18s ease-out', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <StoreDot store={promo.store} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{promo.store} · {promo.until}</div>
        <div style={{ fontSize: 11.5, color: t.mute, marginTop: 1 }}>
          {promo.old != null && <><s style={{ opacity: .7 }}>{zl(promo.old)}</s>{' → '}</>}
          <b style={{ color: t.secondary }}>{zl(promo.now)}</b>
          {promo.old != null && <>{'  ·  taniej o '}<b style={{ color: t.secondary }}>{zl(promo.old - promo.now)}</b></>}
        </div>
      </div>
    </div>
  )
}
```

### A4) Integracja z wierszem listy — WAŻNE, zmiana interakcji

Obecnie w `ListaZakupow.jsx` cały wiersz pozycji toggluje „kupione" (pointer handlers
`down/move/up` na divie wiersza). Po zmianie:

- [ ] Checkbox (kwadracik) = JEDYNY sposób odhaczenia „kupione". Przenieś logikę toggle
      na checkbox; `e.stopPropagation()` na jego pointer/click handlerach (wzorzec już
      jest przy przyciskach 🏠 i ✎). Powiększ hit-area checkboxa (padding/min 40×40
      dotykowo), żeby odhaczanie nie stało się upierdliwe.
- [ ] Tap w resztę wiersza:
  - gdy `item.promo` → toggluje `PromoDetail` (stan `openId` w komponencie listy —
    jeden otwarty naraz, klucz = `item.klucz`),
  - gdy brak `promo` → też toggle „kupione" jak dotąd (żeby nie psuć nawyku) — chyba że
    Filip zdecyduje inaczej; zapytaj go jednym pytaniem z 2 opcjami przed implementacją:
    (1) wiersz bez promo dalej odhacza, (2) wiersz bez promo nie robi nic, odhacza tylko checkbox.
- [ ] Sklep widoczny od razu w drugiej linii wiersza, obok ilości:
      `{ilość} · <StoreDot size={6}/> {promo.store}` — kolor `t.textSoft`.
- [ ] Po odhaczeniu: chip i druga linia sklepu znikają (nazwa przekreślona, `t.muteLight`
      — jak dotychczasowe „kupione").
- [ ] Produkty bez `promo`: wiersz wygląda i działa dokładnie jak dziś.
- [ ] `PromoBanner` renderuj NAD kartą listy (nad sekcjami kategorii); gdy nic nie ma
      promocji — banner się nie renderuje.
- [ ] Uważaj na istniejący swipe/pointer-move w wierszu — toggle szczegółu tylko gdy to
      był tap (brak ruchu), nie scroll.
- [ ] `TrybSklepu` („Idę na zakupy"): na razie bez chipów promo — tylko upewnij się, że
      nic się nie wysypuje, gdy item ma `promo`. Rozbudowa później.
- [ ] Na czas budowy UI: mock w `ListaZakupow.jsx` za flagą `const MOCK_PROMO = false` —
      łatwe włączenie do testów, domyślnie wyłączone.

---

## CZĘŚĆ B — Baza: tabela `promocje`

Migracja SQL (pokaż Filipowi przed uruchomieniem; on ją odpala w Supabase):

```sql
create table promocje (
  id          bigint generated always as identity primary key,
  sklep       text not null,                -- 'Lidl' | 'Kaufland' | ...
  nazwa       text not null,                -- nazwa produktu z gazetki
  nazwa_norm  text not null,                -- lower, bez ogonków? NIE — zostaw polskie znaki, tylko lower+trim
  cena_stara  numeric(8,2),                 -- null gdy gazetka nie podaje
  cena_nowa   numeric(8,2) not null,
  rabat_label text,                         -- '-29%', '2 za 7 zł', 'z aplikacją'
  warunek     text,                         -- np. 'z kartą Lidl Plus', 'limit 2 szt.'
  wazne_od    date,
  wazne_do    date not null,
  url         text,                         -- link do oferty/gazetki (opcjonalnie)
  zrodlo      text not null default 'scraper', -- 'scraper' | 'manual'
  created_at  timestamptz default now(),
  unique (sklep, nazwa_norm, wazne_do)
);

alter table promocje enable row level security;
create policy "promocje czytelne dla zalogowanych"
  on promocje for select to authenticated using (true);
-- INSERT/UPDATE/DELETE: tylko service role (scraper) — brak polityk = brak dostępu

create extension if not exists pg_trgm;
create index promocje_nazwa_trgm on promocje using gin (nazwa_norm gin_trgm_ops);
create index promocje_wazne_do on promocje (wazne_do);
```

Dane wspólne dla wszystkich gospodarstw (bez `household_id`) — promocje są globalne.
Stare promocje (`wazne_do < today`) scraper kasuje przy każdym runie.

---

## CZĘŚĆ C — Matching promocji do pozycji listy (MVP w JS)

Plik `src/promocjeMatch.js`:

- [ ] Fetch raz przy generowaniu listy: `supabase.from('promocje').select('*').gte('wazne_do', dzisiajISO)`.
- [ ] Normalizacja po obu stronach: `lower().trim()`, usunięcie ilości/jednostek.
- [ ] Dopasowanie MVP (bez pg_trgm po stronie klienta):
  1. exact match `nazwa_norm` ↔ znormalizowany `skladnik`,
  2. token overlap: promo pasuje, gdy znormalizowany składnik zawiera się w nazwie promo
     lub odwrotnie (np. „masło" ↔ „Masło ekstra 82% Łaciate 200 g"), z listą stop-words
     („świeże", „extra", gramatury).
  3. Gdy kilka promocji pasuje do jednego składnika → wybierz najtańszą `cena_nowa`.
- [ ] Wynik: funkcja `dopasujPromocje(items, promocje)` zwracająca itemy z dopisanym
      `item.promo` (format z części A) albo `null`.
- [ ] `until`: generuj z `wazne_do` → „dziś!", „do jutra", „do niedzieli", „do DD.MM".
- [ ] Świadomie akceptujemy false-negatives (lepiej nie pokazać promocji niż pokazać błędną).
      Fuzzy pg_trgm przez RPC — później, po realnych danych.
- [ ] Pamiętaj o pułapce PostgREST: kolumny lowercase, `.eq('kolumna', val)` bez
      wewnętrznych cudzysłowów.

---

## CZĘŚĆ D — Scraper gazetek: Lidl + Kaufland

Wzorzec jak istniejące skrypty (`generuj-przepisy.mjs`): Node `.mjs`, uruchamiany ręcznie
z PC Filipa, env przez PowerShell `$env:KEY="..."`. NIE commituj żadnych kluczy.
Service role key tylko z env.

### D0) Rekonesans (zrób NAJPIERW, zanim napiszesz scraper)

Dla każdego sklepu sprawdź i zaraportuj Filipowi co znalazłeś zanim zakodujesz:

- [ ] Czy strona ofertowa (lidl.pl, kaufland.pl — sekcje z aktualną ofertą / gazetką)
      renderuje produkty w HTML, czy dociąga JSON-em (XHR)? Szukaj embedded JSON
      (`__NEXT_DATA__`, `window.__INITIAL_STATE__`, endpointy `/api/...`) —
      JSON > parsowanie HTML > headless browser.
- [ ] `robots.txt` obu domen — odnotuj co mówi.
- [ ] Czy strony wymagają wyboru sklepu/lokalizacji (ceny regionalne)? Jeśli tak: na MVP
      bierzemy jeden region (Warszawa) i zapisujemy to w README.
- [ ] Czy treść gazetki to obrazki (skan PDF) czy dane produktowe? Jeśli wyłącznie
      obrazki → zgłoś Filipowi, NIE buduj OCR — wtedy MVP dla tego sklepu = ręczne
      wpisywanie (`zrodlo:'manual'`), wrócimy do tematu.

### D1) Skrypty

- [ ] `scraper/scrape-lidl.mjs`, `scraper/scrape-kaufland.mjs` + wspólny
      `scraper/wspolne.mjs` (normalizacja nazw, parsowanie cen „5,99", upsert).
- [ ] Pipeline każdego skryptu:
  1. pobierz dane oferty (fetch; jeśli niezbędny JS-rendering → Playwright, ale najpierw
     spróbuj bez),
  2. zapisz surową odpowiedź do `scraper/cache/<sklep>-<data>.json` (debug, nie
     commitować — dopisz do `.gitignore`),
  3. sparsuj do rekordów `promocje` (nazwa, ceny, rabat_label, warunek, daty),
  4. `delete` przeterminowanych + `upsert` po `(sklep, nazwa_norm, wazne_do)`,
  5. wypisz podsumowanie: ile rekordów, przykładowe 5, ile odrzuconych.
- [ ] Grzecznie: 1 request/s max, User-Agent z nazwą projektu, brak crawlowania całego
      serwisu — tylko strony oferty tygodniowej.
- [ ] Filtruj kategorie nie-spożywcze (elektronika, tekstylia) — heurystyka po kategorii
      ze źródła albo lista wykluczeń.
- [ ] Obsłuż formaty promo: „z aplikacją/kartą" → `warunek`, wielosztuki („2 za 7 zł") →
      `rabat_label`, `cena_nowa` = cena jednostkowa efektywna.

### D2) Uwagi środowiskowe (ważne!)

- Sieć biurowa Filipa podmienia certyfikaty SSL — scraper odpalać na hotspocie, jak inne
  skrypty API.
- Jeśli sklep blokuje requesty (403/captcha) → zgłoś, nie kombinuj z obejściami. Plan B:
  Filip zapisuje stronę ręcznie (Ctrl+S / kopiuje JSON z DevTools), skrypt dostaje tryb
  `--plik <ścieżka>` parsujący lokalny plik.
- Notka prawna (decyzja z wcześniejszych sesji): dane z gazetek na MVP do użytku
  własnego/testów rodzinnych. Przed publicznym launchem funkcji wracamy do tematu
  (ToS sklepów / partner danych). Nie scrapujemy agregatorów (Blix/Pepesto) — tylko
  strony własne sklepów.

---

## CZEGO CLAUDE CODE POTRZEBUJE OD FILIPA

Na start sesji poproś o / potwierdź:

1. `SUPABASE_SERVICE_ROLE_KEY` w env (PowerShell, na hotspocie) — do upsertu z scrapera.
   Nigdy do repo. (Jeśli klucz kiedyś trafił do chatu — zregenerować.)
2. Akceptację migracji SQL z części B (Filip odpala w Supabase SQL editor).
3. Decyzję o interakcji wiersza bez promo (pytanie z A4 — 2 opcje).
4. Region/miasto do cen regionalnych, jeśli rekonesans wykaże, że trzeba (default: Warszawa).
5. Później (nie teraz): decyzja o automatyzacji — ręczne odpalanie raz w tygodniu vs
   GitHub Actions cron.

## Wynik sesji

- `src/components/Promocje.jsx` (nowy), zmodyfikowany `ListaZakupow.jsx`, keyframe w
  `index.css`, `src/promocjeMatch.js`, `scraper/*.mjs`, migracja SQL w `migracje/` lub
  pokazana w chacie.
- Walidacja esbuild przed oddaniem, kompletne pliki (nie diffy).
- Zaktualizuj ten plik na końcu sesji: checkboxy, notatki „Co zrobiono", status + co zostało.

## Notatki z sesji (status)

_(uzupełniane na bieżąco)_
