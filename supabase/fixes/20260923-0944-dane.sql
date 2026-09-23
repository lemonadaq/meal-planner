-- Task 20260923-0944-dane
--
-- Pięć wierszy w "dania" ma "Ilość na 1 porcję" = "1" przy jednostce "kg" dla
-- głównego składnika dania (ziemniaki / rostbef / żeberka), mimo że wszystkie
-- pozostałe wiersze z jednostką "kg" mieszczą się w zakresie 0,1–0,7 (mięso
-- zwykle 0,4–0,7 kg/porcję). Wszystkie pięć dań ma porcje_bazowe = 4, więc
-- "1 kg na porcję" to w praktyce 4 kg na całe danie — literówka z generowania
-- przepisu (ten sam mechanizm co wcześniej naprawiony "Boczek 150 kg" zamiast
-- "150 g"), tym razem cała ilość na przepis wpisana zamiast podzielonej przez
-- liczbę porcji. Naprawiamy na 0,25 kg (1 kg / 4 porcje), co mieści się w
-- zakresie innych dań tej samej kategorii (np. "Pierogi ruskie" — ziemniaki
-- 0,5 kg/porcję, dania mięsne 0,4–0,7 kg/porcję).
--
-- Bezpieczne do jednokrotnego uruchomienia: WHERE po konkretnym id, nazwie
-- dania, składniku i obecnej wartości "1"/"kg", więc powtórne odpalenie nic
-- nie zmieni (kolumna już będzie miała docelową wartość i przestanie pasować
-- do WHERE).

update dania
set "Ilość na 1 porcję" = '0,25'
where id = 307
  and "Danie" = 'Placki ziemniaczane ze śmietaną'
  and "Składnik" = 'Ziemniaki'
  and "Ilość na 1 porcję" = '1'
  and "Jednostka" = 'kg';

update dania
set "Ilość na 1 porcję" = '0,25'
where id = 345
  and "Danie" = 'Pyzy/kluski śląskie'
  and "Składnik" = 'Ziemniaki'
  and "Ilość na 1 porcję" = '1'
  and "Jednostka" = 'kg';

update dania
set "Ilość na 1 porcję" = '0,25'
where id = 142
  and "Danie" = 'Kopytka z cebulką'
  and "Składnik" = 'Ziemniaki'
  and "Ilość na 1 porcję" = '1'
  and "Jednostka" = 'kg';

update dania
set "Ilość na 1 porcję" = '0,25'
where id = 423
  and "Danie" = 'Stek wołowy'
  and "Składnik" = 'Rostbef'
  and "Ilość na 1 porcję" = '1'
  and "Jednostka" = 'kg';

update dania
set "Ilość na 1 porcję" = '0,25'
where id = 491
  and "Danie" = 'Żeberka pieczone w miodzie i musztardzie'
  and "Składnik" = 'Żeberka wieprzowe'
  and "Ilość na 1 porcję" = '1'
  and "Jednostka" = 'kg';
