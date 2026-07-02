-- ════════════════════════════════════════════════════════════
-- Migracja: kalorie na 1 porcję dania (chip 🔥 w apce)
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- UWAGA: uruchom PRZED wejściem na nową wersję apki — formularze
-- i lista dań odwołują się do kolumny `kcal` i bez niej sypią błędem.
-- ════════════════════════════════════════════════════════════

alter table dania add column if not exists kcal integer;

comment on column dania.kcal is 'Szacowane kalorie na 1 porcję (spójne z "Ilość na 1 porcję")';
