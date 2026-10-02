-- Task 20261001-1504-dane
-- Wiersz dania.id = 251 ("Marry me chicken gnocchi", składnik "Śmietanka 30%")
-- ma Kategoria = '8_Inne' zamiast '3_Nabiał'. To jedyne takie odstępstwo —
-- wszystkie pozostałe 106 wierszy ze składnikiem zawierającym "śmietan"
-- (śmietanka/śmietana/serek śmietankowy, różne %) mają poprawnie '3_Nabiał'.
-- Efekt: na liście zakupów ta jedna pozycja ląduje w sekcji "Inne" zamiast
-- przy nabiale, czyli w innym miejscu sklepu niż reszta produktów mlecznych.
-- Tylko kategoria — nazwa, ilość i jednostka zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga
-- starej, błędnej kategorii; po pierwszym przebiegu drugi nic nie znajdzie).

UPDATE dania SET "Kategoria" = '3_Nabiał'
WHERE id = 251 AND "Składnik" = 'Śmietanka 30%' AND "Kategoria" = '8_Inne';
