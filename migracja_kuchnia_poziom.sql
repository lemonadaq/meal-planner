-- ════════════════════════════════════════════════════════════
-- Migracja: kuchnia (kraj) i poziom trudności dla dań + kategoria wpisów
-- Uruchom w Supabase: SQL Editor → New query → wklej → Run
--
-- `dania` to wiersz na SKŁADNIK, więc obie kolumny powtarzają się w każdym
-- wierszu danego dania — dokładnie tak, jak działają tam już `rodzaj`,
-- `czas_minuty` i `kcal`.
-- ════════════════════════════════════════════════════════════

-- Kuchnia zostaje tekstem, a nie enumem: dorzucenie nowego kraju ma nie
-- wymagać migracji. Zamknięta lista pilnowana jest tam, gdzie dane powstają —
-- w schemacie przepisu w skrypty/wspolne.js.
alter table dania add column if not exists kuchnia text;

-- Poziom ma CHECK, bo to trzy wartości i literówka wycięłaby danie z filtrów.
alter table dania add column if not exists poziom text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dania_poziom_check'
  ) then
    alter table dania add constraint dania_poziom_check
      check (poziom is null or poziom in ('latwe', 'srednie', 'trudne'));
  end if;
end $$;

comment on column dania.kuchnia is 'Kraj / kuchnia pochodzenia, np. polska, wloska, koreanska';
comment on column dania.poziom is 'latwe | srednie | trudne';

-- Filtry w apce lecą po tych kolumnach na całej tabeli.
create index if not exists dania_kuchnia_idx on dania (kuchnia) where kuchnia is not null;
create index if not exists dania_poziom_idx on dania (poziom) where poziom is not null;

-- ── Blog: podział wpisów ──
-- Wpis może, ale nie musi być powiązany z daniem, więc kategoria jest własną
-- kolumną, a nie wyliczana z `dania.rodzaj`.
alter table wpisy add column if not exists kategoria text;

comment on column wpisy.kategoria is 'Podział bloga: sniadania, obiady, kolacje, zupy, przekaski, desery, inne';

create index if not exists wpisy_kategoria_idx
  on wpisy (kategoria) where opublikowany;

notify pgrst, 'reload schema';

-- ── Sprawdzenie po uruchomieniu ──
-- 1. Ile dań ma już wypełnioną kuchnię i poziom:
-- select
--   count(distinct "Danie") filter (where kuchnia is not null) as z_kuchnia,
--   count(distinct "Danie") filter (where poziom is not null)  as z_poziomem,
--   count(distinct "Danie")                                    as wszystkich
-- from dania;
--
-- 2. Rozkład kuchni:
-- select kuchnia, count(distinct "Danie") as dan
-- from dania where kuchnia is not null
-- group by kuchnia order by dan desc;
