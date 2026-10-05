-- Task 20261003-2232-dane
-- "Bułka tarta"/"Panko" mają niezgodną kategorię w części przepisów:
-- większość wierszy (23 dla bułki tartej, 2 dla panko) ma poprawnie
-- '5_Produkty sypkie' (dział produktów sypkich/do pieczenia), ale 7 wierszy
-- (6 bułka tarta + 1 panko) ma błędnie '4_Pieczywo' — bułka tarta/panko to
-- nie świeży chleb, nie leży w dziale pieczywa.
-- Efekt: te 7 pozycji na liście zakupów ląduje w innej sekcji sklepu niż
-- reszta tego samego produktu z innych przepisów.
-- Tylko kategoria — nazwa, ilość i jednostka zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga
-- starej, błędnej kategorii; po pierwszym przebiegu drugi nic nie znajdzie).

-- Bułka tarta: Dorsz panierowany, Kotlet schabowy, Krokiety z kapustą
-- kiszoną i grzybami, Nuggetsy domowe, Orecchiette z brokułami i anchois,
-- Karczochy smażone
UPDATE dania SET "Kategoria" = '5_Produkty sypkie'
WHERE id IN (66, 152, 169, 2097, 4519, 4961)
  AND "Składnik" ILIKE 'bułka tarta'
  AND "Kategoria" = '4_Pieczywo';

-- Panko: Panierowana pierś kurczaka
UPDATE dania SET "Kategoria" = '5_Produkty sypkie'
WHERE id = 265 AND "Składnik" = 'Panko' AND "Kategoria" = '4_Pieczywo';
