-- ════════════════════════════════════════════════════════════
-- Migracja: komentarze, licznik odwiedzin, wyłącznik komentarzy
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
-- WYMAGA wcześniejszego uruchomienia migracja_blog.sql
--
-- Decyzje Filipa, które kształtują ten plik:
--   • komentarze bez moderacji — pojawiają się od razu,
--   • ZDJĘCIA w komentarzach dopiero po zatwierdzeniu,
--   • wyłącznik komentarzy na wypadek botów,
--   • licznik odwiedzin w bazie.
--
-- Rozdział tekst/zdjęcie jest celowy: tekst niesie małe ryzyko, a zdjęcie
-- od anonima na własnej domenie — duże. Dlatego zdjęcia lądują w buckecie
-- BEZ publicznego odczytu i stają się widoczne dopiero, gdy Filip je
-- zatwierdzi w panelu.
--
-- Uwaga o filtrach: cokolwiek sprawdzałaby przeglądarka, da się ominąć —
-- klucz `anon` jest jawny i można pisać do bazy z pominięciem aplikacji.
-- Dlatego limity długości i wyłącznik siedzą w politykach RLS, a nie w JS.
-- ════════════════════════════════════════════════════════════

-- ── Globalny wyłącznik ──
create table if not exists blog_ustawienia (
  id boolean primary key default true check (id),   -- wymusza JEDEN wiersz
  komentarze_wlaczone boolean not null default true,
  zaktualizowano timestamptz not null default now()
);

insert into blog_ustawienia (id) values (true) on conflict (id) do nothing;

comment on table blog_ustawienia is 'Jeden wiersz — globalny wyłącznik komentarzy na wypadek botów';

-- Wyłącznik per wpis, niezależny od globalnego.
alter table wpisy add column if not exists komentarze_wlaczone boolean not null default true;

-- ── Komentarze ──
create table if not exists komentarze (
  id uuid primary key default gen_random_uuid(),
  wpis_id uuid not null references wpisy(id) on delete cascade,

  -- Puste = „Anonim". Domyślną wartość stawia front, ale i tak przycinamy tu.
  pseudonim text,
  tresc text not null,

  -- Ścieżka w PRYWATNYM buckecie. Publiczny adres pojawia się dopiero
  -- po zatwierdzeniu, w osobnej kolumnie.
  zdjecie_sciezka text,
  zdjecie_url text,
  zdjecie_zatwierdzone boolean not null default false,

  -- Filip może ukryć komentarz po fakcie (moderacja po publikacji).
  ukryty boolean not null default false,
  -- Do licznika „nowe komentarze" w panelu.
  przeczytany boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists komentarze_wpis_idx on komentarze (wpis_id, created_at desc);
create index if not exists komentarze_nieprzeczytane_idx on komentarze (created_at desc) where not przeczytany;

comment on column komentarze.zdjecie_sciezka is 'Ścieżka w prywatnym buckecie blog-komentarze — niewidoczna publicznie';
comment on column komentarze.zdjecie_url is 'Publiczny adres, wypełniany dopiero przy zatwierdzeniu zdjęcia';

alter table komentarze enable row level security;

-- Czytać może każdy, ale tylko nieukryte i tylko spod opublikowanych wpisów.
drop policy if exists "komentarze: każdy czyta widoczne" on komentarze;
create policy "komentarze: każdy czyta widoczne"
  on komentarze for select
  to anon, authenticated
  using (
    not ukryty
    and exists (select 1 from wpisy w where w.id = wpis_id and w.opublikowany)
  );

drop policy if exists "komentarze: admin czyta wszystko" on komentarze;
create policy "komentarze: admin czyta wszystko"
  on komentarze for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

-- Dodawanie: każdy, ale tylko gdy komentarze są włączone globalnie ORAZ przy
-- tym wpisie. Limity długości są tutaj, bo w JS nic nie znaczą.
--
-- Świeży komentarz NIE MOŻE od razu mieć zatwierdzonego zdjęcia ani
-- publicznego adresu — to ustawia wyłącznie admin przy zatwierdzaniu.
drop policy if exists "komentarze: każdy dodaje gdy włączone" on komentarze;
create policy "komentarze: każdy dodaje gdy włączone"
  on komentarze for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from wpisy w
      where w.id = wpis_id and w.opublikowany and w.komentarze_wlaczone
    )
    and exists (select 1 from blog_ustawienia b where b.komentarze_wlaczone)
    and length(btrim(tresc)) between 1 and 2000
    and length(coalesce(pseudonim, '')) <= 40
    and not zdjecie_zatwierdzone
    and zdjecie_url is null
    and not ukryty
    and not przeczytany
  );

drop policy if exists "komentarze: admin edytuje" on komentarze;
create policy "komentarze: admin edytuje"
  on komentarze for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com')
  with check (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

drop policy if exists "komentarze: admin kasuje" on komentarze;
create policy "komentarze: admin kasuje"
  on komentarze for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

-- ── Wyłącznik: odczyt dla wszystkich, zmiana dla admina ──
alter table blog_ustawienia enable row level security;

drop policy if exists "blog_ustawienia: każdy czyta" on blog_ustawienia;
create policy "blog_ustawienia: każdy czyta"
  on blog_ustawienia for select to anon, authenticated using (true);

drop policy if exists "blog_ustawienia: admin zmienia" on blog_ustawienia;
create policy "blog_ustawienia: admin zmienia"
  on blog_ustawienia for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com')
  with check (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

-- ── Licznik odwiedzin ──
-- Jeden wiersz na wpis i dzień, żeby tabela nie puchła bez końca.
create table if not exists wpisy_odwiedziny (
  wpis_id uuid not null references wpisy(id) on delete cascade,
  dzien date not null default current_date,
  ile integer not null default 0,
  primary key (wpis_id, dzien)
);

comment on table wpisy_odwiedziny is 'Odwiedziny per wpis i dzień; dopisywane przez RPC zlicz_odwiedziny()';

-- Anon NIE dostaje prawa zapisu do tabeli. Zamiast tego jest funkcja, która
-- umie zrobić dokładnie jedną rzecz: podbić licznik istniejącego, opublikowanego
-- wpisu. Dzięki temu nikt nie nadpisze cudzych liczb ani nie wstawi śmieci.
create or replace function zlicz_odwiedziny(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id from wpisy where slug = p_slug and opublikowany;
  if v_id is null then return; end if;

  insert into wpisy_odwiedziny (wpis_id, dzien, ile)
  values (v_id, current_date, 1)
  on conflict (wpis_id, dzien) do update set ile = wpisy_odwiedziny.ile + 1;
end;
$$;

comment on function zlicz_odwiedziny is 'Podbija licznik odwiedzin wpisu; jedyna droga zapisu dla niezalogowanych';

alter table wpisy_odwiedziny enable row level security;

drop policy if exists "odwiedziny: admin czyta" on wpisy_odwiedziny;
create policy "odwiedziny: admin czyta"
  on wpisy_odwiedziny for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'wojownik157@gmail.com');

-- ── Storage: zdjęcia z komentarzy ──
-- Bucket PRYWATNY. Anonim może tylko wrzucić; nikt postronny nie odczyta,
-- nawet znając adres. Publiczny staje się dopiero skopiowany przez panel
-- do `blog-zdjecia` przy zatwierdzeniu.
insert into storage.buckets (id, name, public)
values ('blog-komentarze', 'blog-komentarze', false)
on conflict (id) do update set public = false;

drop policy if exists "blog-komentarze: każdy wgrywa" on storage.objects;
create policy "blog-komentarze: każdy wgrywa"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'blog-komentarze');

drop policy if exists "blog-komentarze: admin ogląda" on storage.objects;
create policy "blog-komentarze: admin ogląda"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'blog-komentarze'
    and auth.jwt() ->> 'email' = 'wojownik157@gmail.com'
  );

drop policy if exists "blog-komentarze: admin kasuje" on storage.objects;
create policy "blog-komentarze: admin kasuje"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'blog-komentarze'
    and auth.jwt() ->> 'email' = 'wojownik157@gmail.com'
  );

-- ── Uprawnienia i cache PostgREST ──
grant select, insert on komentarze to anon, authenticated;
grant update, delete on komentarze to authenticated;
grant select on blog_ustawienia to anon, authenticated;
grant update on blog_ustawienia to authenticated;
grant select on wpisy_odwiedziny to authenticated;
grant execute on function zlicz_odwiedziny(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ── Sprawdzenie po uruchomieniu ──
-- 1. Uprawnienia:
-- select has_table_privilege('anon', 'komentarze', 'insert') as anon_komentuje,
--        has_function_privilege('anon', 'zlicz_odwiedziny(text)', 'execute') as anon_zlicza;
--
-- 2. Wyłączenie komentarzy globalnie (na wypadek botów):
-- update blog_ustawienia set komentarze_wlaczone = false;
--
-- 3. Odwiedziny per wpis:
-- select w.tytul, sum(o.ile) as odwiedzin
-- from wpisy w left join wpisy_odwiedziny o on o.wpis_id = w.id
-- group by w.tytul order by odwiedzin desc nulls last;
