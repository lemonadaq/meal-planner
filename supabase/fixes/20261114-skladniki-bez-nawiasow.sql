-- ════════════════════════════════════════════════════════════
-- Trzy nazwy składników z nawiasami po czyszczeniu bazy (2026-11-14)
--
--   żurawina (konfitura)       → konfitura żurawinowa
--       lista zakupów upraszczała ją do „Żurawina", czyli produktu,
--       którego nikt tu nie kupuje (żurawina suszona to osobna pozycja)
--   pietruszka (korzeń)        → pietruszka korzeń
--   ciasto na pierogi (krążki) → ciasto na pierogi
--       generator przepisów zabrania nawiasów w nazwach składników,
--       więc słownik w prompcie nie może ich podsuwać
--
-- Idempotentny: drugie uruchomienie (np. automatyczne po merge'u do main)
-- nic nie zmienia. Jedna transakcja — workflow odpala psql --single-transaction.
-- ════════════════════════════════════════════════════════════

create temp table _zmiana (stara text primary key, nowa text not null, nowa_norm text not null, stara_norm text not null) on commit drop;
insert into _zmiana values
  ('żurawina (konfitura)', 'konfitura żurawinowa', 'konfitura zurawinowa', 'zurawina konfitura'),
  ('pietruszka (korzeń)', 'pietruszka korzeń', 'pietruszka korzen', 'pietruszka korzen'),
  ('ciasto na pierogi (krążki)', 'ciasto na pierogi', 'ciasto na pierogi', 'ciasto na pierogi krazki');

-- przepisy
update dania d set "Składnik" = z.nowa from _zmiana z where d."Składnik" = z.stara;

-- skladniki_meta: nazwa to klucz główny — nowy wiersz z danymi starego,
-- stara nazwa ląduje w aliasach (dopasowanie promocji i starych list)
insert into skladniki_meta (nazwa, nazwa_norm, aliasy, jednostka_bazowa, rozmiar_opakowania,
                            jednostka_opakowania, zaokraglaj, waga_sztuki_g, kcal_100g)
select z.nowa, z.nowa_norm,
       (select coalesce(array_agg(distinct a), '{}') from unnest(m.aliasy || z.stara_norm) a where a <> z.nowa_norm),
       m.jednostka_bazowa, m.rozmiar_opakowania, m.jednostka_opakowania, m.zaokraglaj, m.waga_sztuki_g, m.kcal_100g
from skladniki_meta m join _zmiana z on m.nazwa = z.stara
where not exists (select 1 from skladniki_meta x where x.nazwa = z.nowa);
delete from skladniki_meta m using _zmiana z where m.nazwa = z.stara;

-- listy zakupów (stare tygodnie — dla spójności historii)
update zakupy_historia h set skladnik = z.nowa from _zmiana z where h.skladnik = z.stara;
update produkty_w_domu p set nazwa = z.nowa, nazwa_norm = z.nowa_norm from _zmiana z where p.nazwa = z.stara;
update korekty_zakupow k set baza_klucz = z.nowa || substr(k.baza_klucz, length(z.stara) + 1)
from _zmiana z where k.baza_klucz like z.stara || '||%';

do $$ begin
  if exists (select 1 from dania where "Składnik" like '%(%') then
    raise exception 'W dania zostały składniki z nawiasem';
  end if;
end $$;
