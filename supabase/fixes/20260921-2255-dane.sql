-- Task 20260921-2255-dane
--
-- Danie "Bułeczki jak z Maka" (id=625), składnik "Bułka" ma Kategoria =
-- '5_Pieczywo' — to nie jest prawidłowy identyfikator kategorii. Prawidłowe
-- kategorie (patrz KATEGORIE w src/pages/ListaZakupow.jsx) to m.in.
-- '4_Pieczywo' (pieczywo) i '5_Produkty sypkie' (prefiks "5_" jest zajęty
-- przez inną kategorię). Efekt: aktualnie ukryty przez fallback w UI, ale
-- każda edycja tej pozycji na liście zakupów przeniosłaby ją do "Inne"
-- (bezpiecznaKategoria() nie rozpoznaje '5_Pieczywo' jako poprawnej kategorii).
--
-- Bezpieczne do jednokrotnego uruchomienia: WHERE po konkretnym id, więc
-- powtórne odpalenie nic nie zmieni (kolumna już będzie miała docelową wartość).
update dania
set "Kategoria" = '4_Pieczywo'
where id = 625
  and "Danie" = 'Bułeczki jak z Maka'
  and "Składnik" = 'Bułka'
  and "Kategoria" = '5_Pieczywo';
