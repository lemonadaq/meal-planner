-- ════════════════════════════════════════════════════════════
-- Migracja: `ceny_bazowe_view` — cena bazowa z historii promocji
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- Blix nie podaje ceny sprzed obniżki: w JSON-ie gazetki jest jedno pole
-- `price`, a `percentDiscount` to zero na wszystkich sprawdzonych produktach.
-- Cenę bazową odzyskujemy z historii — `blix-import-supabase.mjs` bierze cenę
-- do `source_hash`, więc każda nowa cena tego samego produktu zapisuje się jako
-- osobny wiersz w `promo_offers`. Historia zbiera się od 12.06.2026.
--
-- Cena bazowa = NAJWYŻSZA widziana cena. Gazetka pokazuje cenę promocyjną,
-- więc najwyższy odczyt jest najbliżej ceny półkowej.
--
-- ZMATERIALIZOWANY, nie zwykły widok. Pierwsze podejście liczyło agregat przy
-- każdym wejściu w zakładkę Koszty i wywalało się na `57014: canceling statement
-- due to statement timeout` — grupowanie po `norm_nazwa_promo(product_name)`
-- (wynik funkcji, nie kolumna) plus `count(distinct price)` to pełny skan całej
-- historii. W SQL Editorze przechodziło, bo `postgres` ma inny limit niż
-- `authenticated` (8 s). Dane zmieniają się raz na dobę po nocnym scrapie,
-- więc liczymy je raz i czytamy gotowe.
--
-- Migracja jest idempotentna — można ją odpalać wielokrotnie.
-- ════════════════════════════════════════════════════════════

-- Normalizacja nazwy MUSI dawać ten sam wynik co `normalizujNazweMeta`
-- w src/jednostki.js, inaczej front nie dopasuje wierszy do składników.
create or replace function norm_nazwa_promo(nazwa text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(
    lower(translate(nazwa, 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż', 'ACELNOSZZacelnoszz')),
    '[^a-z0-9]+', ' ', 'g'
  ))
$$;

comment on function norm_nazwa_promo is 'Normalizacja nazwy produktu — odpowiednik normalizujNazweMeta() z src/jednostki.js';

-- Indeks pod samo przeliczanie. Kolejność kolumn odpowiada GROUP BY, a `price`
-- jest w indeksie, żeby `count(distinct price)` nie musiał chodzić po stercie.
-- Poprzedni indeks był na `(store_name, product_name)` i nie dawał się użyć,
-- bo grupujemy po wyniku funkcji, a nie po surowej kolumnie.
drop index if exists promo_offers_ceny_bazowe_idx;

create index if not exists promo_offers_ceny_bazowe_idx
  on promo_offers (store_name, norm_nazwa_promo(product_name), price)
  where price is not null and price > 0;

-- Stara wersja mogła istnieć jako zwykły widok — nie da się go podmienić
-- na zmaterializowany przez `create or replace`.
drop view if exists ceny_bazowe_view;
drop materialized view if exists ceny_bazowe_mv cascade;

create materialized view ceny_bazowe_mv as
select
  store_name                        as sklep,
  norm_nazwa_promo(product_name)    as produkt_norm,
  min(product_name)                 as produkt,
  max(price)                        as cena_bazowa,
  min(price)                        as cena_min,
  count(*)                          as obserwacji,
  count(distinct price)             as roznych_cen,
  max(scraped_at)                   as ostatnio
from promo_offers
where price is not null
  and price > 0
  and product_name is not null
  and store_name is not null
group by store_name, norm_nazwa_promo(product_name)
-- Bez dwóch różnych cen nie wiemy, czy widziana cena to półka czy promocja —
-- taki wiersz tylko zaszumiłby wycenę koszyka.
having count(distinct price) >= 2;

-- Unikalny indeks jest WYMAGANY przez `refresh ... concurrently`.
create unique index if not exists ceny_bazowe_mv_klucz
  on ceny_bazowe_mv (sklep, produkt_norm);

comment on materialized view ceny_bazowe_mv is 'Cena bazowa (max) i najniższa widziana (min) per sklep i produkt, przeliczane po nocnym scrapie';

-- Front czyta przez zwykły widok o stabilnej nazwie — dzięki temu implementację
-- pod spodem można wymienić bez ruszania aplikacji.
create view ceny_bazowe_view as select * from ceny_bazowe_mv;

-- ── Odświeżanie ──
-- Woła `promo-daily.mjs` zaraz po imporcie ofert. SECURITY DEFINER, bo refresh
-- wymaga praw właściciela; `set local statement_timeout` jest po to, żeby
-- przeliczanie nie padło na limicie, który dotyczy zwykłych zapytań.
-- CONCURRENTLY nie blokuje czytających, więc zakładka działa w trakcie.
create or replace function odswiez_ceny_bazowe()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  set local statement_timeout = '10min';
  refresh materialized view concurrently ceny_bazowe_mv;
end;
$$;

comment on function odswiez_ceny_bazowe is 'Przelicza ceny_bazowe_mv — wołane z promo-daily.mjs po imporcie ofert';

-- ── Uprawnienia i cache PostgREST ──
-- Samo `create view` nie wystarcza, żeby apka widok zobaczyła: PostgREST łączy
-- się jako `anon`/`authenticated` i potrzebuje GRANT-a, a swoją listę tabel
-- trzyma w cache'u, który po DDL trzeba przeładować.
--
-- Uwaga: widok zmaterializowany nie podlega RLS tabeli źródłowej — dane liczy
-- właściciel. Tu jest to bez znaczenia, bo `promo_offers` i tak jest wspólne
-- dla wszystkich (promocje nie mają household_id), ale gdyby kiedyś doszła
-- kolumna per rodzina, tego widoku NIE wolno zostawić w tej postaci.
grant usage on schema public to anon, authenticated;
grant select on ceny_bazowe_mv to anon, authenticated;
grant select on ceny_bazowe_view to anon, authenticated;
grant execute on function norm_nazwa_promo(text) to anon, authenticated;

-- Odświeżanie to czynność serwisowa — front nie ma prawa jej wołać.
revoke all on function odswiez_ceny_bazowe() from public, anon, authenticated;
grant execute on function odswiez_ceny_bazowe() to service_role;

notify pgrst, 'reload schema';

-- ── Sprawdzenie po uruchomieniu ──
-- 1. Czy widok liczy:
-- select sklep, count(*) as produktow, round(avg(100 * (1 - cena_min / cena_bazowa))) as sr_obnizka_proc
-- from ceny_bazowe_view group by sklep order by produktow desc;
--
-- 2. Czy widzi go rola, którą łączy się apka (to pyta o uprawnienia, nie o dane):
-- select has_table_privilege('authenticated', 'ceny_bazowe_view', 'select') as authenticated_widzi,
--        has_table_privilege('anon', 'ceny_bazowe_view', 'select')          as anon_widzi;
--
-- 3. Ręczne przeliczenie (normalnie robi to nocny workflow):
-- select odswiez_ceny_bazowe();
