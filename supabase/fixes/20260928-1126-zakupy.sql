-- Task 20260928-1126-zakupy
-- Liść laurowy i ziele angielskie w skladniki_meta miały puste waga_sztuki_g.
-- wagaSztukiZMeta() (src/jednostki.js) w takim wypadku zgaduje wagę "1 sztuki"
-- jako wagę CAŁEGO opakowania (rozmiar_opakowania) — trafne dla "1 cebula" czy
-- "1 puszka pomidorów", ale nie dla przypraw liczonych na listki/ziarna: przepis
-- pisze "2 liście laurowe"/"3 ziela angielskie", a każda "sztuka" liczyła się
-- jako 10 g / 15 g (waga całej saszetki) zamiast ułamka grama. Przy kilku
-- daniach w tygodniu (Barszcz czerwony + Bigos, po 6 porcji) dawało to np.
-- "Liść laurowy 180 g" i "Ziele angielskie 450 g" — dziesiątki paczek, nie do
-- kupienia w sklepie.
-- Ustawiamy realną wagę pojedynczego listka/ziarna, żeby wagaSztukiZMeta()
-- użyła jej zamiast zgadywać z rozmiaru opakowania (kod już to obsługuje —
-- waga_sztuki_g ma priorytet, patrz komentarz w jednostki.js o ząbku/kromce).
-- Bezpieczne do wielokrotnego uruchomienia: WHERE wymaga wciąż pustego pola,
-- drugi przebieg nic nie znajdzie.

-- Liść laurowy: suszony listek waży ok. 0,1-0,2 g (opak. 10 g ≈ 50-60 listków)
UPDATE skladniki_meta SET waga_sztuki_g = 0.15
WHERE nazwa_norm = 'lisc laurowy' AND waga_sztuki_g IS NULL;

-- Ziele angielskie: pojedyncze ziarno waży ok. 0,03-0,05 g
UPDATE skladniki_meta SET waga_sztuki_g = 0.05
WHERE nazwa_norm = 'ziele angielskie' AND waga_sztuki_g IS NULL;
