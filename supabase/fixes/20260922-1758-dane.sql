-- Task 20260922-1758-dane
--
-- "Kumin" (kmin rzymski) ma w tabeli "dania" trzy różne pisownie składnika,
-- z których dwie NIE trafiają w istniejący wpis skladniki_meta "Kmin rzymski"
-- (aliasy: kumin, kmin mielony, kumin mielony, cumin, kmin), więc lista
-- zakupów nie łączy ich z resztą dań w jedną pozycję (dopasujMeta w
-- src/jednostki.js robi tylko dokładne dopasowanie po nazwie/aliasie, bez
-- rozmytego). Efekt: dwie osobne linijki na tę samą przyprawę zamiast jednej.
--
-- Naprawa tylko po stronie "dania" (bez ruszania skladniki_meta):
-- - "Kumin" pasuje dokładnie do nazwy "Kmin rzymski", więc ujednolicamy pisownię.
-- - "Kmin rzymski mielony" nie pasuje do żadnego aliasu — zmieniamy na
--   "Kumin mielony", które JEST już na liście aliasów "Kmin rzymski".
--
-- Bezpieczne do jednokrotnego uruchomienia: WHERE po konkretnych id i
-- obecnej wartości "Składnik", więc powtórne odpalenie nic nie zmieni
-- (kolumna będzie już miała docelową wartość i przestanie pasować do WHERE).

-- "Burrito z mieloną wołowiną", "Chilli con carne", "Quesadilla z szarpaną wieprzowiną"
update dania
set "Składnik" = 'Kmin rzymski'
where id in (46, 61, 366)
  and "Składnik" = 'Kumin';

-- "Quesadilla z serem i fasolą", "Hummus z pieczonym burakiem", "Burgery z soczewicy"
update dania
set "Składnik" = 'Kumin mielony'
where id in (1541, 3073, 3778)
  and "Składnik" = 'Kmin rzymski mielony';
