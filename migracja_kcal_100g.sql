-- ════════════════════════════════════════════════════════════
-- Migracja: kaloryczność składników (kcal na 100 g)
-- Podstawa auto-liczenia kcal dania ze składników.
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
-- (bez tej kolumny apka działa normalnie — podpowiedź kcal
--  pokaże tylko braki, nic się nie wysypie)
-- ════════════════════════════════════════════════════════════

alter table skladniki_meta add column if not exists kcal_100g numeric;

comment on column skladniki_meta.kcal_100g is 'Kalorie na 100 g/ml produktu — do auto-liczenia kcal dania ze składników';
