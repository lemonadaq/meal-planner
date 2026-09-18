-- ════════════════════════════════════════════════════════════
-- Migracja: `wpisy` — publiczny blog z przepisami
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- Jednostką publikacji jest WPIS, nie przepis. Filip wybiera danie, obudowuje
-- je tekstem i zdjęciami, i dopiero to idzie w świat. Dlatego tabela `dania`
-- ZOSTAJE zamknięta dla anona — świat nie widzi bazy dań, tylko to, co zostało
-- opublikowane we wpisie.
--
-- Przepis siedzi we wpisie jako `przepis` (jsonb), czyli MIGAWKA z chwili
-- publikacji. Trzy powody:
--   1. anon nie potrzebuje żadnego dostępu do `dania`,
--   2. opublikowany wpis nie zmienia się sam, gdy przepis w bazie zostanie
--      przegenerowany albo poprawiony (a właśnie sprzątamy nazwy składników),
--   3. wpis zostaje spójny nawet po skasowaniu dania z bazy.
-- Kolumna `danie` trzyma nazwę źródłowego dania, więc w panelu da się migawkę
-- odświeżyć jednym kliknięciem, świadomie.
-- ════════════════════════════════════════════════════════════

create table if not exists wpisy (
  id uuid primary key default gen_random_uuid(),

  -- Adres wpisu: menuplaner.pl/wpis/<slug>. Unikalny, bo to klucz w URL-u.
  slug text not null unique,
  tytul text not null,
  -- Zajawka na listę wpisów. Gdy pusta, lista bierze początek treści.
  lead text,
  tresc text not null default '',

  -- Nazwa dania z `dania`."Danie" — luźne powiązanie, bez klucza obcego,
  -- bo `dania` ma wiersz na składnik i nie ma tam czego wskazać.
  danie text,
  przepis jsonb,

  zdjecie_glowne text,
  zdjecia text[] not null default '{}',

  opublikowany boolean not null default false,
  opublikowano_at timestamptz,

  autor_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table wpisy is 'Wpisy bloga — publiczne po ustawieniu opublikowany = true';
comment on column wpisy.przepis is 'Migawka przepisu z chwili publikacji; anon nie ma dostępu do tabeli dania';
comment on column wpisy.danie is 'Nazwa źródłowego dania, do odświeżenia migawki z panelu';

-- Lista wpisów sortuje po dacie publikacji i filtruje po fladze.
create index if not exists wpisy_opublikowane_idx
  on wpisy (opublikowano_at desc)
  where opublikowany;

-- `updated_at` samo się nie zaktualizuje.
create or replace function wpisy_dotknij()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wpisy_updated_at on wpisy;
create trigger wpisy_updated_at
  before update on wpisy
  for each row execute function wpisy_dotknij();

-- ── RLS ──
-- Czytać opublikowane może KAŻDY, łącznie z niezalogowanym — o to w blogu
-- chodzi. Szkice widzi i wszystko zmienia wyłącznie admin.
alter table wpisy enable row level security;

drop policy if exists "wpisy: każdy czyta opublikowane" on wpisy;
create policy "wpisy: każdy czyta opublikowane"
  on wpisy for select
  to anon, authenticated
  using (opublikowany);

drop policy if exists "wpisy: admin czyta wszystko" on wpisy;
create policy "wpisy: admin czyta wszystko"
  on wpisy for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

drop policy if exists "wpisy: admin pisze" on wpisy;
create policy "wpisy: admin pisze"
  on wpisy for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

drop policy if exists "wpisy: admin edytuje" on wpisy;
create policy "wpisy: admin edytuje"
  on wpisy for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com')
  with check (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

drop policy if exists "wpisy: admin kasuje" on wpisy;
create policy "wpisy: admin kasuje"
  on wpisy for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

grant usage on schema public to anon, authenticated;
grant select on wpisy to anon, authenticated;
grant insert, update, delete on wpisy to authenticated;

-- ── Storage: zdjęcia do wpisów ──
-- Osobny bucket od `dania-zdjecia`, bo te zdjęcia są jawnie publiczne
-- i kasowanie wpisu nie może ruszać zdjęć dań.
insert into storage.buckets (id, name, public)
values ('blog-zdjecia', 'blog-zdjecia', true)
on conflict (id) do update set public = true;

drop policy if exists "blog-zdjecia: każdy ogląda" on storage.objects;
create policy "blog-zdjecia: każdy ogląda"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-zdjecia');

drop policy if exists "blog-zdjecia: admin wgrywa" on storage.objects;
create policy "blog-zdjecia: admin wgrywa"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'blog-zdjecia'
    and auth.jwt() ->> 'email' = 'wojownik157@gmail.com'
  );

drop policy if exists "blog-zdjecia: admin kasuje" on storage.objects;
create policy "blog-zdjecia: admin kasuje"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'blog-zdjecia'
    and auth.jwt() ->> 'email' = 'wojownik157@gmail.com'
  );

notify pgrst, 'reload schema';

-- ── Sprawdzenie po uruchomieniu ──
-- 1. Czy niezalogowany zobaczy opublikowane (powinno zwrócić 0 wierszy, nie błąd):
-- select count(*) from wpisy where opublikowany;
--
-- 2. Czy uprawnienia doszły:
-- select has_table_privilege('anon', 'wpisy', 'select') as anon_czyta,
--        has_table_privilege('authenticated', 'wpisy', 'insert') as zalogowany_pisze;
