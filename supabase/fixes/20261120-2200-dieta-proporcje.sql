-- Task dieta-proporcje
-- Etykieta diety z PROPORCJI makro (udział w kcal), a nie z kcal na porcję.
-- Kaloryczność wynika z wielkości porcji, więc o „fit" / „na masę" decyduje
-- skład przepisu. Jedno danie może mieć obie etykiety → dieta = 'masa,fit'.
--
--   kcal_m = 4·B + 9·T + 4·W (z makro na porcję)
--   fit  — białko ≥ 25% kcal i tłuszcz ≤ 35% kcal
--   masa — białko ≥ 20% kcal i węgle (g) > tłuszcz (g)
--
-- Liczy od nowa WSZYSTKIE dania z makro (stare progi z 20261120-2030
-- zostają nadpisane), bez dodatków i surówek. Dania bez makro nie są
-- ruszane. Można odpalać wielokrotnie.

create temp table dieta_nowa on commit drop as
with d as (
  select "Danie" as danie, max(rodzaj) as rodzaj,
         max(bialko) as b, max(tluszcz) as t, max(wegle) as w
  from dania
  where bialko is not null and tluszcz is not null and wegle is not null
  group by "Danie"
), p as (
  select *, (4 * b + 9 * t + 4 * w)::numeric as kc from d
)
select danie, nullif(concat_ws(',',
    case when b * 4 >= kc * 0.20 and w > t then 'masa' end,
    case when b * 4 >= kc * 0.25 and t * 9 <= kc * 0.35 then 'fit' end), '') as dieta
from p
where kc > 0 and coalesce(rodzaj, '') not in ('dodatek', 'surowka');

update dania d set dieta = n.dieta
from dieta_nowa n
where d."Danie" = n.danie and d.dieta is distinct from n.dieta;

-- Kontrola (widać w logu workflow)
select coalesce(dieta, '(brak)') as dieta, count(*) from dieta_nowa group by 1 order by 1;
