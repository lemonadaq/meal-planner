-- Task 20260930-2119-dane
-- Danie "Orecchiette z brokułami i anchois" (9 wierszy w formacie długim,
-- id 4513-4521 — każdy składnik ma swoją kopię kolumny "Przepis") ma w kroku 3
-- przepisu słowo "suchо" z cyrylicowym "о" (U+043E, chr(1086)) zamiast
-- łacińskiego "o" (U+006F) w "podsmaż bułkę tartą na suchо lub z kroplą oliwy".
-- Wygląda identycznie na ekranie, ale to inny bajt, więc np. wyszukiwanie
-- pełnotekstowe po "sucho" by tego nie znalazło. Ta sama klasa błędu co
-- w Focacci id=4742 (issue #85, inny wiersz/pole — nie duplikat).
-- Zmieniamy tylko kolumnę "Przepis" (identyczną we wszystkich 9 wierszach
-- dania), reszta pól bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga
-- starej, zepsutej pisowni; po pierwszym przebiegu drugi nic nie znajdzie).

UPDATE dania
SET "Przepis" = replace("Przepis", 'such' || chr(1086), 'sucho')
WHERE "Danie" = 'Orecchiette z brokułami i anchois'
  AND "Przepis" LIKE '%such' || chr(1086) || '%';
