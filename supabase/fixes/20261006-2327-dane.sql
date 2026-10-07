-- Task 20261006-2327-dane
-- "Oliwa z oliwek" ma niespójną kategorię: 123 z 126 wierszy w "dania" ma
-- poprawnie '8_Inne', ale 3 wiersze (po jednym w trzech przepisach) mają
-- błędnie '7_Przyprawy'. ListaZakupow.jsx scala pozycje po nazwie składnika,
-- a kategorię bierze z pierwszego napotkanego wiersza — jeśli to akurat
-- jeden z tych trzech przepisów, cała zbiorcza pozycja "Oliwa z oliwek"
-- ląduje w sekcji "Przyprawy" zamiast "Inne", niezależnie od reszty dań
-- w tygodniu z tym samym składnikiem.
-- Tylko kategoria — nazwa, ilość i jednostka zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (WHERE wymaga starej, błędnej
-- kategorii; po pierwszym przebiegu drugi nic nie znajdzie).

-- "Bruschetta z pomidorami i bazylią"
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE id = 1061 AND "Składnik" = 'Oliwa z oliwek' AND "Kategoria" = '7_Przyprawy';

-- "Sałatka caprese"
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE id = 1577 AND "Składnik" = 'Oliwa z oliwek' AND "Kategoria" = '7_Przyprawy';

-- "Tarta warzywna"
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE id = 1623 AND "Składnik" = 'Oliwa z oliwek' AND "Kategoria" = '7_Przyprawy';
