-- Task 20260922-1522-dane
--
-- Trzy dania mają składnik "Boczek" w ilości "150" z jednostką "kg" zamiast
-- "g" — czyli 150 KILOGRAMÓW boczku na JEDNĄ porcję. Dla porównania "Boczek"
-- w innych daniach ma sensowne wartości (Spaghetti carbonara: 0,1 kg,
-- Breakfast Burrito: 30 g) — 150 g pasuje do dania z kluskami i skwarkami,
-- 150 kg to ewidentna literówka w jednostce z generowania przepisu.
--
-- Bezpieczne do jednokrotnego uruchomienia: WHERE po konkretnym id + starej
-- wartości, więc powtórne odpalenie nic nie zmieni (kolumna już będzie miała
-- docelową wartość).
update dania
set "Jednostka" = 'g'
where id = 138
  and "Danie" = 'Kluski z serem i skwarkami'
  and "Składnik" = 'Boczek'
  and "Ilość na 1 porcję" = '150'
  and "Jednostka" = 'kg';

update dania
set "Jednostka" = 'g'
where id = 147
  and "Danie" = 'Kopytka z cebulką'
  and "Składnik" = 'Boczek'
  and "Ilość na 1 porcję" = '150'
  and "Jednostka" = 'kg';

update dania
set "Jednostka" = 'g'
where id = 351
  and "Danie" = 'Pyzy/kluski śląskie'
  and "Składnik" = 'Boczek'
  and "Ilość na 1 porcję" = '150'
  and "Jednostka" = 'kg';
