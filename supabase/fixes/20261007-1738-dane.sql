-- Task 20261007-1738-dane
-- Ten sam składnik ("mięso mielone wieprzowo-wołowe") ma w bazie dwie
-- pisownie z odwrotnym szykiem słów. 4 przepisy (Gołąbki w sosie
-- pomidorowym, Naleśniki z mięsem zapiekane, Klopsiki w sosie pomidorowym,
-- Zapiekanka ziemniaczana z mięsem mielonym) mają "mięso mielone
-- wieprzowo-wołowe", a jeden ("Oliwki nadziewane mięsem w panierce", id
-- 4927) ma "Mielone mięso wieprzowo-wołowe". Scalanie pozycji na liście
-- zakupów (ListaZakupow.jsx) nie zmienia szyku słów i nie ma dla tego
-- składnika wpisu w SCAL_NAZWY ani aliasu w skladniki_meta — więc druga
-- pisownia nie łączy się z resztą i tworzy osobną linię na liście zamiast
-- się zsumować.
-- Tylko nazwa składnika — ilość, jednostka i kategoria zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (WHERE wymaga starej pisowni;
-- po pierwszym przebiegu drugi nic nie znajdzie).

-- "Oliwki nadziewane mięsem w panierce"
UPDATE dania SET "Składnik" = 'Mięso mielone wieprzowo-wołowe'
WHERE id = 4927 AND "Składnik" = 'Mielone mięso wieprzowo-wołowe';
