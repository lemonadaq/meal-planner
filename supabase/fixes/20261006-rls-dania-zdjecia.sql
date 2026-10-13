-- 20261006-rls-dania-zdjecia.sql
--
-- Polityki RLS na storage.objects dla bucketu `dania-zdjecia`.
--
-- PO CO: wgranie zdjęcia z apki (formularz nowego dania i edycja istniejącego)
-- kończyło się błędem 403 „new row violates row-level security policy".
-- Zdjęcia w bazie owszem są, ale wstawiły je WYŁĄCZNIE skrypty z katalogu
-- `skrypty/`, które łączą się kluczem SUPABASE_SERVICE_ROLE_KEY i omijają RLS.
-- Zwykły zalogowany user (rola `authenticated`) nie miał prawa INSERT, więc
-- z apki nie dało się dodać zdjęcia w ogóle. Issue #106.
--
-- Kod aplikacji został już poprawiony tak, żeby pad uploadu NIE gubił
-- wpisanego przepisu — ale dopóki te polityki nie zostaną wykonane, zdjęcia
-- z apki nadal nie przejdą. Tego nie da się obejść z kodu.
--
-- JAK ODPALIĆ: Supabase → SQL Editor → wklej całość → Run.
-- Można odpalać wielokrotnie: każda polityka jest najpierw usuwana.
--
-- ZAKRES: tylko bucket `dania-zdjecia`. Żadnej innej tabeli ani bucketu
-- ten plik nie dotyka.

-- Bucket musi być publiczny do czytania — `getPublicUrl()` w kodzie apki
-- zwraca adres bez tokenu, więc zdjęcia muszą dać się pobrać anonimowo.
-- Jeśli bucket jeszcze nie istnieje, ta linia go zakłada.
insert into storage.buckets (id, name, public)
values ('dania-zdjecia', 'dania-zdjecia', true)
on conflict (id) do update set public = true;

-- ── Czytanie: każdy, także niezalogowany ────────────────────────────────
-- Zdjęcia dań nie są prywatne, a adresy z `getPublicUrl()` muszą działać
-- bez sesji (np. gdy obrazek ładuje się w podglądzie).
drop policy if exists "dania_zdjecia_select_wszyscy" on storage.objects;
create policy "dania_zdjecia_select_wszyscy"
  on storage.objects for select
  using (bucket_id = 'dania-zdjecia');

-- ── Wgrywanie: tylko zalogowany ─────────────────────────────────────────
-- To jest polityka, której brakowało i która wywalała formularz.
drop policy if exists "dania_zdjecia_insert_zalogowany" on storage.objects;
create policy "dania_zdjecia_insert_zalogowany"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'dania-zdjecia');

-- ── Nadpisywanie: tylko zalogowany ──────────────────────────────────────
-- Kod woła `upload(..., { upsert: true })`, a upsert na istniejącym pliku to
-- UPDATE, nie INSERT. Bez tej polityki podmiana zdjęcia w edycji padałaby
-- nawet przy działającym INSERT.
drop policy if exists "dania_zdjecia_update_zalogowany" on storage.objects;
create policy "dania_zdjecia_update_zalogowany"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'dania-zdjecia')
  with check (bucket_id = 'dania-zdjecia');

-- ── Usuwanie: tylko zalogowany ──────────────────────────────────────────
-- Dziś apka nie kasuje plików ze Storage (podmiana idzie przez upsert), ale
-- bez tej polityki każde przyszłe „usuń zdjęcie" wróci jako ten sam błąd 403.
drop policy if exists "dania_zdjecia_delete_zalogowany" on storage.objects;
create policy "dania_zdjecia_delete_zalogowany"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'dania-zdjecia');

-- ── Sprawdzenie ─────────────────────────────────────────────────────────
-- Po wykonaniu powinny wyjść cztery wiersze.
select policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'dania_zdjecia_%'
order by policyname;
