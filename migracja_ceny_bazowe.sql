-- ════════════════════════════════════════════════════════════
-- Migracja: widok `ceny_bazowe_view` — cena bazowa z historii promocji
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
-- To WIDOK, nie tabela: liczy się przy każdym zapytaniu, więc rośnie sam razem
-- z historią i nie trzeba go odświeżać. Gdyby kiedyś zamulał — zamienić na
-- materialized view odświeżany po nocnym scrapie.
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

-- security_invoker = true: widok czyta `promo_offers` prawami pytającego usera,
-- więc RLS tej tabeli obowiązuje normalnie. Promocje są globalne (bez
-- household_id), więc nie ma tu czego filtrować po rodzinie.
create or replace view ceny_bazowe_view
with (security_invoker = true) as
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

comment on view ceny_bazowe_view is 'Cena bazowa (max) i najniższa widziana (min) per sklep i produkt, liczone z historii promo_offers';

-- Bez tego indeksu widok skanuje całą tabelę przy każdym wejściu w Koszty.
create index if not exists promo_offers_ceny_bazowe_idx
  on promo_offers (store_name, product_name)
  where price is not null and price > 0;

-- ── Uprawnienia i cache PostgREST ──
-- Samo `create view` nie wystarcza, żeby apka widok zobaczyła: PostgREST łączy
-- się jako `anon`/`authenticated` i potrzebuje GRANT-a, a swoją listę tabel
-- trzyma w cache'u, który po DDL trzeba przeładować. Bez tych trzech linijek
-- zapytanie z frontu wraca błędem, choć w SQL Editorze (jako `postgres`)
-- wszystko działa.
grant usage on schema public to anon, authenticated;
grant select on ceny_bazowe_view to anon, authenticated;
grant execute on function norm_nazwa_promo(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ── Sprawdzenie po uruchomieniu ──
-- 1. Czy widok liczy:
-- select sklep, count(*) as produktow, round(avg(100 * (1 - cena_min / cena_bazowa))) as sr_obnizka_proc
-- from ceny_bazowe_view group by sklep order by produktow desc;
--
-- 2. Czy widzi go rola, którą łączy się apka (to pyta o uprawnienia, nie o dane):
-- select has_table_privilege('authenticated', 'ceny_bazowe_view', 'select') as authenticated_widzi,
--        has_table_privilege('anon', 'ceny_bazowe_view', 'select')          as anon_widzi;
