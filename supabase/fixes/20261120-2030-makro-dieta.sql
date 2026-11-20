-- Task makro-dieta
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
  (0, '^(sol( morska)?|szczypta soli|sol i pieprz|swiezo mielony pieprz|pieprz( \w+)*|cynamon( mielony)?|curry( w proszku)?|chili w proszku|chilli|galka muszkatolowa|garam masala|kmin( rzymski)?( mielony)?|kumin( mielony)?|kminek|lisc laurowy|majeranek|oregano( suszone)?|papryka (slodka|ostra|wedzona)( \w+)?( \w+)?|platki chili|rozmaryn( swiezy)?|tymianek|ziele angielskie|ziola( \w+)*|przyprawa( \w+)*|kurkuma|szafran|szalwia|anyz gwiazdzisty|gozdziki|sumak|laska wanilii|ekstrakt waniliowy|drozdze( \w+)?|proszek do pieczenia|soda|zelatyna|ocet( \w+)*|wykalaczki|czosnek (granulowany|w proszku)|imbir mielony|bazylia suszona)$', 10, 5, 40, 'przyprawa'),
  (1, '^(olej|oliwa|smalec|slonina)', 0, 100, 0, 'regula'),
  (2, 'maslo orzechowe', 25, 50, 16, 'regula'),
  (3, 'pasta tahini', 17, 54, 21, 'regula'),
  (4, '^maslo', 0.7, 82, 0.7, 'regula'),
  (5, 'majonez', 1, 75, 2, 'regula'),
  (6, 'sos (burgerowy|czosnkowy|cezar)', 2, 35, 8, 'regula'),
  (7, '^pesto', 5, 45, 6, 'regula'),
  (8, 'mascarpone', 5, 43, 3, 'regula'),
  (9, '(smietana|smietanka) ?(30|kremowka)|kremowka', 2.5, 30, 3, 'regula'),
  (10, '^smietana', 2.5, 18, 3.6, 'regula'),
  (11, 'serek (alette|smietankowy|kremowy)', 6, 24, 3, 'regula'),
  (12, 'serek topiony', 12, 24, 5, 'regula'),
  (13, 'serek waniliowy', 11, 4, 15, 'regula'),
  (14, 'parmezan', 33, 29, 0, 'regula'),
  (15, '(mozzarella|mozarella)', 18, 19, 2, 'regula'),
  (16, 'feta', 14, 21, 1, 'regula'),
  (17, 'halloumi', 22, 25, 2, 'regula'),
  (18, 'ser kozi', 20, 28, 1, 'regula'),
  (19, 'camembert', 20, 24, 0, 'regula'),
  (20, 'gorgonzola|plesniowy', 19, 31, 0, 'regula'),
  (21, 'paneer', 18, 20, 3, 'regula'),
  (22, 'ricotta', 11, 10, 3, 'regula'),
  (23, 'twarog sernikowy|twarogowy na sernik', 16, 9, 3, 'regula'),
  (24, '(twarog|twarozek)', 18, 5, 3.5, 'regula'),
  (25, '(cheddar|gouda|gruyere|ser zolty)', 25, 28, 0, 'regula'),
  (26, 'skyr', 11, 0.2, 4, 'regula'),
  (27, 'jogurt grecki', 5, 10, 4, 'regula'),
  (28, 'jogurt', 4, 3, 6, 'regula'),
  (29, '(kefir|maslanka)', 3.4, 1.5, 4.5, 'regula'),
  (30, 'mleko kokosowe', 2, 18, 3, 'regula'),
  (31, 'mleko skondensowane', 8, 8, 55, 'regula'),
  (32, 'mleko w proszku', 26, 26, 38, 'regula'),
  (33, '^mleko', 3.3, 2, 4.8, 'regula'),
  (34, '(zoltk)', 16, 27, 3.6, 'regula'),
  (35, 'bialko jajka', 11, 0, 0.7, 'regula'),
  (36, '^jaj', 12.5, 9.7, 0.7, 'regula'),
  (37, '(piers|filet).*(kurczaka|indyka)|filet z indyka', 23, 1.5, 0, 'regula'),
  (38, '(udk|udek|udka).*kurczak|kurczaka udka|skrzydelka', 18, 11, 0, 'regula'),
  (39, 'kaczk', 18, 20, 0, 'regula'),
  (40, 'watrobka', 17, 5, 1, 'regula'),
  (41, 'mielon.*wolowo wieprz|mieso mielone wolowo', 17, 21, 0, 'regula'),
  (42, 'mielon.*wolow|wolowina na burgery|mielona wolowina', 18, 18, 0, 'regula'),
  (43, 'mielon.*wieprz', 16, 22, 0, 'regula'),
  (44, 'mielon.*jagni', 17, 23, 0, 'regula'),
  (45, '(antrykot|karczek wolowy|szponder|rozbratel|zeberka)', 18, 18, 0, 'regula'),
  (46, 'peklowana', 20, 10, 0, 'regula'),
  (47, 'flaki', 13, 4, 0, 'regula'),
  (48, '(udziec|poledwica wolowa|ligawa|zrazowa|rostbef|lopatka wolowa|wolowina)', 21, 6, 0, 'regula'),
  (49, 'lopatka cielec', 20, 6, 0, 'regula'),
  (50, 'lopatka jagniec', 18, 15, 0, 'regula'),
  (51, '(schab|poledwiczka)', 21, 6, 0, 'regula'),
  (52, '(lopatka wieprz|karkowka|wieprzowina)', 17, 18, 0, 'regula'),
  (53, '(boczek|bekon)', 12, 45, 0, 'regula'),
  (54, 'szynka (parmenska|dojrzewajaca)', 25, 18, 0, 'regula'),
  (55, 'szynka', 19, 3, 1.5, 'regula'),
  (56, 'poledwica sopocka', 20, 4, 1, 'regula'),
  (57, 'salami', 22, 35, 1, 'regula'),
  (58, 'chorizo', 24, 38, 2, 'regula'),
  (59, 'kaszanka', 11, 20, 15, 'regula'),
  (60, 'parowk', 12, 22, 2, 'regula'),
  (61, 'kielbas', 13, 27, 1, 'regula'),
  (62, 'losos wedzony', 22, 9, 0, 'regula'),
  (63, 'losos', 20, 13, 0, 'regula'),
  (64, 'makrela', 21, 15, 0, 'regula'),
  (65, '(dorsz|sol\y|soli$)', 18, 0.7, 0, 'regula'),
  (66, 'pstrag', 20, 5, 0, 'regula'),
  (67, 'karp', 18, 6, 0, 'regula'),
  (68, 'sledz', 16, 18, 0, 'regula'),
  (69, 'tunczyk w oleju', 26, 8, 0, 'regula'),
  (70, 'tunczyk', 24, 1, 0, 'regula'),
  (71, 'krewetki', 18, 1, 1, 'regula'),
  (72, 'malze', 12, 2, 4, 'regula'),
  (73, 'anchois', 25, 10, 0, 'regula'),
  (74, 'tofu', 12, 7, 2, 'regula'),
  (75, '(skrobia|maka ziemniaczana)', 0.5, 0, 85, 'regula'),
  (76, '(papier ryzowy)', 4, 0.5, 80, 'regula'),
  (77, 'gnocchi', 4, 0.5, 33, 'regula'),
  (78, 'tortellini', 11, 6, 45, 'regula'),
  (79, '(quinoa|komosa)', 14, 6, 64, 'regula'),
  (80, 'platki owsiane', 13, 7, 60, 'regula'),
  (81, 'platki kukurydziane', 7, 1, 84, 'regula'),
  (82, 'granola', 10, 17, 63, 'regula'),
  (83, '(kukurydza do prazenia|ziarna kukurydzy)', 11, 4, 74, 'regula'),
  (84, '(panko|bulka tarta)', 12, 5, 72, 'regula'),
  (85, '^ryz', 7, 1, 78, 'regula'),
  (86, '(kasza|kuskus|pszenica)', 12, 2.5, 70, 'regula'),
  (87, '^makaron|spaghetti', 12.5, 1.5, 72, 'regula'),
  (88, '^maka', 10, 1.5, 72, 'regula'),
  (89, 'chleb zytni|pelnoziarnist', 7, 1.5, 44, 'regula'),
  (90, '(tortill|wrap)', 8.5, 7, 50, 'regula'),
  (91, 'chalka', 8, 7, 55, 'regula'),
  (92, 'croissant', 8, 21, 45, 'regula'),
  (93, '(herbatniki|krakersy)', 7, 15, 70, 'regula'),
  (94, 'biszkopty', 8, 4, 80, 'regula'),
  (95, 'ciasto francuskie', 5.5, 25, 40, 'regula'),
  (96, 'ciasto filo', 8, 4, 57, 'regula'),
  (97, 'ciasto drozdzowe', 8, 8, 50, 'regula'),
  (98, 'piernik', 5, 5, 75, 'regula'),
  (99, 'grzanki', 11, 10, 68, 'regula'),
  (100, 'nachosy|chipsy tortilla', 7, 24, 63, 'regula'),
  (101, '(chleb|bulk|bagietk|pieczywo|pita|ciabatta)', 8, 2, 50, 'regula'),
  (102, 'ciecierzyca', 7, 2.5, 17, 'regula'),
  (103, 'fasolka w sosie', 5, 0.5, 15, 'regula'),
  (104, 'fasola.*puszk|fasola w puszce', 7, 0.5, 15, 'regula'),
  (105, '(fasola biala$|groch|soczewica)', 23, 1.5, 58, 'regula'),
  (106, 'hummus', 8, 17, 14, 'regula'),
  (107, 'migdal', 21, 50, 20, 'regula'),
  (108, 'orzechy wloskie', 15, 65, 14, 'regula'),
  (109, 'nerkowca', 18, 44, 30, 'regula'),
  (110, 'orzechy laskowe', 15, 61, 17, 'regula'),
  (111, 'orzeszki ziemne', 26, 49, 16, 'regula'),
  (112, 'sezam', 18, 50, 23, 'regula'),
  (113, 'pestki dyni', 30, 49, 11, 'regula'),
  (114, 'slonecznik', 21, 51, 20, 'regula'),
  (115, 'chia', 17, 31, 42, 'regula'),
  (116, 'siemie', 18, 42, 29, 'regula'),
  (117, 'wiorki kokosowe', 7, 64, 24, 'regula'),
  (118, '^mak$', 18, 42, 28, 'regula'),
  (119, 'chalwa', 12, 30, 55, 'regula'),
  (120, 'czekolada gorzka|gorzka czekolada', 8, 43, 46, 'regula'),
  (121, 'czekolada', 6, 32, 58, 'regula'),
  (122, 'kakao', 20, 11, 58, 'regula'),
  (123, 'kajmak', 7, 9, 55, 'regula'),
  (124, '(cukier|miod|syrop|dzem|konfitura|galaretka|budyn|amaretto|likier)', 0.3, 0, 80, 'regula'),
  (125, '(rodzynki|daktyle|suszone sliwki|morele)', 2.5, 0.5, 68, 'regula'),
  (126, 'chrzan', 1.5, 0.5, 10, 'regula'),
  (127, 'kapary', 2, 1, 5, 'regula'),
  (128, 'banan', 1.1, 0.3, 23, 'regula'),
  (129, '(czosnek|zabek czosnku)', 6, 0.5, 33, 'regula'),
  (130, '^imbir$', 1.8, 0.8, 18, 'regula'),
  (131, 'ketchup', 1.5, 0.2, 24, 'regula'),
  (132, 'sos sojowy', 8, 0.5, 5, 'regula'),
  (133, 'sos bbq', 1, 0.5, 36, 'regula'),
  (134, 'sweet chilli', 0.5, 0.5, 53, 'regula'),
  (135, 'musztarda', 6, 7, 7, 'regula'),
  (136, 'pasta miso', 12, 6, 26, 'regula'),
  (137, 'pasta curry', 3, 10, 12, 'regula'),
  (138, 'sos (rybny|ostrygowy)', 5, 0.2, 10, 'regula'),
  (139, 'worcestershire', 0, 0, 20, 'regula'),
  (140, 'krem balsamiczny', 0.5, 0, 35, 'regula'),
  (141, 'koncentrat', 4, 0.5, 15, 'regula'),
  (142, 'pomidory suszone', 5, 15, 25, 'regula'),
  (143, '(passata|pomidory.*puszk|pomidory w puszce|sos pomidorowy)', 1.2, 0.2, 4.5, 'regula'),
  (144, 'sos pieczarkowy', 2, 6, 5, 'regula'),
  (145, 'oliwki', 1, 15, 4, 'regula'),
  (146, 'awokado', 2, 15, 9, 'regula'),
  (147, 'grzyby suszone', 22, 3, 40, 'regula'),
  (148, 'frytki', 3.4, 15, 41, 'regula'),
  (149, 'ziemniak', 2, 0.1, 17, 'regula'),
  (150, 'batat', 1.6, 0.1, 20, 'regula'),
  (151, 'groszek', 5, 0.4, 14, 'regula'),
  (152, 'kukurydza', 3, 1, 16, 'regula'),
  (153, '^(wino( |$)|piwo|wodka)', 0.3, 0, 3, 'regula'),
  (154, '(bulion|dashi|woda|kawa)', 0.5, 0.2, 0.3, 'regula'),
  (155, '(sok malinowy)', 0, 0, 12, 'regula'),
  (900, '(banan|borowki|brzoskwinia|cytryn|limonk|jablk|kiwi|mango|maliny|truskawki|pomarancz|winogrona|owoce|arbuz|czeresnie|granat|gruszka|jagody|sliwki|wisnie|zurawina|ananas|skorka)', 0.8, 0.3, 11, 'owoc'),
  (901, '(baklazan|brokul|buraki|burak|cebula|cukinia|dymka|fasolka szparagowa|jarmuz|kalafior|kapusta|kielki|marchew|ogorek|ogorki|papryka (czerwona|zolta)$|^papryka$|papryczka|pieczarki|boczniaki|kurki|pomidor|por$|rukola|rzodkiew|rzepa|salat|seler|szczypiorek|szpinak|szparagi|szalotka|dynia|fenkul|endywia|papaja|wloszczyzna|botwinka|natka|koperek|kolendra|bazylia|mieta|listki|czosnek|imbir$|zabek|zakwas|wakame|nori|rabarbar|pietruszka)', 1.8, 0.3, 5, 'warzywo');

create temp table wagi_szt (prio int, wzor text, g numeric) on commit drop;
insert into wagi_szt values
  (0, '^jaj', 55),
  (1, 'zoltk', 18),
  (2, 'bialko jajka', 33),
  (3, 'pomidorki|koktajlow', 15),
  (4, 'pomidor', 120),
  (5, 'cebul', 120),
  (6, 'szalotk', 30),
  (7, '(czosnek|zabek)', 5),
  (8, 'papryczk', 10),
  (9, '^papryka', 150),
  (10, 'dymka', 15),
  (11, 'banan', 120),
  (12, 'jablk', 180),
  (13, 'gruszk', 170),
  (14, 'pomarancz', 200),
  (15, 'cytryn', 100),
  (16, 'limonk', 60),
  (17, 'kiwi', 75),
  (18, 'awokado', 140),
  (19, 'mango', 300),
  (20, 'tortill', 60),
  (21, 'pita', 70),
  (22, 'bulk|bulki', 70),
  (23, 'bagietk', 250),
  (24, '(chleb|pieczywo|kromk)', 35),
  (25, 'croissant', 60),
  (26, 'ogorek kiszony|ogorki kiszone|konserwowy', 70),
  (27, 'ogor', 150),
  (28, 'ziemniak', 150),
  (29, 'batat', 250),
  (30, 'marchew', 80),
  (31, 'pietruszka korzen', 80),
  (32, 'cukinia', 250),
  (33, 'baklazan', 300),
  (34, 'por', 200),
  (35, 'seler naciowy', 40),
  (36, 'rzodkiewk', 10),
  (37, 'burak', 150),
  (38, 'kalafior', 700),
  (39, 'brokul', 400),
  (40, 'udko z kurczaka|udka', 200),
  (41, 'udko z kaczki', 250),
  (42, 'piers z kurczaka', 200),
  (43, 'piers z kaczki', 300),
  (44, 'kielbas|parowk', 60),
  (45, '(z puszki|w puszce|puszka)', 400),
  (46, 'mozzarella', 125),
  (47, 'oliwki', 4),
  (48, 'rzepa', 150),
  (49, 'sliwk', 30),
  (50, 'fenkul', 250),
  (51, 'granat', 250),
  (52, 'anchois', 4),
  (53, 'pieczark', 20),
  (54, 'morel', 40),
  (55, 'endywi', 150);

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
  m := regexp_match(s, '^(?:(\d+(?:\.\d+)?)\s+)?(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)$');
  if m is not null then
    if m[3]::numeric = 0 then return null; end if;
    return coalesce(m[1]::numeric, 0) + m[2]::numeric / m[3]::numeric;
  end if;
  m := regexp_match(s, '^(\d+(?:\.\d+)?)');
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
