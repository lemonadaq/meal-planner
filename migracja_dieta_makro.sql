-- ════════════════════════════════════════════════════════════
-- Migracja: dieta (filtr „💪 Na masę") + makro na 1 porcję
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- Kolejność: NAJPIERW ten plik, POTEM import paczki `paczka-10.json`
-- (tryb `import`). Import wpisuje `dieta`, `bialko`, `tluszcz`, `wegle`
-- tylko wtedy, gdy danie w paczce je ma — stare paczki działają bez zmian.
--
-- Apka czyta `dieta` na liście przepisów i w Tygodniu. Gdy kolumny
-- jeszcze nie ma, lista ładuje się jak dotąd (bez chipa „Na masę"),
-- więc wdrożenie kodu przed migracją niczego nie psuje.
--
-- Można odpalać wielokrotnie (`if not exists`).
-- ════════════════════════════════════════════════════════════

alter table dania add column if not exists dieta   text;
alter table dania add column if not exists bialko  integer;
alter table dania add column if not exists tluszcz integer;
alter table dania add column if not exists wegle   integer;

comment on column dania.dieta   is 'Wartość techniczna z DIETY w skrypty/wspolne.js (np. masa) — filtr w Przepisach i Tygodniu';
comment on column dania.bialko  is 'Białko w g na 1 porcję (spójne z "Ilość na 1 porcję")';
comment on column dania.tluszcz is 'Tłuszcz w g na 1 porcję';
comment on column dania.wegle   is 'Węglowodany w g na 1 porcję';
