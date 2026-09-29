-- Task 20260927-2242-dane
-- Wiersz dania.id = 4742 ("Focaccia z pomidorkami i oliwkami") ma w kolumnie
-- "Składnik" wartość "sól morska grubа" z cyrylicowym "а" (U+0430) zamiast
-- łacińskiego "a" (U+0061) na końcu słowa "gruba". Wygląda identycznie na
-- ekranie, ale jako inny ciąg bajtów nie łączy się z tym samym składnikiem
-- w innym przepisie ("Focaccia z rozmarynem i solą morską", id = 4925, ma
-- poprawne "sól morska gruba") ani z żadnym wpisem/aliasem w skladniki_meta.
-- Tylko nazwa składnika — ilość, jednostka i kategoria zostają bez zmian.
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga
-- starej, zepsutej pisowni; po pierwszym przebiegu drugi nic nie znajdzie).

UPDATE dania SET "Składnik" = 'sól morska gruba'
WHERE id = 4742 AND "Składnik" = 'sól morska grub' || chr(1072);
