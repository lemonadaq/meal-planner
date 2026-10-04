-- Task 20261004-1537-dane
-- Kilka wierszy w "dania" ma nazwę składnika z przestawioną kolejnością słów
-- względem reszty bazy i wpisu w skladniki_meta (np. "słodka papryka" zamiast
-- "papryka słodka"). Dopasowanie na liście zakupów (dopasujMeta w
-- src/jednostki.js) łączy składniki po nazwa_norm/aliasach z skladniki_meta
-- albo po identycznym znormalizowanym tekście, ale nie radzi sobie z
-- przestawioną kolejnością słów — więc taki wiersz ląduje na liście zakupów
-- jako druga, osobna pozycja tego samego produktu.
-- Tylko nazwa składnika — ilość, jednostka i kategoria zostają bez zmian.
-- Sprawdzone: żaden z tych przepisów nie ma już wiersza z docelową nazwą,
-- więc zmiana nie tworzy duplikatu w obrębie dania.
-- Bezpieczne do wielokrotnego uruchomienia (WHERE wymaga starej nazwy;
-- po pierwszym przebiegu drugi nic nie znajdzie).

-- "Zupa z soczewicy czerwonej": "słodka papryka" → "papryka słodka"
-- (32 inne wiersze w bazie i wpis w skladniki_meta używają tej kolejności)
UPDATE dania SET "Składnik" = 'papryka słodka'
WHERE id = 2584 AND "Składnik" = 'słodka papryka';

-- "Kalafior marynowany z oliwkami": "czerwona papryka" → "papryka czerwona"
-- (57 innych wierszy i wpis w skladniki_meta używają tej kolejności)
UPDATE dania SET "Składnik" = 'papryka czerwona'
WHERE id = 5183 AND "Składnik" = 'czerwona papryka';

-- "Surówka z czerwonej kapusty": "czerwona kapusta" → "kapusta czerwona"
-- (wpis w skladniki_meta używa tej kolejności)
UPDATE dania SET "Składnik" = 'kapusta czerwona'
WHERE id = 3257 AND "Składnik" = 'czerwona kapusta';

-- "Spaghetti alla puttanesca": "pomidory z puszki (krojone)" → "pomidory krojone z puszki"
-- (ta kolejność jest aliasem w skladniki_meta dla "Pomidory w puszce")
UPDATE dania SET "Składnik" = 'pomidory krojone z puszki'
WHERE id = 4456 AND "Składnik" = 'pomidory z puszki (krojone)';

-- "Zupa neapolitańska": "Pomidory z puszki krojone" → "Pomidory krojone z puszki"
UPDATE dania SET "Składnik" = 'Pomidory krojone z puszki'
WHERE id = 3565 AND "Składnik" = 'Pomidory z puszki krojone';

-- "Involtini cielęce w sosie pomidorowym": "pomidory z puszki krojone" → "pomidory krojone z puszki"
UPDATE dania SET "Składnik" = 'pomidory krojone z puszki'
WHERE id = 4680 AND "Składnik" = 'pomidory z puszki krojone';
