-- Task 20261007-1504-dane
-- "Spaghetti bolognese" miało dwa składniki mięsne (wołowina, wieprzowina)
-- zapisane w jednostce "szt." zamiast wagą: "0,3 szt." wołowiny/wieprzowiny
-- nie da się kupić w sklepie (mięso waży się/kroi, nie liczy w sztukach).
--
-- Tabela skladniki_meta ma dla obu tych składników jednostka_bazowa = 'g' —
-- sama baza metadanych potwierdza, że to powinna być waga, nie sztuki.
--
-- Ilość: w bazie konsekwentnie "mięso mielone wołowo-wieprzowe" (łącznie,
-- jedna pozycja) w głównych daniach na 4 porcje to 150 g na porcję —
-- potwierdzone w 5 innych przepisach (Gołąbki w sosie pomidorowym,
-- Naleśniki z mięsem zapiekane, Klopsiki w sosie pomidorowym, Zapiekanka
-- ziemniaczana z mięsem mielonym, Wrap z mięsem mielonym serem i warzywami —
-- wszystkie id porcje_bazowe=4, mięso mielone wołowo-wieprzowe = 150 g).
-- Tu mięso jest rozbite na dwa osobne wiersze (wołowina + wieprzowina), więc
-- 150 g dzielę po równo: 75 g + 75 g.
--
-- Bezpieczne do wielokrotnego uruchomienia (WHERE wymaga starej, błędnej
-- jednostki "szt."; po pierwszym przebiegu drugi nic nie znajdzie).

-- "Spaghetti bolognese" — Wołowina (ligawa/udziec)
UPDATE dania SET "Ilość na 1 porcję" = '75', "Jednostka" = 'g'
WHERE id = 403 AND "Danie" = 'Spaghetti bolognese' AND "Składnik" = 'Wołowina (ligawa/udziec)' AND "Jednostka" = 'szt.';

-- "Spaghetti bolognese" — Wieprzowina (schab/łopatka)
UPDATE dania SET "Ilość na 1 porcję" = '75', "Jednostka" = 'g'
WHERE id = 404 AND "Danie" = 'Spaghetti bolognese' AND "Składnik" = 'Wieprzowina (schab/łopatka)' AND "Jednostka" = 'szt.';
