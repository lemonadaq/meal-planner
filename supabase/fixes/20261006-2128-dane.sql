-- Obszar "dane" — 6 wierszy w `dania` ma Kategoria = '7_Przyprawy' (albo inną
-- oczywiście złą kategorię), mimo że dla tego samego składnika w dziesiątkach
-- innych dań obowiązuje inna, spójna kategoria. To nie kosmetyka: ListaZakupow.jsx
-- (domyslnieWDomu) chowa z listy zakupów WSZYSTKO z kategorii "7_Przyprawy" (poza
-- winem), tak jak sól i pieprz — więc te składniki znikały z listy zakupów.
-- Bezpieczne do wielokrotnego/produkcyjnego uruchomienia: WHERE dopasowuje
-- Danie + Składnik + starą (błędną) Kategoria, więc po poprawieniu drugi
-- przebieg nic już nie znajdzie. Dopasowanie po nazwach, nie po id — id może
-- się różnić między staging a produkcją.

-- Miód w "Żeberka pieczone w miodzie i musztardzie": gdzie indziej (67 dań) Miód = 8_Inne.
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE "Danie" = 'Żeberka pieczone w miodzie i musztardzie' AND "Składnik" = 'Miód' AND "Kategoria" = '7_Przyprawy';

-- Bulion warzywny w "Ogórkowa": gdzie indziej (35 dań) Bulion warzywny = 8_Inne.
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE "Danie" = 'Ogórkowa' AND "Składnik" = 'Bulion warzywny' AND "Kategoria" = '7_Przyprawy';

-- Bulion warzywny w "Zupa krem z batatów": gdzie indziej (35 dań) Bulion warzywny = 8_Inne.
UPDATE dania SET "Kategoria" = '8_Inne'
WHERE "Danie" = 'Zupa krem z batatów' AND "Składnik" = 'Bulion warzywny' AND "Kategoria" = '5_Produkty sypkie';

-- Imbir w "Zupa krem z batatów": gdzie indziej (30 dań) Imbir = 1_Warzywa i owoce.
UPDATE dania SET "Kategoria" = '1_Warzywa i owoce'
WHERE "Danie" = 'Zupa krem z batatów' AND "Składnik" = 'Imbir' AND "Kategoria" = '7_Przyprawy';

-- Proszek do pieczenia w "Placuszki twarogowe": gdzie indziej (26 dań) = 5_Produkty sypkie.
UPDATE dania SET "Kategoria" = '5_Produkty sypkie'
WHERE "Danie" = 'Placuszki twarogowe' AND "Składnik" = 'Proszek do pieczenia' AND "Kategoria" = '7_Przyprawy';

-- bazylia świeża w "Sałatka ryżowa po włosku": gdzie indziej (12 dań) = 1_Warzywa i owoce.
UPDATE dania SET "Kategoria" = '1_Warzywa i owoce'
WHERE "Danie" = 'Sałatka ryżowa po włosku' AND "Składnik" = 'bazylia świeża' AND "Kategoria" = '7_Przyprawy';
