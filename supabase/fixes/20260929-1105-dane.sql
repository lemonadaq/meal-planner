-- Task 20260929-1105-dane
-- Ponowna aplikacja poprawki z PR #74 (supabase/fixes/20260927-2242-dane.sql).
-- Ten sam wiersz dania.id = 4742 ("Focaccia z pomidorkami i oliwkami") wciąż
-- miał w kolumnie "Składnik" wartość "sól morska grubа" z cyrylicowym "а"
-- (U+0430) zamiast łacińskiego "a" (U+0061) na końcu słowa "gruba" — mimo że
-- poprzednia poprawka jest już zmergowana do main. Na STAGING naprawiłem to
-- ręcznie (REST/PostgREST, bo psql z $STAGING_DB_URL jest blokowane w tej
-- sesji agenta), ale plik SQL trzeba dodać pod nową nazwą, żeby workflow
-- „Poprawki danych → produkcja" (uruchamia się tylko dla NOWO dodanych
-- plików w supabase/fixes/*.sql) rzeczywiście wykonał UPDATE na PRODUKCJI —
-- inaczej PROD może wciąż mieć zepsutą wartość, tak jak STAGING miał.
-- Tylko nazwa składnika — ilość, jednostka i kategoria zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga
-- starej, zepsutej pisowni; jeśli PROD już ma poprawną wartość, UPDATE
-- nie znajdzie żadnego wiersza).

UPDATE dania SET "Składnik" = 'sól morska gruba'
WHERE id = 4742 AND "Składnik" = 'sól morska grub' || chr(1072);
