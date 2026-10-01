-- Task 20260926-0941-dane
-- Majonez, musztarda i ketchup mają w większości przepisów Kategoria =
-- '6_Konserwy i słoiki', ale w kilku przepisach błędnie '7_Przyprawy'.
-- ListaZakupow.jsx (domyslnieWDomu) zakłada, że WSZYSTKO z kategorii
-- '7_Przyprawy' (oprócz wina) jest "już w domu" i chowa to z listy zakupów.
-- Kategoria dla danego składnika jest ustalana raz, z pierwszego przetworzonego
-- wiersza — więc błędny wiersz potrafi wywalić cały składnik z listy zakupów
-- na cały tydzień, nawet gdy inne dania w planie mają go poprawnie
-- skategoryzowany. Ujednolicamy do większościowej, poprawnej kategorii.
-- Tylko kategoria — nazwa, ilość i jednostka zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: drugi przebieg nie
-- znajdzie już nic do zmiany, bo WHERE wymaga starej błędnej kategorii).

-- Majonez: 4 wiersze błędnie jako przyprawa (17 innych już ma poprawną kategorię)
UPDATE dania SET "Kategoria" = '6_Konserwy i słoiki'
WHERE id IN (30, 132, 479, 546) AND "Składnik" = 'Majonez' AND "Kategoria" = '7_Przyprawy';

-- Musztarda: 5 wierszy błędnie jako przyprawa (8 innych już ma poprawną kategorię)
UPDATE dania SET "Kategoria" = '6_Konserwy i słoiki'
WHERE id IN (277, 493, 3978) AND "Składnik" = 'Musztarda' AND "Kategoria" = '7_Przyprawy';

UPDATE dania SET "Kategoria" = '6_Konserwy i słoiki'
WHERE id IN (2135) AND "Składnik" = 'musztarda' AND "Kategoria" = '7_Przyprawy';

UPDATE dania SET "Kategoria" = '6_Konserwy i słoiki'
WHERE id IN (5553) AND "Składnik" = 'musztarda' AND "Kategoria" = '7_Przyprawy';

-- Ketchup: 2 wiersze błędnie jako przyprawa (9 innych już ma poprawną kategorię)
UPDATE dania SET "Kategoria" = '6_Konserwy i słoiki'
WHERE id IN (489, 494) AND "Składnik" = 'Ketchup' AND "Kategoria" = '7_Przyprawy';
