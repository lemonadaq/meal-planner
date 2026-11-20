-- Task 20261120-1700-dane
-- Dania „na masę" (paczka skrypty/dania/paczka-10.json, 20 dań: śniadania,
-- obiady, kolacje) + kolumny `dieta`, `bialko`, `tluszcz`, `wegle`
-- (ta sama treść co migracja_dieta_makro.sql).
-- Wszystkie dania mają dieta = 'masa' → chip „💪 Na masę" w Przepisach
-- i w Tygodniu. Makro i kcal na 1 porcję, policzone ze składników
-- (skrypty/dania/zrodla/paczka-10-masa.py).
-- Zdjęć brak — dorabia je tryb `import` w „Generuj dania" (pole `dania`:
-- paczka-10.json): dania już są w bazie, więc idzie tylko zdjęcie, z gotowego
-- opis_wizualny, bez zapytań do Anthropic.
-- Bezpieczne do wielokrotnego uruchomienia: `if not exists` na kolumnach,
-- a każde danie wstawia się tylko, gdy jeszcze go nie ma.

alter table dania add column if not exists dieta   text;
alter table dania add column if not exists dieta   text;
alter table dania add column if not exists bialko  integer;
alter table dania add column if not exists tluszcz integer;
alter table dania add column if not exists wegle   integer;

comment on column dania.dieta   is 'Wartość techniczna z DIETY w skrypty/wspolne.js (np. masa) — filtr w Przepisach i Tygodniu';
comment on column dania.bialko  is 'Białko w g na 1 porcję (spójne z "Ilość na 1 porcję")';
comment on column dania.tluszcz is 'Tłuszcz w g na 1 porcję';
comment on column dania.wegle   is 'Węglowodany w g na 1 porcję';

-- Jajecznica z 4 jaj z szynką na chlebie żytnim
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'jajka', '4', 'szt', '3_Nabiał', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'masło', '10', 'g', '3_Nabiał', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'szynka', '50', 'g', '2_Mięso i ryby', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'chleb żytni', '3', 'szt', '4_Pieczywo', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'pomidory', '1', 'szt', '1_Warzywa i owoce', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'szczypiorek', '1', 'łyżka', '1_Warzywa i owoce', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 45, 33, 61),
  ('Jajecznica z 4 jaj z szynką na chlebie żytnim', '1. Rozgrzej masło na patelni na średnim ogniu i podsmaż pokrojoną w paski szynkę przez minutę.
2. Wbij jajka, dopraw solą i pieprzem i mieszaj powoli szpatułką, aż się zetną, ale zostaną wilgotne.
3. Zdejmij z ognia, posyp szczypiorkiem. Podawaj z chlebem żytnim i pokrojonym pomidorem.', 'sniadanie', 15, 730, 'polska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 45, 33, 61)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Jajecznica z 4 jaj z szynką na chlebie żytnim');

-- Burrito śniadaniowe z jajkiem, fasolą i serem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'tortilla', '2', 'szt', '4_Pieczywo', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'jajka', '3', 'szt', '3_Nabiał', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'fasola czerwona z puszki', '80', 'g', '6_Konserwy i słoiki', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'ser żółty', '40', 'g', '3_Nabiał', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'papryka', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'papryczka chili', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'kumin', '1', 'szczypta', '7_Przyprawy', 'masa', 48, 39, 78),
  ('Burrito śniadaniowe z jajkiem, fasolą i serem', '1. Podsmaż na oleju pokrojoną w kostkę paprykę i chili przez 3 minuty.
2. Dodaj odsączoną fasolę i kumin, rozgnieć ją lekko widelcem i podgrzej.
3. Wbij jajka, posól i mieszaj, aż się zetną.
4. Rozłóż farsz na tortillach, posyp startym serem, zwiń ciasno i opiecz na suchej patelni z obu stron, aż ser się roztopi.', 'sniadanie', 20, 860, 'meksykanska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 48, 39, 78)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Burrito śniadaniowe z jajkiem, fasolą i serem');

-- Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'twaróg', '200', 'g', '3_Nabiał', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'skyr naturalny', '100', 'g', '3_Nabiał', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'jajka', '2', 'szt', '3_Nabiał', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'rzodkiewka', '5', 'szt', '1_Warzywa i owoce', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'szczypiorek', '2', 'łyżka', '1_Warzywa i owoce', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'chleb żytni', '3', 'szt', '4_Pieczywo', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'masło', '10', 'g', '3_Nabiał', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 68, 30, 68),
  ('Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim', '1. Ugotuj jajka na twardo (9 minut od zagotowania), ostudź w zimnej wodzie i obierz.
2. Rozgnieć twaróg widelcem ze skyrem, dodaj pokrojoną rzodkiewkę i szczypiorek, dopraw solą i pieprzem.
3. Posmaruj chleb cienko masłem, nałóż twarożek, a na wierzch połówki jajek.', 'sniadanie', 15, 840, 'polska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 68, 30, 68)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Twarożek z jajkiem na twardo i rzodkiewką na chlebie żytnim');

-- Pancakes proteinowe ze skyrem i bananem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'jajka', '2', 'szt', '3_Nabiał', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'skyr naturalny', '200', 'g', '3_Nabiał', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'mąka pszenna', '80', 'g', '5_Produkty sypkie', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'proszek do pieczenia', '1', 'łyżeczka', '7_Przyprawy', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'banany', '1', 'szt', '1_Warzywa i owoce', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'masło orzechowe', '1', 'łyżka', '6_Konserwy i słoiki', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'miód', '1', 'łyżka', '8_Inne', 'masa', 49, 24, 113),
  ('Pancakes proteinowe ze skyrem i bananem', '1. Zmiksuj jajka ze skyrem, dodaj mąkę i proszek do pieczenia i wymieszaj na gładkie, gęste ciasto.
2. Smaż małe placki na lekko natłuszczonej patelni na średnim ogniu, aż pojawią się bąbelki, potem obróć i smaż jeszcze minutę.
3. Podawaj z plasterkami banana, masłem orzechowym i miodem.', 'sniadanie', 25, 850, 'amerykanska', 'latwe', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 49, 24, 113)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Pancakes proteinowe ze skyrem i bananem');

-- Tosty francuskie z chałki z bananem i skyrem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'chałka', '120', 'g', '4_Pieczywo', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'jajka', '3', 'szt', '3_Nabiał', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'mleko', '60', 'ml', '3_Nabiał', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'cynamon', '1', 'szczypta', '7_Przyprawy', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'masło', '10', 'g', '3_Nabiał', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'skyr naturalny', '150', 'g', '3_Nabiał', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'banany', '1', 'szt', '1_Warzywa i owoce', 'masa', 50, 34, 120),
  ('Tosty francuskie z chałki z bananem i skyrem', '1. Roztrzep jajka z mlekiem i cynamonem w głębokim talerzu.
2. Pokrój chałkę na grube kromki i namocz każdą z obu stron w masie jajecznej.
3. Smaż na maśle na średnim ogniu po 2 minuty z każdej strony, aż się zrumienią.
4. Podawaj ze skyrem, plasterkami banana i miodem.', 'sniadanie', 15, 980, 'francuska', 'latwe', 4, 'miód', '1', 'łyżka', '8_Inne', 'masa', 50, 34, 120)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Tosty francuskie z chałki z bananem i skyrem');

-- Naleśniki z twarożkiem waniliowym i jagodami
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'mąka pszenna', '60', 'g', '5_Produkty sypkie', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'mleko', '120', 'ml', '3_Nabiał', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'jajka', '1', 'szt', '3_Nabiał', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'twaróg', '200', 'g', '3_Nabiał', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'skyr naturalny', '50', 'g', '3_Nabiał', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'cukier waniliowy', '1', 'łyżeczka', '7_Przyprawy', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'miód', '1', 'łyżka', '8_Inne', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'jagody', '80', 'g', '1_Warzywa i owoce', 'masa', 59, 22, 86),
  ('Naleśniki z twarożkiem waniliowym i jagodami', '1. Zmiksuj mąkę z mlekiem, jajkiem i szczyptą soli. Odstaw ciasto na 10 minut.
2. Smaż cienkie naleśniki na lekko natłuszczonej patelni, po około minucie z każdej strony.
3. Rozgnieć twaróg ze skyrem, cukrem waniliowym i miodem.
4. Posmaruj naleśniki farszem, złóż w trójkąty i podawaj z jagodami.', 'sniadanie', 30, 770, 'polska', 'srednie', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 59, 22, 86)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Naleśniki z twarożkiem waniliowym i jagodami');

-- Shake bananowy z masłem orzechowym i płatkami
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'mleko', '400', 'ml', '3_Nabiał', 'masa', 46, 28, 104),
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'banany', '1', 'szt', '1_Warzywa i owoce', 'masa', 46, 28, 104),
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'płatki owsiane', '50', 'g', '5_Produkty sypkie', 'masa', 46, 28, 104),
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'masło orzechowe', '2', 'łyżka', '6_Konserwy i słoiki', 'masa', 46, 28, 104),
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'skyr naturalny', '150', 'g', '3_Nabiał', 'masa', 46, 28, 104),
  ('Shake bananowy z masłem orzechowym i płatkami', '1. Wrzuć wszystkie składniki do blendera.
2. Miksuj minutę, aż płatki całkiem się rozdrobnią i shake będzie gładki. Pij od razu albo zabierz w bidonie do pracy.', 'sniadanie', 5, 840, 'miedzynarodowa', 'latwe', 4, 'miód', '1', 'łyżka', '8_Inne', 'masa', 46, 28, 104)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Shake bananowy z masłem orzechowym i płatkami');

-- Udka z kurczaka tikka z ryżem basmati
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'udko z kurczaka', '250', 'g', '2_Mięso i ryby', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'jogurt naturalny', '3', 'łyżka', '3_Nabiał', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'ryż basmati', '120', 'g', '5_Produkty sypkie', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'cebula', '1', 'szt', '1_Warzywa i owoce', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'imbir', '1', 'łyżeczka', '1_Warzywa i owoce', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'pomidory z puszki', '200', 'g', '6_Konserwy i słoiki', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'śmietana 18%', '3', 'łyżka', '3_Nabiał', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'garam masala', '2', 'łyżeczka', '7_Przyprawy', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'kurkuma', '1', 'łyżeczka', '7_Przyprawy', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'papryczka chili', '1', 'szt', '1_Warzywa i owoce', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'olej', '1', 'łyżka', '8_Inne', 'masa', 63, 45, 122),
  ('Udka z kurczaka tikka z ryżem basmati', '1. Pokrój mięso z udek w kostkę i wymieszaj z jogurtem, połową garam masali i solą. Odstaw na 15 minut.
2. Ugotuj ryż według instrukcji na opakowaniu.
3. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, imbir, chili, kurkumę i resztę garam masali, smaż minutę.
4. Dodaj kurczaka i obsmaż go ze wszystkich stron przez 5 minut.
5. Wlej pomidory i duś pod przykryciem 15 minut. Na koniec wmieszaj śmietanę i podgrzej, nie gotując.
6. Podawaj z ryżem. Druga porcja dobrze znosi odgrzewanie następnego dnia.', 'obiad', 45, 1150, 'indyjska', 'srednie', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 63, 45, 122)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Udka z kurczaka tikka z ryżem basmati');

-- Chili con carne z ryżem i kwaśną śmietaną
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'mięso mielone wołowe', '200', 'g', '2_Mięso i ryby', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'fasola czerwona z puszki', '120', 'g', '6_Konserwy i słoiki', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'kukurydza z puszki', '60', 'g', '6_Konserwy i słoiki', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'pomidory z puszki', '200', 'g', '6_Konserwy i słoiki', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'koncentrat pomidorowy', '1', 'łyżka', '6_Konserwy i słoiki', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'cebula', '1', 'szt', '1_Warzywa i owoce', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'papryka', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'papryczka chili', '1', 'szt', '1_Warzywa i owoce', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'kumin', '1', 'łyżeczka', '7_Przyprawy', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'papryka słodka', '1', 'łyżeczka', '7_Przyprawy', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'ryż basmati', '100', 'g', '5_Produkty sypkie', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'śmietana 18%', '2', 'łyżka', '3_Nabiał', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 61, 52, 136),
  ('Chili con carne z ryżem i kwaśną śmietaną', '1. Na oleju zeszklij posiekaną cebulę, dodaj czosnek, chili i pokrojoną paprykę, smaż 3 minuty.
2. Dodaj mięso i smaż, rozbijając łopatką, aż się zrumieni. Wsyp kumin i paprykę słodką.
3. Dodaj koncentrat, pomidory, odsączoną fasolę i kukurydzę. Duś na małym ogniu 25 minut, mieszając od czasu do czasu.
4. W tym czasie ugotuj ryż. Podawaj chili na ryżu z łyżką śmietany.', 'obiad', 50, 1250, 'meksykanska', 'srednie', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 61, 52, 136)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Chili con carne z ryżem i kwaśną śmietaną');

-- Spaghetti z wołowym sosem pomidorowym i parmezanem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'spaghetti', '125', 'g', '5_Produkty sypkie', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'mięso mielone wołowe', '150', 'g', '2_Mięso i ryby', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'pomidory z puszki', '200', 'g', '6_Konserwy i słoiki', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'koncentrat pomidorowy', '1', 'łyżka', '6_Konserwy i słoiki', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'cebula', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'marchew', '1/2', 'szt', '7_Przyprawy', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'oregano', '1', 'łyżeczka', '7_Przyprawy', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'parmezan', '20', 'g', '3_Nabiał', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'oliwa z oliwek', '1', 'łyżeczka', '8_Inne', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 53, 42, 109),
  ('Spaghetti z wołowym sosem pomidorowym i parmezanem', '1. Na oliwie podsmaż drobno posiekaną cebulę i startą marchew przez 5 minut, dodaj czosnek.
2. Dodaj mięso i smaż, aż się zrumieni. Wmieszaj koncentrat, pomidory i oregano, dopraw.
3. Duś sos na małym ogniu 20 minut.
4. Ugotuj spaghetti al dente, wymieszaj z sosem i posyp tartym parmezanem.', 'obiad', 40, 1030, 'wloska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 53, 42, 109)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Spaghetti z wołowym sosem pomidorowym i parmezanem');

-- Kurczak teriyaki z ryżem i brokułem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'pierś z kurczaka', '220', 'g', '2_Mięso i ryby', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'ryż basmati', '120', 'g', '5_Produkty sypkie', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'brokuł', '150', 'g', '1_Warzywa i owoce', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'sos sojowy', '2', 'łyżka', '6_Konserwy i słoiki', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'miód', '1', 'łyżka', '8_Inne', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'czosnek', '1', 'szt', '1_Warzywa i owoce', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'imbir', '1', 'łyżeczka', '1_Warzywa i owoce', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'sezam', '1', 'łyżeczka', '7_Przyprawy', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'olej', '1', 'łyżka', '8_Inne', 'masa', 67, 15, 125),
  ('Kurczak teriyaki z ryżem i brokułem', '1. Ugotuj ryż. Brokuł podziel na różyczki i gotuj na parze lub w wodzie 4 minuty.
2. Wymieszaj sos sojowy z miodem, startym czosnkiem i imbirem.
3. Pokrój kurczaka w kostkę i smaż na oleju na mocnym ogniu 6–7 minut, aż się zrumieni.
4. Wlej sos i smaż jeszcze 2 minuty, aż zgęstnieje i oblepi mięso.
5. Podawaj z ryżem i brokułem, posyp sezamem i dymką. Dobrze nadaje się do pudełka na 2 dni.', 'obiad', 30, 900, 'japonska', 'latwe', 4, 'dymka', '1', 'szt', '1_Warzywa i owoce', 'masa', 67, 15, 125)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Kurczak teriyaki z ryżem i brokułem');

-- Antrykot z pieczonymi ziemniakami i sałatką
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'antrykot wołowy', '250', 'g', '2_Mięso i ryby', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'ziemniaki', '2', 'szt', '1_Warzywa i owoce', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'oliwa z oliwek', '1', 'łyżka', '8_Inne', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'masło', '10', 'g', '3_Nabiał', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'rozmaryn', '1', 'łyżeczka', '7_Przyprawy', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'sałata', '50', 'g', '1_Warzywa i owoce', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'pomidory', '1', 'szt', '1_Warzywa i owoce', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'ogórek', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 56, 59, 63),
  ('Antrykot z pieczonymi ziemniakami i sałatką', '1. Wyjmij stek z lodówki 30 minut przed smażeniem. Rozgrzej piekarnik do 210 stopni.
2. Pokrój ziemniaki w łódeczki, wymieszaj z połową oliwy, rozmarynem i solą. Piecz 35 minut, raz przewracając.
3. Osusz stek, posól i smaż na bardzo gorącej patelni z resztą oliwy po 3 minuty z każdej strony. Pod koniec dodaj masło i czosnek i polewaj nimi mięso.
4. Odstaw stek na 5 minut, potem pokrój w poprzek włókien.
5. Podawaj z ziemniakami i sałatką z sałaty, pomidora i ogórka.', 'obiad', 50, 1000, 'amerykanska', 'srednie', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 56, 59, 63)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Antrykot z pieczonymi ziemniakami i sałatką');

-- Makaron z kurczakiem i szpinakiem w sosie śmietanowym
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'makaron', '120', 'g', '5_Produkty sypkie', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'pierś z kurczaka', '180', 'g', '2_Mięso i ryby', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'szpinak', '80', 'g', '1_Warzywa i owoce', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'śmietana 18%', '4', 'łyżka', '3_Nabiał', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'parmezan', '20', 'g', '3_Nabiał', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'oliwa z oliwek', '1', 'łyżeczka', '8_Inne', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'papryka ostra', '1', 'szczypta', '7_Przyprawy', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 67, 25, 95),
  ('Makaron z kurczakiem i szpinakiem w sosie śmietanowym', '1. Ugotuj makaron al dente, odlej trochę wody z gotowania.
2. Pokrój kurczaka w paski, dopraw solą, pieprzem i ostrą papryką i smaż na oliwie 6 minut.
3. Dodaj czosnek i szpinak, smaż, aż szpinak zwiędnie.
4. Wlej śmietanę i 3 łyżki wody z makaronu, dodaj parmezan i makaron, wymieszaj, aż sos oblepi makaron.', 'obiad', 30, 880, 'wloska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 67, 25, 95)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Makaron z kurczakiem i szpinakiem w sosie śmietanowym');

-- Wrapy z kurczakiem gyros i tzatziki
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'tortilla', '2', 'szt', '4_Pieczywo', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'pierś z kurczaka', '180', 'g', '2_Mięso i ryby', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'przyprawa gyros', '2', 'łyżeczka', '7_Przyprawy', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'jogurt grecki', '4', 'łyżka', '3_Nabiał', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'ogórek', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'czosnek', '1', 'szt', '1_Warzywa i owoce', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'pomidory', '1', 'szt', '1_Warzywa i owoce', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'sałata', '30', 'g', '1_Warzywa i owoce', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'cebula czerwona', '1/4', 'szt', '7_Przyprawy', 'masa', 57, 29, 73),
  ('Wrapy z kurczakiem gyros i tzatziki', '1. Pokrój kurczaka w paski, wymieszaj z przyprawą gyros i olejem i smaż 7 minut na mocnym ogniu.
2. Zetrzyj ogórek, odciśnij wodę i wymieszaj z jogurtem i przeciśniętym czosnkiem.
3. Podgrzej tortille na suchej patelni. Nałóż sałatę, pomidora, cebulę, kurczaka i tzatziki, zawiń.', 'kolacja', 25, 800, 'grecka', 'latwe', 4, 'olej', '1', 'łyżka', '8_Inne', 'masa', 57, 29, 73)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Wrapy z kurczakiem gyros i tzatziki');

-- Penne z tuńczykiem, oliwkami i pomidorami
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'makaron', '110', 'g', '5_Produkty sypkie', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'tuńczyk w sosie własnym', '120', 'g', '6_Konserwy i słoiki', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'pomidory z puszki', '150', 'g', '6_Konserwy i słoiki', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'oliwki czarne', '6', 'szt', '6_Konserwy i słoiki', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'czosnek', '2', 'szt', '1_Warzywa i owoce', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'papryczka chili', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'oliwa z oliwek', '1', 'łyżka', '8_Inne', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'parmezan', '15', 'g', '3_Nabiał', 'masa', 49, 20, 90),
  ('Penne z tuńczykiem, oliwkami i pomidorami', '1. Ugotuj makaron al dente.
2. Na oliwie podsmaż czosnek i chili przez minutę, dodaj pomidory i duś 8 minut.
3. Dodaj odsączonego tuńczyka i pokrojone oliwki, podgrzej.
4. Wymieszaj z makaronem, posyp parmezanem i natką.', 'kolacja', 20, 740, 'wloska', 'latwe', 4, 'natka pietruszki', '1', 'łyżka', '1_Warzywa i owoce', 'masa', 49, 20, 90)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Penne z tuńczykiem, oliwkami i pomidorami');

-- Cheeseburger z jajkiem sadzonym
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'mięso mielone wołowe', '150', 'g', '2_Mięso i ryby', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'bułka', '1', 'szt', '4_Pieczywo', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'ser żółty', '30', 'g', '3_Nabiał', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'jajka', '1', 'szt', '3_Nabiał', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'sałata', '20', 'g', '1_Warzywa i owoce', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'pomidory', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'cebula czerwona', '1/4', 'szt', '7_Przyprawy', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'ketchup', '1', 'łyżka', '7_Przyprawy', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 49, 50, 38),
  ('Cheeseburger z jajkiem sadzonym', '1. Uformuj z mięsa płaski kotlet, dopraw solą i pieprzem dopiero tuż przed smażeniem.
2. Smaż na mocno rozgrzanej patelni po 3 minuty z każdej strony. Pod koniec połóż ser i przykryj, żeby się roztopił.
3. Usmaż jajko sadzone. Podpiecz przekrojoną bułkę.
4. Złóż burgera: bułka, ketchup, sałata, pomidor, kotlet z serem, cebula, jajko.', 'kolacja', 25, 790, 'amerykanska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 49, 50, 38)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Cheeseburger z jajkiem sadzonym');

-- Łosoś pieczony z kaszą bulgur i brokułem
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'filet z łososia', '160', 'g', '2_Mięso i ryby', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'kasza bulgur', '80', 'g', '5_Produkty sypkie', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'brokuł', '150', 'g', '1_Warzywa i owoce', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'sok z cytryny', '1', 'łyżka', '1_Warzywa i owoce', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'czosnek', '1', 'szt', '1_Warzywa i owoce', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'koperek', '1', 'łyżka', '1_Warzywa i owoce', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'oliwa z oliwek', '1', 'łyżeczka', '8_Inne', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 46, 26, 74),
  ('Łosoś pieczony z kaszą bulgur i brokułem', '1. Rozgrzej piekarnik do 200 stopni. Łososia skrop cytryną i oliwą, dopraw solą, pieprzem i czosnkiem.
2. Piecz łososia 15 minut.
3. Ugotuj kaszę bulgur według opakowania, a brokuł na parze przez 4 minuty.
4. Podawaj łososia na kaszy z brokułem, posyp koperkiem.', 'kolacja', 30, 680, 'miedzynarodowa', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 46, 26, 74)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Łosoś pieczony z kaszą bulgur i brokułem');

-- Pizza z szynką i mozzarellą na cieście 00
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'mąka pszenna', '125', 'g', '5_Produkty sypkie', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'drożdże świeże', '3', 'g', '5_Produkty sypkie', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'oliwa z oliwek', '1', 'łyżeczka', '8_Inne', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'pomidory z puszki', '80', 'g', '6_Konserwy i słoiki', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'mozzarella', '80', 'g', '3_Nabiał', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'szynka', '60', 'g', '2_Mięso i ryby', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'oregano', '1', 'szczypta', '7_Przyprawy', 'masa', 40, 22, 96),
  ('Pizza z szynką i mozzarellą na cieście 00', '1. Rozpuść drożdże w 80 ml letniej wody, dodaj mąkę (najlepiej typu 00), sól i oliwę. Wyrabiaj 8 minut, aż ciasto będzie gładkie.
2. Odstaw ciasto pod przykryciem na godzinę, aż podwoi objętość.
3. Rozgrzej piekarnik na maksimum (najlepiej z kamieniem lub blachą w środku).
4. Rozciągnij ciasto dłońmi, posmaruj zmiksowanymi pomidorami z oregano, połóż mozzarellę i szynkę.
5. Piecz 7–9 minut, aż brzegi się zrumienią.', 'kolacja', 100, 750, 'wloska', 'srednie', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 40, 22, 96)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Pizza z szynką i mozzarellą na cieście 00');

-- Miska ryżowa z kurczakiem, jajkiem i chili
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'ryż basmati', '90', 'g', '5_Produkty sypkie', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'udko z kurczaka', '150', 'g', '2_Mięso i ryby', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'jajka', '1', 'szt', '3_Nabiał', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'papryka', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'ogórek', '1/2', 'szt', '1_Warzywa i owoce', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'sos sojowy', '1', 'łyżka', '6_Konserwy i słoiki', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'miód', '1', 'łyżeczka', '8_Inne', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'papryczka chili', '1', 'szt', '1_Warzywa i owoce', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'czosnek', '1', 'szt', '1_Warzywa i owoce', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'sezam', '1', 'łyżeczka', '7_Przyprawy', 'masa', 44, 24, 86),
  ('Miska ryżowa z kurczakiem, jajkiem i chili', '1. Ugotuj ryż.
2. Pokrój mięso z udek w kostkę i smaż na oleju 7 minut. Dodaj czosnek, chili, sos sojowy i miód i smaż, aż się skarmelizuje.
3. Usmaż jajko sadzone.
4. Ułóż w misce ryż, kurczaka, pokrojoną paprykę i ogórek, na wierzch jajko. Posyp sezamem.', 'kolacja', 25, 740, 'koreanska', 'latwe', 4, 'olej', '1', 'łyżeczka', '8_Inne', 'masa', 44, 24, 86)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Miska ryżowa z kurczakiem, jajkiem i chili');

-- Pasta z jaj i twarogu ze szczypiorkiem na żytnim
INSERT INTO dania ("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
SELECT * FROM (VALUES
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'jajka', '3', 'szt', '3_Nabiał', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'twaróg', '100', 'g', '3_Nabiał', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'majonez', '1', 'łyżka', '6_Konserwy i słoiki', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'szczypiorek', '2', 'łyżka', '1_Warzywa i owoce', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'chleb żytni', '3', 'szt', '4_Pieczywo', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'pomidory', '1', 'szt', '1_Warzywa i owoce', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'sól', '1', 'szczypta', '7_Przyprawy', 'masa', 47, 32, 64),
  ('Pasta z jaj i twarogu ze szczypiorkiem na żytnim', '1. Ugotuj jajka na twardo, ostudź i obierz.
2. Posiekaj jajka drobno, wymieszaj z twarogiem, majonezem i szczypiorkiem, dopraw.
3. Nałóż pastę na chleb i podawaj z pomidorem.', 'kolacja', 15, 740, 'polska', 'latwe', 4, 'pieprz', '1', 'szczypta', '7_Przyprawy', 'masa', 47, 32, 64)
) AS v("Danie", "Przepis", "rodzaj", "czas_minuty", "kcal", "kuchnia", "poziom", "porcje_bazowe", "Składnik", "Ilość na 1 porcję", "Jednostka", "Kategoria", "dieta", "bialko", "tluszcz", "wegle")
WHERE NOT EXISTS (SELECT 1 FROM dania WHERE "Danie" = 'Pasta z jaj i twarogu ze szczypiorkiem na żytnim');

