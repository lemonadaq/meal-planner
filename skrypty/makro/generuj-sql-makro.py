# generuj-sql-makro.py
# Generuje supabase/fixes/*-makro-dieta.sql: makro (białko/tłuszcz/węgle) na
# porcję dla WSZYSTKICH dań w bazie + etykieta diety (masa / fit).
#
# Jak liczymy, w skrócie:
#   1. Nazwa składnika → normalizacja jak w src/jednostki.js
#      (normalizujNazweMeta) → reguły z makro_reguly.py (regex → B/T/W na 100 g).
#   2. Ilość → liczba (ułamki „1/2", „1 1/2", „0,5"), jednostka → gramy
#      (łyżka 15, łyżeczka 5, szczypta 0,5, szt = waga sztuki ze
#      skladniki_meta albo z tabeli wag poniżej). Tłuszcz „do smażenia" × 0,35
#      — tak samo jak kcalZeSkladnikow.js; ponad 40 g tłuszczu na porcję
#      to też smażenie w głębokim tłuszczu, więc ten sam współczynnik.
#   3. Wiarygodność: makro zapisujemy TYLKO gdy da się policzyć wszystkie
#      istotne składniki (albo brakuje jednego, a wynik zgadza się z kcal
#      dania), a kcal z makro nie odjeżdża od zapisanego `kcal` dania
#      dalej niż 0,5–2×. Inaczej danie zostaje bez makro i bez etykiety —
#      lepiej brak etykiety niż zła.
#   4. Dieta (tylko puste, bez dodatków i surówek):
#        masa — B ≥ 35 g, kcal ≥ 650, węgle > tłuszcz
#        fit  — kcal ≤ 550, B ≥ 30 g, T ≤ 20 g
#
# Ruszamy tylko puste pola (`bialko is null`, `dieta is null`), więc dania
# z paczki 10 i ręczne poprawki zostają. Plik można odpalać wielokrotnie.
#
#   python3 skrypty/makro/generuj-sql-makro.py supabase/fixes/NAZWA.sql

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from makro_reguly import R, PRZYPRAWY, OWOCE, WARZYWA

# Waga sztuki, gdy skladniki_meta jej nie zna (g). Regex na nazwie znormalizowanej.
WAGI_SZT = [
    (r'^jaj', 55), (r'zoltk', 18), (r'bialko jajka', 33),
    (r'pomidorki|koktajlow', 15), (r'pomidor', 120), (r'cebul', 120), (r'szalotk', 30),
    (r'(czosnek|zabek)', 5), (r'papryczk', 10), (r'^papryka', 150), (r'dymka', 15),
    (r'banan', 120), (r'jablk', 180), (r'gruszk', 170), (r'pomarancz', 200),
    (r'cytryn', 100), (r'limonk', 60), (r'kiwi', 75), (r'awokado', 140), (r'mango', 300),
    (r'tortill', 60), (r'pita', 70), (r'bulk|bulki', 70), (r'bagietk', 250),
    (r'(chleb|pieczywo|kromk)', 35), (r'croissant', 60),
    (r'ogorek kiszony|ogorki kiszone|konserwowy', 70), (r'ogor', 150),
    (r'ziemniak', 150), (r'batat', 250), (r'marchew', 80), (r'pietruszka korzen', 80),
    (r'cukinia', 250), (r'baklazan', 300), (r'por', 200), (r'seler naciowy', 40),
    (r'rzodkiewk', 10), (r'burak', 150), (r'kalafior', 700), (r'brokul', 400),
    (r'udko z kurczaka|udka', 200), (r'udko z kaczki', 250), (r'piers z kurczaka', 200),
    (r'piers z kaczki', 300), (r'kielbas|parowk', 60),
    (r'(z puszki|w puszce|puszka)', 400), (r'mozzarella', 125), (r'oliwki', 4),
    (r'rzepa', 150), (r'sliwk', 30), (r'fenkul', 250), (r'granat', 250), (r'anchois', 4),
    (r'pieczark', 20), (r'morel', 40), (r'endywi', 150),
]


def pg(wzor):
    # Postgres ARE: granica słowa to \y, nie \b
    return wzor.replace(r'\b', r'\y').replace("'", "''")


def wartosci_regul():
    wiersze = [(0, PRZYPRAWY, (10, 5, 40), 'przyprawa')]
    for i, (wz, v) in enumerate(R, start=1):
        wiersze.append((i, wz, v, 'regula'))
    wiersze.append((900, OWOCE, (0.8, 0.3, 11), 'owoc'))
    wiersze.append((901, WARZYWA, (1.8, 0.3, 5), 'warzywo'))
    return ',\n'.join(f"  ({p}, '{pg(w)}', {b}, {t}, {ww}, '{typ}')" for p, w, (b, t, ww), typ in wiersze)


def wartosci_wag():
    return ',\n'.join(f"  ({i}, '{pg(w)}', {g})" for i, (w, g) in enumerate(WAGI_SZT))


SQL = f"""-- Task makro-dieta
-- Makro (białko/tłuszcz/węgle) na porcję dla wszystkich dań + etykieta diety
-- (masa / fit). Wygenerowane: skrypty/makro/generuj-sql-makro.py — tam jest
-- opis metody i progi. Tylko puste pola; można odpalać wielokrotnie.

-- Etykieta „fit" obok „masa" (kolumna `dieta` z migracja_dieta_makro.sql).
alter table dania add column if not exists dieta   text;
alter table dania add column if not exists bialko  integer;
alter table dania add column if not exists tluszcz integer;
alter table dania add column if not exists wegle   integer;

create temp table makro_reguly (prio int, wzor text, b numeric, t numeric, w numeric, typ text) on commit drop;
insert into makro_reguly values
{wartosci_regul()};

create temp table wagi_szt (prio int, wzor text, g numeric) on commit drop;
insert into wagi_szt values
{wartosci_wag()};

-- Normalizacja jak normalizujNazweMeta() w src/jednostki.js
create function pg_temp.norm(x text) returns text language sql immutable as $$
  select trim(regexp_replace(lower(translate(coalesce(x, ''),
    'ąćęłńóśźżĄĆĘŁŃÓŚŹŻáéíóúàèìòùâêîôûäëïöüçñ',
    'acelnoszzACELNOSZZaeiouaeiouaeiouaeioucn')), '[^a-z0-9]+', ' ', 'g'))
$$;

-- parsujIlosc() z src/jednostki.js: „2", „0,5", „1/2", „1 1/2", „½", „1½"
create function pg_temp.ilosc(x text) returns numeric language plpgsql immutable as $$
declare s text := trim(replace(coalesce(x, ''), ',', '.')); m text[];
begin
  s := replace(replace(replace(replace(s, '½', ' 1/2'), '¼', ' 1/4'), '¾', ' 3/4'), '⅓', ' 1/3');
  s := trim(s);
  m := regexp_match(s, '^(?:(\\d+(?:\\.\\d+)?)\\s+)?(\\d+(?:\\.\\d+)?)\\s*/\\s*(\\d+(?:\\.\\d+)?)$');
  if m is not null then
    if m[3]::numeric = 0 then return null; end if;
    return coalesce(m[1]::numeric, 0) + m[2]::numeric / m[3]::numeric;
  end if;
  m := regexp_match(s, '^(\\d+(?:\\.\\d+)?)');
  if m is not null then return m[1]::numeric; end if;
  return null;
end $$;

-- kanonJednostka() + naGramy() z src/jednostki.js
create function pg_temp.gramy(il numeric, jedn text, waga_szt numeric) returns numeric language sql immutable as $$
  select case pg_temp.norm(jedn)
    when 'g' then il when 'gram' then il when 'gramy' then il
    when 'kg' then il * 1000 when 'dag' then il * 10 when 'dkg' then il * 10
    when 'ml' then il when 'l' then il * 1000
    when 'lyzka' then il * 15 when 'lyzki' then il * 15
    when 'lyzeczka' then il * 5 when 'lyzeczki' then il * 5
    when 'szczypta' then il * 0.5 when 'szczypty' then il * 0.5
    when 'peczek' then il * 30 when 'garsc' then il * 30
    when 'szt' then il * waga_szt when 'sztuka' then il * waga_szt when 'sztuki' then il * waga_szt
    when 'zabek' then il * 5 when 'zabki' then il * 5
    when 'kromka' then il * 35 when 'kromki' then il * 35
    else null end
$$;

create temp table makro_skl on commit drop as
with wiersze as (
  select d.id, d."Danie" as danie, pg_temp.norm(d."Składnik") as n,
         d."Składnik" as nazwa, pg_temp.ilosc(d."Ilość na 1 porcję"::text) as il,
         coalesce(trim(d."Jednostka"), '') as jedn_raw
  from dania d
  where d."Składnik" is not null and trim(d."Składnik") <> ''
), z_regula as (
  select w.*, r.b, r.t, r.w, r.typ
  from wiersze w
  left join lateral (
    select * from makro_reguly r where w.n ~ r.wzor order by r.prio limit 1
  ) r on true
), z_waga as (
  select z.*,
    coalesce(
      (select nullif(regexp_replace(m.waga_sztuki_g::text, '[^0-9.]', '', 'g'), '')::numeric
         from skladniki_meta m where m.nazwa_norm = z.n and m.waga_sztuki_g is not null limit 1),
      (select nullif(regexp_replace(m.rozmiar_opakowania::text, '[^0-9.]', '', 'g'), '')::numeric
         from skladniki_meta m
         where m.nazwa_norm = z.n and pg_temp.norm(m.jednostka_opakowania::text) <> 'kg'
           and pg_temp.norm(m.jednostka_bazowa::text) in ('g', 'ml') limit 1),
      (select g from wagi_szt s where z.n ~ s.wzor order by s.prio limit 1)
    ) as waga_szt
  from z_regula z
)
-- Jednostka bywa pusta (USTALENIA: celowo opcjonalna): mała liczba przy
-- produkcie ze znaną wagą sztuki to sztuki („cebula 1"), reszta to gramy.
, z_jedn as (
  select z.*, case when z.jedn_raw <> '' then z.jedn_raw
                   when z.il <= 10 and z.waga_szt is not null then 'szt'
                   else 'g' end as jedn
  from z_waga z
)
select z.*,
  pg_temp.gramy(z.il, z.jedn, z.waga_szt)
    * case when z.n ~ '(olej|oliwa|smalec|tluszcz)'
                and (z.n ~ 'do (smazenia|frytury|glebokiego)'
                     or pg_temp.gramy(z.il, z.jedn, z.waga_szt) > 40) then 0.35 else 1 end
    as g
from z_jedn z;

-- Na danie: suma + liczba składników, których nie dało się policzyć
-- (przyprawy i „do smaku" się nie liczą jako braki).
create temp table makro_dan on commit drop as
select danie,
  round(sum(coalesce(g * b / 100, 0)))  as b,
  round(sum(coalesce(g * t / 100, 0)))  as t,
  round(sum(coalesce(g * w / 100, 0)))  as w,
  round(sum(coalesce(g * (4 * b + 9 * t + 4 * w) / 100, 0))) as kcal_m,
  count(*) filter (where il is not null and typ is distinct from 'przyprawa'
                   and (b is null or g is null)) as braki,
  count(*) as skladniki
from makro_skl
group by danie;

create temp table makro_pewne on commit drop as
select m.*, k.kcal
from makro_dan m
join lateral (select max(kcal) as kcal, max(rodzaj) as rodzaj from dania where "Danie" = m.danie) k on true
where m.kcal_m > 0
  and (m.braki = 0
       or (m.braki = 1 and k.kcal is not null and m.kcal_m between k.kcal * 0.6 and k.kcal * 1.6))
  and (k.kcal is null or m.kcal_m between k.kcal * 0.5 and k.kcal * 2.0);

update dania d set bialko = p.b, tluszcz = p.t, wegle = p.w
from makro_pewne p
where d."Danie" = p.danie and d.bialko is null;

update dania d set dieta = case
    when p.b >= 35 and p.kcal_m >= 650 and p.w > p.t then 'masa'
    when p.kcal_m <= 550 and p.b >= 30 and p.t <= 20 then 'fit'
  end
from makro_pewne p
where d."Danie" = p.danie and d.dieta is null
  and coalesce(d.rodzaj, '') not in ('dodatek', 'surowka')
  and ((p.b >= 35 and p.kcal_m >= 650 and p.w > p.t)
    or (p.kcal_m <= 550 and p.b >= 30 and p.t <= 20));

-- Kontrola (widać w logu workflow)
select count(*) as dan, count(*) filter (where braki = 0) as bez_brakow from makro_dan;
select count(*) as dania_z_makro from makro_pewne;
select dieta, count(distinct "Danie") from dania where dieta is not null group by dieta;
"""

if __name__ == '__main__':
    wyjscie = sys.argv[1]
    with open(wyjscie, 'w', encoding='utf-8') as f:
        f.write(SQL)
    print('zapisano', wyjscie)
