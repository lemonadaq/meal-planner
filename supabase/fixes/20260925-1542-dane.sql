-- Task 20260925-1542-dane
-- Składnik parmezanu w tabeli "dania" ma dwie pisownie: "parmezan starty"
-- (10 wierszy) i "parmezan tarty" (17 wierszy) -- to synonimy tego samego
-- produktu ze sklepu (starty/tarty = zetrzyj na tarce).
-- src/nazwySkladnikow.js (OPISY_PRZYGOTOWANIA) rozpoznaje i ucina z nazwy
-- słowo "starty/starta/starte" przy budowaniu listy zakupów, ale NIE zna
-- słowa "tarty" -- więc te 17 wierszy nie łączy się na liście zakupów
-- z resztą użyć parmezanu i tworzy zbędną, osobną pozycję.
-- Ujednolicamy do "starty", które kod już poprawnie obsługuje.
-- Tylko nazwa składnika -- ilości, jednostki i kategorie bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: po pierwszym
-- przebiegu WHERE nie znajdzie już nic do zmiany).

-- "Parmezan tarty" -> "Parmezan starty" (wielka litera)
UPDATE dania SET "Składnik" = 'Parmezan starty'
WHERE id IN (2353) AND "Składnik" = 'Parmezan tarty';

-- "parmezan tarty" (mała litera) -> "parmezan starty"
UPDATE dania SET "Składnik" = 'parmezan starty'
WHERE id IN (2344, 3110, 4008, 4347, 4376, 4412, 4511, 4526, 4560, 4578, 4659, 4765, 4846, 4939, 4962, 5011)
  AND "Składnik" = 'parmezan tarty';
