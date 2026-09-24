-- Task 20260924-2249-dane
-- Składnik "gorzka czekolada" ma w bazie dwie kolejności słów ("Czekolada
-- gorzka" / "Gorzka czekolada"). Normalizacja nazw używana przy budowaniu
-- listy zakupów (src/nazwySkladnikow.js, src/jednostki.js) nie sortuje słów,
-- więc dwa dania z różną pisownią dają na liście DWIE osobne pozycje zamiast
-- jednej zsumowanej. Ujednolicamy do większościowego wariantu "Gorzka
-- czekolada" (6 z 12 wierszy już go miało). Tylko nazwa składnika — ilości,
-- jednostki i kategorie zostają bez zmian. Bezpieczne do wielokrotnego
-- uruchomienia (idempotentne: drugi przebieg nie znajdzie już nic do zmiany).

-- "Czekolada gorzka" -> "Gorzka czekolada" (zły szyk słów)
UPDATE dania SET "Składnik" = 'Gorzka czekolada'
WHERE id IN (1666, 1886, 2298, 4282) AND "Składnik" = 'Czekolada gorzka';

-- "gorzka czekolada" (mała litera) -> "Gorzka czekolada" (ujednolicenie wielkości liter)
UPDATE dania SET "Składnik" = 'Gorzka czekolada'
WHERE id IN (2269, 5043) AND "Składnik" = 'gorzka czekolada';
