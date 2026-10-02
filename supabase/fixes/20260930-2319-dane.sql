-- Task 20260930-2319-dane
-- Wiersz dania.id = 5064 ("Affogato al caffè", składnik "lody waniliowe") ma
-- w kolumnie "Ilość na 1 porcję" wartość ujemną "-5" (jednostka "g"). Kod listy
-- zakupów (src/pages/ListaZakupow.jsx, funkcja dodaj()) świadomie pomija ilości
-- <= 0, więc pozycja trafia na listę zakupów bez żadnej ilości ("—") zamiast
-- z konkretną wagą — użytkownik widzi, że lody są potrzebne, ale nie wie ile
-- kupić.
-- Przepis tego dania (kolumna "Przepis") mówi wprost: "Nałóż do niej dwie
-- gałki lodów waniliowych". Przyjęto 100 g (2 gałki × ok. 50 g/gałka — typowa
-- porcja gałki lodów), spójnie z innym deserem lodowym w bazie
-- ("Deser lodowy z gorącymi malinami" = 150 g na porcję, większa porcja lodów
-- jako główny składnik dania, nie dodatek do kawy).
-- Bezpieczne do wielokrotnego uruchomienia (idempotentne: WHERE wymaga starej,
-- zepsutej wartości; po pierwszym przebiegu drugi nic nie znajdzie).

UPDATE dania SET "Ilość na 1 porcję" = '100'
WHERE id = 5064 AND "Danie" = 'Affogato al caffè' AND "Składnik" = 'lody waniliowe'
  AND "Ilość na 1 porcję" = '-5';
